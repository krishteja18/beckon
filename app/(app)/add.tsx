import { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { DatePickerField, todayISO } from '../../src/components/DatePickerField';
import {
  createGoal,
  addSchedule,
  fetchGoalsWithSchedules,
  GoalWithSchedules,
} from '../../src/services/goals';
import { createRoutine } from '../../src/services/routines';
import { Database } from '../../src/services/database.types';

type Framework = Database['public']['Enums']['framework_key'];
type Mode = 'goal' | 'task' | 'routine';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

const FRAMEWORKS: { key: Framework; label: string; blurb: string }[] = [
  { key: 'atomic_habits', label: 'Atomic Habits', blurb: 'Small, identity-based habits' },
  { key: 'ikigai', label: 'Ikigai', blurb: 'Purpose & meaning driven' },
  { key: 'deep_work', label: 'Deep Work', blurb: 'Focused, distraction-free blocks' },
];

interface TimeDraft {
  hour: string;
  minute: string;
  period: 'AM' | 'PM';
}

interface SlotDraft extends TimeDraft {
  name: string;
  days: number[];
}

function to24h(t: TimeDraft): string | null {
  const h = parseInt(t.hour, 10);
  const m = parseInt(t.minute, 10);
  if (isNaN(h) || h < 1 || h > 12) return null;
  if (isNaN(m) || m < 0 || m > 59) return null;
  let hh24 = h % 12;
  if (t.period === 'PM') hh24 += 12;
  return `${hh24.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function newSlot(): SlotDraft {
  return { name: '', hour: '8', minute: '00', period: 'AM', days: [...EVERY_DAY] };
}

// ── Reusable bits ──────────────────────────────────────────────────────────

function DaySelector({
  days,
  onToggle,
  onPreset,
}: {
  days: number[];
  onToggle: (d: number) => void;
  onPreset: (d: number[]) => void;
}) {
  return (
    <View>
      <View style={styles.daysRow}>
        {DAY_LETTERS.map((letter, di) => {
          const on = days.includes(di);
          return (
            <Pressable
              key={di}
              onPress={() => onToggle(di)}
              style={[styles.dayChip, on && styles.dayChipOn]}
            >
              <Text style={[styles.dayChipText, on && styles.dayChipTextOn]}>{letter}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.presetRow}>
        <Pressable onPress={() => onPreset([...EVERY_DAY])} style={styles.presetChip}>
          <Text style={styles.presetText}>Every day</Text>
        </Pressable>
        <Pressable onPress={() => onPreset([1, 2, 3, 4, 5])} style={styles.presetChip}>
          <Text style={styles.presetText}>Weekdays</Text>
        </Pressable>
        <Pressable onPress={() => onPreset([0, 6])} style={styles.presetChip}>
          <Text style={styles.presetText}>Weekends</Text>
        </Pressable>
      </View>
    </View>
  );
}

function TimeField({
  time,
  onChange,
}: {
  time: TimeDraft;
  onChange: (patch: Partial<TimeDraft>) => void;
}) {
  return (
    <View style={styles.timeRow}>
      <TextInput
        style={styles.timeInput}
        keyboardType="number-pad"
        maxLength={2}
        value={time.hour}
        onChangeText={t => onChange({ hour: t.replace(/\D/g, '') })}
      />
      <Text style={styles.colon}>:</Text>
      <TextInput
        style={styles.timeInput}
        keyboardType="number-pad"
        maxLength={2}
        value={time.minute}
        onChangeText={t => onChange({ minute: t.replace(/\D/g, '') })}
      />
      <Pressable
        onPress={() => onChange({ period: time.period === 'AM' ? 'PM' : 'AM' })}
        style={styles.periodToggle}
      >
        <Text style={styles.periodText}>{time.period}</Text>
      </Pressable>
    </View>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function AddScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; goalId?: string }>();
  const initialMode: Mode =
    params.mode === 'task' || params.mode === 'routine' ? params.mode : 'goal';

  const [mode, setMode] = useState<Mode>(initialMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Goal mode
  const [goalTitle, setGoalTitle] = useState('');
  const [framework, setFramework] = useState<Framework>('atomic_habits');
  const [goalSlots, setGoalSlots] = useState<SlotDraft[]>([]);

  // Task mode
  const [goals, setGoals] = useState<GoalWithSchedules[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [targetGoalId, setTargetGoalId] = useState<string | null>(params.goalId ?? null);
  const [taskName, setTaskName] = useState('');
  const [taskTime, setTaskTime] = useState<TimeDraft>({ hour: '8', minute: '00', period: 'AM' });
  const [taskDays, setTaskDays] = useState<number[]>([...EVERY_DAY]);

  // Routine mode
  const [routineTitle, setRoutineTitle] = useState('');
  const [routineDescription, setRoutineDescription] = useState('');
  const [routineTime, setRoutineTime] = useState<TimeDraft>({ hour: '8', minute: '00', period: 'AM' });
  const [routineDays, setRoutineDays] = useState<number[]>([...EVERY_DAY]);
  const [routineOnce, setRoutineOnce] = useState(false);          // true = one-time on a date
  const [routineDate, setRoutineDate] = useState<string>(todayISO()); // "YYYY-MM-DD"

  // Reset to a clean form every time the screen is opened (it's a persistent
  // tab screen, so state would otherwise survive navigation), and refresh the
  // goal list (one may have just been added).
  useFocusEffect(
    useCallback(() => {
      setMode(params.mode === 'task' || params.mode === 'routine' ? params.mode : 'goal');
      setSaving(false);
      setError(null);
      setGoalTitle('');
      setFramework('atomic_habits');
      setGoalSlots([]);
      setTaskName('');
      setTaskTime({ hour: '8', minute: '00', period: 'AM' });
      setTaskDays([...EVERY_DAY]);
      setRoutineTitle('');
      setRoutineDescription('');
      setRoutineTime({ hour: '8', minute: '00', period: 'AM' });
      setRoutineDays([...EVERY_DAY]);
      setRoutineOnce(false);
      setRoutineDate(todayISO());
      setGoalsLoading(true);
      fetchGoalsWithSchedules()
        .then(gs => {
          setGoals(gs);
          setTargetGoalId(params.goalId ?? (gs.length > 0 ? gs[0].id : null));
        })
        .finally(() => setGoalsLoading(false));
    }, [params.mode, params.goalId]),
  );

  // ── Goal-slot helpers ──
  const addGoalSlot = () => setGoalSlots(prev => [...prev, newSlot()]);
  const removeGoalSlot = (i: number) => setGoalSlots(prev => prev.filter((_, idx) => idx !== i));
  const patchGoalSlot = (i: number, patch: Partial<SlotDraft>) =>
    setGoalSlots(prev => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const toggleGoalSlotDay = (i: number, d: number) =>
    setGoalSlots(prev =>
      prev.map((s, idx) =>
        idx === i
          ? { ...s, days: s.days.includes(d) ? s.days.filter(x => x !== d) : [...s.days, d].sort() }
          : s,
      ),
    );

  const toggleTaskDay = (d: number) =>
    setTaskDays(prev => (prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort()));
  const toggleRoutineDay = (d: number) =>
    setRoutineDays(prev => (prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort()));

  // ── Save ──
  const handleSave = async () => {
    setError(null);
    try {
      if (mode === 'goal') {
        const title = goalTitle.trim();
        if (!title) return setError('Give your goal a name.');
        // Block duplicates (case-insensitive) against existing active goals.
        if (goals.some(g => g.title.trim().toLowerCase() === title.toLowerCase())) {
          return setError(`You already have a goal called "${title}".`);
        }
        const schedules: { time: string; days: number[]; name: string }[] = [];
        for (const s of goalSlots) {
          if (!s.name.trim()) return setError('Give every task a name.');
          const t = to24h(s);
          if (!t) return setError('Check the time on each task (1–12 hour, 0–59 min).');
          if (s.days.length === 0) return setError('Pick at least one day for each task.');
          schedules.push({ time: t, days: s.days, name: s.name.trim() });
        }
        setSaving(true);
        await createGoal(title, framework, schedules);
      } else if (mode === 'task') {
        if (!targetGoalId) return setError('Pick which goal this task belongs to.');
        if (!taskName.trim()) return setError('Give the task a name.');
        const t = to24h(taskTime);
        if (!t) return setError('Check the time (1–12 hour, 0–59 min).');
        if (taskDays.length === 0) return setError('Pick at least one day.');
        setSaving(true);
        await addSchedule(targetGoalId, t, taskDays, taskName.trim());
      } else {
        const title = routineTitle.trim();
        if (!title) return setError('Give your reminder a name.');
        const t = to24h(routineTime);
        if (!t) return setError('Check the time (1–12 hour, 0–59 min).');
        if (routineOnce) {
          const iso = routineDate;
          const dt = new Date(`${iso}T00:00:00`);
          const today0 = new Date();
          today0.setHours(0, 0, 0, 0);
          if (isNaN(dt.getTime())) return setError('Pick a date.');
          if (dt < today0) return setError('Pick today or a future date.');
          setSaving(true);
          // store the date's weekday in scheduled_days to satisfy the non-empty
          // constraint; the timeline keys one-offs off remind_date, not days.
          await createRoutine(title, t, [dt.getDay()], { remindDate: iso, description: routineDescription });
        } else {
          if (routineDays.length === 0) return setError('Pick at least one day.');
          setSaving(true);
          await createRoutine(title, t, routineDays, { description: routineDescription });
        }
      }
      router.back();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const saveLabel = mode === 'goal' ? 'Add goal' : mode === 'task' ? 'Add task' : 'Add reminder';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerSide}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#1E1B4B" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M15 18l-6-6 6-6" />
          </Svg>
        </Pressable>
        <Text style={[styles.headerTitle, { flex: 1, textAlign: 'center' }]}>Add</Text>
        <View style={styles.headerSide} />
      </View>

      {/* Type segmented control */}
      <View style={styles.segmented}>
        {(['goal', 'task', 'routine'] as Mode[]).map(m => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            style={[styles.segment, mode === m && styles.segmentOn]}
          >
            <Text style={[styles.segmentText, mode === m && styles.segmentTextOn]}>
              {m === 'goal' ? 'Goal' : m === 'task' ? 'Task' : 'Routine'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {mode === 'goal' && (
          <>
            <Text style={styles.hint}>
              A goal the coach drives toward — gym, reading, meditation. Tasks are optional: add named
              times under it (e.g. Breakfast, Lunch, Snack), or save the goal on its own and add them later.
            </Text>
            <Text style={styles.fieldLabel}>GOAL</Text>
            <TextInput
              style={styles.titleInput}
              value={goalTitle}
              onChangeText={setGoalTitle}
              placeholder="e.g. Nutrition & Diet"
              placeholderTextColor="#9CA3AF"
              maxLength={60}
            />

            <Text style={styles.fieldLabel}>FRAMEWORK</Text>
            <View style={styles.frameworkRow}>
              {FRAMEWORKS.map(f => (
                <Pressable
                  key={f.key}
                  onPress={() => setFramework(f.key)}
                  style={[styles.fwChip, framework === f.key && styles.fwChipOn]}
                >
                  <Text style={[styles.fwLabel, framework === f.key && styles.fwLabelOn]}>{f.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>TASKS (OPTIONAL)</Text>
            {goalSlots.map((s, i) => (
              <View key={i} style={styles.slotCard}>
                <TextInput
                  style={styles.nameInput}
                  value={s.name}
                  onChangeText={t => patchGoalSlot(i, { name: t })}
                  placeholder="Task name — e.g. Lunch"
                  placeholderTextColor="#9CA3AF"
                  maxLength={40}
                />
                <View style={styles.slotTimeRow}>
                  <TimeField time={s} onChange={patch => patchGoalSlot(i, patch)} />
                  <View style={{ flex: 1 }} />
                  <Pressable onPress={() => removeGoalSlot(i)} hitSlop={10}>
                    <Text style={styles.removeText}>Remove</Text>
                  </Pressable>
                </View>
                <DaySelector
                  days={s.days}
                  onToggle={d => toggleGoalSlotDay(i, d)}
                  onPreset={days => patchGoalSlot(i, { days })}
                />
              </View>
            ))}
            <Pressable onPress={addGoalSlot} style={styles.addRow}>
              <Text style={styles.addRowText}>+ Add a task</Text>
            </Pressable>
          </>
        )}

        {mode === 'task' && (
          <>
            <Text style={styles.hint}>
              A named time under one of your goals — e.g. "Lunch" under Nutrition & Diet.
            </Text>

            <Text style={styles.fieldLabel}>GOAL</Text>
            {goalsLoading ? (
              <ActivityIndicator color="#6C5DD3" style={{ marginVertical: 12 }} />
            ) : goals.length === 0 ? (
              <View style={styles.emptyGoals}>
                <Text style={styles.emptyGoalsText}>You don't have any goals yet.</Text>
                <Pressable onPress={() => setMode('goal')} style={styles.emptyGoalsBtn}>
                  <Text style={styles.emptyGoalsBtnText}>Create a goal first</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.goalPickRow}>
                {goals.map(g => (
                  <Pressable
                    key={g.id}
                    onPress={() => setTargetGoalId(g.id)}
                    style={[styles.goalPick, targetGoalId === g.id && styles.goalPickOn]}
                  >
                    <Text
                      style={[styles.goalPickText, targetGoalId === g.id && styles.goalPickTextOn]}
                      numberOfLines={1}
                    >
                      {g.title}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {goals.length > 0 && (
              <>
                <Text style={styles.fieldLabel}>NAME</Text>
                <TextInput
                  style={styles.titleInput}
                  value={taskName}
                  onChangeText={setTaskName}
                  placeholder="e.g. Lunch"
                  placeholderTextColor="#9CA3AF"
                  maxLength={40}
                />

                <Text style={styles.fieldLabel}>TIME</Text>
                <TimeField time={taskTime} onChange={patch => setTaskTime(prev => ({ ...prev, ...patch }))} />

                <Text style={styles.fieldLabel}>DAYS</Text>
                <DaySelector days={taskDays} onToggle={toggleTaskDay} onPreset={setTaskDays} />
              </>
            )}
          </>
        )}

        {mode === 'routine' && (
          <>
            <Text style={styles.hint}>
              A reminder with no goal — recurring (medication, water) or one-off (a doctor's
              appointment on a specific date).
            </Text>

            <Text style={styles.fieldLabel}>REMINDER</Text>
            <TextInput
              style={styles.titleInput}
              value={routineTitle}
              onChangeText={setRoutineTitle}
              placeholder="e.g. Take vitamins"
              placeholderTextColor="#9CA3AF"
              maxLength={60}
            />

            <Text style={styles.fieldLabel}>DETAILS (OPTIONAL)</Text>
            <TextInput
              style={styles.descInput}
              value={routineDescription}
              onChangeText={setRoutineDescription}
              placeholder="Anything the coach should mention — e.g. bring last reports"
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={200}
            />

            <Text style={styles.fieldLabel}>WHEN</Text>
            <View style={styles.whenToggle}>
              <Pressable
                onPress={() => setRoutineOnce(false)}
                style={[styles.segment, !routineOnce && styles.segmentOn]}
              >
                <Text style={[styles.segmentText, !routineOnce && styles.segmentTextOn]}>Repeats</Text>
              </Pressable>
              <Pressable
                onPress={() => setRoutineOnce(true)}
                style={[styles.segment, routineOnce && styles.segmentOn]}
              >
                <Text style={[styles.segmentText, routineOnce && styles.segmentTextOn]}>Just once</Text>
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>TIME</Text>
            <TimeField time={routineTime} onChange={patch => setRoutineTime(prev => ({ ...prev, ...patch }))} />

            {routineOnce ? (
              <>
                <Text style={styles.fieldLabel}>DATE</Text>
                <DatePickerField value={routineDate} onChange={setRoutineDate} />
              </>
            ) : (
              <>
                <Text style={styles.fieldLabel}>DAYS</Text>
                <DaySelector days={routineDays} onToggle={toggleRoutineDay} onPreset={setRoutineDays} />
              </>
            )}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {error && <Text style={styles.errorText}>{error}</Text>}
        <Pressable
          onPress={handleSave}
          disabled={saving || (mode === 'task' && goals.length === 0)}
          style={[
            styles.saveBtn,
            (saving || (mode === 'task' && goals.length === 0)) && { opacity: 0.5 },
          ]}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : saveLabel}</Text>
        </Pressable>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerSide: { width: 40, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { color: '#1E1B4B', fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  segmented: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 4,
    backgroundColor: 'rgba(108, 93, 211, 0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.08)',
  },
  segment: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  segmentOn: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  segmentText: { color: '#6B7280', fontSize: 13, fontFamily: 'Inter_500Medium' },
  segmentTextOn: { color: '#1E1B4B', fontFamily: 'Inter_600SemiBold' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 24 },
  hint: {
    color: '#6B7280',
    fontSize: 12.5,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
    marginBottom: 16,
  },
  fieldLabel: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 10,
    color: '#9CA3AF',
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 12,
  },
  titleInput: {
    height: 46,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.16)',
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: '#1E1B4B',
  },
  frameworkRow: { flexDirection: 'row', gap: 8 },
  fwChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.16)',
    alignItems: 'center',
  },
  fwChipOn: { backgroundColor: '#6C5DD3', borderColor: '#6C5DD3' },
  fwLabel: { color: '#6B7280', fontSize: 12, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  fwLabelOn: { color: '#FFFFFF' },
  slotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.08)',
  },
  nameInput: {
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F4F6FB',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.12)',
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#1E1B4B',
    marginBottom: 10,
  },
  slotTimeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeInput: {
    width: 46,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.16)',
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E1B4B',
  },
  descInput: {
    minHeight: 64,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.16)',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#1E1B4B',
    textAlignVertical: 'top',
  },
  whenToggle: {
    flexDirection: 'row',
    padding: 4,
    backgroundColor: 'rgba(108, 93, 211, 0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.08)',
  },
  colon: { color: '#1E1B4B', fontSize: 17, fontFamily: 'Inter_600SemiBold', marginHorizontal: 2 },
  periodToggle: {
    marginLeft: 8,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(108, 93, 211, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodText: { color: '#6C5DD3', fontSize: 13, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5 },
  removeText: { color: '#F43F5E', fontSize: 12, fontFamily: 'Inter_500Medium' },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  dayChip: {
    flex: 1,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipOn: { backgroundColor: '#6C5DD3', borderColor: '#6C5DD3' },
  dayChipText: { color: '#6B7280', fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  dayChipTextOn: { color: '#FFFFFF' },
  presetRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: 'rgba(108, 93, 211, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.12)',
  },
  presetText: { color: '#6C5DD3', fontSize: 11, fontFamily: 'Inter_500Medium' },
  addRow: {
    paddingVertical: 13,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(108, 93, 211, 0.3)',
    marginTop: 4,
  },
  addRowText: { color: '#6C5DD3', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  goalPickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  goalPick: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 99,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.16)',
    maxWidth: '100%',
  },
  goalPickOn: { backgroundColor: '#6C5DD3', borderColor: '#6C5DD3' },
  goalPickText: { color: '#6B7280', fontSize: 13, fontFamily: 'Inter_500Medium' },
  goalPickTextOn: { color: '#FFFFFF' },
  emptyGoals: { alignItems: 'center', paddingVertical: 16, gap: 10 },
  emptyGoalsText: { color: '#6B7280', fontSize: 13, fontFamily: 'Inter_400Regular' },
  emptyGoalsBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 99,
    backgroundColor: 'rgba(108, 93, 211, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.25)',
  },
  emptyGoalsBtnText: { color: '#6C5DD3', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 60, // clear the nav bar + the orb that floats above it
    // Transparent so the footer matches the screen bg (no white band / divider).
    backgroundColor: 'transparent',
  },
  saveBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: '#6C5DD3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    marginBottom: 10,
  },
});
