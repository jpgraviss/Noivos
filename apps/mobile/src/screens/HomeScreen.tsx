import React from 'react';
import { View } from 'react-native';
import { Card, ScreenContainer, Text, useTheme, spacing, palette } from '@noivos/ui';
import { budgetSnapshot, goals, activityFeed, insights, upcomingBills, moneyMeeting, currentUser } from '../data/mockData';

export function HomeScreen() {
  const { colors } = useTheme();
  const weddingGoal = goals[0];
  const weddingPercent = Math.round(
    (weddingGoal.contributors.reduce((s, c) => s + c.amount, 0) / weddingGoal.target) * 100
  );

  return (
    <ScreenContainer>
      <View>
        <Text variant="caption" secondary>Good afternoon</Text>
        <Text variant="display">Hey, {currentUser.name}</Text>
      </View>

      {/* Money Meeting ritual card — a distinct treatment, UX Blueprint §3.3 */}
      <Card glow={palette.grape}>
        <Text variant="caption" color={palette.grape}>WEEK OF {moneyMeeting.weekOf.toUpperCase()}</Text>
        <Text variant="h3" style={{ marginTop: spacing.xs }}>Your Money Meeting is ready</Text>
        <View style={{ marginTop: spacing.sm, gap: 4 }}>
          {moneyMeeting.topics.map((t, i) => (
            <Text key={i} variant="bodySmall" secondary>• {t}</Text>
          ))}
        </View>
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text variant="h3">{budgetSnapshot.month} Budget</Text>
          <Text variant="bodySmall" secondary>${budgetSnapshot.spent.toLocaleString()} of ${budgetSnapshot.planned.toLocaleString()}</Text>
        </View>
        <View style={{ height: 10, borderRadius: 999, backgroundColor: colors.border, marginTop: spacing.sm, overflow: 'hidden' }}>
          <View
            style={{
              height: '100%',
              width: `${Math.min((budgetSnapshot.spent / budgetSnapshot.planned) * 100, 100)}%`,
              backgroundColor: palette.sourLime,
            }}
          />
        </View>
      </Card>

      <Card glow={palette.sourLime}>
        <Text variant="h3">{weddingGoal.name}</Text>
        <Text variant="bodySmall" secondary style={{ marginTop: 2 }}>
          ${weddingGoal.contributors.reduce((s, c) => s + c.amount, 0).toLocaleString()} of ${weddingGoal.target.toLocaleString()} · {weddingPercent}%
        </Text>
      </Card>

      <Card>
        <Text variant="h3" style={{ marginBottom: spacing.sm }}>AI Insights</Text>
        <View style={{ gap: spacing.sm }}>
          {insights.map((i) => (
            <Text key={i.id} variant="body" secondary>💡 {i.text}</Text>
          ))}
        </View>
      </Card>

      <Card>
        <Text variant="h3" style={{ marginBottom: spacing.sm }}>Upcoming Bills</Text>
        {upcomingBills.map((b) => (
          <View key={b.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text variant="body">{b.name}</Text>
            <Text variant="body" secondary>${b.amount.toLocaleString()} · {b.due}</Text>
          </View>
        ))}
      </Card>

      <Card>
        <Text variant="h3" style={{ marginBottom: spacing.sm }}>Activity</Text>
        {activityFeed.map((a) => (
          <View key={a.id} style={{ marginBottom: spacing.xs }}>
            <Text variant="body">{a.text}</Text>
            <Text variant="caption" secondary>{a.time}</Text>
          </View>
        ))}
      </Card>
    </ScreenContainer>
  );
}
