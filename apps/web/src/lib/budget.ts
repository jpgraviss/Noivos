import type { PoolClient } from "@neondatabase/serverless";

export interface DefaultCategory {
  name: string;
  plannedAmount: number;
  // Whether this category should be created as a shared (partnership-owned)
  // category when the user has an active Partnership, vs. a personal one.
  shared: boolean;
}

// Matches apps/web/src/data/mockData.ts's budgetSnapshot exactly, so a
// first-time user's real Budget looks like the mock they were already
// looking at instead of starting from an unfamiliar empty state.
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: "Groceries", plannedAmount: 600, shared: true },
  { name: "Wedding Vendors", plannedAmount: 1500, shared: true },
  { name: "Dining Out", plannedAmount: 300, shared: true },
  { name: "Personal Shopping", plannedAmount: 250, shared: false },
  { name: "Transportation", plannedAmount: 220, shared: true },
];

// There's no Plaid/bank-linking system yet (accounts.plaid_item_id stays
// null for everyone in V1) — every logged expense is a manual entry, so each
// user gets one reusable "Manual Entries" account the first time they log
// one, instead of a real linked account.
export async function findOrCreateManualAccount(userId: string, client: PoolClient): Promise<string> {
  const existing = await client.query(
    `select id from accounts where owner_id = $1 and account_type = 'manual' order by created_at asc limit 1`,
    [userId]
  );
  if (existing.rows[0]) return existing.rows[0].id as string;

  // ON CONFLICT DO NOTHING against accounts_one_manual_per_user (migration
  // 0008) — two concurrent expense-logging requests could otherwise both
  // pass the select above and both insert a "Manual Entries" account,
  // fragmenting the user's spending across duplicates. If this request
  // loses that race, RETURNING comes back empty and the fallback select
  // picks up whichever account actually won.
  const created = await client.query(
    `insert into accounts (owner_id, account_type, display_name, is_manual)
     values ($1, 'manual', 'Manual Entries', true)
     on conflict (owner_id) where account_type = 'manual'
     do nothing
     returning id`,
    [userId]
  );
  if (created.rows[0]) return created.rows[0].id as string;

  const winner = await client.query(
    `select id from accounts where owner_id = $1 and account_type = 'manual' order by created_at asc limit 1`,
    [userId]
  );
  return winner.rows[0].id as string;
}
