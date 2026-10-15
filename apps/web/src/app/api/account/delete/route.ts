import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/clerk";
import { deleteUserAccountData } from "@/lib/accountDeletion";

// The "front door" to account deletion (SE-81) — the other direction is
// /api/webhooks/clerk's user.deleted handler, for when the account is
// removed from Clerk's side instead. Both call the same
// deleteUserAccountData(), so there's one deletion routine to get right.
//
// Requires a typed confirmation in the body, not just a POST with no
// payload — this is the single most destructive action a user can take in
// this app (see lib/accountDeletion.ts / migration 0018 for exactly what
// it removes), and a bare POST is too easy to fire accidentally from a
// retried request or a stray double-click with no client-side guard.
export async function POST(request: Request) {
  if (!clerkConfigured()) {
    return NextResponse.json({ error: "Clerk isn't configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { confirm?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (body.confirm !== "DELETE") {
    return NextResponse.json({ error: 'Type "DELETE" to confirm.' }, { status: 400 });
  }

  try {
    // Scrub this app's own data first. If Clerk's own deleteUser call below
    // then fails for any reason, the user's Noivos data is still gone —
    // the safer order, since the alternative (Clerk succeeds, our own
    // cleanup fails) is exactly the orphaned-rows problem this issue exists
    // to close.
    await deleteUserAccountData(userId);
  } catch (err) {
    console.error("POST /api/account/delete failed scrubbing app data", err);
    return NextResponse.json({ error: "Something went wrong deleting your data. Nothing was removed — try again." }, { status: 500 });
  }

  try {
    const client = await clerkClient();
    await client.users.deleteUser(userId);
  } catch (err) {
    // This app's own rows are already gone at this point — surfacing this
    // as a failure would be misleading (the thing the user actually cares
    // about, their data, is in fact deleted). Log it so it's not silently
    // lost: it means the Clerk identity itself still exists and the user
    // could theoretically sign back in to a now-empty account.
    console.error("Clerk deleteUser failed after app data was already deleted", err);
  }

  return NextResponse.json({ deleted: true });
}
