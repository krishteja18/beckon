import { useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingFrame } from '../../src/components/OnboardingFrame';
import { VoiceBall } from '../../src/components/VoiceBall';
import { onboarding } from '../../src/store/onboarding';
import { commitOnboarding } from '../../src/services/onboardingComplete';

export default function TestCallScreen() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTest = () => {
    router.push('/call?type=morning');
  };

  const handleFinish = async () => {
    setSaving(true);
    setError(null);
    try {
      await commitOnboarding(onboarding.get());
      onboarding.reset();
      router.replace('/(app)/home');
    } catch (e: any) {
      setError(e.message ?? 'Could not save your setup. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingFrame
      step={9}
      totalSteps={9}
      eyebrow="Step 9 · last one"
      title="Let's make sure it works."
      subtitle="Tap below — we'll fire a test call in 5 seconds. You'll see exactly what a real call feels like."
      primary={{
        label: saving ? 'Saving...' : "I'm ready, finish setup",
        onPress: handleFinish,
        disabled: saving,
      }}
      secondary={{ label: 'Run a test call', onPress: handleTest }}
    >
      <View style={styles.container}>
        {/* Floating Gemini Voice Orb with glowing backing halo */}
        <View style={styles.orbWrapper}>
          <VoiceBall state="speaking" size={170} />
        </View>

        {saving && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#38BDF8" />
            <Text style={styles.savingText}>Finalizing your customized workspace...</Text>
          </View>
        )}

        {error && (
          <Text style={styles.errorText}>
            {error}
          </Text>
        )}
      </View>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  orbWrapper: {
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 28,
    elevation: 10,
    marginBottom: 40,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  savingText: {
    color: 'rgba(170, 178, 200, 0.7)',
    fontSize: 13.5,
    fontFamily: 'Inter_400Regular',
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 20,
    fontFamily: 'Inter_400Regular',
    marginTop: 10,
  },
});
