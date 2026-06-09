-- 0014_routine_oneoff.sql
-- Generalize routines into reminders that can be one-time as well as recurring.
--   remind_date NULL  → recurring (uses scheduled_days, as before)
--   remind_date set   → fires once on that calendar date (scheduled_days ignored)
-- description: optional free-text detail the coach reads out ("bring last reports").

alter table public.routines
  add column if not exists remind_date date,
  add column if not exists description text;
