import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AmbientBackground } from '../../src/components/AmbientBackground';
import { fetchRetros, computeLiveRetro, RetroType, LiveRetro } from '../../src/services/retros';
import { Database } from '../../src/services/database.types';

type Retro = Database['public']['Tables']['retros']['Row'];

const TABS: { value: RetroType; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export default function Retros() {
  const [tab, setTab] = useState<RetroType>('daily');
  const [retros, setRetros] = useState<Retro[]>([]);
  const [live, setLive] = useState<LiveRetro | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      fetchRetros(tab).catch(() => [] as Retro[]),
      computeLiveRetro(tab).catch(() => null),
    ]).then(([stored, liveRetro]) => {
      if (!active) return;
      setRetros(stored);
      setLive(liveRetro);
      setLoading(false);
    });
    return () => { active = false; };
  }, [tab]);

  const periodWord = tab === 'weekly' ? 'week' : tab === 'monthly' ? 'month' : 'day';
  const isEmpty = !loading && !live && retros.length === 0;

  return (
    <AmbientBackground>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Retros</Text>
          <Text style={styles.subtitle}>Patterns your coach noticed.</Text>
        </View>

        {/* Segmented control */}
        <View style={styles.segmentedRow}>
          {TABS.map(t => {
            const on = tab === t.value;
            return (
              <Pressable
                key={t.value}
                onPress={() => setTab(t.value)}
                style={[styles.segment, on && styles.segmentOn]}
              >
                <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#6C5DD3" />
          </View>
        ) : isEmpty ? (
          <View style={styles.center}>
            <View style={styles.emptyBadge}>
              <View style={styles.emptyDot} />
            </View>
            <Text style={styles.emptyText}>
              No {tab} reflection yet.{'\n'}It appears after your {periodWord === 'day' ? 'next evening call' : `first ${periodWord}`}.
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero — current-period live narrative */}
            {live && (
              <View style={styles.heroCard}>
                <View style={styles.heroEyebrowRow}>
                  <View style={styles.heroDot} />
                  <Text style={styles.heroEyebrow}>
                    {live.periodLabel.toUpperCase()} · {live.rangeLabel.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.heroNarrative}>{live.narrative}</Text>
                <View style={styles.attribution}>
                  <View style={styles.coachAvatar} />
                  <Text style={styles.attributionText}>Coach</Text>
                </View>
              </View>
            )}

            {/* Earlier stored retros */}
            {retros.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>EARLIER</Text>
                {retros.map(r => (
                  <RetroCard key={r.id} retro={r} />
                ))}
              </>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </AmbientBackground>
  );
}

function RetroCard({ retro }: { retro: Retro }) {
  const date = retro.period_end_date
    ? new Date(retro.period_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';
  return (
    <View style={styles.card}>
      <Text style={styles.cardDate}>{date}</Text>
      <Text style={styles.cardText}>{retro.summary_text ?? 'No summary yet.'}</Text>
      <View style={styles.attribution}>
        <View style={styles.coachAvatar} />
        <Text style={styles.attributionText}>Coach</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    color: '#1E1B4B',
    fontSize: 28,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: -0.6,
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 4,
    fontFamily: 'Inter_400Regular',
  },

  // Segmented control (matches Goals tab)
  segmentedRow: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 18,
    padding: 4,
    backgroundColor: 'rgba(108, 93, 211, 0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.08)',
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentOn: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  segmentText: {
    color: '#6B7280',
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  segmentTextOn: {
    color: '#1E1B4B',
    fontFamily: 'Inter_600SemiBold',
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(108, 93, 211, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6C5DD3',
    opacity: 0.5,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
  },

  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 12,
  },

  // Hero (current-period) card — soft purple tint to set it apart
  heroCard: {
    backgroundColor: '#F3F1FC',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.16)',
    padding: 22,
    marginBottom: 8,
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  heroEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  heroDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#6C5DD3',
  },
  heroEyebrow: {
    color: '#6C5DD3',
    fontSize: 10,
    letterSpacing: 1.2,
    fontFamily: 'JetBrainsMono_500Medium',
  },
  heroNarrative: {
    color: '#1E1B4B',
    fontSize: 18,
    lineHeight: 27,
    fontFamily: 'Inter_500Medium',
    letterSpacing: -0.2,
  },

  sectionLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    letterSpacing: 1.2,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 12,
    marginBottom: 2,
  },

  // Earlier cards — clean white
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.08)',
    backgroundColor: '#FFFFFF',
    padding: 18,
    gap: 10,
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardDate: {
    color: '#9CA3AF',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: 'JetBrainsMono_500Medium',
  },
  cardText: {
    color: '#1E1B4B',
    fontSize: 15,
    lineHeight: 23,
    fontFamily: 'Inter_400Regular',
  },

  // Coach attribution row
  attribution: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 4,
  },
  coachAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#6C5DD3',
  },
  attributionText: {
    color: '#6B7280',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.2,
  },
});
