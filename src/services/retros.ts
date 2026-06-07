import { supabase } from './supabase';
import { Database } from './database.types';

type Retro = Database['public']['Tables']['retros']['Row'];

export type RetroType = 'daily' | 'weekly' | 'monthly';

function isBypass(): boolean {
  return typeof window !== 'undefined' && localStorage.getItem('bypass_auth') === 'true';
}

const DOW_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ── date helpers ─────────────────────────────────────────────────────────────
function startOfDay(d: Date): Date { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date): Date { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function fmt(d: Date): string { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }

interface Window { start: Date; end: Date; startDate: string; endDate: string; }

/** The most recent COMPLETED period of this type (yesterday / last Sun–Sat / last calendar month). */
function completedWindow(type: RetroType, now: Date): Window {
  if (type === 'daily') {
    const y = new Date(now); y.setDate(y.getDate() - 1);
    return { start: startOfDay(y), end: endOfDay(y), startDate: dateStr(y), endDate: dateStr(y) };
  }
  if (type === 'weekly') {
    const curWeekSun = startOfDay(now); curWeekSun.setDate(curWeekSun.getDate() - now.getDay());
    const lastSat = new Date(curWeekSun); lastSat.setDate(lastSat.getDate() - 1);
    const lastSun = new Date(lastSat); lastSun.setDate(lastSun.getDate() - 6);
    return { start: startOfDay(lastSun), end: endOfDay(lastSat), startDate: dateStr(lastSun), endDate: dateStr(lastSat) };
  }
  const firstThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthEnd = new Date(firstThisMonth); lastMonthEnd.setDate(0);
  const lastMonthStart = new Date(lastMonthEnd.getFullYear(), lastMonthEnd.getMonth(), 1);
  return { start: startOfDay(lastMonthStart), end: endOfDay(lastMonthEnd), startDate: dateStr(lastMonthStart), endDate: dateStr(lastMonthEnd) };
}

/** The current IN-PROGRESS period start (today / this Sun / 1st of month). */
function inProgressStart(type: RetroType, now: Date): Date {
  if (type === 'weekly') { const d = startOfDay(now); d.setDate(d.getDate() - now.getDay()); return d; }
  if (type === 'monthly') return startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
  return startOfDay(now);
}

// ── narrative generator (templated stopgap until LLM-written summaries) ──────
interface MiniEvent { kind: string; dow: number; }

interface GenResult { summary_text: string; stats: Record<string, unknown>; }

function generateSummary(type: RetroType, events: MiniEvent[], tense: 'past' | 'progress'): GenResult | null {
  const completed = events.filter(e => e.kind === 'completed').length;
  const missed = events.filter(e => e.kind === 'skipped' || e.kind === 'failed').length;
  const total = completed + missed;
  if (total === 0) return null;

  const periodWord = type === 'daily' ? 'day' : type === 'weekly' ? 'week' : 'month';
  const thisOrThat = tense === 'progress' ? `this ${periodWord}` : type === 'daily' ? 'yesterday' : `last ${periodWord}`;

  // fragile day-of-week
  const missByDow = new Map<number, number>();
  for (const e of events) {
    if (e.kind === 'skipped' || e.kind === 'failed') missByDow.set(e.dow, (missByDow.get(e.dow) ?? 0) + 1);
  }
  let fragileDow = -1, best = 0;
  for (const [d, c] of missByDow) if (c > best) { best = c; fragileDow = d; }

  const lines: string[] = [];
  if (type === 'daily') {
    lines.push(missed === 0
      ? `A clean ${tense === 'progress' ? 'day so far' : 'day'} — you showed up ${completed} time${completed === 1 ? '' : 's'}.`
      : `You showed up ${completed} of ${total} times ${thisOrThat}.`);
    if (missed >= 2) lines.push('Pick one easy win to rebuild momentum.');
    else if (missed === 1) lines.push('One slipped by — no drama, just reset.');
    else if (completed > 0) lines.push('Momentum is building. Hold the line.');
  } else {
    lines.push(`You showed up ${completed} of ${total} times ${thisOrThat}.`);
    if (missed === 0) lines.push('A clean stretch — that consistency is the whole game.');
    else if (best >= 2 && fragileDow >= 0) lines.push(`${DOW_LABELS[fragileDow]}s were the fragile spot — worth deciding what that day looks like.`);
    else lines.push('Mostly steady, with a few misses. Solid base to build on.');
  }

  return { summary_text: lines.join(' '), stats: { completed, missed, total, period: type } };
}

// ── Stored retros ────────────────────────────────────────────────────────────
function mockStoredRetros(type: RetroType): Retro[] {
  const mk = (daysAgo: number, summary: string): Retro => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const iso = d.toISOString().slice(0, 10);
    return {
      id: 'mock-retro-' + daysAgo + '-' + type,
      user_id: 'mock-user',
      period: type as any,
      retro_type: type as any,
      period_start_date: iso,
      period_end_date: iso,
      generated_at: d.toISOString(),
      summary_text: summary,
      stats: {} as any,
    } as Retro;
  };
  if (type === 'daily') {
    return [
      mk(1, 'Showed up for the gym and the morning pages. Skipped the evening read — you were wiped. Fair. Tomorrow, just open the book; one page counts.'),
      mk(2, 'A full slate today. Three for three. The 6am slot is becoming automatic — that\'s identity forming, not willpower.'),
    ];
  }
  if (type === 'weekly') {
    return [mk(7, 'Strong week — you showed up 5 of 7 days. Weekdays are solid; weekends slip. Worth deciding now what Saturday actually looks like.')];
  }
  return [mk(30, 'A month of mostly-consistent mornings. The wall you kept hitting was Wednesday evenings. We moved that block; let\'s see if it holds.')];
}

