# Beckon — project context for AI tools

> This file is the canonical hand-off context for any AI coding tool (Claude Code,
> Cursor, etc.). It is **secret-free** — never put tokens/keys here. Secrets live in
> gitignored `.env` / `.env.supabase` and the Supabase dashboard.
> Codename in the codebase is **"showup"**; the launch brand is **"Beckon"**.

---

## 1. What Beckon is

A **voice-first AI goal coach** mobile app. The coach phones the user (inside the app)
at each scheduled task time and at daily/weekly retros, talks in natural voice, and
keeps them consistent. Tone is **warm and non-punitive** — the differentiators vs.
streak-shaming habit apps are first-class **"Rough day"** (skip today, no penalty) and
**"Hit a wall"** (instant rescue call) actions.

- **Metric:** rolling **7-day velocity %** (a miss nudges it down, never resets). No streak counters anywhere.
- **Coaching frameworks:** Atomic Habits / Ikigai / Deep Work (per-goal, default from profile).
- **Target user:** mass-market goal-setters who can't stay consistent. **Not** ADHD-niche.
- **Name:** LOCKED as **Beckon** (store: "Beckon: Voice Coach", domain getbeckon.com). "Showup" stays as the code codename until launch.

---

## 2. How to run

**Web (fastest, for UI work):**
```bash
npm install
npm run web                     # http://localhost:8081
# in the browser console, for the mock data layer (no real auth):
localStorage.setItem('bypass_auth','true')   # then reload
```
If a restart throws `asyncRequire` / "Bundling failed" for a file that exists, it's a
stale Metro cache — `npx expo start --web --clear` (free the port first if held).

**Mobile (real app — Expo Go will NOT work: custom native module + Skia):**
- Needs an **Expo Dev Client** build. Easiest: `eas build --profile development --platform android` → install the APK → `npx expo start --dev-client` (phone + laptop same Wi-Fi; `--tunnel` if blocked). Or local: `npx expo run:android` (needs Android Studio).
- Required env (`.env` at repo root): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (see `.env.example`; values also in `eas.json` preview profile).
- **No `bypass_auth` on native** — real login + onboarding required.
- **Live Gemini voice must be OFF any Google-blocking network** (corporate/Zscaler blocks `generativelanguage.googleapis.com`).
- iOS dev builds need a paid Apple Developer account; use **Android** for testing.

**DB / migrations (helper scripts, curl-based — work on the corp network):**
```bash
npm run db:apply -- supabase/migrations/NNNN.sql   # apply a migration
npm run db:query -- "select ..."                   # ad-hoc SQL
npm run db:types                                   # regenerate src/services/database.types.ts
```
Creds auto-load from gitignored **`.env.supabase`** (`SUPABASE_PROJECT_REF`,
`SUPABASE_ACCESS_TOKEN`) via `scripts/_loadEnv.mjs`. The **Supabase CLI and edge-function
deploys are blocked by Zscaler** — deploy edge functions via the **dashboard editor**.

---

## 3. Tech stack (LOCKED)

| Layer | Choice |
|---|---|
| Mobile | Expo SDK 52 + React Native 0.76 + TypeScript, Expo Dev Client |
| Routing | expo-router v4 |
| Styling | NativeWind 4 (Tailwind) + StyleSheet |
| Auth + DB | Supabase (PKCE, SecureStore session); project ref `otamjpxbfesbxzyeoaec` |
| **Voice + LLM** | **Gemini Live native-audio**, model `models/gemini-3.1-flash-live-preview` (single audio↔audio service) |
| Gemini auth | **Ephemeral tokens** from the `voice-session-token` edge function; device opens a direct WebSocket. Project key never ships to clients. |
| Graphics | react-native-skia (with `.web.tsx` fallbacks — Skia needs WASM on web), react-native-svg, reanimated |
| Triggers (Android) | on-device `AlarmManager.setAlarmClock()` + `ForegroundService(mediaPlayback)` |
| Triggers (iOS) | server pg_cron → APNs VoIP push (PushKit) → CallKit + Siri Announce Calls *(not yet deployed)* |

