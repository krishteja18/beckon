# Showup — Dashboard & Navigation UI Spec

A pasteable, end-to-end design prompt for the entire authenticated user experience: the 4 main tabs (Home / Goals / Retros / Settings) plus the modal screens (Call, Avoidance). Use this with v0.dev, Claude artifacts, Figma AI, or a designer.

Last updated: 2026-06-04.

---

## The prompt

> Design the complete authenticated dashboard for **Showup**, a voice-first AI goal coach. The user has just finished onboarding and lands on the home screen. The aesthetic is **soft, light, premium pastel** — off-white canvas with subtle purple tints, white glass cards with whisper-soft purple-tinted shadows, navy text, and one premium animated voice orb (the only deep-color element). Calm, productive, never austere.

### Design system (LOCKED — light theme)

**Background palette:**
- `bg` `#F4F6FB` — soft off-white canvas (primary background, never pure white)
- `bg-2` `#FFFFFF` — pure white card / elevated surface

**Accent colors:**
- `primary` `#6C5DD3` — soft electric purple. Used for CTAs, active states, links, focus rings, header accent.
- `primary-soft` `rgba(108, 93, 211, 0.08)` — purple wash for active backgrounds
- `primary-border` `rgba(108, 93, 211, 0.15)` — purple tint for borders on active elements
- `voice-purple` `#a855f7` — voice ball halo / shadow glow (slightly brighter than primary)
- `success` `#10B981` — green check / done states
- `warn` `#F59E0B` — amber for warnings (sparingly)
- `danger` `#EF4444` — red for destructive actions (sign out, archive)

**Text:**
- `text-1` `#1E1B4B` — primary, deep navy. High contrast on the off-white canvas.
- `text-2` `#6B7280` — secondary, neutral gray for meta and descriptions
- `text-3` `#9CA3AF` — tertiary, very light gray for placeholder + faint labels

**Surfaces (cards):**
- `backgroundColor: '#FFFFFF'`
- `borderWidth: 1, borderColor: rgba(108, 93, 211, 0.08)` — sub-pixel purple-tinted hairline
- `borderRadius: 14–18` depending on size
- Soft purple-tinted drop shadow: `shadowColor: '#6C5DD3', shadowOffset: (0, 4), shadowOpacity: 0.03, shadowRadius: 10, elevation: 2`
- Active state: bump border to `rgba(108, 93, 211, 0.25)` and tint bg to `rgba(108, 93, 211, 0.04)`

**Typography:**
- Headings: Inter 600 SemiBold or Inter 300 Light depending on weight, tight tracking (`-0.6` to `-1`)
- Body: Inter 400 Regular
- Strong: Inter 500/600
- Time/numbers/code: JetBrains Mono 400/500
- The hero "next call" time uses Inter 200/300 at 64-78px (slightly bolder than the dark version since light bg needs more weight)

**Voice orb (the hero element — must appear on Home + Welcome + Call screens):**
- Skia-rendered glass plasma orb with 3 fluid bands × 8 bloom passes + 2 caustic blobs + glass rim + specular highlight
- States: idle (slow blue swirl), listening (faster cyan), processing (purple), speaking (magenta-pink, larger pulse)
- Always blue palette across all states; speed + intensity vary
- 88px on home (anchored bottom), 220px on call screen, 180px on welcome

---

### Screen 1: Home (Timeline view)

The dashboard's primary screen. **One thing at a time. The next call is the focus. Everything else recedes.**

**Layout top-to-bottom:**

1. **Status bar area** — system, no chrome.

2. **Header row** (padding 24px horizontal, 24px top, 16px bottom):
   - Left: Today's date as plain text. "Wed, Jun 4" — Inter 400, 12px, color text-2.
   - Right column: rolling 7-day velocity %. Number in JetBrains Mono 500, 14px, color `#6C5DD3`. Below: tiny uppercase label "7-DAY VELOCITY" — JetBrains Mono 400, 9px, letter-spacing 1px, color text-3.

