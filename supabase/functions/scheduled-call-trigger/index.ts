// scheduled-call-trigger
//
// Runs on a pg_cron schedule (every 5 min). For every (user, goal) tuple
// where:
//   - the goal has an active schedule for today's day-of-week
//   - the scheduled time matches the user's local now within window_minutes
//   - no check-in for this specific goal exists today
// sends an Expo push notification keyed to the goal. The user tapping the
// notification opens the app directly into the call screen, which auto-starts
// the Gemini Live session — no Start button.
//
// Auth: pg_cron passes the service-role key in the Authorization header.

import { createClient } from 'jsr:@supabase/supabase-js@2';

interface DueCall {
  user_id: string;
  goal_id: string;
  goal_title: string;
  goal_framework: 'atomic_habits' | 'ikigai' | 'deep_work';
  schedule_id: string;
  timezone: string;
  scheduled_time: string;
  intensity: 'gentle' | 'firm' | 'drill';
  local_hour: number;
}

interface ExpoPushMessage {
  to: string;
  sound?: 'default';
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority?: 'default' | 'normal' | 'high';
  // iOS — break through Focus modes for time-sensitive coach calls
  _interruptionLevel?: 'active' | 'critical' | 'passive' | 'time-sensitive';
  // Android — heads-up importance
  channelId?: string;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WINDOW_MINUTES = Number(Deno.env.get('CALL_WINDOW_MINUTES') ?? '5');

function callTypeForHour(hour: number): 'morning' | 'midday' | 'evening' | 'night' {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'midday';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function notificationCopy(goalTitle: string): { title: string; body: string } {
  // Keep it simple and warm. The goal title is the entire context the user
  // needs to know what the call is about.
  return {
    title: 'Showup',
    body: `Time for "${goalTitle}". Tap to talk.`,
  };
}

async function sendExpoPush(messages: ExpoPushMessage[]): Promise<{ ok: boolean; status: number; body: string }> {
  if (messages.length === 0) return { ok: true, status: 200, body: '[]' };
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    },
    body: JSON.stringify(messages),
  });
  return { ok: res.ok, status: res.status, body: await res.text() };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: due, error: dueErr } = await supabase.rpc('find_due_goal_calls', {
    window_minutes: WINDOW_MINUTES,
  });

  if (dueErr) {
    console.error('[scheduled-call-trigger] rpc error:', dueErr);
    return new Response(JSON.stringify({ error: dueErr.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const calls = (due ?? []) as DueCall[];
  if (calls.length === 0) {
    return new Response(JSON.stringify({ ok: true, dueCount: 0, sent: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userIds = [...new Set(calls.map((c) => c.user_id))];
  const { data: tokens, error: tokErr } = await supabase
    .from('push_tokens')
    .select('user_id, expo_token')
    .in('user_id', userIds);

  if (tokErr) {
    console.error('[scheduled-call-trigger] push_tokens error:', tokErr);
    return new Response(JSON.stringify({ error: tokErr.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const tokensByUser = new Map<string, string[]>();
  for (const t of tokens ?? []) {
    const arr = tokensByUser.get(t.user_id) ?? [];
    arr.push(t.expo_token);
    tokensByUser.set(t.user_id, arr);
  }

  const messages: ExpoPushMessage[] = [];
  for (const call of calls) {
    const userTokens = tokensByUser.get(call.user_id) ?? [];
    if (userTokens.length === 0) continue;
    const copy = notificationCopy(call.goal_title);
    for (const token of userTokens) {
      messages.push({
        to: token,
        sound: 'default',
        title: copy.title,
        body: copy.body,
        priority: 'high',
        _interruptionLevel: 'time-sensitive',
        channelId: 'showup-calls',
        data: {
          userId: call.user_id,
          goalId: call.goal_id,
          goalTitle: call.goal_title,
          framework: call.goal_framework,
          intensity: call.intensity,
          callType: callTypeForHour(call.local_hour),
          scheduledTime: call.scheduled_time,
        },
      });
    }
  }

  const pushResult = await sendExpoPush(messages);
  if (!pushResult.ok) {
    console.error('[scheduled-call-trigger] expo push failed:', pushResult.status, pushResult.body);
  }

  return new Response(
    JSON.stringify({
      ok: pushResult.ok,
      dueCount: calls.length,
      withTokens: messages.length,
      pushStatus: pushResult.status,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
