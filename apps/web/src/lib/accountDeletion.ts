import { withUserContext } from "./db";
import { plaidConfigured, tokenEncryptionConfigured, getPlaidClient, decryptAccessToken } from "./plaid";

// The one place in this app that actually erases a user's account —
// invoked either by POST /api/account/delete (the user asking for it
// themselves) or by /api/webhooks/clerk's `user.deleted` handler (Clerk
// itself reporting the account is gone, e.g. deleted directly from Clerk's
// own dashboard). Both call this same function so there's exactly one
// deletion routine to get right, not two that can drift.
//
// Real Plaid access-token revocation happens here, in application code,
// since migration 0018's delete_user_account_data() SQL function has no
// network access of its own. Best-effort: if Plaid's API is unreachable or
// errors, the deletion still proceeds — the SQL function deletes the
// plaid_items row (and its encrypted token) regardless, so a revoke that
// silently fails just means an already-doomed credential lingers a little
// longer at Plaid's end, not a correctness problem for this app's own data.
export async function deleteUserAccountData(userId: string): Promise<void> {
  if (plaidConfigured() && tokenEncryptionConfigured()) {
    try {
      const encryptedTokens = await withUserContext(userId, async (client) => {
        const result = await client.query(`select access_token_encrypted from plaid_items where user_id = $1`, [
          userId,
        ]);
        return result.rows.map((r) => r.access_token_encrypted as Buffer);
      });
      const plaidClient = getPlaidClient();
      for (const encrypted of encryptedTokens) {
        try {
          const accessToken = decryptAccessToken(encrypted);
          await plaidClient.itemRemove({ access_token: accessToken });
        } catch (err) {
          console.error("Plaid itemRemove failed during account deletion (continuing anyway)", err);
        }
      }
    } catch (err) {
      console.error("Reading plaid_items for revocation failed during account deletion (continuing anyway)", err);
    }
  }

  // migration 0018 — see that file's own header comment for why this needs
  // a SECURITY DEFINER function rather than a plain RLS-scoped query.
  await withUserContext(userId, async (client) => {
    await client.query(`select delete_user_account_data($1)`, [userId]);
  });
}
