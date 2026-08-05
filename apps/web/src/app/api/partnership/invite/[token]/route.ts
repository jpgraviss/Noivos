import { NextResponse } from "next/server";
import { withUserContext } from "@/lib/db";

// Deliberately public — no auth() call, no clerkConfigured gate. This is a
// preview so someone can see who invited them ("Ava invited you...") before
// they've signed in at all, the same trust model most invite-link products
// use. Safe because migration 0006's partnership_invites_select_pending RLS
// policy grants read access to any pending invite regardless of
// current_user_id() — it doesn't check identity at all, only that the
// invite is still pending, so passing a placeholder id into
// withUserContext here is intentional and harmless (it satisfies no
// identity-checked policy, only this one).
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  try {
    const invite = await withUserContext("anonymous-invite-preview", async (client) => {
      const result = await client.query(
        `select pi.invitee_contact, pi.expires_at, u.display_name as inviter_name
         from partnership_invites pi
         join users u on u.id = pi.inviter_id
         where pi.invite_token = $1 and pi.status = 'pending'`,
        [token]
      );
      return result.rows[0] ?? null;
    });

    if (!invite) {
      return NextResponse.json({ error: "This invite doesn't exist or has already been used." }, { status: 404 });
    }
    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: "This invite has expired." }, { status: 410 });
    }

    return NextResponse.json({
      inviterName: invite.inviter_name ?? "Your partner",
      invitedEmail: invite.invitee_contact,
    });
  } catch (err) {
    console.error(`GET /api/partnership/invite/${token} failed`, err);
    return NextResponse.json({ error: "Couldn't load that invite." }, { status: 500 });
  }
}