**Dropped:** ElevenLabs (TTS) and Anthropic/Claude (LLM) are no longer in the runtime path — Gemini Live unifies voice + LLM.

---

## 4. Architecture (canonical call-trigger model)

A voice call happens **per scheduled task time** + at retros, **inside the app** (not PSTN).

- **Android (primary, built):** schedule creation registers an `AlarmManager.setAlarmClock()` alarm → `BroadcastReceiver` → `ForegroundService(mediaPlayback)` → fetch ephemeral Gemini token from `voice-session-token` → open WebSocket directly to Gemini → coach speaks first → on end, POST `check_ins` + `task_events` via supabase-js. Resilience: `BOOT_COMPLETED` re-arm, clock/timezone receivers, in-app foreground "missed call" catch-up, OEM-autostart onboarding prompts.
- **iOS (deferred):** Apple blocks background audio init → uses CallKit + PushKit + Siri "Announce Calls". Needs server VoIP push (`scheduled-call-trigger` as APNs sender) + APNs cert + PushKit entitlement — **not deployed yet**.
- **Native module:** `modules/showup-alarm/` — Android Kotlin (`AlarmReceiver`, `BootReceiver`, `VoiceCallService`, `OemAutostart`, `MainLauncher`, `ShowupAlarmModule`) + iOS Swift (`ShowupAlarmModule.swift`). Guarded so web/Expo Go/iOS no-op gracefully.
- **Edge functions** (`supabase/functions/`): `voice-session-token` (deployed, ACTIVE — mints Google v1alpha ephemeral tokens, rate-limited via `voice_token_log`), `scheduled-call-trigger` (iOS VoIP sender — built, **not deployed**).

---

## 5. Data model (Postgres + RLS; migrations `0001`–`0014`)

All user tables are RLS-scoped to `auth.uid()`. Key tables/columns:

- **profiles** — `display_name`, `timezone`, `intensity`, `default_framework`, `preferred_check_in_local_time` (evening retro), `morning_sync_time` (morning kickoff), `onboarding_completed_at`.
- **goals** — `title`, `framework`, `status`, `batch_with_nearby`.
- **goal_schedules** — `scheduled_time`, `scheduled_days int[]` (0=Sun..6=Sat), `active`, **`label`** *(0012 — optional per-slot "task" name, e.g. Breakfast/Lunch under one goal; display falls back to goal title)*. One goal → many schedules.
- **routines** — lightweight reminders w/o a goal: `title`, `scheduled_time`, `scheduled_days`, `active`, **`remind_date`** + **`description`** *(0014 — `remind_date` set = ONE-TIME on that date, days ignored; null = recurring)*.
- **task_events** — the **canonical outcome store**: `goal_id`, **`schedule_id`** *(0013 — per-slot outcomes)*, `kind` enum (`started|completed|skipped|failed|wall_hit|wall_recovered`), `user_local_date/_day_of_week/_hour`, `time_bucket`, `note`, `source`. Routines/anchors tracked via `note` tag (`[routine:id]` / `[anchor:kind]`).
- **check_ins** — one row per call: `call_type`, `intensity`, `goal_ids`, `transcript`, `outcome` jsonb.
- **retros** — `retro_period`/`retro_type` (daily/weekly/monthly), `summary_text`.
- **avoidance_goals**, **voice_token_log**, plus `find_due_goal_calls(window)` RPC (iOS trigger).

After any migration: `npm run db:apply` then `npm run db:types`. Bypass/web mode mirrors all of this in `localStorage` (`mock_goals`, `mock_schedules`, `mock_routines`, `mock_task_events`, `mock_profile`, `mock_check_ins`).

---

## 6. Code map

