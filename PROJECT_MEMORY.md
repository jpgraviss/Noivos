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

A first-pass brand moodboard was supplied by the founder on 2026-08-02 (stored at `docs/assets/brand/brand-moodboard-v1.png`). This is **input to Phase 2 (Brand Guidelines)** — treated as strong creative direction, not yet a locked system. Logged here so it is never lost or contradicted by later work.

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

---

*Do not delete history from this file. Append new sections and log entries as decisions are made. If this file conflicts with a new document or instruction, stop and ask the founder before proceeding.*
