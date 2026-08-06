import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { withUserContext } from "@/lib/db";
import { findActiveMembership } from "@/lib/partnership";
import { findWeddingDetails } from "@/lib/wedding";
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

  let body: { title?: unknown; dueDate?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const dueDate = typeof body.dueDate === "string" && body.dueDate ? body.dueDate : null;
  if (!title) {
    return NextResponse.json({ error: "Checklist item title is required" }, { status: 400 });
  }
  if (tooLong(title, MAX_NAME_LENGTH)) {
    return NextResponse.json({ error: `Checklist item title must be ${MAX_NAME_LENGTH} characters or fewer` }, { status: 400 });
  }
  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return NextResponse.json({ error: "dueDate must be in YYYY-MM-DD format" }, { status: 400 });
  }

  try {
    const result = await withUserContext(userId, async (client) => {
      const membership = await findActiveMembership(userId, client);
      if (!membership) return { noPartnership: true as const };
      const details = await findWeddingDetails(membership.partnership_id, client);
      if (!details) return { noWeddingDetails: true as const };

      const insertResult = await client.query(
        `insert into wedding_checklist_items (wedding_details_id, title, due_date)
         values ($1, $2, $3)
         returning id, title, due_date::text as due_date, is_complete`,
        [details.id, title, dueDate]
      );
      return { item: insertResult.rows[0] };
    });

    if (result.noPartnership) {
      return NextResponse.json({ error: "Set up a Partnership first." }, { status: 400 });
    }
    if (result.noWeddingDetails) {
      return NextResponse.json({ error: "Start Wedding Mode before adding a checklist." }, { status: 400 });
    }
    const item = result.item;
    return NextResponse.json({ id: item.id, title: item.title, dueDate: item.due_date, isComplete: item.is_complete });
  } catch (err) {
    console.error("POST /api/wedding/checklist failed", err);
    return NextResponse.json({ error: "Couldn't add that checklist item." }, { status: 500 });
  }
}
