import { withUserContext } from "./db";
import { findActiveMembership } from "./partnership";
import { stripeConfigured } from "./stripe";

// Whether this Partnership currently has an active (or still-trialing)
// Noivos Premium subscription. Billing is per-Partnership (see
// lib/stripe.ts's own comment) — a user with no active Partnership can
// never be "premium," by the same schema constraint that makes a
// Partnership-less subscription impossible to create in the first place.
//
// Deliberately permissive about a stale current_period_end/trial_ends_at:
// Stripe's own webhooks (customer.subscription.updated/deleted) are the
// real source of truth for `status`, so a `status = 'active'` row with a
// null current_period_end (not yet synced, or a plan Stripe doesn't bill
// on a period at all) still counts as entitled rather than being treated
// as expired by a timestamp this app doesn't actually have yet.
async function isPremiumForPartnership(partnershipId: string, userId: string): Promise<boolean> {
  return withUserContext(userId, async (client) => {
    const result = await client.query(
      `select status, trial_ends_at, current_period_end
       from subscriptions
       where partnership_id = $1
       order by created_at desc
       limit 1`,
      [partnershipId]
    );
    const row = result.rows[0] as { status: string; trial_ends_at: string | null; current_period_end: string | null } | undefined;
    if (!row) return false;
    if (row.status === "trialing") {
      return !row.trial_ends_at || new Date(row.trial_ends_at) > new Date();
    }
    if (row.status === "active") {
      return !row.current_period_end || new Date(row.current_period_end) > new Date();
    }
    return false;
  });
}

// The gate every Premium-feature route calls. Enforcement itself only
// turns on once Stripe is actually configured — same "ships safely with no
// credentials set" posture as every other integration in this app
// (clerkConfigured()/plaidConfigured()/aiConfigured()). Before that, every
// one of these features stays exactly as free as it is today: this was a
// deliberate call, not an oversight — flipping this on unconditionally the
// moment this code merges would lock the founder (and anyone else already
// using these features for free) out immediately, with no way to pay since
// there's no live Stripe account behind STRIPE_PREMIUM_PRICE_ID yet. The
// founder turns this on for real by setting STRIPE_SECRET_KEY in Vercel —
// a deliberate launch step, same as every other "dashboard step activates
// the already-real code" integration here.
export async function isPremium(userId: string): Promise<boolean> {
  if (!stripeConfigured()) return true;
  const membership = await withUserContext(userId, (client) => findActiveMembership(userId, client));
  if (!membership) return false;
  return isPremiumForPartnership(membership.partnership_id as string, userId);
}
