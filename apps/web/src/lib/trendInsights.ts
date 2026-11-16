import type { PoolClient } from "@neondatabase/serverless";

// Trend-based facts for SE-78 (PRD §12.11's "advanced/trend-based AI
// Insights" — rising category spend, new subscription detected, savings
// streak, large/unusual purchase). The issue's own description assumed
// these all needed daily balance snapshots (account_balance_snapshots,
// wired to nothing — see HomeScreen.tsx's useSavingsTrend comment) and
// recurring_expenses "wiring," but every one of the four turns out to be
// computable today from data that already accumulates with real usage:
// transactions.transaction_date (category trend, unusual purchase),
// goal_contributions.contribution_date (savings streak), and
// detectRecurringCandidates()'s already-built merchant detection (new
// subscription — see recurringExpenses.ts, reused as-is, not duplicated
// here). No LLM call, no new cron/snapshot infrastructure.
//
// Every query here runs through the signed-in user's own RLS-scoped
// connection (withUserContext), same reasoning as recurringExpenses.ts's
// own comment: transactions_select/categories_select/goal_contributions_
// select already limit every query below to exactly what this user can
// see (self, or shared + partnership membership), so there's no separate
// owner/partnership filtering to hand-roll here.
//
// All magnitude/ratio thresholds ("is this *meaningfully* higher/larger,"
// not just higher/larger) live in lib/insights.ts's buildInsights(), not
// here — these functions only return facts plus the minimum-sample-size
// floor needed to make a trailing average honest (e.g. "don't call
// something a trend off a single prior month"). Keeps the actual judgment
// calls in the one testable, reviewable place, same split BudgetScreen's
// rollover math and challenges.ts's progress math already use (raw facts
// from SQL, thresholds in a plain TS function).

export interface CategorySpendTrendFact {
  categoryId: string;
  categoryName: string;
  monthToDateSpent: number;
  trailingAverageMonthToDate: number;
  trailingMonthsWithData: number;
}

// Compares this month's spend-to-date, per category, against the average
// spend through the *same* day-of-month cutoff in the trailing 3 months —
// apples to apples (a partial current month vs. full prior months would
// always look artificially "under," never "over," for the first three
// weeks of every month). Requires >= 2 trailing months with any data in
// that category before buildInsights will call it a trend at all (one
// prior data point isn't a trend, it's a coincidence).
export async function computeCategorySpendTrendFacts(client: PoolClient): Promise<CategorySpendTrendFact[]> {
  const result = await client.query(`
    with cur_month as (
      select t.category_id, c.name as category_name, sum(t.amount)::float8 as mtd_spent
      from transactions t
      join categories c on c.id = t.category_id
      where t.deleted_at is null
        and t.transaction_date >= date_trunc('month', current_date)
        and t.transaction_date < date_trunc('month', current_date) + interval '1 month'
      group by t.category_id, c.name
    ),
    trailing_months as (
      select t.category_id,
             date_trunc('month', t.transaction_date) as month,
             sum(t.amount)::float8 as mtd_equivalent_spent
      from transactions t
      where t.deleted_at is null
        and t.transaction_date < date_trunc('month', current_date)
        and t.transaction_date >= date_trunc('month', current_date) - interval '3 months'
        and extract(day from t.transaction_date) <= extract(day from current_date)
      group by t.category_id, date_trunc('month', t.transaction_date)
    ),
    trailing_agg as (
      select category_id, avg(mtd_equivalent_spent)::float8 as avg_mtd, count(*)::int as months_with_data
      from trailing_months
      group by category_id
    )
    select cur_month.category_id, cur_month.category_name, cur_month.mtd_spent,
           coalesce(trailing_agg.avg_mtd, 0)::float8 as avg_mtd,
           coalesce(trailing_agg.months_with_data, 0)::int as months_with_data
    from cur_month
    left join trailing_agg on trailing_agg.category_id = cur_month.category_id
  `);

  return result.rows.map((r) => ({
    categoryId: r.category_id as string,
    categoryName: r.category_name as string,
    monthToDateSpent: r.mtd_spent as number,
    trailingAverageMonthToDate: r.avg_mtd as number,
    trailingMonthsWithData: r.months_with_data as number,
  }));
}

export interface UnusualPurchaseFact {
  merchantName: string | null;
  categoryName: string;
  amount: number;
  typicalAmount: number;
}

// A single transaction this month that's well above its category's usual
// transaction size. `avg_amount * 1.3` here is a loose pre-filter purely
// to bound how many rows come back from the DB (a category with normal
// variance can easily have a $ transaction 30% above its own average with
// no "unusual" story behind it) — the real, stricter threshold (>= 2x and
// >= $50, matching the project's "a specific dollar floor, not just a
// ratio, so a $2 category's $5 charge never gets flagged" posture) lives
// in buildInsights(), same split as the category-trend query above.
// Requires >= 3 prior transactions in that category before computing a
// baseline at all — a category with 1-2 transactions ever has no real
// "typical" to compare against.
export async function computeUnusualPurchaseFacts(client: PoolClient): Promise<UnusualPurchaseFact[]> {
  const result = await client.query(`
    with baseline as (
      select t.category_id, avg(t.amount)::float8 as avg_amount
      from transactions t
      where t.deleted_at is null
        and t.transaction_date < date_trunc('month', current_date)
        and t.transaction_date >= date_trunc('month', current_date) - interval '6 months'
      group by t.category_id
      having count(*) >= 3
    )
    select t.merchant_name, c.name as category_name, t.amount::float8 as amount, baseline.avg_amount
    from transactions t
    join categories c on c.id = t.category_id
    join baseline on baseline.category_id = t.category_id
    where t.deleted_at is null
      and t.transaction_date >= date_trunc('month', current_date)
      and t.transaction_date < date_trunc('month', current_date) + interval '1 month'
      and t.amount > baseline.avg_amount * 1.3
    order by (t.amount - baseline.avg_amount) desc
    limit 10
  `);

  return result.rows.map((r) => ({
    merchantName: (r.merchant_name as string | null) ?? null,
    categoryName: r.category_name as string,
    amount: r.amount as number,
    typicalAmount: r.avg_amount as number,
  }));
}

// Trailing 12 *completed* calendar months of total goal contributions,
// oldest to newest, zero-filled for any month with no contribution at all
// — a dense series (not just the sparse months that happen to have rows)
// so buildInsights' computeSavingsStreak() can walk it from the end and
// stop at the first zero. Excludes the current, still-in-progress month —
// a partial month can't honestly extend or break a streak yet.
export async function computeMonthlyGoalContributionTotals(client: PoolClient): Promise<number[]> {
  const result = await client.query(`
    with months as (
      select generate_series(
        date_trunc('month', current_date) - interval '12 months',
        date_trunc('month', current_date) - interval '1 month',
        interval '1 month'
      ) as month
    ),
    totals as (
      select date_trunc('month', gc.contribution_date) as month, sum(gc.amount)::float8 as total
      from goal_contributions gc
      where gc.contribution_date < date_trunc('month', current_date)
        and gc.contribution_date >= date_trunc('month', current_date) - interval '12 months'
      group by date_trunc('month', gc.contribution_date)
    )
    select coalesce(totals.total, 0)::float8 as total
    from months
    left join totals on totals.month = months.month
    order by months.month asc
  `);

  return result.rows.map((r) => r.total as number);
}
