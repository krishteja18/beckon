import { useEffect } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { VoiceBall } from '../src/components/VoiceBall';
import { useVoiceSession } from '../src/hooks/useVoiceSession';
import type { CallType } from '../src/services/voiceSession';

/**
 * Active call screen.
 * Launched when a scheduled alarm fires OR from home (mic tap / hit-a-wall).
 * Params: goalId, goalTitle, type (CallType), intensity, framework
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

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-1 items-center justify-between py-12 px-6">

        {/* Top */}
        <View className="items-center gap-2">
          <Text
            className="text-text-3 text-[10px] uppercase"
            style={{ letterSpacing: 1.6, fontFamily: 'JetBrainsMono_500Medium' }}
          >
            {callTypeLabel[callType] ?? 'SCHEDULED'}
          </Text>
          {goalTitle && (
            <Text
              style={{ color: '#EEF0F6', fontSize: 26, fontFamily: 'Inter_300Light', letterSpacing: -0.8, marginTop: 8 }}
            >
              {goalTitle}
            </Text>
          )}
          {error && (
            <Text className="text-[12px] text-center" style={{ color: '#FCA5A5', fontFamily: 'Inter_400Regular', marginTop: 8 }}>
              {error}
            </Text>
          )}
        </View>

        {/* Center: voice ball */}
        <View className="items-center gap-4">
          <VoiceBall state={voiceState} size={200} />
          <Text
            className="text-text-3 text-[10px] uppercase"
            style={{ letterSpacing: 1.6, fontFamily: 'JetBrainsMono_400Regular' }}
          >
            {voiceState === 'idle'       ? 'connecting...' :
             voiceState === 'listening'  ? 'listening' :
             voiceState === 'processing' ? 'thinking' : 'speaking'}
          </Text>
        </View>

        {/* Transcript (last 3 lines) */}
        {transcript.length > 0 && (
          <ScrollView
            style={{ maxHeight: 80, width: '100%' }}
            contentContainerStyle={{ gap: 4 }}
            showsVerticalScrollIndicator={false}
          >
            {transcript.slice(-3).map((line, i) => (
              <Text key={i} className="text-text-2 text-[12px] text-center" style={{ fontFamily: 'Inter_400Regular' }}>
                {line}
              </Text>
            ))}
          </ScrollView>
        )}

        {/* Controls */}
        <View className="flex-row gap-3 w-full">
          <CallButton label="Mute" onPress={() => {/* TODO: mute mic in native module */}} />
          <CallButton label="End call" tone="danger" onPress={handleEnd} />
        </View>
      </View>
    </SafeAreaView>
  );
}

function CallButton({
  label, onPress, tone = 'neutral',
}: { label: string; onPress: () => void; tone?: 'neutral' | 'danger' }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 border rounded-2xl py-4 items-center"
      style={{
        backgroundColor: tone === 'danger' ? 'rgba(248,113,113,0.06)' : 'rgba(255,255,255,0.02)',
        borderColor:     tone === 'danger' ? 'rgba(248,113,113,0.18)' : 'rgba(204,218,240,0.06)',
      }}
    >
      <Text style={{
        color: tone === 'danger' ? '#FCA5A5' : 'rgba(238,240,246,0.85)',
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
      }}>
        {label}
      </Text>
    </Pressable>
  );
}
