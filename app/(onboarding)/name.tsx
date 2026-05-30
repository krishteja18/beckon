import { useState } from 'react';
import { TextInput, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingFrame } from '../../src/components/OnboardingFrame';
import { onboarding } from '../../src/store/onboarding';

export default function Name() {
  const router = useRouter();
  const [name, setName] = useState(onboarding.get().name);
  const [focused, setFocused] = useState(false);

  const handleContinue = () => {
    onboarding.set({ name: name.trim() });
    router.push('/(onboarding)/intensity');
  };

  const isNameFilled = name.trim().length > 0;

  return (
    <OnboardingFrame
      step={2}
      totalSteps={9}
      eyebrow="Step 2"
      title="What should your coach call you?"
      subtitle="First name is fine — this is what you'll hear spoken on every call."
      primary={{
        label: 'Continue',
        onPress: handleContinue,
        disabled: !isNameFilled,
      }}
    >
      <View style={styles.container}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your first name"
          placeholderTextColor="rgba(170,178,200,0.22)"
          autoFocus
          autoCapitalize="words"
          autoComplete="name"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            styles.textInput,
            isNameFilled && styles.textInputFilled,
            focused && styles.textInputFocused,
          ]}
        />
        
        <Text
          style={{
            fontFamily: 'Inter_400Regular',
            fontSize: 12,
            color: 'rgba(150, 160, 185, 0.45)',
            marginTop: 18,
            letterSpacing: 0.2,
          }}
        >
          You can change this anytime in settings.
        </Text>
      </View>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
  },
  textInput: {
    color: '#EEF0F6',
    fontSize: 28,
    paddingVertical: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    fontFamily: 'Inter_300Light',
    letterSpacing: -0.6,
  },
  textInputFilled: {
    borderBottomColor: 'rgba(56, 189, 248, 0.4)',
  },
  textInputFocused: {
    borderBottomColor: '#38BDF8',
    textShadowColor: 'rgba(255,255,255,0.08)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});
