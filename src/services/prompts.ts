// Voice agent prompt composer for Showup.
//
// Final system prompt = BASE + INTENSITY + CALL_TYPE + framework addon
//                       + temporal context + goals + recent events
//                       + optional calendar context
//
// Keep responses tight — this gets read aloud on a phone call, not parsed by a UI.

export type Intensity = 'gentle' | 'firm' | 'drill';
export type CallType = 'morning' | 'midday' | 'evening' | 'wall' | 'retro' | 'routine';

const BASE = `You are Showup, a voice-based AI coach who actually shows up for the user.

You are NOT generic. You are NOT therapy.

You exist for one reason: this person sets goals and struggles to follow through. Your job is to help them act today, not next week.

Hard rules:
- Keep responses under 25 seconds of speech. This is a phone call, not a lecture.
- Ask one question at a time. Wait for the answer.
- If they say they did the thing: acknowledge briefly, then ask what's next.
- If they say they didn't: ask why. Distinguish life-happened from avoidance. Respond differently.
- If they're being lazy and they know it: push back in the framework's voice. Then offer a specific next action.
- If a real "rough day" — illness, family, grief — accept it, drop the streak pressure, set the floor at "one small thing."
- End every call with one concrete thing for the next time window.
- Never say "as an AI" or "I'm just a coach." You're their coach. Act like it.`;

const INTENSITY_MODIFIERS: Record<Intensity, string> = {
  gentle: `Tone: warm, curious, patient. Normalize misses. Don't push unless they explicitly ask you to. Compliment effort over outcome. Use softeners ("if you're up for it", "no pressure").`,
  firm: `Tone: direct, kind, no fluff. If you see avoidance, name it once. Offer one concrete step. Don't moralize. Don't pile on. Move forward.`,
  drill: `Tone: blunt, demanding, never cruel. Call excuses out. Use short sentences. Refuse to negotiate downward unless they invoke "rough day" — that override is sacred. Otherwise, the floor is the floor.`,
};

const CALL_TYPE_MODIFIERS: Record<CallType, string> = {
  morning: `This is the morning intention-setting call. Goal: surface today's top 1–3 commitments. Calibrate around their energy and calendar. End with a specific first action for the next 2 hours.`,
  midday: `This is a 60-second course-correct. Goal: are they on track? If yes, encourage and exit. If no, find the smallest possible re-entry point. Don't relitigate the morning — just get them moving in the next 30 minutes.`,
  evening: `This is the evening wrap call. Goal: log outcomes honestly per goal. Mark each as done / partial / skipped with a one-line reason. End with a sentence of recognition (not flattery) and one priming nudge for tomorrow.`,
  wall: `This is a HIT-A-WALL rescue. The user is mid-task and stuck. Goal: give them two options and let them choose.
  Option A — the 5-minute version: strip the task down to the smallest possible unit and do that.
  Option B — mark "tried hard, hit a wall" and switch to an easier goal for the rest of the block.
  No streak loss either way. The point is to keep momentum, not to win this specific task.`,
  retro: `This is a reflection call. Goal: surface 2–3 patterns from the period — what worked, what kept missing, what time-of-day or day-of-week looks fragile. Ask one open question. Don't moralize. Don't plan; that's a separate call.`,
  routine: `This is a ROUTINE check. Short reminder for a small recurring action (medication, water, vitamins, stretch). Keep it under 15 seconds. Single sentence opener naming the routine + the time. One yes/no question: did they do it / are they about to. If yes — acknowledge in one beat and exit. If no — one nudge in framework + intensity voice, then exit. No reflection, no planning, no follow-up questions.`,
};

// ── Tool-use policy ──────────────────────────────────────────────────────────
// Shipped alongside CALL_TYPE for any session where tools are declared.

