import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/clerk";
import { withUserContext } from "@/lib/db";
import { detectRecurringCandidates } from "@/lib/recurringExpenses";
import { computeCategorySpendTrendFacts, computeUnusualPurchaseFacts, computeMonthlyGoalContributionTotals } from "@/lib/trendInsights";

// SE-78's three new trend-based fact sources (category spend trend,
// unusual purchase, savings streak) — bundled into one route since all
// three are read-only, computed-fresh-every-load facts feeding
// lib/insights.ts's buildInsights(), same "always requery, nothing
// cached" posture as GET /api/budget and GET /api/recurring-expenses.
// "New subscription detected" isn't duplicated here — it reuses
// detectRecurringCandidates(), the same function GET /api/recurring-
// expenses already calls, so HomeScreen doesn't have to fetch two routes
// for one fact type.
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
      const categoryTrends = await computeCategorySpendTrendFacts(client);
      const unusualPurchases = await computeUnusualPurchaseFacts(client);
      const newRecurringCandidates = await detectRecurringCandidates(client);
      const savingsStreakMonthlyTotals = await computeMonthlyGoalContributionTotals(client);
      return {
        categoryTrends,
        unusualPurchases,
        newRecurringCandidates: newRecurringCandidates.map((c) => ({
          merchantName: c.merchantName,
          avgAmount: c.avgAmount,
          frequency: c.frequency,
        })),
        savingsStreakMonthlyTotals,
      };
    });
    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/insights/trends failed", err);
    return NextResponse.json({ error: "Couldn't load trend insights." }, { status: 500 });
  }
}
