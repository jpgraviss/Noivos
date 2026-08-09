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
export function buildInsights(categories: BudgetCategoryFact[], goals: GoalProgressFact[]): Insight[] {
  const items: Insight[] = [];

  for (const c of categories) {
    if (c.spent > c.planned) {
      const over = Math.round(c.spent - c.planned);
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
      const remaining = Math.round(g.targetAmount - g.totalContributed);
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
