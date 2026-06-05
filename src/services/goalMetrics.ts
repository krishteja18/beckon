/**
 * goalMetrics.ts — per-goal completion and 7-day history.
 *
 * Spec-bounded: produces ONLY a static completion ring number and a 7-day
 * dot row. No streak counter, no calendar heatmap, no leaderboard data.
 *
 * Web bypass mode: returns plausible mock values so the Goals tab looks alive
 * during design iteration without a real DB.
 */

import { supabase } from './supabase';
import { GoalWithSchedules } from './goals';

export type DotStatus = 'done' | 'missed' | 'today' | 'future';

export interface GoalMetrics {
  /** 0..100 — rolling 7-day completion. Matches the home velocity window. */
  weekPercent: number;
  /** Last 7 days, oldest first */
  last7Days: { dayLabel: string; status: DotStatus }[];
  /** Coach-generated single-line narrative pattern (placeholder until LLM wires in) */
  narrative: string;
}

const DAY_LABELS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function isBypass(): boolean {
  return typeof window !== 'undefined' && window.localStorage?.getItem('bypass_auth') === 'true';
}

function mockMetrics(goal: GoalWithSchedules): GoalMetrics {
  // Stable but varied per goal — hash the title to get a deterministic-ish percent
  const hash = (goal.title ?? '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const weekPercent = 55 + (hash % 40); // 55–94

  const today = new Date();
  const todayDow = today.getDay();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const offset = 6 - i;
    const dow = (todayDow - offset + 7) % 7;
    let status: DotStatus;
    if (offset === 0) status = 'today';
    else if ((hash + offset) % 5 === 0) status = 'missed';
    else status = 'done';
    return { dayLabel: DAY_LABELS_SHORT[dow], status };
  });

  const narratives = [
    'Strong on weekdays. Weekends are softer.',
    'Most consistent in the morning slots.',
    'You missed mid-week — Wednesday is fragile.',
    'Four wins in a row. Keep the momentum.',
    'Solid week so far. Hold the line.',
  ];
  return {
    weekPercent,
    last7Days,
    narrative: narratives[hash % narratives.length],
  };
}

/** Compute completion + dot row for a single goal. */
export async function computeGoalMetrics(goal: GoalWithSchedules): Promise<GoalMetrics> {
  if (isBypass()) return mockMetrics(goal);

  // Rolling 7-day window — matches home velocity. Avoids monthly cliff resets.
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const { data: checkIns } = await supabase
    .from('check_ins')
    .select('started_at, goal_ids')
    .gte('started_at', sevenDaysAgo.toISOString());

  const completedByDay = new Map<string, boolean>();
  for (const ci of checkIns ?? []) {
    const goalIds = (ci.goal_ids as string[] | null) ?? [];
    if (!goalIds.includes(goal.id)) continue;
    const dayKey = new Date(ci.started_at).toISOString().slice(0, 10);
    completedByDay.set(dayKey, true);
  }

  // Week-percent — of the schedules expected in the last 7 days, how many landed?
  let expected = 0;
  let completed = 0;
  const today = new Date();
  for (let d = new Date(sevenDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    const hasScheduleToday = goal.schedules.some(
      s => s.active && s.scheduled_days.includes(dow),
    );
    if (!hasScheduleToday) continue;
    expected++;
    const dayKey = new Date(d).toISOString().slice(0, 10);
    if (completedByDay.get(dayKey)) completed++;
  }

  const weekPercent = expected === 0 ? 0 : Math.round((completed / expected) * 100);

  // 7-day dot row
  const last7Days: GoalMetrics['last7Days'] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dow = d.getDay();
    const dayKey = d.toISOString().slice(0, 10);
    const hasScheduleToday = goal.schedules.some(
      s => s.active && s.scheduled_days.includes(dow),
    );

    let status: DotStatus;
    if (i === 0) status = 'today';
    else if (!hasScheduleToday) status = 'future';
    else status = completedByDay.get(dayKey) ? 'done' : 'missed';

    last7Days.push({ dayLabel: DAY_LABELS_SHORT[dow], status });
  }

  // Narrative — placeholder until coach LLM generates these from real data
  const missedCount = last7Days.filter(d => d.status === 'missed').length;
  let narrative: string;
  if (completed === 0) {
    narrative = 'No data yet. The picture gets clearer after your first few calls.';
  } else if (missedCount === 0) {
    narrative = 'A clean week. Hold the line.';
  } else if (missedCount >= 3) {
    narrative = 'A tough stretch. Pick one easy win for tomorrow.';
  } else {
    narrative = `${completed} wins this week — ${weekPercent}% on schedule.`;
  }

  return { weekPercent, last7Days, narrative };
}
