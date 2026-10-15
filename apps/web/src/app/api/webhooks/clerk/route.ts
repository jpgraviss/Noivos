import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { deleteUserAccountData } from "@/lib/accountDeletion";

// Clerk → this app, the other direction a user's account can disappear:
// POST /api/account/delete (lib/accountDeletion.ts's other caller) covers
// a user asking Noivos itself to delete their account; this route covers
// the account vanishing from Clerk's side instead — deleted directly from
// Clerk's own dashboard, or (if Clerk's self-service Account Portal is ever
// enabled) by the user through Clerk's own UI rather than ours. Without
// this, that path left every one of this app's own database rows for that
// user orphaned indefinitely, with nothing ever telling this app the
// account was gone (SE-81).
//
// Not registered in Clerk's dashboard yet — adding the webhook endpoint
// there (Configure → Webhooks, subscribed to user.deleted) and setting
// CLERK_WEBHOOK_SECRET in Vercel's env vars is a founder action outside
// this repo, same posture as every other "code is real, a dashboard step
// activates it" integration in this app (Plaid, Stripe). Until that secret
// is set, this route can't verify a signature at all, so it says so rather
// than either trusting an unverified body or crashing.
function clerkWebhookConfigured(): boolean {
  return Boolean(process.env.CLERK_WEBHOOK_SECRET);
}

export async function POST(request: Request) {
  if (!clerkWebhookConfigured()) {
    return NextResponse.json({ error: "Clerk webhook isn't configured" }, { status: 503 });
  }

  const payload = await request.text();
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  let event: { type: string; data: { id?: string } };
  try {
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
    event = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as unknown as typeof event;
  } catch (err) {
    console.error("Clerk webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "user.deleted" && event.data.id) {
    try {
      await deleteUserAccountData(event.data.id);
    } catch (err) {
      // Clerk retries a non-2xx response, which is exactly right here —
      // this app's own data cleanup failing shouldn't be silently dropped.
      console.error("deleteUserAccountData failed from Clerk webhook", err);
      return NextResponse.json({ error: "Failed to process deletion" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
