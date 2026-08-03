import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@noivos/ui';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AuthenticatedRoot } from './src/navigation/AuthenticatedRoot';
import { useAppFonts } from './src/hooks/useAppFonts';
import { ClerkAuthProvider, isClerkConfigured } from './src/auth/ClerkAuthProvider';
import { AuthGate } from './src/auth/AuthGate';

export default function App() {
  const fontsLoaded = useAppFonts();

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider initialMode="dark">
          <ClerkAuthProvider>
            {isClerkConfigured ? (
              <AuthGate>
                <AuthenticatedRoot />
              </AuthGate>
            ) : (
              <RootNavigator />
            )}
          </ClerkAuthProvider>
          <StatusBar style="light" />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