3. **Hero section — next call** (flex-1, centered vertically, padding 24px):
   - Eyebrow row: 16px-wide horizontal line `text-3` + small uppercase label "NEXT CALL" — Inter 500, 9px, letter-spacing 1.4px.
   - Time: **78px Inter 100 Thin, letter-spacing -3.5**, e.g. "6:00" + inline 20px Inter 300 Light "PM" with vertical-align middle. Color text-1.
   - Goal title: "Gym Session" — 23px Inter 300 Light, letter-spacing -0.5, opacity 0.85.
   - Meta row: framework + countdown — 12px Inter 400, color text-2. The countdown text "34 min away" is colored `#6C5DD3` 75% opacity for emphasis.
   - Day arc: a 2px tall horizontal progress bar, full width minus padding, with text-3 background and a gradient fill from `rgba(108, 93, 211, 0.15)` to `#6C5DD3`. To the right: "67%" in JetBrains Mono 400, 10px, color text-3. The arc represents % of waking day elapsed.

4. **Hairline divider** — 1px, color `rgba(108, 93, 211, 0.08)`, margin 24px horizontal.

5. **Timeline strip** (horizontal scroll, padding 14px vertical, 24px horizontal):
   - One pill per scheduled call today.
   - Pill dimensions: 92px min-width, 14px border-radius, 16px horizontal padding, 12px vertical padding.
   - States:
     - **Done**: 28% opacity, no border, plain transparent bg, 5px green dot `rgba(134,239,172,0.5)`.
     - **Active/Live**: bg `rgba(108, 93, 211, 0.04)`, border `rgba(108, 93, 211, 0.2)`, dot `#6C5DD3` with soft glow.
     - **Upcoming**: transparent bg, border `rgba(108, 93, 211, 0.08)`, dot `text-3`.
   - Content stacked vertically inside pill: time (JetBrains Mono 500, 10px), dot (5px circle, my-1.5), goal name (Inter 400, 10px center-aligned).
   - Tappable: routes to call screen with that goal preloaded.

6. **Hairline divider** — same as above.

7. **Bottom action zone** (padding 20px horizontal, 14px top, 42px bottom, gap 18px, items center):
   - Row of two **escape buttons** (full width, gap 10px):
     - "Rough Day" and "Hit a Wall"
     - Each: bg `#FFFFFF`, border `rgba(108, 93, 211, 0.08)` 1px, border-radius 13px, vertical padding 11px, centered text Inter 400 11.5px color text-2.
     - "Hit a Wall" navigates to call screen with `type=wall`.
   - **Voice ball with label** (centered, gap 8px):
     - Tiny uppercase JetBrains Mono 400 9px label above the ball. States: "tap to speak" / "listening..." / "thinking..." / "speaking". Color animates from text-3 (idle) to `rgba(108, 93, 211, 0.75)` (active).
     - 88px Skia VoiceBall below. Tapping cycles through states for demo / launches a real session in production.

8. **Bottom tab bar** — see Navigation section below.

**Empty state:** if no goals exist, replace the timeline strip with a single small link: `"+ Add your first goal"` — Inter 400 13px color `rgba(108, 93, 211, 0.7)`, padding 20px vertical 24px horizontal. Tapping routes to Goals → Add flow.

**Loading state:** ActivityIndicator color `#6C5DD3`, centered in the hero area while data fetches.

**Done-for-today state:** hero shows "All done for today" (28px Inter 300 Light) with subtext "Evening retro coming up." (14px Inter 400 text-2).

---

### Screen 2: Goals

**Header row:**
- Title "Goals" left, 28px Inter 300 Light, letter-spacing -1.
- Right: "+ Add" pill button. 14px Inter 500, color `#6C5DD3`, bg `rgba(108, 93, 211, 0.08)`, border `rgba(108, 93, 211, 0.2)` 1px, border-radius 99px, padding 7×14.

