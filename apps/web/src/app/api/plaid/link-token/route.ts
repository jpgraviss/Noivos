import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/clerk";
import { getPlaidClient, plaidConfigured, Products, CountryCode } from "@/lib/plaid";

// First step of Plaid Link (PRD §12.4): the client needs a short-lived
// Link token before it can open Plaid's own connect-a-bank modal
// (react-plaid-link's usePlaidLink hook, wired in MoreScreen.tsx's new
// LinkedAccounts component). No request body — this is scoped entirely
// to the signed-in user via Clerk's own userId, matching every other
// route in this app.
export async function POST() {
  if (!clerkConfigured()) {
    return NextResponse.json({ error: "Clerk isn't configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!plaidConfigured()) {
    return NextResponse.json({ error: "Bank connections aren't configured yet" }, { status: 503 });
  }

  try {
    const client = getPlaidClient();
    const response = await client.linkTokenCreate({
      client_name: "Noivos",
      language: "en",
      country_codes: [CountryCode.Us],
      user: { client_user_id: userId },
      // Transactions only — Auth/Identity/Investments aren't built product
      // surfaces here yet (no ACH transfer flow, no identity-verification
      // flow beyond IdentitySettings.tsx's own separate manual entry).
      products: [Products.Transactions],
    });
    return NextResponse.json({ linkToken: response.data.link_token });
  } catch (err) {
    console.error("POST /api/plaid/link-token failed", err);
    return NextResponse.json({ error: "Couldn't start the bank connection." }, { status: 500 });
  }
}
