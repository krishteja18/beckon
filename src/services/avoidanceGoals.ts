/**
 * avoidanceGoals.ts — voice-added habits the user wants to QUIT.
 * "from today I'm quitting sugar" → creates a row here.
 *
 * No standalone alarms. Reviewed in evening retro + triggered by SOS shortcut.
 */

import { supabase } from './supabase';
import { Database } from './database.types';

type AvoidanceGoal = Database['public']['Tables']['avoidance_goals']['Row'];

export async function listAvoidanceGoals(): Promise<AvoidanceGoal[]> {
  const { data, error } = await supabase
    .from('avoidance_goals')
    .select('*')
    .eq('active', true)
    .order('added_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addAvoidanceGoal(title: string): Promise<AvoidanceGoal> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('avoidance_goals')
    .insert({ user_id: user.id, title: title.trim(), active: true })
    .select()
    .single();

  if (error || !data) throw error ?? new Error('Failed to add');
  return data;
}

export async function deactivateAvoidanceGoal(id: string): Promise<void> {
  const { error } = await supabase
    .from('avoidance_goals')
    .update({ active: false })
    .eq('id', id);
  if (error) throw error;
}
