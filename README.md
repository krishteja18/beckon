# Showup

Voice-based AI coach that actually shows up. Mobile app (Expo + React Native) backed by Supabase and Gemini Live native-audio.

> **Name:** "Showup" is a working placeholder. Final name TBD.

## What this is

A mobile AI goal-coach for people who set goals but can't stay consistent. The agent:

- Builds a daily/weekly plan from your goals.
- **Calls you** at every scheduled goal time — automatically on Android, hands-free voice answer on iPhone.
- If you didn't do the thing, asks *why* — distinguishes life-happened from avoidance, and responds differently.
- Lets you mark **"rough day"** (no streak loss) or **"hit a wall"** (mid-task rescue call).
- Frames coaching through your chosen framework: Atomic Habits, Ikigai, or Deep Work (MVP).

## Stack (locked)

| Layer | Choice |
|---|---|
| Mobile | Expo + React Native + TypeScript (**Expo Dev Client** — custom native modules) |
| Routing | expo-router |
| Backend | Supabase (Postgres + Auth + Edge Functions) |
| Voice + LLM | Gemini Live native-audio (`models/gemini-3.1-flash-live-preview`) |
| Android trigger | On-device `AlarmManager.setAlarmClock()` + `ForegroundService(mediaPlayback)` |
| iOS trigger | Supabase pg_cron → PushKit VoIP push → CallKit + Siri Announce Calls |
| Push | Expo Push API (Android notifications) + APNs VoIP / PushKit (iOS calls) |
| Payments | RevenueCat (deferred) |
| Analytics | PostHog or Mixpanel |

## Layout

```
showup/
├── src/                       # Expo / RN app
│   └── services/              # prompts, temporal context, API wrappers
├── supabase/
│   ├── migrations/            # Numbered SQL: schema, RLS, seed
│   └── functions/             # Edge functions (daily/evening/weekly retros, sync)
└── docs/                      # Product, privacy, framework notes
```

## Status

- Schema + RLS + framework seed: shipped as migrations.
- Voice agent prompts: shipped in `src/services/prompts.ts`.
- Temporal context helper: shipped in `src/services/temporal.ts`.
- Expo scaffold, service wrappers, edge functions, landing page: pending.

See [`docs/STATUS.md`](docs/STATUS.md) for the live punch list.
