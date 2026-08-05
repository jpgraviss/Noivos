import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { withUserContext } from "@/lib/db";

function clerkConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

// Unlike Name & Birthdate, appearance mode is freely changeable any time —
// no lock, no admin approval, just a preference. Separate route from
// /api/profile so this one PATCH-like action can't accidentally touch the
// locked fields.
export async function POST(request: Request) {
  if (!clerkConfigured()) {
    return NextResponse.json({ error: "Clerk isn't configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { mode?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const mode = body.mode;
  if (mode !== "dark" && mode !== "light") {
    return NextResponse.json({ error: "mode must be 'dark' or 'light'" }, { status: 400 });
  }

  try {
    const saved = await withUserContext(userId, async (client) => {
      await client.query(`insert into users (id) values ($1) on conflict (id) do nothing`, [userId]);
      const result = await client.query(
        `update users set appearance_mode_preference = $2, updated_at = now()
         where id = $1
         returning appearance_mode_preference`,
        [userId, mode]
      );
      return result.rows[0];
    });
    return NextResponse.json({ appearanceMode: saved.appearance_mode_preference });
  } catch (err) {
    console.error("POST /api/profile/appearance failed", err);
    return NextResponse.json({ error: "Something went wrong saving that." }, { status: 500 });
  }
}
