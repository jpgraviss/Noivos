export interface BudgetCategoryFact {
  id: string;
  name: string;
  planned: number;
  spent: number;
}

export interface GoalProgressFact {
  id: string;
  name: string;
  targetAmount: number;
  totalContributed: number;
}

export interface Insight {
  id: string;
  text: string;
}

export interface RecurringChangeFact {
  merchantName: string;
  oldAmount: number;
  newAmount: number;
}

// SE-78's four fact types — see lib/trendInsights.ts's own header comment
// for why none of these needed the daily-balance-snapshot infra the issue
// originally assumed.
export interface CategorySpendTrendFact {
  categoryId: string;
  categoryName: string;
  monthToDateSpent: number;
  trailingAverageMonthToDate: number;
  trailingMonthsWithData: number;
}

export interface UnusualPurchaseFact {
  merchantName: string | null;
  categoryName: string;
  amount: number;
  typicalAmount: number;
}

export interface NewRecurringCandidateFact {
  merchantName: string;
  avgAmount: number;
  frequency: string;
}

// Counts the trailing run of strictly-positive months from the end of a
// chronologically-ordered (oldest-to-newest) array — e.g. [0, 50, 80, 120]
// -> 3, [50, 0, 80, 120] -> 2 (the streak only extends back to the most
// recent zero, not through it). Exported standalone so it's directly
// unit-testable without needing a full Insight[] round trip.
export function computeSavingsStreak(monthlyTotals: number[]): number {
  let streak = 0;
  for (let i = monthlyTotals.length - 1; i >= 0; i--) {
    if (monthlyTotals[i] > 0) streak++;
    else break;
  }
  return streak;
}

