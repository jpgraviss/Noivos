import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { withUserContext } from "@/lib/db";
import { findActiveMembership } from "@/lib/partnership";
import { DEFAULT_CATEGORIES } from "@/lib/budget";

function clerkConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

// Design note (fast-tracked judgment call, same posture as the Partnership
// status='active' fix — flagged here and in PROJECT_MEMORY.md rather than
// silently baked in): with an active Partnership, this looks for one shared
// budget row per partnership per month (whichever partner loads Budget
// first creates it) instead of one row per user, so both partners actually
// see the same numbers. Only the creating partner can currently *edit* it
// (budget_categories_write in 0002_rls.sql is owner-scoped) — the other
// partner gets a real, correct read-only view. A true co-editable budget
// needs its own RLS pass later; not attempted here.
export async function GET() {
  if (!clerkConfigured()) {
    return NextResponse.json({ error: "Clerk isn't configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const data = await withUserContext(userId, async (client) => {
      await client.query(`insert into users (id) values ($1) on conflict (id) do nothing`, [userId]);
      const membership = await findActiveMembership(userId, client);
      const partnershipId = membership?.partnership_id ?? null;

      const monthResult = await client.query(
        `select to_char(date_trunc('month', current_date), 'YYYY-MM-DD') as month,
                trim(to_char(current_date, 'Month')) as label`
      );
      const month = monthResult.rows[0].month as string;
      const monthLabel = monthResult.rows[0].label as string;

      // Bootstrap: a user/partnership with zero categories at all yet gets
      // the same default set + planned amounts the mock data used, so their
      // first real Budget looks like what they were already looking at.
      const existingCategories = await client.query(
        `select count(*)::int as n from categories
         where owner_id = $1 or ($2::uuid is not null and partnership_id = $2)`,
        [userId, partnershipId]
      );
      if (existingCategories.rows[0].n === 0) {
        for (const def of DEFAULT_CATEGORIES) {
          const asShared = def.shared && Boolean(partnershipId);
          await client.query(
            `insert into categories (owner_id, partnership_id, name, is_default)
             values ($1, $2, $3, true)`,
            [asShared ? null : userId, asShared ? partnershipId : null, def.name]
          );
        }
      }

      // Find this month's budget: the shared partnership one if it already
      // exists, else this user's own row (creating it if neither exists).
      let budgetId: string | null = null;
      if (partnershipId) {
        const sharedBudget = await client.query(
          `select id from budgets where partnership_id = $1 and is_shared = true and month = $2::date`,
          [partnershipId, month]
        );
        if (sharedBudget.rows[0]) budgetId = sharedBudget.rows[0].id;
      }
      if (!budgetId) {
        const own = await client.query(
          `select id from budgets where owner_id = $1 and month = $2::date
           and partnership_id is not distinct from $3::uuid`,
          [userId, month, partnershipId]
        );
        if (own.rows[0]) {
          budgetId = own.rows[0].id;
        } else {
          const isShared = Boolean(partnershipId);
          const created = await client.query(
            `insert into budgets (owner_id, partnership_id, is_shared, month)
             values ($1, $2, $3, $4::date)
             returning id`,
            [userId, isShared ? partnershipId : null, isShared, month]
          );
          budgetId = created.rows[0].id;
        }
      }

      // Make sure every category this user/partnership can see has a
      // budget_categories row (seeded from the default planned amount when
      // it's a known default, 0 otherwise) so newly-added categories always
      // show up rather than silently being excluded.
      const categories = await client.query(
        `select id, name from categories
         where owner_id = $1 or ($2::uuid is not null and partnership_id = $2)
         order by created_at asc`,
        [userId, partnershipId]
      );
      for (const cat of categories.rows) {
        const existingBc = await client.query(
          `select id from budget_categories where budget_id = $1 and category_id = $2`,
          [budgetId, cat.id]
        );
        if (!existingBc.rows[0]) {
          const seed = DEFAULT_CATEGORIES.find((d) => d.name === cat.name);
          await client.query(
            `insert into budget_categories (budget_id, category_id, planned_amount)
             values ($1, $2, $3)`,
            [budgetId, cat.id, seed?.plannedAmount ?? 0]
          );
        }
      }

      const rows = await client.query(
        `select c.id, c.name, (c.partnership_id is not null) as shared, bc.planned_amount,
                coalesce((
                  select sum(t.amount) from transactions t
                  where t.category_id = c.id
                    and t.transaction_date >= date_trunc('month', current_date)
                    and t.transaction_date < date_trunc('month', current_date) + interval '1 month'
                ), 0) as spent
         from budget_categories bc
         join categories c on c.id = bc.category_id
         where bc.budget_id = $1
         order by c.created_at asc`,
        [budgetId]
      );

      const categoriesOut = rows.rows.map((r) => ({
        id: r.id as string,
        name: r.name as string,
        shared: Boolean(r.shared),
        planned: Number(r.planned_amount),
        spent: Number(r.spent),
      }));
      const planned = categoriesOut.reduce((s, c) => s + c.planned, 0);
      const spent = categoriesOut.reduce((s, c) => s + c.spent, 0);

      return { month: monthLabel, planned, spent, categories: categoriesOut };
    });

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/budget failed", err);
    return NextResponse.json({ error: "Couldn't load your Budget." }, { status: 500 });
  }
}
