import { useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
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
      <View className="flex-1 items-center justify-center gap-4">
        <VoiceBall state="idle" size={140} />
        {saving && <ActivityIndicator color="#38BDF8" />}
        {error && (
          <Text style={{ color: '#FCA5A5', fontSize: 13, textAlign: 'center', paddingHorizontal: 20, fontFamily: 'Inter_400Regular' }}>
            {error}
          </Text>
        )}
      </View>
    </OnboardingFrame>
  );
}
