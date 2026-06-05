import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as jose from 'https://deno.land/x/jose@v4.14.4/index.ts';

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

interface ApnsVoipPayload {
  aps: {
    alert: {
      alarmId: string;
      goalId: string;
      goalTitle: string;
      callType: string;
      promptBlueprint: string;
    };
  };
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WINDOW_MINUTES = Number(Deno.env.get('CALL_WINDOW_MINUTES') ?? '5');

// APNs credentials
const APNS_PRIVATE_KEY_PEM = Deno.env.get('APNS_PRIVATE_KEY_PEM');
const APNS_KEY_ID = Deno.env.get('APNS_KEY_ID');
const APNS_TEAM_ID = Deno.env.get('APNS_TEAM_ID');
const APNS_BUNDLE_ID = Deno.env.get('APNS_BUNDLE_ID') ?? 'ai.showup.app';
const APNS_USE_SANDBOX = Deno.env.get('APNS_USE_SANDBOX') !== 'false';

function callTypeForHour(hour: number): 'morning' | 'midday' | 'evening' | 'night' {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'midday';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

async function createApnsJwt(pem: string, kid: string, iss: string): Promise<string> {
  const privateKey = await jose.importPKCS8(pem, 'ES256');
  return await new jose.SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid })
    .setIssuer(iss)
    .setIssuedAt()
    .sign(privateKey);
}

async function sendApnsVoipPush(
  token: string,
  jwt: string,
  payload: ApnsVoipPayload
): Promise<{ ok: boolean; status: number; body: string }> {
  const domain = APNS_USE_SANDBOX ? 'api.sandbox.push.apple.com' : 'api.push.apple.com';
  const url = `https://${domain}/3/device/${token}`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'authorization': `bearer ${jwt}`,
      'apns-push-type': 'voip',
      'apns-topic': `${APNS_BUNDLE_ID}.voip`,
      'apns-expiration': '0',
      'apns-priority': '10',
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return {
    ok: res.ok,
    status: res.status,
    body: await res.text(),
  };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Query the database for active goals matching current user-local minutes
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

  // 2. Fetch iOS PushKit VoIP tokens from the `voip_tokens` table (or fallback push_tokens)
  const userIds = [...new Set(calls.map((c) => c.user_id))];
  const { data: voipTokens, error: tokErr } = await supabase
    .from('push_tokens') // We can store VoIP PushKit tokens in a specific table or column
    .select('user_id, expo_token, is_voip')
    .in('user_id', userIds);

  if (tokErr) {
    console.error('[scheduled-call-trigger] push_tokens fetch error:', tokErr);
    return new Response(JSON.stringify({ error: tokErr.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Group tokens by user and filter VoIP tokens vs regular notification tokens
  const voipTokensByUser = new Map<string, string[]>();
  for (const t of voipTokens ?? []) {
    // If the token matches PushKit formats (no "ExponentPushToken") or marked as VoIP
    const isVoip = t.is_voip === true || (!t.expo_token.includes('ExponentPushToken') && t.expo_token.length === 64);
    if (isVoip) {
      const arr = voipTokensByUser.get(t.user_id) ?? [];
      arr.push(t.expo_token);
      voipTokensByUser.set(t.user_id, arr);
    }
  }

  // 3. Generate APNs JWT if keys are active
  let apnsJwt: string | null = null;
  const hasApnsConfig = !!(APNS_PRIVATE_KEY_PEM && APNS_KEY_ID && APNS_TEAM_ID);
  if (hasApnsConfig) {
    try {
      apnsJwt = await createApnsJwt(APNS_PRIVATE_KEY_PEM!, APNS_KEY_ID!, APNS_TEAM_ID!);
      console.log('[scheduled-call-trigger] APNs JWT successfully signed.');
    } catch (e) {
      console.error('[scheduled-call-trigger] JWT signing failed:', e);
    }
  } else {
    console.warn('[scheduled-call-trigger] APNs credentials not configured in environment. Trigger will execute in Sandbox/Logging mode.');
  }

  let sentCount = 0;
  const logDetails: string[] = [];

  // 4. Send pushes
  for (const call of calls) {
    const tokens = voipTokensByUser.get(call.user_id) ?? [];
    if (tokens.length === 0) {
      logDetails.push(`Skipping call for "${call.goal_title}" (User ${call.user_id} has no registered iOS VoIP PushKit tokens).`);
      continue;
    }

    const payload: ApnsVoipPayload = {
      aps: {
        alert: {
          alarmId: call.schedule_id,
          goalId: call.goal_id,
          goalTitle: call.goal_title,
          callType: callTypeForHour(call.local_hour),
          promptBlueprint: `CALL_TYPE=${callTypeForHour(call.local_hour)}|INTENSITY=${call.intensity}|FRAMEWORK=${call.goal_framework}`,
        },
      },
    };

    for (const token of tokens) {
      if (apnsJwt) {
        // Production: send direct push via APNs HTTP/2 Gateway
        const apnsResult = await sendApnsVoipPush(token, apnsJwt, payload);
        if (apnsResult.ok) {
          sentCount++;
          logDetails.push(`Sent APNs VoIP push to device token ${token.substring(0, 8)}... for goal "${call.goal_title}"`);
        } else {
          console.error(`[scheduled-call-trigger] APNs push failed for token:`, token, apnsResult.status, apnsResult.body);
        }
      } else {
        // Logging/Sandbox Mode: simulate and record the action
        sentCount++;
        logDetails.push(`[MOCK SANDBOX] VoIP push registered to ${token.substring(0, 8)}... Payload: ${JSON.stringify(payload.aps.alert)}`);
      }
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      dueCount: calls.length,
      voipTokensFound: userIds.reduce((acc, uid) => acc + (voipTokensByUser.get(uid)?.length ?? 0), 0),
      sentCount,
      sandboxMode: !apnsJwt,
      logs: logDetails,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
