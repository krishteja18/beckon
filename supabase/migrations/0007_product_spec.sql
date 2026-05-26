-- Migration 0007: product spec tables
-- Adds: avoidance_goals, schedule_overrides, retro_type enum,
--       profiles.morning_sync_time, profiles.retro_time (rename preferred_check_in_local_time alias)

-- ── 1. avoidance_goals ──────────────────────────────────────────────────────
-- Voice-added habits the user wants to quit (sugar, Instagram, etc.).
-- No standalone alarms — reviewed in evening retro only.
-- Also triggered by SOS shortcut.

create table public.avoidance_goals (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  added_at   timestamptz not null default now(),
  active     boolean not null default true
);

create index avoidance_goals_user_active_idx
  on public.avoidance_goals(user_id) where active;

alter table public.avoidance_goals enable row level security;

create policy avoidance_goals_select on public.avoidance_goals
  for select to authenticated using (user_id = auth.uid());
create policy avoidance_goals_insert on public.avoidance_goals
  for insert to authenticated with check (user_id = auth.uid());
create policy avoidance_goals_update on public.avoidance_goals
  for update to authenticated
    using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy avoidance_goals_delete on public.avoidance_goals
  for delete to authenticated using (user_id = auth.uid());


-- ── 2. schedule_overrides ───────────────────────────────────────────────────
-- One-day reschedule overrides ("push gym to 8pm today").
-- Does NOT modify goal_schedules — tomorrow resumes normal schedule.

create table public.schedule_overrides (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  goal_id       uuid not null references public.goals(id) on delete cascade,
  override_date date not null,
  override_time time not null,
  original_time time not null,
  reason        text,
  created_at    timestamptz not null default now(),
  unique (goal_id, override_date)
);

create index schedule_overrides_user_date_idx
  on public.schedule_overrides(user_id, override_date);

alter table public.schedule_overrides enable row level security;

create policy schedule_overrides_select on public.schedule_overrides
  for select to authenticated using (user_id = auth.uid());
create policy schedule_overrides_insert on public.schedule_overrides
  for insert to authenticated with check (user_id = auth.uid());
create policy schedule_overrides_update on public.schedule_overrides
  for update to authenticated
    using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy schedule_overrides_delete on public.schedule_overrides
  for delete to authenticated using (user_id = auth.uid());


-- ── 3. retro_type on retros ─────────────────────────────────────────────────
-- Distinguishes daily / weekly / monthly retros.

do $$ begin
  create type retro_type as enum ('daily', 'weekly', 'monthly');
exception when duplicate_object then null; end $$;

alter table public.retros
  add column if not exists retro_type retro_type not null default 'daily';

create index retros_user_type_idx on public.retros(user_id, retro_type);


-- ── 4. profiles additions ───────────────────────────────────────────────────
-- morning_sync_time: standalone morning motivation call time
--   (used only when no goal is scheduled at/before this time — intelligent merger).
-- snooze_count tracked per task_event row, not profile-level.

alter table public.profiles
  add column if not exists morning_sync_time time not null default '07:00:00';

-- ── 5. task_events: snooze tracking ─────────────────────────────────────────
-- Tracks how many times a user snoozed a specific event (max 3).

alter table public.task_events
  add column if not exists snooze_count int not null default 0
    check (snooze_count between 0 and 3);
