# PROJECT_MEMORY.md

**This is the permanent memory of Noivos.** It is never overwritten — only appended to. Every future conversation, document, and engineering decision must be reconciled against this file before new work begins. If something here conflicts with a new request, stop and ask the founder before proceeding.

Last updated: 2026-08-02 (Phase 1 — PRD kickoff)

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

## 6. Technical Decisions

| Layer | Choice | Notes |
|---|---|---|
| Mobile/Web frontend | React Native + Expo | Shared codebase target for iOS/Android; web app architecture TBD in Frontend Architecture doc |
| Backend | Supabase | Postgres, Auth, Storage, Edge Functions |
| Database | PostgreSQL | Via Supabase |
| Auth | Supabase Auth | Email, Apple, Google |
| Payments | Stripe | **Flagged risk, see §9 Known Risks — mobile app store billing rules likely require Apple IAP / Google Play Billing in addition to or instead of Stripe on-device.** |
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

Carried forward until the founder resolves them. Review this list at the start of every new work session.

1. **Money movement scope.** Is Noivos strictly a read-only aggregation and planning layer on top of couples' existing bank accounts (via Plaid), or will it ever hold funds, facilitate transfers between partners, or offer a Noivos-branded account/card? This changes regulatory scope enormously (money transmitter licensing, custodial relationships, FDIC pass-through insurance). **Working assumption for the PRD: read-only aggregation only, no custody, no money movement, at least through V1.** Needs explicit founder confirmation.
2. **Subscription unit.** Does Premium ($100/yr) cover the *Relationship* (one payment covers both partners) or is it *per individual*? Working assumption: **per Relationship** — one partner subscribes and Premium features unlock for the shared workspace and both members' personal spaces. Needs confirmation since it materially changes revenue-per-couple.
3. **Mobile billing compliance.** Apple App Store and Google Play generally require their own in-app purchase systems for digital subscriptions consumed in-app, which conflicts with a Stripe-only payments plan. See Known Risks §9. Needs a founder decision before Backend/Payments architecture is written.
4. **Geographic / regulatory scope at launch.** Working assumption: **US-only, USD-only, English-only at launch** (matches Plaid's core market and the wedding-planning use case). Needs confirmation — affects tax, compliance, and localization scope.
5. **AI Financial Coach regulatory posture.** Questions like "should we refinance" and "how much house can we afford" border on regulated financial/lending advice. Working assumption: the AI gives **educational, scenario-based, non-prescriptive** guidance ("here's what refinancing at X% could mean for your monthly cash flow and 5-year goal timeline"), never specific product recommendations ("go with Lender X") or fiduciary-style directives ("you should refinance"). Needs explicit founder sign-off — this shapes AI Philosophy, legal disclaimers, and possibly requires legal review before AI Financial Coach ships.
6. **Data entity naming.** Founder brief uses "Relationship," "Financial Partnership," and "Partnership" interchangeably for the shared workspace. Working assumption for documentation: call the entity a **Partnership** internally (survives past a breakup/new relationship more cleanly than "Relationship"), while user-facing copy can stay warmer ("Your Relationship," "You & [Name]"). Needs confirmation before Database Architecture is written.
7. **Company/legal status.** Is there an incorporated entity yet? Has "Noivos" cleared a trademark screen and domain availability check? Not blocking for the PRD, but blocking before the Marketing Website phase (domain) and before public launch (trademark).
8. **Existing Canva brand assets.** This session has access to a Canva connector. Is `brand-moodboard-v1.png` sourced from a Canva design the founder wants us to pull into a working Canva brand kit for Phase 2, or is it a one-off reference?

## 9. Known Risks

- **App Store billing risk (technical/business).** Plan currently pairs a native React Native/Expo mobile app with Stripe-only payments. Apple and Google generally require their own billing systems for in-app digital subscriptions; a Stripe-only implementation risks App Store/Play Store rejection. Needs resolution: Apple IAP + Google Play Billing for mobile, Stripe reserved for the marketing/web checkout flow, reconciled through a shared entitlements service.
- **Regulatory risk (AI advice).** AI Purchase Advisor / Financial Coach features that answer "can we afford this," "should we refinance," "how much house can we afford" sit close to regulated financial and lending advice. Needs product guardrails (informational framing, disclaimers) and likely legal review before Premium AI ships publicly.
- **Regulatory risk (banking data).** Plaid integration means Noivos handles sensitive financial data for two people per household. Requires bank-grade security posture (encryption at rest/in transit, least-privilege access, breach response plan) well before public launch, even though Noivos itself isn't a bank.
- **Relationship-data risk (product/legal).** Ex-partners' shared financial history must be handled with care on breakup — visibility, retention, and deletion rules need to be airtight to avoid a user's ex retaining access to their post-breakup financial life, and to avoid one partner weaponizing shared data during a breakup.
- **Two-sided activation risk (product).** The core value proposition requires both partners to opt in and stay engaged. A single-player-only outcome (one partner uses it, the other ignores invites) undermines the entire premise. Onboarding and invitation design carry outsized importance.
- **Trust/emotional-safety risk (product).** Money is a leading cause of relationship conflict. A poorly designed insight, notification, or AI response ("nudge" that reads as shaming, or an insight that surfaces one partner's spending to the other in a bad moment) could directly damage a user's real relationship. This is a uniquely high bar compared to typical fintech UX risk.

## 10. Assumptions

Tracked until confirmed or rejected by the founder. See Open Questions (§8) for the assumptions currently in play — duplicated there because they are not yet resolved. Once the founder confirms or changes any of them, move the final answer here and remove it from §8.

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

---

*Do not delete history from this file. Append new sections and log entries as decisions are made. If this file conflicts with a new document or instruction, stop and ask the founder before proceeding.*
