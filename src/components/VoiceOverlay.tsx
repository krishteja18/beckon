import React, { createContext, useCallback, useContext, useState } from 'react';
import {
  Modal, View, Text, Pressable, TextInput, Platform, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { VoiceBall } from './VoiceBall';
import { CallWaves } from './CallWaves';
import { useVoiceSession } from '../hooks/useVoiceSession';
import type { SessionConfig } from '../services/voiceSession';

interface VoiceOverlayApi {
  open: (cfg?: Partial<SessionConfig>) => void;
  close: () => void;
  isOpen: boolean;
}

const Ctx = createContext<VoiceOverlayApi | null>(null);

export function useVoiceOverlay(): VoiceOverlayApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useVoiceOverlay must be used within VoiceOverlayProvider');
  return v;
}

const isWeb = Platform.OS === 'web';

/**
 * Global "talk to your coach" experience — summoned from any screen by the nav
 * orb or the Home hero orb. Transient immersive mode (not a navigation
 * destination): the orb is the interface, state shown by motion + one word,
 * minimal chrome, on a deep themed gradient. Modelled on ChatGPT Voice / Gemini Live.
 */
export function VoiceOverlayProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [textInput, setTextInput] = useState('');
  const { voiceState, transcript, toolCalls, start, stop, sendText, error } = useVoiceSession();

  const open = useCallback((cfg?: Partial<SessionConfig>) => {
    setIsOpen(true);
    start({
      callType: 'midday',
      enableTools: true,
      textMode: isWeb,
      ...cfg,
    } as SessionConfig);
  }, [start]);

  const close = useCallback(() => {
    stop();
    setIsOpen(false);
  }, [stop]);

  return (
    <Ctx.Provider value={{ open, close, isOpen }}>
      {children}
      <Modal transparent visible={isOpen} animationType="fade" onRequestClose={close}>
        <VoiceStage
          voiceState={voiceState}
          lastLine={transcript.length ? transcript[transcript.length - 1] : null}
          lastTool={toolCalls.length ? toolCalls[toolCalls.length - 1] : null}
          error={error}
          textInput={textInput}
          setTextInput={setTextInput}
          onSend={() => { if (textInput.trim()) { sendText(textInput.trim()); setTextInput(''); } }}
          onEnd={close}
        />
      </Modal>
    </Ctx.Provider>
  );
}

/** Deep indigo→purple themed gradient with a soft glow pooled behind the orb. */
function VoiceGradientBg() {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <SvgLinearGradient id="vbg" x1="0" y1="0" x2="0.5" y2="1">
          <Stop offset="0" stopColor="#221E4A" />
          <Stop offset="1" stopColor="#0B0918" />
        </SvgLinearGradient>
        <RadialGradient id="vglow" cx="50%" cy="38%" r="60%">
          <Stop offset="0" stopColor="#6C5DD3" stopOpacity="0.30" />
          <Stop offset="1" stopColor="#6C5DD3" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#vbg)" />
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#vglow)" />
    </Svg>
  );
}

function VoiceStage({
  voiceState, lastLine, lastTool, error, textInput, setTextInput, onSend, onEnd,
}: {
  voiceState: 'idle' | 'listening' | 'processing' | 'speaking';
  lastLine: string | null;
  lastTool: { id: string; result: { ok: boolean; message?: string; requires?: 'confirmation' } } | null;
  error: string | null;
  textInput: string;
  setTextInput: (s: string) => void;
  onSend: () => void;
  onEnd: () => void;
}) {
  const [showKeyboard, setShowKeyboard] = useState(false);

  const statusLabel =
    voiceState === 'idle' ? 'Connecting' :
    voiceState === 'listening' ? 'Listening' :
    voiceState === 'processing' ? 'Thinking' : 'Speaking';
  // Bright, high-contrast on the purple gradient (a light-purple "thinking"
  // hue would vanish into the bg, so it's a sky tone here).
  const statusColor =
    voiceState === 'idle' ? 'rgba(255,255,255,0.6)' :
    voiceState === 'listening' ? '#4ADE80' :
    voiceState === 'processing' ? '#7DD3FC' : '#FB923C';

  const caption = lastTool?.result.message ?? lastLine ?? null;

  return (
    <View style={styles.root}>
      <VoiceGradientBg />

      <SafeAreaView style={styles.safe}>
        {/* Top: minimize back to the screen you were on */}
        <View style={styles.topRow}>
          <Pressable onPress={onEnd} hitSlop={12} style={styles.minimize}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M6 9l6 6 6-6" />
            </Svg>
          </Pressable>
        </View>

        {/* Center: the orb is the interface */}
        <View style={styles.center}>
          <VoiceBall state={voiceState} size={208} />

          <Text style={styles.eyebrow}>YOUR COACH</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.status, { color: statusColor }]}>{statusLabel}</Text>
          </View>

          {caption && (
            <Text style={styles.caption} numberOfLines={3}>{caption}</Text>
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        {/* Voice wave — sits above the controls, wavers with the conversation */}
        <View style={styles.waveBand}>
          <CallWaves state={voiceState} containerStyle={StyleSheet.absoluteFill as object} height={185} />
        </View>

        {/* Bottom: minimal, premium controls */}
        <View style={styles.bottom}>
          {isWeb && showKeyboard && (
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={textInput}
                onChangeText={setTextInput}
                placeholder='Type a command…'
                placeholderTextColor="#9CA3AF"
                autoFocus
                onSubmitEditing={onSend}
                returnKeyType="send"
              />
              <Pressable style={styles.send} onPress={onSend}>
                <Text style={styles.sendText}>Send</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.controlRow}>
            {isWeb ? (
              <Pressable onPress={() => setShowKeyboard(v => !v)} style={styles.secondaryBtn}>
                <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M2 6h20v12H2z" />
                  <Path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" />
                </Svg>
              </Pressable>
            ) : <View style={styles.controlSpacer} />}

            {/* End — circular, unmistakable */}
            <Pressable onPress={onEnd} style={styles.endBtn}>
              <View style={styles.endIcon} />
            </Pressable>

            <View style={styles.controlSpacer} />
          </View>

          <Text style={styles.endHint}>End</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0918' },
  safe: { flex: 1, justifyContent: 'space-between', zIndex: 10 },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  minimize: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  eyebrow: {
    marginTop: 36,
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
    letterSpacing: 2,
    fontFamily: 'Inter_600SemiBold',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 8,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  status: {
    fontSize: 13,
    letterSpacing: 0.4,
    fontFamily: 'Inter_600SemiBold',
  },
  caption: {
    marginTop: 22,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
    maxWidth: 300,
  },
  error: {
    marginTop: 14,
    color: '#FCA5A5',
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'Inter_500Medium',
  },

  waveBand: {
    height: 185,
    width: '100%',
  },
  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    alignItems: 'center',
    gap: 14,
  },
  inputRow: { flexDirection: 'row', gap: 8, width: '100%' },
  input: {
    flex: 1, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF',
    paddingHorizontal: 16, fontSize: 13, fontFamily: 'Inter_400Regular', color: '#1E1B4B',
  },
  send: {
    paddingHorizontal: 18, height: 44, borderRadius: 22,
    backgroundColor: '#6C5DD3', alignItems: 'center', justifyContent: 'center',
  },
  sendText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  controlSpacer: { width: 48 },
  secondaryBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endBtn: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 8,
  },
  endIcon: { width: 22, height: 22, borderRadius: 6, backgroundColor: '#FFFFFF' },
  endHint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: 'Inter_600SemiBold',
  },
});
