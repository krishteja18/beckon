-- Row-level security. Every user-owned table is scoped by auth.uid().
-- frameworks is the only readable-by-all table (reference data).

alter table public.profiles enable row level security;
alter table public.frameworks enable row level security;
alter table public.goals enable row level security;
alter table public.task_events enable row level security;
alter table public.check_ins enable row level security;
alter table public.retros enable row level security;
alter table public.integrations enable row level security;
alter table public.calendar_events enable row level security;
alter table public.push_tokens enable row level security;

-- profiles: keyed on id (not user_id)
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- frameworks: read-only reference data for authenticated users
create policy frameworks_read_all on public.frameworks
  for select using (auth.role() = 'authenticated');

-- All user-owned tables: full CRUD on own rows only
create policy goals_all_own on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy task_events_all_own on public.task_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy check_ins_all_own on public.check_ins
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy retros_all_own on public.retros
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy integrations_all_own on public.integrations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy calendar_events_all_own on public.calendar_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy push_tokens_all_own on public.push_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
