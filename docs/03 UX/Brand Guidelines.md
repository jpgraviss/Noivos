# Noivos — Brand Guidelines

**Status:** Draft v2.0 — awaiting founder sign-off
**Phase:** 2 of the Documentation Roadmap (see `docs/README.md`)
**Last updated:** 2026-08-02
**Source of truth precedence:** Downstream of `PROJECT_MEMORY.md` §5 (Brand Decisions), which is the permanent record of what's approved. If this document and that file ever disagree, `PROJECT_MEMORY.md` wins until reconciled.

> **Reversal note (2026-08-02).** v1.0 of this document treated the founder's text Brand Statement as superseding the Phase 1 moodboard's palette and typography. The founder has since confirmed the opposite: **the original moodboard (`docs/assets/brand/brand-moodboard-v1.png`) is the default brand system** — its color palette, typography, logo mark, and illustration energy govern wherever it and the text Brand Statement disagree. The text Brand Statement's *non-visual* content — personality, brand keywords, tone of voice, AI personality, motion philosophy, photography direction, design principles, website direction, brand promise, and north star — does not conflict with the moodboard and remains in force, folded in below. Nothing from either round is deleted; both are preserved in `PROJECT_MEMORY.md` §5.
>
> **Reversal note 2 (2026-08-05).** Founder directed a visual pivot away from the moodboard's neon palette and Bebas Neue: "Make it a closer look to Origin... our UI and UX is ugly." §5 (Color System) and §6 (Typography) below now describe the **as-shipped `apps/web` values as of 2026-08-05** (see `packages/ui/src/tokens.ts` and `PROJECT_MEMORY.md`'s 2026-08-05 decision-log entry), not the original moodboard's hex values — the moodboard's neon-on-black direction is superseded for visual execution, though it remains preserved below and in `docs/assets/brand/brand-moodboard-v1.png` for history. The WCAG contrast table in §5.1 was computed against the *old* palette and has not been recomputed against the new one — treat it as stale until that happens.

---

## 1. Brand Statement

We're not building a finance app. We're building a lifestyle brand that happens to help people make smarter financial decisions together.

The product should feel more like Sour Strips, Notion, Apple, Poppi, and Liquid Death than a traditional banking app. Every interaction should reduce financial anxiety while increasing confidence. The brand should make people excited to open the app — not because they have to, but because they want to.

Worth noting: Sour Strips and Liquid Death are themselves bold, high-saturation, unapologetically loud brands — which is fully consistent with defaulting to the moodboard's neon-on-black energy rather than a quieter Apple/Notion-only read. The two inputs are less in tension than they first appeared.

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

The moodboard is the reference: bold, high-contrast neon color on dark and light surfaces, a confident gradient wordmark, graffiti/scrapbook-energy illustration, pill-shaped UI. Confident and unmistakable, per §2 — not restrained-to-the-point-of-generic.

## 5. Color System

**As-shipped in `apps/web` as of 2026-08-05** (see Reversal note 2 above and `packages/ui/src/tokens.ts`) — repainted toward Origin's calmer, muted palette. Token *names* kept identical to the original moodboard names even though the hex values no longer literally match those names (e.g. "Sour Lime" is now a muted forest green, not neon lime) — that's deliberate, so every screen referencing a token by name repainted without code changes elsewhere.

| Role | Name | Hex | Use |
|---|---|---|---|
| Primary | Sour Lime | `#4F7A5B` | Signature color; primary buttons, key emphasis — was `#C6FF00` neon lime |
| Secondary | Sour Punch | `#B0684B` | Celebrations, highlights, secondary buttons — was `#FF2D8E` hot pink |
| Accent | Electric Blue | `#4C6B8A` | Links, informational accents — was `#0066FF` |
| Highlight | Citrus | `#C9A227` | Momentum, attention-getting moments — was `#FFE600` bright yellow |
| Info | Grape | `#6B5B95` | Informational UI, AI Coach touches — was `#8A2BE2` vivid purple |
| Surface (light) | Sour Cloud | `#F5F1E6` | Light-mode background/surface — was `#F5F5F7` cool white, now warm ivory |
| Background (dark) | Licorice | `#18160F` | Dark-mode background — was `#0D0D0F` near-pure-black, now warm near-black |
| Text (light mode) | (dark neutral) | `#221F17` | Light-mode text — darkened slightly from Licorice's old value to pair better with the new warm cream background |
| Text (dark mode) | Sour Cloud | `#F5F1E6` | Dark-mode text — same warm-ivory value as the new Surface (light) swatch |

**Original moodboard values, preserved for history** (Phase 1 default, in force 2026-08-02 through 2026-08-05): Sour Lime `#C6FF00`, Sour Punch `#FF2D8E`, Electric Blue `#0066FF`, Citrus `#FFE600`, Grape `#8A2BE2`, Sour Cloud `#F5F5F7`, Licorice `#0D0D0F`.

