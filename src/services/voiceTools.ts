/**
 * voiceTools.ts — Gemini Live tool declarations + client-side dispatch.
 *
 * The model receives the declarations at session start (in LiveConnectConfig.tools)
 * and emits FunctionCall events mid-stream. We map each name to a service function,
 * execute, and reply with a FunctionResponse.
 *
 * Destructive tools (archive*, deleteSchedule) require a 2-phase confirmation:
 *   1st call: { confirmed: false }  → returns { requires: 'confirmation', message }
 *   2nd call: { confirmed: true }   → executes
 *
 * Confirmation is enforced HERE, not in the prompt. The model can be coaxed to
 * skip readback by users; the handler is the source of truth.
 */

import { createGoal, archiveGoal, addSchedule, updateSchedule, deleteSchedule, fetchGoalsWithSchedules } from './goals';
import { createRoutine, updateRoutine, archiveRoutine, fetchRoutines } from './routines';
import { rescheduleGoalToday } from './scheduleOverrides';
import { Database } from './database.types';

type Framework = Database['public']['Enums']['framework_key'];

// ── Gemini function declaration types ────────────────────────────────────────

interface FnDecl {
  name: string;
  description: string;
  parameters: {
    type: 'OBJECT';
    properties: Record<string, FnParam>;
    required?: string[];
  };
}

interface FnParam {
  type: 'STRING' | 'NUMBER' | 'INTEGER' | 'BOOLEAN' | 'ARRAY' | 'OBJECT';
  description: string;
  enum?: string[];
  items?: FnParam | { type: string };
  properties?: Record<string, FnParam>;
  required?: string[];
}

// ── Tool declarations (sent to Gemini) ───────────────────────────────────────

const DAYS_PARAM: FnParam = {
  type: 'ARRAY',
  description: 'Days of the week. 0=Sunday, 1=Monday, ..., 6=Saturday. Use [0,1,2,3,4,5,6] for "every day", [1,2,3,4,5] for "weekdays", [0,6] for "weekends".',
  items: { type: 'INTEGER' },
};

const TIME_PARAM: FnParam = {
  type: 'STRING',
  description: '24-hour time in HH:MM format. Examples: "06:00", "17:30", "21:00".',
};

