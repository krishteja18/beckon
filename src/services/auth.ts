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
  const isWeb = Platform.OS === 'web';
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: isWeb ? window.location.origin : redirectTo,
      skipBrowserRedirect: true,
      queryParams: {
        prompt: 'select_account', // Forces Google to show the account selection screen
      },
    },
  });
  if (error) throw error;

  if (isWeb) {
    // Web: Open standard centered popup window
    const width = 500;
    const height = 650;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const popup = window.open(
      data.url!,
      'google-signin',
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
    );

    if (!popup) {
      throw new Error('Popup blocked! Please allow popups for this website.');
    }

    // Poll actively checking for auth session, closing popup immediately when found
    return new Promise<void>((resolve, reject) => {
      const interval = setInterval(async () => {
        // Read session actively to catch successful login instantly
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          clearInterval(interval);
          try {
            popup.close();
          } catch (_) {}
          resolve();
          return;
        }

        if (popup.closed) {
          clearInterval(interval);
          const { data: { session: finalSession } } = await supabase.auth.getSession();
          if (finalSession) {
            resolve();
          } else {
            reject(new Error('Google sign-in cancelled or failed.'));
          }
        }
      }, 400);
    });
  } else {
    // Mobile: Open in-app browser sheet (ASWebAuthenticationSession / Custom Tab)
    const result = await WebBrowser.openAuthSessionAsync(data.url!, redirectTo);
    if (result.type === 'success') {
      const { error: sessionErr } = await supabase.auth.exchangeCodeForSession(result.url);
      if (sessionErr) throw sessionErr;
    } else if (result.type === 'cancel' || result.type === 'dismiss') {
      throw new Error('Sign-in cancelled.');
    } else {
      throw new Error(`Sign-in did not complete (${result.type}).`);
    }
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
    const { error: sessionErr } = await supabase.auth.exchangeCodeForSession(result.url);
    if (sessionErr) throw sessionErr;
  } else if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new Error('Sign-in cancelled.');
  } else {
    throw new Error(`Sign-in did not complete (${result.type}).`);
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
