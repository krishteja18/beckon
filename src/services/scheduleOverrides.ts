/**
 * scheduleOverrides.ts — one-day reschedule overrides.
 * Used by voice command "push gym to 8pm today" — does NOT modify goal_schedules.
 * Tomorrow resumes normal schedule.
 */

import { supabase } from './supabase';
import { syncAlarms } from './alarmScheduler';

export interface ScheduleOverride {
  id: string;
  user_id: string;
  goal_id: string;
  override_date: string;   // YYYY-MM-DD
  override_time: string;   // HH:MM[:SS]
  original_time: string;   // HH:MM[:SS]
  reason: string | null;
  created_at: string;
}

function isBypass(): boolean {
  return typeof window !== 'undefined' && localStorage.getItem('bypass_auth') === 'true';
}

function readMock(): ScheduleOverride[] {
  return JSON.parse(localStorage.getItem('mock_schedule_overrides') || '[]');
}
function writeMock(rs: ScheduleOverride[]): void {
  localStorage.setItem('mock_schedule_overrides', JSON.stringify(rs));
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Create/replace today's override for a goal. Unique (goal_id, override_date). */
export async function rescheduleGoalToday(
  goalId: string,
  originalTime: string,
  newTime: string,
  reason?: string,
): Promise<ScheduleOverride> {
  const date = todayISO();

  if (isBypass()) {
    const all = readMock();
    const filtered = all.filter(o => !(o.goal_id === goalId && o.override_date === date));
    const row: ScheduleOverride = {
      id: 'mock-override-' + Math.random().toString(36).slice(2, 11),
      user_id: 'mock-user',
      goal_id: goalId,
      override_date: date,
      override_time: newTime,
      original_time: originalTime,
      reason: reason ?? null,
      created_at: new Date().toISOString(),
    };
    filtered.push(row);
    writeMock(filtered);
    return row;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Upsert pattern: delete then insert (unique constraint on goal_id + override_date)
  await supabase
    .from('schedule_overrides')
    .delete()
    .eq('goal_id', goalId)
    .eq('override_date', date);

  const { data, error } = await supabase
    .from('schedule_overrides')
    .insert({
      user_id: user.id,
      goal_id: goalId,
      override_date: date,
      override_time: newTime,
      original_time: originalTime,
      reason: reason ?? null,
    })
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Failed to create override');

  try { await syncAlarms(); } catch (e) { console.warn('[overrides] syncAlarms', e); }
  return data as ScheduleOverride;
}

export async function listTodaysOverrides(): Promise<ScheduleOverride[]> {
  const date = todayISO();
  if (isBypass()) {
    return readMock().filter(o => o.override_date === date);
  }
  const { data, error } = await supabase
    .from('schedule_overrides')
    .select('*')
    .eq('override_date', date);
  if (error) throw error;
  return (data ?? []) as ScheduleOverride[];
}

export async function clearOverride(overrideId: string): Promise<void> {
  if (isBypass()) {
    writeMock(readMock().filter(o => o.id !== overrideId));
    return;
  }
  const { error } = await supabase
    .from('schedule_overrides')
    .delete()
    .eq('id', overrideId);
  if (error) throw error;
  try { await syncAlarms(); } catch (e) { console.warn('[overrides] syncAlarms', e); }
}
