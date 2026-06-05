# Showup — Status & Punch List

Last updated: 2026-06-04.

## Shipped

### Backend
- **Supabase schema (migrations 0001–0009)**: 12 tables, RLS, frameworks seed, goal_schedules, avoidance_goals, schedule_overrides, retro_type, morning_sync_time, snooze_count, voice_token_log, auth→profiles trigger. All applied to cloud project `otamjpxbfesbxzyeoaec`.
- **Edge function `voice-session-token`** — deployed and live. JWT auth, 10-tokens/hour rate limit, returns Gemini API key + model + TTL.
- **Edge function `scheduled-call-trigger`** — updated to sign secure APNs JWTs using Apple private keys (.p8) and issue direct HTTP/2 VoIP pushes under the `.voip` topic. pg_cron timing configured to check every minute.
- Helper scripts (curl-based to dodge Zscaler corp TLS): `apply-migration.mjs`, `supabase-query.mjs`, `generate-types.mjs`, `export-conversation.mjs`.
- `database.types.ts` regenerated against the live schema (~20k chars).

### App scaffold
- Expo SDK 52 + RN 0.76 + TypeScript + expo-router v4.
- NativeWind 4 + Tailwind (extended palette: bg, blue, cyan, indigo, gemini-blue / -purple / -pink / -amber, text-1/2/3, glass-border).
- @shopify/react-native-skia + react-native-reanimated + react-native-gesture-handler.
- @expo-google-fonts/inter + jetbrains-mono.
- expo-web-browser + expo-auth-session + **expo-crypto** for OAuth + PKCE.
- expo-clipboard for error report copy.
- Auth gate at `app/index.tsx`: loading → signed-out → onboarding → app. Subscribes to `onAuthStateChange`. Web has dev bypass + OAuth popup auto-close.
- **patches/react-native-css-interop+0.2.4.patch** — strips broken `react-native-worklets/plugin` push that breaks EAS builds. Auto-applied via `postinstall`.

### Error visibility
- **ErrorBoundary** (`src/components/ErrorBoundary.tsx`) — top-level. On any render error, shows the stack trace ON the phone screen with "Try again" (purple `#6C5DD3`) + "Copy details" buttons. No more silent white screens.
- **Sentry runtime SDK** installed (`@sentry/react-native`). Stub at `src/services/sentry.ts`. Auto-noops without a DSN. Build-time plugin removed (would have needed Sentry org auth token to upload sourcemaps).

### UI components
- **VoiceBall** (`src/components/VoiceBall.tsx`) — Skia glass plasma orb. Animated 3 fluid bands × bloom passes + 2 caustic blobs + glass rim + specular highlight. 4 states (idle/listening/processing/speaking) varying speed + intensity. Blue palette throughout (per user preference).
- **AmbientBackground** (`src/components/AmbientBackground.tsx`) — full-screen ambient space gradient. Used across all onboarding screens + call screen.
- **OnboardingFrame** (`src/components/OnboardingFrame.tsx`) — shared chrome: glowing step dots, eyebrow, title, subtitle, premium primary/secondary CTAs with shadow.

### Screens — onboarding (7 consolidated steps)
1. `welcome.tsx` — hero with floating "speaking" VoiceBall + dual CTA
2. `auth.tsx` — Apple/Google buttons (SVG icons), magic-link email, dev bypass on web
3. `name.tsx` — name input → onboarding store
4. `goals.tsx` — 3x3 category grid presets + custom goal badges (Atomic/Deep Work/Ikigai styling)
5. `schedule.tsx` — sunrise/crescent timers + custom interactive TimePickerWidgets + AI heuristic suggestions
6. `permissions.tsx` — mic/notifications/battery deep-links for Android, Siri recommendations + CallKit permissions for iOS
7. `test-call.tsx` — Setup Blueprint dashboard (pulsing orb, horizontal visualizer, manual time picker overrides, simulated voice commands input, native Diagnostics HUD)

