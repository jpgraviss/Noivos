# PROJECT_MEMORY.md

**This is the permanent memory of Noivos.** It is never overwritten — only appended to. Every future conversation, document, and engineering decision must be reconciled against this file before new work begins. If something here conflicts with a new request, stop and ask the founder before proceeding.

Last updated: 2026-08-02 (Phase 1 — PRD open questions resolved)

---

## 1. Company Vision

Noivos is building the operating system for a couple's financial life together — starting with engaged couples planning a wedding, and growing with them into marriage, home ownership, family, and long-term wealth building.

We believe the strongest financial products for couples won't look like banks. They'll look like the best consumer software of this era — Apple, Notion, Linear, Duolingo — applied to the most emotionally loaded, most avoided conversation two people in love will have: money.

## 2. Mission

Help couples make smarter financial decisions **together** by replacing financial confusion, stress, and secrecy with clarity, conversation, and confidence — without judgment.

## 3. Core Product Philosophy

- **Relationship first, finance second.** The relationship is the product; money is the tool.
- Budgeting, expense tracking, and wedding planning are **features**, not the product.
- Shared financial awareness, not financial surveillance.
- The AI is a supportive teammate — never a banker, never an accountant, never a source of shame.
- No financial comparison between users, ever. Community is for accountability, not competition.
- Every feature must be evaluated against: *does this help two people make a better financial decision together?* If not, question whether it belongs.

## 4. Product Decisions (Approved)

| Area | Decision | Status |
|---|---|---|
| Product category | Financial companion for couples, not a budgeting app clone (not EveryDollar/YNAB/Monarch clone) | Approved (founder brief) |
| Core entity | Two individuals connect into a shared workspace ("Partnership"/"Relationship") that layers on top of, not replaces, personal finances | Approved |
| Wedding Mode | Dedicated mode with a "Graduate" action that archives wedding data as a keepsake and transitions the couple into married financial planning | Approved |
| Free tier | Expense tracking, budgets, goals, basic insights, relationship workspace — no Plaid, no AI | Approved |
| Premium tier | $100/year (~15% cheaper than paying monthly) — gates Plaid, AI Purchase Advisor, AI Financial Coach, advanced insights, OCR/camera/receipt scanning | Approved |
| Community | No income, balance, net worth, spending, or debt sharing under any circumstance. Optional sharing limited to goals, progress %, milestones, achievements, encouragement, challenges | Approved |
| Relationship lifecycle | Users can disconnect and later reconnect with a new partner; former shared data must archive without leaking to a new partnership | Approved (mechanics TBD in Database Architecture) |
| Money movement scope | Noivos is a **read-only** aggregation and planning layer only. No custody, no transfers between partners, no Noivos-branded account/card, at least through V1 | Approved 2026-08-02 |
| Premium billing unit | Billed **per Partnership** (couple), not per individual — one payer unlocks Premium for the shared workspace and both partners' personal spaces | Approved 2026-08-02 |
| Launch geography | **US-only, USD, English** at launch | Approved 2026-08-02 |
| AI Financial Coach posture | Strictly **educational, scenario-based** guidance only — never names specific lenders/products, never issues directives ("you should refinance"). Legal review required before public launch | Approved 2026-08-02 |
| Shared-workspace entity name | Called **"Partnership"** internally in the data model and all docs; user-facing copy may stay warmer ("Your Relationship," "You & [Name]") | Approved 2026-08-02 |
| Premium free trial | **14-day free trial**, gated behind partner-invite acceptance — both partners must be in before the trial starts | Approved 2026-08-02 |
| Partnership disconnect visibility | The non-initiating partner retains **frozen, read-only** access to shared history as it stood at disconnect; nothing new syncs to either side going forward | Approved 2026-08-02 |

## 5. Brand Decisions

### 5.0 Reversal (2026-08-02)

