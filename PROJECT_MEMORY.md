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

**Locked 2026-08-02, ahead of Phase 4 (Design System):** icon library is **Lucide** for secondary/utility icons (primary nav stays bespoke); Success/Warning colors **reuse Sour Lime and Citrus** rather than adding new hexes.

**Confirmed 2026-08-02:** the moodboard is a reference image only, not a live Canva design — Phase 2 will build the real brand system from scratch using it as creative direction, not by pulling forward an existing Canva asset.

## 6. Technical Decisions

| Layer | Choice | Notes |
|---|---|---|
| Mobile/Web frontend | React Native + Expo | Shared codebase target for iOS/Android; web app architecture TBD in Frontend Architecture doc |
| Backend | Vercel (Next.js Route Handlers) + Neon Postgres | **Superseded 2026-08-02 — was Supabase.** See §6.4 below for the full pivot and reasoning. |
| Database | PostgreSQL via **Neon** | ~~Via Supabase~~ — superseded 2026-08-02. RLS-based privacy design (Database Architecture §10) is unaffected, since RLS is a Postgres feature, not a Supabase one. |
| Auth | **Clerk** | ~~Supabase Auth~~ — superseded 2026-08-02. Email, Apple, Google still required (PRD §12.1); Clerk supports all three and works across both Next.js (web) and Expo (mobile). |
| Payments | Stripe (web) at launch; Apple IAP + Google Play Billing to be added when native mobile ships | **Approved 2026-08-02: launch web-only first on Stripe. When mobile apps ship, mobile purchases move to Apple IAP / Google Play Billing (not Stripe on-device) to stay compliant with store policy — a shared entitlements service reconciles whichever route a user paid through. See §9 for remaining engineering risk.** |
| Banking data | Plaid | Checking, savings, credit, loans; manual accounts as fallback |
| AI | OpenAI Responses API | Text, vision (receipt/price-tag scanning), voice input |
| Storage | **Vercel Blob** | ~~Supabase Storage~~ — superseded 2026-08-02. Receipts, attachments, avatars. Chosen since the backend is already Vercel-hosted — one less vendor to integrate. |
| Push notifications | Firebase Cloud Messaging + Apple Push Notification service | |
| Analytics | PostHog | |
| Monitoring | Sentry | |

No infrastructure, hosting, or CI/CD decisions have been made yet — deferred to the Infrastructure document (Phase 10).

### 6.4 Supabase → Neon/Clerk/Vercel Blob Pivot (2026-08-02)

Supabase was unworkable in the founder's environment ("unable to do Supabase"). Rather than block, the stack was re-pointed to keep moving:

- **Database:** Neon replaces Supabase for Postgres hosting. This is a low-disruption swap for everything already documented in `docs/04 Database/Database Architecture.md` — RLS (§10), the schema (§3–§9), and the one-active-Partnership constraint are all plain Postgres features, not Supabase-specific, so none of that redesigns. **Neon also has its own database-branching feature**, directly replacing the "Supabase branch per environment" plan in Backend Architecture §10 — same environment model (dev/staging/prod branches), different provider.
- **Auth:** Clerk replaces Supabase Auth. Still needs to support Email, Apple, Google (PRD §12.1) — Clerk does, and works across both the Next.js web app and the Expo mobile app, which Supabase Auth would have too, so this is a like-for-like swap, not a scope change.
- **Storage:** Vercel Blob replaces Supabase Storage for receipts/attachments/avatars — picked because the backend is already Vercel-hosted (Backend Architecture §1), one less vendor rather than a deliberate feature comparison.
- **What does NOT change:** the Vercel API layer, the Plaid/Stripe/AI architecture, the RLS-based privacy model, and the schema itself — all of `docs/07 Backend/Backend Architecture.md` and `docs/04 Database/Database Architecture.md` remain valid except for their Supabase-specific mechanics (Supabase Vault for token encryption, Supabase branching, Supabase Auth/Storage references), which are superseded by this entry rather than rewritten line-by-line in those documents.
- **Plaid token encryption (Database Architecture §14):** Supabase Vault is no longer available. **Not yet decided** — needs a replacement (e.g., `pgcrypto` with an application-managed key, or a dedicated secrets manager) before Plaid integration is built for real. Flagged, not resolved.
- These were fast calls made under the founder's "move as fast as possible" direction, not put to a fresh round of questions — flagged here precisely so they're easy to revisit if wrong, per the same pattern used for every other fast-tracked decision this session.

