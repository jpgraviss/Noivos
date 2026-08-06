import React from 'react';
import { View } from 'react-native';
import { useTheme } from './ThemeProvider';
import { radius } from './tokens';
import { computeSegmentWidths } from './stackedProgressBarMath';

export { computeSegmentWidths } from './stackedProgressBarMath';

export interface Contributor {
  name: string;
  amount: number;
  color: string;
}

export interface StackedProgressBarProps {
  contributors: Contributor[];
  target: number;
  height?: number;
}

// Per-partner-attributed progress, never a single anonymous percentage —
// docs/03 UX/UX-UI Blueprint.md §7 edge case (unequal contributions must
// never read as a value judgment).
export function StackedProgressBar({ contributors, target, height = 12 }: StackedProgressBarProps) {
  const { colors } = useTheme();
  const widths = computeSegmentWidths(contributors, target);

  return (
    <View
      style={{
        height,
        borderRadius: radius.pill,
        overflow: 'hidden',
        flexDirection: 'row',
        backgroundColor: colors.border,
      }}
    >
      {contributors.map((c, i) => (
        <View
          key={c.name}
          accessibilityLabel={`${c.name} contributed $${c.amount.toLocaleString()}`}
          style={{
            width: `${widths[i]}%`,
            backgroundColor: c.color,
          }}
        />
      ))}
    </View>
  );
}
