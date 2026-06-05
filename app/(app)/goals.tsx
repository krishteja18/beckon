import { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { fetchGoalsWithSchedules, archiveGoal, GoalWithSchedules } from '../../src/services/goals';
import { computeGoalMetrics, GoalMetrics } from '../../src/services/goalMetrics';
import { fetchRoutines, archiveRoutine, Routine } from '../../src/services/routines';
import { CompletionRing } from '../../src/components/CompletionRing';
import { RoutineEditSheet } from '../../src/components/RoutineEditSheet';

type TabMode = 'goals' | 'routines';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function formatTime12h(t: string): string {
  const [hh, mm] = t.split(':').map(Number);
  const period = hh < 12 ? 'AM' : 'PM';
  const dH = hh % 12 || 12;
  return `${dH}:${mm.toString().padStart(2, '0')} ${period}`;
}

function daysSummary(days: number[]): string {
  if (days.length === 7) return 'Every day';
  if (days.length === 5 && [1, 2, 3, 4, 5].every(d => days.includes(d))) return 'Weekdays';
  if (days.length === 2 && [0, 6].every(d => days.includes(d))) return 'Weekends';
  return days.map(d => DAY_LETTERS[d]).join(' ');
}

const FRAMEWORK_LABEL: Record<string, string> = {
  atomic_habits: 'Atomic Habits',
  ikigai: 'Ikigai',
  deep_work: 'Deep Work',
};

type GoalWithMetrics = GoalWithSchedules & { metrics?: GoalMetrics };

/** Returns the next upcoming schedule time today (or tomorrow if all past). */
function nextCallLabel(goal: GoalWithSchedules): string {
  const active = goal.schedules.filter(s => s.active);
  if (active.length === 0) return 'No schedule';

  const now = new Date();
  const todayDow = now.getDay();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const formatTime = (timeStr: string) => {
    const [hh, mm] = timeStr.split(':').map(Number);
    const period = hh < 12 ? 'AM' : 'PM';
    const dH = hh % 12 || 12;
    return `${dH}:${mm.toString().padStart(2, '0')} ${period}`;
  };

  // 1. Today's remaining schedules
  const todayRemaining = active
    .filter(s => s.scheduled_days.includes(todayDow))
    .map(s => {
      const [hh, mm] = (s.scheduled_time as string).split(':').map(Number);
      return { time: s.scheduled_time as string, minutes: hh * 60 + mm };
    })
    .filter(s => s.minutes > nowMinutes)
    .sort((a, b) => a.minutes - b.minutes);

  if (todayRemaining.length > 0) return formatTime(todayRemaining[0].time);

  // 2. Soonest upcoming day (1..7 days ahead)
  for (let offset = 1; offset <= 7; offset++) {
    const dow = (todayDow + offset) % 7;
    const matches = active.filter(s => s.scheduled_days.includes(dow));
    if (matches.length > 0) {
      const earliest = matches
        .map(s => s.scheduled_time as string)
        .sort()[0];
      const dayWord = offset === 1 ? 'Tomorrow' : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dow];
      return `${dayWord} ${formatTime(earliest)}`;
    }
  }
  return 'No schedule';
}