**Also added 2026-08-02 — Success/Warning roles.** The moodboard didn't define these (it has Primary/Secondary/Accent/Highlight/Info/Surface/Dark BG, not Success/Warning), but the PRD's AI Insights and notification requirements (goal reached, savings streak, bill due) need them. Recommendation, not yet confirmed: reuse **Sour Lime** for Success (it already reads as energetic/positive) and **Citrus** for Warning (yellow conventionally reads as caution). This avoids adding new hex values to an already-locked palette, but should be confirmed before Phase 4 (Design System) locks color tokens.

### 5.1 Accessibility & Contrast Notes — added by CTO/design review

Contrast ratios computed against WCAG 2.1 AA thresholds (4.5:1 normal text, 3:1 large text/UI components):

| Surface | Licorice text | Sour Cloud / white text |
|---|---|---|
| Sour Cloud (light-mode bg) | **17.8:1** — use for all light-mode body text | — |
| Licorice (dark-mode bg) | fails (near-invisible) | **17.8:1** — use for all dark-mode body text |
| Sour Lime | **16.4:1** — use Licorice | fails badly |
| Sour Punch | **5.6:1** — passes, use Licorice | ~3.5:1 — fails normal text; large headline/UI use only |
| Electric Blue | ~4.0:1 — large text/UI only, fails normal-text AA | **~4.8:1** — passes normal text (barely) |
| Citrus | **15.3:1** — use Licorice | fails badly |
| Grape | ~3.3:1 — large text/UI only, fails normal-text AA | **~6.0:1** — passes normal text |

