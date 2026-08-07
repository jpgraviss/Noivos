# Noivos — Design System

**Status:** Draft v1.0 — awaiting founder sign-off
**Phase:** 4 of the Documentation Roadmap (see `docs/README.md`)
**Last updated:** 2026-08-02
**Source of truth precedence:** Downstream of Brand Guidelines (`docs/03 UX/Brand Guidelines.md`) for visual language and the UX/UI Blueprint (`docs/03 UX/UX-UI Blueprint.md`) for structure/flow. This document turns both into concrete, buildable tokens and component specs. It is still documentation — no code is written yet; see §9 for what happens next.

> Four items were confirmed by the founder immediately before this draft, since they'd otherwise get silently baked into components: icon library (Lucide), Success/Warning color reuse (Sour Lime / Citrus), Wedding Mode's tab relabeling behavior, and Weekly Money Meeting's Home-card placement. All are treated as locked below.

---

## 1. Purpose & Scope

A single shared component library and token set for `packages/ui`, used by both the mobile app and the web app so nothing gets rebuilt twice per `PROJECT_MEMORY.md`'s "never duplicate UI" rule. This document defines tokens (color, type, spacing, radius, elevation, motion) and core component anatomy/states. It does not include production Figma files, final illustration/logo assets, or actual code — those are the concrete first tasks once this document is approved (§9).

## 2. Color Tokens

Semantic tokens map to the palette locked in Brand Guidelines §5, so components reference roles (`color.success`) rather than raw hex values (`#C6FF00`) — this is what lets dark/light mode and future palette tweaks happen without touching component code.

| Token | Light mode | Dark mode (primary) |
|---|---|---|
| `color.background` | Sour Cloud `#F5F5F7` | Licorice `#0D0D0F` |
| `color.text.primary` | Licorice `#0D0D0F` | Sour Cloud `#F5F5F7` |
| `color.primary` | Sour Lime `#C6FF00` | Sour Lime `#C6FF00` |
| `color.secondary` | Sour Punch `#FF2D8E` | Sour Punch `#FF2D8E` |
| `color.accent` | Electric Blue `#0066FF` | Electric Blue `#0066FF` |
| `color.highlight` | Citrus `#FFE600` | Citrus `#FFE600` |
| `color.info` | Grape `#8A2BE2` | Grape `#8A2BE2` |
| `color.success` | Sour Lime `#C6FF00` | Sour Lime `#C6FF00` |
| `color.warning` | Citrus `#FFE600` | Citrus `#FFE600` |

**Text-on-color enforcement (hard rule, from Brand Guidelines §5.1):** every component that places text or an icon on a color token must pull from the pre-approved pairing below, never an arbitrary choice:

| Background token | Required text/icon color |
|---|---|
| `color.background` | `color.text.primary` |
| `color.primary` (Sour Lime) | Licorice |
| `color.secondary` (Sour Punch) | Licorice |
| `color.accent` (Electric Blue) | Sour Cloud/white |
| `color.highlight` (Citrus) | Licorice |
| `color.info` (Grape) | Sour Cloud/white |
| `color.success` (Sour Lime) | Licorice |
| `color.warning` (Citrus) | Licorice |

**Implementation note:** this table should be enforced in code as a lookup (e.g., a `getTextColorFor(background)` helper), not left to each screen to remember — the whole point of documenting it here is to make the wrong combination structurally hard to ship.

## 3. Typography Scale

Headline font Bebas Neue Bold (condensed, all-caps-friendly, high energy); body font Inter; tabular numbers required wherever currency or counts appear (Brand Guidelines §6).

| Token | Font | Size | Use |
|---|---|---|---|
| `type.display` | Bebas Neue Bold | 40 | Full-screen celebratory moments (goal reached, wedding funded) |
| `type.h1` | Bebas Neue Bold | 32 | Screen titles |
| `type.h2` | Bebas Neue Bold | 24 | Section headers |
| `type.h3` | Bebas Neue Bold | 20 | Card titles |
| `type.bodyLarge` | Inter Regular/Medium | 17 | Primary reading text |
| `type.body` | Inter Regular | 15 | Standard UI text |
| `type.bodySmall` | Inter Regular | 13 | Secondary/meta text |
| `type.caption` | Inter Medium | 11 | Labels, timestamps |
| `type.numeric` | Inter (tabular figures) | matches surrounding body/bodyLarge | Balances, budgets, transaction amounts — always tabular, never proportional figures |

Sizes are a documentation-stage starting point for engineering/design to build against, not a pixel-final spec — fine-tuning happens once real screens are in production.

## 4. Spacing & Layout

4pt base grid: `4, 8, 12, 16, 24, 32, 48, 64`. Matches the Blueprint's "lots of breathing room" UI philosophy (`docs/03 UX/UX-UI Blueprint.md` — Brand Guidelines §14) — components should default to the larger end of this scale rather than the smaller, and screens should earn a tighter spacing value rather than starting from one.

## 5. Corner Radius

