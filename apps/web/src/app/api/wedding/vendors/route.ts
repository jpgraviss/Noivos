import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { withUserContext } from "@/lib/db";
import { findActiveMembership } from "@/lib/partnership";
import { findWeddingDetails } from "@/lib/wedding";
import { logActivityEvent } from "@/lib/activity";
import { tooLong, MAX_NAME_LENGTH } from "@/lib/validate";

function clerkConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

export async function POST(request: Request) {
  if (!clerkConfigured()) {
    return NextResponse.json({ error: "Clerk isn't configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { name?: unknown; balanceDue?: unknown; balanceDueDate?: unknown; status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const balanceDue =
    body.balanceDue === undefined || body.balanceDue === null || body.balanceDue === "" ? null : Number(body.balanceDue);
  const balanceDueDate = typeof body.balanceDueDate === "string" && body.balanceDueDate ? body.balanceDueDate : null;
  const status = typeof body.status === "string" && body.status.trim() ? body.status.trim() : "Contracted";

  if (!name) {
    return NextResponse.json({ error: "Vendor name is required" }, { status: 400 });
  }
  if (tooLong(name, MAX_NAME_LENGTH)) {
    return NextResponse.json({ error: `Vendor name must be ${MAX_NAME_LENGTH} characters or fewer` }, { status: 400 });
  }
  if (tooLong(status, MAX_NAME_LENGTH)) {
    return NextResponse.json({ error: `Status must be ${MAX_NAME_LENGTH} characters or fewer` }, { status: 400 });
  }
  if (balanceDue !== null && (!Number.isFinite(balanceDue) || balanceDue < 0)) {
    return NextResponse.json({ error: "Balance due must be a non-negative number" }, { status: 400 });
  }
  if (balanceDueDate && !/^\d{4}-\d{2}-\d{2}$/.test(balanceDueDate)) {
    return NextResponse.json({ error: "balanceDueDate must be in YYYY-MM-DD format" }, { status: 400 });
  }

  try {
    const result = await withUserContext(userId, async (client) => {
      const membership = await findActiveMembership(userId, client);
      if (!membership) return { noPartnership: true as const };
      const details = await findWeddingDetails(membership.partnership_id, client);
      if (!details) return { noWeddingDetails: true as const };

      const insertResult = await client.query(
        `insert into wedding_vendors (wedding_details_id, name, balance_due, balance_due_date, status)
         values ($1, $2, $3, $4, $5)
         returning id, name, category, contract_amount::float8 as contract_amount,
                   deposit_amount::float8 as deposit_amount, balance_due::float8 as balance_due,
                   balance_due_date::text as balance_due_date, status`,
        [details.id, name, balanceDue, balanceDueDate, status]
      );
      return { vendor: insertResult.rows[0], partnershipId: membership.partnership_id };
    });

    if (result.noPartnership) {
      return NextResponse.json({ error: "Set up a Partnership first." }, { status: 400 });
    }
    if (result.noWeddingDetails) {
      return NextResponse.json({ error: "Start Wedding Mode before adding vendors." }, { status: 400 });
    }
    const v = result.vendor;

    // Best-effort, fire-and-forget — see lib/activity.ts. Vendors always
    // belong to an active Partnership (wedding_details.partnership_id is
    // NOT NULL), so no shared/personal branch is needed here.
    void logActivityEvent(userId, result.partnershipId, "wedding_vendor_added", { vendorName: v.name });

    return NextResponse.json({
      id: v.id,
      name: v.name,
      category: v.category,
      contractAmount: v.contract_amount,
      depositAmount: v.deposit_amount,
      balanceDue: v.balance_due,
      balanceDueDate: v.balance_due_date,
      status: v.status,
    });
  } catch (err) {
    console.error("POST /api/wedding/vendors failed", err);
    return NextResponse.json({ error: "Couldn't add that vendor." }, { status: 500 });
  }
}
