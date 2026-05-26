/**
 * velocity.ts — rolling 7-day consistency %.
 *
 * For each of the last 7 days, count: how many goal-events FIRED today / how
 * many goal-events were COMPLETED today (or "rough_day" override which counts
 * as completed). Velocity = completed / fired across the 7-day window.
 *
 * MVP simplification: count one "expected" event per goal_schedules row per
 * day-of-week match. If a check-in exists for that goal today, count it as 1.
 * Otherwise 0. This is approximate but gives a meaningful rolling score.
 *
 * Note: this is computed client-side off cached DB reads — fine for MVP scale.
 * Server-side materialized view becomes worth it at 10k+ users.
 */

import { supabase } from './supabase';

export interface VelocityResult {
  /** 0..100 integer */
  percent: number;
  /** raw completed / expected counts over the window */
  completed: number;
  expected: number;
}

export async function computeVelocity(days: number = 7): Promise<VelocityResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { percent: 0, completed: 0, expected: 0 };

  // Load active schedules
  const { data: schedules } = await supabase
    .from('goal_schedules')
    .select('id, goal_id, scheduled_days, scheduled_time')
    .eq('active', true);

  if (!schedules || schedules.length === 0) return { percent: 0, completed: 0, expected: 0 };

  // Load check-ins from the window
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - days + 1);
  windowStart.setHours(0, 0, 0, 0);

  const { data: checkIns } = await supabase
    .from('check_ins')
    .select('started_at, goal_ids')
    .gte('started_at', windowStart.toISOString());

  const completedGoalsByDay = new Map<string, Set<string>>(); // dayKey → set of goal_ids
  for (const ci of checkIns ?? []) {
    const dayKey = new Date(ci.started_at).toISOString().slice(0, 10);
    const set = completedGoalsByDay.get(dayKey) ?? new Set<string>();
    for (const gid of (ci.goal_ids as string[] | null) ?? []) set.add(gid);
    completedGoalsByDay.set(dayKey, set);
  }

  let expected = 0;
  let completed = 0;

  for (let i = 0; i < days; i++) {
    const d = new Date(windowStart);
    d.setDate(d.getDate() + i);
    const dayKey = d.toISOString().slice(0, 10);
    const dow = d.getDay();

    // Don't count future days (today's later schedules haven't fired yet)
    if (d.getTime() > Date.now()) continue;

    const todaysCompleted = completedGoalsByDay.get(dayKey) ?? new Set();

    for (const s of schedules) {
      if (!s.scheduled_days.includes(dow)) continue;
      expected++;
      if (todaysCompleted.has(s.goal_id)) completed++;
    }
  }

  if (expected === 0) return { percent: 0, completed: 0, expected: 0 };

  const percent = Math.round((completed / expected) * 100);
  return { percent, completed, expected };
}
