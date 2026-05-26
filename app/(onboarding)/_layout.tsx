import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#020409' },
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="name" />
      <Stack.Screen name="intensity" />
      <Stack.Screen name="framework" />
      <Stack.Screen name="goals" />
      <Stack.Screen name="schedule" />
      <Stack.Screen name="retro-time" />
      <Stack.Screen name="permissions" />
      <Stack.Screen name="test-call" />
    </Stack>
  );
}
