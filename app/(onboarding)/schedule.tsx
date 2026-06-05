import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingFrame } from '../../src/components/OnboardingFrame';
import { onboarding } from '../../src/store/onboarding';

interface TimeOption {
  label: string;
  value: string;
}

const MORNING_OPTIONS: TimeOption[] = [
  { label: '6:30 AM',  value: '06:30' },
  { label: '7:30 AM',  value: '07:30' },
  { label: '8:30 AM',  value: '08:30' },
  { label: '9:30 AM',  value: '09:30' },
];

const EVENING_OPTIONS: TimeOption[] = [
  { label: '8:30 PM',  value: '20:30' },
  { label: '9:00 PM',  value: '21:00' },
  { label: '9:30 PM',  value: '21:30' },
  { label: '10:30 PM', value: '22:30' },
];

// Parsed 12-hour time interface
interface ParsedTime {
  hour: number;
  minute: number;
  period: 'AM' | 'PM';
}

function parseTimeTo12h(time24: string): ParsedTime {
  if (!time24 || !time24.includes(':')) {
    return { hour: 8, minute: 0, period: 'AM' };
  }
  const [hStr, mStr] = time24.split(':');
  let hour24 = parseInt(hStr, 10);
  if (isNaN(hour24)) hour24 = 8;
  let minute = parseInt(mStr, 10);
  if (isNaN(minute)) minute = 0;

  const period = hour24 >= 12 ? 'PM' : 'AM';
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;

  return { hour: hour12, minute, period };
}

function formatTimeTo24h(hour12: number, minute: number, period: 'AM' | 'PM'): string {
  let hour24 = hour12 % 12;
  if (period === 'PM') {
    hour24 += 12;
  }
  const hStr = hour24.toString().padStart(2, '0');
  const mStr = minute.toString().padStart(2, '0');
  return `${hStr}:${mStr}`;
}

function addMinutesTo24h(time24: string, minutesToAdd: number): string {
  if (!time24 || !time24.includes(':')) {
    return '08:00';
  }
  const [hStr, mStr] = time24.split(':');
  let hour = parseInt(hStr, 10);
  let minute = parseInt(mStr, 10);
  if (isNaN(hour)) hour = 8;
  if (isNaN(minute)) minute = 0;
  
  let totalMin = hour * 60 + minute + minutesToAdd;
  totalMin = (totalMin + 24 * 60) % (24 * 60);
  
  const nextHour = Math.floor(totalMin / 60);
  const nextMin = totalMin % 60;
  return `${nextHour.toString().padStart(2, '0')}:${nextMin.toString().padStart(2, '0')}`;
}

function autoScheduleGoals(goals: { title: string; scheduledTime?: string }[], morningTime: string, eveningTime: string) {
  let cognitiveCount = 0;
  return goals.map((g, index) => {
    const title = g.title.toLowerCase();
    let scheduledTime = '09:00';
    
    const isMorningPhysical = /gym|run|fit|workout|sport|meditat|yoga|stretch|cardio|train|exercis|walk|swim|physic/i.test(title);
    const isEveningWind = /read|sleep|wind|journal|relax|night|bed|gratitud|mindful|book/i.test(title);
    const isNutrition = /meal|eat|water|drink|diet|food|prep|nutrit|cook|lunch|breakfast|dinner/i.test(title);
    const isCognitive = /code|work|study|write|focus|learn|dev|program|project|task|office|meet|email|design|build/i.test(title);

    if (isMorningPhysical) {
      scheduledTime = addMinutesTo24h(morningTime, 30);
    } else if (isEveningWind) {
      scheduledTime = addMinutesTo24h(eveningTime, -60);
    } else if (isNutrition) {
      scheduledTime = '13:00';
    } else if (isCognitive) {
      scheduledTime = cognitiveCount === 0 ? '10:00' : '14:00';
      cognitiveCount++;
    } else {
      scheduledTime = addMinutesTo24h(morningTime, 90 + (index * 90));
    }
    
    return {
      ...g,
      scheduledTime,
    };
  });
}

interface TimePickerWidgetProps {
  value: string;
  onChange: (newValue: string) => void;
  accentColor?: string;
  bgPastel?: string;
}

