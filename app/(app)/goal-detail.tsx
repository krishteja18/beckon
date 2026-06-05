import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { fetchGoalsWithSchedules, GoalWithSchedules } from '../../src/services/goals';
import { computeGoalMetrics, GoalMetrics, DotStatus } from '../../src/services/goalMetrics';
import { CompletionRing } from '../../src/components/CompletionRing';
import { EditSchedulesSheet } from '../../src/components/EditSchedulesSheet';

const FRAMEWORK_LABEL: Record<string, string> = {
  atomic_habits: 'Atomic Habits',
  ikigai: 'Ikigai',
  deep_work: 'Deep Work',
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function GoalDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [goal, setGoal] = useState<GoalWithSchedules | null>(null);
  const [metrics, setMetrics] = useState<GoalMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [editVisible, setEditVisible] = useState(false);

  const load = async () => {
    try {
      const all = await fetchGoalsWithSchedules();
      const g = all.find(x => x.id === id) ?? null;
      setGoal(g);
      if (g) setMetrics(await computeGoalMetrics(g));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator color="#6C5DD3" />
        </View>
      </SafeAreaView>
    );
  }

  if (!goal) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <BackLink onPress={() => router.back()} />
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Goal not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const scheduleSummary = goal.schedules
    .filter(s => s.active)
    .map(s => {
      const [hh, mm] = (s.scheduled_time as string).split(':').map(Number);
      const period = hh < 12 ? 'AM' : 'PM';
      const dH = hh % 12 || 12;
      return `${dH}:${mm.toString().padStart(2, '0')} ${period}`;
    })
    .join(' · ');

  const scheduleDays = (() => {
    const days = goal.schedules[0]?.scheduled_days ?? [];
    if (days.length === 7) return 'Every day';
    if (
      days.length === 5 && [1, 2, 3, 4, 5].every(d => days.includes(d))
    ) return 'Weekdays';
    if (days.length === 2 && [0, 6].every(d => days.includes(d))) return 'Weekends';
    return days.map(d => DAY_NAMES[d].slice(0, 3)).join(' · ');
  })();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerRow}>
        <BackLink onPress={() => router.back()} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero — ring + title */}
        <View style={styles.hero}>
          <CompletionRing
            percent={metrics?.weekPercent ?? 0}
            size={92}
            stroke={6}
            label={`${Math.round(metrics?.weekPercent ?? 0)}%`}
          />
          <Text style={styles.goalTitle}>{goal.title}</Text>
          <Text style={styles.framework}>
            {FRAMEWORK_LABEL[goal.framework] ?? 'Atomic Habits'}
          </Text>
          <Text style={styles.heroMeta}>
            {scheduleSummary || 'No schedule set'} · {scheduleDays}
          </Text>
          <Pressable onPress={() => setEditVisible(true)} style={styles.editBtn}>
            <Text style={styles.editBtnText}>Edit schedules</Text>
          </Pressable>
        </View>

        {/* 7-day dot row */}
        <Section label="LAST 7 DAYS">
          <View style={styles.dotsRow}>
            {(metrics?.last7Days ?? []).map((d, i) => (
              <View key={i} style={styles.dotCol}>
                <Dot status={d.status} />
                <Text style={styles.dotLabel}>{d.dayLabel}</Text>
              </View>
            ))}
          </View>
        </Section>

        {/* Coach narrative */}
        <Section label="COACH NOTICED">
          <View style={styles.narrativeCard}>
            <Text style={styles.narrativeQuote}>"{metrics?.narrative}"</Text>
            <Text style={styles.narrativeAttribution}>— Coach</Text>
          </View>
        </Section>

        {/* Summary stats — 7-day window, mirrors the hero ring */}
        <Section label="SUMMARY">
          <View style={styles.statsCard}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>7-day completion</Text>
              <Text style={styles.statValue}>{metrics?.weekPercent ?? 0}%</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Active schedules</Text>
              <Text style={styles.statValue}>{goal.schedules.filter(s => s.active).length}</Text>
            </View>
          </View>
        </Section>

        <View style={{ height: 32 }} />
      </ScrollView>

      <EditSchedulesSheet
        visible={editVisible}
        goal={goal}
        onClose={() => setEditVisible(false)}
        onChanged={load}
      />
    </SafeAreaView>
  );
}

function BackLink({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10}>
      <Text style={styles.backLink}>← Goals</Text>
    </Pressable>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Dot({ status }: { status: DotStatus }) {
  if (status === 'done') {
    return <View style={[styles.dot, { backgroundColor: '#10B981' }]} />;
  }
  if (status === 'today') {
    return <View style={[styles.dot, styles.dotToday]} />;
  }
  if (status === 'missed') {
    return <View style={[styles.dot, styles.dotMissed]} />;
  }
  // future / not scheduled
  return <View style={[styles.dot, styles.dotFuture]} />;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F6FB' },
  scrollContent: { paddingBottom: 40 },
  headerRow: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backLink: {
    color: '#6C5DD3',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { color: '#6B7280', fontSize: 15, fontFamily: 'Inter_400Regular' },

  hero: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 28,
    paddingHorizontal: 32,
    gap: 12,
  },
  goalTitle: {
    color: '#1E1B4B',
    fontSize: 26,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: -0.6,
    textAlign: 'center',
    marginTop: 8,
  },
  framework: {
    color: '#6C5DD3',
    fontSize: 12,
    fontFamily: 'JetBrainsMono_500Medium',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroMeta: {
    color: '#6B7280',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  editBtn: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 99,
    backgroundColor: 'rgba(108, 93, 211, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.25)',
  },
  editBtnText: {
    color: '#6C5DD3',
    fontSize: 12.5,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.2,
  },

  section: {
    paddingHorizontal: 24,
    marginTop: 24,
    gap: 12,
  },
  sectionLabel: {
    color: '#6B7280',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: 'Inter_600SemiBold',
  },

  dotsRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.08)',
    paddingVertical: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  dotCol: { alignItems: 'center', gap: 8, flex: 1 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  dotToday: { backgroundColor: '#6C5DD3', borderWidth: 2, borderColor: 'rgba(108, 93, 211, 0.25)' },
  dotMissed: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: 'rgba(108, 93, 211, 0.25)' },
  dotFuture: { backgroundColor: 'rgba(108, 93, 211, 0.08)' },
  dotLabel: {
    color: '#9CA3AF',
    fontSize: 10,
    fontFamily: 'JetBrainsMono_500Medium',
  },

  narrativeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.08)',
    padding: 18,
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  narrativeQuote: {
    color: '#1E1B4B',
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Inter_500Medium',
    fontStyle: 'italic',
    letterSpacing: -0.2,
  },
  narrativeAttribution: {
    color: '#6B7280',
    fontSize: 11,
    fontFamily: 'JetBrainsMono_500Medium',
    letterSpacing: 1,
    marginTop: 8,
  },

  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.08)',
    paddingHorizontal: 18,
    paddingVertical: 8,
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  statLabel: {
    color: '#6B7280',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  statValue: {
    color: '#1E1B4B',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(108, 93, 211, 0.08)',
  },
});
