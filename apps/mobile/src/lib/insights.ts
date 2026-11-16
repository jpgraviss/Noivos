// Mirrors apps/web/src/lib/insights.ts's core rule-based "basic insights"
// logic (PRD §13's free tier), duplicated rather than shared so the two
// apps' insight text can never silently drift apart without a diff
// showing it, same convention as lib/date.ts. Not a byte-for-byte mirror:
// web's RecurringChangeFact ("a tracked recurring expense's amount just
// changed," SE-77) and NewRecurringCandidateFact ("new subscription
// detected," SE-78) both depend on the recurring_expenses feature, which
// was never ported to mobile — see the comment above buildInsights().
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

// SE-78 (PRD §12.11's trend-based AI Insights) — mirrors apps/web's
// lib/insights.ts for 3 of its 4 fact types. "New subscription detected"
// isn't mirrored here: it reuses apps/web's detectRecurringCandidates(),
// which depends on the whole recurring_expenses feature (SE-77) that was
// never ported to apps/mobile in the first place (no recurring-expenses
// screen, no POST /api/recurring-expenses caller) — porting that feature
// is its own, larger, not-yet-attempted lift, not something to fold into
// this pass. A documented gap, not a silently dropped one, same posture
// as the two challenge types challenges.ts's own comment flags as unbuilt.
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

export function computeSavingsStreak(monthlyTotals: number[]): number {
  let streak = 0;
  for (let i = monthlyTotals.length - 1; i >= 0; i--) {
    if (monthlyTotals[i] > 0) streak++;
    else break;
  }
  return streak;
}

export function buildInsights(
  categories: BudgetCategoryFact[],
  goals: GoalProgressFact[],
  categoryTrends: CategorySpendTrendFact[] = [],
  unusualPurchases: UnusualPurchaseFact[] = [],
  savingsStreakMonthlyTotals: number[] = []
): Insight[] {
  const items: Insight[] = [];

  for (const c of categories) {
    if (c.spent > c.planned) {
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
      const remaining = Math.round(g.targetAmount - g.totalContributed) || 1;
      items.push({
        id: `near-${g.id}`,
        text: `${g.name} is nearly fully funded — $${remaining.toLocaleString()} to go.`,
      });
    }
  }

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

  const streak = computeSavingsStreak(savingsStreakMonthlyTotals);
  if (streak >= 3) {
    items.push({
      id: 'savings-streak',
      text: `You've added to your goals for ${streak} months in a row — keep it going.`,
    });
  }

  if (items.length === 0) {
    items.push({ id: 'none', text: 'Nothing to flag this month — check back as you log more.' });
  }

  return items;
}
