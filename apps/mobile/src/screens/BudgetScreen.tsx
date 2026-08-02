import React from 'react';
import { View } from 'react-native';
import { Card, OwnershipBadge, ScreenContainer, Text, useTheme, spacing, palette } from '@noivos/ui';
import { budgetSnapshot } from '../data/mockData';

export function BudgetScreen() {
  const { colors } = useTheme();

  return (
    <ScreenContainer>
      <Text variant="h1">Budget</Text>
      <Text variant="body" secondary>{budgetSnapshot.month} · zero-based</Text>

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
