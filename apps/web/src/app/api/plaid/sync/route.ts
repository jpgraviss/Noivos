import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/clerk";
import { withUserContext } from "@/lib/db";
import { getPlaidClient, plaidConfigured, tokenEncryptionConfigured, decryptAccessToken, syncPlaidItem } from "@/lib/plaid";
import { isUuid } from "@/lib/validate";

// "Sync now" — re-pulls whatever changed since each Item's last sync,
// using its stored sync_cursor (migration 0016) so this only fetches new/
// modified/removed transactions, not the Item's entire history again.
// There's no webhook-driven background sync yet (that needs a public
// webhook endpoint + signature verification — a real separate build, not
// attempted in this pass), so this manual button is the only way real
// data gets refreshed after the initial connect-time sync in
// api/plaid/exchange/route.ts.
//
// Per-item failures don't fail the whole request — a genuinely revoked/
// expired Plaid Item (the user removed access at their bank, a password
// change forcing reauth) shouldn't block syncing every *other* linked
// account, so each item's own error is caught, that item's status flips
// to 'error', and the response reports which items succeeded and which
// didn't rather than a single all-or-nothing failure.
export async function POST(request: Request) {
  if (!clerkConfigured()) {
    return NextResponse.json({ error: "Clerk isn't configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!plaidConfigured()) {
    return NextResponse.json({ error: "Bank connections aren't configured yet" }, { status: 503 });
  }
  if (!tokenEncryptionConfigured()) {
    return NextResponse.json({ error: "Bank connections aren't configured yet" }, { status: 503 });
  }

  let body: { plaidItemId?: unknown };
  try {
    body = (await request.json().catch(() => ({}))) as { plaidItemId?: unknown };
  } catch {
    body = {};
  }
  const plaidItemId = typeof body.plaidItemId === "string" ? body.plaidItemId : null;
  if (plaidItemId && !isUuid(plaidItemId)) {
    return NextResponse.json({ error: "Invalid plaidItemId" }, { status: 400 });
  }

  try {
    // RLS (plaid_items_select: user_id = current_user_id()) already scopes
    // this to the signed-in user's own Items — no manual owner filter
    // needed beyond an explicit id match when one was requested, same
    // idiom as every other route that trusts withUserContext's RLS.
    const items = await withUserContext(userId, async (dbClient) => {
      const result = await dbClient.query(
        plaidItemId
          ? `select id, access_token_encrypted, institution_name, sync_cursor from plaid_items where id = $1`
          : `select id, access_token_encrypted, institution_name, sync_cursor from plaid_items`,
        plaidItemId ? [plaidItemId] : []
      );
      return result.rows as { id: string; access_token_encrypted: Buffer; institution_name: string | null; sync_cursor: string | null }[];
    });

    if (plaidItemId && items.length === 0) {
      return NextResponse.json({ error: "That connection wasn't found." }, { status: 404 });
    }

    const client = getPlaidClient();
    const results = [];
    for (const item of items) {
      try {
        const accessToken = decryptAccessToken(item.access_token_encrypted);
        const syncResult = await syncPlaidItem(client, userId, item.id, accessToken, item.institution_name, item.sync_cursor);
        results.push({ plaidItemId: item.id, ok: true as const, ...syncResult });
      } catch (err) {
        console.error(`POST /api/plaid/sync: syncing plaid_items.id=${item.id} failed`, err);
        await withUserContext(userId, async (dbClient) => {
          await dbClient.query(`update plaid_items set status = 'error' where id = $1`, [item.id]);
        });
        results.push({ plaidItemId: item.id, ok: false as const });
      }
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error("POST /api/plaid/sync failed", err);
    return NextResponse.json({ error: "Couldn't sync your accounts." }, { status: 500 });
  }
}
