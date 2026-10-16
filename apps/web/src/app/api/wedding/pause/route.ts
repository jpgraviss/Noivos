import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/clerk";
import { withUserContext } from "@/lib/db";
import { findActiveMembership } from "@/lib/partnership";

// PRD §12.8's edge case: "postponed or cancelled weddings — Graduate must
// not be the only way out of Wedding Mode; a couple needs a non-celebratory
// path to pause/exit Wedding Mode gracefully." No activity-feed event here
// (unlike graduate/route.ts) — deliberately non-celebratory, matching that
// framing exactly.
//
// 'paused_or_cancelled' is a single enum value covering both a temporary
// postponement and a permanent cancellation (wedding_details.status's own
// check constraint, 0001_init.sql) — this app has no "resume" action back
// to 'active' yet, since nothing in the PRD specifically asks for one and
// building it would be guessing at a flow the founder hasn't designed.
// Flagged here rather than silently assumed out of scope.
export async function POST() {
  if (!clerkConfigured()) {
    return NextResponse.json({ error: "Clerk isn't configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const result = await withUserContext(userId, async (client) => {
      const membership = await findActiveMembership(userId, client);
      if (!membership) {
        return { noPartnership: true as const };
      }
      const updated = await client.query(
        `update wedding_details
         set status = 'paused_or_cancelled'
         where partnership_id = $1 and status = 'active'
         returning id, wedding_date::text as wedding_date, guest_count_estimate, status, graduated_at::text as graduated_at`,
        [membership.partnership_id]
      );
      if (!updated.rows[0]) {
        return { notEligible: true as const };
      }
      return { paused: true as const, details: updated.rows[0] };
    });

    if (result.noPartnership) {
      return NextResponse.json({ error: "Set up a Partnership before pausing Wedding Mode." }, { status: 400 });
    }
    if (result.notEligible) {
      return NextResponse.json({ error: "Wedding Mode isn't currently active for your Partnership." }, { status: 409 });
    }

    return NextResponse.json({
      id: result.details.id,
      weddingDate: result.details.wedding_date,
      guestCountEstimate: result.details.guest_count_estimate,
      status: result.details.status,
      graduatedAt: result.details.graduated_at,
    });
  } catch (err) {
    console.error("POST /api/wedding/pause failed", err);
    return NextResponse.json({ error: "Couldn't pause Wedding Mode." }, { status: 500 });
  }
}
