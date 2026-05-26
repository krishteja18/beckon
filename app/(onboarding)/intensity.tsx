import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingFrame } from '../../src/components/OnboardingFrame';
import { onboarding } from '../../src/store/onboarding';

type Intensity = 'gentle' | 'firm' | 'drill';

const OPTIONS: { value: Intensity; title: string; example: string }[] = [
  {
    value: 'gentle',
    title: 'Gentle',
    example: '"No pressure if today is hard — let\'s aim for one small win."',
  },
  {
    value: 'firm',
    title: 'Firm',
    example: '"You said you\'d do it. Let\'s find the next 30 minutes."',
  },
  {
    value: 'drill',
    title: 'Drill',
    example: '"Excuse logged. Move on. What\'s the first step?"',
  },
];

export default function IntensityScreen() {
  const router = useRouter();
  const [pick, setPick] = useState<Intensity | null>(onboarding.get().intensity);

  const handleContinue = () => {
    if (pick) onboarding.set({ intensity: pick });
    router.push('/(onboarding)/framework');
  };

  return (
    <OnboardingFrame
      step={3}
      totalSteps={9}
      eyebrow="Step 3"
      title="How direct should the coach be?"
      subtitle="Pick a default — you can override per goal later."
      primary={{
        label: 'Continue',
        onPress: handleContinue,
        disabled: !pick,
      }}
    >
      <View className="gap-3">
        {OPTIONS.map(opt => (
          <Pressable
            key={opt.value}
            onPress={() => setPick(opt.value)}
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: pick === opt.value ? 'rgba(56,189,248,0.4)' : 'rgba(204,218,240,0.06)',
              backgroundColor: pick === opt.value ? 'rgba(56,189,248,0.06)' : 'rgba(255,255,255,0.012)',
              padding: 18,
            }}
          >
            <Text style={{
              color: '#EEF0F6',
              fontSize: 18,
              fontFamily: 'Inter_500Medium',
              letterSpacing: -0.3,
            }}>
              {opt.title}
            </Text>
            <Text className="text-text-2 mt-2" style={{ fontSize: 13, fontStyle: 'italic', fontFamily: 'Inter_400Regular', lineHeight: 19 }}>
              {opt.example}
            </Text>
          </Pressable>
        ))}
      </View>
    </OnboardingFrame>
  );
}
