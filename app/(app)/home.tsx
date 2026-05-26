import { useEffect, useState, useCallback } from 'react';
import { ScrollView, Text, View, Pressable, ActivityIndicator, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { VoiceBall, VoiceState } from '../../src/components/VoiceBall';
import { fetchTodayTimeline, TimelineSlot } from '../../src/services/goals';

export default function Home() {
  const router = useRouter();
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [timeline, setTimeline] = useState<TimelineSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTimeline = useCallback(async () => {
    try {
      const slots = await fetchTodayTimeline();
      setTimeline(slots);
    } catch (e) {
      // Fall back to empty — not a crash
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTimeline();
    // Refresh timeline whenever app comes to foreground
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') loadTimeline();
    });
    return () => sub.remove();
  }, [loadTimeline]);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  });
  const dayPct = Math.round(
    ((new Date().getHours() * 60 + new Date().getMinutes()) / (24 * 60)) * 100
  );

  const nextCall = timeline.find(s => s.status === 'active') ?? timeline.find(s => s.status === 'upcoming');

  const cycleVoice = () => {
    const order: VoiceState[] = ['idle', 'listening', 'processing', 'speaking'];
    setVoiceState(prev => order[(order.indexOf(prev) + 1) % order.length]);
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View pointerEvents="none" style={{
        position: 'absolute', top: -120, left: '50%', marginLeft: -180,
        width: 360, height: 360, borderRadius: 180,
        backgroundColor: 'rgba(56,189,248,0.05)',
      }} />

      {/* Header */}
      <View className="flex-row items-end justify-between px-6 pt-6 pb-4">
        <Text style={{ color: 'rgba(170,178,200,0.42)', fontSize: 12, fontFamily: 'Inter_400Regular' }}>
          {today}
        </Text>
        <View className="items-end">
          <Text style={{ color: '#38BDF8', fontSize: 14, fontWeight: '500', fontFamily: 'JetBrainsMono_500Medium' }}>
            92%
          </Text>
          <Text style={{ color: 'rgba(150,160,185,0.20)', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'JetBrainsMono_400Regular', marginTop: 2 }}>
            7-day velocity
          </Text>
        </View>
      </View>

      {/* Hero */}
      <View className="flex-1 px-6 justify-center">
        <View className="flex-row items-center mb-3">
          <View style={{ width: 18, height: 1, backgroundColor: 'rgba(150,160,185,0.25)' }} />
          <Text style={{ color: 'rgba(150,160,185,0.20)', fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', marginLeft: 8, fontFamily: 'Inter_500Medium' }}>
            Next call
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#38BDF8" style={{ alignSelf: 'flex-start', marginVertical: 16 }} />
        ) : nextCall ? (
          <>
            <View className="flex-row items-end">
              <Text style={{ color: '#EEF0F6', fontSize: 78, fontWeight: '100', letterSpacing: -3.5, lineHeight: 78, fontFamily: 'Inter_100Thin' }}>
                {nextCall.timeLabel.split(' ')[0]}
              </Text>
              <Text style={{ color: 'rgba(170,178,200,0.42)', fontSize: 20, fontWeight: '300', marginLeft: 5, marginBottom: 10, fontFamily: 'Inter_300Light' }}>
                {nextCall.timeLabel.split(' ')[1]}
              </Text>
            </View>
            <Text style={{ color: 'rgba(238,240,246,0.85)', fontSize: 23, fontWeight: '300', letterSpacing: -0.5, marginTop: 8, fontFamily: 'Inter_300Light' }}>
              {nextCall.goalTitle}
            </Text>
            <Text style={{ color: 'rgba(170,178,200,0.42)', fontSize: 12, marginTop: 6, fontFamily: 'Inter_400Regular' }}>
              {nextCall.framework?.replace('_', ' ')} ·{' '}
              <Text style={{ color: '#38BDF8' }}>
                {nextCall.status === 'active' ? 'now' : 'upcoming'}
              </Text>
            </Text>
          </>
        ) : (
          <View>
            <Text style={{ color: '#EEF0F6', fontSize: 28, fontWeight: '300', fontFamily: 'Inter_300Light', letterSpacing: -0.8 }}>
              All done for today
            </Text>
            <Text style={{ color: 'rgba(170,178,200,0.42)', fontSize: 14, marginTop: 6, fontFamily: 'Inter_400Regular' }}>
              Evening retro coming up.
            </Text>
          </View>
        )}

        {/* Day arc */}
        <View style={{ marginTop: 24, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, height: 2, backgroundColor: 'rgba(204,218,240,0.05)', borderRadius: 99, overflow: 'hidden' }}>
            <View style={{ width: `${dayPct}%`, height: '100%', backgroundColor: '#38BDF8', borderRadius: 99 }} />
          </View>
          <Text style={{ color: 'rgba(150,160,185,0.20)', fontSize: 10, fontFamily: 'JetBrainsMono_400Regular' }}>
            {dayPct}%
          </Text>
        </View>
      </View>

      <View style={{ height: 1, backgroundColor: 'rgba(204,218,240,0.05)', marginHorizontal: 24 }} />

      {/* Timeline strip */}
      {timeline.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 14, gap: 8 }}>
          {timeline.map((slot, i) => (
            <Pressable
              key={i}
              onPress={() => slot.status !== 'done' && router.push(`/call?goalId=${slot.goalId}&goalTitle=${encodeURIComponent(slot.goalTitle)}&type=midday`)}
              style={{
                minWidth: 92, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
                alignItems: 'center', gap: 5,
                opacity: slot.status === 'done' ? 0.28 : 1,
                backgroundColor: slot.status === 'active' ? 'rgba(56,189,248,0.04)' : 'transparent',
                borderWidth: 1,
                borderColor: slot.status === 'active' ? 'rgba(56,189,248,0.2)' : 'rgba(204,218,240,0.05)',
              }}
            >
              <Text style={{ color: 'rgba(170,178,200,0.42)', fontSize: 10, fontFamily: 'JetBrainsMono_500Medium' }}>
                {slot.timeLabel}
              </Text>
              <View style={{
                width: 5, height: 5, borderRadius: 99,
                backgroundColor: slot.status === 'done' ? 'rgba(134,239,172,0.5)'
                  : slot.status === 'active' ? '#38BDF8' : 'rgba(150,160,185,0.25)',
              }} />
              <Text style={{ color: 'rgba(170,178,200,0.42)', fontSize: 10, textAlign: 'center', fontFamily: 'Inter_400Regular' }}>
                {slot.goalTitle}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <View style={{ paddingVertical: 20, paddingHorizontal: 24 }}>
          <Pressable onPress={() => router.push('/(app)/goals')}>
            <Text style={{ color: 'rgba(56,189,248,0.7)', fontSize: 13, fontFamily: 'Inter_400Regular' }}>
              + Add your first goal
            </Text>
          </Pressable>
        </View>
      )}

      <View style={{ height: 1, backgroundColor: 'rgba(204,218,240,0.05)', marginHorizontal: 24 }} />

      {/* Bottom */}
      <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 42, alignItems: 'center', gap: 18 }}>
        <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
          <EscapeButton label="Rough Day" onPress={() => {}} />
          <EscapeButton label="Hit a Wall" onPress={() => router.push('/call?type=wall')} />
        </View>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Text style={{
            fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase',
            fontFamily: 'JetBrainsMono_400Regular',
            color: voiceState === 'idle' ? 'rgba(150,160,185,0.25)' : 'rgba(56,189,248,0.75)',
          }}>
            {voiceState === 'idle' ? 'tap to speak' : voiceState === 'listening' ? 'listening...' : voiceState === 'processing' ? 'thinking...' : 'speaking'}
          </Text>
          <VoiceBall state={voiceState} size={88} onPress={cycleVoice} />
        </View>
      </View>
    </SafeAreaView>
  );
}

function EscapeButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{
      flex: 1, paddingVertical: 11, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.012)',
      borderWidth: 1, borderColor: 'rgba(204,218,240,0.05)',
    }}>
      <Text style={{ color: 'rgba(170,178,200,0.42)', fontSize: 11.5, fontFamily: 'Inter_400Regular' }}>
        {label}
      </Text>
    </Pressable>
  );
}
