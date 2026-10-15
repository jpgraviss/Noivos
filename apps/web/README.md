# @noivos/web

Next.js 16 App Router app (per `docs/08 Frontend/Frontend Architecture.md` §2) — planned to eventually host both the authenticated web app and, per `docs/07 Backend/Backend Architecture.md`, the Vercel API layer (`/api/*` routes). Currently just a Clerk-enabled shell proving the auth wiring works — no real pages, API routes, or `packages/ui` integration yet.

## Auth

Clerk, replacing Supabase Auth (`PROJECT_MEMORY.md` §6.4). `src/proxy.ts` uses `clerkMiddleware()` — Next.js 16 renamed Middleware to Proxy, functionality unchanged. `src/app/layout.tsx` wraps everything in `ClerkProvider` and uses `<Show when="signed-in">` / `<Show when="signed-out">` (the current SDK's replacement for the deprecated `<SignedIn>`/`<SignedOut>`).

Requires `apps/web/.env.local` (gitignored, never commit):
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

## AI Coach / Purchase Advisor

`POST`/`GET /api/ai/coach` and `POST`/`GET /api/ai/purchase-advisor` (both in `lib/ai.ts`) need the same `ANTHROPIC_API_KEY` set (Vercel env vars in production, `.env.local` locally) to call the real Claude API. Without it, `aiConfigured()` makes either route return an honest 503 rather than crash — same graceful-degradation posture as `clerkConfigured()`. See `lib/ai.ts`'s own top-of-file comment for the legal-review distinction this feature carries (built for an internal demo, not cleared for public launch). `AICoachScreen.tsx` is one unified chat UI over both: a plain typed question goes to the Coach, attaching a photo routes to the Purchase Advisor (receipt/price-tag/photo scanning via Claude's vision input — no separate OCR service or env var needed for that part).

## Plaid (bank connections)

`/api/plaid/*` (`lib/plaid.ts`) needs three env vars, none of which have real values in this sandbox:
```
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=sandbox
PLAID_TOKEN_ENCRYPTION_KEY=
```
`PLAID_CLIENT_ID`/`PLAID_SECRET` come from a Plaid Dashboard account (`PLAID_ENV=sandbox` for test institutions/test credentials — the founder's own stated intent, not real bank data). `PLAID_TOKEN_ENCRYPTION_KEY` is this app's own AES-256-GCM key for encrypting Plaid access tokens before they reach `plaid_items.access_token_encrypted` — generate one with `openssl rand -base64 32`, and treat it as seriously as a database credential (losing it makes every already-linked bank connection unreadable; leaking it defeats the point of encrypting the tokens at all). Without either the Plaid credentials or the encryption key, every `/api/plaid/*` route returns an honest 503 — same posture as `ANTHROPIC_API_KEY`/`clerkConfigured()`.

## Billing (Noivos Premium) + account deletion

`/api/billing/*` (`lib/stripe.ts`/`lib/entitlements.ts`) needs:
```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PREMIUM_PRICE_ID=
```
`STRIPE_PREMIUM_PRICE_ID` is a Stripe Price object created once in the Dashboard for the $100/year Premium plan (PRD §13) — never hardcoded here since test-mode and live-mode each have their own id. Billing is per-Partnership (one payer covers both partners) and includes a 14-day trial gated on both partners actually having joined (`PROJECT_MEMORY.md` §4), enforced in `POST /api/billing/checkout`.

The entitlement gate itself (`isPremium()` in `lib/entitlements.ts`) is wired into the four Premium feature actions — `POST /api/plaid/link-token`, `POST /api/plaid/sync`, `POST /api/ai/coach`, `POST /api/ai/purchase-advisor` — but only actually enforces once `STRIPE_SECRET_KEY` is set. Until then every one of those stays free, same graceful-degradation posture as every other integration in this app; this is deliberate, not a bug, since enforcing before there's a real way to pay would just lock everyone out.

`POST /api/webhooks/stripe` needs `STRIPE_WEBHOOK_SECRET` from the Stripe Dashboard's webhook endpoint config (subscribe it to `checkout.session.completed`/`customer.subscription.updated`/`customer.subscription.deleted`) — this is the only place that writes to the `subscriptions` table.

Account deletion (`lib/accountDeletion.ts`, `POST /api/account/delete`, `POST /api/webhooks/clerk`) needs one more env var:
```
CLERK_WEBHOOK_SECRET=
```
from Clerk's Dashboard webhook config (subscribe it to `user.deleted`) — covers the case where an account is deleted directly from Clerk rather than through Noivos' own "Delete my account" action. Without it, `/api/webhooks/clerk` returns an honest 503; the app's own delete-my-account flow works regardless, since it doesn't depend on the webhook at all.

## Known gap

This environment's network egress policy blocks this project's Clerk instance host, so full end-to-end sign-in can't be verified from inside this sandbox — see `PROJECT_MEMORY.md`'s Supabase→Neon pivot section for the exact error and next steps (add the host to egress settings, or test via a real Vercel deployment / locally).

## Run

```bash
npm run dev --workspace=@noivos/web
```
