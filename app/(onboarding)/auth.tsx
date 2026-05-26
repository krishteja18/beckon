import { useState } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingFrame } from '../../src/components/OnboardingFrame';
import { signInWithGoogle, signInWithApple, signInWithEmail } from '../../src/services/auth';

export default function Auth() {
  const router = useRouter();
  const [emailMode, setEmailMode] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

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

  return (
    <OnboardingFrame
      step={1}
      totalSteps={9}
      eyebrow="Step 1"
      title="Sign in to continue"
      subtitle="Your goals stay private. We never sell or train on your data."
    >
      <View className="gap-3">
        <ProviderButton label="Continue with Apple"  onPress={() => handleProvider('apple')} disabled={busy} />
        <ProviderButton label="Continue with Google" onPress={() => handleProvider('google')} disabled={busy} />

        <View className="flex-row items-center mt-4">
          <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(204,218,240,0.05)' }} />
          <Text style={{ color: 'rgba(150,160,185,0.3)', fontSize: 11, paddingHorizontal: 12, fontFamily: 'Inter_400Regular' }}>
            or
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(204,218,240,0.05)' }} />
        </View>

        {emailMode ? (
          <View className="gap-3">
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="rgba(170,178,200,0.3)"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              style={{
                color: '#EEF0F6',
                fontSize: 16,
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderRadius: 14,
                backgroundColor: 'rgba(255,255,255,0.04)',
                borderWidth: 1,
                borderColor: 'rgba(204,218,240,0.08)',
                fontFamily: 'Inter_400Regular',
              }}
            />
            <Pressable
              onPress={handleEmail}
              disabled={busy || !email.includes('@')}
              style={{
                backgroundColor: email.includes('@') ? '#38BDF8' : 'rgba(56,189,248,0.15)',
                borderRadius: 14, paddingVertical: 14, alignItems: 'center',
                opacity: busy ? 0.5 : 1,
              }}
            >
              {busy
                ? <ActivityIndicator color="#020409" />
                : <Text style={{ color: '#020409', fontSize: 14, fontFamily: 'Inter_500Medium' }}>Send magic link</Text>
              }
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
      style={{
        backgroundColor: variant === 'primary' ? 'rgba(255,255,255,0.06)' : 'transparent',
        borderWidth: 1, borderColor: 'rgba(204,218,240,0.08)',
        borderRadius: 14, paddingVertical: 14, alignItems: 'center',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text style={{ color: '#EEF0F6', fontSize: 14, fontFamily: 'Inter_500Medium' }}>{label}</Text>
    </Pressable>
  );
}
