import { useCallback, useRef, useState } from 'react';
import { VoiceSession, SessionConfig, VoiceState, ToolCallEvent } from '../services/voiceSession';
import { ToolResult, drainPendingOutcomes } from '../services/voiceTools';
import { bucketForHour } from '../services/temporal';
import { ShowupAlarm } from '../../modules/showup-alarm/src';
import { supabase } from '../services/supabase';

export interface ToolCallLogEntry {
  id: string;
  name: string;
  result: ToolResult;
  at: number;
}

interface UseVoiceSessionReturn {
  voiceState: VoiceState;
  transcript: string[];
  toolCalls: ToolCallLogEntry[];
  start: (config: SessionConfig) => Promise<void>;
  stop: () => void;
  sendAudio: (pcmBase64: string) => void;
  /** Send a typed text message (web/test path or accessibility). */
  sendText: (text: string) => void;
  error: string | null;
}

const parseRate = (mime: string) => {
  const m = /rate=(\d+)/.exec(mime);
  return m ? parseInt(m[1], 10) : 24000;
};

const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined' && !(navigator?.product === 'ReactNative');

interface PersistCtx {
  callType: SessionConfig['callType'];
  intensity: NonNullable<SessionConfig['intensity']>;
  startedAt: Date | null;
  transcript: string[];
}

/** Map a markOutcome status to a task_event_kind enum value. */
function kindForStatus(status: string): 'completed' | 'skipped' | 'started' {
  if (status === 'done') return 'completed';
  if (status === 'skipped') return 'skipped';
  return 'started'; // 'partial' → neutral (not a completion, not a miss)
}

function localDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Write the call's outcomes to check_ins + task_events.
 * Drains the pending-outcomes queue populated by the markOutcome tool.
 */
async function persistOutcomes(ctx: PersistCtx): Promise<void> {
  const outcomes = drainPendingOutcomes();
  if (outcomes.length === 0) return;

  const now = new Date();
  const callType = ctx.callType ?? 'midday';
  const intensity = ctx.intensity ?? 'firm';

  const isBypass = typeof window !== 'undefined' && window.localStorage?.getItem('bypass_auth') === 'true';
  if (isBypass) {
    const raw = localStorage.getItem('mock_check_ins') || '[]';
    const arr = JSON.parse(raw);
    arr.push({
      id: 'mock-check-in-' + Math.random().toString(36).slice(2, 11),
      call_type: callType,
      intensity,
      started_at: (ctx.startedAt ?? now).toISOString(),
      ended_at: now.toISOString(),
      outcome: { outcomes },
    });
    localStorage.setItem('mock_check_ins', JSON.stringify(arr));
    return;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. check_ins — one row for the call. call_type + intensity are NOT NULL enums.
    await supabase.from('check_ins').insert({
      user_id: user.id,
      call_type: callType,
      intensity,
      goal_ids: outcomes.filter(o => o.kind === 'goal').map(o => o.id),
      started_at: (ctx.startedAt ?? now).toISOString(),
      ended_at: now.toISOString(),
      duration_seconds: ctx.startedAt
        ? Math.max(0, Math.round((now.getTime() - ctx.startedAt.getTime()) / 1000))
        : null,
      transcript: ctx.transcript.length ? ctx.transcript.join('\n') : null,
      outcome: { outcomes },
    } as any);

    // 2. task_events — one row per outcome, with precomputed user-local fields
    //    (the temporal/retro engine reads these). goal_id is null for routines.
    const hour = now.getHours();
    const rows = outcomes.map(o => ({
      user_id: user.id,
      goal_id: o.kind === 'goal' ? o.id : null,
      kind: kindForStatus(o.status),
      occurred_at: now.toISOString(),
      user_local_date: localDateString(now),
      user_local_day_of_week: now.getDay(),
      user_local_hour: hour,
      time_bucket: bucketForHour(hour),
      note: o.note ?? (o.kind === 'routine' ? `[routine:${o.id}]` : (o.status === 'partial' ? 'partial' : null)),
      source: 'voice_call',
      snooze_count: 0,
    }));
    if (rows.length) await supabase.from('task_events').insert(rows as any);
  } catch (e) {
    console.warn('[useVoiceSession] persist outcomes failed', e);
  }
}

