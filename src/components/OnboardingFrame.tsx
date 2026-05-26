import { ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
 * Standard chrome for onboarding screens — step indicator, eyebrow,
 * title, subtitle, body, and 1 or 2 CTAs at the bottom.
 */
export function OnboardingFrame({
  step, totalSteps, eyebrow, title, subtitle, children, primary, secondary,
}: Props) {
  return (
    <SafeAreaView className="flex-1 bg-bg">
      {/* Step dots */}
      <View className="flex-row gap-1.5 px-6 pt-4">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 2,
              borderRadius: 1,
              backgroundColor: i < step ? '#38BDF8' : 'rgba(204,218,240,0.08)',
            }}
          />
        ))}
      </View>

      {/* Body */}
      <View className="flex-1 px-6 pt-10">
        {eyebrow && (
          <Text
            className="text-text-3 text-[10px] uppercase mb-3"
            style={{ letterSpacing: 1.4, fontFamily: 'JetBrainsMono_500Medium' }}
          >
            {eyebrow}
          </Text>
        )}
        <Text
          style={{
            color: '#EEF0F6',
            fontSize: 32,
            fontWeight: '300',
            letterSpacing: -1.2,
            lineHeight: 38,
            fontFamily: 'Inter_300Light',
          }}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            className="text-text-2 mt-3"
            style={{ fontSize: 15, lineHeight: 22, fontFamily: 'Inter_400Regular' }}
          >
            {subtitle}
          </Text>
        )}

        <View className="mt-10 flex-1">{children}</View>
      </View>

      {/* CTAs */}
      <View className="px-6 pb-8 gap-3">
        {primary && (
          <Pressable
            onPress={primary.onPress}
            disabled={primary.disabled}
            style={{
              backgroundColor: primary.disabled ? 'rgba(56,189,248,0.15)' : '#38BDF8',
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: 'center',
              opacity: primary.disabled ? 0.5 : 1,
            }}
          >
            <Text style={{ color: '#020409', fontSize: 15, fontFamily: 'Inter_500Medium', letterSpacing: -0.2 }}>
              {primary.label}
            </Text>
          </Pressable>
        )}
        {secondary && (
          <Pressable onPress={secondary.onPress} className="items-center py-3">
            <Text className="text-text-2 text-[14px]" style={{ fontFamily: 'Inter_400Regular' }}>
              {secondary.label}
            </Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}
