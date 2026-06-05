# Showup — Design References

Visual inspiration sources for the light-theme Showup product.

## Primary reference: Health & Fitness Mobile App UI Kit (Behance)

The aesthetic shown in the user's shared screenshot — soft purple (`#6C5DD3`-family) with white glass cards, generous rounded corners, calm pastel backgrounds, and a wellness/coaching feel.

**Lift these patterns:**
- White cards with subtle purple-tinted shadows (`shadowColor: #6C5DD3`, low opacity)
- Soft purple background washes — never fully white, never gray
- Big circular progress indicators on goal/habit cards
- Clean, generous whitespace
- Inter/SF-style typography
- Pill chips for tags and schedule times

**Skip these (don't fit Showup):**
- Social feeds (we're not a social app)
- Step-counter / pedometer UI (we're voice-first, not biometric)
- Calorie tracking / nutrition logging (out of scope)
- Music podcast players (different category)
- Calendar event entry (we deliberately don't integrate calendar)

## Color palette (locked, matches that aesthetic)

| Role | Hex |
|---|---|
| Canvas bg | `#F4F6FB` |
| Card | `#FFFFFF` |
| Primary purple | `#6C5DD3` |
| Voice halo purple | `#a855f7` |
| Text primary (navy) | `#1E1B4B` |
| Text secondary | `#6B7280` |
| Text tertiary | `#9CA3AF` |
| Success | `#10B981` |
| Danger | `#EF4444` |
| Card border | `rgba(108, 93, 211, 0.08)` |

See [`docs/UI-SPEC.md`](UI-SPEC.md) for the full surface and screen specs.
