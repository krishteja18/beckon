import { ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
 * Standard frame for all onboarding screens.
 * Wraps content in a stunning Gemini-style ambient background with glassy cards.
 */
export function OnboardingFrame({
  step, totalSteps, eyebrow, title, subtitle, children, primary, secondary,
}: Props) {
  return (
    <AmbientBackground>
      <SafeAreaView style={styles.safeArea}>
        {/* Step dots - glowing capsule indicator */}
        <View className="flex-row gap-2 px-6 pt-4">
          {Array.from({ length: totalSteps }).map((_, i) => {
            const isActive = i < step;
            return (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: isActive ? '#38BDF8' : 'rgba(255,255,255,0.08)',
                  shadowColor: isActive ? '#38BDF8' : 'transparent',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: isActive ? 0.6 : 0,
                  shadowRadius: isActive ? 4 : 0,
                  elevation: isActive ? 3 : 0,
                }}
              />
            );
          })}
        </View>

        {/* Body content */}
        <View className="flex-1 px-6 pt-10">
          {eyebrow && (
            <Text
              className="text-[10px] uppercase mb-3"
              style={{
                letterSpacing: 1.6,
                fontFamily: 'JetBrainsMono_500Medium',
                color: 'rgba(168, 85, 247, 0.75)', // soft purple accent
              }}
            >
              {eyebrow}
            </Text>
          )}
          <Text
            style={{
              color: '#EEF0F6',
              fontSize: 32,
              fontWeight: '200',
              letterSpacing: -1.2,
              lineHeight: 38,
              fontFamily: 'Inter_300Light',
            }}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              className="mt-3"
              style={{
                fontSize: 14.5,
                lineHeight: 22,
                fontFamily: 'Inter_400Regular',
                color: 'rgba(170, 178, 200, 0.75)', // glassy text
              }}
            >
              {subtitle}
            </Text>
          )}

          <View className="mt-8 flex-1">{children}</View>
        </View>

        {/* CTAs - premium button overlays */}
        <View className="px-6 pb-8 gap-3">
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
                style={{
                  color: primary.disabled ? 'rgba(255,255,255,0.3)' : '#03050C',
                  fontSize: 15,
                  fontFamily: 'Inter_500Medium',
                  letterSpacing: -0.2,
                }}
              >
                {primary.label}
              </Text>
            </Pressable>
          )}
          {secondary && (
            <Pressable onPress={secondary.onPress} className="items-center py-3">
              <Text
                className="text-[14px]"
                style={{
                  fontFamily: 'Inter_400Regular',
                  color: 'rgba(170, 178, 200, 0.55)',
                }}
              >
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
  primaryButton: {
    backgroundColor: '#38BDF8',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    shadowColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
});
