/**
 * onboardingComplete.ts — single transactional commit at the end of onboarding.
 * Writes profile + goals + schedules in one go. Sets onboarding_completed_at last.
 */

import { supabase } from './supabase';
import { OnboardingState } from '../store/onboarding';
import { syncAlarms } from './alarmScheduler';

export async function commitOnboarding(state: OnboardingState): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  if (!state.intensity || !state.framework) {
    throw new Error('Intensity and framework are required');
  }
  if (!state.retroTime) {
    throw new Error('Retro time is required');
  }

  // 1. Upsert profile (without onboarding_completed_at yet)
  const { error: pErr } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      display_name: state.name.trim(),
      timezone: state.timezone,
      intensity: state.intensity,
      preferred_check_in_local_time: state.retroTime,
      morning_sync_time: state.morningSyncTime,
    }, { onConflict: 'id' });

  if (pErr) throw pErr;

  // 2. Create goals + initial schedules
  const allDays = [0, 1, 2, 3, 4, 5, 6];
  for (let i = 0; i < state.goals.length; i++) {
    const g = state.goals[i];
    if (!g.title.trim()) continue;

    const { data: goal, error: gErr } = await supabase
      .from('goals')
      .insert({
        user_id: user.id,
        title: g.title.trim(),
        framework: state.framework,
        status: 'active',
      })
      .select('id')
      .single();

    if (gErr || !goal) throw gErr ?? new Error('Failed to create goal');

    // Attach the first available time to this goal as its default schedule
    // (Per-goal time assignment becomes a separate UX flow later.)
    const time = state.scheduleTimes[i % Math.max(1, state.scheduleTimes.length)];
    if (time) {
      const { error: sErr } = await supabase
        .from('goal_schedules')
        .insert({
          goal_id: goal.id,
          user_id: user.id,
          scheduled_time: time + ':00',
          scheduled_days: allDays,
          active: true,
        });
      if (sErr) throw sErr;
    }
  }

  // 3. Mark onboarding complete (gate flips next time the user opens the app)
  const { error: doneErr } = await supabase
    .from('profiles')
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq('id', user.id);

  if (doneErr) throw doneErr;

  // 4. Arm the device-side alarms. No-op on iOS / web / pre-native-module.
  try {
    await syncAlarms();
  } catch (e) {
    console.warn('[onboarding] syncAlarms failed', e);
    // Non-fatal — user can still complete onboarding; alarms will re-arm
    // on next foreground via AppState listener.
  }
}
