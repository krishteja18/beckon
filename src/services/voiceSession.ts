/**
 * voiceSession — client-side Gemini Live session manager.
 *
 * Flow:
 *   1. POST voice-session-token edge function → get ephemeral token + ws endpoint
 *   2. Open WebSocket directly to Gemini Live (v1alpha) using the token
 *   3. Send setup with: model + system instruction + tool declarations
 *   4. Stream 16 kHz PCM mic frames up; receive 24 kHz PCM audio frames down
 *   5. Receive functionCall messages → caller dispatches → we send functionResponse back
 *   6. Surface state transitions and tool events to the caller via callbacks
 *   7. Tear down cleanly on end-of-call / network drop
 */

import { supabase } from './supabase';
import { buildShowupPrompt, CallType } from './prompts';
import { VOICE_TOOL_DECLARATIONS, dispatchToolCall, ToolResult } from './voiceTools';
import { fetchGoalsWithSchedules } from './goals';
import { fetchRoutines } from './routines';
import { composeEntitySnapshot } from './prompts';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';
export type { CallType };

export interface SessionConfig {
  callType: CallType;
  goalTitle?: string;
  goalId?: string;
  routineTitle?: string;
  intensity?: 'gentle' | 'firm' | 'drill';
  framework?: 'atomic_habits' | 'ikigai' | 'deep_work';
  userName?: string;
  languageCode?: string;
  /** If true, declares CRUD tools + injects entity snapshot. Default true. */
  enableTools?: boolean;
  /** If true, sends responseModalities=['TEXT'] for web-side testing without audio. */
  textMode?: boolean;
}

export interface ToolCallEvent {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface VoiceSessionCallbacks {
  onStateChange?: (state: VoiceState) => void;
  onAudioOut?: (pcmBase64: string, mimeType: string) => void;
  onTranscript?: (text: string, role: 'user' | 'model') => void;
  onInterrupted?: () => void;
  onTurnComplete?: () => void;
  onToolCall?: (event: ToolCallEvent, result: ToolResult) => void;
  onError?: (err: Error) => void;
  onClose?: (reason: string) => void;
}

interface TokenResponse {
  token: string;       // "tokens/<...>"
  model: string;       // "models/gemini-3.1-flash-live-preview"
  expireTime: string;
  wsEndpoint: string;
}

const TOKEN_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/voice-session-token`;

export class VoiceSession {
  private ws: WebSocket | null = null;
  private callbacks: VoiceSessionCallbacks = {};
  private isOpen = false;
  private config: SessionConfig | null = null;

  async open(config: SessionConfig, callbacks: VoiceSessionCallbacks = {}) {
    this.config = config;
    this.callbacks = callbacks;
    this.callbacks.onStateChange?.('processing');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    // 1. Mint ephemeral token (v1alpha)
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      throw new Error(`Token fetch failed ${tokenRes.status}: ${body}`);
    }

    const token = (await tokenRes.json()) as TokenResponse;

    // 2. Compose system instruction (coaching + tools + entity snapshot)
    const enableTools = config.enableTools !== false;
    let entitySnapshot: string | undefined;
    if (enableTools) {
      try {
        const [goals, routines] = await Promise.all([
          fetchGoalsWithSchedules(),
          fetchRoutines(),
        ]);
        entitySnapshot = composeEntitySnapshot({
          goals: goals.map(g => ({
            id: g.id,
            title: g.title,
            framework: g.framework,
            schedules: g.schedules.filter(s => s.active).map(s => ({
              scheduleId: s.id,
              time: s.scheduled_time as string,
              days: s.scheduled_days,
            })),
          })),
          routines: routines.map(r => ({
            id: r.id,
            title: r.title,
            time: r.scheduled_time,
            days: r.scheduled_days,
          })),
        });
      } catch (e) {
        console.warn('[VoiceSession] snapshot fetch failed', e);
      }
    }

    const systemPrompt = buildShowupPrompt({
      callType: config.callType,
      intensity: config.intensity ?? 'firm',
      userName: config.userName ?? 'there',
      goalTitle: config.goalTitle,
      routineTitle: config.routineTitle,
      framework: config.framework,
      withTools: enableTools,
      entitySnapshot,
    });

    // 3. Open WebSocket to Gemini Live v1alpha with ephemeral token
    const wsUrl = `${token.wsEndpoint}?access_token=${encodeURIComponent(token.token)}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.isOpen = true;
      const tools: any[] = [];
      if (enableTools) {
        tools.push({ functionDeclarations: VOICE_TOOL_DECLARATIONS });
        tools.push({ googleSearch: {} });
      }

