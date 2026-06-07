import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingFrame } from '../../src/components/OnboardingFrame';
import { onboarding } from '../../src/store/onboarding';

type Intensity = 'gentle' | 'firm' | 'drill';
type Framework = 'atomic_habits' | 'ikigai' | 'deep_work';

interface IntensityOption {
  value: Intensity;
  title: string;
  subtitle: string;
  example: string;
  glowColor: string;
}

interface FrameworkOption {
  value: Framework;
  title: string;
  subtitle: string;
  color: string;
}

const INTENSITIES: IntensityOption[] = [
  {
    value: 'gentle',
    title: 'Gentle',
    subtitle: 'Nurturing & kind',
    example: '"No pressure — let\'s aim for just one small win."',
    glowColor: '#38BDF8', // Sky Blue
  },
  {
    value: 'firm',
    title: 'Firm',
    subtitle: 'Direct & focused',
    example: '"You said you\'d do it. Let\'s find 30 minutes together."',
    glowColor: '#6C5DD3', // Brand Purple
  },
  {
    value: 'drill',
    title: 'Drill',
    subtitle: 'Strict & extreme',
    example: '"Excuse logged. What\'s the very first physical step?"',
    glowColor: '#FB923C', // Coral Orange
  },
];

const FRAMEWORKS: FrameworkOption[] = [
  { 
    value: 'atomic_habits', 
    title: 'Atomic Habits',  
    subtitle: 'Focused on small physical reps, identity building, and never missing twice.',
    color: '#38BDF8', 
  },
  { 
    value: 'ikigai',         
    title: 'Ikigai',         
    subtitle: 'Long-term meaning & purpose. Prioritizes the long arc over short daily streaks.',
    color: '#6C5DD3', 
  },
  { 
    value: 'deep_work',      
    title: 'Deep Work',      
    subtitle: 'High-focus distraction-free blocks. Leverages high output over busywork.',
    color: '#FB923C', 
  },
];

export default function CoachingScreen() {
  const router = useRouter();

  // Load existing parameters
  const [pickIntensity, setPickIntensity] = useState<Intensity | null>(onboarding.get().intensity);
  const [pickFramework, setPickFramework] = useState<Framework | null>(onboarding.get().framework);

  const handleContinue = () => {
    if (pickIntensity && pickFramework) {
      onboarding.set({
        intensity: pickIntensity,
        framework: pickFramework,
      });
      router.push('/(onboarding)/goals');
    }
  };

  const isValid = pickIntensity !== null && pickFramework !== null;

  return (
    <OnboardingFrame
      step={3}
      totalSteps={8}
      eyebrow="Step 3"
      title="Define your coaching style"
      subtitle="Select the check-in strictness and core productivity philosophy that works best for you."
      primary={{
        label: 'CONTINUE',
        onPress: handleContinue,
        disabled: !isValid,
      }}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Section 1: Intensity Pills */}
        <Text style={styles.sectionTitle}>Coaching Strictness</Text>
        <View style={styles.intensityRow}>
          {INTENSITIES.map((opt) => {
            const isSelected = pickIntensity === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setPickIntensity(opt.value)}
                style={[
                  styles.intensityPill,
                  isSelected && {
                    backgroundColor: '#ECEFFA',
                    borderColor: '#6C5DD3',
                    borderWidth: 1.5,
                  },
                ]}
              >
                <Text style={[styles.intensityText, isSelected && styles.intensityTextActive]}>
                  {opt.title}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Dynamic Personality Quote Bubble */}
        {pickIntensity && (
          <View style={styles.quoteBubble}>
            <Text style={styles.quoteTitle}>
              Coach Voice ({INTENSITIES.find(i => i.value === pickIntensity)?.subtitle}):
            </Text>
            <Text style={styles.quoteText}>
              {INTENSITIES.find(i => i.value === pickIntensity)?.example}
            </Text>
          </View>
        )}

        {/* Section 2: Framework Cards */}
        <Text style={[styles.sectionTitle, { marginTop: 22 }]}>Productivity Philosophy</Text>
        <View style={styles.frameworkContainer}>
          {FRAMEWORKS.map((opt) => {
            const isSelected = pickFramework === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setPickFramework(opt.value)}
                style={[
                  styles.frameworkCard,
                  isSelected && {
                    borderColor: opt.color,
                    backgroundColor: 'rgba(108, 93, 211, 0.01)',
                    shadowColor: opt.color,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.08,
                    shadowRadius: 10,
                    elevation: 3,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, isSelected && { color: opt.color }]}>
                    {opt.title}
                  </Text>
                  {isSelected && <View style={[styles.activeDot, { backgroundColor: opt.color }]} />}
                </View>
                <Text style={[styles.cardSubtitle, isSelected && { color: '#1E1B4B' }]}>
                  {opt.subtitle}
                </Text>
              </Pressable>
            );
          })}
        </View>

      </ScrollView>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#8A94A6',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  intensityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  intensityPill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.08)',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  intensityText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#6B7280',
  },
  intensityTextActive: {
    color: '#1E1B4B',
    fontFamily: 'Inter_700Bold',
  },
  quoteBubble: {
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F4F6FB',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.04)',
  },
  quoteTitle: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#6C5DD3',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quoteText: {
    marginTop: 4,
    fontSize: 13,
    fontStyle: 'italic',
    fontFamily: 'Inter_400Regular',
    color: '#1E1B4B',
    lineHeight: 18,
  },
  frameworkContainer: {
    gap: 10,
  },
  frameworkCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.08)',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E1B4B',
    letterSpacing: -0.3,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cardSubtitle: {
    marginTop: 6,
    fontSize: 12.5,
    fontFamily: 'Inter_400Regular',
    color: '#6B7280',
    lineHeight: 17,
  },
});
