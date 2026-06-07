-- 0013_task_event_schedule.sql
-- Slot-level outcomes: which goal_schedules row an outcome belongs to, so a
-- goal with named slots (Breakfast / Lunch / Snack) can be checked off per slot.
-- NULL = goal-level outcome (e.g. a voice call that didn't name a specific slot,
-- or a routine — routines are tracked via goal_id=null + note tag).

alter table public.task_events
  add column if not exists schedule_id uuid
    references public.goal_schedules(id) on delete set null;

create index if not exists task_events_schedule_idx on public.task_events(schedule_id);
