# Showup — Status & Punch List

Last updated: 2026-05-24.

## Shipped

### Backend
- Supabase schema (migrations 0001–0008): 12 tables, RLS, frameworks seed, goal_schedules, avoidance_goals, schedule_overrides, retro_type, morning_sync_time, snooze_count, voice_token_log. All applied to cloud project `otamjpxbfesbxzyeoaec`.
- Edge function `voice-session-token` — deployed and live. JWT auth, 10-tokens/hour rate limit, returns Gemini API key + model + TTL.
- Helper scripts at `scripts/apply-migration.mjs`, `scripts/supabase-query.mjs`, `scripts/generate-types.mjs` (curl-based to handle Zscaler corp TLS).
- `database.types.ts` regenerated with all new tables (~20k chars).

### App scaffold
- Expo SDK 52 + React Native 0.76 + TypeScript + expo-router v4.
- NativeWind 4 + Tailwind config (custom palette: bg, blue, text-1/2/3, line).
- @shopify/react-native-skia + react-native-reanimated + react-native-gesture-handler.
- @expo-google-fonts/inter + jetbrains-mono.
- expo-web-browser + expo-auth-session for OAuth.
- Auth gate at `app/index.tsx`: loading → signed-out → onboarding → app.

### UI components
- **VoiceBall** (`src/components/VoiceBall.tsx`) — Skia-based glass plasma orb. 88px default. Blue palette across all 4 states (idle/listening/processing/speaking). 3 fluid bands × 8 bloom passes + 2 caustic blobs + glass rim + specular highlight. State only changes speed/intensity, never color.
- **OnboardingFrame** (`src/components/OnboardingFrame.tsx`) — shared chrome for all 9 onboarding screens (step dots, eyebrow, title, subtitle, primary/secondary CTAs).

### Screens — onboarding flow (all 9 wired)
1. `welcome.tsx` — hero + VoiceBall
2. `auth.tsx` — Apple / Google OAuth + magic-link email
3. `name.tsx` — text input → onboarding store
4. `intensity.tsx` — gentle/firm/drill picker
5. `framework.tsx` — Atomic Habits / Ikigai / Deep Work
6. `goals.tsx` — up to 3 goals
7. `schedule.tsx` — time chip picker
8. `retro-time.tsx` — evening retro time picker
9. `permissions.tsx` — mic/alarm/notification/battery deep links
10. `test-call.tsx` — final commit via `commitOnboarding()` → routes to `/(app)/home`

### Screens — app
- `home.tsx` — date + velocity %, hero (next call from real timeline), day arc, horizontal timeline strip, rough day + hit-a-wall buttons, anchored VoiceBall. Reads real data from Supabase via `fetchTodayTimeline()`. Tappable slots route to call screen.
- `goals.tsx` — list of active goals with framework + schedule chips, archive with confirmation, + Add button.
- `retros.tsx` — daily/weekly/monthly tabs, narrative summary cards, empty states.
- `settings.tsx` — name, intensity, retro time, morning sync time, avoidance habits, sign out.
- `call.tsx` — active call screen with VoiceBall (200px), live transcript, mute/end controls. Auto-starts Gemini session via `useVoiceSession` hook.
- Bottom tab nav (`(app)/_layout.tsx`) — Today / Goals / Retros / Settings.

### Services
- `src/services/supabase.ts` — typed client + PKCE auth + SecureStore session.
- `src/services/auth.ts` — Apple/Google OAuth (expo-web-browser) + magic-link email.
- `src/services/goals.ts` — fetchGoalsWithSchedules, fetchTodayTimeline, createGoal, archiveGoal.
- `src/services/profile.ts` — fetch + update + sign out.
- `src/services/retros.ts` — fetchRetros by type.
- `src/services/prompts.ts` — composeSystemPrompt (full) + buildShowupPrompt (quick shim).
- `src/services/voiceSession.ts` — client-side Gemini Live wrapper: token fetch → WebSocket → audio in/out + transcripts + state events.
- `src/services/onboardingComplete.ts` — transactional finish: profile + goals + schedules + onboarding_completed_at.
- `src/hooks/useVoiceSession.ts` — React hook wrapping VoiceSession.
- `src/store/onboarding.ts` — global state via useSyncExternalStore.

### Other shipped
- `experiments/gemini-voice-demo/` — Node server validating Gemini Live end-to-end (Telugu lang support added too).
- `experiments/ui-prototype/v3.html` — design reference for VoiceBall + home screen.

## Tier-1 (must finish before any TestFlight push)

1. **Custom Expo Module — Android auto-start voice calls** ← TOP PRIORITY
   - Wraps `AlarmManager.setAlarmClock()` + `ForegroundService(mediaPlayback)` + audio focus + Gemini Live WebSocket + outcome persistence.
   - Resilience: `BOOT_COMPLETED` receiver + `ACTION_TIME_CHANGED`/`ACTION_TIMEZONE_CHANGED` receivers + in-app foreground catch-up.
   - OEM onboarding deep-links (Xiaomi, Samsung, OPPO, Vivo).
   - **Expo Dev Client build is currently blocked on Zscaler corp TLS** for Maven repos. Workarounds applied (Zscaler cert imported, foojay plugin cached, local Gradle dist). Pending verification.

2. **Custom Expo Module — iOS CallKit + PushKit voice calls**
   - VoIP push (server-triggered) → CallKit screen → custom voice ringtone → Siri Announce Calls "Answer" → Gemini.
   - Requires: APNs VoIP cert, PushKit entitlement, Xcode (deferred until Android works).

3. **`scheduled-call-trigger` update** — repurpose to send APNs VoIP pushes for iOS users. Register pg_cron after deploy.

4. **Audio capture / playback** — native module work; web demo proves the protocol.

5. **Real Supabase RPC for find_due_goal_calls + batching** — both ship in migrations 0006/0007; logic in `scheduled-call-trigger` still mock for iOS path.

## Tier-2 (post-Android-MVP)

- Onboarding: actual permission grants (currently just nav, not requesting OS prompts).
- Avoidance habits add/list UI (voice-driven + manual).
- SOS shortcut native module (iOS App Intents + Android Quick Settings Tile).
- In-app voice command parsing ("add a new goal: drink water at 8am, 1pm, 6pm").
- Reschedule one-day override UI.
- Snooze counter handling in the call screen.
- Streak velocity % computed from real check_ins (currently hardcoded 92%).
- Google Calendar OAuth + sync edge function.
- Test call wiring (actually fire an alarm 5 sec later from onboarding).
- Post-call Smart Summary Card overlay (5-sec auto-dismiss).

## Tier-3 (after 50-user beta)

- Notion + Gmail OAuth.
- Embeddings ingest + RAG for "chat with my data".
- Gemini Live + video share.
- Framework expansion.
- Cohort / community features.
- RevenueCat + paid tier.

## Open decisions

- **App name** — "Showup" through closed beta; locks at ~50 users or public launch.
- **Voice selection** — Gemini voice ID pick after first beta wave.
- **Pricing** — $15–25/mo target; gross cost $3.50–$7/mo (Gemini Live dominant).
