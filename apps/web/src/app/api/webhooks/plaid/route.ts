import { NextResponse } from "next/server";
import { withUserContext } from "@/lib/db";
import {
  getPlaidClient,
  plaidConfigured,
  tokenEncryptionConfigured,
  decryptAccessToken,
  syncPlaidItem,
  verifyPlaidWebhookSignature,
} from "@/lib/plaid";

// Real-time background sync (SE-70) — until now "Sync now" (POST /api/
// plaid/sync) was the only way transactions ever refreshed; this closes
// the explicit open item packages/database/README.md flagged. Plaid's own
// recommended pairing for /transactions/sync (what syncPlaidItem already
// calls) is the TRANSACTIONS/SYNC_UPDATES_AVAILABLE webhook — fired once
// when new data is ready, not a slow poll.
//
// No shared-secret env var here — Plaid signs webhooks with a JWT (ES256)
// verified against a public key fetched live from Plaid's own API. See
// lib/plaid.ts's verifyPlaidWebhookSignature for the mechanics.
//
// This is a system-initiated write (Plaid calling this app, not a signed-
// in user), so it can't start from an auth()-derived userId. It first
// resolves which user owns the item_id via migration 0019's
// lookup_plaid_item_owner() (a narrow SECURITY DEFINER lookup, needed
// because plaid_items_select's RLS requires a current_user_id() that
// doesn't exist yet at that point), then does every real write through
// withUserContext(thatUserId, ...) — ordinary RLS from there on, same as
// every other route.
export async function POST(request: Request) {
  if (!plaidConfigured() || !tokenEncryptionConfigured()) {
    return NextResponse.json({ error: "Bank connections aren't configured yet" }, { status: 503 });
  }

  const rawBody = await request.text();
  const plaidClient = getPlaidClient();
  const verified = await verifyPlaidWebhookSignature(plaidClient, rawBody, request.headers.get("plaid-verification"));
  if (!verified) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let payload: { webhook_type?: string; webhook_code?: string; item_id?: string; error?: { error_code?: string } };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const plaidItemId = payload.item_id;
  if (!plaidItemId) {
    // Not every Plaid webhook type carries an item_id (e.g. some sandbox-
    // only test webhooks) — nothing to act on, acknowledged so Plaid
    // doesn't keep retrying a webhook this route was never going to use.
    return NextResponse.json({ received: true });
  }

  try {
    // The placeholder user id here is never consulted — lookup_plaid_item_
    // owner() is SECURITY DEFINER and ignores current_user_id() entirely —
    // withUserContext is just this app's one connection-acquisition path.
    const ownerId = await withUserContext("plaid-webhook", async (client) => {
      const result = await client.query(`select lookup_plaid_item_owner($1) as owner_id`, [plaidItemId]);
      return (result.rows[0]?.owner_id as string | null) ?? null;
    });
    if (!ownerId) {
      // A real Plaid item_id this app never created (or already deleted,
      // e.g. after account deletion revoked it) — acknowledge rather than
      // error, so Plaid doesn't retry something that will never resolve.
      return NextResponse.json({ received: true });
    }

    if (payload.webhook_type === "TRANSACTIONS" && payload.webhook_code === "SYNC_UPDATES_AVAILABLE") {
      const item = await withUserContext(ownerId, async (client) => {
        const result = await client.query(
          `select id, access_token_encrypted, institution_name, sync_cursor from plaid_items where plaid_item_id = $1`,
          [plaidItemId]
        );
        return result.rows[0] as
          | { id: string; access_token_encrypted: Buffer; institution_name: string | null; sync_cursor: string | null }
          | undefined;
      });
      if (item) {
        try {
          const accessToken = decryptAccessToken(item.access_token_encrypted);
          await syncPlaidItem(plaidClient, ownerId, item.id, accessToken, item.institution_name, item.sync_cursor);
        } catch (err) {
          console.error(`Plaid webhook: background sync failed for plaid_items.id=${item.id}`, err);
          await withUserContext(ownerId, async (client) => {
            await client.query(`update plaid_items set status = 'error' where id = $1`, [item.id]);
          });
        }
      }
    } else if (payload.webhook_type === "ITEM" && payload.webhook_code === "ERROR") {
      // ITEM_LOGIN_REQUIRED means the user's own bank credentials changed
      // and Plaid needs them to re-authenticate via Link's update mode —
      // a different user-facing message than a generic sync error, so
      // it's recorded distinctly even though this app has no "update mode"
      // UI yet to act on it (flagged as a real, separate gap, not silently
      // conflated with 'error').
      const status = payload.error?.error_code === "ITEM_LOGIN_REQUIRED" ? "reauth_required" : "error";
      await withUserContext(ownerId, async (client) => {
        await client.query(`update plaid_items set status = $1 where plaid_item_id = $2`, [status, plaidItemId]);
      });
    }
  } catch (err) {
    console.error("POST /api/webhooks/plaid failed", err);
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
