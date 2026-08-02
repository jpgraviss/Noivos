# Noivos — Brand Guidelines

**Status:** Draft v1.0 — awaiting founder sign-off
**Phase:** 2 of the Documentation Roadmap (see `docs/README.md`)
**Last updated:** 2026-08-02
**Source of truth precedence:** Downstream of `PROJECT_MEMORY.md` §5 (Brand Decisions), which is the permanent record of what's approved. If this document and that file ever disagree, `PROJECT_MEMORY.md` wins until reconciled.

> **Supersession note.** The Phase 1 brand moodboard (`docs/assets/brand/brand-moodboard-v1.png` — Sour Lime/Sour Punch neon palette, Bebas Neue Bold headlines) was logged as *creative direction, not a locked system*. This document is the founder's formal Phase 2 brand direction and **supersedes the moodboard's specific palette and typography**. The moodboard's underlying instinct — bold, energetic, human, not-corporate — carries forward; its exact colors and type do not. Nothing is deleted from history; see `PROJECT_MEMORY.md` §5 and §12 for both rounds recorded side by side.

---

## 1. Brand Statement

We're not building a finance app. We're building a lifestyle brand that happens to help people make smarter financial decisions together.

The product should feel more like Sour Strips, Notion, Apple, Poppi, and Liquid Death than a traditional banking app. Every interaction should reduce financial anxiety while increasing confidence. The brand should make people excited to open the app — not because they have to, but because they want to.

This is the direct, explicit resolution to the tension flagged at the end of Phase 1: the moodboard's high-saturation neon energy vs. the founder brief's "Apple / Notion / Linear" calm reference points. The answer, per this brand statement and the "Calm before color" design principle (§9), is a calm, premium base with color deployed deliberately, in small, high-leverage moments — not a loud interface throughout.

## 2. Brand Personality

| Trait | Meaning |
|---|---|
| **Confident** | Not loud. Just unmistakable. |
| **Optimistic** | Always moving users forward. |
| **Human** | Never robotic. |
| **Playful** | Without becoming childish. |
| **Premium** | Simple. Clean. Intentional. |
| **Relatable** | Real couples. Real purchases. Real life. |

## 3. Brand Keywords

Together · Progress · Confidence · Momentum · Partnership · Growth · Transparency · Clarity · Future · Home · Celebration

## 4. Visual Direction

Imagine if Apple designed a finance app, Sour Strips gave it a personality, Notion simplified everything, and Duolingo added delight. That's the feeling: restrained, confident structure with warmth and delight layered on top — never the reverse.

## 5. Color System

| Role | Name | Hex | Use |
|---|---|---|---|
| Primary | Electric Purple | `#6B4EFF` | Ownable, modern, unexpected — our signature color |
| Secondary | Hot Coral | `#FF6B6B` | Celebrations, highlights, energy |
| Accent | Acid Lime | `#C7FF3D` | Momentum, goals, progress — **small moments only** |
| Success | Mint | `#45E6B1` | Savings, goals reached, healthy finances |
| Warning | Mango | `#FFB547` | Attention, reminders, upcoming bills |
| Background (light) | Warm Ivory | `#FBF9F4` | Never pure white — warm, comfortable |
| Background (dark) | Midnight | `#161616` | Not black — premium |
| Text (light mode) | Charcoal | `#1F1F1F` | Maximum readability on Warm Ivory |
| Text (dark mode) | Warm Ivory | `#FBF9F4` | **Added 2026-08-02** — the brand statement specified light-mode text only; reusing Warm Ivory keeps the "warm, never-pure" principle consistent across both modes rather than switching to a cold pure white. Confirmed by founder. |

### 5.1 Accessibility & Contrast Notes — added by CTO/design review

The brand statement didn't specify text-on-color pairings, so this table exists to make sure the palette is actually usable, not just beautiful. Contrast ratios computed against WCAG 2.1 AA thresholds (4.5:1 normal text, 3:1 large text/UI components):

| Surface | Charcoal text | White/Ivory text |
|---|---|---|
| Warm Ivory background | **15.7:1** — use for all body text | — |
| Midnight background | fails (near-invisible) | **17–18:1** — use Warm Ivory or white |
| Electric Purple | fails | **~5:1** — passes AA normal text; safe for button labels |
| Hot Coral | **~5.9:1** — passes, use Charcoal | fails (~2.8:1) — do not use white text on coral |
| Acid Lime | **~14:1** — use Charcoal | fails badly |
| Mint | **~10.4:1** — use Charcoal | fails badly |
| Mango | **~9.4:1** — use Charcoal | fails badly |

**Rule of thumb for engineering/design: Charcoal is the only text color that reliably passes AA on every accent color (Coral, Lime, Mint, Mango). Only Electric Purple and Midnight support light-colored text.** This should be encoded as a hard constraint in the Design System (Phase 4) component library — e.g., a "Badge" or "Pill" component should never allow a color/text-color combination outside this table, ideally enforced by the component API rather than left to per-screen judgment.

Electric Purple as small text *on* Midnight (dark mode) sits at ~3.6:1 — fine for large text/icons/UI elements, not for body copy. Recommend a lightened "dark-mode tint" of Electric Purple for any body-text use in dark mode; Design System (Phase 4) should define it.

## 6. Typography

- **Headlines:** Sora — bold, rounded, friendly, confident.
- **Body:** Inter — readable, modern, excellent on every platform.
- **Numbers:** tabular figures throughout the app, so balances, budgets, and transactions align cleanly and feel polished. This is a hard requirement for any UI displaying currency or numeric data — not optional polish.

