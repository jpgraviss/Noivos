import type { PoolClient } from "@neondatabase/serverless";
import type { FinancialContext } from "./ai";

// Extracted from api/ai/coach/route.ts (2026-10-08, building the Purchase
// Advisor — SE-69) so both AI routes can share one "pull this month's real
// budget/goal/bill numbers fresh from Neon" query instead of maintaining
// two copies that can silently drift apart. Same "always requery, never
// trust a stale snapshot" posture as lib/moneyMeeting.ts's buildAgenda().
export async function loadFinancialContext(userId: string, client: PoolClient): Promise<FinancialContext> {
  const monthResult = await client.query(`select trim(to_char(current_date, 'Month YYYY')) as label`);
  const monthLabel = monthResult.rows[0].label as string;

  const categoriesResult = await client.query(
    `select c.name, bc.planned_amount,
            coalesce((
              select sum(t.amount) from transactions t
              where t.category_id = c.id
                and t.transaction_date >= date_trunc('month', current_date)
                and t.transaction_date < date_trunc('month', current_date) + interval '1 month'
            ), 0) as spent
     from budget_categories bc
     join categories c on c.id = bc.category_id
     join budgets b on b.id = bc.budget_id
     where b.month = date_trunc('month', current_date)::date
     order by c.name asc`
  );
  const goalsResult = await client.query(
    `select g.name, g.target_amount::float8 as target_amount, g.target_date::text as target_date,
            coalesce((select sum(gc.amount) from goal_contributions gc where gc.goal_id = g.id), 0) as total_contributed
     from goals g
     order by g.created_at asc
     limit 10`
  );
  const billsResult = await client.query(
    `select v.name, v.balance_due::float8 as amount,
            trim(to_char(v.balance_due_date, 'Mon DD')) as due
     from wedding_vendors v
     where v.balance_due is not null and v.balance_due > 0 and v.balance_due_date is not null
     order by v.balance_due_date asc
     limit 5`
  );
  const membership = await client.query(
    `select 1 from partnership_members where user_id = $1 and left_at is null limit 1`,
    [userId]
  );

  return {
    monthLabel,
    hasPartnership: membership.rows.length > 0,
    budgetCategories: categoriesResult.rows.map((r) => ({
      name: r.name as string,
      planned: Number(r.planned_amount),
      spent: Number(r.spent),
    })),
    goals: goalsResult.rows.map((r) => ({
      name: r.name as string,
      targetAmount: Number(r.target_amount),
      totalContributed: Number(r.total_contributed),
      targetDate: r.target_date as string | null,
    })),
    upcomingBills: billsResult.rows.map((r) => ({
      name: r.name as string,
      amount: Number(r.amount),
      due: r.due as string,
    })),
  };
}
