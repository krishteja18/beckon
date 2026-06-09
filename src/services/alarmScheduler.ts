/**
 * alarmScheduler.ts — bridge between Supabase goal_schedules and the native
 * ShowupAlarm module.
 *
 * Responsibilities:
 *   1. Compute the next fire time for each (goal, schedule) tuple in user-local TZ
 *   2. Compose the prompt blueprint (BASE+INTENSITY+CALL_TYPE+framework+goal context)
 *   3. Call ShowupAlarm.scheduleAlarm() to arm the OS-level alarm
 *   4. Re-arm on app foreground (idempotent — native side dedupes by alarmId)
 *   5. Cancel when goal/schedule is archived or deleted
 *
 * iOS path: ShowupAlarm is Android-only. iOS uses server-side pg_cron →
 * APNs VoIP push → CallKit. This module is a no-op on iOS.
 */

import { Platform } from 'react-native';
import { fetchGoalsWithSchedules } from './goals';
import { fetchRoutines } from './routines';
import { fetchProfile } from './profile';
import { buildShowupPrompt, CallType, Intensity } from './prompts';
import type { Database } from './database.types';

type Framework = Database['public']['Enums']['framework_key'];

// Lazy import so iOS / web don't crash on missing native module
let ShowupAlarm: typeof import('../../modules/showup-alarm/src').ShowupAlarm | null = null;
if (Platform.OS === 'android') {
  try {
    ShowupAlarm = require('../../modules/showup-alarm/src').ShowupAlarm;
  } catch {
    ShowupAlarm = null; // native module not linked yet — safe fallback
  }
}

export const ANDROID_ONLY = Platform.OS === 'android';

function callTypeForHour(h: number): CallType {
  if (h >= 5 && h < 11)  return 'morning';
  if (h >= 11 && h < 17) return 'midday';
  if (h >= 17 && h < 21) return 'evening';
  return 'evening';
}

/** Compute the next epoch-ms when (hh:mm, scheduled_days[]) fires. */
function nextFireMs(scheduledTime: string, scheduledDays: number[]): number {
  const [hh, mm] = scheduledTime.split(':').map(Number);
  const now = new Date();
  // Try today first, then 1..7 days out
  for (let i = 0; i < 8; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    d.setHours(hh, mm, 0, 0);
    if (d.getTime() < now.getTime()) continue;
    if (scheduledDays.includes(d.getDay())) return d.getTime();
  }
  // Fallback: a week from now (shouldn't happen with non-empty days)
  return now.getTime() + 7 * 24 * 60 * 60 * 1000;
}

/** Epoch-ms for a one-off reminder on a specific date, or null if it's in the past. */
function oneOffFireMs(remindDate: string, scheduledTime: string): number | null {
  const [y, mo, da] = remindDate.slice(0, 10).split('-').map(Number);
  const [hh, mm] = scheduledTime.split(':').map(Number);
  const d = new Date(y, (mo || 1) - 1, da || 1, hh || 0, mm || 0, 0, 0);
  return d.getTime() < Date.now() ? null : d.getTime();
}

/**
 * Sync all alarms. Idempotent — call on:
 *   - App foreground
 *   - Goal added / archived
 *   - Schedule changed
 *   - Profile intensity / framework changed (affects prompt blueprint)
 */
export async function syncAlarms(): Promise<void> {
  if (!ShowupAlarm) return;

  const [goals, routines, profile] = await Promise.all([
    fetchGoalsWithSchedules(),
    fetchRoutines(),
    fetchProfile(),
  ]);
  if (!profile) return;

  const intensity = (profile.intensity ?? 'firm') as Intensity;
  const userName  = profile.display_name ?? 'there';
  const defaultFramework = (profile.default_framework as Framework | null) ?? undefined;

  const goalAlarms = goals.flatMap(goal =>
    goal.schedules.filter(s => s.active).map(s => {
      const fireAtMs = nextFireMs(s.scheduled_time as string, s.scheduled_days);
      const hour = new Date(fireAtMs).getHours();
      const callType = callTypeForHour(hour);
      return {
        alarmId: s.id,
        fireAtMs,
        goalId: goal.id,
        goalTitle: goal.title,
        callType,
        promptBlueprint: buildShowupPrompt({
          callType,
          intensity,
          userName,
          goalTitle: goal.title,
          framework: (goal.framework as Framework | null) ?? undefined,
        }),
      };
    })
  );

  // Routines: short reminder calls. Use profile's default framework + intensity.
  // One-off reminders (remind_date set) fire once on that date; past ones are skipped.
  const routineAlarms = routines
    .filter(r => r.active)
    .map(r => {
      const fireAtMs = r.remind_date
        ? oneOffFireMs(r.remind_date, r.scheduled_time)
        : nextFireMs(r.scheduled_time, r.scheduled_days);
      if (fireAtMs == null) return null;
      const title = r.description?.trim() ? `${r.title} — ${r.description.trim()}` : r.title;
      return {
        alarmId: r.id,
        fireAtMs,
        goalId: r.id,            // reuse field — native side just stores it
        goalTitle: r.title,
        callType: 'routine' as CallType,
        promptBlueprint: buildShowupPrompt({
          callType: 'routine',
          intensity,
          userName,
          routineTitle: title,
          framework: defaultFramework,
        }),
      };
    })
    .filter((a): a is NonNullable<typeof a> => a !== null);

  // Cancel everything first, then schedule fresh. Native module dedupes by id.
  await ShowupAlarm.cancelAllAlarms();
  await ShowupAlarm.rearmAllAlarms([...goalAlarms, ...routineAlarms]);
}

/** Cancel a single alarm by schedule_id (used when archiving a goal). */
export async function cancelAlarm(scheduleId: string): Promise<void> {
  if (!ShowupAlarm) return;
  await ShowupAlarm.cancelAlarm(scheduleId);
}

/** Cancel everything (used on sign-out or rough-day). */
export async function cancelAllAlarms(): Promise<void> {
  if (!ShowupAlarm) return;
  await ShowupAlarm.cancelAllAlarms();
}

/** OEM autostart deep-link (Xiaomi/Samsung/etc.). Returns true if a settings
 *  page opened. */
export async function openOemAutostartSettings(): Promise<boolean> {
  if (!ShowupAlarm) return false;
  return ShowupAlarm.openOemAutostartSettings();
}

/** Build.MANUFACTURER for OEM-specific onboarding copy. */
export function deviceManufacturer(): string {
  return ShowupAlarm?.manufacturer ?? 'unknown';
}

/** Whether USE_EXACT_ALARM permission is granted. */
export async function canScheduleExactAlarms(): Promise<boolean> {
  if (!ShowupAlarm) return true; // non-Android: always "ok"
  return ShowupAlarm.canScheduleExactAlarms();
}