### Screens — app (bottom tab nav)
- **home.tsx** — date, velocity % with trend arrow, hero (next call), day arc, week selector pill, horizontal timeline strip, rough day + hit-a-wall buttons (with subtitle hints), anchored VoiceBall. Reads real data via `fetchTodayTimeline()`. Tappable slots route to call.
- **goals.tsx** — list of active goals with framework + schedule chips, archive with confirmation, + Add button. Dark theme.
- **retros.tsx** — daily/weekly/monthly tabs, narrative summary cards, empty states. Dark theme.
- **settings.tsx** — **light theme** (`#F4F6FB` bg, purple `#6C5DD3` accent). Name editor, intensity picker, retro/morning call time rows, avoidance habits link, sign out (with confirmation, also clears `bypass_auth`).
- **avoidance.tsx** — **light theme** with purple accent. Add/list/remove avoidance habits with "X days clean" counter.
- **call.tsx** — full-screen ambient gradient + 220px pulsing VoiceBall + scrolling cinematic transcript (3-line fade) + Mute / End Call. Auto-starts Gemini session.

### Services
- `src/services/supabase.ts` — typed client + PKCE + SecureStore session.
- `src/services/auth.ts` — Apple/Google OAuth (expo-web-browser) + magic-link.
- `src/services/goals.ts` — fetchGoalsWithSchedules, fetchTodayTimeline, createGoal, archiveGoal. **Web bypass mode**: full mock-data layer via `localStorage.mock_goals` / `mock_schedules`.
- `src/services/profile.ts` — fetch + update + sign out. **Web bypass mode**: returns a mock profile (`Samantha`, firm intensity, etc.).
- `src/services/retros.ts` — fetchRetros by type.
- `src/services/avoidanceGoals.ts` — list/add/deactivate.
- `src/services/velocity.ts` — rolling 7-day completion % from real check_ins. **Web bypass mode**: returns a hardcoded 92% when goals exist (for design verification).
- `src/services/prompts.ts` — composeSystemPrompt (full) + buildShowupPrompt (quick shim).
- `src/services/voiceSession.ts` — Gemini Live wrapper: token fetch → WebSocket → audio in/out + transcripts + state events.
- `src/services/alarmScheduler.ts` — JS bridge to native ShowupAlarm. Safely no-ops when native module unavailable.
- `src/services/onboardingComplete.ts` — transactional finish: profile + goals + schedules + `onboarding_completed_at`. **Per-goal `scheduledTime` is now respected** (replaces naive index mapping); falls back to scheduleTimes pool then '08:00'. Calls syncAlarms.
- `src/services/sentry.ts` — Sentry init (no-op without DSN).
- `src/hooks/useVoiceSession.ts` — React hook wrapping VoiceSession. **Now drives native audio session**: calls `ShowupAlarm.startAudioSession`, subscribes to `onAudioCapture` for mic streaming, calls `playAudioChunk` on every `onAudioOut`. Handles interruption by stop + restart.
- `src/store/onboarding.ts` — global state via useSyncExternalStore. **`goals[]` items now carry per-goal `scheduledTime?: string`**.

### Native module (Autolinked & Compiled)
- `modules/showup-alarm/` — cross-platform native wrapper:
  - **Android (Kotlin)**:
    - `ShowupAlarmModule.kt` — JS API (scheduleAlarm, cancelAlarm, rearmAllAlarms, openOemAutostartSettings, getDeviceManufacturer)
    - `AlarmReceiver.kt` — broadcast receiver
    - `VoiceCallService.kt` — ForegroundService(mediaPlayback) with audio focus
    - `BootReceiver.kt` — re-arms on boot / clock change / timezone change
    - `OemAutostart.kt` — deep-links into Xiaomi/Samsung/OPPO/Vivo/OnePlus/Huawei autostart managers
  - **iOS (Swift)**:
    - `ShowupAlarmModule.swift` — PushKit VoIP registry delegate + CallKit CXProvider delegate
    - `ShowupAlarm.podspec` — Cocapods package bindings
  - **Status: Autolinking fully configured** in `package.json` (`searchPaths`) and `settings.gradle`. Compiles cleanly under Android Gradle wrapper build (`gradlew.bat compileDebugSources` -> `BUILD SUCCESSFUL in 9m 39s`). Fully typechecked.