The founder directly confirmed the same day both rounds happened: **the Phase 1 moodboard (§5.2) is the default brand system, not the text Brand Statement's palette/typography (§5.1).** §5.1's visual specifics (Electric Purple/Sora color and type system) are superseded by the moodboard wherever the two disagree. §5.1's *non-visual* content — personality, keywords, tone of voice, AI personality, design principles, motion, photography, website direction, brand promise, north star — does not conflict with the moodboard and remains in force. Both rounds are kept in full below per the "never delete history" rule; `docs/03 UX/Brand Guidelines.md` v2.0 reflects this reversal.

### 5.1 Text Brand Statement (2026-08-02) — superseded on palette/type only, non-visual content still in force

The founder delivered a full, formal Brand Statement on 2026-08-02, drafted into `docs/03 UX/Brand Guidelines.md` v1.0. Its color system and typography are **superseded by the Phase 1 moodboard (§5.2)** per §5.0 above. Preserved here in full so no content is lost:

- **Brand statement:** a lifestyle brand that happens to help couples make smarter financial decisions together — closer to Sour Strips/Notion/Apple/Poppi/Liquid Death than a banking app. (Still in force — and notably, Sour Strips/Liquid Death are themselves bold, high-saturation brands, which is more consistent with the moodboard's neon energy than it first appeared.)
- **Personality:** Confident, Optimistic, Human, Playful (without childish), Premium, Relatable. (Still in force.)
- **Color system — superseded:** Primary Electric Purple `#6B4EFF`; Secondary Hot Coral `#FF6B6B`; Accent Acid Lime `#C7FF3D`; Success Mint `#45E6B1`; Warning Mango `#FFB547`; Background Warm Ivory `#FBF9F4`; Dark mode Midnight `#161616`; Text Charcoal `#1F1F1F`. No longer the default — see §5.2 for the palette now in force.
- **Typography — superseded:** Sora headlines / Inter body. No longer the default for headlines — see §5.2 (Bebas Neue Bold). Inter for body text and tabular numbers for all numeric display are still in force (both rounds agreed on this).
- **Iconography:** Lucide or Phosphor for secondary/utility icons — still in force as a candidate list (choice still open). Primary nav icons now follow the moodboard's bespoke colorful set instead.
- **Illustration:** hand-drawn doodles/stickers/confetti/organic shapes — reinterpreted as the *secondary/accent layer* on top of the moodboard's bolder primary illustration style, not a replacement for it (see §5.2 and Brand Guidelines §8).
- **Photography:** only authentic lifestyle moments; never corporate/handshake/suit imagery. Still in force — the moodboard didn't address photography.
- **Logo:** still the moodboard's gradient "N" mark — no redesign needed, since the moodboard is now the default rather than a superseded predecessor. Production (final vector, monochrome, app-icon crop) is still outstanding design work.
- **Design principles:** celebrate progress; real life first; personality over polish; build trust through simplicity — still in force. "Calm before color" is **reinterpreted** (2026-08-02) as restraint in layout/information density rather than in palette saturation, since the now-default moodboard palette is vivid throughout, not reserved for rare accents.
- **Brand promise:** "We help couples make smarter financial decisions — together. Not by telling them what to do. By giving them the clarity and confidence to decide together." Still in force.
- **North star:** Build a brand people wear on a hoodie, not just an app they download. Still in force.

### 5.2 Phase 1 Brand Moodboard (2026-08-02) — **current default brand system**

A first-pass brand moodboard was supplied by the founder on 2026-08-02 (stored at `docs/assets/brand/brand-moodboard-v1.png`). Originally logged as input to Phase 2 rather than a locked system, the founder has since confirmed **this is the brand to default to** — its palette, typography, logo, and illustration energy are the approved visual identity, superseding §5.1's palette/type where they disagree.

- **Tagline:** "Better Money. Together."
- **Logo concept:** Bold gradient "N" mark — a nudge forward, partnership, momentum, always moving forward together.
- **Color palette (working names):**
  - Sour Lime `#C6FF00` — Primary
  - Sour Punch `#FF2D8E` — Secondary
  - Electric Blue `#0066FF` — Accent
  - Citrus `#FFE600` — Highlight
  - Grape `#8A2BE2` — Info
  - Sour Cloud `#F5F5F7` — Surface (light)
  - Licorice `#0D0D0F` — Dark background
- **Typography:** Headings in Bebas Neue Bold (condensed, high-energy display face); body in Inter.
- **Iconography:** Home, Goals, Insights, Activity, AI Coach, Plan, Budget, Savings, Milestone, More.
- **Illustration style:** Bold, high-contrast, graffiti/scrapbook-energy illustrations (e.g., "Together," "Build a Life," "Reach Goals," "Celebrate Wins"), not flat corporate iconography.
- **UI elements:** Pill-shaped primary/secondary buttons, dark-mode-first surfaces, celebratory milestone cards.
- **Brand vibe (as given):** Bold & Energetic, Warm & Human, Fun & Approachable, Trustworthy & Secure, Forward Momentum.

**Open tension to resolve in Phase 2:** this moodboard skews closer to a Gen-Z lifestyle/candy-brand aesthetic (very high-saturation neon-on-black) than the "Apple / Notion / Linear" reference points named in the founder brief, which read calmer and more restrained. Both can be reconciled (energetic accent colors on a calm neutral base), but Phase 2 needs to explicitly decide how "loud" the day-to-day app UI is versus how loud the marketing site / brand moments are. Flagged, not decided.

**Resolved 2026-08-02:** the founder confirmed this moodboard — loud palette and all — is the default brand system, not a calmer compromise. The "Calm before color" principle from §5.1 is reinterpreted accordingly (restraint in layout/density, not in saturation) rather than treated as a mandate to mute the palette.

**Confirmed 2026-08-02:** the moodboard is a reference image only, not a live Canva design — Phase 2 will build the real brand system from scratch using it as creative direction, not by pulling forward an existing Canva asset.

## 6. Technical Decisions

| Layer | Choice | Notes |
|---|---|---|
| Mobile/Web frontend | React Native + Expo | Shared codebase target for iOS/Android; web app architecture TBD in Frontend Architecture doc |
| Backend | Supabase | Postgres, Auth, Storage, Edge Functions |
| Database | PostgreSQL | Via Supabase |
| Auth | Supabase Auth | Email, Apple, Google |
| Payments | Stripe (web) at launch; Apple IAP + Google Play Billing to be added when native mobile ships | **Approved 2026-08-02: launch web-only first on Stripe. When mobile apps ship, mobile purchases move to Apple IAP / Google Play Billing (not Stripe on-device) to stay compliant with store policy — a shared entitlements service reconciles whichever route a user paid through. See §9 for remaining engineering risk.** |
| Banking data | Plaid | Checking, savings, credit, loans; manual accounts as fallback |
| AI | OpenAI Responses API | Text, vision (receipt/price-tag scanning), voice input |
| Storage | Supabase Storage | Receipts, attachments, avatars |
| Push notifications | Firebase Cloud Messaging + Apple Push Notification service | |
| Analytics | PostHog | |
| Monitoring | Sentry | |

No infrastructure, hosting, or CI/CD decisions have been made yet — deferred to the Infrastructure document (Phase 10).

## 7. UX Decisions

None formally approved yet — deferred to the UX/UI Blueprint (Phase 3) and Design System (Phase 4). The PRD (Phase 1) may describe UX *behavior* (e.g., onboarding flow, Wedding Mode graduation) without locking visual design.

## 8. Open Questions

The 8 questions carried in this section as of the PRD draft were put to the founder directly on 2026-08-02 and resolved — answers are recorded in §4, §6, and §12. Reconciling those answers back into the PRD surfaced 3 narrower follow-ups, still open:

1. **Premium billing on disconnect.** The confirmed disconnect decision (§4) covers *data visibility* (frozen read-only access). It does not cover what happens to the *Premium subscription itself* when a Partnership disconnects. Working assumption, not yet confirmed: the payer keeps Premium going forward, no refund/proration.
2. **Legal review scheduling.** AI Financial Coach / Purchase Advisor guardrails are confirmed in principle (§4), but no legal review of the AI-advice posture has been scheduled. Recommend booking it before Phase 8 (AI Architecture) is finalized.
3. **Trademark/domain screening timeline.** Confirmed "Noivos" hasn't been screened yet (§9). Recommend running the screen now, in parallel with Phase 2, rather than waiting until the Marketing Website phase — a conflict found after brand work is done would waste design effort.
4. **Icon library choice.** Brand Guidelines (Phase 2) approved either Lucide or Phosphor for iconography but didn't pick one. Needs a decision before Phase 4 (Design System) component work begins — see `docs/03 UX/Brand Guidelines.md` §20.

Review this list at the start of every new work session — it will keep accumulating new forks as later architecture phases (Database, Backend, AI, Security) surface decisions that need founder input.

## 9. Known Risks

- **App Store billing risk (technical/business) — mitigated, not eliminated.** Resolved 2026-08-02: launch web-only on Stripe; add Apple IAP + Google Play Billing when native mobile ships (see §6). Residual engineering risk remains: a shared entitlements service must correctly reconcile a Premium status granted via Stripe (web) with one granted via IAP/Play Billing (mobile) for the same Partnership, including trial handling, proration, and disconnect edge cases (§10 in the PRD). To be fully specified in Backend Architecture (Phase 6).
- **Regulatory risk (AI advice).** AI Purchase Advisor / Financial Coach features that answer "can we afford this," "should we refinance," "how much house can we afford" sit close to regulated financial and lending advice. Founder confirmed 2026-08-02 the AI must stay strictly educational/scenario-based (see §4) — legal review is still required before this feature ships publicly; not yet scheduled.
- **Trademark/domain risk (business).** "Noivos" is incorporated but not yet trademark- or domain-screened (confirmed 2026-08-02). Must be resolved before the Marketing Website phase and before any public launch or marketing push — a name collision found late would be costly to unwind.
- **Regulatory risk (banking data).** Plaid integration means Noivos handles sensitive financial data for two people per household. Requires bank-grade security posture (encryption at rest/in transit, least-privilege access, breach response plan) well before public launch, even though Noivos itself isn't a bank.
- **Relationship-data risk (product/legal).** Ex-partners' shared financial history must be handled with care on breakup — visibility, retention, and deletion rules need to be airtight to avoid a user's ex retaining access to their post-breakup financial life, and to avoid one partner weaponizing shared data during a breakup.
- **Two-sided activation risk (product).** The core value proposition requires both partners to opt in and stay engaged. A single-player-only outcome (one partner uses it, the other ignores invites) undermines the entire premise. Onboarding and invitation design carry outsized importance.
- **Trust/emotional-safety risk (product).** Money is a leading cause of relationship conflict. A poorly designed insight, notification, or AI response ("nudge" that reads as shaming, or an insight that surfaces one partner's spending to the other in a bad moment) could directly damage a user's real relationship. This is a uniquely high bar compared to typical fintech UX risk.

## 10. Assumptions

No open assumptions at this time — the working assumptions carried in the PRD draft were all confirmed by the founder on 2026-08-02 and have been promoted to Product/Technical Decisions (§4, §6). Future architecture phases will add new assumptions here as they come up; move each to §4/§6 once confirmed, per the process established in this round.

## 11. Future Ideas (Intentionally Postponed)

- Joint Noivos-branded account/card or any custodial money movement.
- International expansion (multi-currency, non-US banking data sources beyond Plaid's coverage).
- Financial advisor / CFP marketplace or referral integration.
- Estate planning, life insurance, or investment account management features.
- Family/multi-generational accounts beyond a two-person Partnership (e.g., involving parents contributing to a wedding or house fund) — noted as a possible V2 given "Family Contributions" appears in Wedding Mode, but full multi-party accounts are out of scope for V1.

## 12. Decision Log

| Date | Decision | Reasoning | Impact |
|---|---|---|---|
| 2026-08-02 | Kicked off Phase 1: Product Requirements Document | Founder set documentation-first methodology; PRD is first deliverable per the Documentation Roadmap | Establishes `docs/` structure, `PROJECT_MEMORY.md`, and the PRD as the source of truth for all future architecture work |
| 2026-08-02 | Adopted repository skeleton (`apps/`, `packages/`, `docs/`, `infrastructure/`) | Founder specified professional monorepo structure as a standing requirement, independent of the phased documentation roadmap | No code was written into these folders — placeholders only, pending approved architecture docs |
| 2026-08-02 | Logged founder-supplied brand moodboard as Phase-2 input, not a locked brand system | Moodboard was shared as context, not formally approved as final brand guidelines | Phase 2 (Brand Guidelines) will formally reconcile and ratify brand direction |
| 2026-08-02 | Resolved all 8 open questions from the PRD draft via direct founder Q&A: read-only-only money model, per-Partnership billing, web-first billing rollout (IAP/Play Billing added at mobile launch), US/USD/English launch scope, educational-only AI Financial Coach pending legal review, "Partnership" as the internal entity name, 14-day invite-gated free trial, and frozen-read-only disconnect visibility. Confirmed "Noivos" is incorporated but not yet trademark/domain-screened | Founder directed that remaining open questions be asked interactively via CLI rather than left as prose in chat | Promoted all 8 answers from Open Questions (§8) into Product/Technical Decisions (§4, §6); added a trademark/domain screening action item to Known Risks (§9); PRD (`docs/02 Product Requirements/PRD.md`) updated to match |
| 2026-08-02 | Approved Phase 2 Brand Statement — new color system (Electric Purple/Hot Coral/Acid Lime/Mint/Mango on Warm Ivory/Midnight), Sora/Inter typography, hand-drawn illustration style, AI/voice personality, design principles, logo and website direction | Founder supplied a complete, formal brand statement superseding the Phase 1 moodboard's specific palette and typography while keeping its underlying energy and illustration subjects | Drafted `docs/03 UX/Brand Guidelines.md`; updated §5 to record the new system as current (§5.1) while preserving the moodboard for history (§5.2); confirmed via founder Q&A that dark-mode text reuses Warm Ivory and the logo evolves the existing "N" mark rather than starting over; added icon-library choice (Lucide vs. Phosphor) as an open item |
| 2026-08-02 | Reversed the above same-day: founder confirmed the Phase 1 moodboard, not the text Brand Statement, is the default brand system | Founder clarified "the one page I sent you" meant the original moodboard image, not the Brand Statement text, when asked directly | Rewrote `docs/03 UX/Brand Guidelines.md` to v2.0: moodboard's palette (Sour Lime/Sour Punch/Electric Blue/Citrus/Grape/Sour Cloud/Licorice) and Bebas Neue Bold typography now govern; Brand Statement's non-visual content (personality, tone, AI voice, design principles, motion, photography, website direction, brand promise, north star) kept as still in force; reinterpreted "Calm before color" given the now-default palette is vivid throughout; recomputed WCAG contrast table against the moodboard's actual hex values; added Success/Warning color mapping (Sour Lime/Citrus reuse) and a "which mode is primary" open item as new recommendations pending confirmation; restructured PROJECT_MEMORY.md §5 into §5.0/5.1/5.2 to keep both rounds fully intact |

---

*Do not delete history from this file. Append new sections and log entries as decisions are made. If this file conflicts with a new document or instruction, stop and ask the founder before proceeding.*
