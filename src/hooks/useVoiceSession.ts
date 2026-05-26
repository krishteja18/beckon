import { useCallback, useRef, useState } from 'react';
import { VoiceSession, SessionConfig, VoiceState } from '../services/voiceSession';

interface UseVoiceSessionReturn {
  voiceState: VoiceState;
  transcript: string[];
  start: (config: SessionConfig) => Promise<void>;
  stop: () => void;
  sendAudio: (pcmBase64: string) => void;
  error: string | null;
}

/**
 * React hook wrapping VoiceSession.
 * Exposes voiceState, transcript, and start/stop/sendAudio.
 * The native module (AlarmManager ForegroundService) calls start() on alarm fire.
 * The call screen uses this hook directly for UI-initiated calls.
 */
export function useVoiceSession(): UseVoiceSessionReturn {
  const sessionRef = useRef<VoiceSession | null>(null);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async (config: SessionConfig) => {
    setError(null);
    setTranscript([]);

    const session = new VoiceSession();
    sessionRef.current = session;

    await session.open(config, {
      onStateChange: (s) => setVoiceState(s),
      onTranscript: (text, role) =>
        setTranscript((prev) => [...prev, `${role === 'model' ? 'Coach' : 'You'}: ${text}`]),
      onError: (err) => setError(err.message),
      onClose: (reason) => {
        setVoiceState('idle');
        if (reason && reason !== 'closed') setError(reason);
      },
    });
  }, []);

  const stop = useCallback(() => {
    sessionRef.current?.close();
    sessionRef.current = null;
    setVoiceState('idle');
  }, []);

  const sendAudio = useCallback((pcmBase64: string) => {
    sessionRef.current?.sendAudio(pcmBase64);
  }, []);

  return { voiceState, transcript, start, stop, sendAudio, error };
}
