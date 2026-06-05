import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CallWaves } from '../src/components/CallWaves';
import { VoiceBall } from '../src/components/VoiceBall';
import { AmbientBackground } from '../src/components/AmbientBackground';
import { useVoiceSession } from '../src/hooks/useVoiceSession';
import type { CallType } from '../src/services/voiceSession';

export default function Call() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    goalId?: string;
    goalTitle?: string;
    type?: string;
    intensity?: string;
    framework?: string;
  }>();

  const { voiceState, transcript, toolCalls, start, stop, sendText, error } = useVoiceSession();
  const [textInput, setTextInput] = useState('');
  const isWeb = Platform.OS === 'web';

  const callType = (params.type ?? 'morning') as CallType;
  const goalTitle = params.goalTitle ?? undefined;
  
  const callTypeLabel: Record<CallType, string> = {
    morning: 'Morning Session',
    midday:  'Midday Check-in',
    evening: 'Evening Check-in',
    wall:    'On-Demand Call',
    retro:   'Evening Reflection',
    routine: 'Routine Reminder',
  };

  const pulse = useSharedValue(1);

  useEffect(() => {
    start({
      callType,
      goalTitle,
      goalId: params.goalId,
      intensity: (params.intensity as any) ?? 'firm',
      framework: (params.framework as any) ?? undefined,
      // Web has no native audio — use text mode so the model responds in text
      textMode: isWeb,
    });

    pulse.value = withRepeat(
      withTiming(1.22, { duration: 2200 }),
      -1,
      true
    );

    return () => stop();
  }, []);

  const handleEnd = () => {
    stop();
    router.back();
  };

  const animatedHaloStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulse.value }],
      opacity: 0.45 - (pulse.value - 1) * 2.0,
    };
  });

  const getVoiceLabelColor = () => {
    if (voiceState === 'idle') return '#6B7280'; // Slate-gray secondary
    if (voiceState === 'listening') return '#10B981'; // Mint emerald
    if (voiceState === 'processing') return '#6C5DD3'; // Brand-Purple
    return '#FB923C'; // Coral Orange
  };

  return (
    <AmbientBackground>
      <SafeAreaView style={styles.safeArea}>
        
        {/* Sleek Volumetric Audio Player HUD */}
        <View style={styles.container}>

          {/* Top Track/Session Info */}
          <View className="items-center gap-1">
            <Text style={styles.trackLabel}>
              {callTypeLabel[callType] ?? 'Accountability Session'}
            </Text>
            {goalTitle && (
              <Text style={styles.goalText}>
                {goalTitle}
              </Text>
            )}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>
                  {`Connection issue: ${error}`}
                </Text>
              </View>
            )}
          </View>

          {/* Center: Volumetric Voice Orb floating inside a breathing halo */}
          <View className="items-center justify-center my-auto relative" style={{ minHeight: 280, width: '100%' }}>
            <Animated.View style={[styles.halo, animatedHaloStyle]} />
            <View style={styles.orbShadowWrapper}>
              <VoiceBall state={voiceState} size={230} />
            </View>
            <Text
              style={[
                styles.statusLabel,
                { color: getVoiceLabelColor() }
              ]}
            >
              {voiceState === 'idle'       ? 'Connecting...' :
               voiceState === 'listening'  ? 'Listening...' :
               voiceState === 'processing' ? 'Thinking...' : 'Speaking...'}
            </Text>
          </View>

          {/* Tool-call event chips — small confirmations of what the coach changed */}
          {toolCalls.length > 0 && (
            <View style={styles.toolCallStack}>
              {toolCalls.slice(-3).map(tc => (
                <View
                  key={tc.id}
                  style={[
                    styles.toolCallChip,
                    !tc.result.ok && tc.result.requires !== 'confirmation' && styles.toolCallChipError,
                    tc.result.requires === 'confirmation' && styles.toolCallChipPending,
                  ]}
                >
                  <Text style={styles.toolCallChipDot}>
                    {tc.result.ok ? '✓' : tc.result.requires === 'confirmation' ? '?' : '!'}
                  </Text>
                  <Text style={styles.toolCallChipText} numberOfLines={2}>
                    {tc.result.message ?? tc.name}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Interactive transcripts styled as premium lyric scrolls */}
          <View style={styles.transcriptContainer}>
            {transcript.length > 0 ? (
              <ScrollView
                style={{ maxHeight: 110, width: '100%' }}
                contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                showsVerticalScrollIndicator={false}
              >
                {transcript.slice(-3).map((line, i, arr) => {
                  const isLatest = i === arr.length - 1;
                  const isSecondLatest = i === arr.length - 2;
                  const opacity = isLatest ? 0.95 : isSecondLatest ? 0.5 : 0.22;
                  
                  return (
                    <Text
                      key={i}
                      style={{
                        color: isLatest ? '#1E1B4B' : '#6B7280',
                        fontSize: 15,
                        textAlign: 'center',
                        fontFamily: 'Inter_500Medium',
                        lineHeight: 22,
                        opacity,
                        paddingHorizontal: 24,
                      }}
                    >
                      {line}
                    </Text>
                  );
                })}
              </ScrollView>
            ) : (
              <Text style={styles.waitingText}>
                Connecting your call...
              </Text>
            )}
          </View>

          {/* Web-only text input for testing voice commands without mic */}
          {isWeb && (
            <View style={styles.textInputRow}>
              <TextInput
                style={styles.textInput}
                value={textInput}
                onChangeText={setTextInput}
                placeholder="Type a command, e.g. 'add a routine to take BP tablet at 5pm daily'"
                placeholderTextColor="#9CA3AF"
                onSubmitEditing={() => {
                  if (textInput.trim()) {
                    sendText(textInput.trim());
                    setTextInput('');
                  }
                }}
                returnKeyType="send"
              />
              <Pressable
                onPress={() => {
                  if (textInput.trim()) {
                    sendText(textInput.trim());
                    setTextInput('');
                  }
                }}
                style={styles.textSendBtn}
              >
                <Text style={styles.textSendBtnText}>Send</Text>
              </Pressable>
            </View>
          )}

          {/* Controls - Premium light rounded button capsules */}
          <View style={styles.controlRow}>
            <CallButton
              label="MUTE"
              onPress={() => {}}
            />
            <CallButton
              label="END CALL"
              tone="danger"
              onPress={handleEnd}
            />
          </View>

        </View>
      </SafeAreaView>

      {/* Elegant Single Undulating Wave Line */}
      <CallWaves state={voiceState} />
    </AmbientBackground>
  );
}

function CallButton({
  label, onPress, tone = 'neutral',
}: { label: string; onPress: () => void; tone?: 'neutral' | 'danger' }) {
  const isDanger = tone === 'danger';
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.callButton,
        isDanger ? styles.callButtonDanger : styles.callButtonNeutral,
      ]}
    >
      <Text
        style={[
          styles.callButtonText,
          isDanger ? { color: '#EF4444' } : { color: '#6C5DD3' }
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 32,
    paddingHorizontal: 24,
    zIndex: 10,
  },
  trackLabel: {
    letterSpacing: 1.2,
    fontFamily: 'Inter_600SemiBold',
    color: '#6C5DD3', // Purple brand color
    fontSize: 12,
    textTransform: 'uppercase',
  },
  goalText: {
    color: '#1E1B4B', // Slate indigo primary
    fontSize: 24,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: -0.6,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 30,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 10,
    maxWidth: '90%',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  orbShadowWrapper: {
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 36,
    elevation: 12,
    zIndex: 5,
  },
  halo: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(108, 93, 211, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(108, 93, 211, 0.04)',
    zIndex: 1,
  },
  statusLabel: {
    letterSpacing: 1.5,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    marginTop: 16,
    textTransform: 'uppercase',
  },
  transcriptContainer: {
    width: '100%',
    marginVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
  },
  waitingText: {
    color: '#6B7280',
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  controlRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  callButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 24, // capsule buttons
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  callButtonNeutral: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(108, 93, 211, 0.16)',
  },
  callButtonDanger: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(239, 68, 68, 0.16)',
  },
  callButtonText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
  },
  toolCallStack: {
    width: '100%',
    gap: 6,
    marginVertical: 8,
  },
  toolCallChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(108, 93, 211, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toolCallChipError: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  toolCallChipPending: {
    backgroundColor: 'rgba(251, 146, 60, 0.06)',
    borderColor: 'rgba(251, 146, 60, 0.25)',
  },
  toolCallChipDot: {
    color: '#6C5DD3',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    width: 14,
    textAlign: 'center',
  },
  toolCallChipText: {
    flex: 1,
    color: '#1E1B4B',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    lineHeight: 16,
  },
  textInputRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
    marginVertical: 12,
  },
  textInput: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.16)',
    paddingHorizontal: 16,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#1E1B4B',
  },
  textSendBtn: {
    paddingHorizontal: 18,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6C5DD3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textSendBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.3,
  },
});

