import { useState } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingFrame } from '../../src/components/OnboardingFrame';
import { signInWithGoogle, signInWithApple, signInWithEmail } from '../../src/services/auth';

export default function Auth() {
  const router = useRouter();
  const [emailMode, setEmailMode] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  const handleProvider = async (provider: 'apple' | 'google') => {
    try {
      setBusy(true);
      if (provider === 'apple') await signInWithApple();
      else await signInWithGoogle();
      router.push('/(onboarding)/name');
    } catch (e: any) {
      Alert.alert('Sign-in failed', e.message ?? 'Try again');
    } finally {
      setBusy(false);
    }
  };

  const handleEmail = async () => {
    if (!email.includes('@')) return;
    try {
      setBusy(true);
      await signInWithEmail(email.trim());
      Alert.alert(
        'Check your email',
        `We sent a sign-in link to ${email.trim()}. Tap it to continue.`,
      );
    } catch (e: any) {
      Alert.alert('Could not send link', e.message ?? 'Try again');
    } finally {
      setBusy(false);
    }
  };

  const isEmailValid = email.includes('@');

  return (
    <OnboardingFrame
      step={1}
      totalSteps={9}
      eyebrow="Step 1"
      title="Sign in to continue"
      subtitle="Your goals stay private. We never sell or train on your data."
    >
      <View className="gap-3">
        <ProviderButton
          label="Continue with Apple"
          onPress={() => handleProvider('apple')}
          disabled={busy}
        />
        <ProviderButton
          label="Continue with Google"
          onPress={() => handleProvider('google')}
          disabled={busy}
        />

        <View className="flex-row items-center my-5">
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {emailMode ? (
          <View className="gap-4">
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="rgba(170,178,200,0.25)"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              style={[
                styles.textInput,
                inputFocused && styles.textInputFocused,
              ]}
            />
            <Pressable
              onPress={handleEmail}
              disabled={busy || !isEmailValid}
              style={[
                styles.emailSubmitButton,
                isEmailValid && styles.emailSubmitButtonActive,
                busy && { opacity: 0.5 },
              ]}
            >
              {busy ? (
                <ActivityIndicator color="#03050C" />
              ) : (
                <Text
                  style={{
                    color: isEmailValid ? '#03050C' : 'rgba(255,255,255,0.3)',
                    fontSize: 14.5,
                    fontFamily: 'Inter_500Medium',
                  }}
                >
                  Send magic link
                </Text>
              )}
            </Pressable>
          </View>
        ) : (
          <ProviderButton
            label="Continue with email"
            onPress={() => setEmailMode(true)}
            disabled={busy}
            variant="secondary"
          />
        )}
      </View>
    </OnboardingFrame>
  );
}

function ProviderButton({
  label, onPress, disabled = false, variant = 'primary',
}: { label: string; onPress: () => void; disabled?: boolean; variant?: 'primary' | 'secondary' }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.providerButton,
        variant === 'secondary' && styles.providerButtonSecondary,
        disabled && { opacity: 0.5 },
      ]}
    >
      <Text
        style={{
          color: variant === 'secondary' ? 'rgba(238, 240, 246, 0.75)' : '#EEF0F6',
          fontSize: 14.5,
          fontFamily: 'Inter_500Medium',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  providerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  providerButtonSecondary: {
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  dividerText: {
    color: 'rgba(150, 160, 185, 0.35)',
    fontSize: 11,
    paddingHorizontal: 16,
    fontFamily: 'JetBrainsMono_400Regular',
    textTransform: 'uppercase',
  },
  textInput: {
    color: '#EEF0F6',
    fontSize: 15.5,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    fontFamily: 'Inter_400Regular',
  },
  textInputFocused: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.03)',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  emailSubmitButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: 'center',
  },
  emailSubmitButtonActive: {
    backgroundColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});
