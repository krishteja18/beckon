import { useEffect, useState, useCallback } from 'react';
import { ScrollView, Text, View, Pressable, ActivityIndicator, AppState, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { VoiceBall, VoiceState } from '../../src/components/VoiceBall';
import { AmbientBackground } from '../../src/components/AmbientBackground';
import { fetchTodayTimeline, TimelineSlot } from '../../src/services/goals';
import { computeVelocity } from '../../src/services/velocity';

export default function Home() {
  const router = useRouter();
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [timeline, setTimeline] = useState<TimelineSlot[]>([]);
  const [velocity, setVelocity] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTimeline = useCallback(async () => {
    try {
      const [slots, vel] = await Promise.all([
        fetchTodayTimeline(),
        computeVelocity(),
      ]);
      setTimeline(slots);
      setVelocity(vel.percent);
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

  const getVoiceLabelColor = () => {
    if (voiceState === 'idle') return 'rgba(170, 178, 200, 0.45)';
    if (voiceState === 'listening') return '#06B6D4'; // Sky Cyan
    if (voiceState === 'processing') return '#A855F7'; // Neon Violet
    return '#EC4899'; // Magenta Pink
  };

  return (
    <AmbientBackground>
      <SafeAreaView style={styles.safeArea}>
        
        {/* Header */}
        <View className="flex-row items-end justify-between px-6 pt-6 pb-4">
          <View>
            <Text style={{ color: 'rgba(170, 178, 200, 0.55)', fontSize: 12, fontFamily: 'Inter_400Regular' }}>
              TODAY
            </Text>
            <Text style={{ color: '#EEF0F6', fontSize: 14, fontFamily: 'Inter_600SemiBold', marginTop: 2 }}>
              {today}
            </Text>
          </View>
          <View style={styles.velocityBadge}>
            <Text style={{ color: '#38BDF8', fontSize: 13.5, fontWeight: '600', fontFamily: 'JetBrainsMono_500Medium' }}>
              {velocity == null ? '—' : `${velocity}%`}
            </Text>
            <Text style={{ color: 'rgba(170, 178, 200, 0.45)', fontSize: 8, letterSpacing: 0.8, textTransform: 'uppercase', fontFamily: 'JetBrainsMono_400Regular', marginTop: 1 }}>
              Velocity
            </Text>
          </View>
        </View>

        {/* Hero Section - Volumetric Glassmorphic Card */}
        <View className="flex-1 px-6 justify-center">
          <View style={styles.heroCard}>
            {/* Top Light Leak reflection decoration inside the card */}
            <View style={styles.cardLightReflection} />

            <View className="flex-row items-center mb-4">
              <View style={{ width: 12, height: 1.5, backgroundColor: 'rgba(168, 85, 247, 0.4)' }} />
              <Text style={{ color: 'rgba(168, 85, 247, 0.8)', fontSize: 9.5, letterSpacing: 1.6, textTransform: 'uppercase', marginLeft: 8, fontFamily: 'JetBrainsMono_500Medium' }}>
                Next call
              </Text>
            </View>

            {loading ? (
              <ActivityIndicator color="#38BDF8" style={{ alignSelf: 'flex-start', marginVertical: 24 }} />
            ) : nextCall ? (
              <Pressable
                onPress={() => router.push(`/call?goalId=${nextCall.goalId}&goalTitle=${encodeURIComponent(nextCall.goalTitle)}&type=${nextCall.status === 'active' ? 'morning' : 'midday'}`)}
                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
              >
                <View className="flex-row items-end">
                  <Text style={{ color: '#EEF0F6', fontSize: 72, fontWeight: '100', letterSpacing: -3, lineHeight: 72, fontFamily: 'Inter_100Thin' }}>
                    {nextCall.timeLabel.split(' ')[0]}
                  </Text>
                  <Text style={{ color: 'rgba(170, 178, 200, 0.55)', fontSize: 18, fontWeight: '300', marginLeft: 4, marginBottom: 8, fontFamily: 'Inter_300Light' }}>
                    {nextCall.timeLabel.split(' ')[1]}
                  </Text>
                </View>
                <Text style={{ color: '#EEF0F6', fontSize: 23, fontWeight: '300', letterSpacing: -0.5, marginTop: 10, fontFamily: 'Inter_300Light', lineHeight: 28 }}>
                  {nextCall.goalTitle}
                </Text>
                <Text style={{ color: 'rgba(170, 178, 200, 0.45)', fontSize: 12, marginTop: 8, fontFamily: 'Inter_400Regular' }}>
                  {nextCall.framework?.replace('_', ' ')} ·{' '}
                  <Text style={{ color: '#38BDF8', fontWeight: '500' }}>
                    {nextCall.status === 'active' ? 'ready now' : 'scheduled'}
                  </Text>
                </Text>
              </Pressable>
            ) : (
              <View>
                <Text style={{ color: '#EEF0F6', fontSize: 26, fontWeight: '200', fontFamily: 'Inter_300Light', letterSpacing: -0.8 }}>
                  All done for today
                </Text>
                <Text style={{ color: 'rgba(170, 178, 200, 0.45)', fontSize: 13, marginTop: 8, fontFamily: 'Inter_400Regular' }}>
                  Evening retro coming up.
                </Text>
              </View>
            )}

            {/* Glowing Neon Day Progress Track */}
            <View style={{ marginTop: 28, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressBar, { width: `${dayPct}%` }]} />
              </View>
              <Text style={{ color: 'rgba(170, 178, 200, 0.35)', fontSize: 10, fontFamily: 'JetBrainsMono_400Regular' }}>
                {dayPct}%
              </Text>
            </View>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.sectionDivider} />

        {/* Timeline Strip - Horizontal Scrolling Glass Tiles */}
        <View style={{ paddingVertical: 4 }}>
          {timeline.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 14, gap: 10 }}
            >
              {timeline.map((slot, i) => {
                const isActive = slot.status === 'active';
                const isDone = slot.status === 'done';
                return (
                  <Pressable
                    key={i}
                    onPress={() => slot.status !== 'done' && router.push(`/call?goalId=${slot.goalId}&goalTitle=${encodeURIComponent(slot.goalTitle)}&type=midday`)}
                    style={[
                      styles.timelineCard,
                      isActive && styles.timelineCardActive,
                      isDone && { opacity: 0.35 },
                    ]}
                  >
                    <Text
                      style={{
                        color: isActive ? '#38BDF8' : 'rgba(170, 178, 200, 0.6)',
                        fontSize: 10.5,
                        fontFamily: 'JetBrainsMono_500Medium',
                      }}
                    >
                      {slot.timeLabel}
                    </Text>
                    <View
                      style={[
                        styles.timelineStatusDot,
                        isDone && { backgroundColor: '#10B981', shadowColor: '#10B981' },
                        isActive && { backgroundColor: '#38BDF8', shadowColor: '#38BDF8' },
                      ]}
                    />
                    <Text
                      numberOfLines={1}
                      style={{
                        color: isActive ? '#EEF0F6' : 'rgba(170, 178, 200, 0.45)',
                        fontSize: 10,
                        textAlign: 'center',
                        fontFamily: 'Inter_400Regular',
                        maxWidth: 80,
                      }}
                    >
                      {slot.goalTitle}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <View style={{ paddingVertical: 20, paddingHorizontal: 24 }}>
              <Pressable
                onPress={() => router.push('/(app)/goals')}
                style={styles.addGoalCard}
              >
                <Text style={{ color: '#38BDF8', fontSize: 13, fontFamily: 'Inter_500Medium' }}>
                  + Add your first goal to begin
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Divider */}
        <View style={styles.sectionDivider} />

        {/* Bottom Panel around the Voice Orb */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 42, alignItems: 'center', gap: 20 }}>
          <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
            <EscapeButton label="Rough Day" onPress={() => {}} />
            <EscapeButton label="Hit a Wall" tone="warning" onPress={() => router.push('/call?type=wall')} />
          </View>
          
          <View style={{ alignItems: 'center', gap: 10 }}>
            <Text
              style={{
                fontSize: 9.5,
                letterSpacing: 1.8,
                textTransform: 'uppercase',
                fontFamily: 'JetBrainsMono_500Medium',
                color: getVoiceLabelColor(),
              }}
            >
              {voiceState === 'idle' ? 'tap to voice chat' :
               voiceState === 'listening' ? 'listening' :
               voiceState === 'processing' ? 'thinking' : 'speaking'}
            </Text>
            
            {/* Visual halo backing for the voice orb */}
            <View style={styles.orbGlowBacking}>
              <VoiceBall state={voiceState} size={92} onPress={cycleVoice} />
            </View>
          </View>
        </View>

      </SafeAreaView>
    </AmbientBackground>
  );
}

function EscapeButton({ label, onPress, tone = 'neutral' }: { label: string; onPress: () => void; tone?: 'neutral' | 'warning' }) {
  const isWarning = tone === 'warning';
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.escapeButton,
        isWarning && styles.escapeButtonWarning,
      ]}
    >
      <Text
        style={{
          color: isWarning ? '#F59E0B' : 'rgba(170, 178, 200, 0.65)',
          fontSize: 12,
          fontFamily: 'Inter_500Medium',
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
  velocityBadge: {
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  heroCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 28,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  cardLightReflection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#38BDF8',
    borderRadius: 99,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 24,
  },
  timelineCard: {
    minWidth: 96,
    borderRadius: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  timelineCardActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.03)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  timelineStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 99,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
  },
  addGoalCard: {
    backgroundColor: 'rgba(56, 189, 248, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.12)',
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  escapeButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  escapeButtonWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.02)',
    borderColor: 'rgba(245, 158, 11, 0.18)',
  },
  orbGlowBacking: {
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
  },
});
