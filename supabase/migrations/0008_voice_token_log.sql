-- voice_token_log: tracks ephemeral Gemini token issuances per user.
-- Used by the voice-session-token edge function for rate limiting (10/hr).
-- Rows older than 24 hours are safe to purge.

create table public.voice_token_log (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  issued_at  timestamptz not null default now()
);

create index voice_token_log_user_time_idx
  on public.voice_token_log(user_id, issued_at desc);

-- service_role only — users never read or write this directly
alter table public.voice_token_log enable row level security;
-- no user-facing policies; edge function uses service_role key
