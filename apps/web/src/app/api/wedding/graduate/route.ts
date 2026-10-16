import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/clerk";
import { withUserContext } from "@/lib/db";
import { findActiveMembership } from "@/lib/partnership";
import { logActivityEvent } from "@/lib/activity";

// PRD §12.8's "Graduate" action: "an explicit, celebratory user action (not
// an automatic date-based trigger) that archives Wedding Mode as a
// permanent keepsake... and transitions the Partnership into standard
// shared financial planning." wedding_details.status/graduated_at have
// carried this 3-state lifecycle (active/graduated/paused_or_cancelled)
// since 0001_init.sql, with no UI action to drive it until now.
//
// Deliberately only reachable from 'active' — graduating something already
// graduated or paused doesn't match the PRD's framing of this as a single,
// explicit, one-time celebration. wedding_details_write's existing RLS
// (partnership_is_active + was_partnership_member) already covers this
// write with no new policy needed.
//
// Vendors/checklist/family contributions stay fully visible and editable
// after graduating — PRD says the countdown/vendor tracker "disappear from
// the primary navigation but remain accessible as an archived record," but
// this app has no separate archive view yet to move them into, so
// GoalsScreen.tsx keeps showing the Wedding segment rather than hiding data
// behind a view that doesn't exist. Flagged as a deliberate, documented
// scope choice, not an oversight.
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
         set status = 'graduated', graduated_at = now()
         where partnership_id = $1 and status = 'active'
         returning id, wedding_date::text as wedding_date, guest_count_estimate, status, graduated_at::text as graduated_at`,
        [membership.partnership_id]
      );
      if (!updated.rows[0]) {
        return { notEligible: true as const };
      }
      return { graduated: true as const, details: updated.rows[0], partnershipId: membership.partnership_id as string };
    });

    if (result.noPartnership) {
      return NextResponse.json({ error: "Set up a Partnership before graduating Wedding Mode." }, { status: 400 });
    }
    if (result.notEligible) {
      return NextResponse.json({ error: "Wedding Mode isn't currently active for your Partnership." }, { status: 409 });
    }

    await logActivityEvent(userId, result.partnershipId, "wedding_mode_graduated", {});

    return NextResponse.json({
      id: result.details.id,
      weddingDate: result.details.wedding_date,
      guestCountEstimate: result.details.guest_count_estimate,
      status: result.details.status,
      graduatedAt: result.details.graduated_at,
    });
  } catch (err) {
    console.error("POST /api/wedding/graduate failed", err);
    return NextResponse.json({ error: "Couldn't graduate Wedding Mode." }, { status: 500 });
  }
}
