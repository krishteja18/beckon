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
| Mobile | Expo SDK 52 + React Native 0.76 + TypeScript (Expo Dev Client — custom native modules) |
| Routing | expo-router v4 |
| Styling | NativeWind 4 (Tailwind) + StyleSheet for premium surfaces |
| Animation | @shopify/react-native-skia + react-native-reanimated |
| Auth | Supabase PKCE + expo-web-browser + expo-auth-session + expo-crypto |
| Backend | Supabase (Postgres + Auth + Edge Functions) |
| Voice + LLM | Gemini Live native-audio (`models/gemini-3.1-flash-live-preview`) |
| Android trigger | On-device `AlarmManager.setAlarmClock()` + `ForegroundService(mediaPlayback)` |
| iOS trigger | Supabase pg_cron → PushKit VoIP push → CallKit + Siri Announce Calls |
| Error tracking | ErrorBoundary (on-screen) + Sentry SDK (stub, ready for DSN) |
| Build | EAS Build (cloud preview/production) + local Gradle (debug + dev client) |
| Payments | RevenueCat (deferred) |

## Layout

```
showup/
├── app/                       # expo-router screens
│   ├── (onboarding)/          # welcome → auth → name → ... → test-call (10 steps)
│   ├── (app)/                 # home, goals, retros, settings, avoidance (tabs)
│   ├── call.tsx               # full-screen call modal
│   ├── _layout.tsx            # root layout, fonts, ErrorBoundary, Sentry init
│   └── index.tsx              # auth gate
├── src/
│   ├── components/            # VoiceBall, AmbientBackground, OnboardingFrame, ErrorBoundary
│   ├── services/              # supabase, auth, goals, profile, voiceSession, alarmScheduler, sentry, prompts...
│   ├── hooks/
│   └── store/
├── modules/showup-alarm/      # Custom Android & iOS native module (AlarmManager + ForegroundService / CallKit + PushKit)
├── supabase/
│   ├── migrations/            # 9 SQL files: schema, RLS, seeds, feature tables
│   └── functions/             # voice-session-token (deployed), scheduled-call-trigger
├── patches/                   # react-native-css-interop patch for EAS builds
├── experiments/               # gemini-voice-demo (Node), ui-prototype (HTML)
└── docs/                      # STATUS.md, LANDING.md, PRIVACY.md, UI-SPEC.md
```

## Status

See **[`docs/STATUS.md`](docs/STATUS.md)** for the live punch list.
See **[`docs/UI-SPEC.md`](docs/UI-SPEC.md)** for the end-to-end dashboard + navigation design prompt.

**TL;DR:** Full UI shipped end-to-end (welcome → auth → onboarding → home/goals/retros/settings → call screen). Real Supabase reads + writes wired. Android AlarmManager and iOS CallKit/PushKit native modules are autolinked, compiled, and integrated. AI Auto-scheduling is active. Native low-latency audio capture (microphone recording) and playback (speaker streaming) are fully integrated for real-time Gemini Live voice check-in call loops on both Android and iOS.

## Development

```bash
# install
npm install --legacy-peer-deps

# typecheck
npm run typecheck

# launch on Android emulator (local debug build)
npm run android

# build APK in cloud and download to phone
NODE_EXTRA_CA_CERTS=C:/Users/KrishnaDachepalli/zscaler-root.pem \
  npx eas-cli build --profile preview --platform android
```

## Corp environment note

Build commands need `NODE_EXTRA_CA_CERTS` pointing at the Zscaler root cert (already exported to `C:\Users\KrishnaDachepalli\zscaler-root.pem`) for `eas-cli` to reach Expo servers. Local Gradle uses the JDK truststore at `C:\Users\KrishnaDachepalli\gradle-cacerts` (Zscaler cert imported).
