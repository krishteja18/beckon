/**
 * auth.ts — Supabase auth helpers for onboarding.
 * Handles Google + Apple OAuth and magic link (email).
 */

import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

const redirectTo = makeRedirectUri({ scheme: 'showup' });

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(data.url!, redirectTo);
  if (result.type === 'success') {
    const { url } = result;
    await supabase.auth.exchangeCodeForSession(url);
  }
}

export async function signInWithApple() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(data.url!, redirectTo);
  if (result.type === 'success') {
    await supabase.auth.exchangeCodeForSession(result.url);
  }
}

export async function signInWithEmail(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) throw error;
}

export async function signOut() {
  // Cancel device alarms first so the user doesn't get woken up after sign-out
  try {
    const { cancelAllAlarms } = await import('./alarmScheduler');
    await cancelAllAlarms();
  } catch {/* native module may not be present (web / Expo Go) */}
  await supabase.auth.signOut();
}