// Rule-based "basic insights" — PRD §13's free tier includes "basic
// insights," distinct from Premium's "advanced AI Insights (predictive,
// trend-based)," which needs an actual model call and is gated on the AI
// Coach provider decision (see PROJECT_MEMORY.md). Same posture as
// lib/moneyMeeting.ts's buildAgenda(): plain rule-based checks against real
// data, not an AI call, so this doesn't need that decision to ship.
//
// Originally scoped to a single snapshot of this month's budget categories
// + current goal totals only — "budget category drift" and "a goal at/near
// full funding," the two facts safely computable without any historical
// time-series. SE-78 (2026-11-06) added the four trend-based examples from
// PRD §12.11's full list (rising category spend, new subscription
// detected, savings streak, large/unusual purchase): all turned out to be
// computable from transaction/recurring-expense/goal-contribution history
// that already accumulates with real usage — see lib/trendInsights.ts's
// header comment for why none of these needed the daily-balance-snapshot
// infra PRD §12.11 originally seemed to require, and still no AI Coach
// provider decision needed, same rule-based posture as everything else
// here. Every insight stays phrased as a neutral observation, not an
// alarm, per §12.11's tone requirement — no red/warning language, no
// verdicts.
// recurringChanges defaults to [] rather than being required — every
// existing call site (and every existing test) predates PRD §12.5's
// recurring-expense amount-change case (SE-77), so this stays additive
// instead of forcing every caller to pass something.
export function buildInsights(
  categories: BudgetCategoryFact[],
  goals: GoalProgressFact[],
  recurringChanges: RecurringChangeFact[] = [],
  categoryTrends: CategorySpendTrendFact[] = [],
  unusualPurchases: UnusualPurchaseFact[] = [],
  newRecurringCandidates: NewRecurringCandidateFact[] = [],
  savingsStreakMonthlyTotals: number[] = []
): Insight[] {
  const items: Insight[] = [];

  // PRD §12.5's own edge case: "a recurring expense whose amount
  // changes... should surface as an AI Insight, not just silently
  // update." Neutral framing, no up/down judgment language, matching
  // every other insight's tone requirement (§12.11) — a price change is a
  // fact worth noticing, not a verdict on whether it's good or bad.
  for (const change of recurringChanges) {
    items.push({
      id: `recurring-${change.merchantName}`,
      text: `${change.merchantName} changed from $${change.oldAmount.toLocaleString()} to $${change.newAmount.toLocaleString()} — worth a look?`,
    });
  }

  for (const c of categories) {
    if (c.spent > c.planned) {
      // `|| 1`, not a bare Math.round (found 2026-08-13, same fix as
      // lib/moneyMeeting.ts's identical pattern): the guard above already
      // proves this is strictly > 0, but a sub-$0.50 overage rounds to $0,
      // printing the self-contradicting "running $0 over plan." `|| 1`
      // only intervenes in that specific case — ordinary overages still
      // round to the nearest dollar as before.
      const over = Math.round(c.spent - c.planned) || 1;
      items.push({
        id: `over-${c.id}`,
        text: `${c.name} is running $${over.toLocaleString()} over plan this month — worth a look?`,
      });
    }
  }

  for (const g of goals) {
    if (g.targetAmount <= 0) continue;
    const pct = g.totalContributed / g.targetAmount;
    if (pct >= 1) {
      items.push({ id: `funded-${g.id}`, text: `${g.name} is fully funded — nice work!` });
    } else if (pct >= 0.95) {
      // `|| 1`, not a bare Math.round: this branch only runs when pct < 1
      // (the `>= 1` branch above already claims "fully funded" and returns
      // first), so remaining is always strictly > 0 — but a sub-$0.50
      // shortfall rounds to $0, printing "nearly fully funded — $0 to go,"
      // asserting nothing's left while not saying it's funded. `|| 1` only
      // intervenes in that specific case.
      const remaining = Math.round(g.targetAmount - g.totalContributed) || 1;
      items.push({
        id: `near-${g.id}`,
        text: `${g.name} is nearly fully funded — $${remaining.toLocaleString()} to go.`,
      });
    }
  }

  // "Rising category spend" — >= 25% above its own trailing pace AND at
  // least $20 above it. Both conditions matter: a tiny category (e.g. $8
  // avg) can clear 25% on a single extra coffee, and a huge category
  // (e.g. $2,000 avg) can clear $20 while barely moving percentage-wise.
  // Requires >= 2 trailing months of data in that category — see
  // trendInsights.ts's own comment on why 1 prior month isn't a trend.
  for (const trend of categoryTrends) {
    if (trend.trailingMonthsWithData < 2) continue;
    if (trend.trailingAverageMonthToDate <= 0) continue;
    const delta = trend.monthToDateSpent - trend.trailingAverageMonthToDate;
    if (trend.monthToDateSpent >= trend.trailingAverageMonthToDate * 1.25 && delta >= 20) {
      const roundedDelta = Math.round(delta) || 1;
      items.push({
        id: `trend-${trend.categoryId}`,
        text: `${trend.categoryName} is running about $${roundedDelta.toLocaleString()} above its usual pace this month — worth a look?`,
      });
    }
  }

  // "Large/unusual purchase" — >= 2x the category's own trailing-average
  // transaction size AND at least $50 above it (same "ratio alone isn't
  // enough" reasoning as the trend check above).
  for (const purchase of unusualPurchases) {
    if (purchase.typicalAmount <= 0) continue;
    const delta = purchase.amount - purchase.typicalAmount;
    if (purchase.amount >= purchase.typicalAmount * 2 && delta >= 50) {
      const merchant = purchase.merchantName ?? purchase.categoryName;
      items.push({
        id: `unusual-${purchase.categoryName}-${merchant}-${purchase.amount}`,
        text: `A $${Math.round(purchase.amount).toLocaleString()} ${merchant} charge is notably larger than your usual ${purchase.categoryName} spend (~$${Math.round(purchase.typicalAmount).toLocaleString()} typical) — worth a look?`,
      });
    }
  }

  // "New subscription detected" — reuses recurringExpenses.ts's existing
  // detectRecurringCandidates() (a merchant recurring >= 2 times at a
  // consistent interval, not yet confirmed as a tracked recurring
  // expense); every candidate is itself already a meaningful signal, no
  // further magnitude threshold needed.
  for (const candidate of newRecurringCandidates) {
    items.push({
      id: `new-recurring-${candidate.merchantName}`,
      text: `Looks like a new recurring charge: ${candidate.merchantName} (~$${Math.round(candidate.avgAmount).toLocaleString()}/${candidate.frequency}) — worth tracking as a recurring expense?`,
    });
  }

  // "Savings streak" — >= 3 consecutive completed months with a
  // goal contribution; 1-2 months reads as routine, not yet a "streak."
  const streak = computeSavingsStreak(savingsStreakMonthlyTotals);
  if (streak >= 3) {
    items.push({
      id: "savings-streak",
      text: `You've added to your goals for ${streak} months in a row — keep it going.`,
    });
  }

  if (items.length === 0) {
    items.push({ id: "none", text: "Nothing to flag this month — check back as you log more." });
  }

  return items;
}
