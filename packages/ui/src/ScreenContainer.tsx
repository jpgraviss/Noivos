import React from 'react';
import { ScrollView, View, ViewProps } from 'react-native';
import { useTheme } from './ThemeProvider';
import { spacing } from './tokens';

export function ScreenContainer({ style, children, ...rest }: ViewProps) {
  const { colors } = useTheme();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl }}
    >
      <View {...rest} style={style}>
        {children}
      </View>
    </ScrollView>
  );
}
