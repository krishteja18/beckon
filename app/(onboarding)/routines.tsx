import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingFrame } from '../../src/components/OnboardingFrame';
import { onboarding } from '../../src/store/onboarding';

interface Draft {
  title: string;
  hour: string;
  minute: string;
  period: 'AM' | 'PM';
}

const SUGGESTIONS = ['Medication', 'Vitamins', 'Drink water', 'Stretch'];

function to24h(d: Draft): string | null {
  const h = parseInt(d.hour, 10);
  const m = parseInt(d.minute, 10);
  if (isNaN(h) || h < 1 || h > 12) return null;
  if (isNaN(m) || m < 0 || m > 59) return null;
  let hh24 = h % 12;
  if (d.period === 'PM') hh24 += 12;
  return `${hh24.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export default function OnboardingRoutines() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Draft[]>([]);

  const addDraft = (title = '') => {
    setDrafts(prev => [
      ...prev,
      { title, hour: '8', minute: '00', period: 'AM' },
    ]);
  };

  const removeDraft = (idx: number) => {
    setDrafts(prev => prev.filter((_, i) => i !== idx));
  };

  const updateDraft = (idx: number, patch: Partial<Draft>) => {
    setDrafts(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...patch };
      return copy;
    });
  };

  const handleSkip = () => {
    onboarding.set({ routines: [] });
    router.push('/(onboarding)/permissions');
  };

  const handleContinue = () => {
    const cleaned: { title: string; time: string }[] = [];
    for (const d of drafts) {
      if (!d.title.trim()) continue;
      const t = to24h(d);
      if (!t) {
        Alert.alert('Invalid time', `Check the time for "${d.title}".`);
        return;
      }
      cleaned.push({ title: d.title.trim(), time: t });
    }
    onboarding.set({ routines: cleaned });
    router.push('/(onboarding)/permissions');
  };

  return (
    <OnboardingFrame
      step={6}
      totalSteps={8}
      eyebrow="Step 6 · Optional"
      title="Any daily reminders?"
      subtitle="Small things you want the coach to ring you about — medication, vitamins, water. Skip if you don't have any."
      primary={{
        label: drafts.length === 0 ? 'SKIP FOR NOW' : 'CONTINUE',
        onPress: drafts.length === 0 ? handleSkip : handleContinue,
      }}
      secondary={drafts.length > 0 ? { label: 'Skip', onPress: handleSkip } : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {drafts.map((d, idx) => (
          <View key={idx} style={styles.row}>
            <TextInput
              style={styles.titleInput}
              value={d.title}
              onChangeText={t => updateDraft(idx, { title: t })}
              placeholder="What is it?"
              placeholderTextColor="#9CA3AF"
              maxLength={60}
            />
            <View style={styles.timeRow}>
              <TextInput
                style={styles.timeInput}
                keyboardType="number-pad"
                maxLength={2}
                value={d.hour}
                onChangeText={t => updateDraft(idx, { hour: t.replace(/\D/g, '') })}
              />
              <Text style={styles.colon}>:</Text>
              <TextInput
                style={styles.timeInput}
                keyboardType="number-pad"
                maxLength={2}
                value={d.minute}
                onChangeText={t => updateDraft(idx, { minute: t.replace(/\D/g, '') })}
              />
              <Pressable
                onPress={() => updateDraft(idx, { period: d.period === 'AM' ? 'PM' : 'AM' })}
                style={styles.periodToggle}
              >
                <Text style={styles.periodText}>{d.period}</Text>
              </Pressable>
              <View style={{ flex: 1 }} />
              <Pressable onPress={() => removeDraft(idx)} hitSlop={10}>
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            </View>
          </View>
        ))}

        <Pressable onPress={() => addDraft()} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Add reminder</Text>
        </Pressable>

        {drafts.length === 0 && (
          <View style={styles.suggestionsBlock}>
            <Text style={styles.suggestionsLabel}>QUICK ADD</Text>
            <View style={styles.suggestionsRow}>
              {SUGGESTIONS.map(s => (
                <Pressable key={s} onPress={() => addDraft(s)} style={styles.suggestionChip}>
                  <Text style={styles.suggestionText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <Text style={styles.helperText}>
          Routines ring every day by default. You can change days later from the Routines tab.
        </Text>
      </ScrollView>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  row: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.12)',
    padding: 12,
    marginBottom: 10,
  },
  titleInput: {
    height: 42,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.16)',
    paddingHorizontal: 12,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: '#1E1B4B',
    marginBottom: 10,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeInput: {
    width: 44,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.16)',
    textAlign: 'center',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E1B4B',
  },
  colon: {
    color: '#1E1B4B',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginHorizontal: 2,
  },
  periodToggle: {
    marginLeft: 6,
    paddingHorizontal: 10,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(108, 93, 211, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodText: {
    color: '#6C5DD3',
    fontSize: 12.5,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
  },
  removeText: {
    color: '#F43F5E',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  addBtn: {
    paddingVertical: 13,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(108, 93, 211, 0.4)',
    marginBottom: 16,
  },
  addBtnText: {
    color: '#6C5DD3',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  suggestionsBlock: {
    marginBottom: 16,
  },
  suggestionsLabel: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 10,
    color: '#9CA3AF',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 99,
    backgroundColor: 'rgba(108, 93, 211, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.16)',
  },
  suggestionText: {
    color: '#6C5DD3',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  helperText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginTop: 8,
  },
});
