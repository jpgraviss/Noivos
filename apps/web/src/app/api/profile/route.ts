import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { withUserContext } from "@/lib/db";

// Same fallback posture as the rest of the app: if Clerk isn't configured
// (no ClerkProvider/clerkMiddleware running at all — see proxy.ts), there's
// no authenticated user to attach data to, so these routes fail clearly
// rather than crashing on a missing auth context.
function clerkConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

export async function GET() {
  if (!clerkConfigured()) {
    return NextResponse.json({ error: "Clerk isn't configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const profile = await withUserContext(userId, async (client) => {
      // First login for this user — create their row. Satisfies the
      // users_insert_self RLS policy (id = current_user_id()).
      await client.query(`insert into users (id) values ($1) on conflict (id) do nothing`, [userId]);
      const result = await client.query(
        `select display_name, birthdate::text, appearance_mode_preference from users where id = $1`,
        [userId]
      );
      const row = result.rows[0];
      return {
        name: row?.display_name ?? null,
        birthdate: row?.birthdate ?? null,
        appearanceMode: row?.appearance_mode_preference ?? "dark",
      };
    });
    return NextResponse.json(profile);
  } catch (err) {
    console.error("GET /api/profile failed", err);
    return NextResponse.json({ error: "Something went wrong loading your profile." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!clerkConfigured()) {
    return NextResponse.json({ error: "Clerk isn't configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { name?: unknown; birthdate?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const birthdate = typeof body.birthdate === "string" ? body.birthdate.trim() : "";
  if (!name || !birthdate) {
    return NextResponse.json({ error: "Name and birthdate are both required" }, { status: 400 });
  }
  // The client sends this from a native <input type="date">, but a
  // client-supplied string is never trusted blindly before it reaches a
  // SQL date column.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) {
    return NextResponse.json({ error: "Birthdate must be in YYYY-MM-DD format" }, { status: 400 });
  }

  try {
    const saved = await withUserContext(userId, async (client) => {
      await client.query(`insert into users (id) values ($1) on conflict (id) do nothing`, [userId]);
      // The one-time lock is enforced HERE, server-side — a disabled input
      // in the UI is a courtesy, not a guarantee; this WHERE clause is the
      // real guarantee. Only ever sets these when both are still unset.
      const result = await client.query(
        `update users
         set display_name = $2, birthdate = $3, updated_at = now()
         where id = $1 and display_name is null and birthdate is null
         returning display_name, birthdate::text`,
        [userId, name, birthdate]
      );
      return result.rows[0] ?? null;
    });

    if (!saved) {
      return NextResponse.json(
        { error: "Name and birthdate are already set and can't be changed here." },
        { status: 409 }
      );
    }
    return NextResponse.json({ name: saved.display_name, birthdate: saved.birthdate });
  } catch (err) {
    console.error("POST /api/profile failed", err);
    return NextResponse.json({ error: "Something went wrong saving your profile." }, { status: 500 });
  }
}
