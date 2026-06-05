import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { Redirect } from 'expo-router';
import { supabase } from '../src/services/supabase';

type GateState = 'loading' | 'signed-out' | 'onboarding' | 'app';

export default function Index() {
  const [state, setState] = useState<GateState>('loading');

  useEffect(() => {
    let cancelled = false;

    const decide = async () => {
      try {
        // Auto-close OAuth popup window on Web once session is established
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.name === 'google-signin') {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            window.close();
            return;
          }
          // Keep the popup in loading state while Supabase processes the redirect hash.
          // This prevents unmounting and redirecting, allowing onAuthStateChange to fire.
          return;
        }

        // Local developer bypass for Web client
        if (Platform.OS === 'web' && typeof window !== 'undefined' && localStorage.getItem('bypass_auth') === 'true') {
          setState('app');
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;

        if (!session) {
          setState('signed-out');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed_at')
          .eq('id', session.user.id)
          .maybeSingle();

        if (cancelled) return;
        setState(profile?.onboarding_completed_at ? 'app' : 'onboarding');
      } catch {
        // Network / RLS error → treat as needs-onboarding so user can continue
        if (!cancelled) setState('signed-out');
      }
    };

    decide();

    // React to login/logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      decide();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  if (state === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: '#020409', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#6C5DD3" />
      </View>
    );
  }

  if (state === 'signed-out' || state === 'onboarding') {
    return <Redirect href={'/(onboarding)/welcome' as any} />;
  }
  return <Redirect href={'/(app)/home' as any} />;
}
