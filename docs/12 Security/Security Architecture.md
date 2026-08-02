# Noivos — Security Architecture (Baseline)

**Status:** Draft v1.0 — awaiting founder sign-off
**Phase:** 9 of the (re-sequenced) Documentation Roadmap
**Last updated:** 2026-08-02
**Scope note:** this is the **baseline pass** the founder asked for to unblock engineering — practical, actionable guardrails for building safely now. A full compliance program (SOC 2, formal pen testing, a written incident-response plan) is a separate, larger effort to schedule closer to public launch, not reproduced here. Every item deferred to that later pass is listed explicitly in §8, not silently dropped.

---

## 1. Data Classification

| Class | Examples | Handling |
|---|---|---|
| Credential-grade secrets | Plaid `access_token`, API keys (OpenAI, Stripe, Plaid, FCM/APNs) | Encrypted at rest (Supabase Vault, Database Architecture §14); never in client code, logs, or git; only in Vercel/Supabase environment config |
| Sensitive financial data | Account balances, transactions, income signals | RLS-gated (Database Architecture §10); never touched by a service-role bypass for a live user request (Backend Architecture §2) |
| PII | Email, name, avatar | Standard Supabase Auth handling; included in the deletion flow (Database Architecture §12) |
| Card/payment data | Card numbers | **Noivos never touches raw card data at all** — Stripe/Apple/Google Play own it entirely, keeping this out of PCI scope by design, not by effort |

## 2. Webhook Security — non-negotiable, called out again from API Documentation §6

All four inbound webhook endpoints (`/api/webhooks/plaid`, `/stripe`, `/apple`, `/google-play`) **must verify the provider's signature before processing anything** — Plaid's `Plaid-Verification` header, Stripe's `Stripe-Signature` header, Apple's signed JWS payload, Google's Pub/Sub authentication. An unverified webhook is an open door to forging "transaction added" or "subscription active" events. This is the single highest-leverage baseline item, since it's cheap to get right and expensive to get wrong.

## 3. Access Control

- **RLS is the enforcement layer** (Database Architecture §10) — every table with personal/shared data has a policy; this baseline's job is making sure that stays true as new tables get added, not re-deriving it.
- **Service-role usage is restricted to async/system-initiated writes** (Backend Architecture §2) — recommend a lightweight code-review checklist item ("does this use the service-role client? If yes, is there really no live user session here?") rather than a heavier automated gate for V1 — proportionate to a pre-launch team's size.
- **Least-privilege for third-party API keys** — Plaid, Stripe, and OpenAI keys scoped to what each actually needs (e.g., Plaid's development/sandbox vs. production keys never shared across environments).

## 4. Secrets Management

Vercel environment variables (per-environment: dev/staging/production, matching Backend Architecture §10's Supabase-branch model) for API keys; Supabase Vault for the one credential stored *in* the database (Plaid `access_token`, since it's per-user and relational, not a global secret). No secret ever committed to the repository — a pre-commit or CI secret-scanning check is a cheap, worthwhile baseline addition (the GitHub MCP tooling already available to this project includes a secret-scanning capability worth wiring in early).

## 5. Application-Layer Baseline

- **Rate limiting:** per-user limits on `/api/ai/*` (real per-token cost) and `/api/plaid/link-token` (real per-call cost to a paid third party), per Backend Architecture §9 — implemented as simple per-user/per-IP counters for V1, not a dedicated service.
- **Input validation:** every custom Vercel endpoint (API Documentation §3) validates its request shape server-side, not just client-side — the client-side validation is a UX nicety, the server-side check is the actual boundary.
- **Prompt-injection awareness:** carried from AI Architecture §6 — untrusted content (scanned receipts, transcribed voice) is treated as data, not instructions, in prompt construction.
- **Logging discipline:** Sentry (already chosen, `PROJECT_MEMORY.md` §6) must be configured to **scrub financial data and PII from error reports** — an error log is not an exemption from the same data-sensitivity rules as everything else in this document. This is an easy thing to get wrong by default (many SDKs capture request bodies) and worth flagging explicitly.

## 6. Authentication Security

Supabase Auth handles password hashing, session/token issuance, and Apple/Google OAuth flows — no custom auth code to secure. Recommend enabling Supabase's built-in session expiry/refresh-token rotation defaults rather than customizing them without a specific reason.

## 7. Dependency Hygiene

Lockfiles committed, automated dependency update tooling (Dependabot/Renovate) enabled from the start — cheap insurance, no reason to defer.

## 8. Explicitly Deferred to a Full Compliance Pass (Not Silently Dropped)

- **SOC 2 timeline** — still unscheduled (`PROJECT_MEMORY.md` §9), a real prerequisite for handling banking data at scale, but not a blocker for early engineering on a pre-launch product.
- **Formal penetration testing** — not done, not scheduled; recommend before public launch, not before internal development.
- **Written incident-response plan** — a real gap; this document doesn't create one, only flags that one is needed before public launch (who gets paged, breach notification obligations, etc.).
- **Legal review of the AI advice posture** — carried forward from every prior phase, still unscheduled, still a launch-blocker for AI Coach/Purchase Advisor specifically.
- **Full audit-log table** — deferred here per the founder's Phase 5 confirmation (Database Architecture §13); V1 ships with `created_at`/`updated_at` + soft-delete only.
- **Adversarial prompt-injection testing** — AI Architecture §8 flagged this as needed before public launch; this baseline only establishes the design intent, not a tested defense.
- **Data residency/compliance beyond CCPA-style right-to-delete** — no GDPR-specific program, consistent with the confirmed US-only launch scope (`PROJECT_MEMORY.md` §4).

---

*Next: Phase 11 — Frontend Architecture, the last document on the fast-track list before engineering starts in earnest.*
