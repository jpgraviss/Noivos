import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode, type AccountType, type AccountSubtype } from "plaid";
import crypto from "node:crypto";
import { withUserContext } from "./db";

// Plaid integration (PRD §12.4) — real for the first time as of
// 2026-08-14. Founder direction (same conversation as the AI Coach
// backend built earlier this session): build the connection flow now;
// the founder will personally run it end-to-end afterward using their own
// Plaid Sandbox test credentials, not real bank data. Same graceful-
// degradation posture as clerkConfigured()/aiConfigured() — no
// PLAID_CLIENT_ID/PLAID_SECRET means every /api/plaid/* route returns an
// honest 503, not a crash, so this ships safely with no credentials set.
export function plaidConfigured(): boolean {
  return Boolean(process.env.PLAID_CLIENT_ID) && Boolean(process.env.PLAID_SECRET);
}

let cachedClient: PlaidApi | null = null;

function getPlaidClient(): PlaidApi {
  if (!cachedClient) {
    const env = process.env.PLAID_ENV ?? "sandbox";
    const configuration = new Configuration({
      basePath: PlaidEnvironments[env] ?? PlaidEnvironments.sandbox,
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
          "PLAID-SECRET": process.env.PLAID_SECRET,
        },
      },
    });
    cachedClient = new PlaidApi(configuration);
  }
  return cachedClient;
}

export { getPlaidClient, Products, CountryCode };

// --- Access-token encryption -------------------------------------------
//
// plaid_items.access_token_encrypted has carried this exact column name
// since 0001_init.sql, with its own comment flagging that the encryption
// approach was never decided post-Supabase-Vault (packages/database/
// README.md's "Open items" said the same, verbatim, until this file
// resolved it). A Plaid access token is a real bank credential — Neon's
// own at-rest disk encryption is infrastructure-level protection, but
// PRD §15's "encrypted at rest" language for Plaid-derived data reads as
// application-level, not just "the disk happens to be encrypted." AES-
// 256-GCM with a key held only in this app's own environment (not the
// database) is the standard, defensible choice here — a dedicated
// secrets manager (the README's other option) is real infrastructure
// this project doesn't have yet and would be its own separate build.
// Flagged as a fast-tracked judgment call, same posture as every other
// "not explicitly decided, made a defensible call and documented it"
// decision in this project's history (see PROJECT_MEMORY.md's Partnership
// status='active' and shared-Budget-row precedents).
export function tokenEncryptionConfigured(): boolean {
  return Boolean(process.env.PLAID_TOKEN_ENCRYPTION_KEY);
}

function getEncryptionKey(): Buffer {
  const raw = process.env.PLAID_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("PLAID_TOKEN_ENCRYPTION_KEY is not set — call tokenEncryptionConfigured() first");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("PLAID_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes (AES-256) — generate one with `openssl rand -base64 32`");
  }
  return key;
}

// Stored layout: 12-byte IV || 16-byte GCM auth tag || ciphertext, all in
// one Buffer — matches plaid_items.access_token_encrypted's bytea column
// with no extra columns needed for the IV/tag.
export function encryptAccessToken(plaintext: string): Buffer {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]);
}

