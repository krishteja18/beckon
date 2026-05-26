import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env and fill it in.',
  );
}

// On iOS, SecureStore values are capped at ~2 KB. Supabase session JSON can
// approach that with a large user object. Chunk if needed; for MVP the session
// stays small enough that this is fine.
const secureStorageAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase: SupabaseClient<Database> = createClient<Database>(url, anonKey, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : secureStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

let listenerStarted = false;
export function startAuthLifecycle(): void {
  if (listenerStarted || Platform.OS === 'web') return;
  listenerStarted = true;
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
