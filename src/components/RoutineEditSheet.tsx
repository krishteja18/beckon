import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
} from 'react-native';
import { Routine, createRoutine, updateRoutine } from '../services/routines';
import { DatePickerField, todayISO } from './DatePickerField';

interface Props {
  visible: boolean;
  /** Routine to edit, or null for create mode. */
  routine: Routine | null;
  onClose: () => void;
  onSaved: () => void;
}

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function parseTime(t: string): { hour: string; minute: string; period: 'AM' | 'PM' } {
  const [hh, mm] = t.split(':').map(Number);
  const period: 'AM' | 'PM' = hh < 12 ? 'AM' : 'PM';
  const displayH = hh % 12 || 12;
  return { hour: String(displayH), minute: mm.toString().padStart(2, '0'), period };
}

function to24h(hour: string, minute: string, period: 'AM' | 'PM'): string | null {
  const h = parseInt(hour, 10);
  const m = parseInt(minute, 10);
  if (isNaN(h) || h < 1 || h > 12) return null;
  if (isNaN(m) || m < 0 || m > 59) return null;
  let hh24 = h % 12;
  if (period === 'PM') hh24 += 12;
  return `${hh24.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function RoutineEditSheet({ visible, routine, onClose, onSaved }: Props) {
  const [title, setTitle] = useState('');
  const [hour, setHour] = useState('8');
  const [minute, setMinute] = useState('00');
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [description, setDescription] = useState('');
  const [once, setOnce] = useState(false);            // true = one-time on a date
  const [date, setDate] = useState<string>(todayISO()); // "YYYY-MM-DD"
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (routine) {
      setTitle(routine.title);
      const parsed = parseTime(routine.scheduled_time);
      setHour(parsed.hour);
      setMinute(parsed.minute);
      setPeriod(parsed.period);
      setDays([...routine.scheduled_days]);
      setDescription(routine.description ?? '');
      setOnce(!!routine.remind_date);
      setDate(routine.remind_date ? routine.remind_date.slice(0, 10) : todayISO());
    } else {
      setTitle('');
      setHour('8');
      setMinute('00');
      setPeriod('AM');
      setDays([0, 1, 2, 3, 4, 5, 6]);
      setDescription('');
      setOnce(false);
      setDate(todayISO());
    }
  }, [visible, routine]);

  const toggleDay = (d: number) => {
    setDays(prev => (prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort()));
  };

  const presetEveryday = () => setDays([0, 1, 2, 3, 4, 5, 6]);
  const presetWeekdays = () => setDays([1, 2, 3, 4, 5]);
  const presetWeekends = () => setDays([0, 6]);

  const handleSave = async () => {
    setError(null);
    if (!title.trim()) return setError('Give the reminder a name.');
    const t = to24h(hour, minute, period);
    if (!t) return setError('Check the time (1–12 hour, 0–59 min).');

    // One-time vs recurring: one-off stores its weekday in days (constraint) and
    // the chosen date in remind_date; recurring clears remind_date.
    let saveDays = days;
    let remindDate: string | null = null;
    if (once) {
      const dt = new Date(`${date}T00:00:00`);
      const today0 = new Date();
      today0.setHours(0, 0, 0, 0);
      if (isNaN(dt.getTime())) return setError('Pick a date.');
      if (dt < today0) return setError('Pick today or a future date.');
      saveDays = [dt.getDay()];
      remindDate = date;
    } else if (days.length === 0) {
      return setError('Pick at least one day.');
    }

    const desc = description.trim() || null;
    setSaving(true);
    try {
      if (routine) {
        await updateRoutine(routine.id, { title: title.trim(), time: t, days: saveDays, remindDate, description: desc });
      } else {
        await createRoutine(title.trim(), t, saveDays, { remindDate, description: desc });
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.dismissArea} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <Text style={styles.title}>
            {routine ? 'Edit routine' : 'New routine'}
          </Text>
          <Text style={styles.subtitle}>
            A reminder — recurring or one-time. The coach rings; you confirm.
          </Text>

          {/* Title input */}
          <Text style={styles.fieldLabel}>What is it?</Text>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Take BP tablet"
            placeholderTextColor="#C7CBD3"
            maxLength={60}
            autoFocus={!routine}
          />

          {/* Details */}
          <Text style={styles.fieldLabel}>Details (optional)</Text>
          <TextInput
            style={styles.descInput}
            value={description}
            onChangeText={setDescription}
            placeholder="Anything the coach should mention"
            placeholderTextColor="#C7CBD3"
            multiline
            maxLength={200}
          />

          {/* Repeats / one-time */}
          <Text style={styles.fieldLabel}>When?</Text>
          <View style={styles.whenToggle}>
            <Pressable onPress={() => setOnce(false)} style={[styles.seg, !once && styles.segOn]}>
              <Text style={[styles.segText, !once && styles.segTextOn]}>Repeats</Text>
            </Pressable>
            <Pressable onPress={() => setOnce(true)} style={[styles.seg, once && styles.segOn]}>
              <Text style={[styles.segText, once && styles.segTextOn]}>Just once</Text>
            </Pressable>
          </View>

          {/* Time row */}
          <Text style={styles.fieldLabel}>Time</Text>
          <View style={styles.timeRow}>
            <TextInput
              style={styles.timeInput}
              keyboardType="number-pad"
              maxLength={2}
              value={hour}
              onChangeText={t => setHour(t.replace(/\D/g, ''))}
              placeholder="8"
              placeholderTextColor="#C7CBD3"
            />
            <Text style={styles.timeColon}>:</Text>
            <TextInput
              style={styles.timeInput}
              keyboardType="number-pad"
              maxLength={2}
              value={minute}
              onChangeText={t => setMinute(t.replace(/\D/g, ''))}
              placeholder="00"
              placeholderTextColor="#C7CBD3"
            />
            <Pressable onPress={() => setPeriod(p => (p === 'AM' ? 'PM' : 'AM'))} style={styles.periodToggle}>
              <Text style={styles.periodText}>{period}</Text>
            </Pressable>
          </View>

          {/* Date (one-time) or day chips (recurring) */}
          {once ? (
            <>
              <Text style={styles.fieldLabel}>Date</Text>
              <View style={{ marginBottom: 18 }}>
                <DatePickerField value={date} onChange={setDate} />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.fieldLabel}>Which days?</Text>
              <View style={styles.daysRow}>
                {DAY_LETTERS.map((letter, d) => {
                  const on = days.includes(d);
                  return (
                    <Pressable
                      key={d}
                      onPress={() => toggleDay(d)}
                      style={[styles.dayChip, on && styles.dayChipOn]}
                    >
                      <Text style={[styles.dayChipText, on && styles.dayChipTextOn]}>{letter}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.presetRow}>
                <Pressable onPress={presetEveryday} style={styles.presetChip}>
                  <Text style={styles.presetText}>Every day</Text>
                </Pressable>
                <Pressable onPress={presetWeekdays} style={styles.presetChip}>
                  <Text style={styles.presetText}>Weekdays</Text>
                </Pressable>
                <Pressable onPress={presetWeekends} style={styles.presetChip}>
                  <Text style={styles.presetText}>Weekends</Text>
                </Pressable>
              </View>
            </>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.actionRow}>
            <Pressable onPress={onClose} style={[styles.actionBtn, styles.actionBtnSecondary]}>
              <Text style={styles.actionBtnTextSecondary}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={[styles.actionBtn, styles.actionBtnPrimary, saving && { opacity: 0.6 }]}
            >
              <Text style={styles.actionBtnTextPrimary}>{saving ? 'Saving…' : 'Save'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 75, 0.4)',
    justifyContent: 'flex-end',
  },
  dismissArea: { flex: 1 },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.08)',
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(108, 93, 211, 0.15)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: '#1E1B4B',
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 18,
  },
  fieldLabel: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 10,
    letterSpacing: 1.2,
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 6,
  },
  titleInput: {
    height: 46,
    borderRadius: 12,
    backgroundColor: '#F4F6FB',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.16)',
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: '#1E1B4B',
    marginBottom: 16,
  },
  descInput: {
    minHeight: 56,
    borderRadius: 12,
    backgroundColor: '#F4F6FB',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.16)',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#1E1B4B',
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  whenToggle: {
    flexDirection: 'row',
    padding: 4,
    backgroundColor: 'rgba(108, 93, 211, 0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.08)',
    marginBottom: 16,
  },
  seg: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  segOn: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  segText: { color: '#6B7280', fontSize: 13, fontFamily: 'Inter_500Medium' },
  segTextOn: { color: '#1E1B4B', fontFamily: 'Inter_600SemiBold' },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    marginBottom: 10,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  timeInput: {
    width: 56,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#F4F6FB',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.16)',
    textAlign: 'center',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E1B4B',
  },
  timeColon: {
    fontSize: 20,
    color: '#1E1B4B',
    fontFamily: 'Inter_600SemiBold',
    marginHorizontal: 4,
  },
  periodToggle: {
    marginLeft: 10,
    paddingHorizontal: 16,
    height: 46,
    borderRadius: 12,
    backgroundColor: 'rgba(108, 93, 211, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodText: {
    color: '#6C5DD3',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
    marginBottom: 12,
  },
  dayChip: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F4F6FB',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipOn: { backgroundColor: '#6C5DD3', borderColor: '#6C5DD3' },
  dayChipText: { color: '#6B7280', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  dayChipTextOn: { color: '#FFFFFF' },
  presetRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 18,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: 'rgba(108, 93, 211, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.12)',
  },
  presetText: {
    color: '#6C5DD3',
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPrimary: { backgroundColor: '#6C5DD3' },
  actionBtnSecondary: {
    backgroundColor: 'rgba(108, 93, 211, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.08)',
  },
  actionBtnTextPrimary: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#FFFFFF' },
  actionBtnTextSecondary: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#6B7280' },
});
