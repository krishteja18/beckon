-- goal_schedules: per-goal scheduled trigger times.
-- A goal can have many schedules (e.g. "drink water" at 8am, 11am, 2pm, 5pm).
-- Goals without a schedule still exist; they're surfaced only in retros.

create table public.goal_schedules (
  id uuid primary key default uuid_generate_v4(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scheduled_time time not null,
  -- ISO day-of-week ints, 0=Sunday .. 6=Saturday (Postgres `extract(dow from ts)` matches this)
  scheduled_days int[] not null default array[0, 1, 2, 3, 4, 5, 6]
    check (
      cardinality(scheduled_days) between 1 and 7
      and scheduled_days <@ array[0, 1, 2, 3, 4, 5, 6]
    ),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index goal_schedules_user_active_idx on public.goal_schedules(user_id) where active;
create index goal_schedules_goal_idx on public.goal_schedules(goal_id);

-- RLS — user owns their schedules
alter table public.goal_schedules enable row level security;

create policy goal_schedules_select on public.goal_schedules
  for select to authenticated using (user_id = auth.uid());
create policy goal_schedules_insert on public.goal_schedules
  for insert to authenticated with check (user_id = auth.uid());
create policy goal_schedules_update on public.goal_schedules
  for update to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
create policy goal_schedules_delete on public.goal_schedules
  for delete to authenticated using (user_id = auth.uid());

-- Drop the old single-daily-check-in helper; replaced by per-goal call helper.
drop function if exists public.find_users_due_for_check_in(int);

-- find_due_goal_calls
-- Returns rows for every (user, goal, schedule) tuple whose scheduled time
-- matches the user's local now within `window_minutes`, the schedule's
-- day-of-week list includes today, the goal is active, the profile is
-- onboarded, and no check-in exists yet today (in user-local TZ) for THIS
-- specific goal.
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
  local_hour int
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
    extract(hour from s.user_local_now)::int as local_hour
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
