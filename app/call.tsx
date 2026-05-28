import { useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { VoiceBall } from '../src/components/VoiceBall';
import { AmbientBackground } from '../src/components/AmbientBackground';
import { useVoiceSession } from '../src/hooks/useVoiceSession';
import type { CallType } from '../src/services/voiceSession';

/**
 * Premium Voice Calling Screen.
 * Renders a full-screen ambient space gradient, centered pulsing Gemini orb,
 * and high-fidelity scrolling faded transcripts.
 */
export default function Call() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    goalId?: string;
    goalTitle?: string;
    type?: string;
    intensity?: string;
    framework?: string;
  }>();

  const { voiceState, transcript, start, stop, error } = useVoiceSession();

  const callType = (params.type ?? 'morning') as CallType;
  const goalTitle = params.goalTitle ?? undefined;
  const callTypeLabel: Record<CallType, string> = {
    morning: 'MORNING · INTENTION',
    midday:  'MIDDAY · CHECK-IN',
    evening: 'EVENING · REFLECT',
    wall:    'WALL · RESCUE',
    retro:   'RETRO · PATTERNS',
  };

  useEffect(() => {
    start({
      callType,
      goalTitle,
      goalId: params.goalId,
      intensity: (params.intensity as any) ?? 'firm',
      framework: (params.framework as any) ?? undefined,
    });
    return () => stop();
  }, []);

  const handleEnd = () => {
    stop();
    router.back();
  };

  const getVoiceLabelColor = () => {
    if (voiceState === 'idle') return 'rgba(170, 178, 200, 0.45)';
    if (voiceState === 'listening') return '#06B6D4'; // Sky Cyan
    if (voiceState === 'processing') return '#A855F7'; // Neon Violet
    return '#EC4899'; // Magenta Pink
  };

  return (
    <AmbientBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>

          {/* Top Info */}
          <View className="items-center gap-3">
            <Text
              style={{
                letterSpacing: 2,
                fontFamily: 'JetBrainsMono_500Medium',
                color: 'rgba(168, 85, 247, 0.85)', // beautiful glowing purple
                fontSize: 10.5,
              }}
            >
              {callTypeLabel[callType] ?? 'SCHEDULED CALL'}
            </Text>
            {goalTitle && (
              <Text
                style={{
                  color: '#EEF0F6',
                  fontSize: 24,
                  fontFamily: 'Inter_300Light',
                  letterSpacing: -0.6,
                  marginTop: 6,
                  textAlign: 'center',
                  paddingHorizontal: 24,
                  lineHeight: 30,
                }}
              >
                {goalTitle}
              </Text>
            )}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>
                  {error}
                </Text>
              </View>
            )}
          </View>

          {/* Center: Volumetric pulsing Gemini Orb */}
          <View className="items-center gap-6 my-auto">
            <View style={styles.orbShadowWrapper}>
              <VoiceBall state={voiceState} size={220} />
            </View>
            <Text
              style={{
                letterSpacing: 2,
                fontFamily: 'JetBrainsMono_500Medium',
                color: getVoiceLabelColor(),
                fontSize: 11,
                textTransform: 'uppercase',
                marginTop: 6,
              }}
            >
              {voiceState === 'idle'       ? 'connecting' :
               voiceState === 'listening'  ? 'listening' :
               voiceState === 'processing' ? 'thinking' : 'speaking'}
            </Text>
          </View>

          {/* Scrolling cinematic fading Transcripts */}
          <View style={styles.transcriptContainer}>
            {transcript.length > 0 ? (
              <ScrollView
                style={{ maxHeight: 110, width: '100%' }}
                contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                showsVerticalScrollIndicator={false}
              >
                {transcript.slice(-3).map((line, i, arr) => {
                  // Beautiful cinematic dialog opacity fading based on age of line
                  const isLatest = i === arr.length - 1;
                  const isSecondLatest = i === arr.length - 2;
                  const opacity = isLatest ? 0.95 : isSecondLatest ? 0.45 : 0.22;
                  
                  return (
                    <Text
                      key={i}
                      style={{
                        color: isLatest ? '#EEF0F6' : 'rgba(170, 178, 200, 0.85)',
                        fontSize: 13,
                        textAlign: 'center',
                        fontFamily: 'Inter_400Regular',
                        lineHeight: 18,
                        opacity,
                        paddingHorizontal: 20,
                        textShadowColor: isLatest ? 'rgba(255,255,255,0.1)' : 'transparent',
                        textShadowOffset: { width: 0, height: 0 },
                        textShadowRadius: 4,
                      }}
                    >
                      {line}
                    </Text>
                  );
                })}
              </ScrollView>
            ) : (
              <Text style={styles.waitingText}>
                Waiting for conversation to begin...
              </Text>
            )}
          </View>

          {/* Controls - Premium glassmorphic buttons */}
          <View className="flex-row gap-4 w-full px-2 mt-4">
            <CallButton
              label="Mute"
              onPress={() => {/* TODO: mute mic in native module */}}
            />
            <CallButton
              label="End Call"
              tone="danger"
              onPress={handleEnd}
            />
          </View>

        </View>
      </SafeAreaView>
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
        style={{
          color: isDanger ? '#FCA5A5' : 'rgba(238, 240, 246, 0.85)',
          fontSize: 14.5,
          fontFamily: 'Inter_500Medium',
          letterSpacing: -0.1,
        }}
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
    paddingVertical: 42,
    paddingHorizontal: 24,
  },
  errorContainer: {
    backgroundColor: 'rgba(248, 113, 113, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 10,
    maxWidth: '90%',
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 12.5,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  orbShadowWrapper: {
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 36,
    elevation: 12,
  },
  transcriptContainer: {
    width: '100%',
    marginVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
  },
  waitingText: {
    color: 'rgba(170, 178, 200, 0.3)',
    fontSize: 12.5,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  callButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callButtonNeutral: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  callButtonDanger: {
    backgroundColor: 'rgba(244, 63, 94, 0.03)',
    borderColor: 'rgba(244, 63, 94, 0.18)',
    shadowColor: '#f43f5e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
});