function TimePickerWidget({
  value,
  onChange,
  accentColor = '#6C5DD3',
  bgPastel = 'rgba(108, 93, 211, 0.02)',
}: TimePickerWidgetProps) {
  const { hour, minute, period } = parseTimeTo12h(value);

  const incrementHour = () => {
    let nextHour = hour + 1;
    if (nextHour > 12) nextHour = 1;
    onChange(formatTimeTo24h(nextHour, minute, period));
  };

  const decrementHour = () => {
    let nextHour = hour - 1;
    if (nextHour < 1) nextHour = 12;
    onChange(formatTimeTo24h(nextHour, minute, period));
  };

  const incrementMinute = () => {
    let nextMin = minute + 5;
    if (nextMin >= 60) nextMin = 0;
    onChange(formatTimeTo24h(hour, nextMin, period));
  };

  const decrementMinute = () => {
    let nextMin = minute - 5;
    if (nextMin < 0) nextMin = 55;
    onChange(formatTimeTo24h(hour, nextMin, period));
  };

  const togglePeriod = (newPeriod: 'AM' | 'PM') => {
    onChange(formatTimeTo24h(hour, minute, newPeriod));
  };

  return (
    <View style={[styles.pickerContainer, { backgroundColor: bgPastel }]}>
      <View style={styles.pickerRow}>
        
        {/* Hour Card Container */}
        <View style={styles.digitCardContainer}>
          <Pressable
            onPress={incrementHour}
            style={({ pressed }) => [styles.chevronBtn, pressed && { opacity: 0.5 }]}
            hitSlop={10}
          >
            <Text style={[styles.chevronText, { color: accentColor }]}>â–²</Text>
          </Pressable>
          <View style={styles.digitCard}>
            <Text style={styles.digitText}>{hour.toString().padStart(2, '0')}</Text>
          </View>
          <Pressable
            onPress={decrementHour}
            style={({ pressed }) => [styles.chevronBtn, pressed && { opacity: 0.5 }]}
            hitSlop={10}
          >
            <Text style={[styles.chevronText, { color: accentColor }]}>â–¼</Text>
          </Pressable>
          <Text style={styles.digitLabel}>HOURS</Text>
        </View>

        {/* Pulsing colon separator */}
        <View style={styles.colonContainer}>
          <Text style={[styles.colonText, { color: accentColor }]}>:</Text>
        </View>

        {/* Minute Card Container */}
        <View style={styles.digitCardContainer}>
          <Pressable
            onPress={incrementMinute}
            style={({ pressed }) => [styles.chevronBtn, pressed && { opacity: 0.5 }]}
            hitSlop={10}
          >
            <Text style={[styles.chevronText, { color: accentColor }]}>â–²</Text>
          </Pressable>
          <View style={styles.digitCard}>
            <Text style={styles.digitText}>{minute.toString().padStart(2, '0')}</Text>
          </View>
          <Pressable
            onPress={decrementMinute}
            style={({ pressed }) => [styles.chevronBtn, pressed && { opacity: 0.5 }]}
            hitSlop={10}
          >
            <Text style={[styles.chevronText, { color: accentColor }]}>â–¼</Text>
          </Pressable>
          <Text style={styles.digitLabel}>MINUTES</Text>
        </View>

        {/* Padding Spacer */}
        <View style={{ width: 16 }} />

        {/* AM/PM Switch Capsule */}
        <View style={styles.ampmVerticalContainer}>
          <View style={styles.ampmToggleBg}>
            <Pressable
              onPress={() => togglePeriod('AM')}
              style={({ pressed }) => [
                styles.ampmOption,
                period === 'AM' && [styles.ampmOptionActive, { backgroundColor: accentColor }],
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={[styles.ampmOptionText, period === 'AM' && styles.ampmOptionTextActive]}>
                AM
              </Text>
            </Pressable>
            <Pressable
              onPress={() => togglePeriod('PM')}
              style={({ pressed }) => [
                styles.ampmOption,
                period === 'PM' && [styles.ampmOptionActive, { backgroundColor: accentColor }],
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={[styles.ampmOptionText, period === 'PM' && styles.ampmOptionTextActive]}>
                PM
              </Text>
            </Pressable>
          </View>
          <Text style={styles.digitLabel}>PERIOD</Text>
        </View>

      </View>
    </View>
  );
}

export default function ScheduleScreen() {
  const router = useRouter();

  // Load existing parameters
  const existingMorning = onboarding.get().scheduleTimes[0] || '07:30';
  const existingEvening = onboarding.get().retroTime || '21:30';

  const isPresetMorning = (time: string | null) =>
    time ? MORNING_OPTIONS.some(o => o.value === time) : false;
  const isPresetEvening = (time: string | null) =>
    time ? EVENING_OPTIONS.some(o => o.value === time) : false;

  const [isCustomMorning, setIsCustomMorning] = useState(!isPresetMorning(existingMorning));
  const [isCustomEvening, setIsCustomEvening] = useState(!isPresetEvening(existingEvening));

  const [pickMorning, setPickMorning] = useState<string>(existingMorning);
  const [pickEvening, setPickEvening] = useState<string>(existingEvening);

  const handleContinue = () => {
    if (pickMorning && pickEvening) {
      const currentGoals = onboarding.get().goals || [];
      const scheduledGoals = autoScheduleGoals(currentGoals, pickMorning, pickEvening);

      onboarding.set({
        scheduleTimes: [pickMorning],
        retroTime: pickEvening,
        morningSyncTime: pickMorning,
        goals: scheduledGoals,
      });
      router.push('/(onboarding)/routines' as any);
    }
  };

  const isValid = pickMorning !== null && pickEvening !== null;

  return (
    <OnboardingFrame
      step={5}
      totalSteps={8}
      eyebrow="Step 5"
      title="Lock in your sync times"
      subtitle="Establish consistent AM and PM check-in slots. Your AI coach calls you at these times."
      primary={{
        label: 'CONTINUE',
        onPress: handleContinue,
        disabled: !isValid,
      }}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Morning Check-In Section */}
        <View style={styles.cardContainer}>
          <View style={styles.cardHeader}>
            <Text style={{ fontSize: 20, marginRight: 8 }}>ðŸŒ…</Text>
            <View>
              <Text style={styles.cardTitle}>Morning Ignition</Text>
              <Text style={styles.cardSubtitle}>Set priorities & awaken energy</Text>
            </View>
          </View>
          <View style={styles.pillGrid}>
            {MORNING_OPTIONS.map((t) => {
              const isSelected = !isCustomMorning && pickMorning === t.value;
              return (
                <Pressable
                  key={t.value}
                  onPress={() => {
                    setIsCustomMorning(false);
                    setPickMorning(t.value);
                  }}
                  style={[
                    styles.pill,
                    isSelected && styles.pillSelected,
                  ]}
                >
                  <Text style={[styles.pillLabel, isSelected && styles.pillLabelSelected]}>
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => {
                setIsCustomMorning(true);
                if (!pickMorning) {
                  setPickMorning('07:30');
                }
              }}
              style={[
                styles.pill,
                isCustomMorning && styles.pillSelected,
              ]}
            >
              <Text style={[styles.pillLabel, isCustomMorning && styles.pillLabelSelected]}>
                Other Time â°
              </Text>
            </Pressable>
          </View>

          {/* Interactive Custom Morning Picker */}
          {isCustomMorning && (
            <TimePickerWidget
              value={pickMorning}
              onChange={(newTime) => setPickMorning(newTime)}
              accentColor="#FB923C" // Morning warm sunlit accent
              bgPastel="rgba(251, 146, 60, 0.02)"
            />
          )}
        </View>

        {/* Evening Reflection Section */}
        <View style={[styles.cardContainer, { marginTop: 18 }]}>
          <View style={styles.cardHeader}>
            <Text style={{ fontSize: 20, marginRight: 8 }}>ðŸŒ™</Text>
            <View>
              <Text style={styles.cardTitle}>Evening Reflection</Text>
              <Text style={styles.cardSubtitle}>90s retrospective daily review</Text>
            </View>
          </View>
          <View style={styles.pillGrid}>
            {EVENING_OPTIONS.map((t) => {
              const isSelected = !isCustomEvening && pickEvening === t.value;
              return (
                <Pressable
                  key={t.value}
                  onPress={() => {
                    setIsCustomEvening(false);
                    setPickEvening(t.value);
                  }}
                  style={[
                    styles.pill,
                    isSelected && styles.pillSelected,
                  ]}
                >
                  <Text style={[styles.pillLabel, isSelected && styles.pillLabelSelected]}>
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => {
                setIsCustomEvening(true);
                if (!pickEvening) {
                  setPickEvening('21:30');
                }
              }}
              style={[
                styles.pill,
                isCustomEvening && styles.pillSelected,
              ]}
            >
              <Text style={[styles.pillLabel, isCustomEvening && styles.pillLabelSelected]}>
                Other Time â°
              </Text>
            </Pressable>
          </View>

          {/* Interactive Custom Evening Picker */}
          {isCustomEvening && (
            <TimePickerWidget
              value={pickEvening}
              onChange={(newTime) => setPickEvening(newTime)}
              accentColor="#6C5DD3" // Evening lavender primary accent
              bgPastel="rgba(108, 93, 211, 0.02)"
            />
          )}
        </View>

      </ScrollView>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 24,
  },
  cardContainer: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.08)',
    backgroundColor: '#FFFFFF',
    padding: 16,
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E1B4B',
  },
  cardSubtitle: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: '#8A94A6',
    marginTop: 1,
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    flex: 1,
    minWidth: '45%', // Renders 2 pills per row cleanly
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.06)',
    backgroundColor: '#F4F6FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillSelected: {
    borderColor: '#6C5DD3',
    backgroundColor: '#ECEFFA',
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  pillLabel: {
    color: '#6B7280',
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  pillLabelSelected: {
    color: '#1E1B4B',
    fontFamily: 'Inter_700Bold',
  },
  pickerContainer: {
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.05)',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitCardContainer: {
    alignItems: 'center',
    gap: 4,
  },
  digitCard: {
    backgroundColor: '#FFFFFF',
    width: 64,
    height: 60,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  digitText: {
    fontSize: 30,
    fontFamily: 'Inter_700Bold',
    color: '#1E1B4B',
  },
  chevronBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronText: {
    fontSize: 12,
  },
  colonContainer: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  colonText: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
  },
  ampmVerticalContainer: {
    alignItems: 'center',
    gap: 4,
  },
  ampmToggleBg: {
    width: 50,
    height: 96,
    borderRadius: 25,
    backgroundColor: '#F4F6FB',
    padding: 3,
    justifyContent: 'space-between',
  },
  ampmOption: {
    height: 42,
    width: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ampmOptionActive: {
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  ampmOptionText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#6B7280',
  },
  ampmOptionTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
  },
  digitLabel: {
    marginTop: 6,
    fontSize: 9,
    fontFamily: 'Inter_600SemiBold',
    color: '#8A94A6',
    letterSpacing: 0.8,
  },
});

