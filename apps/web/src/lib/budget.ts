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

// SE-82's irregular-income piece: the name of the auto-created category
// that banks/draws the smoothing difference between a user's real monthly
// income and their trailing average (see computeIncomeBufferDelta below).
// Identified by this exact name client-side (BudgetScreen.tsx) to render it
// as "income smoothing" rather than an ordinary spending category — no new
// `categories` column for this, same posture as everything else in this
// schema that avoids adding a column until two call sites actually need one.
export const INCOME_BUFFER_CATEGORY_NAME = "Income Buffer";

// How many trailing months of recorded actual_income to average when
// computing the buffer delta — 3 is enough to smooth a genuinely irregular
// (freelance/commission) income without washing out a real, sustained
// change in earnings the way a much longer window would.
export const IRREGULAR_INCOME_WINDOW_MONTHS = 3;

// Pure math, no DB — the actual smoothing rule behind irregular-income mode:
// bank (or draw from) the Income Buffer category the difference between the
// single most recent month's real income and the trailing average that
// includes it. recentActualIncomes must be ordered most-recent-first (same
// order the caller's `order by month desc` query already returns) — a
// positive result means that month ran ahead of the average (bank the
// surplus), negative means it ran behind (draw from the buffer to cover the
// gap), matching budget_categories.rollover_amount's existing sign
// convention (positive = leftover, negative = deficit carried forward).
// Returns 0 when there's no history yet to average against — same "can't
// compute what isn't there" posture as rollover's own prevBudget-not-found
// fallback in GET /api/budget.
export function computeIncomeBufferDelta(recentActualIncomes: number[]): number {
  if (recentActualIncomes.length === 0) return 0;
  const average = recentActualIncomes.reduce((sum, v) => sum + v, 0) / recentActualIncomes.length;
  return recentActualIncomes[0] - average;
}

// Mirrors findOrCreateManualAccount below exactly (same race-safe
// select-then-insert-with-ON-CONFLICT-fallback shape, same reason: two
// concurrent requests — both partners loading Budget at once, say — could
// otherwise both pass the initial select and both try to create it).
// Shared categories have owner_id null/partnership_id set; personal
// categories have the reverse — see categories_{personal,shared}_name_unique
// (migration 0008), the same constraint DEFAULT_CATEGORIES' own bootstrap
// insert in GET /api/budget relies on.
export async function findOrCreateIncomeBufferCategory(
  userId: string,
  partnershipId: string | null,
  isShared: boolean,
  client: PoolClient
): Promise<string> {
  const existing = await client.query(
    isShared
      ? `select id from categories where partnership_id = $1 and name = $2 and owner_id is null`
      : `select id from categories where owner_id = $1 and name = $2 and partnership_id is null`,
    isShared ? [partnershipId, INCOME_BUFFER_CATEGORY_NAME] : [userId, INCOME_BUFFER_CATEGORY_NAME]
  );
  if (existing.rows[0]) return existing.rows[0].id as string;

  const created = await client.query(
    isShared
      ? `insert into categories (owner_id, partnership_id, name, is_default)
         values (null, $1, $2, true)
         on conflict (partnership_id, name) where owner_id is null
         do nothing
         returning id`
      : `insert into categories (owner_id, partnership_id, name, is_default)
         values ($1, null, $2, true)
         on conflict (owner_id, name) where partnership_id is null
         do nothing
         returning id`,
    isShared ? [partnershipId, INCOME_BUFFER_CATEGORY_NAME] : [userId, INCOME_BUFFER_CATEGORY_NAME]
  );
  if (created.rows[0]) return created.rows[0].id as string;

  const winner = await client.query(
    isShared
      ? `select id from categories where partnership_id = $1 and name = $2 and owner_id is null`
      : `select id from categories where owner_id = $1 and name = $2 and partnership_id is null`,
    isShared ? [partnershipId, INCOME_BUFFER_CATEGORY_NAME] : [userId, INCOME_BUFFER_CATEGORY_NAME]
  );
  return winner.rows[0].id as string;
}

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
