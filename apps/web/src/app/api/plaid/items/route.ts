import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/clerk";
import { withUserContext } from "@/lib/db";

// Lists this user's connected banks for MoreScreen.tsx's LinkedAccounts
// section — a pure read of already-stored, non-secret metadata
// (institution name, status, last-synced time, linked account count), so
// this doesn't need plaidConfigured()/tokenEncryptionConfigured() the way
// every other /api/plaid/* route does: there's nothing here that calls
// the Plaid API or touches access_token_encrypted, so it works the same
// whether or not real Plaid credentials exist yet.
//
// Now also returns each item's underlying accounts (2026-10-06, SE-71) —
// previously just an aggregate accountCount — so LinkedAccounts.tsx can
// render a per-account Personal/Shared toggle (PATCH /api/plaid/accounts/
// [id]). displayName/accountType/currentBalance are non-secret, already-
// synced metadata, same posture as everything else this route returns.
export async function GET() {
  if (!clerkConfigured()) {
    return NextResponse.json({ error: "Clerk isn't configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const items = await withUserContext(userId, async (client) => {
      const itemsResult = await client.query(
        `select pi.id, pi.institution_name, pi.status, pi.last_synced_at::text as last_synced_at
         from plaid_items pi
         where pi.user_id = $1
         order by pi.created_at desc`,
        [userId]
      );
      const itemIds = itemsResult.rows.map((r) => r.id);
      const accountsResult =
        itemIds.length > 0
          ? await client.query(
              `select id, plaid_item_id, display_name, account_type, current_balance::float8 as current_balance, is_shared
               from accounts
               where plaid_item_id = any($1::uuid[])
               order by display_name asc`,
              [itemIds]
            )
          : { rows: [] };

      return itemsResult.rows.map((r) => {
        const accounts = accountsResult.rows.filter((a) => a.plaid_item_id === r.id);
        return {
          id: r.id as string,
          institutionName: (r.institution_name as string | null) ?? "Connected account",
          status: r.status as string,
          lastSyncedAt: r.last_synced_at as string | null,
          accountCount: accounts.length,
          accounts: accounts.map((a) => ({
            id: a.id as string,
            displayName: a.display_name as string,
            accountType: a.account_type as string,
            currentBalance: a.current_balance as number,
            isShared: a.is_shared as boolean,
          })),
        };
      });
    });
    return NextResponse.json({ items });
  } catch (err) {
    console.error("GET /api/plaid/items failed", err);
    return NextResponse.json({ error: "Couldn't load your connected accounts." }, { status: 500 });
  }
}
