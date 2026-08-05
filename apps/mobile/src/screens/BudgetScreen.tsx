import React from 'react';
import { View } from 'react-native';
import { Card, OwnershipBadge, StackedProgressBar, ScreenContainer, Text, useTheme, spacing, palette } from '@noivos/ui';
import { budgetSnapshot } from '../data/mockData';

// Same dedicated, validated categorical set as apps/web's BudgetScreen.tsx
// (2026-08-05) — do not swap in packages/ui's UI-accent palette tokens here;
// they fail the dataviz skill's categorical-chart validator (too
// desaturated/narrow a lightness range for a chart mark). Derived and
// validated via scripts/validate_palette.js against this app's actual card
// surfaces; order is fixed and load-bearing.
const BUDGET_CATEGORY_COLORS = ['#C36E42', '#3D71AC', '#2F8F6C', '#B08A28', '#8A5FB0'];

export function BudgetScreen() {
  const { colors } = useTheme();

  const categoryBreakdown = budgetSnapshot.categories.map((c, i) => ({
    name: c.name,
    amount: c.spent,
    color: BUDGET_CATEGORY_COLORS[i % BUDGET_CATEGORY_COLORS.length],
  }));
  const totalCategorySpend = categoryBreakdown.reduce((sum, c) => sum + c.amount, 0);

  return (
    <ScreenContainer>
      <Text variant="h1">Budget</Text>
      <Text variant="body" secondary>{budgetSnapshot.month} · zero-based</Text>

      {totalCategorySpend > 0 && (
        <Card>
          <Text variant="h3" style={{ marginBottom: spacing.md }}>Spending by category</Text>
          <StackedProgressBar contributors={categoryBreakdown} target={totalCategorySpend} height={14} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md }}>
            {categoryBreakdown.map((c) => (
              <View key={c.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: c.color }} />
                <Text variant="bodySmall" secondary>{c.name} · ${c.amount.toLocaleString()}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {budgetSnapshot.categories.map((c) => {
        const over = c.spent > c.planned;
        const pct = Math.min((c.spent / c.planned) * 100, 100);
        return (
          <Card key={c.name}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="h3">{c.name}</Text>
              <OwnershipBadge shared={c.shared} partnerName="Marcus" />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs }}>
              <Text variant="bodySmall" secondary>${c.spent} spent</Text>
              <Text variant="bodySmall" color={over ? palette.citrus : colors.textSecondary}>
                {over ? `$${c.spent - c.planned} over` : `$${c.planned - c.spent} left`}
              </Text>
            </View>
            <View style={{ height: 8, borderRadius: 999, backgroundColor: colors.border, marginTop: spacing.sm, overflow: 'hidden' }}>
              <View
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  backgroundColor: over ? palette.citrus : palette.sourLime,
                }}
              />
            </View>
          </Card>
        );
      })}
    </ScreenContainer>
  );
}