export default function Goals() {
  const router = useRouter();
  const [tab, setTab] = useState<TabMode>('goals');
  const [goals, setGoals] = useState<GoalWithMetrics[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [routineSheetVisible, setRoutineSheetVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      const [goalData, routineData] = await Promise.all([
        fetchGoalsWithSchedules(),
        fetchRoutines(),
      ]);
      const withMetrics: GoalWithMetrics[] = await Promise.all(
        goalData.map(async g => ({
          ...g,
          metrics: await computeGoalMetrics(g),
        })),
      );
      setGoals(withMetrics);
      setRoutines(routineData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNewRoutine = () => {
    setEditingRoutine(null);
    setRoutineSheetVisible(true);
  };

  const openEditRoutine = (r: Routine) => {
    setEditingRoutine(r);
    setRoutineSheetVisible(true);
  };

  const handleRoutineLongPress = (r: Routine) => {
    Alert.alert(
      r.title,
      'What would you like to do?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit', onPress: () => openEditRoutine(r) },
        {
          text: 'Archive', style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Archive routine?',
              `"${r.title}" will stop ringing. You can't undo this.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Archive', style: 'destructive',
                  onPress: async () => { await archiveRoutine(r.id); load(); },
                },
              ],
            );
          },
        },
      ],
    );
  };

  const handleLongPress = (goal: GoalWithMetrics) => {
    Alert.alert(
      goal.title,
      'What would you like to do?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'View details', onPress: () => router.push({ pathname: '/(app)/goal-detail', params: { id: goal.id } } as any) },
        {
          text: 'Archive', style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Archive goal?',
              `"${goal.title}" will be removed from your schedule. You can't undo this.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Archive', style: 'destructive',
                  onPress: async () => {
                    await archiveGoal(goal.id);
                    load();
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  const activeCount = tab === 'goals' ? goals.length : routines.length;
  const subtitleHint = tab === 'goals'
    ? `${goals.length} active · long-press a card for options`
    : `${routines.length} active · long-press a row for options`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{tab === 'goals' ? 'Goals' : 'Routines'}</Text>
          {!loading && activeCount > 0 && (
            <Text style={styles.subtitle}>{subtitleHint}</Text>
          )}
        </View>
        <Pressable
          onPress={() =>
            tab === 'goals'
              ? router.push('/(onboarding)/goals' as any)
              : openNewRoutine()
          }
          style={styles.addPill}
        >
          <Text style={styles.addPillText}>+ Add</Text>
        </Pressable>
      </View>

      {/* Segmented control */}
      <View style={styles.segmentedRow}>
        <Pressable
          onPress={() => setTab('goals')}
          style={[styles.segment, tab === 'goals' && styles.segmentOn]}
        >
          <Text style={[styles.segmentText, tab === 'goals' && styles.segmentTextOn]}>
            Goals
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('routines')}
          style={[styles.segment, tab === 'routines' && styles.segmentOn]}
        >
          <Text style={[styles.segmentText, tab === 'routines' && styles.segmentTextOn]}>
            Routines
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#6C5DD3" />
        </View>
      ) : tab === 'goals' ? (
        goals.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              No active goals yet.{'\n'}Tap + Add to get started.
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.gridContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.grid}>
              {goals.map(goal => (
                <Pressable
                  key={goal.id}
                  onPress={() => router.push({ pathname: '/(app)/goal-detail', params: { id: goal.id } } as any)}
                  onLongPress={() => handleLongPress(goal)}
                  delayLongPress={300}
                  style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
                >
                  <View style={styles.tileTopRow}>
                    <CompletionRing
                      percent={goal.metrics?.weekPercent ?? 0}
                      size={48}
                      stroke={4.5}
                    />
                  </View>

                  <Text style={styles.goalTitle} numberOfLines={2}>
                    {goal.title}
                  </Text>
                  <Text style={styles.framework} numberOfLines={1}>
                    {FRAMEWORK_LABEL[goal.framework] ?? 'Atomic Habits'}
                  </Text>

                  <View style={styles.nextRow}>
                    <Text style={styles.nextLabel}>NEXT</Text>
                    <Text style={styles.nextTime} numberOfLines={1}>
                      {nextCallLabel(goal)}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        )
      ) : routines.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            No routines yet.{'\n'}Tap + Add to set a recurring reminder.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.routineListContainer}
          showsVerticalScrollIndicator={false}
        >
          {routines.map(r => (
            <Pressable
              key={r.id}
              onPress={() => openEditRoutine(r)}
              onLongPress={() => handleRoutineLongPress(r)}
              delayLongPress={300}
              style={({ pressed }) => [styles.routineRow, pressed && styles.routineRowPressed]}
            >
              <View style={styles.routineRowLeft}>
                <Text style={styles.routineTitle} numberOfLines={1}>{r.title}</Text>
                <Text style={styles.routineMeta} numberOfLines={1}>
                  {daysSummary(r.scheduled_days)} · {formatTime12h(r.scheduled_time)}
                </Text>
              </View>
              <View style={styles.routineTimeBadge}>
                <Text style={styles.routineTimeBadgeText}>
                  {formatTime12h(r.scheduled_time).split(' ')[0]}
                </Text>
                <Text style={styles.routineTimeBadgePeriod}>
                  {formatTime12h(r.scheduled_time).split(' ')[1]}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <RoutineEditSheet
        visible={routineSheetVisible}
        routine={editingRoutine}
        onClose={() => setRoutineSheetVisible(false)}
        onSaved={load}
      />
    </SafeAreaView>
  );
}

const TILE_GAP = 12;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F6FB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    gap: 12,
  },
  title: {
    color: '#1E1B4B',
    fontSize: 28,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: -0.6,
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  addPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 99,
    backgroundColor: 'rgba(108, 93, 211, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.25)',
  },
  addPillText: {
    color: '#6C5DD3',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 15,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
    lineHeight: 24,
  },
  segmentedRow: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 16,
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
    letterSpacing: 0.1,
  },
  segmentTextOn: {
    color: '#1E1B4B',
    fontFamily: 'Inter_600SemiBold',
  },
  routineListContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 10,
  },
  routineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  routineRowPressed: {
    backgroundColor: 'rgba(108, 93, 211, 0.02)',
    transform: [{ scale: 0.99 }],
  },
  routineRowLeft: {
    flex: 1,
    paddingRight: 12,
  },
  routineTitle: {
    color: '#1E1B4B',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: -0.2,
  },
  routineMeta: {
    color: '#6B7280',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  routineTimeBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(108, 93, 211, 0.06)',
    borderRadius: 8,
  },
  routineTimeBadgeText: {
    color: '#6C5DD3',
    fontSize: 14,
    fontFamily: 'JetBrainsMono_500Medium',
    letterSpacing: -0.3,
  },
  routineTimeBadgePeriod: {
    color: '#6C5DD3',
    fontSize: 10,
    fontFamily: 'JetBrainsMono_500Medium',
    letterSpacing: 0.4,
  },
  gridContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: TILE_GAP,
  },
  tile: {
    width: `48%`,
    minHeight: 170,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.08)',
    padding: 16,
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    justifyContent: 'space-between',
  },
  tilePressed: {
    backgroundColor: 'rgba(108, 93, 211, 0.02)',
    transform: [{ scale: 0.985 }],
  },
  tileTopRow: {
    marginBottom: 6,
  },
  goalTitle: {
    color: '#1E1B4B',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: -0.3,
    marginTop: 10,
  },
  framework: {
    color: '#6B7280',
    fontSize: 11,
    fontFamily: 'JetBrainsMono_500Medium',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  nextRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(108, 93, 211, 0.08)',
  },
  nextLabel: {
    color: '#9CA3AF',
    fontSize: 9,
    fontFamily: 'JetBrainsMono_500Medium',
    letterSpacing: 1.2,
  },
  nextTime: {
    color: '#6C5DD3',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 2,
    letterSpacing: -0.1,
  },
});
