import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingFrame } from '../../src/components/OnboardingFrame';
import { onboarding } from '../../src/store/onboarding';

const SUGGESTED_TIMES: { label: string; value: string }[] = [
  { label: '6:00 AM',  value: '06:00' },
  { label: '7:30 AM',  value: '07:30' },
  { label: '9:00 AM',  value: '09:00' },
  { label: '12:30 PM', value: '12:30' },
  { label: '6:00 PM',  value: '18:00' },
  { label: '8:30 PM',  value: '20:30' },
];

export default function ScheduleScreen() {
  const router = useRouter();
  const existing = new Set(onboarding.get().scheduleTimes);
  const [picked, setPicked] = useState<Set<string>>(existing);

  const toggle = (t: string) => {
    const next = new Set(picked);
    next.has(t) ? next.delete(t) : next.add(t);
    setPicked(next);
  };

  const handleContinue = () => {
    onboarding.set({ scheduleTimes: Array.from(picked) });
    router.push('/(onboarding)/retro-time');
  };

  return (
    <OnboardingFrame
      step={6}
      totalSteps={9}
      eyebrow="Step 6"
      title="When should we call?"
      subtitle="Pick the times your goals happen. Tweak per goal later, or just say 'gym at 6am' to the mic."
      primary={{
        label: 'Continue',
        onPress: handleContinue,
        disabled: picked.size === 0,
      }}
    >
      <View style={styles.grid}>
        {SUGGESTED_TIMES.map(t => {
          const isSelected = picked.has(t.value);
          return (
            <Pressable
              key={t.value}
              onPress={() => toggle(t.value)}
              style={[
                styles.capsule,
                isSelected && styles.capsuleSelected,
              ]}
            >
              <Text
                style={[
                  styles.label,
                  isSelected && styles.labelSelected,
                ]}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  capsule: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  capsuleSelected: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    color: 'rgba(238, 240, 246, 0.65)',
    fontSize: 14,
    fontFamily: 'JetBrainsMono_500Medium',
    letterSpacing: -0.3,
  },
  labelSelected: {
    color: '#38BDF8',
  },
});