**Goal cards (scrollable list):**
- Each card: bg `#FFFFFF`, border `rgba(108, 93, 211, 0.08)`, border-radius 18, padding 18.
- Top row: goal title (17px Inter 500) + small × close button (color `#9CA3AF`, padding 4) that triggers archive confirmation.
- Below title: framework label (12px Inter 400 text-2) — "Atomic Habits", "Ikigai", "Deep Work".
- Schedule chips row (gap 8, wrap): one chip per scheduled time. Each chip: bg `rgba(108, 93, 211, 0.06)`, border `rgba(108, 93, 211, 0.15)`, border-radius 99px, padding 5×10. Text JetBrains Mono 500 11px color `rgba(103,232,249,0.8)` like "6:30 AM".

**Empty state:** centered "No active goals yet. Tap + Add to get started." 16px Inter 300 Light text-2 with line-height 24.

---

### Screen 3: Retros

Text-only summaries, no charts (deliberate — voice is the source of truth, words show intelligence).

**Header:**
- "Retros" title (same as Goals).
- Subtitle: "Patterns the coach noticed." 13px Inter 400 text-2.

**Tab row (below header):**
- Three pills: Daily / Weekly / Monthly.
- Active pill: bg `rgba(108, 93, 211, 0.08)`, border `rgba(108, 93, 211, 0.25)`, color `#6C5DD3`. Inactive: transparent + 1px `rgba(108, 93, 211, 0.08)` border, color text-2. 12px Inter 500.

**Retro cards (scroll list, gap 12):**
- bg `#FFFFFF`, border `rgba(108, 93, 211, 0.08)`, padding 18, border-radius 16.
- Date eyebrow: "JUN 3" — JetBrains Mono 500 10px letter-spacing 1.2 text-2.
- Summary text below: 14px Inter 400 text-1 line-height 22.

**Empty state:** "No daily retros yet. They'll appear after your first evening retro call." centered, 14px Inter 300 Light text-2 70%.

---

### Screen 4: Settings

**Header:** "Settings" 28px Inter 300 Light. No subtitle.

**Sections** (gap 24 between sections):

Each section has a small uppercase label above its content: JetBrains Mono 500 10px letter-spacing 1.2 color `#6B7280`.

1. **"COACH CALLS YOU"** — text input for display name. Bg `#FFFFFF`, border `rgba(108, 93, 211, 0.08)` 1px, border-radius 14, padding 14×16. Text Inter 500 15px color text-1.

2. **"COACHING INTENSITY"** — row of 3 segmented pills: Gentle / Firm / Drill. Pill border-radius 14, padding 12 vertical. Active: bg `rgba(108, 93, 211, 0.06)`, border `rgba(108, 93, 211, 0.4)`, label color `#6C5DD3`. Inactive: same glass + text-2.

3. **"EVENING RETRO TIME"** — single Row showing the current time (like "21:30"). Tapping opens an inline 12-hour time picker (hour-up/down chevrons + minute-up/down + AM/PM toggle, identical to the schedule.tsx widget).

4. **"MORNING SYNC TIME"** — same Row pattern as retro time.

5. **"AVOIDANCE HABITS"** — single Row "Manage avoidance habits · Sugar, Instagram, etc." → navigates to the avoidance screen.

6. **"ACCOUNT"** — single Row "Sign out" in red `#EF4444`. Confirmation alert before signing out.

**Footer:** "Showup v0.1 · beta" — 11px Inter 400 text-3, centered, margin-top 16.

---

### Screen 5: Avoidance (modal pushed from Settings)

A back-link at the top: "← Settings" in `rgba(108, 93, 211, 0.8)`, 14px Inter 500.

**Header:** "Avoidance habits" — 28px Inter 300 Light. Subtitle: "Things you're trying to cut out. The coach asks about these every evening — no standalone alarms."

**Add input row:**
- TextInput full width minus add button. Placeholder "e.g. sugar, Instagram, alcohol..."
- Right: "Add" button. Same active/inactive pattern as the schedule cyan chips.

