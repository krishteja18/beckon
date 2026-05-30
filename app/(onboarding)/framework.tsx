import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingFrame } from '../../src/components/OnboardingFrame';
import { onboarding } from '../../src/store/onboarding';

type Framework = 'atomic_habits' | 'ikigai' | 'deep_work';

const OPTIONS: { value: Framework; title: string; subtitle: string; color: string }[] = [
  { 
    value: 'atomic_habits', 
    title: 'Atomic Habits',  
    subtitle: 'Small physical reps. Identity votes. Never miss twice.',
    color: '#38BDF8', // Cyan
  },
  { 
    value: 'ikigai',         
    title: 'Ikigai',         
    subtitle: 'Long-term meaning & purpose. Long arc over short streaks.',
    color: '#EC4899', // Pink
  },
  { 
    value: 'deep_work',      
    title: 'Deep Work',      
    subtitle: 'High-focus time blocks. High-leverage output over busywork.',
    color: '#A855F7', // Purple
  },
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
      title="Which coaching lens fits?"
      subtitle="Your coach speaks this language across all check-ins. Tweak per goal later."
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
                  borderColor: opt.color,
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  shadowColor: opt.color,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                },
              ]}
            >
              {/* Left dynamic color indicator accent bar */}
              <View style={[styles.accentBar, { backgroundColor: opt.color }]} />

              <View style={styles.cardContent}>
                <View className="flex-row items-center justify-between">
                  <Text
                    style={{
                      color: isSelected ? '#EEF0F6' : 'rgba(238,240,246,0.85)',
                      fontSize: 17,
                      fontFamily: 'Inter_500Medium',
                      letterSpacing: -0.3,
                    }}
                  >
                    {opt.title}
                  </Text>
                  
                  {/* Custom selection glowing ring */}
                  <View
                    style={[
                      styles.selectRing,
                      isSelected && { borderColor: opt.color },
                    ]}
                  >
                    {isSelected && (
                      <View style={[styles.selectDot, { backgroundColor: opt.color }]} />
                    )}
                  </View>
                </View>
                
                <Text
                  style={{
                    fontSize: 13,
                    lineHeight: 18,
                    fontFamily: 'Inter_400Regular',
                    color: isSelected ? 'rgba(170, 178, 200, 0.85)' : 'rgba(170, 178, 200, 0.55)',
                    marginTop: 6,
                  }}
                >
                  {opt.subtitle}
                </Text>
              </View>
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
    flexDirection: 'row',
    overflow: 'hidden',
    position: 'relative',
  },
  accentBar: {
    width: 4,
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginLeft: 4,
  },
  selectRing: {
    width: 16,
    height: 16,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
  },
});
