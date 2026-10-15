import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { withUserContext } from "@/lib/db";
import { getStripeClient, stripeConfigured, stripeWebhookConfigured } from "@/lib/stripe";

// Stripe is the source of truth for whether a subscription is real — this
// is the only place that writes to the `subscriptions` table (migration
// 0017's own comment). Every write runs through withUserContext(payerUserId,
// ...), same as every other table in this app — no service-role/RLS-bypass
// connection. payerUserId/partnershipId come from Checkout Session /
// Subscription metadata set in /api/billing/checkout, not from a database
// lookup, which is exactly why that route sets subscription_data.metadata
// too: so every later event for this subscription carries them along.
export async function POST(request: Request) {
  if (!stripeConfigured() || !stripeWebhookConfigured()) {
    return NextResponse.json({ error: "Billing isn't configured yet" }, { status: 503 });
  }

  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const partnershipId = session.metadata?.partnershipId;
        const payerUserId = session.metadata?.payerUserId;
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        if (!partnershipId || !payerUserId || !subscriptionId) {
          console.error("checkout.session.completed missing required metadata", { partnershipId, payerUserId, subscriptionId });
          break;
        }
        // Not assumed 'active' — a trial (PROJECT_MEMORY.md's 14-day
        // trial, set via subscription_data.trial_period_days in
        // /api/billing/checkout) means Stripe's own status here is
        // 'trialing' at this exact moment, not 'active' yet.
        const stripe = getStripeClient();
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const currentPeriodEnd = subscription.items.data[0]?.current_period_end;
        await withUserContext(payerUserId, async (client) => {
          await client.query(
            `insert into subscriptions (partnership_id, payer_user_id, billing_route, external_subscription_id, status, trial_ends_at, current_period_end, stripe_customer_id)
             values ($1, $2, 'stripe_web', $3, $4, to_timestamp($5), to_timestamp($6), $7)`,
            [
              partnershipId,
              payerUserId,
              subscriptionId,
              subscription.status,
              subscription.trial_end ?? null,
              currentPeriodEnd ?? null,
              customerId ?? null,
            ]
          );
        });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const payerUserId = subscription.metadata?.payerUserId;
        if (!payerUserId) {
          console.error("customer.subscription.updated missing payerUserId metadata", { id: subscription.id });
          break;
        }
        const currentPeriodEnd = subscription.items.data[0]?.current_period_end;
        await withUserContext(payerUserId, async (client) => {
          await client.query(
            `update subscriptions
             set status = $2,
                 current_period_end = to_timestamp($3),
                 trial_ends_at = case when $4::bigint is not null then to_timestamp($4) else trial_ends_at end,
                 updated_at = now()
             where external_subscription_id = $1`,
            [
              subscription.id,
              subscription.status,
              currentPeriodEnd ?? null,
              subscription.trial_end ?? null,
            ]
          );
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const payerUserId = subscription.metadata?.payerUserId;
        if (!payerUserId) {
          console.error("customer.subscription.deleted missing payerUserId metadata", { id: subscription.id });
          break;
        }
        await withUserContext(payerUserId, async (client) => {
          await client.query(
            `update subscriptions set status = 'canceled', updated_at = now() where external_subscription_id = $1`,
            [subscription.id]
          );
        });
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error(`Stripe webhook handler failed for event ${event.type}`, err);
    return NextResponse.json({ error: "Failed to process event" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
