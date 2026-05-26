// Temporal context builder for voice prompts.
//
// Turns recent task_events into a compact paragraph the LLM can use to decide
// tone ("you've shown up 4 days running") or to pinpoint patterns
// ("you keep missing Wednesdays at 7pm").

import { format, differenceInCalendarDays, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export type TimeBucket = 'morning' | 'midday' | 'evening' | 'night';

export interface TaskEventRow {
  kind:
    | 'started'
    | 'completed'
    | 'skipped'
    | 'failed'
    | 'wall_hit'
    | 'wall_recovered'
    | 'rough_day';
  occurred_at: string; // ISO
  user_local_date: string; // YYYY-MM-DD
  user_local_day_of_week: number; // 0-6
  user_local_hour: number; // 0-23
  time_bucket: TimeBucket;
}

export interface TemporalContextArgs {
  nowUtc: Date;
  userTimezone: string;
  recentEvents: TaskEventRow[]; // last ~30 days
}

export function bucketForHour(hour: number): TimeBucket {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'midday';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

export function buildTemporalContext(args: TemporalContextArgs): string {
  const { nowUtc, userTimezone, recentEvents } = args;
  const nowLocal = toZonedTime(nowUtc, userTimezone);
  const today = format(nowLocal, 'yyyy-MM-dd');
  const dayOfWeek = format(nowLocal, 'EEEE');
  const localHour = nowLocal.getHours();
  const bucket = bucketForHour(localHour);

  const completedDates = new Set(
    recentEvents.filter((e) => e.kind === 'completed').map((e) => e.user_local_date),
  );
  const streak = currentStreak(today, completedDates);

  const lastShowUp = recentEvents
    .filter((e) => e.kind === 'completed')
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))[0];
  const daysSince = lastShowUp
    ? differenceInCalendarDays(parseISO(today), parseISO(lastShowUp.user_local_date))
    : null;

  const dowMissCounts = countMissesByDow(recentEvents);
  const fragileDow = topFragileDow(dowMissCounts);
  const bucketMissCounts = countMissesByBucket(recentEvents);
  const fragileBucket = topFragileBucket(bucketMissCounts);

  const lines: string[] = [];
  lines.push(`Now: ${dayOfWeek} ${format(nowLocal, 'HH:mm')} local (${bucket} block) in ${userTimezone}.`);
  lines.push(
    streak > 0
      ? `Current streak: ${streak} day${streak === 1 ? '' : 's'} of at least one completed goal.`
      : `Current streak: 0. They haven't shown up yet today.`,
  );
  if (daysSince !== null) {
    lines.push(
      daysSince === 0
        ? `Last show-up: today.`
        : `Last show-up: ${daysSince} day${daysSince === 1 ? '' : 's'} ago.`,
    );
  } else {
    lines.push(`No completed events in recent history.`);
  }
  if (fragileDow) {
    lines.push(`Fragile day-of-week: ${fragileDow.label} (${fragileDow.count} misses in recent window).`);
  }
  if (fragileBucket) {
    lines.push(`Fragile time-of-day: ${fragileBucket.label} block (${fragileBucket.count} misses).`);
  }
  return lines.join(' ');
}

function currentStreak(today: string, completedDates: Set<string>): number {
  let streak = 0;
  let cursor = parseISO(today);
  // count backwards while consecutive days are present
  while (completedDates.has(format(cursor, 'yyyy-MM-dd'))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
  }
  return streak;
}

const DOW_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MISS_KINDS = new Set(['skipped', 'failed', 'wall_hit']);

function countMissesByDow(events: TaskEventRow[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const e of events) {
    if (!MISS_KINDS.has(e.kind)) continue;
    counts.set(e.user_local_day_of_week, (counts.get(e.user_local_day_of_week) ?? 0) + 1);
  }
  return counts;
}

function topFragileDow(counts: Map<number, number>): { label: string; count: number } | null {
  let bestDow = -1;
  let bestCount = 0;
  for (const [dow, count] of counts.entries()) {
    if (count > bestCount) {
      bestCount = count;
      bestDow = dow;
    }
  }
  // require at least 2 misses to call it a pattern
  if (bestCount < 2) return null;
  return { label: DOW_LABELS[bestDow], count: bestCount };
}

function countMissesByBucket(events: TaskEventRow[]): Map<TimeBucket, number> {
  const counts = new Map<TimeBucket, number>();
  for (const e of events) {
    if (!MISS_KINDS.has(e.kind)) continue;
    counts.set(e.time_bucket, (counts.get(e.time_bucket) ?? 0) + 1);
  }
  return counts;
}

function topFragileBucket(counts: Map<TimeBucket, number>): { label: TimeBucket; count: number } | null {
  let best: TimeBucket | null = null;
  let bestCount = 0;
  for (const [bucket, count] of counts.entries()) {
    if (count > bestCount) {
      bestCount = count;
      best = bucket;
    }
  }
  if (!best || bestCount < 2) return null;
  return { label: best, count: bestCount };
}
