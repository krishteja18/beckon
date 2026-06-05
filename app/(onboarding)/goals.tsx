import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingFrame } from '../../src/components/OnboardingFrame';
import { onboarding } from '../../src/store/onboarding';

interface PresetGoal {
  id: string;
  title: string;
  emoji: string;
  activeBg: string;
  activeShadow: string;
}

const PRESETS: PresetGoal[] = [
  { id: 'deep-work', title: 'Deep Work', emoji: 'ðŸ§ ', activeBg: '#E0F2FE', activeShadow: 'rgba(56, 189, 248, 0.28)' },
  { id: 'morning-routine', title: 'Morning Routine', emoji: 'ðŸŒ…', activeBg: '#FEF3C7', activeShadow: 'rgba(251, 191, 36, 0.28)' },
  { id: 'screen-detox', title: 'Screen Detox', emoji: 'ðŸ“µ', activeBg: '#ECEFFA', activeShadow: 'rgba(108, 93, 211, 0.28)' },
  { id: 'consistency', title: 'Consistency', emoji: 'ðŸ”¥', activeBg: '#FFEDD5', activeShadow: 'rgba(251, 146, 60, 0.28)' },
  { id: 'sleep-hygiene', title: 'Sleep Hygiene', emoji: 'ðŸŒ™', activeBg: '#E0E7FF', activeShadow: 'rgba(129, 140, 248, 0.28)' },
  { id: 'mindfulness', title: 'Mindfulness', emoji: 'ðŸ§˜', activeBg: '#D1FAE5', activeShadow: 'rgba(52, 211, 153, 0.28)' },
  { id: 'fitness', title: 'Fitness', emoji: 'ðŸ‹ï¸', activeBg: '#FFE4E6', activeShadow: 'rgba(239, 68, 68, 0.28)' },
  { id: 'beauty', title: 'Beauty', emoji: 'âœ¨', activeBg: '#FAE8FF', activeShadow: 'rgba(240, 46, 170, 0.28)' },
  { id: 'nutrition', title: 'Nutrition & Diet', emoji: 'ðŸ¥‘', activeBg: '#ECFDF5', activeShadow: 'rgba(16, 185, 129, 0.28)' },
];