**Services** (`src/services/`): `supabase.ts` (client/auth lifecycle) · `auth.ts` (Google/Apple/magic-link) · `goals.ts` (goal+schedule CRUD, `fetchTodayTimeline`, `slotDisplayName`) · `routines.ts` (incl. one-off `remind_date`/`description`) · `outcomes.ts` (`recordOutcome`/`clearTodayOutcome`/`fetchTodayOutcomes`, per-slot via `schedule_id`) · `velocity.ts` (rolling 7-day from `task_events`) · `voiceTools.ts` (Gemini tool-calling: create/edit/reschedule/archive goals+routines, `addSchedule`, `markOutcome`, `findEntities`; destructive tools use 2-phase confirm) · `voiceSession.ts` + `hooks/useVoiceSession.ts` (Gemini Live session; `persistOutcomes` writes check_ins + task_events) · `prompts.ts` (BASE+INTENSITY+CALL_TYPE+framework composer) · `alarmScheduler.ts` (arms native alarms; one-shot for one-offs) · `scheduleOverrides.ts` · `retros.ts` (recap pipeline — currently **templated**, not LLM) · `temporal.ts`, `profile.ts`, `avoidanceGoals.ts`, `goalMetrics.ts`.

**Screens** (`app/(app)/`): `home` (Today: timeline, velocity header, Morning Kickoff/Evening Cooldown anchors, mark-done detail sheet, Rough Day/Hit a Wall, "+ Add") · `goals` (Goals/Routines tabs) · `goal-detail` · `add` (unified **Goal | Task | Routine** composer with calendar date picker + validation) · `retros` (Recap) · `settings` · `avoidance` · `coach` (orb route). `app/call.tsx` = full-screen call. `app/(onboarding)/*` = 8-step onboarding. `app/_layout.tsx` = root Stack; `app/(app)/_layout.tsx` = custom floating notched tab bar.

**Components** (`src/components/`): `DatePickerField` (shared field + popup month calendar) · `RoutineEditSheet` (date-aware: recurring days vs one-off date) · `EditSchedulesSheet` (named slots) · `VoiceOverlay` (immersive talk-to-coach overlay summoned by the nav orb) · `VoiceBall`, `CallWaves` (+ `.web.tsx`), `AmbientBackground`, `TimePickerSheet`, `CompletionRing`, `OnboardingFrame`.

---

## 7. In-app nomenclature & UX rules

