import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/clerk";
import { withUserContext } from "@/lib/db";

// HomeScreen's "Upcoming Bills" card was showing two hardcoded wedding-
// vendor balances from mock data — real money for those exact same bills
// already exists in wedding_vendors (wired 2026-08-03), so rather than
// invent a separate "bills" concept (or a new migration for one), this
// reads the vendor balances that are already real. No RLS filtering is
// written here explicitly — wedding_vendors_all's existing policy
// (0002_rls.sql) already scopes this to vendors this user's active
// Partnership can see.
export async function GET() {
  if (!clerkConfigured()) {
    return NextResponse.json({ error: "Clerk isn't configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const bills = await withUserContext(userId, async (client) => {
      const result = await client.query(
        `select v.id, v.name,
                v.balance_due::float8 as amount,
                trim(to_char(v.balance_due_date, 'Mon DD')) as due
         from wedding_vendors v
         where v.balance_due is not null and v.balance_due > 0 and v.balance_due_date is not null
         order by v.balance_due_date asc
         limit 5`
      );
      return result.rows.map((r) => ({ id: r.id, name: r.name, amount: Number(r.amount), due: r.due }));
    });

    return NextResponse.json({ bills });
  } catch (err) {
    console.error("GET /api/bills failed", err);
    return NextResponse.json({ error: "Couldn't load your upcoming bills." }, { status: 500 });
  }
}
