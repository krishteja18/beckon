// voice-session-token
//
// Issues a TRUE ephemeral Gemini Live token to authenticated users.
// The device uses this token to open a direct WebSocket to Gemini Live —
// the project API key never leaves this server.
//
// Auth: expects a Supabase JWT in the Authorization header (Bearer <jwt>).
// Rate limit: 10 tokens per user per hour (voice_token_log table).
//
// Uses Google's authTokens REST API on v1alpha. Token is bound to the
// gemini-3.1-flash-live-preview model and is single-use.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL           = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY      = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GEMINI_API_KEY         = Deno.env.get('GEMINI_API_KEY')!;
const GEMINI_MODEL           = Deno.env.get('GEMINI_MODEL') ?? 'models/gemini-3.1-flash-live-preview';
// Validity of the token for STARTING a session (default 5 min — covers cold-start, BT handoff)
const SESSION_START_TTL_SEC  = Number(Deno.env.get('SESSION_START_TTL_SEC') ?? '300');
// Validity of the live WebSocket session ONCE STARTED (default 30 min — Gemini hard cap is 15 for audio, but the window can be longer; reconnect on cap)
const SESSION_LIVE_TTL_SEC   = Number(Deno.env.get('SESSION_LIVE_TTL_SEC') ?? '1800');
const RATE_LIMIT_PER_HOUR    = Number(Deno.env.get('RATE_LIMIT_PER_HOUR') ?? '10');

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function mintEphemeralToken(): Promise<{ token: string; expireTime: string }> {
  const now = Date.now();
  const expireTime = new Date(now + SESSION_LIVE_TTL_SEC * 1000).toISOString();
  const newSessionExpireTime = new Date(now + SESSION_START_TTL_SEC * 1000).toISOString();

  const body = {
    config: {
      uses: 1,
      expireTime,
      newSessionExpireTime,
      bidiGenerateContentSetup: {
        model: GEMINI_MODEL,
      },
    },
  };

  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1alpha/auth_tokens',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`authTokens.create failed: ${res.status} ${text}`);
  }

  const data = await res.json() as { name?: string; expireTime?: string };
  // Response shape: { name: "tokens/<TOKEN>", expireTime: "..." }
  if (!data.name) throw new Error('authTokens response missing name');
  // The token string is just the resource name minus the "tokens/" prefix
  // depending on Google docs version — pass the full name; clients use it as-is.
  return {
    token: data.name,
    expireTime: data.expireTime ?? expireTime,
  };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method Not Allowed' }, 405);
  }

  // ── 1. Authenticate the caller ──
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401);
  }
  const jwt = authHeader.slice(7);

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  // ── 2. Rate limit ──
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countErr } = await serviceClient
    .from('voice_token_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('issued_at', windowStart);

  if (countErr) {
    if (!countErr.message?.includes('does not exist')) {
      console.error('[voice-session-token] rate limit check error:', countErr);
      return jsonResponse({ error: 'Internal error' }, 500);
    }
  } else if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
    return jsonResponse({ error: 'Rate limit exceeded — max 10 tokens per hour' }, 429);
  }

  // ── 3. Log issuance (best effort) ──
  await serviceClient
    .from('voice_token_log')
    .insert({ user_id: user.id, issued_at: new Date().toISOString() })
    .then(({ error }) => {
      if (error && !error.message?.includes('does not exist')) {
        console.warn('[voice-session-token] log insert failed:', error.message);
      }
    });

  // ── 4. Mint ephemeral token ──
  try {
    const { token, expireTime } = await mintEphemeralToken();
    return jsonResponse({
      token,
      model:      GEMINI_MODEL,
      expireTime,
      // v1alpha endpoint is required when using ephemeral tokens
      wsEndpoint: 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent',
    });
  } catch (e) {
    // Surface the underlying Google error during bring-up so we can see the
    // exact status/body the mint call returned. Trim `detail` later if desired.
    const detail = (e instanceof Error ? e.message : String(e));
    console.error('[voice-session-token] mint failed:', detail);
    return jsonResponse({ error: 'Failed to mint token', detail }, 502);
  }
});
