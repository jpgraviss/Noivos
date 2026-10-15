import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/clerk";
import { withUserContext } from "@/lib/db";
import { findActiveMembership } from "@/lib/partnership";
import { getStripeClient, stripeConfigured } from "@/lib/stripe";
import { SITE_URL } from "@/lib/site";

// Hands off to Stripe's own hosted Billing Portal (update payment method,
// view invoices, cancel) rather than this app building any of that itself
// — same "let Stripe/Plaid/Clerk's own hosted UI do the hard, regulated
// part" posture as Plaid Link and Clerk's own sign-in pages.
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

  const membership = await withUserContext(userId, (client) => findActiveMembership(userId, client));
  if (!membership) {
    return NextResponse.json({ error: "You need an active Partnership to manage billing." }, { status: 409 });
  }

  try {
    const customerId = await withUserContext(userId, async (client) => {
      const result = await client.query(
        `select stripe_customer_id from subscriptions where partnership_id = $1 and stripe_customer_id is not null order by created_at desc limit 1`,
        [membership.partnership_id]
      );
      return (result.rows[0]?.stripe_customer_id as string | undefined) ?? null;
    });
    if (!customerId) {
      return NextResponse.json({ error: "No subscription found for your Partnership yet." }, { status: 404 });
    }

    const stripe = getStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${SITE_URL}/?billing=portal-return`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("POST /api/billing/portal failed", err);
    return NextResponse.json({ error: "Couldn't open billing." }, { status: 500 });
  }
}
