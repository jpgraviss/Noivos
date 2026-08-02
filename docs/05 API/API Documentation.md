# Noivos — API Documentation

**Status:** Draft v1.0 — awaiting founder sign-off
**Phase:** 7 of the (re-sequenced) Documentation Roadmap
**Last updated:** 2026-08-02
**Source of truth precedence:** Downstream of Backend Architecture (`docs/07 Backend/Backend Architecture.md`) §1's hybrid access pattern and Database Architecture (`docs/04 Database/Database Architecture.md`) for the underlying schema/RLS.

> Moving fast per the founder's direction — this document makes reasonable, documented calls on endpoint shape rather than pausing for per-endpoint sign-off. Anything genuinely risky is flagged in §6, not silently decided.

---

## 1. Two Kinds of API Surface

Per Backend Architecture §1's confirmed hybrid: most of the app's data access **is not a custom API at all** — it's the Supabase client SDK talking directly to Postgres, secured entirely by the RLS policies in Database Architecture §10. Only logic needing a secret, a third-party call, or cross-cutting effects goes through the Vercel API layer. This document covers both, since "the API" for this product means both surfaces together.

## 2. Direct-Supabase Resources (RLS-protected, no custom endpoint)

Standard Supabase auto-generated REST/`postgrest` access (or the Supabase JS/RN client's query builder) against these tables, gated entirely by the RLS policies already specified in Database Architecture:

| Resource | Client operations | Notes |
|---|---|---|
| `accounts` | read, update (`display_name`, `is_shared`) | Create only via `/api/plaid/exchange` or a manual-account custom flow (§3.4) — not raw insert, since manual accounts still need validation |
| `transactions` | read, create, update, soft-delete | Manual transaction entry (PRD §12.5) is a direct insert |
| `categories`, `recurring_expenses` | read, create, update | |
| `budgets`, `budget_categories` | read, create, update | |
| `goals`, `goal_contributions` | read, create, update | |
| `wedding_vendors`, `wedding_checklist_items`, `wedding_family_contributions` | read, create, update | |
| `money_meetings` | read, update (`status`, `summary_notes`) | Agenda content (`agenda` jsonb) is written only by the Inngest job (Backend Architecture §6) — read-only from the client's perspective |
| `activity_feed_events` | read only | Never client-writable directly — always written server-side (by the API layer or a job) after the underlying shared data change is validated, so the feed can't be spoofed or made to leak unshared data |
| `notifications` | read, update (`read_at`) | |
| `challenges`, `challenge_participations` | read, create (join a challenge) | |

## 3. Vercel API Layer — Endpoint Contracts

All routes require a Supabase Auth bearer token unless noted. Errors follow `{ error: { code, message } }` (Backend Architecture §8).

### 3.1 Partnerships
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/partnerships/invite` | POST | Creates a `partnership_invites` row, sends the invite (email/SMS), generates the token — custom because it triggers an external send, not a plain insert |
| `/api/partnerships/accept` | POST | Validates the invite token, creates/activates the `partnerships` + `partnership_members` rows atomically — custom because it's multi-table and must enforce the one-active-Partnership constraint (Database Architecture §3.3) with a clear error if violated |
| `/api/partnerships/disconnect` | POST | Sets `partnerships.status = disconnected`, `disconnected_at`, `disconnected_by`, both members' `left_at` — custom because it's the multi-step, multi-table freeze operation from Database Architecture §11, not a simple update |

### 3.2 Wedding Mode
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/wedding/graduate` | POST | Archives Wedding Mode (`wedding_details.status = graduated`), reverts the tab per UX/UI Blueprint §3.2 — custom because it's a celebratory, multi-effect transition, not a field update |
| `/api/wedding/pause` | POST | The non-celebratory exit path (postponed/cancelled) — sets `status = paused_or_cancelled` without the graduation side effects |

### 3.3 Plaid (per Backend Architecture §3)
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/plaid/link-token` | POST | Requests a Link token from Plaid for the current user |
| `/api/plaid/exchange` | POST | Exchanges a Link public token for an access token; creates `plaid_items` + `accounts` rows |
| `/api/webhooks/plaid` | POST | Plaid-initiated; verified via Plaid's webhook signature (see §6) |

### 3.4 Manual Accounts
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/accounts/manual` | POST | Creates a manual `accounts` row with basic validation (positive balance format, required fields) — kept custom rather than a raw insert so validation lives in one place |

### 3.5 Billing (per Backend Architecture §4)
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/billing/checkout` | POST | Creates a Stripe Checkout session (web) for a Partnership, enforcing the invite-gated trial rule |
| `/api/billing/portal` | POST | Stripe customer portal link for managing/canceling a web subscription |
| `/api/webhooks/stripe` | POST | Stripe-initiated; verified via Stripe's signature header (see §6) |
| `/api/webhooks/apple` | POST | Apple App Store Server Notifications v2 (added when mobile billing ships) |
| `/api/webhooks/google-play` | POST | Google Play Real-time Developer Notifications (added when mobile billing ships) |
| `/api/subscriptions/status` | GET | Returns the current Partnership's computed Premium status regardless of billing route |

### 3.6 AI (per Backend Architecture §5)
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/ai/coach` | POST | AI Financial Coach conversational turn; streams the response |
| `/api/ai/purchase-advisor` | POST | Accepts text/voice-transcript/image (receipt or price-tag scan) input; returns financial impact, goal impact, discussion prompts (PRD §12.9) |

### 3.7 Account Lifecycle
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/account/delete` | POST | Initiates the confirmed request-driven deletion (Database Architecture §12) — sets `users.deleted_at`, starts the grace-period clock once that's confirmed |

## 4. Auth

Every endpoint above (except the four `/api/webhooks/*` routes, which authenticate via provider-specific signature verification instead of a user token) requires a valid Supabase Auth bearer token, forwarded as-is so the underlying Supabase client stays user-scoped per Backend Architecture §2 — never a service-role shortcut for a user-initiated request.

## 5. Error Codes (starting set)

`unauthorized`, `forbidden` (an RLS-style denial surfaced from a custom endpoint), `not_found`, `validation_error`, `partnership_already_active` (the one-active-Partnership constraint), `invite_expired`, `plaid_item_error`, `subscription_required` (a Premium-gated action attempted without an active subscription), `rate_limited`. Each maps to calm, non-technical client copy per UX/UI Blueprint §8 — this document owns the codes, not the copy.

## 6. Flagged — Not Silently Decided

- **Webhook signature verification is non-negotiable for all four `/api/webhooks/*` routes** (Plaid, Stripe, Apple, Google) — an unverified webhook endpoint would let anyone forge a "payment succeeded" or "transaction added" event. This is called out here explicitly rather than assumed, and gets a fuller pass in Security Architecture (§9, Phase 9).
- Rate limiting on `/api/ai/*` and `/api/plaid/link-token` (real per-call cost) is scoped in Backend Architecture §9 but not fully specified here — deferred to Security Architecture.
- Exact request/response JSON schemas per endpoint are intentionally left at the conceptual level in this document — pinning them down further belongs to implementation (a shared `packages/api` types file), not this architecture doc.

---

*Next: Phase 8 — AI Architecture, which defines what actually happens inside `/api/ai/coach` and `/api/ai/purchase-advisor`.*
