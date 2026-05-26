import { useState } from 'react';
import { TextInput, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingFrame } from '../../src/components/OnboardingFrame';
import { onboarding } from '../../src/store/onboarding';

export default function Name() {
  const router = useRouter();
  const [name, setName] = useState(onboarding.get().name);

  const handleContinue = () => {
    onboarding.set({ name: name.trim() });
    router.push('/(onboarding)/intensity');
  };

  return (
    <OnboardingFrame
      step={2}
      totalSteps={9}
      eyebrow="Step 2"
      title="What should the coach call you?"
      subtitle="First name is fine — this is what you'll hear on every call."
      primary={{
        label: 'Continue',
        onPress: handleContinue,
        disabled: name.trim().length === 0,
      }}
    >
      <View>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor="rgba(170,178,200,0.3)"
          autoFocus
          autoCapitalize="words"
          autoComplete="name"
          style={{
            color: '#EEF0F6',
            fontSize: 22,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: name.length > 0 ? '#38BDF8' : 'rgba(204,218,240,0.1)',
            fontFamily: 'Inter_400Regular',
          }}
        />
        <Text className="text-text-3 text-[11px] mt-3" style={{ fontFamily: 'Inter_400Regular' }}>
          You can change this anytime in settings.
        </Text>
      </View>
    </OnboardingFrame>
  );
}