export default function GoalsScreen() {
  const router = useRouter();

  // Load existing goals from onboarding store
  const existingGoals = onboarding.get().goals.map(g => g.title);
  
  // Custom goals are those selected that are not in our presets
  const presetTitles = PRESETS.map(p => p.title);
  const initialCustom = existingGoals.filter(t => !presetTitles.includes(t));

  const [selectedTitles, setSelectedTitles] = useState<string[]>(existingGoals);
  const [customGoals, setCustomGoals] = useState<string[]>(initialCustom);
  
  const [showInput, setShowInput] = useState(false);
  const [customText, setCustomText] = useState('');
  const [focusedInput, setFocusedInput] = useState(false);

  const handleContinue = () => {
    onboarding.set({
      goals: selectedTitles.map(t => ({ title: t })),
    });
    router.push('/(onboarding)/schedule');
  };

  const toggleGoal = (title: string) => {
    if (selectedTitles.includes(title)) {
      setSelectedTitles(selectedTitles.filter(t => t !== title));
    } else {
      setSelectedTitles([...selectedTitles, title]);
    }
  };

  const saveCustomGoal = () => {
    if (customText.trim().length === 0) return;
    const title = customText.trim();
    
    // Add to custom goals list if unique
    if (!customGoals.includes(title)) {
      setCustomGoals([...customGoals, title]);
    }
    
    // Auto-select the newly added custom goal
    if (!selectedTitles.includes(title)) {
      setSelectedTitles([...selectedTitles, title]);
    }

    setCustomText('');
    setShowInput(false);
  };

  const removeCustomGoal = (title: string) => {
    setCustomGoals(customGoals.filter(t => t !== title));
    setSelectedTitles(selectedTitles.filter(t => t !== title));
  };

  const valid = selectedTitles.length >= 1;

  return (
    <OnboardingFrame
      step={4}
      totalSteps={8}
      eyebrow="Step 4"
      title="Customize your goals"
      subtitle="Select at least one wellness target. Your AI coach uses these to keep you consistent."
      primary={{
        label: 'CONTINUE',
        onPress: handleContinue,
        disabled: !valid,
      }}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Presets 3x3 Grid */}
        <View style={styles.grid}>
          {PRESETS.map((preset) => {
            const isSelected = selectedTitles.includes(preset.title);
            return (
              <View key={preset.id} style={styles.gridItem}>
                <Pressable
                  onPress={() => toggleGoal(preset.title)}
                  style={[
                    styles.card,
                    isSelected && {
                      backgroundColor: preset.activeBg,
                      shadowColor: preset.activeShadow,
                      shadowOpacity: 0.18,
                      shadowRadius: 10,
                      shadowOffset: { width: 0, height: 6 },
                      borderColor: 'transparent',
                      borderWidth: 0,
                      elevation: 4,
                    },
                  ]}
                >
                  <Text style={styles.cardEmoji}>{preset.emoji}</Text>
                </Pressable>
                <Text style={[styles.cardLabel, isSelected && styles.cardLabelActive]}>
                  {preset.title}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Custom Goals Added Section */}
        {customGoals.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={styles.sectionTitle}>Your Custom Goals</Text>
            {customGoals.map((title) => {
              const isSelected = selectedTitles.includes(title);
              return (
                <Pressable
                  key={title}
                  onPress={() => toggleGoal(title)}
                  style={[
                    styles.customGoalCard,
                    isSelected && styles.customGoalCardActive,
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Text style={{ fontSize: 16, marginRight: 10 }}>ðŸŽ¯</Text>
                    <Text style={[
                      styles.customGoalText,
                      isSelected && styles.customGoalTextActive,
                    ]}>
                      {title}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => removeCustomGoal(title)}
                    hitSlop={8}
                    style={styles.customGoalRemove}
                  >
                    <Text style={styles.customGoalRemoveText}>Ã—</Text>
                  </Pressable>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Dash Card or Input for adding new goals */}
        {showInput ? (
          <View style={[styles.customInputContainer, focusedInput && styles.customInputFocused]}>
            <TextInput
              value={customText}
              onChangeText={setCustomText}
              onFocus={() => setFocusedInput(true)}
              onBlur={() => setFocusedInput(false)}
              placeholder="Type custom goal (e.g. Read 30m)..."
              placeholderTextColor="rgba(108, 93, 211, 0.3)"
              style={styles.customTextInput}
              autoFocus
              onSubmitEditing={saveCustomGoal}
              autoCapitalize="sentences"
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={saveCustomGoal} style={styles.inputSaveBtn}>
                <Text style={styles.inputSaveBtnText}>Save Goal</Text>
              </Pressable>
              <Pressable 
                onPress={() => { setShowInput(false); setCustomText(''); }} 
                style={styles.inputCancelBtn}
              >
                <Text style={styles.inputCancelBtnText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => setShowInput(true)}
            style={styles.addCustomBtn}
          >
            <Text style={styles.addCustomText}>
              + ADD CUSTOM GOAL
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 18,
    columnGap: 10,
    paddingTop: 12,
  },
  gridItem: {
    width: '30%',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.05)',
  },
  cardEmoji: {
    fontSize: 26,
  },
  cardLabel: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#8A94A6',
    textAlign: 'center',
  },
  cardLabelActive: {
    color: '#1E1B4B',
    fontFamily: 'Inter_700Bold',
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#8A94A6',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addCustomBtn: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(108, 93, 211, 0.25)',
    backgroundColor: 'rgba(108, 93, 211, 0.02)',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  addCustomText: {
    color: '#6C5DD3',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11.5,
  },
  customInputContainer: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.15)',
    backgroundColor: '#FFFFFF',
    padding: 12,
    marginTop: 20,
    gap: 10,
  },
  customInputFocused: {
    borderColor: '#6C5DD3',
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  customTextInput: {
    color: '#1E1B4B',
    fontSize: 14.5,
    fontFamily: 'Inter_400Regular',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F4F6FB',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.05)',
  },
  inputSaveBtn: {
    flex: 1,
    backgroundColor: '#6C5DD3',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  inputSaveBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  inputCancelBtn: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.15)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  inputCancelBtnText: {
    color: '#6C5DD3',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  customGoalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.06)',
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  customGoalCardActive: {
    backgroundColor: '#ECEFFA',
    borderColor: '#6C5DD3',
  },
  customGoalText: {
    fontSize: 14.5,
    fontFamily: 'Inter_500Medium',
    color: '#6B7280',
  },
  customGoalTextActive: {
    color: '#1E1B4B',
    fontFamily: 'Inter_600SemiBold',
  },
  customGoalRemove: {
    padding: 4,
  },
  customGoalRemoveText: {
    color: '#FB923C',
    fontSize: 20,
    fontWeight: '300',
  },
});
