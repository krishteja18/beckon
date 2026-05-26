import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingFrame } from '../../src/components/OnboardingFrame';
import { onboarding } from '../../src/store/onboarding';

const MAX_GOALS = 3;

export default function GoalsScreen() {
  const router = useRouter();
  const existing = onboarding.get().goals.map(g => g.title);
  const [goals, setGoals] = useState<string[]>(existing.length > 0 ? existing : ['']);

  const handleContinue = () => {
    onboarding.set({
      goals: goals.filter(t => t.trim().length > 0).map(t => ({ title: t.trim() })),
    });
    router.push('/(onboarding)/schedule');
  };

  const updateGoal = (i: number, val: string) => {
    const next = [...goals];
    next[i] = val;
    setGoals(next);
  };

  const addGoal = () => {
    if (goals.length < MAX_GOALS) setGoals([...goals, '']);
  };

  const removeGoal = (i: number) => {
    setGoals(goals.filter((_, idx) => idx !== i));
  };

  const valid = goals.filter(g => g.trim().length > 0).length >= 1;

  return (
    <OnboardingFrame
      step={5}
      totalSteps={9}
      eyebrow="Step 5"
      title="What 1–3 things matter most right now?"
      subtitle="Keep it small. Add more later — for now, just the load-bearing stuff."
      primary={{
        label: 'Continue',
        onPress: handleContinue,
        disabled: !valid,
      }}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="gap-3">
          {goals.map((g, i) => (
            <View
              key={i}
              style={{
                borderRadius: 14,
                borderWidth: 1,
                borderColor: g ? 'rgba(56,189,248,0.2)' : 'rgba(204,218,240,0.06)',
                backgroundColor: 'rgba(255,255,255,0.012)',
                paddingHorizontal: 16,
                paddingVertical: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Text className="text-text-3" style={{ fontFamily: 'JetBrainsMono_500Medium', fontSize: 12 }}>
                {i + 1}
              </Text>
              <TextInput
                value={g}
                onChangeText={(v) => updateGoal(i, v)}
                placeholder="e.g. Gym, Deep work, Read 30 min..."
                placeholderTextColor="rgba(170,178,200,0.3)"
                autoCapitalize="sentences"
                style={{
                  flex: 1,
                  color: '#EEF0F6',
                  fontSize: 16,
                  fontFamily: 'Inter_400Regular',
                }}
              />
              {goals.length > 1 && (
                <Pressable onPress={() => removeGoal(i)}>
                  <Text className="text-text-3" style={{ fontSize: 18 }}>×</Text>
                </Pressable>
              )}
            </View>
          ))}

          {goals.length < MAX_GOALS && (
            <Pressable
              onPress={addGoal}
              className="border border-dashed rounded-2xl py-3 items-center"
              style={{ borderColor: 'rgba(204,218,240,0.12)' }}
            >
              <Text className="text-text-2" style={{ fontFamily: 'Inter_400Regular', fontSize: 14 }}>
                + Add another ({MAX_GOALS - goals.length} left)
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </OnboardingFrame>
  );
}
