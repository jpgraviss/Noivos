import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { withUserContext } from "@/lib/db";
import { findOrCreateManualAccount } from "@/lib/budget";
import { logActivityEvent } from "@/lib/activity";
import { tooLong, tooLarge, isUuid, MAX_NAME_LENGTH, MAX_AMOUNT } from "@/lib/validate";

function clerkConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

// Logs a manually-entered expense against an existing budget category. No
// Plaid/bank-linking exists yet, so every transaction in V1 goes through
// this path — see findOrCreateManualAccount in lib/budget.ts.
export async function POST(request: Request) {
  if (!clerkConfigured()) {
    return NextResponse.json({ error: "Clerk isn't configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { categoryId?: unknown; amount?: unknown; merchantName?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const categoryId = typeof body.categoryId === "string" ? body.categoryId : "";
  const amount = typeof body.amount === "number" ? body.amount : NaN;
  const merchantName =
    typeof body.merchantName === "string" && body.merchantName.trim() ? body.merchantName.trim() : null;

  if (!categoryId) {
    return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
  }
  // Not reachable via the real UI — BudgetScreen.tsx only ever sends a
  // category id it already fetched from GET /api/budget — but same posture
  // as the identical fix in goals/[id]/contributions: without this, a
  // malformed id would hit Postgres's own uuid-cast error and surface as
  // this route's generic 500 rather than a clean, specific 400.
  if (!isUuid(categoryId)) {
    return NextResponse.json({ error: "Invalid categoryId" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }
  if (tooLarge(amount, MAX_AMOUNT)) {
    return NextResponse.json({ error: `amount must be $${MAX_AMOUNT.toLocaleString()} or less` }, { status: 400 });
  }
  if (merchantName && tooLong(merchantName, MAX_NAME_LENGTH)) {
    return NextResponse.json({ error: `merchantName must be ${MAX_NAME_LENGTH} characters or fewer` }, { status: 400 });
  }

  try {
    const result = await withUserContext(userId, async (client) => {
      // RLS on categories already scopes this select to categories the user
      // owns or shares via an active Partnership — a zero-row result means
      // either it doesn't exist or isn't visible to this user, both of
      // which should read as "not found" rather than leaking which.
      const category = await client.query(`select id, name, partnership_id from categories where id = $1`, [categoryId]);
      if (!category.rows[0]) return { notFound: true as const };

      const accountId = await findOrCreateManualAccount(userId, client);
      const shared = Boolean(category.rows[0].partnership_id);

      const inserted = await client.query(
        `insert into transactions (account_id, owner_id, partnership_id, is_shared, amount, merchant_name, category_id, transaction_date)
         values ($1, $2, $3, $4, $5, $6, $7, current_date)
         returning id, amount, merchant_name, category_id, transaction_date::text as transaction_date`,
        [accountId, userId, shared ? category.rows[0].partnership_id : null, shared, amount, merchantName, categoryId]
      );
      return {
        transaction: inserted.rows[0],
        shared,
        categoryName: category.rows[0].name as string,
        partnershipId: category.rows[0].partnership_id as string | null,
      };
    });

    if (result.notFound) {
      return NextResponse.json({ error: "That category doesn't exist or isn't visible to you." }, { status: 404 });
    }
    const t = result.transaction;

    // Best-effort, fire-and-forget — see lib/activity.ts. Only logged for
    // shared categories; a personal expense stays off the shared feed.
    if (result.shared && result.partnershipId) {
      void logActivityEvent(userId, result.partnershipId, "budget_expense", {
        categoryName: result.categoryName,
        amount: Number(t.amount),
        merchantName: t.merchant_name,
      });
    }

    return NextResponse.json({
      id: t.id,
      amount: Number(t.amount),
      merchantName: t.merchant_name,
      categoryId: t.category_id,
      date: t.transaction_date,
    });
  } catch (err) {
    console.error("POST /api/budget/transactions failed", err);
    return NextResponse.json({ error: "Couldn't record that expense." }, { status: 500 });
  }
}