export async function fetchRetros(type?: RetroType): Promise<Retro[]> {
  if (isBypass()) {
    return type ? mockStoredRetros(type) : mockStoredRetros('daily');
  }
  let q = supabase
    .from('retros')
    .select('*')
    .order('period_end_date', { ascending: false })
    .limit(30);
  if (type) q = q.eq('retro_type', type);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/**
 * Generate + persist the most recent COMPLETED period's retro if it doesn't
 * exist yet and there was activity. Idempotent — safe to call on every open.
 * (Stopgap generator; an LLM-written summary from the Evening Cooldown call
 * can replace `generateSummary` later — same row shape.)
 */
export async function ensureRetros(type: RetroType): Promise<void> {
  if (isBypass()) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const now = new Date();
  const w = completedWindow(type, now);

  // Already generated?
  const { data: existing } = await supabase
    .from('retros')
    .select('id')
    .eq('retro_type', type)
    .eq('period_end_date', w.endDate)
    .limit(1);
  if (existing && existing.length > 0) return;

  // Pull the period's events.
  const { data, error } = await supabase
    .from('task_events')
    .select('kind, user_local_day_of_week')
    .gte('occurred_at', w.start.toISOString())
    .lte('occurred_at', w.end.toISOString());
  if (error || !data) return;

  const events: MiniEvent[] = data.map((r: any) => ({ kind: r.kind, dow: r.user_local_day_of_week }));
  const gen = generateSummary(type, events, 'past');
  if (!gen) return; // no activity → don't create an empty recap

  await supabase.from('retros').insert({
    user_id: user.id,
    period: type as any,
    retro_type: type as any,
    period_start_date: w.startDate,
    period_end_date: w.endDate,
    generated_at: now.toISOString(),
    summary_text: gen.summary_text,
    stats: gen.stats as any,
  } as any);
}

// ── Live (in-progress) retro — the hero card ─────────────────────────────────
export interface LiveRetro {
  periodLabel: string;
  rangeLabel: string;
  narrative: string;
}

export async function computeLiveRetro(type: RetroType): Promise<LiveRetro | null> {
  const now = new Date();
  const start = inProgressStart(type, now);
  const periodLabel = type === 'daily' ? 'Today' : type === 'weekly' ? 'This week' : 'This month';
  const rangeLabel = type === 'daily' ? fmt(now) : `${fmt(start)} – ${fmt(now)}`;

  if (isBypass()) {
    const mockByType: Record<RetroType, string> = {
      daily: 'You showed up 2 times so far today. One slipped by — no drama, just reset.',
      weekly: 'You showed up 5 of 7 times this week. Saturdays were the fragile spot.',
      monthly: 'You showed up 18 of 22 times this month. A clean stretch lately — hold the line.',
    };
    return { periodLabel, rangeLabel, narrative: mockByType[type] };
  }

  const { data, error } = await supabase
    .from('task_events')
    .select('kind, user_local_day_of_week')
    .gte('occurred_at', start.toISOString());
  if (error || !data) return null;

  const events: MiniEvent[] = data.map((r: any) => ({ kind: r.kind, dow: r.user_local_day_of_week }));
  const gen = generateSummary(type, events, 'progress');
  if (!gen) return null;
  return { periodLabel, rangeLabel, narrative: gen.summary_text };
}
