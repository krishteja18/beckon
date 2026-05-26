/**
 * goals.ts — Goal + schedule CRUD and timeline builder.
 * All reads are scoped by RLS (auth.uid()); no manual user_id filtering needed.
 */

import { supabase } from './supabase';
import { Database } from './database.types';
import { syncAlarms } from './alarmScheduler';

type Goal = Database['public']['Tables']['goals']['Row'];
type GoalInsert = Database['public']['Tables']['goals']['Insert'];
type GoalSchedule = Database['public']['Tables']['goal_schedules']['Row'];
type ScheduleInsert = Database['public']['Tables']['goal_schedules']['Insert'];

export interface GoalWithSchedules extends Goal {
  schedules: GoalSchedule[];
}

export interface TimelineSlot {
  goalId: string;
  goalTitle: string;
  framework: Goal['framework'];
  scheduleId: string;
  time: string;       // HH:MM local
  timeLabel: string;  // "6:00 AM"
  status: 'done' | 'active' | 'upcoming';
}

/** Fetch all active goals with their schedules. */
export async function fetchGoalsWithSchedules(): Promise<GoalWithSchedules[]> {
  const { data: goals, error } = await supabase
    .from('goals')
    .select('*, goal_schedules(*)')
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (goals ?? []).map((g: any) => ({
    ...g,
    schedules: g.goal_schedules ?? [],
  }));
}

/** Build today's timeline from active goals + their schedules. */
export async function fetchTodayTimeline(): Promise<TimelineSlot[]> {
  const goals = await fetchGoalsWithSchedules();
  const now = new Date();
  const todayDow = now.getDay(); // 0=Sun..6=Sat
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const slots: TimelineSlot[] = [];

  for (const goal of goals) {
    for (const sched of goal.schedules) {
      if (!sched.active) continue;
      if (!sched.scheduled_days.includes(todayDow)) continue;

      const [hh, mm] = (sched.scheduled_time as string).split(':').map(Number);
      const schedMinutes = hh * 60 + mm;
      const diff = schedMinutes - nowMinutes;

      let status: TimelineSlot['status'];
      if (diff < -30) status = 'done';
      else if (diff <= 30) status = 'active';
      else status = 'upcoming';

      const period = hh < 12 ? 'AM' : 'PM';
      const displayH = hh % 12 || 12;
      const displayM = mm.toString().padStart(2, '0');

      slots.push({
        goalId: goal.id,
        goalTitle: goal.title,
        framework: goal.framework,
        scheduleId: sched.id,
        time: `${hh.toString().padStart(2, '0')}:${displayM}`,
        timeLabel: `${displayH}:${displayM} ${period}`,
        status,
      });
    }
  }

  return slots.sort((a, b) => a.time.localeCompare(b.time));
}

/** Create a goal with optional initial schedules. */
export async function createGoal(
  title: string,
  framework: Goal['framework'],
  schedules: { time: string; days: number[] }[] = [],
): Promise<GoalWithSchedules> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: goal, error: gErr } = await supabase
    .from('goals')
    .insert({
      user_id: user.id,
      title,
      framework,
      status: 'active',
    } satisfies GoalInsert)
    .select()
    .single();

  if (gErr || !goal) throw gErr ?? new Error('Failed to create goal');

  const createdSchedules: GoalSchedule[] = [];

  for (const s of schedules) {
    const { data: sched, error: sErr } = await supabase
      .from('goal_schedules')
      .insert({
        goal_id: goal.id,
        user_id: user.id,
        scheduled_time: s.time,
        scheduled_days: s.days,
        active: true,
      } satisfies ScheduleInsert)
      .select()
      .single();

    if (sErr || !sched) throw sErr ?? new Error('Failed to create schedule');
    createdSchedules.push(sched);
  }

  try { await syncAlarms(); } catch (e) { console.warn('[goals] syncAlarms', e); }

  return { ...goal, schedules: createdSchedules };
}

/** Archive a goal (soft delete). Also re-syncs device alarms. */
export async function archiveGoal(goalId: string) {
  const { error } = await supabase
    .from('goals')
    .update({ status: 'archived' })
    .eq('id', goalId);
  if (error) throw error;
  try { await syncAlarms(); } catch (e) { console.warn('[goals] syncAlarms', e); }
}

/** Count active goals — enforces 10-goal cap on client side. */
export async function getActiveGoalCount(): Promise<number> {
  const { count, error } = await supabase
    .from('goals')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active');
  if (error) throw error;
  return count ?? 0;
}
