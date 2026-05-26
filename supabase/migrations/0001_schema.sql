-- Showup core schema. All user-owned tables live in `public` and are RLS-gated by auth.uid().
-- Privacy: calendar mirror stores title + time only (no attendees, no descriptions).

create extension if not exists "uuid-ossp";
create extension if not exists "pg_cron";

-- ===== Enums =====
create type framework_key as enum ('atomic_habits', 'ikigai', 'deep_work');
create type goal_status as enum ('active', 'paused', 'archived', 'completed');
create type intensity_level as enum ('gentle', 'firm', 'drill');
create type call_type as enum ('morning', 'midday', 'evening', 'wall', 'retro');
create type task_event_kind as enum (
  'started', 'completed', 'skipped', 'failed', 'wall_hit', 'wall_recovered', 'rough_day'
);
create type integration_kind as enum ('google_calendar', 'notion', 'gmail');
create type retro_period as enum ('daily', 'weekly', 'monthly');

-- ===== Helper: updated_at trigger =====
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ===== profiles =====
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'UTC',
  preferred_check_in_local_time time not null default '20:00',
  intensity intensity_level not null default 'firm',
  default_framework framework_key not null default 'atomic_habits',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_timezone_idx on public.profiles(timezone);
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', null));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== frameworks (reference data) =====
create table public.frameworks (
  key framework_key primary key,
  display_name text not null,
  one_liner text not null,
  description text not null,
  vocabulary jsonb not null default '[]'::jsonb,
  best_for text[] not null default '{}',
  system_prompt_addon text not null
);

-- ===== goals =====
create table public.goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  framework framework_key not null,
  status goal_status not null default 'active',
  cadence_per_week int not null default 7 check (cadence_per_week between 1 and 7),
  preferred_time_of_day text not null default 'any'
    check (preferred_time_of_day in ('morning','midday','evening','night','any')),
  deadline_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create index goals_user_status_idx on public.goals(user_id, status);
create index goals_user_framework_idx on public.goals(user_id, framework);
create trigger goals_set_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

-- ===== task_events =====
-- Append-only event log. user_local_* columns precomputed at write time so we don't
-- replay tz math on every retro/aggregation query.
create table public.task_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete cascade,
  kind task_event_kind not null,
  occurred_at timestamptz not null default now(),
  user_local_date date not null,
  user_local_day_of_week int not null check (user_local_day_of_week between 0 and 6),
  user_local_hour int not null check (user_local_hour between 0 and 23),
  time_bucket text not null check (time_bucket in ('morning','midday','evening','night')),
  note text,
  source text not null default 'app' check (source in ('app','voice','cron','calendar'))
);
create index task_events_user_date_idx on public.task_events(user_id, user_local_date);
create index task_events_goal_date_idx on public.task_events(goal_id, user_local_date);
create index task_events_user_kind_idx on public.task_events(user_id, kind);

-- ===== check_ins =====
create table public.check_ins (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  call_type call_type not null,
  intensity intensity_level not null,
  goal_ids uuid[] not null default '{}',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds int,
  transcript text,
  summary text,
  -- outcome: {goals:[{goal_id, done, reason}], user_mood}
  outcome jsonb not null default '{}'::jsonb,
  feedback_rating int check (feedback_rating in (-1, 0, 1)),
  elevenlabs_conversation_id text
);
create index check_ins_user_started_idx on public.check_ins(user_id, started_at desc);

-- ===== retros =====
create table public.retros (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period retro_period not null,
  period_start_date date not null,
  period_end_date date not null,
  generated_at timestamptz not null default now(),
  summary_text text not null,
  stats jsonb not null default '{}'::jsonb,
  unique (user_id, period, period_start_date)
);
create index retros_user_period_idx on public.retros(user_id, period, period_start_date desc);

-- ===== integrations =====
-- TODO(prod): wrap access_token / refresh_token with pgsodium before launch.
create table public.integrations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind integration_kind not null,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  unique (user_id, kind)
);

-- ===== calendar_events =====
-- Privacy pledge: title + time only. NEVER store attendees, descriptions, or locations.
create table public.calendar_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  external_id text not null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  synced_at timestamptz not null default now(),
  unique (user_id, external_id)
);
create index calendar_events_user_starts_idx on public.calendar_events(user_id, starts_at);

-- ===== push_tokens =====
create table public.push_tokens (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_token text not null unique,
  platform text not null check (platform in ('ios','android')),
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);
