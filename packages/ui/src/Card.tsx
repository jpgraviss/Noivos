import React from 'react';
import { Platform, View, ViewProps } from 'react-native';
import { useTheme } from './ThemeProvider';
import { radius, spacing } from './tokens';

export interface CardProps extends ViewProps {
  glow?: string; // an accent color for this card's border/shadow, per Design System §6
}

// Repainted 2026-08-05 (founder: "make it a closer look to Origin"): the
// original glow-based elevation used a wide, saturated color bloom around
// the whole card (0 0 12px at 0.35 alpha) — read as loud/neon rather than
// premium. Origin-style elevation is quiet: a thin border, tinted only
// slightly by the accent color, plus a soft, very low-opacity neutral
// shadow for depth (never colored). `glow` still exists as a prop so
// call sites don't need to change, but it now just tints the border a
// little and adds a faint matching shadow instead of a big glowing ring.
export function Card({ glow, style, children, ...rest }: CardProps) {
  const { colors } = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.large,
          borderWidth: 1,
          borderColor: glow ?? colors.border,
          padding: spacing.lg,
          ...(Platform.OS === 'web'
            ? { boxShadow: glow ? `0 1px 3px ${glow}26, 0 1px 2px rgba(0,0,0,0.18)` : '0 1px 2px rgba(0,0,0,0.18)' }
            : {
                shadowColor: glow ?? '#000',
                shadowOpacity: glow ? 0.12 : 0.16,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 1 },
              }),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
