import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/clerk";
import { withUserContext } from "@/lib/db";
import { findActiveMembership } from "@/lib/partnership";

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
        `select pi.id, pi.partnership_id, pi.inviter_id, pi.expires_at, p.status as partnership_status
         from partnership_invites pi
         join partnerships p on p.id = pi.partnership_id
         where pi.invite_token = $1 and pi.status = 'pending'`,
        [inviteToken]
      );
      const inv = invite.rows[0];
      if (!inv) return { invalid: true as const };
      // Defense in depth: migration 0014's disconnect trigger now revokes
      // any still-pending invite the moment its Partnership disconnects,
      // so this shouldn't normally be reachable — but this route's own
      // check shouldn't depend solely on that trigger having fired (e.g.
      // for any invite that predates that migration and wasn't caught by
      // its backfill for some reason). Without this, accepting a stale
      // invite for an already-disconnected Partnership would insert this
      // user into partnership_members with left_at staying null forever —
      // the exact permanently-orphaned-membership bug 0014 fixes, just
      // reached from the invite side instead of the disconnect side
      // (found 2026-08-10).
      if (inv.partnership_status !== "active") return { partnershipGone: true as const };
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
    if (result.partnershipGone) {
      return NextResponse.json(
        { error: "This invite is no longer valid — the Partnership it belonged to has been disconnected." },
        { status: 410 }
      );
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
    // against a race (e.g. two tabs accepting at once) — Postgres surfaces
    // that as error code 23505 (unique_violation), the exact same
    // "already connected" case the checked branch above handles cleanly.
    // Same fix as the sibling race in invite/route.ts.
    if (err instanceof Error && "code" in err && err.code === "23505") {
      return NextResponse.json(
        { error: "You're already in a Partnership — disconnect first to accept a new invite." },
        { status: 409 }
      );
    }
    console.error("POST /api/partnership/accept failed", err);
    return NextResponse.json({ error: "Couldn't accept that invite. Try again." }, { status: 500 });
  }
}
