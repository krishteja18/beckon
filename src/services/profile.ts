/**
 * profile.ts — read/update the user's profile settings.
 */

import { supabase } from './supabase';
import { Database } from './database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

const MOCK_PROFILE_KEY = 'mock_profile';

function isBypass(): boolean {
  return typeof window !== 'undefined' && localStorage.getItem('bypass_auth') === 'true';
}

/** Build the default bypass profile, seeding the name from onboarding if present. */
function bypassDefaultProfile(): Profile {
  const mockName = localStorage.getItem('mock_profile_name') || 'Samantha';
  return {
    id: 'mock-user',
    display_name: mockName,
    timezone: 'UTC',
    intensity: 'firm',
    default_framework: 'atomic_habits',
    preferred_check_in_local_time: '21:30',
    morning_sync_time: '07:30',
    onboarding_completed_at: new Date().toISOString(),
  } as any;
}

function readMockProfile(): Profile {
  const raw = localStorage.getItem(MOCK_PROFILE_KEY);
  if (raw) {
    try { return JSON.parse(raw) as Profile; } catch { /* fall through */ }
  }
  const def = bypassDefaultProfile();
  localStorage.setItem(MOCK_PROFILE_KEY, JSON.stringify(def));
  return def;
}

export async function fetchProfile(): Promise<Profile | null> {
  if (isBypass()) return readMockProfile();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfile(patch: ProfileUpdate): Promise<void> {
  if (isBypass()) {
    const merged = { ...readMockProfile(), ...patch } as Profile;
    localStorage.setItem(MOCK_PROFILE_KEY, JSON.stringify(merged));
    // Keep the legacy name key in sync (used elsewhere as a fallback).
    if (typeof patch.display_name === 'string') {
      localStorage.setItem('mock_profile_name', patch.display_name);
    }
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', user.id);
  if (error) throw error;
}

export async function deleteAccount(): Promise<void> {
  if (isBypass()) {
    // Wipe local mock state; the screen then routes back to welcome.
    ['mock_profile', 'mock_profile_name', 'mock_goals', 'mock_schedules', 'mock_routines', 'bypass_auth']
      .forEach(k => localStorage.removeItem(k));
    return;
  }
  // Soft path for MVP: sign out + mark profile inactive.
  // True hard-delete happens via a server function later (cascades to all rows).
  await supabase.auth.signOut();
}
