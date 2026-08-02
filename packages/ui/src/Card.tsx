import React from 'react';
import { View, ViewProps } from 'react-native';
import { useTheme } from './ThemeProvider';
import { radius, spacing } from './tokens';

export interface CardProps extends ViewProps {
  glow?: string; // an accent color to tint the elevation glow, per Design System §6
}

// Glow-based elevation (Design System §6) instead of a traditional drop
// shadow, since flat shadows read poorly on the Licorice dark background.
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
          ...(glow
            ? {
                shadowColor: glow,
                shadowOpacity: 0.35,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 0 },
              }
            : null),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
