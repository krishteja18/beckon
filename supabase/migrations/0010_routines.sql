-- Migration 0010: routines
-- Lightweight scheduled reminders independent of goals.
-- Examples: "take BP tablet at 5pm daily", "drink water at 11am".
-- Atomic: one row = one time + days. Multi-time = multiple rows.
-- Inherits framework + intensity from profiles (no per-routine override).

create table public.routines (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  title           text not null,
  scheduled_time  time not null,
  scheduled_days  int[] not null default '{0,1,2,3,4,5,6}'::int[],
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  constraint scheduled_days_nonempty check (array_length(scheduled_days, 1) >= 1),
  constraint scheduled_days_range
    check (scheduled_days <@ array[0,1,2,3,4,5,6]::int[])
);

create index routines_user_active_idx
  on public.routines(user_id) where active;

alter table public.routines enable row level security;

create policy routines_select on public.routines
  for select to authenticated using (user_id = auth.uid());
create policy routines_insert on public.routines
  for insert to authenticated with check (user_id = auth.uid());
create policy routines_update on public.routines
  for update to authenticated
    using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy routines_delete on public.routines
  for delete to authenticated using (user_id = auth.uid());
