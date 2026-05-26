-- batch_with_nearby: if true (default), goals scheduled within ±15 min of each
-- other are coalesced into one alarm + one voice call on-device.
-- The actual batching logic ships with the custom Expo Module; this column
-- exposes the toggle so the data model is honest from day one.

alter table public.goals
  add column batch_with_nearby boolean not null default true;

drop function if exists public.find_due_goal_calls(int);

-- Refresh find_due_goal_calls to include batch_with_nearby so the iOS
-- scheduled-call-trigger can read it when building the VoIP push payload.
create or replace function public.find_due_goal_calls(window_minutes int default 10)
returns table (
  user_id uuid,
  goal_id uuid,
  goal_title text,
  goal_framework framework_key,
  schedule_id uuid,
  timezone text,
  scheduled_time time,
  intensity intensity_level,
  local_hour int,
  batch_with_nearby boolean
)
language sql
security definer
set search_path = public, pg_catalog
as $$
  with snapshot as (
    select
      gs.id as schedule_id,
      gs.goal_id,
      gs.user_id,
      gs.scheduled_time,
      gs.scheduled_days,
      g.title as goal_title,
      g.framework as goal_framework,
      g.status as goal_status,
      g.batch_with_nearby,
      p.timezone,
      p.intensity,
      p.onboarding_completed_at,
      (now() at time zone p.timezone) as user_local_now
    from public.goal_schedules gs
    join public.goals g on g.id = gs.goal_id
    join public.profiles p on p.id = gs.user_id
    where gs.active = true
  )
  select
    s.user_id,
    s.goal_id,
    s.goal_title,
    s.goal_framework,
    s.schedule_id,
    s.timezone,
    s.scheduled_time,
    s.intensity,
    extract(hour from s.user_local_now)::int as local_hour,
    s.batch_with_nearby
  from snapshot s
  where s.goal_status = 'active'
    and s.onboarding_completed_at is not null
    and extract(dow from s.user_local_now)::int = any(s.scheduled_days)
    and abs(
      extract(epoch from s.user_local_now::time)
      - extract(epoch from s.scheduled_time)
    ) <= (window_minutes * 60)
    and not exists (
      select 1 from public.check_ins ci
      where ci.user_id = s.user_id
        and s.goal_id = any(ci.goal_ids)
        and (ci.started_at at time zone s.timezone)::date = s.user_local_now::date
    );
$$;

revoke all on function public.find_due_goal_calls(int) from public;
grant execute on function public.find_due_goal_calls(int) to service_role;
