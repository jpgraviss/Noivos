import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/clerk";
import { withUserContext } from "@/lib/db";
import { findActiveMembership } from "@/lib/partnership";
import {
  DEFAULT_CATEGORIES,
  INCOME_BUFFER_CATEGORY_NAME,
  IRREGULAR_INCOME_WINDOW_MONTHS,
  computeIncomeBufferDelta,
  findOrCreateIncomeBufferCategory,
} from "@/lib/budget";

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

            // Budget rollover (PRD §12.6, part of SE-82) — budgets.
            // rollover_enabled/budget_categories.rollover_amount have
            // existed since 0001_init.sql, unused until now. Only runs
            // once, at the exact moment this month's budget is first
            // created (never re-triggered by a later GET of the same
            // budget, since budgetId is already set on every subsequent
            // call) — seeds each category's rollover_amount from last
            // month's leftover (planned + its own rollover - spent, which
            // can be negative: overspending carries forward as a deficit,
            // not just unspent surplus carrying forward as a bonus). The
            // generic "missing categories" backfill a few lines down still
            // runs afterward for anything this seeding didn't cover (a
            // brand-new category with no prior-month row), on conflict
            // do nothing meaning it never overwrites what's seeded here.
            {
              // rollover_enabled always defaults true (no UI/route toggles
              // it off yet — a real, documented gap, not silently assumed);
              // the query below still checks it on the *previous* month's
              // budget row rather than assuming, since the column exists
              // specifically to allow disabling this per-budget.
              const prevMonthResult = await client.query(
                `select to_char(date_trunc('month', current_date) - interval '1 month', 'YYYY-MM-DD') as month`
              );
              const prevMonth = prevMonthResult.rows[0].month as string;
              const prevBudget = await client.query(
                isShared
                  ? `select id from budgets where partnership_id = $1 and is_shared = true and month = $2::date and rollover_enabled`
                  : `select id from budgets where owner_id = $1 and month = $2::date and partnership_id is null and rollover_enabled`,
                isShared ? [partnershipId, prevMonth] : [userId, prevMonth]
              );
              if (prevBudget.rows[0]) {
                const prevCategories = await client.query(
                  `select bc.category_id, bc.planned_amount::float8 as planned_amount, bc.rollover_amount::float8 as rollover_amount,
                          coalesce((
                            select sum(t.amount) from transactions t
                            where t.category_id = bc.category_id
                              and t.transaction_date >= $2::date
                              and t.transaction_date < $2::date + interval '1 month'
                          ), 0)::float8 as spent
                   from budget_categories bc where bc.budget_id = $1`,
                  [prevBudget.rows[0].id, prevMonth]
                );
                if (prevCategories.rows.length > 0) {
                  const categoryIds = prevCategories.rows.map((r) => r.category_id as string);
                  const plannedAmounts = prevCategories.rows.map((r) => r.planned_amount as number);
                  const rolloverAmounts = prevCategories.rows.map(
                    (r) => (r.planned_amount as number) + (r.rollover_amount as number) - (r.spent as number)
                  );
                  await client.query(
                    `insert into budget_categories (budget_id, category_id, planned_amount, rollover_amount)
                     select $1, cat_id, planned, roll
                     from unnest($2::uuid[], $3::numeric[], $4::numeric[]) as t(cat_id, planned, roll)
                     on conflict (budget_id, category_id) do nothing`,
                    [budgetId, categoryIds, plannedAmounts, rolloverAmounts]
                  );
                }
              }
            }

            // Irregular-income mode (SE-82's third piece) — inherits
            // forward from the previous month's budget row, unlike
            // rollover_enabled above: rollover defaults to on for everyone
            // (no UI to turn it off yet, a documented gap), so it never
            // needed remembering a toggle; this one defaults off and would
            // be pointless if turning it on didn't stick past the one
            // month a user actually flips it.
            {
              const prevMonthResult = await client.query(
                `select to_char(date_trunc('month', current_date) - interval '1 month', 'YYYY-MM-DD') as month`
              );
              const prevMonth = prevMonthResult.rows[0].month as string;
              const prevIrregular = await client.query(
                isShared
                  ? `select irregular_income_enabled from budgets where partnership_id = $1 and is_shared = true and month = $2::date`
                  : `select irregular_income_enabled from budgets where owner_id = $1 and month = $2::date and partnership_id is null`,
                isShared ? [partnershipId, prevMonth] : [userId, prevMonth]
              );
              if (prevIrregular.rows[0]?.irregular_income_enabled === true) {
                await client.query(`update budgets set irregular_income_enabled = true where id = $1`, [budgetId]);

                // Income-smoothing buffer: averages up to the last
                // IRREGULAR_INCOME_WINDOW_MONTHS prior months' actual_income
                // (manually entered, like every other figure in this app —
                // no bank-verified income detection exists), then banks or
                // draws the difference between the single most recent of
                // those months and that average into a dedicated "Income
                // Buffer" category's rollover_amount — reusing the exact
                // carry-forward mechanic rollover already has above, rather
                // than inventing a second one. Skipped entirely when no
                // prior month has actual_income recorded yet (nothing to
                // average — same "can't compute what isn't there" posture
                // as rollover's own prevBudget-not-found fallback).
                const history = await client.query(
                  isShared
                    ? `select actual_income::float8 as actual_income from budgets
                       where partnership_id = $1 and is_shared = true and actual_income is not null and month < $2::date
                       order by month desc limit $3`
                    : `select actual_income::float8 as actual_income from budgets
                       where owner_id = $1 and partnership_id is null and actual_income is not null and month < $2::date
                       order by month desc limit $3`,
                  isShared
                    ? [partnershipId, month, IRREGULAR_INCOME_WINDOW_MONTHS]
                    : [userId, month, IRREGULAR_INCOME_WINDOW_MONTHS]
                );
                if (history.rows.length > 0) {
                  const incomes = history.rows.map((r) => r.actual_income as number);
                  const bufferDelta = computeIncomeBufferDelta(incomes);
                  const bufferCategoryId = await findOrCreateIncomeBufferCategory(userId, partnershipId, isShared, client);
                  const prevBufferRow = await client.query(
                    `select bc.rollover_amount::float8 as rollover_amount
                     from budget_categories bc
                     join budgets b on b.id = bc.budget_id
                     where bc.category_id = $1 and b.month = $2::date`,
                    [bufferCategoryId, prevMonth]
                  );
                  const prevBufferBalance = Number(prevBufferRow.rows[0]?.rollover_amount ?? 0);
                  await client.query(
                    `insert into budget_categories (budget_id, category_id, planned_amount, rollover_amount)
                     values ($1, $2, 0, $3)
                     on conflict (budget_id, category_id) do nothing`,
                    [budgetId, bufferCategoryId, prevBufferBalance + bufferDelta]
                  );
                }
              }
            }
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
      // Single set-based query instead of one existence-check SELECT per
      // category (found 2026-08-13, a real N+1): the previous version
      // looped over every category visible to this user/partnership
      // (8+ once a couple customizes their budget, only growing from
      // there) and ran a sequential SELECT for each one — on *every*
      // GET, even in the ordinary steady-state case where nothing is
      // actually missing. BudgetScreen.tsx calls this route on every page
      // load and again after every expense submission, so that was N
      // extra round trips added to every single request, each one paying
      // Neon's real network latency for zero actual work. Now it's
      // exactly one query, returning zero rows once nothing's missing.
      if (budgetOwnedByRequester) {
        const missing = await client.query(
          `select c.id, c.name
           from categories c
           left join budget_categories bc on bc.budget_id = $1 and bc.category_id = c.id
           where (c.owner_id = $2 or ($3::uuid is not null and c.partnership_id = $3))
             and bc.id is null`,
          [budgetId, userId, partnershipId]
        );
        if (missing.rows.length > 0) {
          const categoryIds = missing.rows.map((r) => r.id as string);
          const plannedAmounts = missing.rows.map(
            (r) => DEFAULT_CATEGORIES.find((d) => d.name === r.name)?.plannedAmount ?? 0
          );
          // ON CONFLICT DO NOTHING against budget_categories_unique (migration
          // 0008) — same class of race as the categories bootstrap above; the
          // select below re-reads everything fresh regardless of who won.
          // unnest() turns the two parallel arrays into rows for a single
          // multi-row insert, rather than one insert per missing category.
          await client.query(
            `insert into budget_categories (budget_id, category_id, planned_amount)
             select $1, cat_id, planned
             from unnest($2::uuid[], $3::numeric[]) as t(cat_id, planned)
             on conflict (budget_id, category_id) do nothing`,
            [budgetId, categoryIds, plannedAmounts]
          );
        }
      }

      const rows = await client.query(
        `select c.id, c.name, (c.partnership_id is not null) as shared, bc.planned_amount, bc.rollover_amount,
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

      // "planned" is the effective budget a category actually has to spend
      // against this month (its own planned_amount plus whatever carried
      // over from last month, PRD §12.6) — rolloverAmount is broken out
      // separately so the UI can show *why* a category's number moved
      // rather than silently folding a carried-over deficit or surplus
      // into planned_amount with no attribution.
      const categoriesOut = rows.rows.map((r) => ({
        id: r.id as string,
        name: r.name as string,
        shared: Boolean(r.shared),
        planned: Number(r.planned_amount) + Number(r.rollover_amount),
        rolloverAmount: Number(r.rollover_amount),
        spent: Number(r.spent),
        // The Income Buffer category (irregular-income mode, SE-82) isn't a
        // real spending category — it only ever carries a banked/drawn
        // smoothing balance in rolloverAmount, never an actual expense — so
        // it's excluded from the planned/spent totals below (folding it in
        // would skew "% of budget used" by a number that was never meant to
        // be spent against) and flagged here so the UI can render it with
        // its own "income smoothing" framing instead of a normal category
        // card.
        isIncomeBuffer: r.name === INCOME_BUFFER_CATEGORY_NAME,
      }));
      const spendingCategories = categoriesOut.filter((c) => !c.isIncomeBuffer);
      const planned = spendingCategories.reduce((s, c) => s + c.planned, 0);
      const spent = spendingCategories.reduce((s, c) => s + c.spent, 0);

      const budgetSettings = await client.query(
        `select irregular_income_enabled, actual_income::float8 as actual_income from budgets where id = $1`,
        [budgetId]
      );
      const irregularIncomeEnabled = Boolean(budgetSettings.rows[0]?.irregular_income_enabled);
      const actualIncome = (budgetSettings.rows[0]?.actual_income as number | null) ?? null;

      return { month: monthLabel, planned, spent, categories: categoriesOut, irregularIncomeEnabled, actualIncome };
    });

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/budget failed", err);
    return NextResponse.json({ error: "Couldn't load your Budget." }, { status: 500 });
  }
}

// Updates the current month's budget row with irregular-income settings —
// GET above never writes irregular_income_enabled except to inherit it
// forward from a prior month, this is the only place a user actually turns
// the mode on/off or records a month's actual_income. Both fields are
// optional and independent (the UI has two separate controls — a toggle and
// an income field — that can each be used without the other), so undefined
// means "leave this field alone," not "clear it." Owner-scoped (`where
// owner_id = $4`), same documented constraint GET's own design note already
// states for budget_categories: on a shared budget, only the partner who
// created this month's row can edit it — a non-owning partner's PATCH here
// correctly matches zero rows rather than silently writing nothing useful,
// returned as 404 below rather than a raw 500.
export async function PATCH(request: Request) {
  if (!clerkConfigured()) {
    return NextResponse.json({ error: "Clerk isn't configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { irregularIncomeEnabled, actualIncome } = body as { irregularIncomeEnabled?: unknown; actualIncome?: unknown };
  if (irregularIncomeEnabled !== undefined && typeof irregularIncomeEnabled !== "boolean") {
    return NextResponse.json({ error: "irregularIncomeEnabled must be a boolean" }, { status: 400 });
  }
  if (
    actualIncome !== undefined &&
    actualIncome !== null &&
    (typeof actualIncome !== "number" || !Number.isFinite(actualIncome) || actualIncome < 0)
  ) {
    return NextResponse.json({ error: "actualIncome must be a non-negative number or null" }, { status: 400 });
  }

  try {
    const updated = await withUserContext(userId, async (client) => {
      const membership = await findActiveMembership(userId, client);
      const partnershipId = membership?.partnership_id ?? null;
      const monthResult = await client.query(
        `select to_char(date_trunc('month', current_date), 'YYYY-MM-DD') as month`
      );
      const month = monthResult.rows[0].month as string;

      const result = await client.query(
        `update budgets set
           irregular_income_enabled = coalesce($1, irregular_income_enabled),
           actual_income = case when $2 then $3 else actual_income end
         where owner_id = $4 and month = $5::date and partnership_id is not distinct from $6::uuid
         returning irregular_income_enabled, actual_income::float8 as actual_income`,
        [
          irregularIncomeEnabled ?? null,
          actualIncome !== undefined,
          actualIncome ?? null,
          userId,
          month,
          partnershipId,
        ]
      );
      return result.rows[0] ?? null;
    });

    if (!updated) {
      return NextResponse.json(
        { error: "No Budget found for this month yet — load Budget first." },
        { status: 404 }
      );
    }
    return NextResponse.json({
      irregularIncomeEnabled: Boolean(updated.irregular_income_enabled),
      actualIncome: (updated.actual_income as number | null) ?? null,
    });
  } catch (err) {
    console.error("PATCH /api/budget failed", err);
    return NextResponse.json({ error: "Couldn't update your Budget settings." }, { status: 500 });
  }
}
