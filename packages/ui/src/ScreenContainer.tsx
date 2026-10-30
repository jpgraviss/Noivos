import React from 'react';
import { ScrollView, View, ViewProps } from 'react-native';
import { useTheme } from './ThemeProvider';
import { spacing } from './tokens';
import { GradientBackground } from './GradientBackground';

// GradientBackground sits behind the ScrollView rather than inside its
// content, so it reads as a fixed backdrop the page scrolls over — the
// ScrollView itself stays transparent (no backgroundColor) so the gradient
// shows through; the outer View's flat colors.background is just the
// light-mode/fallback color underneath it. Every screen in apps/mobile
// already renders through ScreenContainer, so this is the one place that
// brings all of them onto the same dark-mode vignette at once.
export function ScreenContainer({ style, children, ...rest }: ViewProps) {
  const { colors, mode } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {mode === 'dark' && <GradientBackground />}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl }}
      >
        <View {...rest} style={style}>
          {children}
        </View>
      </ScrollView>
    </View>
  );
}