/**
 * React hook wrapping VoiceSession.
 * Exposes voiceState, transcript, toolCalls, and start/stop/sendAudio/sendText.
 * The native module (AlarmManager ForegroundService) calls start() on alarm fire.
 * The call screen uses this hook directly for UI-initiated calls.
 */
export function useVoiceSession(): UseVoiceSessionReturn {
  const sessionRef = useRef<VoiceSession | null>(null);
  const audioSubRef = useRef<{ remove: () => void } | null>(null);
  const configRef = useRef<SessionConfig | null>(null);
  const startedAtRef = useRef<Date | null>(null);
  const transcriptRef = useRef<string[]>([]);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState<string[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCallLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const cleanupAudio = useCallback(() => {
    if (isWeb) return;
    ShowupAlarm.stopAudioSession();
    if (audioSubRef.current) {
      audioSubRef.current.remove();
      audioSubRef.current = null;
    }
  }, []);

  const persistCtx = useCallback((): PersistCtx => ({
    callType: configRef.current?.callType ?? 'midday',
    intensity: configRef.current?.intensity ?? 'firm',
    startedAt: startedAtRef.current,
    transcript: transcriptRef.current,
  }), []);

  const start = useCallback(async (config: SessionConfig) => {
    setError(null);
    setTranscript([]);
    setToolCalls([]);
    configRef.current = config;
    startedAtRef.current = new Date();
    transcriptRef.current = [];

    const session = new VoiceSession();
    sessionRef.current = session;

    await session.open(config, {
      onStateChange: (s) => setVoiceState(s),
      onTranscript: (text, role) => {
        const line = `${role === 'model' ? 'Coach' : 'You'}: ${text}`;
        transcriptRef.current = [...transcriptRef.current, line];
        setTranscript((prev) => [...prev, line]);
      },
      onAudioOut: (base64, mimeType) => {
        if (isWeb) return;
        ShowupAlarm.playAudioChunk(base64, parseRate(mimeType));
      },
      onInterrupted: () => {
        if (isWeb) return;
        ShowupAlarm.stopAudioSession().then(() => {
          ShowupAlarm.startAudioSession(24000);
        });
      },
      onToolCall: (event: ToolCallEvent, result: ToolResult) => {
        setToolCalls(prev => [
          ...prev,
          { id: event.id, name: event.name, result, at: Date.now() },
        ]);
      },
      onError: (err) => setError(err.message),
      onClose: async (reason) => {
        setVoiceState('idle');
        if (reason && reason !== 'closed') setError(reason);
        cleanupAudio();
        await persistOutcomes(persistCtx());
      },
    });

    // WebSocket is open. Audio session is native-only (no-op on web).
    if (!isWeb) {
      await ShowupAlarm.startAudioSession(24000);
      audioSubRef.current = ShowupAlarm.onAudioCapture((e) => {
        session.sendAudio(e.data);
      });
    }
  }, [cleanupAudio, persistCtx]);

  const stop = useCallback(async () => {
    sessionRef.current?.close();
    sessionRef.current = null;
    setVoiceState('idle');
    cleanupAudio();
    await persistOutcomes(persistCtx());
  }, [cleanupAudio, persistCtx]);

  const sendAudio = useCallback((pcmBase64: string) => {
    sessionRef.current?.sendAudio(pcmBase64);
  }, []);

  const sendText = useCallback((text: string) => {
    sessionRef.current?.sendText(text);
  }, []);

  return { voiceState, transcript, toolCalls, start, stop, sendAudio, sendText, error };
}
