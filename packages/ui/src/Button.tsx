import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from './ThemeProvider';
import { getTextColorFor, radius, spacing } from './tokens';
import { Text } from './Text';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'tertiary';
  disabled?: boolean;
  style?: ViewStyle;
}

// Pill-shaped buttons per Brand Guidelines/Design System — text-on-color
// always resolved via getTextColorFor, never chosen ad hoc.
export function Button({ label, onPress, variant = 'primary', disabled, style }: ButtonProps) {
  const { colors } = useTheme();

  const background =
    variant === 'primary' ? colors.primary : variant === 'secondary' ? colors.secondary : 'transparent';
  const textColor =
    variant === 'tertiary' ? colors.textPrimary : getTextColorFor(background);
  const borderColor = variant === 'tertiary' ? colors.border : 'transparent';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      role="button"
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: background,
          borderColor,
          borderWidth: variant === 'tertiary' ? 1 : 0,
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <Text variant="bodyLarge" color={textColor} style={{ fontWeight: '600' }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