- **Tabs:** Today · Goals · (center voice orb) · Recap · Settings. Nav bar = floating, notched, brand-purple `#6C5DD3`, **filled icon on the active tab**, no labels; the orb floats in the groove and opens the `VoiceOverlay` (on web it's text-mode, no mic).
- **Daily anchors:** "**Morning Kickoff**" (morning_sync_time) and "**Evening Cooldown**" (retro time). Morning Kickoff always shows at its set time.
- **Recap** tab = the coach's narrative patterns (file is still `retros.tsx`).
- **Palette:** bg `#F4F6FB`, brand-purple `#6C5DD3`, brand-lavender `#ECEFFA`, text `#1E1B4B`. **One flat `#F4F6FB` backs the whole `(app)` area** (scenes transparent) — don't reintroduce per-screen opaque bgs or a dark root behind it (caused a visible hairline seam before).
- Timeline chips: one line, show slot name (label ?? goal title) + AM/PM; tap → detail sheet (Mark done / Skip / Undo — today only).

---

## 8. Locked product decisions

- Name = Beckon; stack = Expo/RN + Supabase + Gemini Live; ElevenLabs/Anthropic dropped.
- Goal→schedule(→named task) container model (NOT calendar event+category). Goals cap: 3 at onboarding, 10 total.
- Velocity %, not streaks. Rough-day / Hit-a-wall are first-class.
- One-off dated reminders live under **Routines** (not a separate type) — recurring OR `remind_date`.
- Voice CRUD via Gemini tool-calling; destructive ops need verbal confirmation.

---

## 9. Known pending / unverified

- **Live Gemini voice mint** — verify `voice-session-token` returns a real ephemeral token (call with a user JWT; check the `502` `detail` if it fails — Google's `v1alpha/auth_tokens` body field names are the likely break point).
- **Real-device auto-call** end-to-end on Android (off-corp, dev-client build) — not yet validated.
- **iOS** server VoIP path — `scheduled-call-trigger` not deployed; no APNs cert / PushKit entitlement.
- **deleteAccount** is a soft stub (sign-out / clear local); real cascade hard-delete = later server function.
- **Recap text** is templated; LLM-generated narrative deferred to Tier-3 (RAG / text-LLM).
- **Doc strays:** `docs/STATUS.md` + `docs/UI-SPEC.md` still mention ElevenLabs/Anthropic.
- **Security:** the old Supabase PAT leaked in the (now gitignored, history-scrubbed) `conversation.md` should be revoked; a fresh PAT is in `.env.supabase`. The MCP config (`.claude.json`) may also hold a PAT — update via `claude mcp` if rotated.

---

## 10. Gotchas & conventions

- **Corp network (Zscaler)** blocks Google (`generativelanguage`) and the Supabase CLI / edge-deploy / `api.supabase.com` for the CLI — but **curl works** (helper scripts use it). Test live voice off-corp.
- **No `bypass_auth` on native** — that mock mode is web-only.
- **Skia** crashes on web without WASM → web-specific code uses `.web.tsx` splits.
- **Mojibake history:** emoji were once double-encoded; keep source ASCII-safe or use `\u{…}` escapes and verify no `Ã/Â/â€` sequences.
- Gitignored & never commit: `.env`, `.env.supabase`, `experiments/gemini-voice-demo/.env`, `conversation.md`, service-account/keys.
- Commit hygiene: secret-scan diffs before pushing — look for Supabase PAT prefixes, JWT / service-role keys, and PEM key blocks.

---

## 11. Session history (distilled — what was built & decided)

> Not a verbatim transcript (the raw chat contained a leaked token and is huge);
> this is the substance, chronological.

1. **Metric unification** — velocity is a single rolling 7-day score across all surfaces.
2. **Schedule editing** + **multiple schedules per goal** (`EditSchedulesSheet`, "+ Add another time").
3. **Routines** — lightweight recurring reminders with no goal (day selection, inherits profile framework/intensity), shown in the home timeline; added to onboarding with per-reminder day selection.
4. **Voice CRUD** via Gemini Live tool-calling (`voiceTools.ts`) — create/edit/reschedule/archive goals & routines, mark outcomes; 2-phase confirm for destructive ops.
5. **Naming** locked to **Beckon** after availability research; Recap tab renamed (was Retros/Reflect).
6. **Premium UI pass** — themed gradient `AmbientBackground`, immersive `VoiceOverlay` with a twisting particle wave (`CallWaves`, Skia native / WebGL web), Settings rework (functional pickers, default framework, delete-account), dynamic Recap pipeline, emoji/mojibake cleanup.
7. **Daily anchors** — Morning Kickoff + Evening Cooldown in the timeline with an intelligent merger (later changed to **always show kickoff** at its set time).
8. **Named schedules (tasks)** — `goal_schedules.label` (0012) so one goal holds Breakfast/Lunch/Snack; unified **Add screen** (Goal | Task | Routine) reachable from a home "+", with focus-reset, required task names, duplicate-goal block, and inline validation (RN `Alert` is a no-op on web).
9. **Mark done (manual + voice)** — `task_events.schedule_id` (0013) for per-slot outcomes; `outcomes.ts`; home detail-sheet Mark done/Skip/Undo (today only); velocity counts completions from `task_events`.
10. **Floating notched nav bar** — SVG-shaped, brand-purple, filled active icons, no labels, larger center orb in a smooth groove; fixed web orb-tap (z-index / resilient overlay open) and a flat single-background fix (a dark root was showing through as a hairline).
11. **One-off dated reminders** — `routines.remind_date` + `description` (0014); Add screen Repeats/Just-once toggle + popup calendar (`DatePickerField`); timeline places one-offs on their date; voice `createRoutine` accepts `date` + `description`; `RoutineEditSheet` made date-aware.
12. **Infra** — `.env.supabase` + `scripts/_loadEnv.mjs` so `db:*` scripts work without shell exports; pushed to `github.com/krishteja18/beckon` (branch `master`).

---

## 12. Where the rest of the context lives (machine-local, not in the repo)

- Claude Code memory: `~/.claude/projects/c--Users-KrishnaDachepalli-showup/memory/` (`MEMORY.md` + per-fact files).
- Architecture plan: `~/.claude/plans/…`.
- Raw session transcript: `~/.claude/projects/c--Users-KrishnaDachepalli-showup/*.jsonl` (verbose; do not commit — contains the old token).
