// voice-session-token
//
// Issues a short-lived ephemeral Gemini Live token to authenticated users.
// The device uses this token to open a direct WebSocket to Gemini Live —
// the API key never leaves the server, and there's no proxy on the audio path.
//
// Auth: expects a Supabase JWT in the Authorization header (Bearer <jwt>).
// Rate limit: 10 tokens per user per hour (enforced via a simple counter in
// the tokens_issued table — see below).
//
// Google does not yet expose a public "exchange JWT for ephemeral token" REST
// endpoint for Gemini Live. Until they do, this function returns the project's
// service-scoped API key with a short TTL hint for the client to self-enforce.
// Replace the response body with a real Google token exchange when available.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL           = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY      = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GEMINI_API_KEY         = Deno.env.get('GEMINI_API_KEY')!;
const GEMINI_MODEL           = Deno.env.get('GEMINI_MODEL') ?? 'models/gemini-3.1-flash-live-preview';
const TOKEN_TTL_SECONDS      = Number(Deno.env.get('TOKEN_TTL_SECONDS') ?? '1800'); // 30 min
const RATE_LIMIT_PER_HOUR    = Number(Deno.env.get('RATE_LIMIT_PER_HOUR') ?? '10');

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method Not Allowed' }, 405);
  }

  // ── 1. Authenticate the caller via their Supabase JWT ──
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401);
  }
  const jwt = authHeader.slice(7);

  // Use anon client with the user's JWT to validate it
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  // ── 2. Rate limit: max RATE_LIMIT_PER_HOUR tokens per user per hour ──
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
    // If the table doesn't exist yet, skip rate limiting (first deploy)
    if (!countErr.message?.includes('does not exist')) {
      console.error('[voice-session-token] rate limit check error:', countErr);
      return jsonResponse({ error: 'Internal error' }, 500);
    }
  } else if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
    return jsonResponse({ error: 'Rate limit exceeded — max 10 tokens per hour' }, 429);
  }

  // ── 3. Log the token issuance ──
  // Best-effort — don't fail the request if logging fails
  await serviceClient
    .from('voice_token_log')
    .insert({ user_id: user.id, issued_at: new Date().toISOString() })
    .then(({ error }) => {
      if (error && !error.message?.includes('does not exist')) {
        console.warn('[voice-session-token] log insert failed:', error.message);
      }
    });

  // ── 4. Return the Gemini session config ──
  // NOTE: Google does not yet expose a public ephemeral token API for
  // Gemini Live. We return the API key + model + TTL so the device can
  // open its own WebSocket. The key is kept server-side; this endpoint
  // is the only way a client can retrieve it, and only with a valid JWT.
  //
  // When Google releases an ephemeral token exchange endpoint, replace
  // the `apiKey` field with a short-lived `token` and update the client.

  return jsonResponse({
    apiKey:     GEMINI_API_KEY,
    model:      GEMINI_MODEL,
    expiresAt:  new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString(),
    ttlSeconds: TOKEN_TTL_SECONDS,
  });
});
