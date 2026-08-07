import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Card, OwnershipBadge, ScreenContainer, StackedProgressBar, Text, useTheme, spacing, radius, palette } from '@noivos/ui';
import { currentUser, goals, weddingDetails } from '../data/mockData';

// Per docs/03 UX/UX-UI Blueprint.md §3.2: while Wedding Mode is active this
// tab relabels to "Wedding" and leads with the vendor tracker/countdown;
// standard goals live in a secondary segment within the same screen.
export function GoalsScreen() {
  const { colors } = useTheme();
  const [segment, setSegment] = useState<'wedding' | 'goals'>(weddingDetails.active ? 'wedding' : 'goals');

  return (
    <ScreenContainer>
      <Text variant="h1">{weddingDetails.active ? 'Wedding' : 'Goals'}</Text>

      {weddingDetails.active && (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {(['wedding', 'goals'] as const).map((s) => (
            <Pressable
              key={s}
              onPress={() => setSegment(s)}
              role="button"
              aria-pressed={segment === s}
              style={{
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.lg,
                borderRadius: radius.pill,
                backgroundColor: segment === s ? palette.sourLime : colors.surface,
                borderWidth: 1,
                borderColor: segment === s ? palette.sourLime : colors.border,
              }}
            >
              <Text variant="bodySmall" color={segment === s ? palette.licorice : colors.textPrimary} style={{ fontWeight: '600' }}>
                {s === 'wedding' ? 'Wedding' : 'All Goals'}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {segment === 'wedding' && weddingDetails.active ? (
        <>
          <Card glow={palette.sourPunch}>
            <Text variant="display" color={palette.sourPunch}>{weddingDetails.daysLeft}</Text>
            <Text variant="body" secondary>days until {weddingDetails.date}</Text>
            <Text variant="bodySmall" secondary style={{ marginTop: spacing.xs }}>~{weddingDetails.guestEstimate} guests</Text>
          </Card>

          <Card>
            <Text variant="h3" style={{ marginBottom: spacing.sm }}>Vendors</Text>
            {weddingDetails.vendors.map((v) => (
              <View key={v.name} style={{ marginBottom: spacing.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="body">{v.name}</Text>
                  <Text variant="bodySmall" secondary>${v.balanceDue} due {v.dueDate}</Text>
                </View>
                <Text variant="caption" color={palette.sourLime}>{v.status}</Text>
              </View>
            ))}
          </Card>

          <Card>
            <Text variant="h3" style={{ marginBottom: spacing.sm }}>Checklist</Text>
            {weddingDetails.checklist.map((item) => (
              <View key={item.title} style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs }}>
                <Text>{item.done ? '✅' : '⬜️'}</Text>
                <Text variant="body" secondary={item.done}>{item.title}</Text>
              </View>
            ))}
          </Card>
        </>
      ) : (
        goals.map((g) => {
          const total = g.contributors.reduce((s, c) => s + c.amount, 0);
          const pct = Math.round((total / g.target) * 100);
          return (
            <Card key={g.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="h3">{g.name}</Text>
                {/* Was hardcoded "Marcus" — see BudgetScreen.tsx's identical fix. */}
                <OwnershipBadge shared={g.shared} partnerName={currentUser.partnerName} />
              </View>
              <Text variant="bodySmall" secondary style={{ marginBottom: spacing.sm }}>
                ${total.toLocaleString()} of ${g.target.toLocaleString()} · {pct}%
              </Text>
              <StackedProgressBar contributors={g.contributors} target={g.target} />
              <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm, flexWrap: 'wrap' }}>
                {g.contributors.map((c) => (
                  <View key={c.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.color }} />
                    <Text variant="caption" secondary>{c.name} · ${c.amount.toLocaleString()}</Text>
                  </View>
                ))}
              </View>
            </Card>
          );
        })
      )}
    </ScreenContainer>
  );
}
