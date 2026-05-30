import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingFrame } from '../../src/components/OnboardingFrame';
import { onboarding } from '../../src/store/onboarding';

const MAX_GOALS = 3;

export default function GoalsScreen() {
  const router = useRouter();
  const existing = onboarding.get().goals.map(g => g.title);
  const [goals, setGoals] = useState<string[]>(existing.length > 0 ? existing : ['']);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View className="gap-4">
          {goals.map((g, i) => {
            const isFocused = focusedIndex === i;
            const hasText = g.trim().length > 0;
            return (
              <View
                key={i}
                style={[
                  styles.card,
                  isFocused && styles.cardFocused,
                  !isFocused && hasText && styles.cardHasText,
                ]}
              >
                {/* Monospace glass number badge */}
                <View style={styles.numberBadge}>
                  <Text style={styles.numberBadgeText}>
                    {String(i + 1).padStart(2, '0')}
                  </Text>
                </View>

                <TextInput
                  value={g}
                  onChangeText={(v) => updateGoal(i, v)}
                  onFocus={() => setFocusedIndex(i)}
                  onBlur={() => setFocusedIndex(null)}
                  placeholder="e.g. Gym, Deep work, Read 30 min..."
                  placeholderTextColor="rgba(170, 178, 200, 0.25)"
                  autoCapitalize="sentences"
                  style={styles.input}
                />

                {goals.length > 1 && (
                  <Pressable 
                    onPress={() => removeGoal(i)}
                    hitSlop={8}
                    style={styles.removeBtn}
                  >
                    <Text style={styles.removeBtnText}>×</Text>
                  </Pressable>
                )}
              </View>
            );
          })}

          {goals.length < MAX_GOALS && (
            <Pressable
              onPress={addGoal}
              style={styles.addCard}
            >
              <Text style={styles.addCardText}>
                + Add another ({MAX_GOALS - goals.length} left)
              </Text>
            </Pressable>
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
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardFocused: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHasText: {
    borderColor: 'rgba(56, 189, 248, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  numberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberBadgeText: {
    color: 'rgba(238, 240, 246, 0.65)',
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 10.5,
  },
  input: {
    flex: 1,
    color: '#EEF0F6',
    fontSize: 15.5,
    fontFamily: 'Inter_400Regular',
    paddingVertical: 0,
  },
  removeBtn: {
    paddingHorizontal: 6,
  },
  removeBtnText: {
    color: 'rgba(170, 178, 200, 0.4)',
    fontSize: 22,
    fontWeight: '300',
  },
  addCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.005)',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCardText: {
    color: 'rgba(170, 178, 200, 0.6)',
    fontFamily: 'Inter_500Medium',
    fontSize: 13.5,
  },
});