**Rule of thumb: Licorice is the reliable text color on Sour Lime, Sour Punch, and Citrus. Sour Cloud/white is the reliable text color on Electric Blue and Grape.** Neither light nor dark text is safe on every accent — this needs to be a hard constraint in the Phase 4 component library (e.g., a button/badge component's allowed color × text-color combinations should be an enforced enum, not left to per-screen judgment), the same way it would for any palette this saturated.

## 6. Typography

- **Headlines:** Fraunces (soft editorial serif) as of 2026-08-05, `apps/web` only — was Bebas Neue Bold. Bebas Neue is a caps-only condensed poster font (its lowercase glyphs are visually indistinguishable from uppercase), which made every headline read as shouting; Fraunces has real lowercase letterforms and reads calmer/more premium, closer to Origin. `apps/mobile` has not been switched over yet (its native font registration in `useAppFonts.ts` still loads Bebas Neue) — a known, flagged gap, not yet done.
- **Body:** Inter — readable, modern, excellent on every platform. (Both brand inputs agreed on this one.) Unchanged.
- **Numbers:** tabular figures throughout the app, so balances, budgets, and transactions align cleanly and feel polished. Carried forward from the text Brand Statement — a typographic detail, not a visual-identity conflict, so it stands.

## 7. Iconography

The moodboard shows a bespoke, colorful icon set for primary navigation (Home, Goals, Insights, Activity, AI Coach, Plan, Budget, Savings, Milestone, More) rendered in the brand's own palette — that's the default direction for primary nav icons, and will likely need custom illustration work to match rather than a generic outline library. For secondary/utility UI icons (chevrons, close buttons, form controls) where a bespoke icon isn't warranted, **Lucide** or **Phosphor** (rounded, minimal, non-corporate) remain reasonable system choices — pick one before Phase 4 component work begins.

## 8. Illustration Style

Primary illustration style follows the moodboard: bold, high-contrast, graffiti/scrapbook-energy full scenes (e.g., "Together," "Build a Life," "Reach Goals," "Celebrate Wins") — not flat, corporate, or stock. The text Brand Statement's guidance on hand-drawn doodles, sticker graphics, small stars, lightning bolts, hearts, confetti, arrows, and organic shapes isn't in conflict with this — read it as the **secondary/accent layer** (small decorative marks used around and on top of the primary illustrations and UI), not a replacement rendering style for the primary illustrations themselves.

## 9. Photography

Only authentic moments: grocery shopping, IKEA trips, coffee dates, home improvement, wedding planning, moving boxes, farmers markets, beach trips, budget meetings, buying furniture.

Never: business handshakes, people in suits, corporate office photography, dollar bills everywhere.

## 10. Motion

Motion should reward, not distract. Small, fast, delightful. Reference moments: goal completed, partner joined, wedding funded, savings streak, purchase approved. Exact micro-interaction specs (durations, easing) are deferred to the Design System (Phase 4); the philosophy — celebratory, brief, never gratuitous — is locked here.

## 11. AI Personality

The AI is never the expert in the room. It is the helpful friend. It should sound like:

> "Buying this won't hurt your budget, but it'll push your vacation goal back about two weeks."

Not:

> "Purchase denied."

Never shame. Never guilt. Always inform. This matches — and formally locks in brand voice terms for — the AI Philosophy already approved in the PRD (`docs/02 Product Requirements/PRD.md` §14): informative, never prescriptive, never a verdict.

## 12. Tone of Voice

Friendly, confident, conversational, encouraging. Never corporate, cold, judgmental, or full of financial jargon.

## 13. Emotional Goal

Users should feel **"I've got this."** Never **"I'm bad with money."** Every piece of copy, every insight, every notification (see PRD §12.14, §17) should be written and reviewed against this bar specifically.

## 14. UI Philosophy

Lots of breathing room. Rounded corners. Large typography. Big progress bars. Friendly cards. Micro-interactions everywhere. Minimal clutter. One primary action per screen. No information overload. Pill-shaped buttons and celebratory milestone cards, per the moodboard's UI element examples.

**Open item — which mode is primary?** The moodboard's dark background (Licorice) is where the neon palette reads most vivid; a fintech app defaulting to dark mode (rather than treating it as an alternate) would be a distinctive, on-brand choice, not just a preference toggle. Recommend deciding this deliberately in Phase 3 (UX/UI Blueprint) rather than defaulting to the industry-standard "light mode primary."

## 15. Design Principles

1. **Calm before color.** — **Reinterpreted 2026-08-02:** given the moodboard's palette is vivid throughout rather than reserved for rare accents, read this principle as *restraint in layout and information density*, not *restraint in saturation*. The interface should still feel uncluttered and single-focus per screen (§14) even though the palette itself is bold everywhere. Flagging this explicitly so it isn't silently applied in the original, more literal sense during Phase 3/4 UI work.
2. **Celebrate progress.** Every financial win matters, even saving $20.
3. **Real life first.** Design around how couples actually spend money, not accounting spreadsheets.
4. **Personality over polish.** Don't be afraid of warmth — the brand should have a heartbeat.
5. **Build trust through simplicity.** Every screen should answer "what do I need to know right now?" — nothing more.

## 16. Logo Direction

The moodboard's bold gradient "N" mark (Sour Lime → Sour Punch, a nudge forward, partnership, momentum, always moving forward together) is the default logo. Requirements: simple enough to recognize at 24px; strong enough to stand alone without text; rounded and approachable; modern, not trendy; instantly recognizable as an app icon; works in monochrome. Avoid obvious finance symbols — no dollar signs, piggy banks, or bar charts. Producing final production assets (refined vector, monochrome variant, app-icon-specific crop) is design execution work, not a documentation deliverable — flagged as the first concrete task for Phase 4 (Design System) or a dedicated logo pass.

## 17. Website Direction

The website should feel like a modern consumer product launch: large headlines, full-screen lifestyle photography, playful illustrations, big product screenshots, interactive animations, minimal copy, bold color moments. The feeling should be "I need this," not "here's another finance tool." Full page-by-page detail is deferred to the Marketing Website document (Phase 12), but this tone/format direction is locked now so that phase isn't starting from nothing.

## 18. Brand Promise

We help couples make smarter financial decisions — together. Not by telling them what to do. By giving them the clarity and confidence to decide together.

## 19. The North Star

Build a brand people wear on a hoodie — not just an app they download.

---

## 20. Open Items Carried to Later Phases

- ~~Success/Warning color mapping~~ — **confirmed 2026-08-02**: Sour Lime (Success) and Citrus (Warning), no new hexes added.
- ~~Icon library choice~~ — **confirmed 2026-08-02**: Lucide for secondary/utility icons; primary nav stays bespoke per the moodboard.
- ~~Primary appearance mode~~ — **confirmed 2026-08-02** in the UX/UI Blueprint (`docs/03 UX/UX-UI Blueprint.md` §2): dark mode primary, light mode a toggle.
- **Logo production** (final vector, monochrome variant, app-icon crop) — design execution, not specification (§16). Still outstanding.
- **Tagline continuity** — "Better Money. Together." (from the moodboard) has not been contradicted by anything since and remains the working tagline.
- **New from the 2026-08-05 Origin-direction repaint:** `apps/mobile` still loads the old Bebas Neue/moodboard-neon values — needs its own pass to load Fraunces (via `@expo-google-fonts`) and pick up the new palette, once there's a way to verify it visually (this sandbox can't run a device/simulator). The §5.1 WCAG contrast table is stale against the new palette values and needs recomputing before this is treated as accessibility-verified.

---

*Next step per the Documentation Roadmap: await founder review and approval of this Brand Guidelines document. Once approved, record it in `PROJECT_MEMORY.md` §5 and proceed to Phase 3 — UX/UI Blueprint, which should apply this brand system to actual screen flows and information architecture.*
