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
// premium. Origin-style elevation went quiet: a thin border tinted only
// slightly by the accent color, plus a faint neutral shadow.
//
// Repainted again the same day ("merge the brands... need the colors to
// be more fun") to bring a touch of that glow energy back now that the
// accent colors themselves are vivid again — a genuine soft glow (0 0 8px
// at ~0.25 alpha), not just a tinted border, but still well short of the
// original's wide 0.35-alpha/12px bloom. `glow` still exists as a prop so
// call sites don't need to change.
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
            ? { boxShadow: glow ? `0 0 8px ${glow}40, 0 1px 2px rgba(0,0,0,0.18)` : '0 1px 2px rgba(0,0,0,0.18)' }
            : {
                shadowColor: glow ?? '#000',
                shadowOpacity: glow ? 0.22 : 0.16,
                shadowRadius: glow ? 8 : 4,
                shadowOffset: { width: 0, height: glow ? 0 : 1 },
              }),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
