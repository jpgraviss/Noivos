import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/clerk";
import { withUserContext } from "@/lib/db";
import { findActiveMembership } from "@/lib/partnership";
import { stripeConfigured } from "@/lib/stripe";

// Backs the Billing section in MoreScreen.tsx — current subscription
// status for this user's Partnership, or an honest "no Partnership yet" /
// "billing isn't live yet" state rather than guessing.
export async function GET() {
  if (!clerkConfigured()) {
    return NextResponse.json({ error: "Clerk isn't configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const membership = await withUserContext(userId, (client) => findActiveMembership(userId, client));
    if (!membership) {
      return NextResponse.json({ billingLive: stripeConfigured(), hasPartnership: false, status: "none" as const });
    }

    const subscription = await withUserContext(userId, async (client) => {
      const result = await client.query(
        `select status, trial_ends_at::text as trial_ends_at, current_period_end::text as current_period_end
         from subscriptions where partnership_id = $1 order by created_at desc limit 1`,
        [membership.partnership_id]
      );
      return result.rows[0] ?? null;
    });

    return NextResponse.json({
      billingLive: stripeConfigured(),
      hasPartnership: true,
      status: (subscription?.status as string | undefined) ?? "none",
      trialEndsAt: (subscription?.trial_ends_at as string | undefined) ?? null,
      currentPeriodEnd: (subscription?.current_period_end as string | undefined) ?? null,
    });
  } catch (err) {
    console.error("GET /api/billing failed", err);
    return NextResponse.json({ error: "Couldn't load billing status." }, { status: 500 });
  }
}