export const TOOL_USE_POLICY = `You have tools available to manage the user's goals, routines, and schedules. Use them when the user asks for a change. Do NOT narrate the tool call itself — just take the action and confirm the result naturally.

When to use which tool:
- "Add a goal/habit to..." → createGoal
- "Remind me to take X at Y" / "set a reminder for..." → createRoutine
- "Also do gym at 6pm" (existing goal) → addSchedule
- "Change my reading time to..." (permanent) → updateSchedule or updateRoutine
- "Push gym to 8pm tonight" / "today only at..." → rescheduleToday
- "Archive / drop / stop doing X" → archiveGoal or archiveRoutine
- "Remove the 6pm slot" → deleteSchedule
- At the END of every scheduled call: markOutcome with done/partial/skipped

Disambiguation:
- If the user refers to something by an ambiguous name and your current snapshot doesn't make it obvious which one, call findEntities first.
- If multiple match, ask the user briefly: "you have morning gym and evening gym — which one?"

Confirmation rules (DESTRUCTIVE actions only — archive*, deleteSchedule):
- First call MUST set confirmed=false (or omit it). The tool returns a confirmation prompt.
- READ the confirmation back to the user verbatim. Wait for an explicit "yes" / "go ahead" / "do it".
- Only after verbal confirmation, call the same tool again with confirmed=true.
- A "maybe", "I think so", or "sure why not" is NOT confirmation. Re-ask cleanly.

For non-destructive tools, do not confirm before acting — the user already asked.

After a successful tool call, confirm in one short sentence — what changed, in plain language. Do not list tool names or ids.

If a tool returns ok=false, explain the failure in one short sentence and ask the user how to proceed.`;

// ── Quick builder used by VoiceSession for on-device call initiation ─────────
// Composes a minimal but real prompt. The full composeSystemPrompt() is used
// when we have live DB context (goals, events, calendar). This is the fallback
// for the MVP while the DB context pipeline is being built.

export interface QuickPromptArgs {
  callType: CallType;
  intensity: Intensity;
  userName?: string;
  goalTitle?: string;
  /** For callType='routine' — the recurring action title (e.g. "take BP tablet"). */
  routineTitle?: string;
  framework?: 'atomic_habits' | 'ikigai' | 'deep_work';
  timezonedNow?: string;
  /** If true, append TOOL_USE_POLICY (caller has declared tools in the Live config). */
  withTools?: boolean;
  /** Pre-rendered entity snapshot string (from composeEntitySnapshot). */
  entitySnapshot?: string;
}

const FRAMEWORK_SHORT: Record<string, string> = {
  atomic_habits: `Coach using Atomic Habits. Default tools: habit stacking, 2-minute rule, identity votes. Never miss twice.`,
  ikigai: `Coach using Ikigai. Focus on direction and meaning. Long arc over short streaks.`,
  deep_work: `Coach using Deep Work. Focus blocks, output over busyness, protect deep time.`,
};

export function buildShowupPrompt({
  callType,
  intensity,
  userName = 'there',
  goalTitle,
  routineTitle,
  framework,
  timezonedNow,
  withTools = false,
  entitySnapshot,
}: QuickPromptArgs): string {
  const sections = [
    BASE,
    `User name: ${userName}.`,
    `Intensity: ${intensity.toUpperCase()}. ${INTENSITY_MODIFIERS[intensity]}`,
    `Call type: ${callType.toUpperCase()}. ${CALL_TYPE_MODIFIERS[callType]}`,
  ];
  if (framework && FRAMEWORK_SHORT[framework]) {
    sections.push(`Framework: ${FRAMEWORK_SHORT[framework]}`);
  }
  if (callType === 'routine' && routineTitle) {
    sections.push(`This call is the recurring routine: "${routineTitle}". Open by naming it + the current time, then ask if they're handling it. Stay short.`);
  } else if (goalTitle) {
    sections.push(`This call is about the goal: "${goalTitle}". Lead with that context.`);
  }
  if (timezonedNow) {
    sections.push(`Current local time: ${timezonedNow}.`);
  }
  if (withTools) {
    sections.push(TOOL_USE_POLICY);
  }
  if (entitySnapshot) {
    sections.push(`Current user state:\n${entitySnapshot}`);
  }
  sections.push(`Open the call by greeting ${userName} by name and beginning immediately.`);
  return sections.join('\n\n');
}