**List:** each item is a card showing title (15px Inter 400) + days-clean counter ("3 days clean" or "starting today") in JetBrains Mono 400 11px text-2. Right side: × button to deactivate (with confirmation).

**Empty state:** centered, "No avoidance habits yet. Type one above to start tracking."

---

### Screen 6: Call (modal, slides up from bottom)

This is the active voice call screen.

**Background.** Soft off-white `#F4F6FB` with a very subtle radial purple wash from the top (`rgba(108, 93, 211, 0.04)` fading to transparent). Calm, not dark. The voice orb provides the only deep color.

**Layout, vertical, centered:**

1. **Top — call type + goal name:**
   - Eyebrow: "MORNING · INTENTION" / "MIDDAY · CHECK-IN" / "EVENING · REFLECT" / "WALL · RESCUE" — JetBrains Mono 500 10.5px letter-spacing 2 color `#6C5DD3` 85% opacity.
   - Goal title: 24px Inter 300 Light letter-spacing -0.6, centered, color text-1 (`#1E1B4B`).

2. **Center — the big voice orb (220px):**
   - `VoiceBall` with a soft purple halo (color `#a855f7`, offset 0/12, opacity 0.35, radius 24).
   - Below: state label JetBrains Mono 500 11px uppercase letter-spacing 2. Color animates based on state:
     - connecting: text-2
     - listening: `#10B981` (success green)
     - thinking: `#6C5DD3` (purple)
     - speaking: `#A855F7` (brighter voice-purple)

3. **Transcript area (max-height 110, scrollable):**
   - Last 3 lines of the conversation. Each line center-aligned 13px Inter 400 line-height 18.
   - Fading opacity: latest line 0.95 (color text-1), second-latest 0.55, oldest 0.30.
   - If empty: "Waiting for conversation to begin..." in text-3.

4. **Controls (bottom, row of 2 buttons, full width minus padding):**
   - "Mute" — neutral white card with `rgba(108, 93, 211, 0.08)` border. Inter 500 14.5px text-1.
   - "End Call" — danger tone. Bg `rgba(239, 68, 68, 0.06)`, border `rgba(239, 68, 68, 0.18)`. Text `#EF4444`.

---

### Navigation: Bottom tab bar

Present on all (app) screens, hidden on call modal and onboarding.

**Container:**
- bg `#FFFFFF`
- borderTopColor `rgba(108, 93, 211, 0.08)`, borderTopWidth 1
- height 60 + safe-area bottom inset
- paddingTop 8, paddingBottom = safe-area bottom

**Tab cells:**
- 4 tabs equally spaced: **Today** / **Goals** / **Retros** / **Settings**.
- Active tint color: `#6C5DD3`.
- Inactive tint color: `#9CA3AF`.

**Icons (18px, line-art, currentColor-stroked):**
- **Today** → circle outline (1.5px stroke).
- **Goals** → rounded square outline.
- **Retros** → 3 horizontal lines of varying widths (100% / 70% / 85%).
- **Settings** → circle with center dot (gear glyph).

**Labels:**
- Below icon, 10px JetBrains Mono 500, letter-spacing 0.5, uppercase.

**Active state:** label and icon both transition to `#6C5DD3` over 200ms.

The Avoidance screen is in the (app) folder but **hidden from the tab bar** (`href: null` in expo-router Tabs.Screen options).

---

### Microinteractions / animations

- All screens fade in on mount (200ms ease).
- Voice orb idle state has a 4s breathing pulse.
- Active timeline pill has a soft inner glow that pulses with the live call clock.
- "Hit a Wall" tap → momentary blue ring on the button, then push modal.
- "Rough Day" tap → confirmation sheet → afterward the day's timeline cards fade to 0.4 opacity.
- Voice orb tap → 200ms scale 1 → 1.05 → 1.
- Tab switch → 250ms fade + 8px y-translate.

