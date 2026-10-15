import Stripe from "stripe";

// Noivos Premium ($100/year, PRD §13) — real for the first time as of
// 2026-10-14 (SE-204, found during the 2026-10-13 full system audit: Plaid,
// AI Coach, and AI Purchase Advisor were all shipped free and unrestricted,
// with no entitlement check anywhere and no payment integration at all).
// Billing is per-Partnership, not per-person — one partner subscribes and
// it covers both, matching `subscriptions.partnership_id` having carried a
// `not null` constraint since 0001_init.sql, long before any billing code
// existed to write to it.
//
// Same graceful-degradation posture as clerkConfigured()/plaidConfigured()/
// aiConfigured(): no STRIPE_SECRET_KEY means this ships safely with no
// credentials set. See lib/entitlements.ts's own comment for what that
// means for enforcement specifically — it's not just "routes 503," the
// entitlement gate itself only turns on once Stripe is configured.
export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function stripeWebhookConfigured(): boolean {
  return Boolean(process.env.STRIPE_WEBHOOK_SECRET);
}

// The Stripe Price object for Noivos Premium, created once in the Stripe
// Dashboard (or via `stripe prices create`) — never hardcoded here, since a
// price id is environment-specific (test mode vs. live mode each have
// their own) in a way an API key already captures but a literal string in
// source code wouldn't.
export function premiumPriceId(): string | null {
  return process.env.STRIPE_PREMIUM_PRICE_ID ?? null;
}

let cachedClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!cachedClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY is not set — call stripeConfigured() first");
    }
    cachedClient = new Stripe(secretKey);
  }
  return cachedClient;
}
