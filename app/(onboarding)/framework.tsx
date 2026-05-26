import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingFrame } from '../../src/components/OnboardingFrame';
import { onboarding } from '../../src/store/onboarding';

type Framework = 'atomic_habits' | 'ikigai' | 'deep_work';

const OPTIONS: { value: Framework; title: string; subtitle: string }[] = [
  { value: 'atomic_habits', title: 'Atomic Habits',  subtitle: 'Small reps. Identity votes. Never miss twice.' },
  { value: 'ikigai',         title: 'Ikigai',         subtitle: 'Direction & meaning. Long arc over short streaks.' },
  { value: 'deep_work',      title: 'Deep Work',      subtitle: 'Focus blocks. Output over busy time.' },
];

export default function FrameworkScreen() {
  const router = useRouter();
  const [pick, setPick] = useState<Framework | null>(onboarding.get().framework);

  const handleContinue = () => {
    if (pick) onboarding.set({ framework: pick });
    router.push('/(onboarding)/goals');
  };

  return (
    <OnboardingFrame
      step={4}
      totalSteps={9}
      eyebrow="Step 4"
      title="Which lens fits you?"
      subtitle="The coach speaks this language across your goals. Override per goal later."
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
            <Text style={{ color: '#EEF0F6', fontSize: 17, fontFamily: 'Inter_500Medium', letterSpacing: -0.3 }}>
              {opt.title}
            </Text>
            <Text className="text-text-2 mt-1.5" style={{ fontSize: 13, fontFamily: 'Inter_400Regular' }}>
              {opt.subtitle}
            </Text>
          </Pressable>
        ))}
      </View>
    </OnboardingFrame>
  );
}
