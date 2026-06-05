import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  GoalWithSchedules,
  addSchedule,
  updateSchedule,
  deleteSchedule,
} from '../services/goals';

interface Props {
  visible: boolean;
  goal: GoalWithSchedules | null;
  onClose: () => void;
  /** Called after any save/delete/add — parent re-loads */
  onChanged: () => void;
}

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface DraftRow {
  /** Existing schedule id, or null if locally-added new row */
  id: string | null;
  hour: string;       // "1".."12"
  minute: string;     // "00".."59"
  period: 'AM' | 'PM';
  days: number[];     // 0=Sun..6=Sat
  active: boolean;
  /** Original DB values for diffing on save */
  origTime?: string;  // "HH:MM" 24h
  origDays?: number[];
  origActive?: boolean;
  deleted?: boolean;
}

function toDraft(s: GoalWithSchedules['schedules'][number]): DraftRow {
  const [hh, mm] = (s.scheduled_time as string).split(':').map(Number);
  const period: 'AM' | 'PM' = hh < 12 ? 'AM' : 'PM';
  const displayH = hh % 12 || 12;
  return {
    id: s.id,
    hour: String(displayH),
    minute: mm.toString().padStart(2, '0'),
    period,
    days: [...s.scheduled_days],
    active: s.active,
    origTime: s.scheduled_time as string,
    origDays: [...s.scheduled_days],
    origActive: s.active,
  };
}

