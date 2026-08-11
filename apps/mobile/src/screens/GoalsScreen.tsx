import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Circle, CircleCheck } from 'lucide-react-native';
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
            {/* Computed from weddingDetails.date rather than a stored
                daysLeft literal (found 2026-08-11: the two had drifted
                9 days out of sync, and would keep drifting further every
                day this mock content stays deployed). */}
            <Text variant="display" color={palette.sourPunch}>{Math.ceil((new Date(weddingDetails.date).getTime() - Date.now()) / 86400000)}</Text>
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
              <View key={item.title} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
                {/* A real lucide icon, not a raw emoji — this row is plain
                    mock display (no Pressable/role="checkbox" the way web's
                    real-data checklist has, see GoalsScreen.tsx there), so
                    this icon is the *only* place done/not-done state is
                    conveyed and is deliberately left without aria-hidden,
                    same reasoning as web's mock-fallback checklist. Emoji
                    render inconsistently across platforms/OS versions and
                    get announced by screen readers as whatever Unicode name
                    happens to map to them ("check mark button", "white
                    large square button") — not a controlled accessible
                    name — where every other checked/unchecked indicator in
                    this app (web's GoalsScreen, mobile's MoreScreen) already
                    uses these same two lucide icons. Found 2026-08-07 during
                    a sweep for files this session's lucide-react-native
                    audit had missed because this one didn't import it yet. */}
                {item.done ? <CircleCheck size={18} color={palette.sourLime} /> : <Circle size={18} color={colors.textSecondary} />}
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
