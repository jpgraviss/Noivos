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

// Rule-based "basic insights" — PRD §13's free tier includes "basic
// insights," distinct from Premium's "advanced AI Insights (predictive,
// trend-based)," which needs an actual model call and is gated on the AI
// Coach provider decision (see PROJECT_MEMORY.md). Same posture as
// lib/moneyMeeting.ts's buildAgenda(): plain rule-based checks against real
// data, not an AI call, so this doesn't need that decision to ship.
//
// Deliberately scoped to facts derivable from a single snapshot of this
// month's budget categories + current goal totals — no historical
// time-series exists yet (no daily balance snapshots, no recurring_expenses
// wiring), so anything from PRD §12.11's full example list that needs a
// trend ("rising dining spend," "savings streak") or a statistical
// baseline ("large/unusual purchase," "new subscription detected") isn't
// attempted here; only "budget category drift" (over-planned spending) and
// "opportunity" (a goal at/near full funding) are safely computable
// without inventing unsupported math. Phrased as neutral observations, not
// alarms, per §12.11's tone requirement — no red/warning language, no
// verdicts.
// recurringChanges defaults to [] rather than being required — every
// existing call site (and every existing test) predates PRD §12.5's
// recurring-expense amount-change case (SE-77), so this stays additive
// instead of forcing every caller to pass something.
export function buildInsights(
  categories: BudgetCategoryFact[],
  goals: GoalProgressFact[],
  recurringChanges: RecurringChangeFact[] = []
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

  if (items.length === 0) {
    items.push({ id: "none", text: "Nothing to flag this month — check back as you log more." });
  }

  return items;
}
