import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/clerk";
import { withUserContext } from "@/lib/db";
import { findActiveMembership } from "@/lib/partnership";
import { getStripeClient, stripeConfigured, premiumPriceId } from "@/lib/stripe";
import { SITE_URL } from "@/lib/site";

// Starts a Stripe Checkout session for Noivos Premium. Billing is per-
// Partnership (lib/stripe.ts) — whichever partner starts checkout becomes
// `payer_user_id` on the resulting subscriptions row, same as how either
// partner can equally invite/disconnect in PartnershipSettings.tsx today.
//
// The subscription itself isn't written to the database here — Stripe
// Checkout is the source of truth for whether payment actually succeeded,
// so the real insert happens in /api/webhooks/stripe's
// `checkout.session.completed` handler, not optimistically on this
// request. partnershipId/payerUserId travel as Checkout Session metadata
// (copied onto the created Subscription object via subscription_data too)
// so that webhook — and every later subscription.updated/deleted event for
// this same subscription — can resolve both without a database lookup.
export async function POST() {
  if (!clerkConfigured()) {
    return NextResponse.json({ error: "Clerk isn't configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Billing isn't configured yet" }, { status: 503 });
  }
  const priceId = premiumPriceId();
  if (!priceId) {
    return NextResponse.json({ error: "Billing isn't configured yet" }, { status: 503 });
  }

  const membership = await withUserContext(userId, (client) => findActiveMembership(userId, client));
  if (!membership) {
    return NextResponse.json({ error: "You need an active Partnership before subscribing." }, { status: 409 });
  }

  // PROJECT_MEMORY.md §4: "14-day free trial, gated behind partner-invite
  // acceptance — both partners must be in before the trial starts."
  // findActiveMembership() alone isn't enough to prove that — a brand-new
  // Partnership is created with status='active' the moment the *first*
  // partner sends an invite (api/partnership/invite/route.ts's own
  // documented fast-track decision), specifically so that one person can
  // use the workspace solo before anyone accepts. A real second member row
  // is the only genuine signal both partners are actually in.
  const { partnerCount, hadPriorSubscription } = await withUserContext(userId, async (client) => {
    const members = await client.query(
      `select count(*)::int as count from partnership_members where partnership_id = $1 and left_at is null`,
      [membership.partnership_id]
    );
    const prior = await client.query(`select 1 from subscriptions where partnership_id = $1 limit 1`, [
      membership.partnership_id,
    ]);
    return { partnerCount: members.rows[0].count as number, hadPriorSubscription: prior.rows.length > 0 };
  });
  if (partnerCount < 2) {
    return NextResponse.json({ error: "Your partner needs to join before you can start a subscription." }, { status: 409 });
  }

  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: membership.partnership_id as string,
      metadata: { partnershipId: membership.partnership_id as string, payerUserId: userId },
      subscription_data: {
        // One 14-day trial per Partnership, not per checkout attempt — a
        // Partnership that already has any subscriptions row (even a
        // canceled one) goes straight to paid instead of getting a second
        // free trial.
        trial_period_days: hadPriorSubscription ? undefined : 14,
        metadata: { partnershipId: membership.partnership_id as string, payerUserId: userId },
      },
      // This is a single-page app shell (AppShell.tsx) with no distinct
      // "/more" route to deep-link into — landing back on "/" after
      // Checkout and letting the user tap back into More themselves is the
      // honest option rather than guessing at a route that doesn't exist.
      success_url: `${SITE_URL}/?billing=success`,
      cancel_url: `${SITE_URL}/?billing=canceled`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("POST /api/billing/checkout failed", err);
    return NextResponse.json({ error: "Couldn't start checkout." }, { status: 500 });
  }
}
