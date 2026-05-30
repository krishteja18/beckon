import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingFrame } from '../../src/components/OnboardingFrame';
import { onboarding } from '../../src/store/onboarding';

const OPTIONS: { label: string; value: string }[] = [
  { label: '8:30 PM',  value: '20:30' },
  { label: '9:30 PM',  value: '21:30' },
  { label: '10:00 PM', value: '22:00' },
  { label: '10:30 PM', value: '22:30' },
];

export default function RetroTimeScreen() {
  const router = useRouter();
  const [pick, setPick] = useState<string | null>(onboarding.get().retroTime);

  const handleContinue = () => {
    if (pick) onboarding.set({ retroTime: pick });
    router.push('/(onboarding)/permissions');
  };

  return (
    <OnboardingFrame
      step={7}
      totalSteps={9}
      eyebrow="Step 7"
      title="When should we wrap the day?"
      subtitle="A short evening check-in. 90 seconds — what got done, what tomorrow looks like."
      primary={{
        label: 'Continue',
        onPress: handleContinue,
        disabled: !pick,
      }}
    >
      <View style={styles.list}>
        {OPTIONS.map(t => {
          const isSelected = pick === t.value;
          return (
            <Pressable
              key={t.value}
              onPress={() => setPick(t.value)}
              style={[
                styles.dial,
                isSelected && styles.dialSelected,
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

              {/* Selection Ring */}
              <View
                style={[
                  styles.selectRing,
                  isSelected && styles.selectRingSelected,
                ]}
              >
                {isSelected && <View style={styles.selectDot} />}
              </View>
            </Pressable>
          );
        })}
      </View>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
    marginTop: 8,
  },
  dial: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
    paddingVertical: 18,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dialSelected: {
    borderColor: '#A855F7',
    backgroundColor: 'rgba(168, 85, 247, 0.05)',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    color: 'rgba(238, 240, 246, 0.75)',
    fontSize: 20,
    fontFamily: 'JetBrainsMono_500Medium',
    letterSpacing: -0.5,
  },
  labelSelected: {
    color: '#EEF0F6',
  },
  selectRing: {
    width: 18,
    height: 18,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectRingSelected: {
    borderColor: '#A855F7',
  },
  selectDot: {
    width: 10,
    height: 10,
    borderRadius: 99,
    backgroundColor: '#A855F7',
  },
});
