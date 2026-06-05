/**
 * routines.ts — lightweight scheduled reminders independent of goals.
 * Atomic: one row = one time + days. Inherits framework + intensity from profile.
 */

import { supabase } from './supabase';
import { syncAlarms } from './alarmScheduler';

export interface Routine {
  id: string;
  user_id: string;
  title: string;
  scheduled_time: string;     // "HH:MM:SS" or "HH:MM"
  scheduled_days: number[];   // 0=Sun..6=Sat
  active: boolean;
  created_at: string;
}

function isBypass(): boolean {
  return typeof window !== 'undefined' && localStorage.getItem('bypass_auth') === 'true';
}

function readMock(): Routine[] {
  return JSON.parse(localStorage.getItem('mock_routines') || '[]');
}
function writeMock(rs: Routine[]): void {
  localStorage.setItem('mock_routines', JSON.stringify(rs));
}

export async function fetchRoutines(): Promise<Routine[]> {
  if (isBypass()) {
    return readMock().filter(r => r.active);
  }

  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .eq('active', true)
    .order('scheduled_time', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Routine[];
}

export async function createRoutine(
  title: string,
  time: string,
  days: number[],
): Promise<Routine> {
  if (isBypass()) {
    const all = readMock();
    const newR: Routine = {
      id: 'mock-routine-' + Math.random().toString(36).slice(2, 11),
      user_id: 'mock-user',
      title,
      scheduled_time: time,
      scheduled_days: days,
      active: true,
      created_at: new Date().toISOString(),
    };
    all.push(newR);
    writeMock(all);
    return newR;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('routines')
    .insert({
      user_id: user.id,
      title,
      scheduled_time: time,
      scheduled_days: days,
      active: true,
    })
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Failed to create routine');
  try { await syncAlarms(); } catch (e) { console.warn('[routines] syncAlarms', e); }
  return data as Routine;
}

export async function updateRoutine(
  id: string,
  patch: { title?: string; time?: string; days?: number[]; active?: boolean },
): Promise<void> {
  if (isBypass()) {
    const all = readMock();
    const updated = all.map(r => {
      if (r.id !== id) return r;
      return {
        ...r,
        ...(patch.title !== undefined && { title: patch.title }),
        ...(patch.time !== undefined && { scheduled_time: patch.time }),
        ...(patch.days !== undefined && { scheduled_days: patch.days }),
        ...(patch.active !== undefined && { active: patch.active }),
      };
    });
    writeMock(updated);
    return;
  }

  const dbPatch: Record<string, unknown> = {};
  if (patch.title !== undefined) dbPatch.title = patch.title;
  if (patch.time !== undefined) dbPatch.scheduled_time = patch.time;
  if (patch.days !== undefined) dbPatch.scheduled_days = patch.days;
  if (patch.active !== undefined) dbPatch.active = patch.active;

  const { error } = await supabase
    .from('routines')
    .update(dbPatch as any)
    .eq('id', id);
  if (error) throw error;
  try { await syncAlarms(); } catch (e) { console.warn('[routines] syncAlarms', e); }
}

export async function archiveRoutine(id: string): Promise<void> {
  if (isBypass()) {
    const all = readMock();
    writeMock(all.map(r => (r.id === id ? { ...r, active: false } : r)));
    return;
  }
  const { error } = await supabase
    .from('routines')
    .update({ active: false } as any)
    .eq('id', id);
  if (error) throw error;
  try { await syncAlarms(); } catch (e) { console.warn('[routines] syncAlarms', e); }
}

export async function deleteRoutine(id: string): Promise<void> {
  if (isBypass()) {
    const all = readMock();
    writeMock(all.filter(r => r.id !== id));
    return;
  }
  const { error } = await supabase.from('routines').delete().eq('id', id);
  if (error) throw error;
  try { await syncAlarms(); } catch (e) { console.warn('[routines] syncAlarms', e); }
}
