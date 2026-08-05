import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { withUserContext } from "@/lib/db";
import { findActiveMembership } from "@/lib/partnership";

function clerkConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

// The other half of the invite flow apps/web/src/app/api/partnership/invite/
// route.ts started (2026-08-03) — this is what actually lets a second
// person join. Requires migration 0006's two new partnership_invites RLS
// policies to work at all (an invitee has no way to read or update a
// pending invite otherwise).
//
// Known, deliberate simplification: this does NOT check that the signed-in
// accepter's email matches the invite's invitee_contact — there's still no
// real email-delivery service (the founder shares the invite link/token
// manually), so there's no verified channel to check against yet. Anyone
// who has the link can accept. Flagged here and in PROJECT_MEMORY rather
// than silently assumed secure.
export async function POST(request: Request) {
  if (!clerkConfigured()) {
    return NextResponse.json({ error: "Clerk isn't configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { inviteToken?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const inviteToken = typeof body.inviteToken === "string" ? body.inviteToken : "";
  if (!inviteToken) {
    return NextResponse.json({ error: "inviteToken is required" }, { status: 400 });
  }

  try {
    const result = await withUserContext(userId, async (client) => {
      await client.query(`insert into users (id) values ($1) on conflict (id) do nothing`, [userId]);

      const invite = await client.query(
        `select id, partnership_id, inviter_id, expires_at from partnership_invites
         where invite_token = $1 and status = 'pending'`,
        [inviteToken]
      );
      const inv = invite.rows[0];
      if (!inv) return { invalid: true as const };
      if (new Date(inv.expires_at) < new Date()) return { expired: true as const };
      if (inv.inviter_id === userId) return { ownInvite: true as const };

      const existing = await findActiveMembership(userId, client);
      if (existing) return { alreadyConnected: true as const };

      await client.query(`insert into partnership_members (partnership_id, user_id) values ($1, $2)`, [
        inv.partnership_id,
        userId,
      ]);
      await client.query(`update partnership_invites set status = 'accepted', responded_at = now() where id = $1`, [
        inv.id,
      ]);

      const inviter = await client.query(`select display_name from users where id = $1`, [inv.inviter_id]);
      return { accepted: true as const, partnerName: (inviter.rows[0]?.display_name as string | undefined) ?? "Your partner" };
    });

    if (result.invalid) {
      return NextResponse.json({ error: "This invite doesn't exist or has already been used." }, { status: 404 });
    }
    if (result.expired) {
      return NextResponse.json({ error: "This invite has expired." }, { status: 410 });
    }
    if (result.ownInvite) {
      return NextResponse.json({ error: "You can't accept your own invite." }, { status: 400 });
    }
    if (result.alreadyConnected) {
      return NextResponse.json({ error: "You're already in a Partnership — disconnect first to accept a new invite." }, { status: 409 });
    }
    return NextResponse.json({ partnerName: result.partnerName });
  } catch (err) {
    // The one_active_partnership_per_user unique index is the real backstop
    // against a race (e.g. two tabs accepting at once) — surfaces as a
    // generic constraint-violation error, treated the same as the checked
    // "already connected" case above.
    console.error("POST /api/partnership/accept failed", err);
    return NextResponse.json({ error: "Couldn't accept that invite. Try again." }, { status: 500 });
  }
}
