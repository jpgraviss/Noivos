import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/clerk";
import { withUserContext } from "@/lib/db";
import { tooLong, isPlausibleBirthdate, MAX_NAME_LENGTH } from "@/lib/validate";

// Same fallback posture as the rest of the app: if Clerk isn't configured
// (no ClerkProvider/clerkMiddleware running at all — see proxy.ts), there's
// no authenticated user to attach data to, so these routes fail clearly
// rather than crashing on a missing auth context.
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
  if (tooLong(name, MAX_NAME_LENGTH)) {
    return NextResponse.json({ error: `Name must be ${MAX_NAME_LENGTH} characters or fewer` }, { status: 400 });
  }
  // The client sends this from a native <input type="date">, but a
  // client-supplied string is never trusted blindly before it reaches a
  // SQL date column. Was format-only (`/^\d{4}-\d{2}-\d{2}$/`), which let a
  // format-valid but nonsensical value like "2026-13-45" through to a raw
  // Postgres cast error — and, unlike other date fields in this app,
  // birthdate is used for real identity verification and locked once set
  // (see the comment on this route's own POST/GET pair and
  // IdentitySettings.tsx), so it's also checked for basic plausibility
  // (not in the future, not before 1900) — a sanity bound, not a
  // minimum-age policy (see isPlausibleBirthdate's own comment).
  if (!isPlausibleBirthdate(birthdate)) {
    return NextResponse.json({ error: "Enter a real birthdate" }, { status: 400 });
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