**Schema written and tested 2026-08-02:** `packages/database/migrations/0001_init.sql` (full schema) and `0002_rls.sql` (RLS policies) translate the Database Architecture doc into runnable, Neon-compatible SQL. Since Neon has no Supabase-style `auth.uid()`, RLS policies read a `current_user_id()` helper backed by a Postgres session variable that the API layer must set per request (via `set_config('app.current_user_id', ...)`) — documented in `packages/database/README.md`. **Both migrations were applied to a real local Postgres instance and functionally tested** (not just syntax-checked) using a non-superuser role: confirmed a partner can see a shared account but not a personal one, a stranger sees neither, a partner cannot mutate an account they don't own even when it's shared, and after Partnership disconnect both former partners keep read access while all writes freeze for both — exactly the guarantees Database Architecture §10–§11 call for. Testing also caught and fixed a real gap: the first draft had no INSERT policies on `users`/`partnerships`/`partnership_members` at all, which would have made account creation and Partnership formation impossible.

### 6.0 Backend Architecture (Phase 6, 2026-08-02)

`docs/07 Backend/Backend Architecture.md` drafted. Key decisions:

| Area | Decision | Status |
|---|---|---|
| Backend topology | **Vercel-hosted API layer (Next.js Route Handlers)** for custom logic (Plaid webhooks, billing reconciliation, AI orchestration, notifications); **Supabase stays scoped to Postgres/Auth/Storage**, not Edge Functions for business logic | Approved 2026-08-02 |
| Plaid sync | **Webhook-driven with a daily reconciliation poll as backup** | Approved 2026-08-02 |
| Background jobs | **Dedicated job/queue service — Inngest** (not Supabase `pg_cron`), given Vercel's serverless functions aren't suited to long-running/retryable workflows | Approved 2026-08-02 |
| Auth passthrough | Even Vercel-mediated requests use a user-scoped Supabase client (the caller's JWT), so RLS still governs — service-role credentials reserved only for asynchronous/system-initiated writes (webhooks, scheduled jobs) with no live user session, and even then must replicate ownership/sharing rules in code | Approved 2026-08-02 |
| Billing reconciliation | Stripe (web), Apple IAP + Google Play Billing (mobile, when it ships) all write to the same `subscriptions` table; Premium status is one computed read regardless of route | Approved 2026-08-02 |
| Client-to-Supabase pattern | Recommend clients call Supabase **directly** for simple CRUD (RLS-protected), reserving the Vercel API layer for logic needing secrets/third-party calls/cross-cutting writes | Pending — design recommendation, not yet explicitly confirmed |
| Job service specifics | Inngest picked over Trigger.dev as a reasonable default | Pending — lower-stakes, swappable |

### 6.2 API Documentation, AI Architecture, Security Architecture (baseline), Frontend Architecture (Phases 7/8/9/11, 2026-08-02)

Drafted together at founder request ("as fast as possible") — `docs/05 API/API Documentation.md`, `docs/06 AI/AI Architecture.md`, `docs/12 Security/Security Architecture.md`, `docs/08 Frontend/Frontend Architecture.md`. This completes the 5-document fast-track list from the re-sequencing decision above. Key points, in brief (full reasoning lives in each document):

- **API surface** is split between direct-Supabase access (RLS-protected CRUD) and a Vercel custom-endpoint layer for anything needing secrets/third-party calls/cross-cutting effects (Partnership invite/accept/disconnect, Wedding graduate/pause, Plaid, billing, AI). Webhook signature verification on all four inbound webhooks (Plaid/Stripe/Apple/Google) called out as non-negotiable.
- **AI Architecture:** OpenAI Responses API for both AI Coach and Purchase Advisor (model version deliberately left unpinned — an ops detail, not architecture). Context assembly uses function-calling tools that run through the same RLS-respecting path as the rest of the app — the model is structurally incapable of seeing data a user isn't permitted to see, not just instructed not to. System prompt encodes the confirmed regulatory posture (educational only, no product recommendations) and brand voice (never prescriptive, never shame). Untrusted scanned/transcribed content treated as data, never instructions (prompt-injection awareness).
- **Security Architecture (baseline only, by design)** — practical guardrails to build safely now (webhook verification, RLS discipline, secrets management, Sentry PII/financial-data scrubbing, dependency hygiene). Explicitly defers SOC 2, formal pen testing, a written incident-response plan, and adversarial prompt-injection testing to a fuller pass before public launch — not silently dropped, listed as deferred.
- **Frontend Architecture:** `packages/ui` built on React Native + `react-native-web`, so `apps/mobile` and `apps/web` share actual component code, not just business logic — a direct implementation of the "never duplicate UI" rule. TanStack Query for server state, Supabase Realtime for live shared-workspace updates, React Navigation (mobile) / Next.js App Router (web) both implementing the same 5-destination IA.

No code has been written — all four remain documentation, consistent with Rule 1, even though "fast-track to code" is the stated goal; the actual first commit of application code happens after these are reviewed.

### 6.1 Database Architecture (Phase 5, 2026-08-02)

`docs/04 Database/Database Architecture.md` drafted. Key decisions:

| Area | Decision | Status |
|---|---|---|
| Privacy enforcement | Postgres Row-Level Security is the actual privacy gate (not application code) — every personal/shared table checks `owner_id` or `partnership_id` + `is_shared` via RLS policies | Approved 2026-08-02 |
| One active Partnership | Enforced by a partial unique index on `partnership_members`, not just app logic | Approved 2026-08-02 |
| Data retention on disconnect/deletion | Shared data from a disconnected Partnership retained indefinitely as a keepsake; account deletion is request-driven, with a recommended (not yet confirmed) 30-day soft-delete grace period | Approved 2026-08-02 (retention policy); grace period is a pending recommendation |
| Balance history | Daily `account_balance_snapshots` captured from V1, not deferred | Approved 2026-08-02 |
| Audit logging | Lightweight for V1 (`created_at`/`updated_at` + soft-delete only); full audit trail deferred to Security Architecture (Phase 9) | Approved 2026-08-02 |
| Wedding family contributions | Simple ledger line (name/amount/note), no structured contributor entity, no implied account access | Approved 2026-08-02 |
| Plaid token encryption | ~~Recommend Supabase Vault (pgsodium-backed)~~ | **Superseded 2026-08-02 — see §6.4.** No longer available post-Neon pivot; replacement not yet decided |
| AI context assembly | AI service must query through the same RLS-respecting role as the app — never a service-role key that bypasses RLS — flagged as a hard rule for Phase 6/8 | Approved 2026-08-02 |

## 6.3 First Code Milestone (2026-08-02)

Founder asked to move from documentation to a visible build ("do the app"). First real code committed to `apps/mobile` and `packages/ui`, consistent with the fast-track plan — this is a **UI scaffold only**, wired to mock data, not to a real Supabase project (none has been provisioned yet).

- **Monorepo tooling:** npm workspaces (root `package.json`), not yet decided in any prior doc — a low-stakes, easily-changed choice made to get moving.
- **`apps/mobile`:** Expo SDK 57 / React Native 0.86 / React 19.2, TypeScript. React Navigation bottom tabs implementing the confirmed 5-destination IA (Home, Budget, Goals→Wedding, AI Coach, More), including the Wedding-Mode tab relabeling behavior from UX/UI Blueprint §3.2 and Design System §8.
- **`packages/ui`:** design tokens (color, typography, spacing, radius, motion) transcribed directly from Design System §2–§7, built on React Native primitives per Frontend Architecture §2 (so the same components will run in `apps/web` later via `react-native-web`). Implements the text-on-color enforcement table (Design System §2) as a `getTextColorFor()` helper, the glow-based elevation recommendation (Design System §6) on `Card`, and the ownership indicator + stacked per-partner progress bar from UX/UI Blueprint §4/§7.
- **Verified working:** ran in Expo's web mode, screenshotted via headless Chromium — all 5 tabs render correctly against mock data (a sample engaged couple, Ava & Marcus) with no console errors, and `tsc --noEmit` passes clean.
- **Not yet built:** any real backend connection (no Supabase project provisioned), Plaid/Stripe/AI integration, `apps/web`, `apps/admin`, or any of the Vercel API routes from Backend/API Architecture — this milestone is the frontend shell only.

## 7. UX Decisions

Phase 3 (UX/UI Blueprint, `docs/03 UX/UX-UI Blueprint.md`) drafted and approved-pending-sign-off 2026-08-02:

| Area | Decision | Status |
|---|---|---|
| Default appearance mode | **Dark mode primary** (Licorice background), light mode as a Settings toggle | Approved 2026-08-02 |
| Primary navigation | **5 tabs: Home, Budget, Goals, AI Coach, More** — the moodboard's 10 nav concepts consolidate into these plus nested sections (see Blueprint §3.1) | Approved 2026-08-02 |
| Partner-invite timing | Prompted early (right after solo setup), never blocking; re-prompted at natural moments if skipped, never on a nag timer | Approved 2026-08-02 |
| Premium paywall placement | **Contextual** — surfaces at the first Plaid-connection or AI-feature attempt, not upfront at signup | Approved 2026-08-02 |
| Personal vs. Shared visual model | Consistent ownership indicator (avatar glyph) on every card/row; filter/segment control rather than separate screens; sharing-status changes require explicit confirmation + activity-feed entry | Approved 2026-08-02 (Blueprint §4) |
| Onboarding sequence | Sign up → solo setup → partner invite → (if accepted) shared Home moment → Wedding Mode opt-in → contextual Premium trial offer | Approved 2026-08-02 (Blueprint §5) |

**Confirmed 2026-08-02** (previously design judgment calls, now locked before Phase 4 drafting): Wedding Mode relabels the Goals tab to "Wedding" while active, reverting to "Goals" on Graduate; Weekly Money Meeting surfaces as a Home card, not its own tab or a buried settings page.

### 7.1 Design System (Phase 4, 2026-08-02)

`docs/03 UX/Design System.md` drafted, turning Brand Guidelines + UX/UI Blueprint into concrete tokens: semantic color tokens with a hard-enforced text-on-color pairing table (Design System §2), a Bebas Neue Bold/Inter type scale (§3), a 4pt spacing grid (§4), a corner-radius scale defaulting to pill buttons (§5), and a motion timing scale with a required reduced-motion fallback per celebratory moment (§7). One recommendation is flagged as **not yet founder-confirmed**: a glow-based elevation model in place of traditional drop shadows, since flat drop shadows read poorly on the Licorice dark background (§6) — needs visual validation before being locked.

No code has been written yet — `packages/ui` stays a placeholder per Rule 1 until this document is approved; the first real code task afterward is a token file generated directly from it (Design System §9).

## 8. Open Questions

The 8 questions carried in this section as of the PRD draft were put to the founder directly on 2026-08-02 and resolved — answers are recorded in §4, §6, and §12. Reconciling those answers back into the PRD surfaced 3 narrower follow-ups, still open:

1. **Premium billing on disconnect.** The confirmed disconnect decision (§4) covers *data visibility* (frozen read-only access). It does not cover what happens to the *Premium subscription itself* when a Partnership disconnects. Working assumption, not yet confirmed: the payer keeps Premium going forward, no refund/proration.
2. **Legal review scheduling.** AI Financial Coach / Purchase Advisor guardrails are confirmed in principle (§4), but no legal review of the AI-advice posture has been scheduled. Recommend booking it before Phase 8 (AI Architecture) is finalized.
3. **Trademark/domain screening timeline.** Confirmed "Noivos" hasn't been screened yet (§9). Recommend running the screen now, in parallel with Phase 2, rather than waiting until the Marketing Website phase — a conflict found after brand work is done would waste design effort.
Items 4–7 from the previous round (icon library, Success/Warning color mapping, Wedding Mode nav placement, Money Meeting nav placement) were all confirmed by the founder on 2026-08-02 before Phase 4 drafting — see §4/§6/§7 and the Decision Log.

**New from the Supabase → Neon pivot (2026-08-02):**

8. **Plaid access-token encryption.** Supabase Vault is gone; needs a replacement (`pgcrypto` + app-managed key, or a dedicated secrets manager) before Plaid integration is built for real — not yet decided. See §6.4.
9. **Neon project provisioning.** No Neon MCP tool is available in this session, unlike Supabase's — the founder needs to create the Neon project directly (neon.tech) and provide a connection string before the app can move off mock data.

New from Phase 5 (Database Architecture) drafting:

1. **30-day account-deletion grace period.** Recommended in the Database Architecture doc (§12) but not one of the four questions explicitly asked before drafting — needs confirmation before the deletion-purge job is built.
2. **Plaid token encryption approach.** Supabase Vault recommended as a technical choice; full sign-off deferred to Security Architecture (Phase 9), not urgent now.

New from Phase 6 (Backend Architecture) drafting:

3. **Client-to-Supabase access pattern.** Recommended: clients call Supabase directly for simple CRUD (RLS-protected), reserving the Vercel API layer for logic needing secrets/third-party calls — not one of the three founder-confirmed questions. Flag if a single consistent API surface (everything through Vercel) is preferred instead.
4. **Inngest vs. Trigger.dev.** Inngest picked as a reasonable default for the job/queue service; low-stakes, swappable if there's a preference.

New from the Phase 7/8/9/11 fast-track drafting:

5. **React Native Web unification for `packages/ui`.** Decided outright (Frontend Architecture §2) as a direct implementation of the existing "never duplicate UI" rule rather than asked as a fresh question — flag if a fully separate web UI is actually preferred.
6. **AI model version-pinning.** Left deliberately unspecified in AI Architecture (an ops/config detail); whoever implements should pin and periodically revisit the specific OpenAI model used.
7. **Full compliance program timing.** Security Architecture is a baseline only by design — SOC 2, formal pen testing, a written incident-response plan, and adversarial AI prompt-injection testing are all explicitly deferred to a fuller pass before public launch, not scheduled yet.

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
| 2026-08-02 | Reversed the Phase 2 entry above same-day: founder confirmed the Phase 1 moodboard, not the text Brand Statement, is the default brand system | Founder clarified "the one page I sent you" meant the original moodboard image, not the Brand Statement text, when asked directly | Rewrote `docs/03 UX/Brand Guidelines.md` to v2.0: moodboard's palette (Sour Lime/Sour Punch/Electric Blue/Citrus/Grape/Sour Cloud/Licorice) and Bebas Neue Bold typography now govern; Brand Statement's non-visual content (personality, tone, AI voice, design principles, motion, photography, website direction, brand promise, north star) kept as still in force; reinterpreted "Calm before color" given the now-default palette is vivid throughout; recomputed WCAG contrast table against the moodboard's actual hex values; added Success/Warning color mapping (Sour Lime/Citrus reuse) and a "which mode is primary" open item as new recommendations pending confirmation; restructured PROJECT_MEMORY.md §5 into §5.0/5.1/5.2 to keep both rounds fully intact |
| 2026-08-02 | Drafted Phase 3 (UX/UI Blueprint): dark-mode-primary, 5-tab nav (Home/Budget/Goals/AI Coach/More), early-non-blocking partner invite, contextual Premium paywall | Founder confirmed all four via direct Q&A before drafting, since they shape onboarding and IA broadly | Wrote `docs/03 UX/UX-UI Blueprint.md`; updated §7 (UX Decisions) with the confirmed structure; added two design-judgment-call open items (Wedding Mode tab consolidation, Money Meeting placement) to §8 pending founder confirmation |
| 2026-08-02 | Confirmed the four items still open from Phases 2–3 (icon library: Lucide; Success/Warning colors: Sour Lime/Citrus reuse; Wedding Mode relabels the Goals tab; Money Meeting stays a Home card), then drafted Phase 4 (Design System) | Founder answered all four directly before Phase 4 drafting so they wouldn't get silently baked into components | Updated Brand Guidelines §20 and UX/UI Blueprint §11 to mark items resolved; wrote `docs/03 UX/Design System.md` — color/type/spacing/radius/motion tokens, text-on-color enforcement table, core component specs; flagged a glow-based elevation model (§6) as a recommendation still pending visual validation |
| 2026-08-02 | Confirmed data retention (keepsake by default, request-driven deletion), daily balance snapshots from V1, lightweight V1 audit logging (full trail deferred to Phase 9), and simple-ledger family contributions, then drafted Phase 5 (Database Architecture) | Founder answered all four directly before Phase 5 drafting since they're expensive to change once migrations exist | Wrote `docs/04 Database/Database Architecture.md` — full entity model, RLS-based privacy enforcement strategy, one-active-partnership constraint, disconnect freeze mechanics, retention/deletion policy, encryption recommendation (Supabase Vault); added a hard rule that AI/background services must never use a service-role key that bypasses RLS |
| 2026-08-02 | Re-sequenced the Documentation Roadmap: "fast-track to code" — prioritize Backend Architecture, API Documentation, AI Architecture, a Security Architecture baseline, and Frontend Architecture (the 5 remaining docs that actually gate engineering), then start building. Marketing Website, Admin Dashboard, Analytics, Testing Strategy, Launch Strategy, Business Plan, and Investor Documentation deferred, not skipped | Founder asked how much planning remained; offered a full-sequence option and a fast-track option distinguishing engineering-blocking docs from business/marketing docs that don't gate code — founder chose fast-track | Updated `docs/README.md` roadmap to reflect the new priority order and mark 7 documents as deferred-not-skipped; no change to already-approved documents |
| 2026-08-02 | Confirmed backend topology (Vercel API layer + Supabase Postgres/Auth/Storage, not Edge Functions), Plaid sync strategy (webhook + daily reconciliation poll), and job scheduling (Inngest, not pg_cron), then drafted Phase 6 (Backend Architecture) | Founder answered all three directly before drafting since they set the shape of every subsequent backend/API/AI phase | Wrote `docs/07 Backend/Backend Architecture.md` — system topology diagram, auth-passthrough rule (RLS still governs even through the API layer, service-role reserved for async/system-initiated writes only), Plaid integration flow, billing entitlement reconciliation across Stripe/IAP/Play Billing, AI service boundary (context assembly must use the same RLS-respecting path), background job list, notification dispatch |
| 2026-08-02 | Drafted the remaining fast-track documents together at founder request (API Documentation, AI Architecture, Security Architecture baseline, Frontend Architecture — Phases 7/8/9/11) | Founder said to get planning done as fast as possible; these four build directly on already-approved Backend/Database/Design decisions with no remaining founder-level forks large enough to justify pausing for Q&A | Wrote all four documents; updated §6 with a combined summary, §8 with 3 new flagged items (RN-Web unification, AI model pinning, deferred compliance program), and this log entry; completes the 5-document fast-track list — engineering can start once these are reviewed |
| 2026-08-02 | Started real implementation: `apps/mobile` (Expo/React Native) and `packages/ui` (shared design tokens/components), wired to mock data, no backend yet | Founder asked to move from documentation to a visible build, prioritizing the app over the marketing website | First code committed since the repo was scaffolded; verified via a headless-browser screenshot pass (5 tabs, no console errors) and a clean `tsc --noEmit`; full detail in §6.3 |
| 2026-08-02 | Pivoted the backend off Supabase entirely: Neon replaces Supabase Postgres, Clerk replaces Supabase Auth, Vercel Blob replaces Supabase Storage | Supabase was unworkable in the founder's environment ("unable to do Supabase"); founder directed "we can do Neon" | Updated Technical Decisions (§6) and added §6.4 documenting the full pivot; RLS design and schema (Database Architecture) carry over unchanged since they're plain Postgres features; Plaid token encryption approach is now an open question (Supabase Vault is gone, no replacement chosen yet); Neon project itself still needs to be created by the founder since no Neon MCP tool is available in this session |
| 2026-08-02 | Wrote and functionally tested the real schema (`packages/database/migrations/0001_init.sql`, `0002_rls.sql`) against a local Postgres instance | Wanted actual proof the RLS privacy model works, not just a syntax check, before it's ever pointed at a live Neon database | Applied both migrations to a scratch local database, ran adversarial-style tests as a non-superuser role (shared-vs-personal visibility, mutate-without-owning, post-disconnect freeze) — all passed; caught and fixed a real gap (missing INSERT policies on `users`/`partnerships`/`partnership_members` that would have blocked account/Partnership creation entirely) |

---

*Do not delete history from this file. Append new sections and log entries as decisions are made. If this file conflicts with a new document or instruction, stop and ask the founder before proceeding.*
