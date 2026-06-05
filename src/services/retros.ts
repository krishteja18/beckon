import { supabase } from './supabase';
import { Database } from './database.types';
import { bucketForHour, TimeBucket } from './temporal';

type Retro = Database['public']['Tables']['retros']['Row'];

export type RetroType = 'daily' | 'weekly' | 'monthly';

function isBypass(): boolean {
  return typeof window !== 'undefined' && localStorage.getItem('bypass_auth') === 'true';
}

const DOW_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ── Stored retros (LLM-generated, future) ────────────────────────────────────

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
      mk(1, 'Showed up for the gym and the morning pages. Skipped the evening read — you mentioned you were wiped. Fair. Tomorrow, just open the book; one page counts.'),
      mk(2, 'A full slate today. Three for three. The 6am slot is becoming automatic — that\'s identity forming, not willpower.'),
    ];
  }
  if (type === 'weekly') {
    return [
      mk(7, 'Strong week — you showed up 5 of 7 days. Weekdays are solid; weekends slip. Worth deciding now what Saturday actually looks like.'),
    ];
  }
  return [
    mk(30, 'A month of mostly-consistent mornings. The wall you kept hitting was Wednesday evenings — every miss clustered there. We moved that block; let\'s see if it holds.'),
  ];
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

// ── Live retro — computed narrative from real task_events (words, no charts) ──

export interface LiveRetro {
  periodLabel: string;  // "Today" | "This week" | "This month"
  rangeLabel: string;   // "Jun 5"  | "May 30 – Jun 5"
  narrative: string;
}

interface MiniEvent {
  kind: string;
  dow: number;
  bucket: TimeBucket;
}

function windowStart(type: RetroType, now: Date): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  if (type === 'weekly') d.setDate(d.getDate() - 6);
  else if (type === 'monthly') d.setDate(d.getDate() - 29);
  return d;
}

function fmt(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function labels(type: RetroType, start: Date, now: Date): { periodLabel: string; rangeLabel: string } {
  if (type === 'daily') return { periodLabel: 'Today', rangeLabel: fmt(now) };
  if (type === 'weekly') return { periodLabel: 'This week', rangeLabel: `${fmt(start)} – ${fmt(now)}` };
  return { periodLabel: 'This month', rangeLabel: `${fmt(start)} – ${fmt(now)}` };
}

function buildNarrative(type: RetroType, events: MiniEvent[]): string | null {
  const completed = events.filter(e => e.kind === 'completed').length;
  const missed = events.filter(e => e.kind === 'skipped' || e.kind === 'failed').length;
  if (completed + missed === 0) return null;

  const periodWord = type === 'daily' ? 'today' : type === 'weekly' ? 'this week' : 'this month';
  const lines: string[] = [];

  if (completed > 0) {
    lines.push(`You showed up ${completed} time${completed === 1 ? '' : 's'} ${periodWord}.`);
  }

  if (missed === 0 && completed > 0) {
    lines.push('A clean stretch — hold the line.');
  } else if (missed > 0) {
    // fragile day-of-week
    const missCounts = new Map<number, number>();
    for (const e of events) {
      if (e.kind === 'skipped' || e.kind === 'failed') {
        missCounts.set(e.dow, (missCounts.get(e.dow) ?? 0) + 1);
      }
    }
    let fragileDow = -1, best = 0;
    for (const [dow, c] of missCounts) if (c > best) { best = c; fragileDow = dow; }
    if (best >= 2 && fragileDow >= 0) {
      lines.push(`${DOW_LABELS[fragileDow]}s look fragile — that's where the misses cluster.`);
    } else {
      lines.push(`${missed} slipped by. No drama — just pick one easy win next.`);
    }
  }

  return lines.join(' ');
}

export async function computeLiveRetro(type: RetroType): Promise<LiveRetro | null> {
  const now = new Date();
  const start = windowStart(type, now);
  const lbl = labels(type, start, now);

  if (isBypass()) {
    const mockByType: Record<RetroType, string> = {
      daily: 'You showed up 2 times today. One slipped by — no drama, just pick one easy win next.',
      weekly: 'You showed up 5 times this week. Saturdays look fragile — that\'s where the misses cluster.',
      monthly: 'You showed up 18 times this month. A clean stretch lately — hold the line.',
    };
    return { ...lbl, narrative: mockByType[type] };
  }

  const { data, error } = await supabase
    .from('task_events')
    .select('kind, user_local_day_of_week, user_local_hour')
    .gte('occurred_at', start.toISOString());
  if (error || !data) return null;

  const events: MiniEvent[] = data.map((r: any) => ({
    kind: r.kind,
    dow: r.user_local_day_of_week,
    bucket: bucketForHour(r.user_local_hour),
  }));

  const narrative = buildNarrative(type, events);
  if (!narrative) return null;
  return { ...lbl, narrative };
}