### Build infrastructure
- **EAS Build configured** — `eas.json` with development / preview / production profiles. Preview APKs successfully built and installed on physical Android + emulator.
- **Local Gradle debug build works** — `expo prebuild` + `gradlew :app:assembleDebug` on host machine, ~2 min cycle, connects to Metro via `adb reverse tcp:8081`.
- **Android emulator** — Pixel 7 AVD (API 34) configured. APK installs + launches successfully.
- **Corp environment workarounds (all in place):**
  - Zscaler root cert imported into JDK truststore at `C:\Users\KrishnaDachepalli\gradle-cacerts`
  - Local Gradle 8.10.2 distribution cached
  - foojay-resolver plugin cached locally
  - `NODE_EXTRA_CA_CERTS=C:\Users\KrishnaDachepalli\zscaler-root.pem` for `eas-cli`

### Verified end-to-end on emulator + physical phone
- ✅ Splash → welcome → voice ball animation renders beautifully
- ✅ Auth screen loads (after expo-crypto fix)
- ✅ Magic-link email send works
- ✅ Bottom tab navigation
- ✅ Home screen reads real Supabase data
- ✅ Web dev bypass mode (`localStorage.bypass_auth = true`) — full mock-data flow for UI iteration without a backend round-trip

### Other shipped
- `experiments/gemini-voice-demo/` — Node server validating Gemini Live end-to-end (Telugu language tested).
- `experiments/ui-prototype/v3.html` — design reference for VoiceBall + home screen.
- `docs/UI-SPEC.md` — full end-to-end dashboard & navigation UI design spec (pasteable into v0/Claude artifacts/Figma AI).
- `conversation.md` — full chat-history export (692 KB) via `scripts/export-conversation.mjs`.

---

## Tier-1 (must finish before any TestFlight push)

1. **Wire native alarm module into build** (Shipped ✅)
   - Android Exact AlarmManager clocks and boot re-arming fully active.
   - iOS CallKit and PushKit native modules linked and integrated.
   - Project successfully compiles under Gradle debug checks (`BUILD SUCCESSFUL in 9m 39s`).

2. **Audio capture / playback** (Shipped ✅)
   - Native Android `AudioRecord` (16kHz capture) and `AudioTrack` (dynamic speaker stream) bridge implemented inside `ShowupAlarmModule.kt`.
   - Native iOS `AVAudioEngine`, `AVAudioPlayerNode` (dynamic mixer connect), and `AVAudioConverter` resampler tap (up/down sampling) implemented inside `ShowupAlarmModule.swift`.
   - Integrated into React `useVoiceSession.ts` stream hooks with dynamic sample rates and instant interruption resets.

3. **Smart per-goal schedule UX** (Shipped ✅)
   - AI suggested times parsed dynamically based on goal title keywords.
   - Interactive manual timing overrides and customized TimePickerWidgets inline.
   - Natural spoken command text input simulator parsing targets/times.

4. **Real test-call flow** (Shipped ✅)
   - Local on-device exact alarm diagnostics HUD checks on Android.
   - Simulated CallKit system incoming call sheet sheets triggered on iOS test clicks.

5. **iOS path** (Shipped ✅)
   - Custom CallKit + PushKit Swift delegate integrations.
   - APNs JWT signing (.p8) and Deno HTTP/2 gateway VoIP push requests.
   - pg_cron registered to run minute-by-minute checks.

---

## Tier-2 (post-Android-MVP)

