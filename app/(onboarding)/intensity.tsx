import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingFrame } from '../../src/components/OnboardingFrame';
import { onboarding } from '../../src/store/onboarding';

type Intensity = 'gentle' | 'firm' | 'drill';

const OPTIONS: { value: Intensity; title: string; subtitle: string; example: string; glowColor: string }[] = [
  {
    value: 'gentle',
    title: 'Gentle',
    subtitle: 'Nurturing & kind',
    example: '"No pressure if today was hard — let\'s aim for just one small win."',
    glowColor: '#38BDF8', // Cyan
  },
  {
    value: 'firm',
    title: 'Firm',
    subtitle: 'Focused & direct',
    example: '"You said you\'d do it. Let\'s find the next 30 minutes together."',
    glowColor: '#A855F7', // Violet
  },
  {
    value: 'drill',
    title: 'Drill',
    subtitle: 'Extreme accountability',
    example: '"Excuse logged. Moving on. What\'s the very first physical step?"',
    glowColor: '#F59E0B', // Amber
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
      title="How direct should your coach be?"
      subtitle="Pick a starting style — you can adjust this individually per goal later."
      primary={{
        label: 'Continue',
        onPress: handleContinue,
        disabled: !pick,
      }}
    >
      <View className="gap-3">
        {OPTIONS.map(opt => {
          const isSelected = pick === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setPick(opt.value)}
              style={[
                styles.card,
                isSelected && {
                  borderColor: opt.glowColor,
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  shadowColor: opt.glowColor,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.12,
                  shadowRadius: 8,
                  elevation: 2,
                },
              ]}
            >
              <View className="flex-row items-baseline justify-between">
                <Text
                  style={{
                    color: isSelected ? opt.glowColor : '#EEF0F6',
                    fontSize: 17.5,
                    fontFamily: 'Inter_600SemiBold',
                    letterSpacing: -0.4,
                  }}
                >
                  {opt.title}
                </Text>
                <Text
                  style={{
                    color: isSelected ? 'rgba(255,255,255,0.45)' : 'rgba(170,178,200,0.3)',
                    fontSize: 10.5,
                    fontFamily: 'JetBrainsMono_400Regular',
                    textTransform: 'uppercase',
                  }}
                >
                  {opt.subtitle}
                </Text>
              </View>
              
              <Text
                style={{
                  fontSize: 13,
                  fontStyle: 'italic',
                  fontFamily: 'Inter_400Regular',
                  lineHeight: 19,
                  color: isSelected ? 'rgba(238, 240, 246, 0.85)' : 'rgba(170, 178, 200, 0.55)',
                  marginTop: 8,
                }}
              >
                {opt.example}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
});
