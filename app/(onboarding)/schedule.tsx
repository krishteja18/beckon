import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
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
      <View className="flex-row flex-wrap gap-2">
        {SUGGESTED_TIMES.map(t => (
          <Pressable
            key={t.value}
            onPress={() => toggle(t.value)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 99,
              borderWidth: 1,
              borderColor: picked.has(t.value) ? 'rgba(56,189,248,0.4)' : 'rgba(204,218,240,0.08)',
              backgroundColor: picked.has(t.value) ? 'rgba(56,189,248,0.08)' : 'rgba(255,255,255,0.012)',
            }}
          >
            <Text style={{
              color: picked.has(t.value) ? '#67E8F9' : 'rgba(238,240,246,0.7)',
              fontSize: 13,
              fontFamily: 'JetBrainsMono_500Medium',
              letterSpacing: -0.3,
            }}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </OnboardingFrame>
  );
}
