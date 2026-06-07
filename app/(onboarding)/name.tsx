import React, { useState } from 'react';
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
    router.push('/(onboarding)/coaching');
  };

  const isNameFilled = name.trim().length > 0;

  return (
    <OnboardingFrame
      step={2}
      totalSteps={8}
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
        <View style={styles.inputWrapper}>
          <Text style={styles.techLabel}>YOUR FIRST NAME</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Your first name"
            placeholderTextColor="#9CA3AF"
            autoFocus
            autoCapitalize="words"
            autoComplete="name"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={[
              styles.textInput,
              focused && styles.textInputFocused,
            ]}
          />
        </View>
        
        <Text style={styles.subtext}>
          YOUR NAME IS STORED SECURELY & CAN BE CHANGED ANYTIME
        </Text>
      </View>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
  },
  inputWrapper: {
    gap: 8,
  },
  techLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: '#6C5DD3', // Brand purple
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  textInput: {
    color: '#1E1B4B', // Slate dark text
    fontSize: 15,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 28,
    backgroundColor: '#F4F6FB',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.08)',
    fontFamily: 'Inter_500Medium',
  },
  textInputFocused: {
    borderColor: '#6C5DD3', // Brand purple focus underline
    backgroundColor: 'rgba(108, 93, 211, 0.01)',
  },
  subtext: {
    fontFamily: 'Inter_500Medium',
    fontSize: 9.5,
    color: '#8A94A6', // Gray subtext
    marginTop: 20,
    letterSpacing: 0.6,
  },
});
