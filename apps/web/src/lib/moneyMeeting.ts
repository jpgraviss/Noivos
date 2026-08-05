import type { PoolClient } from "@neondatabase/serverless";

// Derives this week's Money Meeting agenda from real data that's already
// wired (Budget, Wedding vendors) — not an AI call. Matches the spirit of
// the mock agenda (an over-budget category, an ahead-of-schedule goal, an
// upcoming vendor balance) using plain rule-based checks instead. Computed
// once, at meeting-creation time, and stored in money_meetings.agenda so it
// stays stable for the rest of the week rather than shifting underfoot.
export async function buildAgenda(partnershipId: string, client: PoolClient): Promise<string[]> {
  const items: string[] = [];

  const overBudget = await client.query(
    `select c.name,
            bc.planned_amount::float8 as planned,
            coalesce((
              select sum(t.amount) from transactions t
              where t.category_id = c.id
                and t.transaction_date >= date_trunc('month', current_date)
                and t.transaction_date < date_trunc('month', current_date) + interval '1 month'
            ), 0)::float8 as spent
     from budgets b
     join budget_categories bc on bc.budget_id = b.id
     join categories c on c.id = bc.category_id
     where b.partnership_id = $1 and b.is_shared = true
       and b.month = date_trunc('month', current_date)::date`,
    [partnershipId]
  );
  for (const row of overBudget.rows) {
    if (row.spent > row.planned) {
      items.push(`${row.name} is $${Math.round(row.spent - row.planned)} over this month — worth a look together?`);
    }
  }

  const dueVendors = await client.query(
    `select v.name, v.balance_due_date::text as due_date
     from wedding_vendors v
     join wedding_details w on w.id = v.wedding_details_id
     where w.partnership_id = $1
       and v.balance_due is not null and v.balance_due > 0
       and v.balance_due_date is not null
       and v.balance_due_date <= current_date + interval '14 days'
     order by v.balance_due_date asc
     limit 3`,
    [partnershipId]
  );
  for (const row of dueVendors.rows) {
    items.push(`${row.name} balance due ${row.due_date} — confirm payment method`);
  }

  if (items.length === 0) {
    items.push("Nothing urgent this week — a good week to check in on your goals together.");
  }
  return items;
}