| Token | Value | Use |
|---|---|---|
| `radius.small` | 8 | Chips, small badges |
| `radius.medium` | 16 | Cards, input fields |
| `radius.large` | 24 | Large surfaces, modals/sheets |
| `radius.pill` | fully rounded | Primary/secondary buttons, tags — matches the moodboard's pill-button UI elements exactly |

## 6. Elevation

**Design recommendation, not yet founder-confirmed:** traditional soft drop shadows read poorly on a Licorice dark background — recommend a **glow-based elevation model** instead: an elevated surface gets a subtle 1px Sour-Cloud-at-low-opacity border plus a soft glow tinted with whatever accent color is contextually relevant (e.g., a Sour Lime glow on a goal-progress card that just updated). This is a more distinctive, on-brand choice than reusing iOS/Material default shadows, and should be validated visually in Phase 4 execution (first real screens) before being treated as final.

## 7. Motion

Building on Brand Guidelines §10 ("motion should reward, not distract"):

| Token | Duration | Easing | Use |
|---|---|---|---|
| `motion.micro` | 100–150ms | ease-out | Button press, toggle, tab switch |
| `motion.standard` | 200–300ms | ease-in-out | Screen transitions, card expand/collapse |
| `motion.celebratory` | 600–900ms | spring / ease-out-back | Goal reached, partner joined, wedding funded, purchase approved (Brand Guidelines §10 reference moments) |

**Reduce-motion requirement (UX/UI Blueprint §9):** every `motion.celebratory` moment needs a defined reduced-motion fallback that still communicates success without full animation — e.g., a confetti burst reduces to a brief checkmark-and-color-flash rather than disappearing outright. This must be specified per-component, not left as a generic "disable animations" switch, since the goal is to preserve the emotional payoff, not just remove motion.

## 8. Core Components

Anatomy and required states for the components the UX/UI Blueprint's screen inventory (§6) depends on. Each needs: default, pressed/active, disabled, and (where applicable) loading states specified before engineering builds it.

- **Button (Primary / Secondary / Tertiary):** pill radius (§5), text-on-color pairing from §2. Loading state replaces label with a spinner at matched width, never a layout shift. Disabled state reduces opacity, drops any glow (§6).
- **Card** (goal, budget, insight, activity-feed row): `radius.medium`/`radius.large`, houses the ownership indicator (Blueprint §4) in a consistent corner position across every card type so users learn the pattern once.
- **Ownership Indicator / Avatar glyph:** single-avatar glyph = Personal, overlapping double-avatar glyph = Shared (Blueprint §4). Needs a screen-reader label ("Personal" / "Shared with [partner name]") per accessibility (Blueprint §9) — never icon-only with no text alternative.
- **Progress bar / goal ring:** supports the stacked, per-partner-attributed display required for unequal contributions (Blueprint §7 edge case) — must be built as a genuine stacked/multi-segment component from the start, not retrofitted later.
- **Badge/Pill (status, category):** must only use the text-on-color pairings from §2 — no ad hoc combinations.
- **Tab bar:** 5 items (Home, Budget, Goals, AI Coach, More per Blueprint §3.1), with the Goals tab supporting a **relabel state** (icon + label swap to "Wedding" styling while Wedding Mode is active, confirmed 2026-08-02) that must be a first-class variant of the tab bar component, not a hack.
- **Home "ritual" card** (Weekly Money Meeting entry point, confirmed 2026-08-02): a distinct card treatment from standard content cards, since it represents a recurring action to take rather than information to read.
- **Input fields:** `radius.medium`, clear focus state (accessibility, Blueprint §9) distinct from the default state by more than color alone.
- **Modal / bottom sheet:** `radius.large` on the exposed edge, used for confirmation flows like Partnership disconnect (Blueprint §7) — must support a multi-step layout (step 1 explanation, step 2 confirmation) as a single component pattern, not two disconnected modals.
- **Empty state:** encouraging copy slot + illustration slot (Brand Guidelines §8 illustration subjects apply here — e.g., "Build a Life" for an empty Goals screen) + single clear call-to-action, per Blueprint §8.
- **Toast / inline notification:** brief, dismissible, uses `motion.standard`; never blocks the primary action on screen.

## 9. What Happens Next (Not Part of This Document)

This document is still documentation, consistent with `PROJECT_MEMORY.md` Rule 1 (documentation before implementation). The concrete follow-on work, once this is approved:

1. A machine-readable token file (e.g., `packages/ui/tokens.ts` or a JSON export) generated directly from §2–§7 — first real code in `packages/ui`, but only after sign-off here.
2. Production Figma/design file translating §8's component specs into actual visual designs, validating the glow-elevation recommendation (§6) visually before it's treated as locked.
3. Logo production (Brand Guidelines §16) — still outstanding, not blocked by this document but not resolved by it either.
4. Illustration production for the subjects named in Brand Guidelines §8 ("Together," "Build a Life," "Reach Goals," "Celebrate Wins") plus whatever empty-state illustrations §8 above implies are needed.

## 10. Open Items Carried to Later Phases

