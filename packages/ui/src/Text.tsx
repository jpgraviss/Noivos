import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { typography } from './tokens';
import { useTheme } from './ThemeProvider';

type Variant = keyof typeof typography;

export interface TextProps extends RNTextProps {
  variant?: Variant;
  color?: string;
  secondary?: boolean;
}

export function Text({ variant = 'body', color, secondary, style, ...rest }: TextProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? (secondary ? colors.textSecondary : colors.textPrimary);
  return (
    <RNText
      {...rest}
      style={[typography[variant], { color: resolvedColor }, style]}
    />
  );
}