### Accessibility

- All interactive elements: min hit area 44×44.
- Color contrast: text-1 on bg passes WCAG AA. text-2 and text-3 are intentionally low-contrast for hierarchy but only used for non-essential info.
- Voice orb has no semantic meaning for screen readers — provide an aria-label "Tap to start voice session, current state: [state]".
- Dynamic Type respected via React Native's allowFontScaling default.

### Edge cases the design must handle

- 0 goals → home shows empty-state CTA.
- 12 goals with 30 schedules → timeline strip scrolls horizontally smoothly.
- Active call ringing in background → home is dimmed and shows a pulsing pill at the top "Live call · Gym Session · Tap to return".
- Offline → silent fallback. Velocity % shows "—". Timeline still renders cached data.
- First-time user (no check_ins yet) → velocity shows "—" instead of "0%" (which would feel like a fail-state).

---

## End of prompt

The above is intended to be a single, contiguous design brief. Paste it into v0.dev / Claude artifact / Figma AI to generate a high-fidelity mockup or component implementation.

For the actual React Native implementation, refer to:
- [src/components/VoiceBall.tsx](../src/components/VoiceBall.tsx)
- [src/components/AmbientBackground.tsx](../src/components/AmbientBackground.tsx)
- [src/components/OnboardingFrame.tsx](../src/components/OnboardingFrame.tsx)
- [app/(app)/home.tsx](../app/(app)/home.tsx) (timeline view)
- [app/(app)/_layout.tsx](../app/(app)/_layout.tsx) (tab bar)
- [app/call.tsx](../app/call.tsx) (call modal)
- [tailwind.config.js](../tailwind.config.js) (color tokens)

---

## Metrics — the narrative-aware middle path

The locked spec rejects traditional habit-tracker metrics (streak counters, calendar heatmaps, monthly bar charts) because:
1. They enable the "what-the-hell effect" (miss one day → streak resets → user churns).
2. They compete with the voice ball for visual primacy on the home screen.
3. They pivot Showup toward a commodity "habit dashboard" category.
4. The coach IS the metric — Gemini surfaces patterns during retros via narrative.

**However**, raw text cards on the Goals tab feel thin. The compromise is a scoped, narrative-aware visual layer that lives only on goal-management surfaces, never on the home/timeline.

### Where metrics may appear

**Goals tab — small completion ring on each goal card (28px):**
- Shows current calendar month's completion percentage as a static donut
- NOT a streak counter
- Sits to the left of the goal title

```
┌─────────────────────────────────────┐
│ ◐ 71%   Gym Session            ×   │
│         Atomic Habits               │
│         [6:30 AM] [Mon-Fri]         │
└─────────────────────────────────────┘
```

**Goal detail sheet (opens when user taps a goal card — does not exist yet):**
- 7-day dot row showing recent history. Green = done, hollow = missed, blue = today/upcoming.
- One narrative pattern line below the dots, generated by the coach.

```
Gym Session
Atomic Habits · 6:30 AM Mon-Fri

LAST 7 DAYS
●   ●   ○   ●   ●   ●   ⊙
M   T   W   T   F   S   Today

"Strong on weekdays. Wednesday is fragile."
                                — Coach
```

### Where metrics must NOT appear

- ❌ Home/Timeline tab — voice ball is the visual hero; nothing competes
- ❌ Retros tab — text-only narrative (already locked)
- ❌ Settings tab — functional, not motivational

### Explicitly excluded forever

- Calendar heatmap (GitHub-for-habits) — too "streaks app"
- Streak counter / current streak / longest streak — enables what-the-hell effect
- Weekly or monthly completion bar charts — vanity metric
- Per-goal pie chart of "time spent" — invented stat
- Leaderboards or social comparison — Showup is not gamified
- "Best day of week" badge — would create pressure on that specific day

The principle: **the ring + dot row are read-only context**, never an achievement to chase. Voice + narrative remains the primary lens.
