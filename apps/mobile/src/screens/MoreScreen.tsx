import React from 'react';
import { View, Pressable } from 'react-native';
import { Card, ScreenContainer, Text, useTheme, spacing } from '@noivos/ui';
import { currentUser } from '../data/mockData';

const sections: { title: string; items: string[] }[] = [
  { title: 'Partnership', items: [`You & ${currentUser.partnerName}`, 'Invite settings', 'Disconnect Partnership'] },
  { title: 'Community', items: ['Challenges', 'Milestones shared'] },
  { title: 'Account', items: ['Appearance', 'Notifications', 'Subscription', 'Support'] },
];

export interface MoreScreenProps {
  onSignOut?: () => void;
}

export function MoreScreen({ onSignOut }: MoreScreenProps = {}) {
  const { colors, mode, setMode } = useTheme();

  return (
    <ScreenContainer>
      <Text variant="h1">More</Text>

      <Card>
        <Text variant="h3">Appearance</Text>
        <Text variant="bodySmall" secondary style={{ marginBottom: spacing.sm }}>
          Dark is Noivos' default look — light mode is available too.
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {/* A Pressable, not a Text with onPress — on the web export
              target (react-native-web), Text's onPress only attaches an
              onClick handler with no role/tabIndex/keyboard handling, so
              this was unreachable by keyboard/screen reader there (found
              during the 2026-08-06 accessibility pass, matching the same
              fix in apps/web's MoreScreen.tsx). */}
          {(['dark', 'light'] as const).map((m) => (
            <Pressable key={m} onPress={() => setMode(m)} role="button" aria-pressed={mode === m}>
              <Text
                variant="bodySmall"
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 999,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: mode === m ? colors.primary : 'transparent',
                  color: mode === m ? colors.background : colors.textPrimary,
                  fontWeight: '600',
                }}
              >
                {m === 'dark' ? 'Dark' : 'Light'}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      {sections.map((section) => (
        <Card key={section.title}>
          <Text variant="h3" style={{ marginBottom: spacing.sm }}>{section.title}</Text>
          {section.items.map((item) => (
            <Text key={item} variant="body" secondary style={{ marginBottom: spacing.sm }}>
              {item}
            </Text>
          ))}
        </Card>
      ))}

      {onSignOut && (
        <Card>
          <Pressable onPress={onSignOut} role="button">
            <Text variant="body" style={{ fontWeight: '600' }}>
              Sign Out
            </Text>
          </Pressable>
        </Card>
      )}
    </ScreenContainer>
  );
}
