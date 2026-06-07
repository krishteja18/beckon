import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator, Alert, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingFrame } from '../../src/components/OnboardingFrame';
import { signInWithGoogle, signInWithApple, signInWithEmail } from '../../src/services/auth';
import { supabase } from '../../src/services/supabase';

// Simple Vector Icons inside pure React Native Views for cross-platform compatibility
function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
      </svg>
    </View>
  );
}

function AppleIcon({ size = 18, color = '#000000' }: { size?: number; color?: string }) {
  return (
    <View style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.18.67-2.90 1.49-.62.71-1.16 1.85-1.02 2.96 1.09.08 2.21-.57 2.93-1.39z"/>
      </svg>
    </View>
  );
}

function MailIcon({ size = 16, color = '#6C5DD3' }: { size?: number; color?: string }) {
  return (
    <View style={{ width: size, height: size, marginRight: 10, alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
        <polyline points="22,6 12,13 2,6"></polyline>
      </svg>
    </View>
  );
}

export default function Auth() {
  const router = useRouter();
  const [emailMode, setEmailMode] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  useEffect(() => {
    let active = true;

    // Advance immediately if a session is already present
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active && session) {
        router.push('/(onboarding)/name');
      }
    });

    // Advance immediately on any session transition (such as Google Popup login success)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session) {
        router.push('/(onboarding)/name');
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

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
      totalSteps={8}
      eyebrow="Step 1"
      title="Sign in to continue"
      subtitle="Your goals stay private. We never sell or train on your data."
    >
      <View className="gap-3.5 pt-4">
        <ProviderButton
          provider="apple"
          label="Continue with Apple"
          onPress={() => handleProvider('apple')}
          disabled={busy}
        />
        <ProviderButton
          provider="google"
          label="Continue with Google"
          onPress={() => handleProvider('google')}
          disabled={busy}
        />

        <View className="flex-row items-center my-4">
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
              placeholderTextColor="rgba(170, 185, 220, 0.22)"
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
                <ActivityIndicator color="#0D0E12" />
              ) : (
                <Text
                  style={{
                    color: isEmailValid ? '#FFFFFF' : 'rgba(108, 93, 211, 0.25)',
                    fontSize: 14.5,
                    fontFamily: 'Inter_600SemiBold',
                  }}
                >
                  Send magic link
                </Text>
              )}
            </Pressable>
          </View>
        ) : (
          <ProviderButton
            provider="email"
            label="Continue with email"
            onPress={() => setEmailMode(true)}
            disabled={busy}
          />
        )}

        {Platform.OS === 'web' && (
          <Pressable
            onPress={() => {
              if (typeof window !== 'undefined') {
                localStorage.setItem('bypass_auth', 'true');
                router.push('/(onboarding)/name');
              }
            }}
            style={styles.bypassBtn}
          >
            <Text style={styles.bypassBtnText}>
              ⚡ BYPASS AUTH (DEVELOPER GUEST MODE)
            </Text>
          </Pressable>
        )}
      </View>
    </OnboardingFrame>
  );
}

function ProviderButton({
  provider, label, onPress, disabled = false,
}: { provider: 'apple' | 'google' | 'email'; label: string; onPress: () => void; disabled?: boolean }) {
  
  const isApple = provider === 'apple';
  const isGoogle = provider === 'google';
  const isEmail = provider === 'email';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.providerButton,
        (isApple || isGoogle) && styles.btnBrand,
        isEmail && styles.btnEmail,
        disabled && { opacity: 0.5 },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', paddingHorizontal: 16 }}>
        {(isApple || isGoogle) && (
          <View style={styles.iconBadge}>
            {isApple && <AppleIcon size={16} color="#000000" />}
            {isGoogle && <GoogleIcon size={16} />}
          </View>
        )}
        {isEmail && <MailIcon size={16} />}
        <Text
          style={[
            styles.btnText,
            (isApple || isGoogle) && { color: '#FFFFFF' },
            isEmail && { color: '#6C5DD3' },
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  providerButton: {
    borderRadius: 28, // capsule shape
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  btnBrand: {
    backgroundColor: '#6C5DD3', // Solid primary brand purple background!
    borderWidth: 0,
  },
  btnEmail: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(108, 93, 211, 0.25)',
    elevation: 0,
    shadowOpacity: 0,
  },
  btnText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(108, 93, 211, 0.08)',
  },
  dividerText: {
    color: '#8A94A6',
    fontSize: 11,
    paddingHorizontal: 16,
    fontFamily: 'Inter_500Medium',
    textTransform: 'lowercase',
  },
  textInput: {
    color: '#1E1B4B',
    fontSize: 15,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 28,
    backgroundColor: '#F4F6FB',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.08)',
    fontFamily: 'Inter_400Regular',
  },
  textInputFocused: {
    borderColor: '#6C5DD3', // Brand purple focused highlight
    backgroundColor: 'rgba(108, 93, 211, 0.01)',
  },
  emailSubmitButton: {
    backgroundColor: 'rgba(108, 93, 211, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.08)',
    borderRadius: 28,
    paddingVertical: 15,
    alignItems: 'center',
  },
  emailSubmitButtonActive: {
    backgroundColor: '#6C5DD3',
    borderColor: '#6C5DD3',
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  bypassBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#FB923C', // Warm coral developer accent
    borderRadius: 28,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(251, 146, 60, 0.03)',
  },
  bypassBtnText: {
    color: '#FB923C',
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
  },
});
