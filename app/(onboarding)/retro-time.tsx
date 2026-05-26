import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
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
      <View className="gap-3">
        {OPTIONS.map(t => (
          <Pressable
            key={t.value}
            onPress={() => setPick(t.value)}
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: pick === t.value ? 'rgba(56,189,248,0.4)' : 'rgba(204,218,240,0.06)',
              backgroundColor: pick === t.value ? 'rgba(56,189,248,0.06)' : 'rgba(255,255,255,0.012)',
              paddingVertical: 18,
              paddingHorizontal: 20,
            }}
          >
            <Text style={{
              color: '#EEF0F6',
              fontSize: 20,
              fontFamily: 'JetBrainsMono_500Medium',
              letterSpacing: -0.5,
            }}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </OnboardingFrame>
  );
}
