import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/clerk";
import { withUserContext } from "@/lib/db";
import { findActiveMembership } from "@/lib/partnership";
import { isUuid } from "@/lib/validate";

// PATCH — mark a linked Plaid account shared with (or back to personal
// from) the signed-in user's partner (PRD §12.4 / Linear SE-71). Every
// synced Plaid account starts personal (is_shared = false) per
// syncPlaidItem()'s own documented judgment call (lib/plaid.ts) — there
// was no UI step to flip that until this route + LinkedAccounts.tsx's new
// per-account toggle.
//
// Same "trust RLS, not a manual ownership pre-check" idiom as
// wedding/checklist/[id]'s PATCH: accounts_write (0002_rls.sql/0012) already
// requires owner_id = current_user_id() and, when a partnership_id is set,
// genuine active membership in it — a row this user doesn't own or isn't
// really a member of simply updates zero rows under RLS, treated as 404
// below, not a manual pre-check. The `plaid_item_id is not null` filter
// scopes this route to Plaid-linked accounts only — the single manual
// "Manual Entries" account (findOrCreateManualAccount, lib/budget.ts)
// isn't meant to be flipped through this endpoint.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!clerkConfigured()) {
    return NextResponse.json({ error: "Clerk isn't configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid account id" }, { status: 400 });
  }

  let body: { isShared?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (typeof body.isShared !== "boolean") {
    return NextResponse.json({ error: "isShared must be a boolean" }, { status: 400 });
  }
  const wantsShared = body.isShared;

  try {
    const result = await withUserContext(userId, async (client) => {
      let partnershipId: string | null = null;
      if (wantsShared) {
        const membership = await findActiveMembership(userId, client);
        if (!membership) return { notFound: false as const, needsPartnership: true as const };
        partnershipId = membership.partnership_id;
      }

      const updated = await client.query(
        `update accounts set is_shared = $2, partnership_id = $3, updated_at = now()
         where id = $1 and plaid_item_id is not null
         returning id`,
        [id, wantsShared, partnershipId]
      );
      if (updated.rows.length === 0) {
        return { notFound: true as const, needsPartnership: false as const };
      }

      // Cascades to this account's own transactions too — transactions_select's
      // RLS filters by each ROW's own is_shared/partnership_id, not by its
      // account's, so a partner viewing a shared Budget category's "spent"
      // total would otherwise still have this account's already-synced
      // transactions invisibly excluded from that sum even though the
      // account itself now shows as shared. No visible effect until SE-72
      // (Plaid category auto-mapping) ships — synced transactions still
      // have category_id = null today — but keeps the sharing invariant
      // correct now rather than leaving a second gap for later.
      await client.query(
        `update transactions set is_shared = $2, partnership_id = $3, updated_at = now() where account_id = $1`,
        [id, wantsShared, partnershipId]
      );

      return { notFound: false as const, needsPartnership: false as const };
    });

    if (result.needsPartnership) {
      return NextResponse.json(
        { error: "You need a Partnership to share an account — invite a partner first." },
        { status: 400 }
      );
    }
    if (result.notFound) {
      return NextResponse.json({ error: "That account wasn't found." }, { status: 404 });
    }
    return NextResponse.json({ id, isShared: wantsShared });
  } catch (err) {
    console.error("PATCH /api/plaid/accounts/[id] failed", err);
    return NextResponse.json({ error: "Couldn't update that account." }, { status: 500 });
  }
}