- Onboarding: actually request OS permissions on the permissions screen (currently the "Grant" buttons are no-ops).
- SOS shortcut native module (iOS App Intents + Android Quick Settings Tile).
- In-app voice command parsing ("add a new goal: drink water at 8am, 1pm, 6pm").
- Reschedule one-day override UI ("push gym to 8pm today").
- Snooze counter handling in the call screen (max 3 snoozes).
- Google Calendar OAuth + sync edge function.
- Post-call Smart Summary Card overlay (5-sec auto-dismiss).
- Sentry DSN + sourcemap upload setup.
- Time pickers in settings (currently static rows).

---

## Tier-3 (after 50-user beta)

- Notion + Gmail OAuth.
- Embeddings ingest + RAG for "chat with my data".
- Gemini Live + video share.
- Framework expansion (Stoicism, Essentialism, GTD, Pomodoro, etc.).
- Cohort / community features.
- RevenueCat + paid tier.

---

## Known gaps / "not what the spec says yet"

- **Theme migration in progress.** Light theme (`#F4F6FB` bg, purple `#6C5DD3` accent, white cards, navy `#1E1B4B` text) is now the **locked direction**. Settings + Avoidance ship the new theme. Home / Goals / Retros / Call / Onboarding still need to be migrated from dark Gemini to light. Treat dark-themed screens as legacy until ported.
- **Per-day toggles still pending.** AI per-goal time suggestion is shipped and per-goal `scheduledTime` is persisted, but per-day-of-week customization (M/T/W/T/F/S/S toggles per schedule) still defaults all schedules to all 7 days.
- **No goal detail sheet yet.** Tapping a goal card in Goals tab does nothing; spec calls for a detail sheet with 7-day dot row + coach-narrative ("Strong on weekdays. Wednesday is fragile."). See UI-SPEC.md "Metrics — the narrative-aware middle path".
- **No per-goal completion ring on Goals cards.** Locked spec adds a small static-month-completion ring (no streak counter). Not yet implemented.
- **Home dashboard polish items** flagged in review:
  - "Goal Coaching" placeholder framework label appears instead of actual framework when none is set
  - Active timeline pill could use stronger visual emphasis (glow ring, scale)
  - Tapping pill goes straight to call (should open goal detail sheet first)
  - Voice ball "eyes" / face dots — keep-or-kill decision pending
  - Week selector is visually heavy; could slim or hide-by-default
  - Escape button copy "+ Dims calls (no streak loss)" reads jargony
- **End-to-end real call has not yet been recorded.** Native module compiles and the audio pipeline is in place, but a verified real-world call from alarm-fire → Gemini Live audio session → outcome write to `check_ins` is still pending in-the-wild verification.
- **Web auth has a dev bypass** — guarded by `localStorage.bypass_auth = true`. Must remove before public launch.
- **Velocity** displays real data from `check_ins`, but the table is empty until first real call lands. Web bypass mode hardcodes 92% for design verification.
- **APNs VoIP `.p8` private key not yet uploaded** to Supabase secrets; iOS scheduled push pipeline ready to flip on once cert + key are obtained from the Apple Developer account.

---

## Open decisions

- **App name** — "Showup" through closed beta; locks at ~50 users or public launch.
- **Voice selection** — Gemini voice ID pick after first beta wave.
- **Pricing** — $15–25/mo target; gross cost $3.50–$7/mo (Gemini Live dominant).
- **Sentry signup** — when to wire DSN + auth token (after first user-facing bug we can't repro).
- **Theme — LOCKED light.** All screens migrate to light theme: bg `#F4F6FB`, primary accent purple `#6C5DD3`, cards `#FFFFFF` with subtle purple-tinted shadow, text primary `#1E1B4B`, text secondary `#6B7280`. Voice ball stays as-is (its glass plasma works on light too with a soft purple halo).
- **Voice ball face dots** — keep (friendly mascot personality) or remove (pure premium plasma orb).
- **Metrics philosophy (locked, do not re-litigate)** — small static completion ring on goal cards + 7-day dot row on goal detail sheet + coach-generated narrative pattern lines. Explicitly NO calendar heatmap, NO streak counters, NO weekly/monthly bars, NO leaderboards.
