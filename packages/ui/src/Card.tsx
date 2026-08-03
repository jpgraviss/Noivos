import React from 'react';
import { Platform, View, ViewProps } from 'react-native';
import { useTheme } from './ThemeProvider';
import { radius, spacing } from './tokens';

export interface CardProps extends ViewProps {
  glow?: string; // an accent color to tint the elevation glow, per Design System §6
}

// Glow-based elevation (Design System §6) instead of a traditional drop
// shadow, since flat shadows read poorly on the Licorice dark background.
// react-native-web deprecates the shadow* props in favor of the CSS
// `boxShadow` style prop, so web gets its own branch here; native (iOS/
// Android) keeps the standard shadow* props, which react-native-web doesn't
// touch.
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
            ? Platform.OS === 'web'
              ? { boxShadow: `0 0 12px ${glow}59` } // '59' hex ≈ 0.35 alpha
              : {
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
