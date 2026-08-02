import React from 'react';
import { View } from 'react-native';
import { useTheme } from './ThemeProvider';
import { Text } from './Text';
import { spacing, radius } from './tokens';

export interface OwnershipBadgeProps {
  shared: boolean;
  partnerName?: string;
}

// Ownership indicator per docs/03 UX/UX-UI Blueprint.md §4 — must be
// legible at a glance and carry a screen-reader label, never icon-only.
export function OwnershipBadge({ shared, partnerName }: OwnershipBadgeProps) {
  const { colors } = useTheme();
  const label = shared ? `Shared${partnerName ? ` with ${partnerName}` : ''}` : 'Personal';

  return (
    <View
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: spacing.xs,
        paddingVertical: 4,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.pill,
        backgroundColor: colors.border,
      }}
    >
      <Text variant="caption" secondary>
        {shared ? '👥' : '👤'}  {label}
      </Text>
    </View>
  );
}
