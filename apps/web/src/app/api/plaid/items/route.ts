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
      const result = await client.query(
        `select pi.id, pi.institution_name, pi.status, pi.last_synced_at::text as last_synced_at,
                (select count(*)::int from accounts a where a.plaid_item_id = pi.id) as account_count
         from plaid_items pi
         where pi.user_id = $1
         order by pi.created_at desc`,
        [userId]
      );
      return result.rows.map((r) => ({
        id: r.id as string,
        institutionName: (r.institution_name as string | null) ?? "Connected account",
        status: r.status as string,
        lastSyncedAt: r.last_synced_at as string | null,
        accountCount: r.account_count as number,
      }));
    });
    return NextResponse.json({ items });
  } catch (err) {
    console.error("GET /api/plaid/items failed", err);
    return NextResponse.json({ error: "Couldn't load your connected accounts." }, { status: 500 });
  }
}
