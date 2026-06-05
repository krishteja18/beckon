import React, { ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AmbientBackground } from './AmbientBackground';

interface Props {
  step: number;
  totalSteps: number;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  primary?: { label: string; onPress: () => void; disabled?: boolean };
  secondary?: { label: string; onPress: () => void };
}

/**
 * Sleek, Spotify-style Premium Onboarding Frame.
 * Renders onboarding screens inside the blurry aurora background with elegant typography
 * and an ultra-thin solid neon-lime progress line.
 */
export function OnboardingFrame({
  step, totalSteps, eyebrow, title, subtitle, children, primary, secondary,
}: Props) {
  const router = useRouter();
  const progressPercent = (step / totalSteps) * 100;
  const showBackButton = step > 1;

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <AmbientBackground>
      <SafeAreaView style={styles.safeArea}>
        
        {/* Sleek, Solid Progress Indicator Line with Back Button */}
        <View style={styles.progressContainer}>
          {showBackButton && (
            <Pressable onPress={handleBack} style={styles.backButton} hitSlop={12}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6C5DD3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </Pressable>
          )}
          <View style={styles.progressTrack}>
            <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            {step} of {totalSteps}
          </Text>
        </View>

        {/* Body content */}
        <View className="flex-1 px-6 pt-5">
          {eyebrow && (
            <Text style={styles.eyebrow}>
              {eyebrow.toUpperCase()}
            </Text>
          )}
          
          <Text style={styles.title}>
            {title}
          </Text>

          {subtitle && (
            <Text style={styles.subtitle}>
              {subtitle}
            </Text>
          )}

          {/* Elegant, clean rounded card slot */}
          <View style={styles.contentWrapper}>
            {children}
          </View>
        </View>

        {/* Clean, premium capsule action buttons */}
        <View style={styles.buttonContainer}>
          {primary && (
            <Pressable
              onPress={primary.onPress}
              disabled={primary.disabled}
              style={[
                styles.primaryButton,
                primary.disabled && styles.primaryButtonDisabled,
              ]}
            >
              <Text
                style={[
                  styles.primaryText,
                  primary.disabled && styles.primaryTextDisabled,
                ]}
              >
                {primary.label}
              </Text>
            </Pressable>
          )}
          {secondary && (
            <Pressable onPress={secondary.onPress} className="items-center py-2">
              <Text style={styles.secondaryText}>
                {secondary.label}
              </Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </AmbientBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 12,
  },
  backButton: {
    marginRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(108, 93, 211, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#6C5DD3', // Premium rich indigo-purple accent
    borderRadius: 2,
  },
  progressLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#6B7280',
    letterSpacing: -0.1,
  },
  eyebrow: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: '#6C5DD3', // Brand purple
    letterSpacing: 1.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  title: {
    color: '#1E1B4B', // Premium deep slate text
    fontSize: 30,
    fontFamily: 'Inter_500Medium',
    letterSpacing: -0.8,
    lineHeight: 36,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14.2,
    lineHeight: 21,
    color: '#6B7280', // Slate gray subtitle
    marginTop: 8,
  },
  contentWrapper: {
    flex: 1,
    marginTop: 24,
    borderRadius: 24,
    backgroundColor: '#FFFFFF', // Pure White card panel
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.05)',
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
    // Premium soft dropshadow backing
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 4,
  },
  buttonContainer: {
    paddingHorizontal: 44, // 24px (screen edge) + 20px (card padding) = 44px. Aligns perfectly with input fields inside the white card!
    paddingBottom: 24,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#6C5DD3', // Rich Purple active button
    borderRadius: 28, // capsule button
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryButtonDisabled: {
    backgroundColor: 'rgba(108, 93, 211, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.08)',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: -0.1,
  },
  primaryTextDisabled: {
    color: 'rgba(108, 93, 211, 0.25)',
  },
  secondaryText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13.5,
    color: '#6C5DD3', // Lavender/Purple brand action text
  },
});