- **Elevation model (§6)** is a design recommendation pending visual validation, not yet founder-confirmed the way the four pre-drafting questions were.
- Exact numeric type scale (§3) and spacing scale (§4) are starting points for engineering/design, not pixel-final — expect adjustment once real screens exist.
- ~~Component states beyond what's listed in §8 (e.g., focus-visible states for web/keyboard navigation) will need specifying as Frontend Architecture (Phase 11) gets underway.~~ **Resolved 2026-08-06 by actually building it, ahead of a formal Frontend Architecture spec** — see §11 below. Default browser focus rings were never suppressed (checked: no app code anywhere sets `outline: none`/`outlineStyle: 'none'`), so keyboard focus visibility was never the gap; keyboard *reachability* and screen-reader semantics were.

## 11. Accessibility Conventions (added 2026-08-06, from a real audit — not a spec written ahead of the code)

`packages/ui`/`apps/web`/`apps/mobile` are on React Native / React Native Web versions that have deprecated the classic `accessibilityLabel`/`accessibilityState`/`accessibilityRole` props in favor of direct web-ARIA-style props (confirmed via `react-native-web`'s own deprecation warnings and `react-native`'s bundled type definitions). Use these, not the classic RN API, in this codebase:

- **Anything with `onPress` must be a `Pressable`, never a `Text`/`View` with `onPress` tacked on.** `react-native-web`'s `Text` only attaches a mouse `onClick` handler for `onPress` — no `role`, no `tabIndex`, no keyboard handling. A `<Text onPress={...}>` is invisible to keyboard and screen-reader users, full stop; it's not a smaller version of the problem, it's the whole problem. (Found three live instances of exactly this bug in the first accessibility pass — see `PROJECT_MEMORY.md`'s 2026-08-06 entries.)
- **Every `Pressable` needs an explicit `role`** — `role="button"` for anything triggering a discrete action, `role="checkbox"` + `aria-checked` for a genuine checked/unchecked toggle (e.g. a checklist item), `role="button"` + `aria-pressed` for a toggle-button pair (e.g. a segmented Dark/Light or view-mode control). `Pressable` sets `tabIndex` on its own (so Enter already activates it) but **not** a role — without one, the Space key won't activate it either (confirmed against `react-native-web`'s `PressResponder.js`: Space-key activation is gated on `role="button"` or a real `<button>` tag) and screen readers won't announce it as an actionable control.
- **Every `TextInput`/native `<input>` needs `aria-label`** unless it has a real associated `<label>` element — a `placeholder` alone is not a substitute (it disappears once text is entered, and isn't reliably treated as an accessible name). When multiple identical-looking fields render on screen at once (e.g. an "Amount" field per budget category), disambiguate the label with context (`"Expense amount for Groceries"`), not the generic placeholder text.
- **State that's only shown visually needs a matching ARIA attribute** — `aria-expanded` for an expand/collapse row, `aria-pressed`/`aria-checked`/`aria-selected` for toggle/selection state. A color change or icon swap alone communicates nothing to a screen reader.
- **Theme mode must sync to `document.documentElement.style.colorScheme`**, not just to `packages/ui`'s in-memory `ColorTokens` — otherwise browser-native controls (date pickers, scrollbars) stay on whichever scheme was set at page load regardless of the app's own light/dark toggle. Handled centrally in `ThemeProvider.tsx`; don't reintroduce a static `color-scheme` value in CSS as the *only* source of truth.
- **Decorative `lucide-react-native` icons need `aria-hidden={true}`** (a real boolean — `LucideProps` types it as `boolean`, not the DOM's string `"true"`/`"false"`; `LucideProps extends SvgProps`, and `react-native-svg`'s web `prepare()` forwards unrecognized props straight through to the rendered `<svg>` element, confirmed by reading that source directly). An icon is decorative when its meaning is already conveyed another way in the same control — sitting next to its own text label (`<Plus/>` beside "Add a goal"), or inside a `Pressable`/button whose `aria-label` or `aria-checked`/`aria-pressed` already supplies the accessible name/state. An icon is **not** decorative, and must be left alone, when it's the *only* place that information appears — e.g. a static (non-interactive, non-`Pressable`) checklist row's done/not-done glyph with no `role="checkbox"`/`aria-checked` anywhere nearby to say so for a screen reader; hiding that icon would delete information, not de-duplicate it. React Navigation's own tab bar (`RootNavigator.tsx`'s `tabBarIcon`) is deliberately left alone too — React Navigation manages that control's accessibility (role, label) internally, so hand-adding `aria-hidden` there would be working against, not with, its existing wiring, unlike the fully custom tab bar in `AppShell.tsx`. Swept and closed 2026-08-07 (see `PROJECT_MEMORY.md`) — this was flagged as a known, not-yet-closed gap since the 2026-08-06 audit; treat any future icon addition as needing the same call, not as auto-exempt.

---

*Next step per the Documentation Roadmap: await founder review and approval of this Design System, including the glow-elevation recommendation (§6). Once approved, record it in `PROJECT_MEMORY.md` §6/§7 and proceed to Phase 5 — Database Architecture, which starts turning the PRD's data model (Partnership, personal/shared accounts, goals, budgets) into an actual schema.*
