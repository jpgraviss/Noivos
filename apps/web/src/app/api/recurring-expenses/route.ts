import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/clerk";
import { withUserContext } from "@/lib/db";
import { findActiveMembership } from "@/lib/partnership";
import { detectRecurringCandidates, reconcileRecurringExpenses } from "@/lib/recurringExpenses";
import { tooLong, MAX_NAME_LENGTH, isUuid } from "@/lib/validate";

// GET — reconciles every confirmed recurring expense against real
// transactions (linking new matches, catching amount changes) and detects
// not-yet-tracked recurring merchants, same "always requery fresh, nothing
// cached" posture as GET /api/budget.
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
      const amountChanges = await reconcileRecurringExpenses(client);
      const candidates = await detectRecurringCandidates(client);
      const confirmedResult = await client.query(
        `select id, merchant_name, category_id, amount::float8 as amount, frequency,
                next_due_date::text as next_due_date, last_amount_seen::float8 as last_amount_seen, is_shared
         from recurring_expenses where merchant_name is not null order by merchant_name asc`
      );
      return {
        confirmed: confirmedResult.rows.map((r) => ({
          id: r.id as string,
          merchantName: r.merchant_name as string,
          categoryId: r.category_id as string | null,
          amount: r.amount as number,
          frequency: r.frequency as string,
          nextDueDate: r.next_due_date as string | null,
          isShared: Boolean(r.is_shared),
        })),
        candidates,
        amountChanges,
      };
    });
    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/recurring-expenses failed", err);
    return NextResponse.json({ error: "Couldn't load recurring expenses." }, { status: 500 });
  }
}

// POST — confirms a detected candidate (or a manual entry) as a real
// recurring expense. Immediately links any of this user's own already-
// existing matching transactions, rather than waiting for the next GET's
// reconciliation pass, so past spend shows up right away.
export async function POST(request: Request) {
  if (!clerkConfigured()) {
    return NextResponse.json({ error: "Clerk isn't configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { merchantName?: unknown; categoryId?: unknown; amount?: unknown; frequency?: unknown; isShared?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const merchantName = typeof body.merchantName === "string" ? body.merchantName.trim() : "";
  const categoryId = typeof body.categoryId === "string" ? body.categoryId : null;
  const amount = Number(body.amount);
  const frequency = typeof body.frequency === "string" ? body.frequency.trim() : "";
  const isShared = body.isShared === true;
  if (!merchantName) {
    return NextResponse.json({ error: "merchantName is required" }, { status: 400 });
  }
  if (tooLong(merchantName, MAX_NAME_LENGTH)) {
    return NextResponse.json({ error: `merchantName must be ${MAX_NAME_LENGTH} characters or fewer` }, { status: 400 });
  }
  if (categoryId && !isUuid(categoryId)) {
    return NextResponse.json({ error: "Invalid categoryId" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }
  if (!frequency) {
    return NextResponse.json({ error: "frequency is required" }, { status: 400 });
  }

  try {
    const result = await withUserContext(userId, async (client) => {
      let partnershipId: string | null = null;
      if (isShared) {
        const membership = await findActiveMembership(userId, client);
        if (!membership) {
          return { noPartnership: true as const };
        }
        partnershipId = membership.partnership_id as string;
      }

      const inserted = await client.query(
        `insert into recurring_expenses (owner_id, partnership_id, is_shared, category_id, amount, frequency, last_amount_seen, merchant_name)
         values ($1, $2, $3, $4, $5, $6, $5, $7)
         returning id`,
        [userId, partnershipId, isShared, categoryId, amount, frequency, merchantName]
      );
      const id = inserted.rows[0].id as string;

      await client.query(
        `update transactions set recurring_expense_id = $1
         where merchant_name = $2 and recurring_expense_id is null and deleted_at is null`,
        [id, merchantName]
      );

      return { created: true as const, id };
    });

    if (result.noPartnership) {
      return NextResponse.json({ error: "You need an active Partnership to track a shared recurring expense." }, { status: 400 });
    }
    return NextResponse.json({ id: result.id });
  } catch (err) {
    console.error("POST /api/recurring-expenses failed", err);
    return NextResponse.json({ error: "Couldn't save that recurring expense." }, { status: 500 });
  }
}
