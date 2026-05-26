import '../global.css';

import { useEffect } from 'react';
import { AppState } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Inter_100Thin, Inter_300Light, Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { JetBrainsMono_400Regular, JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import { startAuthLifecycle, supabase } from '../src/services/supabase';
import { syncAlarms } from '../src/services/alarmScheduler';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_100Thin,
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  useEffect(() => {
    startAuthLifecycle();

    // Re-arm alarms on every foreground (covers reboot recovery, schedule
    // changes from other devices, OEM kill recovery). syncAlarms is idempotent
    // and a no-op when no native module is linked (iOS / web / dev build).
    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active') return;
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        syncAlarms().catch(e => console.warn('[layout] syncAlarms', e));
      }
    });
    return () => sub.remove();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#020409' }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#020409' },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(app)" />
          <Stack.Screen name="call" options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
