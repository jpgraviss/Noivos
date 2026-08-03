import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme, palette } from '@noivos/ui';
import { HomeScreen } from '../screens/HomeScreen';
import { BudgetScreen } from '../screens/BudgetScreen';
import { GoalsScreen } from '../screens/GoalsScreen';
import { AICoachScreen } from '../screens/AICoachScreen';
import { MoreScreen } from '../screens/MoreScreen';
import { weddingDetails } from '../data/mockData';

const Tab = createBottomTabNavigator();

const ICONS: Record<string, string> = {
  Home: '🏠',
  Budget: '📊',
  Goals: '🎯',
  Wedding: '💍',
  'AI Coach': '✨',
  More: '⋯',
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
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>{ICONS[route.name]}</Text>,
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
