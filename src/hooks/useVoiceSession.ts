import { useCallback, useRef, useState } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
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
  /** Live 0..1 audio level (coach playback + mic), drives the wave's waver. */
  amplitude: SharedValue<number>;
  start: (config: SessionConfig) => Promise<void>;
  stop: () => void;
  sendAudio: (pcmBase64: string) => void;
  /** Send a typed text message (web/test path or accessibility). */
  sendText: (text: string) => void;
  error: string | null;
}

/** RMS loudness (0..1) of a base64 PCM16 frame, scaled for visual expressiveness. */
function rmsLevelFromPcm16Base64(b64: string): number {
  try {
    if (typeof atob !== 'function') return 0;
    const bin = atob(b64);
    const len = bin.length;
    if (len < 2) return 0;
    let sumSq = 0;
    let count = 0;
    // Cap work to ~1024 samples regardless of frame size.
    const stride = 2 * Math.max(1, Math.floor((len / 2) / 1024));
    for (let i = 0; i + 1 < len; i += stride) {
      let s = (bin.charCodeAt(i + 1) << 8) | bin.charCodeAt(i);
      if (s >= 32768) s -= 65536;
      sumSq += s * s;
      count++;
    }
    if (count === 0) return 0;
    const rms = Math.sqrt(sumSq / count) / 32768; // 0..1
    return Math.min(1, rms * 5); // speech RMS is small — scale up
  } catch {
    return 0;
  }
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

    // Mirror to mock_task_events so the timeline reflects voice-marked outcomes
    // (same shape outcomes.ts reads). Goals key by schedule_id; routines by note tag.
    const te = JSON.parse(localStorage.getItem('mock_task_events') || '[]');
    const today = localDateString(now);
    for (const o of outcomes) {
      const isGoal = o.kind === 'goal';
      te.push({
        kind: kindForStatus(o.status),
        goal_id: isGoal ? o.id : null,
        schedule_id: isGoal ? ((o as any).scheduleId ?? null) : null,
        note: isGoal ? null : `[routine:${o.id}]`,
        user_local_date: today,
        occurred_at: now.toISOString(),
      });
    }
    localStorage.setItem('mock_task_events', JSON.stringify(te));
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
      schedule_id: o.kind === 'goal' ? (o.scheduleId ?? null) : null,
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
  const decayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const amplitude = useSharedValue(0);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState<string[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCallLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Audio frames spike the amplitude (attack); this loop decays it (release),
  // so the wave bounces with live loudness and settles during silence.
  const startDecay = useCallback(() => {
    if (decayRef.current) return;
    decayRef.current = setInterval(() => {
      const next = amplitude.value * 0.82;
      amplitude.value = next < 0.01 ? 0 : next;
    }, 60);
  }, [amplitude]);

  const stopDecay = useCallback(() => {
    if (decayRef.current) { clearInterval(decayRef.current); decayRef.current = null; }
    amplitude.value = 0;
  }, [amplitude]);

  const cleanupAudio = useCallback(() => {
    stopDecay();
    if (isWeb) return;
    ShowupAlarm.stopAudioSession();
    if (audioSubRef.current) {
      audioSubRef.current.remove();
      audioSubRef.current = null;
    }
  }, [stopDecay]);

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

    amplitude.value = 0;
    startDecay();

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
        // Coach is speaking → drive the waver from playback loudness.
        const level = rmsLevelFromPcm16Base64(base64);
        if (level > amplitude.value) amplitude.value = level;
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
        // User is speaking → also feed the waver from mic loudness.
        const level = rmsLevelFromPcm16Base64(e.data);
        if (level > amplitude.value) amplitude.value = level;
        session.sendAudio(e.data);
      });
    }
  }, [cleanupAudio, persistCtx, amplitude, startDecay]);

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

  return { voiceState, transcript, toolCalls, amplitude, start, stop, sendAudio, sendText, error };
}
