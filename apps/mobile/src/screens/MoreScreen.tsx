import React from 'react';
import { View } from 'react-native';
import { Card, ScreenContainer, Text, useTheme, spacing } from '@noivos/ui';
import { currentUser } from '../data/mockData';

const sections: { title: string; items: string[] }[] = [
  { title: 'Partnership', items: [`You & ${currentUser.partnerName}`, 'Invite settings', 'Disconnect Partnership'] },
  { title: 'Community', items: ['Challenges', 'Milestones shared'] },
  { title: 'Account', items: ['Appearance', 'Notifications', 'Subscription', 'Support'] },
];

export function MoreScreen() {
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
          {(['dark', 'light'] as const).map((m) => (
            <Text
              key={m}
              onPress={() => setMode(m)}
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
    </ScreenContainer>
  );
}
