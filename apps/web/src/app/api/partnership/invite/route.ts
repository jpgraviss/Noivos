import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { withUserContext } from "@/lib/db";
import { findActiveMembership } from "@/lib/partnership";

function clerkConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

// Creates a real Partnership + this user's membership + a pending invite
// row, and returns the invite_token so the client can build a shareable
// link (/invite/[token], see that page and /api/partnership/accept — added
// 2026-08-05). There is deliberately no email-sending here — no email
// service is wired up yet (see PROJECT_MEMORY.md) — so the founder shares
// the link manually (text, email client, whatever) rather than it being
// delivered automatically. Creating the Partnership now, even solo, is
// what unblocks anything that requires partnership_id to exist (e.g.
// wedding_details).
//
// Created as 'active' rather than 'invited', a fast-tracked call: the real
// person planning a wedding solo before their partner joins needs to
// actually use the workspace (Wedding Mode, shared goals) right away —
// wedding_details_write and every other partnership_is_active() RLS check
// requires status = 'active', so leaving new Partnerships at 'invited'
// would make everything downstream of this unusable until a second person
// accepts. Flagged in PROJECT_MEMORY as a judgment call worth revisiting.
export async function POST(request: Request) {
  if (!clerkConfigured()) {
    return NextResponse.json({ error: "Clerk isn't configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  try {
    const result = await withUserContext(userId, async (client) => {
      await client.query(`insert into users (id) values ($1) on conflict (id) do nothing`, [userId]);

      const existing = await findActiveMembership(userId, client);
      if (existing) {
        return { alreadyConnected: true as const };
      }

      const partnershipResult = await client.query(
        `insert into partnerships (status) values ('active') returning id`
      );
      const partnershipId = partnershipResult.rows[0].id;

      await client.query(
        `insert into partnership_members (partnership_id, user_id) values ($1, $2)`,
        [partnershipId, userId]
      );

      const inviteResult = await client.query(
        `insert into partnership_invites (partnership_id, inviter_id, invitee_contact, invite_token)
         values ($1, $2, $3, gen_random_uuid()::text)
         returning invite_token`,
        [partnershipId, userId, email]
      );

      return { alreadyConnected: false as const, partnershipId, invitedEmail: email, inviteToken: inviteResult.rows[0].invite_token as string };
    });

    if (result.alreadyConnected) {
      return NextResponse.json({ error: "You're already in a Partnership." }, { status: 409 });
    }
    return NextResponse.json({ invitedEmail: result.invitedEmail, inviteToken: result.inviteToken });
  } catch (err) {
    // The one_active_partnership_per_user unique index is the real backstop
    // against a race (two rapid invite calls) — this surfaces as a generic
    // constraint-violation error, treated the same as the checked case above.
    console.error("POST /api/partnership/invite failed", err);
    return NextResponse.json({ error: "Couldn't create that invite. Try again." }, { status: 500 });
  }
}
