# Edge Functions

Deno-runtime functions deployed to Supabase. They run server-side, on demand or
via pg_cron schedules. The Showup voice agent itself does NOT live in an edge
function — voice happens client-side directly against Gemini Live. Edge
functions handle scheduled notifications, retros, and cleanup.

## Deploy

The Supabase CLI is required. Install one of these ways (Windows):

```bash
# winget (easiest)
winget install Supabase.CLI

# or scoop
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

Then from the project root:

```bash
supabase login                                        # one-time, opens browser
supabase link --project-ref otamjpxbfesbxzyeoaec      # one-time per machine
supabase functions deploy daily-check-in-trigger       # deploys this function
```

After deploy, the function is reachable at:
`https://otamjpxbfesbxzyeoaec.supabase.co/functions/v1/<function-name>`

## Schedule (cron)

Each function that needs a recurring trigger has a `schedule.sql` next to its
`index.ts`. Apply it ONCE after the function is deployed:

```bash
npm run db:apply -- supabase/functions/daily-check-in-trigger/schedule.sql
```

The cron job authenticates by reading the service-role key from Supabase Vault.
Create the secret once via the Dashboard (Project Settings → Vault → New
secret, name: `service_role_key`, value: your service-role JWT) or via SQL:

```sql
select vault.create_secret('<service-role-key>', 'service_role_key');
```

## Local testing

```bash
supabase functions serve daily-check-in-trigger --env-file .env.functions
```

Where `.env.functions` contains:

```
SUPABASE_URL=https://otamjpxbfesbxzyeoaec.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-jwt>
```

Then `curl -X POST http://localhost:54321/functions/v1/daily-check-in-trigger`.

## Why this architecture

- **Push, don't call.** The edge function only sends an Expo push notification.
  The actual voice conversation happens client-side when the user opens the
  app — Gemini Live is initiated from the device, not the server. This keeps
  the edge function fast and stateless.
- **pg_cron, not external cron.** Supabase ships pg_cron + pg_net out of the
  box. No separate cron service to manage.
- **Service role only inside the function.** The cron job and the function
  both run with service-role privileges (RLS-bypassing). Clients never see
  the service-role key.
