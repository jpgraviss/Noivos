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
// partner gets a real, correct read-only view (see the budgetOwnedByRequester
// guard below, which is what actually makes that true rather than crashing).
// A true co-editable budget needs its own RLS pass later; not attempted here.
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
          // ON CONFLICT DO NOTHING against categories_{personal,shared}_name_unique
          // (migration 0008) — the n === 0 check above isn't itself race-safe
          // (two concurrent first-loads could both pass it), so the real
          // protection is here: a losing insert just no-ops instead of
          // creating a duplicate category. Nothing downstream needs this
          // insert's id — the select a few lines down re-reads categories
          // fresh regardless of who won.
          await client.query(
            asShared
              ? `insert into categories (owner_id, partnership_id, name, is_default)
                 values ($1, $2, $3, true)
                 on conflict (partnership_id, name) where owner_id is null
                 do nothing`
              : `insert into categories (owner_id, partnership_id, name, is_default)
                 values ($1, $2, $3, true)
                 on conflict (owner_id, name) where partnership_id is null
                 do nothing`,
            [asShared ? null : userId, asShared ? partnershipId : null, def.name]
          );
        }
      }

      // Find this month's budget: the shared partnership one if it already
      // exists, else this user's own row (creating it if neither exists).
      let budgetId: string | null = null;
      // Tracks whether *this* request's user is the budgets row's owner —
      // needed below because budget_categories_write's RLS is owner-scoped
      // (see the design note above), so a non-owning partner genuinely
      // cannot write a budget_categories row for this budget, only read it.
      let budgetOwnedByRequester = true;
      if (partnershipId) {
        const sharedBudget = await client.query(
          `select id, owner_id from budgets where partnership_id = $1 and is_shared = true and month = $2::date`,
          [partnershipId, month]
        );
        if (sharedBudget.rows[0]) {
          budgetId = sharedBudget.rows[0].id;
          budgetOwnedByRequester = sharedBudget.rows[0].owner_id === userId;
        }
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
          // ON CONFLICT DO NOTHING against budgets_shared_month_unique /
          // budgets_personal_month_unique (migration 0008) — two concurrent
          // GETs (both partners loading Budget at once) could otherwise both
          // reach here and both insert, giving the Partnership two "the"
          // shared budget rows for the same month. If this request loses
          // that race, RETURNING comes back empty and the fallback select
          // picks up whichever row actually won.
          const created = await client.query(
            isShared
              ? `insert into budgets (owner_id, partnership_id, is_shared, month)
                 values ($1, $2, $3, $4::date)
                 on conflict (partnership_id, month) where is_shared and partnership_id is not null
                 do nothing
                 returning id`
              : `insert into budgets (owner_id, partnership_id, is_shared, month)
                 values ($1, $2, $3, $4::date)
                 on conflict (owner_id, month) where partnership_id is null
                 do nothing
                 returning id`,
            [userId, isShared ? partnershipId : null, isShared, month]
          );
          if (created.rows[0]) {
            budgetId = created.rows[0].id;
          } else {
            const winner = await client.query(
              isShared
                ? `select id from budgets where partnership_id = $1 and is_shared = true and month = $2::date`
                : `select id from budgets where owner_id = $1 and month = $2::date and partnership_id is null`,
              isShared ? [partnershipId, month] : [userId, month]
            );
            budgetId = winner.rows[0].id;
          }
        }
      }

      // Make sure every category this user/partnership can see has a
      // budget_categories row (seeded from the default planned amount when
      // it's a known default, 0 otherwise) so newly-added categories always
      // show up rather than silently being excluded.
      //
      // Only attempted when this request's user actually owns budgetId —
      // budget_categories_write's RLS is owner-scoped (see the design note
      // above), so a non-owning partner's insert here would be denied by
      // RLS on *any* not-yet-linked category, shared or personal (found
      // 2026-08-11: this wasn't a rare edge case — it fires the very first
      // time the non-creating partner loads Budget in a given month, since
      // whoever didn't create this month's shared budget row never owns
      // it). That denial previously propagated straight to the outer catch
      // block below as a raw, uncaught error, turning the intended
      // "the other partner gets a real, correct read-only view" (per the
      // design note above) into an actual 500 that broke their Budget page
      // outright. Skipping the backfill for a non-owner is what actually
      // makes that read-only view real: they still see every
      // budget_categories row the owner has already linked, just without
      // this request also trying to add missing ones on their behalf.
      const categories = budgetOwnedByRequester
        ? await client.query(
            `select id, name from categories
             where owner_id = $1 or ($2::uuid is not null and partnership_id = $2)
             order by created_at asc`,
            [userId, partnershipId]
          )
        : null;
      if (categories) {
        for (const cat of categories.rows) {
          const existingBc = await client.query(
            `select id from budget_categories where budget_id = $1 and category_id = $2`,
            [budgetId, cat.id]
          );
          if (!existingBc.rows[0]) {
            const seed = DEFAULT_CATEGORIES.find((d) => d.name === cat.name);
            // ON CONFLICT DO NOTHING against budget_categories_unique (migration
            // 0008) — same class of race as the categories bootstrap above; the
            // select below re-reads everything fresh regardless of who won.
            await client.query(
              `insert into budget_categories (budget_id, category_id, planned_amount)
               values ($1, $2, $3)
               on conflict (budget_id, category_id) do nothing`,
              [budgetId, cat.id, seed?.plannedAmount ?? 0]
            );
          }
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
