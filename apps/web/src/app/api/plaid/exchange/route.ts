import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/clerk";
import { withUserContext } from "@/lib/db";
import { getPlaidClient, plaidConfigured, tokenEncryptionConfigured, encryptAccessToken, syncPlaidItem } from "@/lib/plaid";
import { tooLong, MAX_NAME_LENGTH } from "@/lib/validate";

// Second step of Plaid Link: the client's onSuccess callback hands back a
// public_token (single-use, expires in 30 minutes) plus Link's own
// metadata (institution name/id — free from the same callback, no extra
// Plaid API call needed to look it up). This route exchanges that for a
// real, long-lived access_token, then delegates to lib/plaid.ts's
// syncPlaidItem() for the actual account+transaction sync — shared with
// api/plaid/sync/route.ts's every-sync-after-the-first call, so the two
// routes can't drift.
//
// Every synced account/transaction starts personal (is_shared = false,
// partnership_id = null) regardless of whether the user has an active
// Partnership — there's no "mark this account shared" step in Link's own
// flow, and no UI built yet for the user to make that call explicitly
// after connecting (BudgetScreen/GoalsScreen's own add-forms all ask
// "shared or personal" as an explicit choice; this doesn't have an
// equivalent yet). Defaulting to shared would silently make one partner's
// real bank data visible to the other with no consent step — the unsafe
// direction — so personal-by-default until that real UI exists is the
// only defensible default here, same posture as api/ai/coach/route.ts's
// conversations staying personal until real sharing exists.
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
    // Deliberately refuses to proceed rather than storing an unencrypted
    // access token — a real bank credential is not something this route
    // degrades gracefully on. See lib/plaid.ts's own comment on why
    // encryption is mandatory, not optional, for this table.
    return NextResponse.json({ error: "Bank connections aren't configured yet" }, { status: 503 });
  }

  let body: { publicToken?: unknown; institutionId?: unknown; institutionName?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const publicToken = typeof body.publicToken === "string" ? body.publicToken : "";
  if (!publicToken) {
    return NextResponse.json({ error: "publicToken is required" }, { status: 400 });
  }
  const institutionId = typeof body.institutionId === "string" ? body.institutionId : null;
  const institutionName = typeof body.institutionName === "string" ? body.institutionName.trim() : null;
  if (institutionName && tooLong(institutionName, MAX_NAME_LENGTH)) {
    return NextResponse.json({ error: `institutionName must be ${MAX_NAME_LENGTH} characters or fewer` }, { status: 400 });
  }

  const client = getPlaidClient();

  let accessToken: string;
  let plaidItemId: string;
  try {
    const exchangeResponse = await client.itemPublicTokenExchange({ public_token: publicToken });
    accessToken = exchangeResponse.data.access_token;
    plaidItemId = exchangeResponse.data.item_id;
  } catch (err) {
    console.error("POST /api/plaid/exchange: itemPublicTokenExchange failed", err);
    return NextResponse.json({ error: "Couldn't finish connecting that account. Try again." }, { status: 502 });
  }

  try {
    const plaidItemRowId = await withUserContext(userId, async (dbClient) => {
      await dbClient.query(`insert into users (id) values ($1) on conflict (id) do nothing`, [userId]);

      const encryptedToken = encryptAccessToken(accessToken);
      // ON CONFLICT DO NOTHING against plaid_items' existing unique
      // plaid_item_id — same "two concurrent requests both pass a check"
      // defensive pattern used everywhere else in this app (0008's five
      // bootstrap-race fixes), even though a fresh Link session generating
      // the same item_id twice is not a realistic race in practice.
      const itemInsert = await dbClient.query(
        `insert into plaid_items (user_id, plaid_item_id, access_token_encrypted, institution_id, institution_name)
         values ($1, $2, $3, $4, $5)
         on conflict (plaid_item_id) do nothing
         returning id`,
        [userId, plaidItemId, encryptedToken, institutionId, institutionName]
      );
      if (itemInsert.rows[0]) return itemInsert.rows[0].id as string;
      const existing = await dbClient.query(`select id from plaid_items where plaid_item_id = $1`, [plaidItemId]);
      return existing.rows[0].id as string;
    });

    const syncResult = await syncPlaidItem(client, userId, plaidItemRowId, accessToken, institutionName, null);

    return NextResponse.json({ plaidItemId: plaidItemRowId, ...syncResult });
  } catch (err) {
    console.error("POST /api/plaid/exchange failed", err);
    return NextResponse.json(
      { error: "Connected, but couldn't finish loading your accounts. Try syncing again from Linked Accounts." },
      { status: 500 }
    );
  }
}
