-- Helper SQL function for the daily-check-in-trigger edge function.
-- Finds users whose local time is within a 10-min window of their preferred
-- check-in time AND who do not already have a check-in for their local "today".
-- security definer so it can read across users when called by the edge function
-- with the service role (RLS-bypassing) key.

create or replace function public.find_users_due_for_check_in(window_minutes int default 10)
returns table (
  user_id uuid,
  timezone text,
  preferred_local_time time,
  intensity intensity_level,
  local_hour int
)
language sql
security definer
set search_path = public, pg_catalog
as $$
  with snapshot as (
    select
      p.id,
      p.timezone,
      p.preferred_check_in_local_time,
      p.intensity,
      (now() at time zone p.timezone) as user_local_now
    from public.profiles p
    where p.onboarding_completed_at is not null
  )
  select
    s.id as user_id,
    s.timezone,
    s.preferred_check_in_local_time as preferred_local_time,
    s.intensity,
    extract(hour from s.user_local_now)::int as local_hour
  from snapshot s
  where
    -- Local time-of-day within +/- window_minutes of preferred check-in time.
    -- We compare seconds-since-midnight to avoid date-component math.
    abs(
      extract(epoch from s.user_local_now::time)
      - extract(epoch from s.preferred_check_in_local_time)
    ) <= (window_minutes * 60)
    -- No check-in already exists for the user's local "today".
    and not exists (
      select 1 from public.check_ins ci
      where ci.user_id = s.id
        and (ci.started_at at time zone s.timezone)::date = s.user_local_now::date
    );
$$;

-- Restrict execution: only the service role (used by edge functions) and
-- the postgres role (used by pg_cron) should call this.
revoke all on function public.find_users_due_for_check_in(int) from public;
grant execute on function public.find_users_due_for_check_in(int) to service_role;
