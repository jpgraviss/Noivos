import React, { useState } from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { Card, ScreenContainer, Text, useTheme, spacing, radius, palette, getTextColorFor } from '@noivos/ui';
import { aiConversation } from '../data/mockData';

export function AICoachScreen() {
  const { colors } = useTheme();
  const [draft, setDraft] = useState('');

  return (
    <ScreenContainer>
      <Text variant="h1">AI Coach</Text>
      <Text variant="body" secondary>Ask anything — no judgment, just clarity.</Text>

      {aiConversation.map((m, i) => (
        <Card
          key={i}
          style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '90%',
            backgroundColor: m.role === 'user' ? palette.grape : colors.surface,
            borderColor: m.role === 'user' ? palette.grape : colors.border,
          }}
        >
          <Text variant="body" color={m.role === 'user' ? getTextColorFor(palette.grape) : colors.textPrimary}>
            {m.text}
          </Text>
        </Card>
      ))}

      <Card>
        <Text variant="caption" secondary>SHARE WITH MARCUS</Text>
        <Pressable
          style={{
            marginTop: spacing.sm,
            paddingVertical: spacing.sm,
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
          }}
        >
          <Text variant="bodySmall" style={{ fontWeight: '600' }}>💬  Share this conversation to Activity</Text>
        </Pressable>
      </Card>

      <View
        style={{
          flexDirection: 'row',
          gap: spacing.sm,
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
        }}
      >
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Can we afford..."
          placeholderTextColor={colors.textSecondary}
          style={{ flex: 1, color: colors.textPrimary, fontSize: 15 }}
        />
        <Text>🎤</Text>
        <Text>📷</Text>
      </View>
    </ScreenContainer>
  );
}
