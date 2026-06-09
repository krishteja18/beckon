import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import Svg, { Path, Rect, Line } from 'react-native-svg';

export function isoOf(year: number, month0: number, day: number): string {
  return `${year}-${String(month0 + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function todayISO(): string {
  const d = new Date();
  return isoOf(d.getFullYear(), d.getMonth(), d.getDate());
}

/** "Mon, Jun 23, 2026" for display in the field. */
export function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function CalendarIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#6C5DD3" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <Line x1="16" y1="2" x2="16" y2="6" />
      <Line x1="8" y1="2" x2="8" y2="6" />
      <Line x1="3" y1="10" x2="21" y2="10" />
    </Svg>
  );
}

/** Inline month calendar. value = selected "YYYY-MM-DD". Past days are disabled. */
function CalendarPicker({ value, onSelect }: { value: string; onSelect: (iso: string) => void }) {
  const [view, setView] = useState(() => {
    const [y, m] = value.slice(0, 10).split('-').map(Number);
    return { year: y || new Date().getFullYear(), month: (m || 1) - 1 };
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDow = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthLabel = new Date(view.year, view.month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  const prev = () => setView(v => (v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 }));
  const next = () => setView(v => (v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 }));

  return (
    <View style={styles.cal}>
      <View style={styles.calHeader}>
        <Pressable onPress={prev} hitSlop={10} style={styles.calNav}>
          <Text style={styles.calNavText}>‹</Text>
        </Pressable>
        <Text style={styles.calMonth}>{monthLabel}</Text>
        <Pressable onPress={next} hitSlop={10} style={styles.calNav}>
          <Text style={styles.calNavText}>›</Text>
        </Pressable>
      </View>
      <View style={styles.calWeekRow}>
        {WEEKDAY_LETTERS.map((w, i) => (
          <Text key={i} style={styles.calWeekday}>{w}</Text>
        ))}
      </View>
      <View style={styles.calGrid}>
        {cells.map((d, i) => {
          if (d === null) return <View key={i} style={styles.calCell} />;
          const cellTime = new Date(view.year, view.month, d).getTime();
          const iso = isoOf(view.year, view.month, d);
          const isPast = cellTime < today.getTime();
          const isSel = iso === value;
          const isToday = cellTime === today.getTime();
          return (
            <Pressable key={i} disabled={isPast} onPress={() => onSelect(iso)} style={styles.calCell}>
              <View style={[styles.calDay, isSel && styles.calDaySel, isToday && !isSel && styles.calDayToday]}>
                <Text style={[styles.calDayText, isSel && styles.calDayTextSel, isPast && styles.calDayTextPast]}>
                  {d}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Tappable date field (calendar icon + label) that opens the calendar in a popup. */
export function DatePickerField({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable style={styles.dateField} onPress={() => setOpen(true)}>
        <CalendarIcon />
        <Text style={styles.dateFieldText}>{formatDateLabel(value)}</Text>
      </Pressable>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.calOverlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.calModalWrap} onPress={() => { /* swallow taps inside */ }}>
            <CalendarPicker value={value} onSelect={iso => { onChange(iso); setOpen(false); }} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.16)',
    paddingHorizontal: 14,
  },
  dateFieldText: { color: '#1E1B4B', fontSize: 15, fontFamily: 'Inter_500Medium' },
  calOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 75, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  calModalWrap: { width: '100%', maxWidth: 360 },
  cal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.16)',
    padding: 12,
  },
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  calNav: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(108, 93, 211, 0.06)',
  },
  calNavText: { color: '#6C5DD3', fontSize: 20, fontFamily: 'Inter_600SemiBold', marginTop: -2 },
  calMonth: { color: '#1E1B4B', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  calWeekRow: { flexDirection: 'row', marginBottom: 4 },
  calWeekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 11,
    fontFamily: 'JetBrainsMono_500Medium',
  },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: {
    width: `${100 / 7}%`,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDay: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDaySel: { backgroundColor: '#6C5DD3' },
  calDayToday: { borderWidth: 1, borderColor: 'rgba(108, 93, 211, 0.4)' },
  calDayText: { color: '#1E1B4B', fontSize: 14, fontFamily: 'Inter_500Medium' },
  calDayTextSel: { color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' },
  calDayTextPast: { color: '#C7CBD3' },
});
