import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { withUserContext } from "@/lib/db";
import { findActiveMembership } from "@/lib/partnership";

function clerkConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

export async function GET() {
  if (!clerkConfigured()) {
    return NextResponse.json({ error: "Clerk isn't configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const status = await withUserContext(userId, async (client) => {
      await client.query(`insert into users (id) values ($1) on conflict (id) do nothing`, [userId]);
      const membership = await findActiveMembership(userId, client);
      if (!membership) {
        return { connected: false, invited: false };
      }

      const partnerResult = await client.query(
        `select u.display_name from partnership_members pm
         join users u on u.id = pm.user_id
         where pm.partnership_id = $1 and pm.user_id <> $2 and pm.left_at is null`,
        [membership.partnership_id, userId]
      );
      if (partnerResult.rows[0]) {
        return { connected: true, invited: false, partnerName: partnerResult.rows[0].display_name ?? "Your partner" };
      }

      const inviteResult = await client.query(
        `select invitee_contact from partnership_invites
         where partnership_id = $1 and status = 'pending'
         order by created_at desc limit 1`,
        [membership.partnership_id]
      );
      return { connected: false, invited: true, invitedEmail: inviteResult.rows[0]?.invitee_contact ?? null };
    });
    return NextResponse.json(status);
  } catch (err) {
    console.error("GET /api/partnership failed", err);
    return NextResponse.json({ error: "Something went wrong loading your Partnership." }, { status: 500 });
  }
}