export const VOICE_TOOL_DECLARATIONS: FnDecl[] = [
  // ── CREATE ─────────────────────────────────────────────────────────────────
  {
    name: 'createGoal',
    description: 'Create a new goal the user wants to build. Optionally include one or more schedule slots. Use this for meaningful habits the user wants the coach to drive (e.g. "go to the gym", "read 30 min", "meditate"). For simple reminders use createRoutine instead.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING', description: 'Short goal title, e.g. "Morning gym" or "Read 30 minutes".' },
        framework: { type: 'STRING', description: 'Coaching framework. Defaults to user\'s profile default if omitted.', enum: ['atomic_habits', 'ikigai', 'deep_work'] },
        schedules: {
          type: 'ARRAY',
          description: 'Optional initial schedule slots. Give a slot a `name` when the goal has multiple distinct moments (e.g. goal "Nutrition & Diet" with slots named "Breakfast", "Lunch", "Snack"). Leave name empty for single-purpose goals like "Gym".',
          items: {
            type: 'OBJECT',
            properties: {
              name: { type: 'STRING', description: 'Optional short label for THIS time slot, e.g. "Lunch". Omit for simple goals.' },
              time: TIME_PARAM,
              days: DAYS_PARAM,
            },
            required: ['time', 'days'],
          },
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'createRoutine',
    description: 'Create a lightweight recurring reminder (medication, vitamins, water, stretch). Atomic — one routine = one time + days. For morning + evening, create two routines. The coach rings briefly at this time and asks if it was handled.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING', description: 'Short title, e.g. "Take BP tablet" or "Drink water".' },
        time: TIME_PARAM,
        days: DAYS_PARAM,
      },
      required: ['title', 'time', 'days'],
    },
  },
  {
    name: 'addSchedule',
    description: 'Add an additional time slot to an existing goal. Use when user says "also at 6pm" for a goal that already exists. Pass `name` when the new slot represents a distinct moment under the goal (e.g. "Dinner" under "Nutrition & Diet").',
    parameters: {
      type: 'OBJECT',
      properties: {
        goalId: { type: 'STRING', description: 'The goal id (use findEntities first if unsure).' },
        name: { type: 'STRING', description: 'Optional short label for this time slot, e.g. "Dinner".' },
        time: TIME_PARAM,
        days: DAYS_PARAM,
      },
      required: ['goalId', 'time', 'days'],
    },
  },

  // ── UPDATE ─────────────────────────────────────────────────────────────────
  {
    name: 'updateSchedule',
    description: 'Permanently change the name, time, or days of an existing goal schedule (modifies goal_schedules). For a one-day "push it to 8pm today" use rescheduleToday instead.',
    parameters: {
      type: 'OBJECT',
      properties: {
        scheduleId: { type: 'STRING', description: 'The schedule_id (use findEntities to look up).' },
        name: { type: 'STRING', description: 'Optional new label for this slot, e.g. "Lunch". Pass an empty string to clear it.' },
        time: { type: 'STRING', description: 'Optional new time in HH:MM.' },
        days: DAYS_PARAM,
      },
      required: ['scheduleId'],
    },
  },
  {
    name: 'updateRoutine',
    description: 'Update a routine\'s title, time, or days.',
    parameters: {
      type: 'OBJECT',
      properties: {
        routineId: { type: 'STRING', description: 'The routine id.' },
        title: { type: 'STRING', description: 'Optional new title.' },
        time: { type: 'STRING', description: 'Optional new time in HH:MM.' },
        days: DAYS_PARAM,
      },
      required: ['routineId'],
    },
  },
  {
    name: 'rescheduleToday',
    description: 'One-day override only — push today\'s scheduled time for a goal to a different time. Tomorrow resumes normal schedule. Use for "let\'s do gym at 8pm tonight instead".',
    parameters: {
      type: 'OBJECT',
      properties: {
        goalId: { type: 'STRING', description: 'The goal id.' },
        originalTime: { type: 'STRING', description: 'Today\'s originally scheduled time in HH:MM.' },
        newTime: { type: 'STRING', description: 'New time for today in HH:MM.' },
        reason: { type: 'STRING', description: 'Optional brief reason ("conflict with work").' },
      },
      required: ['goalId', 'originalTime', 'newTime'],
    },
  },

  // ── OUTCOMES ───────────────────────────────────────────────────────────────
  {
    name: 'markOutcome',
    description: 'Log the outcome of a goal or routine for today. CALL THIS AT THE END OF EVERY SCHEDULED CALL once you know whether the user did/skipped/partially did the thing. status: "done" = completed, "partial" = some progress, "skipped" = not done today.',
    parameters: {
      type: 'OBJECT',
      properties: {
        entityKind: { type: 'STRING', description: 'Which entity type.', enum: ['goal', 'routine'] },
        entityId: { type: 'STRING', description: 'The goal id or routine id.' },
        status: { type: 'STRING', description: 'Outcome.', enum: ['done', 'partial', 'skipped'] },
        note: { type: 'STRING', description: 'Optional one-line context the user gave for the outcome.' },
      },
      required: ['entityKind', 'entityId', 'status'],
    },
  },

  // ── DISAMBIGUATION ─────────────────────────────────────────────────────────
  {
    name: 'findEntities',
    description: 'Look up the user\'s current goals and routines by a fuzzy query string. Use when the user refers to something by an ambiguous name ("my gym thing") and you need the exact id. Returns matching goals + routines with their ids and titles.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Title fragment to match, case-insensitive. Empty string returns all.' },
      },
      required: ['query'],
    },
  },

  // ── DESTRUCTIVE (2-phase) ──────────────────────────────────────────────────
  {
    name: 'archiveGoal',
    description: 'Archive a goal (soft delete — alarms stop, history kept). DESTRUCTIVE. First call MUST be with confirmed=false to get a confirmation prompt. Read the message back to the user, wait for an explicit yes, then call again with confirmed=true.',
    parameters: {
      type: 'OBJECT',
      properties: {
        goalId: { type: 'STRING', description: 'The goal id.' },
        confirmed: { type: 'BOOLEAN', description: 'Set true ONLY after the user has verbally confirmed. Default false.' },
      },
      required: ['goalId'],
    },
  },
  {
    name: 'archiveRoutine',
    description: 'Archive a routine (alarms stop). DESTRUCTIVE. Same 2-phase pattern as archiveGoal.',
    parameters: {
      type: 'OBJECT',
      properties: {
        routineId: { type: 'STRING', description: 'The routine id.' },
        confirmed: { type: 'BOOLEAN', description: 'Set true ONLY after verbal confirmation.' },
      },
      required: ['routineId'],
    },
  },
  {
    name: 'deleteSchedule',
    description: 'Remove one time slot from a goal (does not delete the goal itself). DESTRUCTIVE. Same 2-phase pattern.',
    parameters: {
      type: 'OBJECT',
      properties: {
        scheduleId: { type: 'STRING', description: 'The schedule id to delete.' },
        confirmed: { type: 'BOOLEAN', description: 'Set true ONLY after verbal confirmation.' },
      },
      required: ['scheduleId'],
    },
  },
];