      const setup: any = {
        model: token.model,
        generationConfig: {
          responseModalities: [config.textMode ? 'TEXT' : 'AUDIO'],
          speechConfig: {
            languageCode: config.languageCode ?? 'en-US',
          },
        },
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
      };
      if (tools.length > 0) setup.tools = tools;

      this.ws!.send(JSON.stringify({ setup }));
      this.callbacks.onStateChange?.('listening');
    };

    this.ws.onmessage = (evt) => {
      this.handleMessage(evt.data as string).catch(e => {
        console.warn('[VoiceSession] handleMessage error', e);
      });
    };

    this.ws.onerror = () => {
      this.callbacks.onError?.(new Error('WebSocket error'));
    };

    this.ws.onclose = (evt) => {
      this.isOpen = false;
      this.callbacks.onStateChange?.('idle');
      this.callbacks.onClose?.(evt.reason ?? 'closed');
    };
  }

  private async handleMessage(raw: string): Promise<void> {
    let msg: any;
    try { msg = JSON.parse(raw); } catch { return; }

    // ── Tool calls (model wants to execute a CRUD op) ──
    if (msg.toolCall?.functionCalls?.length) {
      for (const fc of msg.toolCall.functionCalls) {
        const event: ToolCallEvent = {
          id: fc.id ?? `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: fc.name,
          args: (fc.args ?? {}) as Record<string, unknown>,
        };
        let result: ToolResult;
        try {
          result = await dispatchToolCall(event.name, event.args);
        } catch (e: any) {
          result = { ok: false, message: e?.message ?? String(e) };
        }
        this.sendToolResponse(event.id, event.name, result);
        this.callbacks.onToolCall?.(event, result);
      }
      return;
    }

    // ── Tool cancellation (model decided not to use the call) ──
    if (msg.toolCallCancellation) {
      return;
    }

    // ── Standard model content (audio + text) ──
    const content = msg.serverContent;
    if (!content) return;

    const parts = content.modelTurn?.parts ?? [];
    let hasAudio = false;

    for (const part of parts) {
      if (part.inlineData?.data && part.inlineData.mimeType?.startsWith('audio/')) {
        hasAudio = true;
        this.callbacks.onAudioOut?.(part.inlineData.data, part.inlineData.mimeType);
      }
      if (part.text) {
        this.callbacks.onTranscript?.(part.text, 'model');
      }
    }

    if (hasAudio) this.callbacks.onStateChange?.('speaking');
    if (content.interrupted) {
      this.callbacks.onStateChange?.('listening');
      this.callbacks.onInterrupted?.();
    }
    if (content.turnComplete) {
      this.callbacks.onStateChange?.('listening');
      this.callbacks.onTurnComplete?.();
    }
  }

  private sendToolResponse(id: string, name: string, result: ToolResult): void {
    if (!this.isOpen || !this.ws) return;
    this.ws.send(JSON.stringify({
      toolResponse: {
        functionResponses: [
          { id, name, response: result },
        ],
      },
    }));
  }

  sendAudio(pcmBase64: string): void {
    if (!this.isOpen || !this.ws) return;
    this.ws.send(JSON.stringify({
      realtimeInput: {
        audio: { data: pcmBase64, mimeType: 'audio/pcm;rate=16000' },
      },
    }));
  }

  sendText(text: string): void {
    if (!this.isOpen || !this.ws) return;
    this.ws.send(JSON.stringify({
      clientContent: {
        turns: [{ role: 'user', parts: [{ text }] }],
        turnComplete: true,
      },
    }));
  }

  close(): void {
    try { this.ws?.close(); } catch {}
    this.ws = null;
    this.isOpen = false;
  }
}
