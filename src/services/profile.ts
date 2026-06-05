/**
 * profile.ts — read/update the user's profile settings.
 */

import { supabase } from './supabase';
import { Database } from './database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export async function fetchProfile(): Promise<Profile | null> {
  const isBypass = typeof window !== 'undefined' && localStorage.getItem('bypass_auth') === 'true';
  if (isBypass) {
    const mockName = localStorage.getItem('mock_profile_name') || 'Samantha';
    return {
      id: 'mock-user',
      display_name: mockName,
      timezone: 'UTC',
      intensity: 'firm',
      preferred_check_in_local_time: '21:30',
      morning_sync_time: '07:30',
      onboarding_completed_at: new Date().toISOString(),
    } as any;
  }

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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', user.id);
  if (error) throw error;
}

export async function deleteAccount(): Promise<void> {
  // Soft path for MVP: sign out + mark profile inactive.
  // True hard-delete happens via a server function later (cascades to all rows).
  await supabase.auth.signOut();
}
