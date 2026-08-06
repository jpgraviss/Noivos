import React from 'react';
import type { ComponentType } from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { House, PieChart, Target, Sparkles, Ellipsis } from 'lucide-react-native';
import { useTheme, palette } from '@noivos/ui';
import { HomeScreen } from '../screens/HomeScreen';
import { BudgetScreen } from '../screens/BudgetScreen';
import { GoalsScreen } from '../screens/GoalsScreen';
import { AICoachScreen } from '../screens/AICoachScreen';
import { MoreScreen } from '../screens/MoreScreen';
import { weddingDetails } from '../data/mockData';

const Tab = createBottomTabNavigator();

// Same moodboard iconography as apps/web's AppShell.tsx (House/PieChart/
// Target/Sparkles/Ellipsis), added 2026-08-06 — the raw-emoji tab bar was a
// known, flagged gap since the 2026-08-05 icon audit ("apps/mobile's tab
// bar uses raw emoji, not lucide-react-native, not even installed there").
// Keyed by both possible Goals-tab labels since Tab.Screen's `name` below is
// the display label itself (unlike web's ICONS, which is keyed by a fixed
// tab identity separate from its label) — the icon stays Target either way,
// only the label swaps per the Wedding Mode relabel rule.
const ICONS: Record<string, ComponentType<{ size?: number; color?: string }>> = {
  Home: House,
  Budget: PieChart,
  Goals: Target,
  Wedding: Target,
  'AI Coach': Sparkles,
  More: Ellipsis,
};

export interface RootNavigatorProps {
  onSignOut?: () => void;
}

export function RootNavigator({ onSignOut }: RootNavigatorProps = {}) {
  const { colors, mode } = useTheme();
  const goalsTabLabel = weddingDetails.active ? 'Wedding' : 'Goals';

  const navTheme = {
    ...(mode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(mode === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      primary: colors.primary,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: palette.sourLime,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
          tabBarIcon: ({ color, size }) => {
            const IconCmp = ICONS[route.name];
            return <IconCmp size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Budget" component={BudgetScreen} />
        <Tab.Screen name={goalsTabLabel} component={GoalsScreen} />
        <Tab.Screen name="AI Coach" component={AICoachScreen} />
        <Tab.Screen name="More">{() => <MoreScreen onSignOut={onSignOut} />}</Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}
