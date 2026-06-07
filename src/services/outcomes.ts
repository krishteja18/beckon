/**
 * outcomes.ts — record + read task outcomes (done / skipped) for the timeline.
 *
 * One task_events row per outcome. Goals are tracked per-slot via schedule_id;
 * routines and daily anchors have no goal_schedules row, so they're tracked via
 * a note tag ([routine:<id>] / [anchor:<kind>]) — mirroring the voice path.
 */

import { supabase } from './supabase';
import { bucketForHour } from './temporal';

export type SlotKind = 'goal' | 'routine' | 'kickoff' | 'cooldown';
export type OutcomeStatus = 'done' | 'skipped';
export type OutcomeKind = 'completed' | 'skipped' | 'started';

export interface OutcomeTarget {
  slotKind: SlotKind;
  /** goal id, routine id, or 'kickoff'/'cooldown' */
  goalId: string;
  /** goal_schedules id for goals; the slot's id otherwise */
  scheduleId: string;
}

function isBypass(): boolean {
  return typeof window !== 'undefined' && localStorage.getItem('bypass_auth') === 'true';
}

function localDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function kindForStatus(status: OutcomeStatus): OutcomeKind {
  return status === 'done' ? 'completed' : 'skipped';
}

/** Stable key used to match a stored outcome back to a timeline slot. */
export function outcomeKey(t: Pick<OutcomeTarget, 'slotKind' | 'goalId' | 'scheduleId'>): string {
  if (t.slotKind === 'goal') return `sched:${t.scheduleId}`;
  if (t.slotKind === 'routine') return `routine:${t.goalId}`;
  return `anchor:${t.slotKind}`;
}

/** DB columns (goal_id / schedule_id / note) for a target. */
function dbColsFor(t: OutcomeTarget): { goal_id: string | null; schedule_id: string | null; note: string | null } {
  if (t.slotKind === 'goal') return { goal_id: t.goalId, schedule_id: t.scheduleId, note: null };
  if (t.slotKind === 'routine') return { goal_id: null, schedule_id: null, note: `[routine:${t.goalId}]` };
  return { goal_id: null, schedule_id: null, note: `[anchor:${t.slotKind}]` };
}

/** Map a stored row back to its slot key, or null if it can't be mapped. */
function keyForRow(r: { schedule_id: string | null; note: string | null }): string | null {
  if (r.schedule_id) return `sched:${r.schedule_id}`;
  const m = (r.note ?? '').match(/^\[(routine|anchor):([^\]]+)\]$/);
  if (m) return m[1] === 'routine' ? `routine:${m[2]}` : `anchor:${m[2]}`;
  return null;
}

interface MockEvent {
  kind: OutcomeKind;
  goal_id: string | null;
  schedule_id: string | null;
  note: string | null;
  user_local_date: string;
  occurred_at: string;
}
function readMockEvents(): MockEvent[] {
  try { return JSON.parse(localStorage.getItem('mock_task_events') || '[]'); } catch { return []; }
}
function writeMockEvents(rows: MockEvent[]): void {
  localStorage.setItem('mock_task_events', JSON.stringify(rows));
}

export async function recordOutcome(target: OutcomeTarget, status: OutcomeStatus, note?: string): Promise<void> {
  const now = new Date();
  const today = localDateString(now);
  const cols = dbColsFor(target);

  if (isBypass()) {
    const key = outcomeKey(target);
    // Replace any existing same-slot outcome for today.
    const rows = readMockEvents().filter(r => !(r.user_local_date === today && keyForRow(r) === key));
    rows.push({
      kind: kindForStatus(status),
      goal_id: cols.goal_id,
      schedule_id: cols.schedule_id,
      note: note ?? cols.note,
      user_local_date: today,
      occurred_at: now.toISOString(),
    });
    writeMockEvents(rows);
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // A re-mark replaces the prior outcome for this slot today.
  await clearTodayOutcome(target);

  const hour = now.getHours();
  const { error } = await supabase.from('task_events').insert({
    user_id: user.id,
    goal_id: cols.goal_id,
    schedule_id: cols.schedule_id,
    kind: kindForStatus(status),
    occurred_at: now.toISOString(),
    user_local_date: today,
    user_local_day_of_week: now.getDay(),
    user_local_hour: hour,
    time_bucket: bucketForHour(hour),
    note: note ?? cols.note,
    source: 'manual',
    snooze_count: 0,
  } as any);
  if (error) throw error;
}

export async function clearTodayOutcome(target: OutcomeTarget): Promise<void> {
  const today = localDateString(new Date());

  if (isBypass()) {
    const key = outcomeKey(target);
    writeMockEvents(readMockEvents().filter(r => !(r.user_local_date === today && keyForRow(r) === key)));
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const cols = dbColsFor(target);
  let q = supabase.from('task_events').delete().eq('user_id', user.id).eq('user_local_date', today);
  if (cols.schedule_id) q = q.eq('schedule_id', cols.schedule_id);
  else if (cols.note) q = q.eq('note', cols.note);
  else return;
  await q;
}

/** Map of outcomeKey → kind for today's recorded outcomes. Latest write wins. */
export async function fetchTodayOutcomes(): Promise<Map<string, OutcomeKind>> {
  const today = localDateString(new Date());
  const out = new Map<string, OutcomeKind>();

  if (isBypass()) {
    for (const r of readMockEvents()) {
      if (r.user_local_date !== today) continue;
      const k = keyForRow(r);
      if (k) out.set(k, r.kind);
    }
    return out;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return out;
  const { data } = await supabase
    .from('task_events')
    .select('kind, schedule_id, note, occurred_at')
    .eq('user_id', user.id)
    .eq('user_local_date', today)
    .order('occurred_at', { ascending: true });
  for (const r of data ?? []) {
    const k = keyForRow(r as any);
    if (k) out.set(k, (r as any).kind as OutcomeKind);
  }
  return out;
}
