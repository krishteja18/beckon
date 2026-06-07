import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, TextInput, StyleSheet, Alert } from 'react-native';

interface Props {
  visible: boolean;
  title: string;
  /** Current value as "HH:MM" or "HH:MM:SS" (24h). */
  value: string;
  onClose: () => void;
  /** Returns "HH:MM:SS" (24h). */
  onSave: (hhmmss: string) => void;
}

function parse(value: string): { hour: string; minute: string; period: 'AM' | 'PM' } {
  const [hhRaw, mmRaw] = (value || '07:00').split(':');
  const hh = parseInt(hhRaw, 10) || 0;
  const mm = parseInt(mmRaw, 10) || 0;
  const period: 'AM' | 'PM' = hh < 12 ? 'AM' : 'PM';
  const displayH = hh % 12 || 12;
  return { hour: String(displayH), minute: String(mm).padStart(2, '0'), period };
}

function to24(hour: string, minute: string, period: 'AM' | 'PM'): string | null {
  const h = parseInt(hour, 10);
  const m = parseInt(minute, 10);
  if (isNaN(h) || h < 1 || h > 12) return null;
  if (isNaN(m) || m < 0 || m > 59) return null;
  let hh = h % 12;
  if (period === 'PM') hh += 12;
  return `${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

export function TimePickerSheet({ visible, title, value, onClose, onSave }: Props) {
  const [hour, setHour] = useState('7');
  const [minute, setMinute] = useState('00');
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');

  useEffect(() => {
    if (!visible) return;
    const p = parse(value);
    setHour(p.hour);
    setMinute(p.minute);
    setPeriod(p.period);
  }, [visible, value]);

  const save = () => {
    const t = to24(hour, minute, period);
    if (!t) {
      Alert.alert('Invalid time', 'Use a 1–12 hour and a 0–59 minute.');
      return;
    }
    onSave(t);
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.dismiss} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>

          <View style={styles.timeRow}>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              maxLength={2}
              value={hour}
              onChangeText={t => setHour(t.replace(/\D/g, ''))}
              placeholder="7"
              placeholderTextColor="#C7CBD3"
            />
            <Text style={styles.colon}>:</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              maxLength={2}
              value={minute}
              onChangeText={t => setMinute(t.replace(/\D/g, ''))}
              placeholder="00"
              placeholderTextColor="#C7CBD3"
            />
            <Pressable onPress={() => setPeriod(p => (p === 'AM' ? 'PM' : 'AM'))} style={styles.period}>
              <Text style={styles.periodText}>{period}</Text>
            </Pressable>
          </View>

          <View style={styles.actions}>
            <Pressable style={[styles.btn, styles.btnSecondary]} onPress={onClose}>
              <Text style={styles.btnSecondaryText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnPrimary]} onPress={save}>
              <Text style={styles.btnPrimaryText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(30, 27, 75, 0.4)', justifyContent: 'flex-end' },
  dismiss: { flex: 1 },
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
    width: 36, height: 5, borderRadius: 2.5,
    backgroundColor: 'rgba(108, 93, 211, 0.15)',
    alignSelf: 'center', marginBottom: 18,
  },
  title: {
    fontFamily: 'Inter_600SemiBold', fontSize: 18, color: '#1E1B4B', marginBottom: 18,
  },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 22 },
  input: {
    width: 60, height: 50, borderRadius: 12, backgroundColor: '#F4F6FB',
    borderWidth: 1, borderColor: 'rgba(108, 93, 211, 0.16)',
    textAlign: 'center', fontSize: 20, fontFamily: 'Inter_600SemiBold', color: '#1E1B4B',
  },
  colon: { fontSize: 22, color: '#1E1B4B', fontFamily: 'Inter_600SemiBold', marginHorizontal: 4 },
  period: {
    marginLeft: 10, paddingHorizontal: 16, height: 50, borderRadius: 12,
    backgroundColor: 'rgba(108, 93, 211, 0.08)', borderWidth: 1, borderColor: 'rgba(108, 93, 211, 0.16)',
    alignItems: 'center', justifyContent: 'center',
  },
  periodText: { color: '#6C5DD3', fontSize: 15, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5 },
  actions: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: '#6C5DD3' },
  btnSecondary: { backgroundColor: 'rgba(108, 93, 211, 0.04)', borderWidth: 1, borderColor: 'rgba(108, 93, 211, 0.08)' },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  btnSecondaryText: { color: '#6B7280', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
});