// ── Dispatch results ─────────────────────────────────────────────────────────

export interface ToolResult {
  ok: boolean;
  /** Short string the model speaks/summarizes to the user. */
  message?: string;
  /** Set when 2-phase confirmation needed. */
  requires?: 'confirmation';
  /** Echo of created/updated entity id, for follow-ups. */
  entityId?: string;
  /** Optional structured data the model can reference. */
  data?: unknown;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeTime(t: string): string {
  // Accept "6:00", "06:00", "06:00:00" — return HH:MM (no seconds)
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) throw new Error(`Invalid time format: ${t}`);
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

function normalizeDays(days: number[] | undefined): number[] | undefined {
  if (!days) return undefined;
  const valid = days.filter(d => Number.isInteger(d) && d >= 0 && d <= 6);
  if (valid.length === 0) throw new Error('Days must include at least one of 0..6');
  return Array.from(new Set(valid)).sort();
}

// ── Dispatcher ───────────────────────────────────────────────────────────────

export async function dispatchToolCall(
  name: string,
  args: Record<string, any>,
): Promise<ToolResult> {
  try {
    switch (name) {
      case 'createGoal': {
        const title = String(args.title ?? '').trim();
        if (!title) return { ok: false, message: 'Title is required.' };
        const framework = (args.framework as Framework | undefined) ?? 'atomic_habits';
        const schedules = Array.isArray(args.schedules) ? args.schedules.map((s: any) => ({
          time: normalizeTime(String(s.time)),
          days: normalizeDays(s.days) ?? [0, 1, 2, 3, 4, 5, 6],
          name: s.name ? String(s.name).trim() : null,
        })) : [];
        const goal = await createGoal(title, framework, schedules);
        return { ok: true, message: `Goal "${title}" created.`, entityId: goal.id };
      }

      case 'createRoutine': {
        const title = String(args.title ?? '').trim();
        if (!title) return { ok: false, message: 'Title is required.' };
        const time = normalizeTime(String(args.time));
        const days = normalizeDays(args.days) ?? [0, 1, 2, 3, 4, 5, 6];
        const r = await createRoutine(title, time, days);
        return { ok: true, message: `Routine "${title}" set for ${time}.`, entityId: r.id };
      }

      case 'addSchedule': {
        const goalId = String(args.goalId ?? '');
        if (!goalId) return { ok: false, message: 'goalId is required.' };
        const time = normalizeTime(String(args.time));
        const days = normalizeDays(args.days) ?? [0, 1, 2, 3, 4, 5, 6];
        const name = args.name ? String(args.name).trim() : null;
        const sched = await addSchedule(goalId, time, days, name);
        return { ok: true, message: `Added ${name ? `"${name}" at ` : ''}${time} to the schedule.`, entityId: sched.id };
      }

      case 'updateSchedule': {
        const scheduleId = String(args.scheduleId ?? '');
        if (!scheduleId) return { ok: false, message: 'scheduleId is required.' };
        const patch: { time?: string; days?: number[]; label?: string | null } = {};
        if (args.time) patch.time = normalizeTime(String(args.time));
        if (args.days) patch.days = normalizeDays(args.days);
        if (args.name !== undefined) patch.label = String(args.name).trim() || null;
        await updateSchedule(scheduleId, patch);
        return { ok: true, message: 'Schedule updated.' };
      }

      case 'updateRoutine': {
        const routineId = String(args.routineId ?? '');
        if (!routineId) return { ok: false, message: 'routineId is required.' };
        const patch: { title?: string; time?: string; days?: number[] } = {};
        if (args.title) patch.title = String(args.title).trim();
        if (args.time) patch.time = normalizeTime(String(args.time));
        if (args.days) patch.days = normalizeDays(args.days);
        await updateRoutine(routineId, patch);
        return { ok: true, message: 'Routine updated.' };
      }

      case 'rescheduleToday': {
        const goalId = String(args.goalId ?? '');
        const originalTime = normalizeTime(String(args.originalTime));
        const newTime = normalizeTime(String(args.newTime));
        if (!goalId) return { ok: false, message: 'goalId is required.' };
        await rescheduleGoalToday(goalId, originalTime, newTime, args.reason);
        return { ok: true, message: `Moved today's call to ${newTime}. Normal schedule resumes tomorrow.` };
      }

      case 'markOutcome': {
        // Outcome capture — writes to check_ins via existing record-check-in flow.
        // For MVP we just acknowledge; full check_in row write happens in the call
        // termination hook (useVoiceSession onClose), this tool primarily lets the
        // model signal status so the hook can include it.
        const kind = String(args.entityKind);
        const id = String(args.entityId);
        const status = String(args.status);
        // Stash the outcome on the session for the close hook to consume.
        pendingOutcomes.push({ kind, id, status, note: args.note });
        return { ok: true, message: `Logged: ${status}.` };
      }

      case 'findEntities': {
        const q = String(args.query ?? '').trim().toLowerCase();
        const [goals, routines] = await Promise.all([fetchGoalsWithSchedules(), fetchRoutines()]);
        const matchGoals = goals
          .filter(g => !q || g.title.toLowerCase().includes(q))
          .map(g => ({
            kind: 'goal',
            id: g.id,
            title: g.title,
            framework: g.framework,
            schedules: g.schedules.filter(s => s.active).map(s => ({
              scheduleId: s.id,
              name: s.label ?? null,
              time: s.scheduled_time,
              days: s.scheduled_days,
            })),
          }));
        const matchRoutines = routines
          .filter(r => !q || r.title.toLowerCase().includes(q))
          .map(r => ({
            kind: 'routine',
            id: r.id,
            title: r.title,
            time: r.scheduled_time,
            days: r.scheduled_days,
          }));
        return {
          ok: true,
          message: `Found ${matchGoals.length} goal(s), ${matchRoutines.length} routine(s).`,
          data: { goals: matchGoals, routines: matchRoutines },
        };
      }

      case 'archiveGoal': {
        const goalId = String(args.goalId ?? '');
        if (!goalId) return { ok: false, message: 'goalId is required.' };
        if (!args.confirmed) {
          const goals = await fetchGoalsWithSchedules();
          const g = goals.find(x => x.id === goalId);
          const title = g?.title ?? 'this goal';
          return {
            ok: false,
            requires: 'confirmation',
            message: `Confirm: archive "${title}"? Alarms will stop and history is kept. Say yes to proceed.`,
          };
        }
        await archiveGoal(goalId);
        return { ok: true, message: 'Goal archived.' };
      }

      case 'archiveRoutine': {
        const routineId = String(args.routineId ?? '');
        if (!routineId) return { ok: false, message: 'routineId is required.' };
        if (!args.confirmed) {
          const routines = await fetchRoutines();
          const r = routines.find(x => x.id === routineId);
          const title = r?.title ?? 'this routine';
          return {
            ok: false,
            requires: 'confirmation',
            message: `Confirm: archive "${title}"? It will stop ringing. Say yes to proceed.`,
          };
        }
        await archiveRoutine(routineId);
        return { ok: true, message: 'Routine archived.' };
      }

      case 'deleteSchedule': {
        const scheduleId = String(args.scheduleId ?? '');
        if (!scheduleId) return { ok: false, message: 'scheduleId is required.' };
        if (!args.confirmed) {
          return {
            ok: false,
            requires: 'confirmation',
            message: `Confirm: remove this time slot? Say yes to proceed.`,
          };
        }
        await deleteSchedule(scheduleId);
        return { ok: true, message: 'Time slot removed.' };
      }

      default:
        return { ok: false, message: `Unknown tool: ${name}` };
    }
  } catch (e: any) {
    return { ok: false, message: e?.message ?? String(e) };
  }
}

// ── Pending outcomes (drained by useVoiceSession onClose) ────────────────────

interface PendingOutcome {
  kind: string;
  id: string;
  status: string;
  note?: string;
}

const pendingOutcomes: PendingOutcome[] = [];

export function drainPendingOutcomes(): PendingOutcome[] {
  const out = pendingOutcomes.splice(0, pendingOutcomes.length);
  return out;
}
