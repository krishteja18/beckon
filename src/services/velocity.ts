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

function localDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface VelocityResult {
  /** 0..100 integer */
  percent: number;
  /** raw completed / expected counts over the window */
  completed: number;
  expected: number;
  /** trend change compared to last week (current % - previous %) */
  trend: number | null;
}

export async function computeVelocity(days: number = 7): Promise<VelocityResult> {
  const isBypass = typeof window !== 'undefined' && localStorage.getItem('bypass_auth') === 'true';
  if (isBypass) {
    const schedules = JSON.parse(localStorage.getItem('mock_schedules') || '[]')
      .filter((s: any) => s.active)
      .map((s: any) => ({ id: s.id, goal_id: s.goal_id, scheduled_days: s.scheduled_days as number[] }));
    if (schedules.length === 0) return { percent: 0, completed: 0, expected: 0, trend: null };

    // Same logic as the real path, against the mock_task_events store.
    const events = JSON.parse(localStorage.getItem('mock_task_events') || '[]')
      .filter((e: any) => e.kind === 'completed');
    const goalsByDay = new Map<string, Set<string>>();
    const schedsByDay = new Map<string, Set<string>>();
    for (const e of events) {
      const dk = e.user_local_date;
      if (!dk) continue;
      if (e.goal_id) { const s = goalsByDay.get(dk) ?? new Set<string>(); s.add(e.goal_id); goalsByDay.set(dk, s); }
      if (e.schedule_id) { const s = schedsByDay.get(dk) ?? new Set<string>(); s.add(e.schedule_id); schedsByDay.set(dk, s); }
    }
    const EMPTY = new Set<string>();
    const done = (dk: string, s: { id: string; goal_id: string }) =>
      (schedsByDay.get(dk) ?? EMPTY).has(s.id) || (goalsByDay.get(dk) ?? EMPTY).has(s.goal_id);

    const countWindow = (startDaysAgo: number) => {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const start = new Date(todayStart); start.setDate(start.getDate() - startDaysAgo);
      let expected = 0, completed = 0;
      for (let i = 0; i < days; i++) {
        const d = new Date(start); d.setDate(d.getDate() + i);
        if (d.getTime() > Date.now()) continue;
        const dk = localDateString(d);
        const dow = d.getDay();
        for (const s of schedules) {
          if (!s.scheduled_days.includes(dow)) continue;
          expected++;
          if (done(dk, s)) completed++;
        }
      }
      return { expected, completed };
    };

    const cur = countWindow(days - 1);
    const prev = countWindow(days * 2 - 1);
    if (cur.expected === 0) return { percent: 0, completed: 0, expected: 0, trend: null };
    const curPct = Math.round((cur.completed / cur.expected) * 100);
    const prevPct = prev.expected === 0 ? 0 : Math.round((prev.completed / prev.expected) * 100);
    return {
      percent: curPct,
      completed: cur.completed,
      expected: cur.expected,
      trend: prev.expected === 0 ? null : curPct - prevPct,
    };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { percent: 0, completed: 0, expected: 0, trend: null };

  // Load active schedules
  const { data: schedules } = await supabase
    .from('goal_schedules')
    .select('id, goal_id, scheduled_days, scheduled_time')
    .eq('active', true);

  if (!schedules || schedules.length === 0) return { percent: 0, completed: 0, expected: 0, trend: null };

  // Load completed task_events from the last 14 days (current + previous week).
  // task_events is the canonical outcome store written by BOTH manual marks and
  // voice calls — so this counts completions from either path.
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - (days * 2) + 1);
  windowStart.setHours(0, 0, 0, 0);

  const { data: events } = await supabase
    .from('task_events')
    .select('goal_id, schedule_id, user_local_date')
    .eq('kind', 'completed')
    .gte('user_local_date', localDateString(windowStart));

  // dayKey → completed goal_ids / completed schedule_ids
  const goalsByDay = new Map<string, Set<string>>();
  const schedsByDay = new Map<string, Set<string>>();
  for (const e of events ?? []) {
    const dayKey = e.user_local_date as string;
    if (e.goal_id) {
      const set = goalsByDay.get(dayKey) ?? new Set<string>();
      set.add(e.goal_id as string);
      goalsByDay.set(dayKey, set);
    }
    if (e.schedule_id) {
      const set = schedsByDay.get(dayKey) ?? new Set<string>();
      set.add(e.schedule_id as string);
      schedsByDay.set(dayKey, set);
    }
  }
  const EMPTY = new Set<string>();
  // A schedule is "done" on a day if its own slot was marked (per-slot) OR the
  // whole goal was marked (goal-level, e.g. a voice call with no specific slot).
  const isScheduleDone = (dayKey: string, s: { id: string; goal_id: string }) =>
    (schedsByDay.get(dayKey) ?? EMPTY).has(s.id) || (goalsByDay.get(dayKey) ?? EMPTY).has(s.goal_id);

  // Calculate current 7 days (today back to 7 days ago)
  let expectedCurrent = 0;
  let completedCurrent = 0;
  
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const currentStart = new Date(todayStart);
  currentStart.setDate(currentStart.getDate() - days + 1);

  for (let i = 0; i < days; i++) {
    const d = new Date(currentStart);
    d.setDate(d.getDate() + i);
    const dayKey = localDateString(d);
    const dow = d.getDay();

    // Don't count future times
    if (d.getTime() > Date.now()) continue;

    for (const s of schedules) {
      if (!s.scheduled_days.includes(dow)) continue;
      expectedCurrent++;
      if (isScheduleDone(dayKey, s)) completedCurrent++;
    }
  }

  // Calculate previous 7 days (8 to 14 days ago)
  let expectedPrev = 0;
  let completedPrev = 0;
  
  const prevStart = new Date(todayStart);
  prevStart.setDate(prevStart.getDate() - (days * 2) + 1);

  for (let i = 0; i < days; i++) {
    const d = new Date(prevStart);
    d.setDate(d.getDate() + i);
    const dayKey = localDateString(d);
    const dow = d.getDay();

    if (d.getTime() > Date.now()) continue;

    for (const s of schedules) {
      if (!s.scheduled_days.includes(dow)) continue;
      expectedPrev++;
      if (isScheduleDone(dayKey, s)) completedPrev++;
    }
  }

  if (expectedCurrent === 0) return { percent: 0, completed: 0, expected: 0, trend: null };

  const currentPercent = Math.round((completedCurrent / expectedCurrent) * 100);
  const prevPercent = expectedPrev === 0 ? 0 : Math.round((completedPrev / expectedPrev) * 100);
  const trend = expectedPrev === 0 ? null : (currentPercent - prevPercent);

  return { percent: currentPercent, completed: completedCurrent, expected: expectedCurrent, trend };
}
