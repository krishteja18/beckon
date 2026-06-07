-- 0012_schedule_labels.sql
-- Optional per-schedule name so a single goal (e.g. "Nutrition & Diet") can
-- have distinctly-labelled time slots: Breakfast 8am, Lunch 1pm, Snack 4pm.
-- NULL/empty falls back to the goal title at display time, so simple goals
-- (e.g. "Gym") stay clean with no per-slot name.

alter table public.goal_schedules
  add column if not exists label text;
