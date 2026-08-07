import React, { useState } from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { Mic, Camera, Send } from 'lucide-react-native';
import { Card, ScreenContainer, Text, useTheme, spacing, radius, palette, getTextColorFor } from '@noivos/ui';
import { aiConversation, currentUser } from '../data/mockData';

// Brought to real parity with apps/web's AICoachScreen.tsx (2026-08-06,
// found during an accessibility pass) — this screen previously had no way
// to actually send a message at all: `draft` state existed but nothing
// ever read it, and the mic/camera "buttons" were plain <Text> emoji, not
// even Pressables, so there was no interactive control there for a screen
// reader (or anyone) to reach. Same canned, keyword-matched reply as web —
// no real AI backend exists yet, and this stays honest about that rather
// than pretending otherwise.
function replyTo(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('wedding')) {
    return "Your Wedding goal is at 63% with $22,000 saved of $35,000. At the current pace you'll hit the full amount about a month before the venue balance is due — no action needed right now.";
  }
  if (t.includes('afford') || t.includes('night out') || t.includes('buy')) {
    return "Based on this month's plan, you have about $190 left in Personal Shopping and Dining Out is already $40 over — a modest night out fits, but pulling from Dining Out would push it further over.";
  }
  if (t.includes('spend')) {
    return "You've spent $2,780 of this month's $4,200 planned budget (66%). Wedding Vendors and Dining Out are your two biggest categories so far.";
  }
  return "Happy to help — ask me about a specific purchase, your budget, or a savings goal and I'll walk through it with you, no judgment either way.";
}

export function AICoachScreen() {
  const { colors } = useTheme();
  const [messages, setMessages] = useState(aiConversation);
  const [draft, setDraft] = useState('');

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { role: 'user' as const, text: trimmed }, { role: 'assistant' as const, text: replyTo(trimmed) }]);
    setDraft('');
  }

  return (
    <ScreenContainer>
      <Text variant="h1">AI Coach</Text>
      <Text variant="body" secondary>Ask anything — no judgment, just clarity.</Text>

      {messages.map((m, i) => (
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
        <Text variant="caption" secondary>SHARE WITH {currentUser.partnerName.toUpperCase()}</Text>
        {/* Not wired — there's no "share an AI conversation to Activity"
            event type yet. Disabled with honest copy rather than a
            silently dead tap target. */}
        <Pressable
          disabled
          role="button"
          aria-label="Share this conversation to Activity — coming soon"
          style={{
            marginTop: spacing.sm,
            paddingVertical: spacing.sm,
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            opacity: 0.5,
          }}
        >
          <Text variant="bodySmall" secondary style={{ fontWeight: '600' }}>Share this conversation to Activity (coming soon)</Text>
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
          onSubmitEditing={() => send(draft)}
          placeholder="Can we afford..."
          placeholderTextColor={colors.textSecondary}
          aria-label="Ask the Money Coach a question"
          style={{ flex: 1, color: colors.textPrimary, fontSize: 15 }}
        />
        <Pressable hitSlop={8} role="button" aria-label="Voice input — coming soon">
          <Mic size={18} color={colors.textSecondary} aria-hidden={true} />
        </Pressable>
        <Pressable hitSlop={8} role="button" aria-label="Attach a photo — coming soon">
          <Camera size={18} color={colors.textSecondary} aria-hidden={true} />
        </Pressable>
        <Pressable
          onPress={() => send(draft)}
          hitSlop={8}
          disabled={!draft.trim()}
          role="button"
          aria-label="Send message"
        >
          <Send size={18} color={draft.trim() ? palette.sourLime : colors.textSecondary} aria-hidden={true} />
        </Pressable>
      </View>
    </ScreenContainer>
  );
}