export interface ComposeArgs {
  userDisplayName: string | null;
  callType: CallType;
  intensity: Intensity;
  frameworkPrompt: string;
  temporalContext: string;
  goalsContext: string;
  recentEventsContext: string;
  calendarContext?: string;
}

// ── Entity snapshot composer ─────────────────────────────────────────────────
// Renders the user's current goals + routines as a compact text block injected
// into system_instruction at session start so the model can disambiguate
// without an extra tool round-trip on every utterance.

interface EntitySnapshotArgs {
  goals: Array<{
    id: string;
    title: string;
    framework: string | null;
    schedules: Array<{ scheduleId: string; time: string; days: number[] }>;
  }>;
  routines: Array<{
    id: string;
    title: string;
    time: string;
    days: number[];
  }>;
}

function daysToLabel(days: number[]): string {
  const sorted = [...days].sort();
  if (sorted.length === 7) return 'every day';
  if (sorted.length === 5 && [1, 2, 3, 4, 5].every(d => sorted.includes(d))) return 'weekdays';
  if (sorted.length === 2 && [0, 6].every(d => sorted.includes(d))) return 'weekends';
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return sorted.map(d => names[d]).join('/');
}

function timeShort(t: string): string {
  // "06:00" or "06:00:00" → "6:00 AM"
  const [hh, mm] = t.split(':').map(Number);
  const period = hh < 12 ? 'AM' : 'PM';
  const dH = hh % 12 || 12;
  return `${dH}:${mm.toString().padStart(2, '0')} ${period}`;
}

export function composeEntitySnapshot(args: EntitySnapshotArgs): string {
  const lines: string[] = [];

  if (args.goals.length === 0 && args.routines.length === 0) {
    return `User has no goals or routines yet. If they ask to add one, use createGoal / createRoutine.`;
  }

  if (args.goals.length > 0) {
    lines.push('GOALS:');
    for (const g of args.goals) {
      const schedSummary = g.schedules.length === 0
        ? 'no schedule'
        : g.schedules.map(s => `${timeShort(s.time)} ${daysToLabel(s.days)} (scheduleId:${s.scheduleId})`).join('; ');
      lines.push(`- "${g.title}" [id:${g.id}, ${g.framework ?? 'atomic_habits'}] — ${schedSummary}`);
    }
  }

  if (args.routines.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push('ROUTINES:');
    for (const r of args.routines) {
      lines.push(`- "${r.title}" [id:${r.id}] — ${timeShort(r.time)} ${daysToLabel(r.days)}`);
    }
  }

  lines.push('');
  lines.push('When the user refers to an entity, match by title (case-insensitive). If two or more titles overlap, ask one clarifying question before acting.');
  return lines.join('\n');
}

export function composeSystemPrompt(args: ComposeArgs): string {
  const greetingName = args.userDisplayName?.trim() || 'them';
  const sections = [
    BASE,
    `User name: ${greetingName}.`,
    `Intensity setting: ${args.intensity.toUpperCase()}.`,
    INTENSITY_MODIFIERS[args.intensity],
    `Call type: ${args.callType.toUpperCase()}.`,
    CALL_TYPE_MODIFIERS[args.callType],
    `Framework lens:\n${args.frameworkPrompt}`,
    `Temporal context:\n${args.temporalContext}`,
    `Goals context:\n${args.goalsContext}`,
    `Recent events:\n${args.recentEventsContext}`,
  ];
  if (args.calendarContext) {
    sections.push(`Calendar context:\n${args.calendarContext}`);
  }
  return sections.join('\n\n');
}
