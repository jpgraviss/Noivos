import type { PoolClient } from "@neondatabase/serverless";

// Recurring expense detection & management (PRD §12.5, SE-77) — the
// recurring_expenses table has existed since 0001_init.sql but nothing has
// ever read or written it until now.
//
// Detection and reconciliation both run through the signed-in user's own
// RLS-scoped connection (withUserContext, same as every other route) —
// transactions_select's RLS (owner_id = self OR is_shared + partnership
// membership) already limits every query below to exactly what this user
// can see, so there's no separate owner/partnership filtering to hand-roll
// here the way api/budget/route.ts has to for budget_categories.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Gap-tolerance thresholds are a judgment call, not a PRD-specified number
// — flagged here rather than silently invented. Real billing cadences
// drift (a subscription charged on the 1st vs. the 3rd depending on
// weekends), so each band has slack rather than requiring an exact 7/30-day
// gap.
function classifyFrequency(medianGapDays: number): string | null {
  if (medianGapDays >= 5 && medianGapDays <= 9) return "weekly";
  if (medianGapDays >= 12 && medianGapDays <= 18) return "biweekly";
  if (medianGapDays >= 25 && medianGapDays <= 35) return "monthly";
  return null;
}

function frequencyToDays(frequency: string): number {
  if (frequency === "weekly") return 7;
  if (frequency === "biweekly") return 14;
  return 30; // monthly, or a manually-entered free-text frequency this app doesn't recognize
}

export interface RecurringCandidate {
  merchantName: string;
  categoryId: string | null;
  occurrences: number;
  avgAmount: number;
  lastAmount: number;
  lastDate: string;
  frequency: string;
}

// Groups this user's/Partnership's own last 120 days of transactions by
// merchant, looking for a merchant that recurs often enough (>= 2 times)
// at a roughly consistent interval — then excludes any merchant that
// already has a confirmed recurring_expenses row, so a candidate only
// ever represents something genuinely not yet tracked.
export async function detectRecurringCandidates(client: PoolClient): Promise<RecurringCandidate[]> {
  const alreadyTracked = await client.query(
    `select merchant_name from recurring_expenses where merchant_name is not null`
  );
  const trackedNames = new Set(alreadyTracked.rows.map((r) => r.merchant_name as string));

  const result = await client.query(`
    with scoped as (
      select merchant_name, amount, transaction_date, category_id
      from transactions
      where merchant_name is not null
        and deleted_at is null
        and transaction_date >= current_date - interval '120 days'
    ),
    gapped as (
      select *,
        transaction_date - lag(transaction_date) over (partition by merchant_name order by transaction_date) as gap_days
      from scoped
    )
    select merchant_name,
           count(*)::int as occurrences,
           round(avg(amount), 2)::float8 as avg_amount,
           (array_agg(amount order by transaction_date desc))[1]::float8 as last_amount,
           max(transaction_date)::text as last_date,
           percentile_cont(0.5) within group (order by gap_days)::float8 as median_gap_days,
           (array_agg(category_id order by transaction_date desc))[1] as category_id
    from gapped
    group by merchant_name
    having count(*) >= 2
  `);

  const candidates: RecurringCandidate[] = [];
  for (const row of result.rows) {
    const merchantName = row.merchant_name as string;
    if (trackedNames.has(merchantName)) continue;
    const medianGapDays = row.median_gap_days as number | null;
    if (medianGapDays === null) continue;
    const frequency = classifyFrequency(medianGapDays);
    if (!frequency) continue;
    candidates.push({
      merchantName,
      categoryId: (row.category_id as string | null) ?? null,
      occurrences: row.occurrences as number,
      avgAmount: row.avg_amount as number,
      lastAmount: row.last_amount as number,
      lastDate: row.last_date as string,
      frequency,
    });
  }
  return candidates;
}

export interface RecurringAmountChange {
  merchantName: string;
  oldAmount: number;
  newAmount: number;
}

// For every confirmed recurring expense: links any of this user's own
// transactions matching its merchant that aren't linked yet (so spend
// tracked before confirming still counts), then checks whether the most
// recent linked transaction's amount differs from what was last recorded.
// PRD §12.5's own edge case: "a recurring expense whose amount changes...
// should surface as an AI Insight, not just silently update" — this
// returns that change as a fact for the caller to fold into
// lib/insights.ts's buildInsights(), the same "computed fresh every load,
// nothing persisted to ai_insights" posture every other insight in this
// app already uses (ai_insights itself has never been written to by any
// route). Updating last_amount_seen here is what keeps this from
// re-surfacing the same change forever — the next reconciliation finds
// them equal and stays quiet.
export async function reconcileRecurringExpenses(client: PoolClient): Promise<RecurringAmountChange[]> {
  const tracked = await client.query(
    `select id, merchant_name, amount, frequency, last_amount_seen::float8 as last_amount_seen
     from recurring_expenses where merchant_name is not null`
  );

  const changes: RecurringAmountChange[] = [];
  for (const row of tracked.rows) {
    const id = row.id as string;
    const merchantName = row.merchant_name as string;
    const frequency = row.frequency as string;
    const lastAmountSeen = row.last_amount_seen as number | null;

    await client.query(
      `update transactions set recurring_expense_id = $1
       where merchant_name = $2 and recurring_expense_id is null and deleted_at is null`,
      [id, merchantName]
    );

    const latest = await client.query(
      `select amount::float8 as amount, transaction_date::text as transaction_date
       from transactions where recurring_expense_id = $1
       order by transaction_date desc limit 1`,
      [id]
    );
    const latestRow = latest.rows[0] as { amount: number; transaction_date: string } | undefined;
    if (!latestRow) continue;

    const nextDueDate = new Date(new Date(latestRow.transaction_date).getTime() + frequencyToDays(frequency) * MS_PER_DAY)
      .toISOString()
      .slice(0, 10);

    if (lastAmountSeen !== null && lastAmountSeen !== latestRow.amount) {
      changes.push({ merchantName, oldAmount: lastAmountSeen, newAmount: latestRow.amount });
    }

    await client.query(
      `update recurring_expenses set last_amount_seen = $2, amount = $2, next_due_date = $3::date where id = $1`,
      [id, latestRow.amount, nextDueDate]
    );
  }
  return changes;
}
