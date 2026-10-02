// Mirrors apps/web/src/lib/insights.ts exactly — same pure rule-based
// "basic insights" logic (PRD §13's free tier), duplicated rather than
// shared so the two apps' insight text can never silently drift apart
// without a diff showing it, same convention as lib/date.ts.
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

export function buildInsights(categories: BudgetCategoryFact[], goals: GoalProgressFact[]): Insight[] {
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

  if (items.length === 0) {
    items.push({ id: 'none', text: 'Nothing to flag this month — check back as you log more.' });
  }

  return items;
}