function draftTo24h(d: DraftRow): string | null {
  const h = parseInt(d.hour, 10);
  const m = parseInt(d.minute, 10);
  if (isNaN(h) || h < 1 || h > 12) return null;
  if (isNaN(m) || m < 0 || m > 59) return null;
  let hh24 = h % 12;
  if (d.period === 'PM') hh24 += 12;
  return `${hh24.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const aSet = new Set(a);
  return b.every(x => aSet.has(x));
}

export function EditSchedulesSheet({ visible, goal, onClose, onChanged }: Props) {
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && goal) {
      setRows(goal.schedules.map(toDraft));
    }
  }, [visible, goal]);

  if (!goal) return null;

  const visibleRows = rows.filter(r => !r.deleted);

  const toggleDay = (rowIdx: number, day: number) => {
    setRows(prev => {
      const copy = [...prev];
      const row = { ...copy[rowIdx] };
      row.days = row.days.includes(day)
        ? row.days.filter(d => d !== day)
        : [...row.days, day].sort();
      copy[rowIdx] = row;
      return copy;
    });
  };

  const updateField = (rowIdx: number, patch: Partial<DraftRow>) => {
    setRows(prev => {
      const copy = [...prev];
      copy[rowIdx] = { ...copy[rowIdx], ...patch };
      return copy;
    });
  };

  const togglePeriod = (rowIdx: number) => {
    setRows(prev => {
      const copy = [...prev];
      copy[rowIdx] = { ...copy[rowIdx], period: copy[rowIdx].period === 'AM' ? 'PM' : 'AM' };
      return copy;
    });
  };

  const addRow = () => {
    setRows(prev => [
      ...prev,
      {
        id: null,
        hour: '8',
        minute: '00',
        period: 'AM',
        days: [1, 2, 3, 4, 5],
        active: true,
      },
    ]);
  };

  const removeRow = (rowIdx: number) => {
    setRows(prev => {
      const copy = [...prev];
      const row = copy[rowIdx];
      if (row.id == null) {
        // Locally-added row — just drop it
        return copy.filter((_, i) => i !== rowIdx);
      }
      copy[rowIdx] = { ...row, deleted: true };
      return copy;
    });
  };

  const handleSave = async () => {
    // Validate
    for (const r of rows) {
      if (r.deleted) continue;
      const t = draftTo24h(r);
      if (!t) {
        Alert.alert('Invalid time', 'Use a 1–12 hour and a 0–59 minute.');
        return;
      }
      if (r.days.length === 0) {
        Alert.alert('Pick at least one day', 'Each schedule needs at least one day selected.');
        return;
      }
    }

    setSaving(true);
    try {
      for (const r of rows) {
        if (r.id != null && r.deleted) {
          await deleteSchedule(r.id);
          continue;
        }
        const t = draftTo24h(r)!;
        if (r.id == null) {
          await addSchedule(goal.id, t, r.days);
          continue;
        }
        const timeChanged = t !== r.origTime;
        const daysChanged = !arraysEqual(r.days, r.origDays ?? []);
        const activeChanged = r.active !== r.origActive;
        if (timeChanged || daysChanged || activeChanged) {
          await updateSchedule(r.id, {
            ...(timeChanged && { time: t }),
            ...(daysChanged && { days: r.days }),
            ...(activeChanged && { active: r.active }),
          });
        }
      }
      onChanged();
      onClose();
    } catch (e) {
      Alert.alert('Could not save', String(e));
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

          <View style={styles.headerRow}>
            <Text style={styles.title}>Edit schedules</Text>
            <Text style={styles.subtitle}>{goal.title}</Text>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {visibleRows.length === 0 ? (
              <Text style={styles.empty}>No schedules. Tap + to add one.</Text>
            ) : (
              rows.map((row, idx) => {
                if (row.deleted) return null;
                return (
                  <View key={row.id ?? `new-${idx}`} style={styles.rowCard}>
                    {/* Time row */}
                    <View style={styles.timeRow}>
                      <TextInput
                        style={styles.timeInput}
                        keyboardType="number-pad"
                        maxLength={2}
                        value={row.hour}
                        onChangeText={t => updateField(idx, { hour: t.replace(/\D/g, '') })}
                        placeholder="8"
                        placeholderTextColor="#C7CBD3"
                      />
                      <Text style={styles.timeColon}>:</Text>
                      <TextInput
                        style={styles.timeInput}
                        keyboardType="number-pad"
                        maxLength={2}
                        value={row.minute}
                        onChangeText={t => updateField(idx, { minute: t.replace(/\D/g, '') })}
                        placeholder="00"
                        placeholderTextColor="#C7CBD3"
                      />
                      <Pressable onPress={() => togglePeriod(idx)} style={styles.periodToggle}>
                        <Text style={styles.periodText}>{row.period}</Text>
                      </Pressable>

                      <View style={{ flex: 1 }} />

                      <Pressable
                        onPress={() => removeRow(idx)}
                        hitSlop={10}
                        style={styles.deleteBtn}
                      >
                        <Text style={styles.deleteBtnText}>Remove</Text>
                      </Pressable>
                    </View>

                    {/* Day chips */}
                    <View style={styles.daysRow}>
                      {DAY_LETTERS.map((letter, d) => {
                        const on = row.days.includes(d);
                        return (
                          <Pressable
                            key={d}
                            onPress={() => toggleDay(idx, d)}
                            style={[styles.dayChip, on && styles.dayChipOn]}
                          >
                            <Text style={[styles.dayChipText, on && styles.dayChipTextOn]}>
                              {letter}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })
            )}

            <Pressable onPress={addRow} style={styles.addRow}>
              <Text style={styles.addRowText}>+ Add another time</Text>
            </Pressable>
          </ScrollView>

          <View style={styles.actionRow}>
            <Pressable
              onPress={onClose}
              style={[styles.actionBtn, styles.actionBtnSecondary]}
            >
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
    maxHeight: '85%',
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
  headerRow: {
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
  },
  scroll: { maxHeight: 460 },
  scrollContent: { paddingBottom: 8 },
  empty: {
    color: '#6B7280',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    paddingVertical: 24,
  },
  rowCard: {
    backgroundColor: '#F4F6FB',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.08)',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  timeInput: {
    width: 44,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.16)',
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E1B4B',
  },
  timeColon: {
    fontSize: 18,
    color: '#1E1B4B',
    fontFamily: 'Inter_600SemiBold',
    marginHorizontal: 2,
  },
  periodToggle: {
    marginLeft: 8,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(108, 93, 211, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodText: {
    color: '#6C5DD3',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
  },
  deleteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  deleteBtnText: {
    color: '#F43F5E',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  dayChip: {
    flex: 1,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipOn: {
    backgroundColor: '#6C5DD3',
    borderColor: '#6C5DD3',
  },
  dayChipText: {
    color: '#6B7280',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  dayChipTextOn: {
    color: '#FFFFFF',
  },
  addRow: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(108, 93, 211, 0.3)',
    marginTop: 4,
  },
  addRowText: {
    color: '#6C5DD3',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPrimary: {
    backgroundColor: '#6C5DD3',
  },
  actionBtnSecondary: {
    backgroundColor: 'rgba(108, 93, 211, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.08)',
  },
  actionBtnTextPrimary: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  actionBtnTextSecondary: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#6B7280',
  },
});
