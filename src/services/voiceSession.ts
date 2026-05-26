/**
 * voiceSession — client-side Gemini Live session manager.
 *
 * Flow:
 *   1. POST voice-session-token edge function → get API key + model
 *   2. Open WebSocket directly to Gemini Live
 *   3. Send 16 kHz PCM mic frames up; receive 24 kHz PCM audio frames down
 *   4. Surface state transitions to the caller via callbacks
 *   5. Tear down cleanly on end-of-call / network drop
 */

import { supabase } from './supabase';
import { buildShowupPrompt } from './prompts';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';
export type CallType = 'morning' | 'midday' | 'evening' | 'wall' | 'retro';

export interface SessionConfig {
  callType: CallType;
  goalTitle?: string;
  goalId?: string;
  intensity?: 'gentle' | 'firm' | 'drill';
  framework?: 'atomic_habits' | 'ikigai' | 'deep_work';
  userName?: string;
  languageCode?: string;
}

export interface VoiceSessionCallbacks {
  onStateChange?: (state: VoiceState) => void;
  onAudioOut?: (pcmBase64: string, mimeType: string) => void;
  onTranscript?: (text: string, role: 'user' | 'model') => void;
  onInterrupted?: () => void;
  onTurnComplete?: () => void;
  onError?: (err: Error) => void;
  onClose?: (reason: string) => void;
}

interface TokenResponse {
  apiKey: string;
  model: string;
  expiresAt: string;
  ttlSeconds: number;
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

    // 1. Get ephemeral token
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

    // 2. Build system prompt
    const systemPrompt = buildShowupPrompt({
      callType: config.callType,
      intensity: config.intensity ?? 'firm',
      userName: config.userName ?? 'there',
    });

    // 3. Open WebSocket to Gemini Live
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${token.apiKey}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.isOpen = true;
      this.ws!.send(JSON.stringify({
        setup: {
          model: token.model,
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              languageCode: config.languageCode ?? 'en-US',
            },
          },
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
        },
      }));
      this.callbacks.onStateChange?.('listening');
    };

    this.ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data as string);
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
      } catch (e) {
        console.warn('[VoiceSession] parse error', e);
      }
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

  sendAudio(pcmBase64: string) {
    if (!this.isOpen || !this.ws) return;
    this.ws.send(JSON.stringify({
      realtimeInput: {
        audio: { data: pcmBase64, mimeType: 'audio/pcm;rate=16000' },
      },
    }));
  }

  sendText(text: string) {
    if (!this.isOpen || !this.ws) return;
    this.ws.send(JSON.stringify({
      clientContent: {
        turns: [{ role: 'user', parts: [{ text }] }],
        turnComplete: true,
      },
    }));
  }

  close() {
    try { this.ws?.close(); } catch {}
    this.ws = null;
    this.isOpen = false;
  }
}
