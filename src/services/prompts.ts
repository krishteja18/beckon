// Voice agent prompt composer for Showup.
//
// Final system prompt = BASE + INTENSITY + CALL_TYPE + framework addon
//                       + temporal context + goals + recent events
//                       + optional calendar context
//
// Keep responses tight — this gets read aloud on a phone call, not parsed by a UI.

export type Intensity = 'gentle' | 'firm' | 'drill';
export type CallType = 'morning' | 'midday' | 'evening' | 'wall' | 'retro';

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
};

// ── Quick builder used by VoiceSession for on-device call initiation ─────────
// Composes a minimal but real prompt. The full composeSystemPrompt() is used
// when we have live DB context (goals, events, calendar). This is the fallback
// for the MVP while the DB context pipeline is being built.

export interface QuickPromptArgs {
  callType: CallType;
  intensity: Intensity;
  userName?: string;
  goalTitle?: string;
  framework?: 'atomic_habits' | 'ikigai' | 'deep_work';
  timezonedNow?: string;
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
  framework,
  timezonedNow,
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
  if (goalTitle) {
    sections.push(`This call is about the goal: "${goalTitle}". Lead with that context.`);
  }
  if (timezonedNow) {
    sections.push(`Current local time: ${timezonedNow}.`);
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
