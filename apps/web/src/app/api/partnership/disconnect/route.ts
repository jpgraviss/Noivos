import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { withUserContext } from "@/lib/db";
import { findActiveMembership } from "@/lib/partnership";

function clerkConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

// Only the disconnecting user's own partnership_members row is updated —
// partnership_members_update's RLS policy only allows updating your own
// row (using (user_id = current_user_id())), by design. The former
// partner's row is left untouched; was_partnership_member() ignores
// left_at anyway, so their read access to the frozen shared history
// (PRD/PROJECT_MEMORY §4) keeps working regardless. Setting the
// partnership's own status to 'disconnected' is what actually gates
// writes going forward (partnership_is_active()), for both former members.
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
        return { notConnected: true as const };
      }

      await client.query(
        `update partnerships set status = 'disconnected', disconnected_at = now(), disconnected_by = $2
         where id = $1`,
        [membership.partnership_id, userId]
      );
      await client.query(
        `update partnership_members set left_at = now() where partnership_id = $1 and user_id = $2`,
        [membership.partnership_id, userId]
      );
      return { notConnected: false as const };
    });

    if (result.notConnected) {
      return NextResponse.json({ error: "You're not currently connected to a partner." }, { status: 400 });
    }
    return NextResponse.json({ disconnected: true });
  } catch (err) {
    console.error("POST /api/partnership/disconnect failed", err);
    return NextResponse.json({ error: "Something went wrong disconnecting." }, { status: 500 });
  }
}