export function decryptAccessToken(stored: Buffer): string {
  const key = getEncryptionKey();
  const iv = stored.subarray(0, 12);
  const authTag = stored.subarray(12, 28);
  const ciphertext = stored.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

// --- Account type mapping -------------------------------------------
//
// accounts.account_type's check constraint (0001_init.sql, widened by
// migration 0016 to add 'investment'/'other') is a closed set this app
// invented before Plaid existed as a real integration — Plaid's own
// AccountType/AccountSubtype are far more granular. Maps generously
// rather than narrowly: an unmapped depository subtype (money market, CD,
// HSA, etc.) falls into 'savings' as the closest real fit, not 'other',
// since those are all still "money sitting in an account you can spend
// from eventually," closer in spirit to savings than to loan/investment.
export function mapPlaidAccountType(type: AccountType, subtype: AccountSubtype | null): string {
  if (type === "credit") return "credit_card";
  if (type === "loan") return "loan";
  if (type === "investment" || type === "brokerage") return "investment";
  if (type === "depository") {
    if (subtype === "checking") return "checking";
    return "savings";
  }
  return "other";
}

// --- Shared account+transaction sync ------------------------------------
//
// One real Plaid Item, fully synced: refresh its linked accounts
// (balances + any newly-visible account) via /accounts/get, then pull
// everything new since the last sync via /transactions/sync, looping
// through every page (has_more) before returning. Shared between
// api/plaid/exchange/route.ts (the very first sync, right after linking)
// and api/plaid/sync/route.ts (every "sync now" after that) — both need
// the identical account-upsert + transaction-upsert + cursor-save
// sequence, and duplicating ~80 lines of it per route risked the two
// copies drifting (e.g. one route fixing the negative-amount-skip logic
// and the other quietly keeping the old behavior).
export interface PlaidSyncResult {
  accountsLinked: number;
  transactionsSynced: number;
  transactionsSkipped: number;
}

export async function syncPlaidItem(
  plaidClient: PlaidApi,
  userId: string,
  plaidItemRowId: string,
  accessToken: string,
  institutionName: string | null,
  startCursor: string | null
): Promise<PlaidSyncResult> {
  const accountsResponse = await plaidClient.accountsGet({ access_token: accessToken });

  const accountIdByPlaidId = new Map<string, string>();
  await withUserContext(userId, async (dbClient) => {
    for (const acct of accountsResponse.data.accounts) {
      const accountType = mapPlaidAccountType(acct.type, acct.subtype);
      const displayName = acct.official_name ?? acct.name;
      // ON CONFLICT against migration 0016's accounts_plaid_account_unique
      // (plaid_item_id, plaid_account_id) — idempotent across repeated
      // syncs of the same Item; refreshes the balance/display name each
      // time rather than only inserting once and going stale.
      const upserted = await dbClient.query(
        `insert into accounts (owner_id, plaid_item_id, plaid_account_id, account_type, institution_name, display_name, current_balance, is_manual)
         values ($1, $2, $3, $4, $5, $6, $7, false)
         on conflict (plaid_item_id, plaid_account_id) do update
           set current_balance = excluded.current_balance,
               display_name = excluded.display_name,
               institution_name = excluded.institution_name,
               updated_at = now()
         returning id`,
        [userId, plaidItemRowId, acct.account_id, accountType, institutionName, displayName, acct.balances.current ?? 0]
      );
      accountIdByPlaidId.set(acct.account_id, upserted.rows[0].id as string);
    }
  });

  let cursor: string | null = startCursor;
  let hasMore = true;
  let transactionsSynced = 0;
  let transactionsSkipped = 0;

  while (hasMore) {
    const syncResponse = await plaidClient.transactionsSync({
      access_token: accessToken,
      cursor: cursor ?? undefined,
    });
    const { added, next_cursor, has_more } = syncResponse.data;

    await withUserContext(userId, async (dbClient) => {
      for (const txn of added) {
        const localAccountId = accountIdByPlaidId.get(txn.account_id);
        if (!localAccountId) continue; // an account Plaid didn't include in accountsGet (rare) — skip rather than guess

        // Plaid's amount convention: positive = money leaving the
        // account (a real expense), negative = money coming in (a
        // refund, a paycheck, a transfer in). This app's own
        // transactions.amount is expense-only everywhere else (every
        // manual-entry route enforces amount > 0, and every "spent" sum
        // across Budget/AI Coach assumes that) — there's no "income"
        // concept anywhere in this schema yet. Skipping negative amounts
        // is the conservative choice: inserting one would either violate
        // that implicit assumption or need a sign-flip guess about what
        // it "really" means, which isn't this function's call to make. A
        // real income/inflow feature is future work, not attempted here.
        if (txn.amount <= 0) {
          transactionsSkipped++;
          continue;
        }
        await dbClient.query(
          `insert into transactions (account_id, owner_id, plaid_transaction_id, amount, merchant_name, transaction_date)
           values ($1, $2, $3, $4, $5, $6::date)
           on conflict (plaid_transaction_id) do update
             set amount = excluded.amount,
                 merchant_name = excluded.merchant_name,
                 transaction_date = excluded.transaction_date,
                 updated_at = now()`,
          [localAccountId, userId, txn.transaction_id, txn.amount, txn.merchant_name ?? txn.name, txn.date]
        );
        transactionsSynced++;
      }
    });

    cursor = next_cursor;
    hasMore = has_more;
  }

  await withUserContext(userId, async (dbClient) => {
    await dbClient.query(`update plaid_items set sync_cursor = $1, last_synced_at = now(), status = 'active' where id = $2`, [
      cursor,
      plaidItemRowId,
    ]);
  });

  return {
    accountsLinked: accountIdByPlaidId.size,
    transactionsSynced,
    transactionsSkipped,
  };
}
