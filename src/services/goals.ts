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
  /** Slot origin: goal schedule, routine, or a daily anchor call. */
  kind: 'goal' | 'routine' | 'kickoff' | 'cooldown';
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
  const isBypass = typeof window !== 'undefined' && localStorage.getItem('bypass_auth') === 'true';
  if (isBypass) {
    const rawGoals = localStorage.getItem('mock_goals') || '[]';
    const rawSchedules = localStorage.getItem('mock_schedules') || '[]';
    const goals = JSON.parse(rawGoals);
    const schedules = JSON.parse(rawSchedules);
    return goals
      .filter((g: any) => g.status === 'active')
      .map((g: any) => ({
        ...g,
        schedules: schedules.filter((s: any) => s.goal_id === g.id),
      }));
  }

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
        kind: 'goal',
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
  schedulesInput: { time: string; days: number[] }[] = [],
): Promise<GoalWithSchedules> {
  const isBypass = typeof window !== 'undefined' && localStorage.getItem('bypass_auth') === 'true';
  if (isBypass) {
    const rawGoals = localStorage.getItem('mock_goals') || '[]';
    const rawSchedules = localStorage.getItem('mock_schedules') || '[]';
    const goals = JSON.parse(rawGoals);
    const schedules = JSON.parse(rawSchedules);

    const newGoal = {
      id: 'mock-goal-' + Math.random().toString(36).substr(2, 9),
      user_id: 'mock-user',
      title,
      framework,
      status: 'active' as const,
      created_at: new Date().toISOString(),
    };
    goals.push(newGoal);

    const createdSchedules: any[] = [];
    for (const s of schedulesInput) {
      const newSched = {
         id: 'mock-sched-' + Math.random().toString(36).substr(2, 9),
         goal_id: newGoal.id,
         user_id: 'mock-user',
         scheduled_time: s.time,
         scheduled_days: s.days,
         active: true,
      };
      schedules.push(newSched);
      createdSchedules.push(newSched);
    }

    localStorage.setItem('mock_goals', JSON.stringify(goals));
    localStorage.setItem('mock_schedules', JSON.stringify(schedules));

    return { ...newGoal, schedules: createdSchedules } as unknown as GoalWithSchedules;
  }

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

  for (const s of schedulesInput) {
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
  const isBypass = typeof window !== 'undefined' && localStorage.getItem('bypass_auth') === 'true';
  if (isBypass) {
    const rawGoals = localStorage.getItem('mock_goals') || '[]';
    const goals = JSON.parse(rawGoals);
    const updatedGoals = goals.map((g: any) => {
      if (g.id === goalId) {
        return { ...g, status: 'archived' };
      }
      return g;
    });
    localStorage.setItem('mock_goals', JSON.stringify(updatedGoals));
    return;
  }

  const { error } = await supabase
    .from('goals')
    .update({ status: 'archived' })
    .eq('id', goalId);
  if (error) throw error;
  try { await syncAlarms(); } catch (e) { console.warn('[goals] syncAlarms', e); }
}

/** Update an existing schedule row (time / days / active). */
export async function updateSchedule(
  scheduleId: string,
  patch: { time?: string; days?: number[]; active?: boolean },
): Promise<void> {
  const isBypass = typeof window !== 'undefined' && localStorage.getItem('bypass_auth') === 'true';
  if (isBypass) {
    const raw = localStorage.getItem('mock_schedules') || '[]';
    const schedules = JSON.parse(raw);
    const updated = schedules.map((s: any) => {
      if (s.id !== scheduleId) return s;
      return {
        ...s,
        ...(patch.time !== undefined && { scheduled_time: patch.time }),
        ...(patch.days !== undefined && { scheduled_days: patch.days }),
        ...(patch.active !== undefined && { active: patch.active }),
      };
    });
    localStorage.setItem('mock_schedules', JSON.stringify(updated));
    return;
  }

  type SchedUpdate = Database['public']['Tables']['goal_schedules']['Update'];
  const dbPatch: SchedUpdate = {};
  if (patch.time !== undefined) dbPatch.scheduled_time = patch.time;
  if (patch.days !== undefined) dbPatch.scheduled_days = patch.days;
  if (patch.active !== undefined) dbPatch.active = patch.active;

  const { error } = await supabase
    .from('goal_schedules')
    .update(dbPatch)
    .eq('id', scheduleId);
  if (error) throw error;
  try { await syncAlarms(); } catch (e) { console.warn('[goals] syncAlarms', e); }
}

/** Add a new schedule row to a goal. */
export async function addSchedule(
  goalId: string,
  time: string,
  days: number[],
): Promise<GoalSchedule> {
  const isBypass = typeof window !== 'undefined' && localStorage.getItem('bypass_auth') === 'true';
  if (isBypass) {
    const raw = localStorage.getItem('mock_schedules') || '[]';
    const schedules = JSON.parse(raw);
    const newSched = {
      id: 'mock-sched-' + Math.random().toString(36).substr(2, 9),
      goal_id: goalId,
      user_id: 'mock-user',
      scheduled_time: time,
      scheduled_days: days,
      active: true,
    };
    schedules.push(newSched);
    localStorage.setItem('mock_schedules', JSON.stringify(schedules));
    return newSched as unknown as GoalSchedule;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('goal_schedules')
    .insert({
      goal_id: goalId,
      user_id: user.id,
      scheduled_time: time,
      scheduled_days: days,
      active: true,
    } satisfies ScheduleInsert)
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Failed to add schedule');
  try { await syncAlarms(); } catch (e) { console.warn('[goals] syncAlarms', e); }
  return data;
}

/** Delete a schedule row. */
export async function deleteSchedule(scheduleId: string): Promise<void> {
  const isBypass = typeof window !== 'undefined' && localStorage.getItem('bypass_auth') === 'true';
  if (isBypass) {
    const raw = localStorage.getItem('mock_schedules') || '[]';
    const schedules = JSON.parse(raw);
    localStorage.setItem(
      'mock_schedules',
      JSON.stringify(schedules.filter((s: any) => s.id !== scheduleId)),
    );
    return;
  }

  const { error } = await supabase
    .from('goal_schedules')
    .delete()
    .eq('id', scheduleId);
  if (error) throw error;
  try { await syncAlarms(); } catch (e) { console.warn('[goals] syncAlarms', e); }
}

/** Count active goals — enforces 10-goal cap on client side. */
export async function getActiveGoalCount(): Promise<number> {
  const isBypass = typeof window !== 'undefined' && localStorage.getItem('bypass_auth') === 'true';
  if (isBypass) {
    const rawGoals = localStorage.getItem('mock_goals') || '[]';
    const goals = JSON.parse(rawGoals);
    return goals.filter((g: any) => g.status === 'active').length;
  }

  const { count, error } = await supabase
    .from('goals')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active');
  if (error) throw error;
  return count ?? 0;
}