*(Supersedes the Phase 1 moodboard's Bebas Neue Bold headline treatment — see supersession note above.)*

## 7. Iconography

Rounded, minimal, friendly. Use **Lucide** or **Phosphor** icon sets. Nothing corporate, nothing skeuomorphic. **Open item for Phase 4 (Design System):** pick one of Lucide or Phosphor as the single system-of-record — mixing both across the product would undercut the "one shared design system" principle in `PROJECT_MEMORY.md`.

## 8. Illustration Style

No stock illustrations. Instead: hand-drawn doodles, sticker graphics, small stars, lightning bolts, hearts, confetti, arrows, organic shapes, playful accents. The app should feel alive.

*(This is compatible with — and can absorb — the Phase 1 moodboard's illustration *subjects* — "Together," "Build a Life," "Reach Goals," "Celebrate Wins" — even though the rendering style shifts from bold graffiti/neon to hand-drawn doodle/sticker. Those subjects remain good creative briefs for Phase 4/8 illustration work.)*

## 9. Photography

Only authentic moments: grocery shopping, IKEA trips, coffee dates, home improvement, wedding planning, moving boxes, farmers markets, beach trips, budget meetings, buying furniture.

Never: business handshakes, people in suits, corporate office photography, dollar bills everywhere.

## 10. Motion

Motion should reward, not distract. Small, fast, delightful. Reference moments: goal completed, partner joined, wedding funded, savings streak, purchase approved. Motion design detail (durations, easing curves, exact micro-interaction specs) is deferred to the Design System (Phase 4), but the *philosophy* — celebratory, brief, never gratuitous — is locked here.

## 11. AI Personality

The AI is never the expert in the room. It is the helpful friend. It should sound like:

> "Buying this won't hurt your budget, but it'll push your vacation goal back about two weeks."

Not:

> "Purchase denied."

Never shame. Never guilt. Always inform. This directly matches — and formally locks in brand voice terms — the AI Philosophy already approved in the PRD (`docs/02 Product Requirements/PRD.md` §14): informative, never prescriptive, never a verdict.

## 12. Tone of Voice

Friendly, confident, conversational, encouraging. Never corporate, cold, judgmental, or full of financial jargon.

## 13. Emotional Goal

Users should feel **"I've got this."** Never **"I'm bad with money."** Every piece of copy, every insight, every notification (see PRD §12.14, §17) should be written and reviewed against this bar specifically.

## 14. UI Philosophy

Lots of breathing room. Rounded corners. Large typography. Big progress bars. Friendly cards. Micro-interactions everywhere. Minimal clutter. One primary action per screen. No information overload.

## 15. Design Principles

1. **Calm before color.** The interface stays clean; color appears only when something deserves attention.
2. **Celebrate progress.** Every financial win matters, even saving $20.
3. **Real life first.** Design around how couples actually spend money, not accounting spreadsheets.
4. **Personality over polish.** Don't be afraid of warmth — the brand should have a heartbeat.
5. **Build trust through simplicity.** Every screen should answer "what do I need to know right now?" — nothing more.

## 16. Logo Direction

Requirements: simple enough to recognize at 24px; strong enough to stand alone without text; rounded and approachable; modern, not trendy; instantly recognizable as an app icon; works in monochrome. Avoid obvious finance symbols — no dollar signs, piggy banks, or bar charts.

**Confirmed 2026-08-02:** the Phase 1 moodboard's bold gradient "N" mark (a nudge forward, partnership, momentum) is the right underlying concept and should be **evolved, not replaced** — re-colored into the new system (an Electric Purple → Hot Coral gradient reads as a natural fit for "celebration, energy, momentum") and refined toward rounder, more approachable geometry to match §14's UI philosophy. Producing the actual refined mark (multiple weights, monochrome version, app-icon-specific crop) is design production work, not a documentation deliverable — flagged as the first concrete task for whoever executes Phase 4 (Design System) or a dedicated logo pass.

## 17. Website Direction

The website should feel like a modern consumer product launch: large headlines, full-screen lifestyle photography, playful illustrations, big product screenshots, interactive animations, minimal copy, bold color moments. The feeling should be "I need this," not "here's another finance tool." Full page-by-page detail is deferred to the Marketing Website document (Phase 12), but this tone/format direction is locked now so that phase isn't starting from nothing.

## 18. Brand Promise

We help couples make smarter financial decisions — together. Not by telling them what to do. By giving them the clarity and confidence to decide together.

## 19. The North Star

Build a brand people wear on a hoodie — not just an app they download.

---

## 20. Open Items Carried to Later Phases

- **Icon library choice (Lucide vs. Phosphor)** — pick one before Phase 4 component work begins (§7).
- **Dark-mode tint of Electric Purple** for body-text-weight use on Midnight backgrounds — needed before Phase 4 locks color tokens (§5.1).
- **Logo production** (final vector, monochrome variant, app-icon crop) — design execution, not specification; first task for Phase 4 or a dedicated design pass (§16).
- **Tagline continuity** — "Better Money. Together." (from the Phase 1 moodboard) was not explicitly revisited in this brand statement and is not contradicted by it. Carrying it forward as the working tagline unless the founder says otherwise.

---

*Next step per the Documentation Roadmap: await founder review and approval of this Brand Guidelines document. Once approved, record it in `PROJECT_MEMORY.md` §5 and proceed to Phase 3 — UX/UI Blueprint, which should apply this brand system to actual screen flows and information architecture.*
