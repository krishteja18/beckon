import '../global.css';

import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Outfit_100Thin,
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import { JetBrainsMono_400Regular, JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import { startAuthLifecycle, supabase } from '../src/services/supabase';
import { syncAlarms } from '../src/services/alarmScheduler';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { initSentry, Sentry } from '../src/services/sentry';

// Init Sentry at module load so it captures everything from the first frame.
// No DSN configured → no-op.
initSentry();

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    // Map Inter family names directly to Outfit premium font assets so all styles auto-upgrade!
    Inter_100Thin: Outfit_100Thin,
    Inter_300Light: Outfit_300Light,
    Inter_400Regular: Outfit_400Regular,
    Inter_500Medium: Outfit_500Medium,
    Inter_600SemiBold: Outfit_600SemiBold,
    Inter_700Bold: Outfit_700Bold,
    // Native Outfit registrations
    Outfit_100Thin,
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  // Hard timeout: render the app within 1.5s no matter what, even if fonts
  // never resolve. System fonts are a fine fallback — a blank white screen is not.
  const [forceReady, setForceReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setForceReady(true), 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    startAuthLifecycle();

    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active') return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) syncAlarms().catch(() => {});
      } catch {/* offline / not signed in */}
    });
    return () => sub.remove();
  }, []);

  const ready = fontsLoaded || !!fontError || forceReady;
  if (!ready) return null;

  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}

// Wrap with Sentry's HOC so it adds navigation breadcrumbs + auto error capture.
// If Sentry isn't configured (no DSN), this is a thin passthrough.
export default process.env.EXPO_PUBLIC_SENTRY_DSN
  ? Sentry.wrap(RootLayout)
  : RootLayout;
