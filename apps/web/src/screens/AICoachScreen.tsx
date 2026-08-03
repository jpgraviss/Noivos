import { useState } from "react";
import { View, TextInput, Pressable } from "react-native";
import { Camera, Mic, Send } from "lucide-react-native";
import { Card, Text, useTheme, spacing, radius, palette, getTextColorFor } from "@noivos/ui";
import { aiConversation, currentUser } from "../data/mockData";
import { ScreenStack } from "../components/ScreenLayout";

const SUGGESTIONS = [
  "How's our wedding budget doing?",
  "Can we afford a night out this month?",
  "Ask about your spending",
];

// No real AI backend yet (no OpenAI wiring, no Neon-backed transaction
// history) — this is a canned, keyword-matched reply so the screen is
// genuinely interactive rather than a static transcript, while staying
// honest that it isn't calling a real model.
function replyTo(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("wedding")) {
    return "Your Wedding goal is at 63% with $22,000 saved of $35,000. At the current pace you'll hit the full amount about a month before the venue balance is due — no action needed right now.";
  }
  if (t.includes("afford") || t.includes("night out") || t.includes("buy")) {
    return "Based on this month's plan, you have about $190 left in Personal Shopping and Dining Out is already $40 over — a modest night out fits, but pulling from Dining Out would push it further over.";
  }
  if (t.includes("spend")) {
    return "You've spent $2,780 of this month's $4,200 planned budget (66%). Wedding Vendors and Dining Out are your two biggest categories so far.";
  }
  return "Happy to help — ask me about a specific purchase, your budget, or a savings goal and I'll walk through it with you, no judgment either way.";
}

export function AICoachScreen() {
  const { colors } = useTheme();
  const [messages, setMessages] = useState(aiConversation);
  const [draft, setDraft] = useState("");

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { role: "user" as const, text: trimmed }, { role: "assistant" as const, text: replyTo(trimmed) }]);
    setDraft("");
  }

  return (
    <ScreenStack>
      <View>
        <Text variant="h1">AI Coach</Text>
        <Text variant="body" secondary>
          Ask anything — no judgment, just clarity.
        </Text>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {SUGGESTIONS.map((s) => (
          <Pressable
            key={s}
            onPress={() => send(s)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            }}
          >
            <Text variant="bodySmall">{s}</Text>
          </Pressable>
        ))}
      </View>

      {messages.map((m, i) => (
        <Card
          key={i}
          style={{
            alignSelf: m.role === "user" ? "flex-end" : "flex-start",
            maxWidth: "90%",
            backgroundColor: m.role === "user" ? palette.grape : colors.surface,
            borderColor: m.role === "user" ? palette.grape : colors.border,
          }}
        >
          <Text variant="body" color={m.role === "user" ? getTextColorFor(palette.grape) : colors.textPrimary}>
            {m.text}
          </Text>
        </Card>
      ))}

      <Card>
        <Text variant="caption" secondary>
          SHARE WITH {currentUser.partnerName.toUpperCase()}
        </Text>
        <Pressable
          style={{
            marginTop: spacing.sm,
            paddingVertical: spacing.sm,
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
          }}
        >
          <Text variant="bodySmall" style={{ fontWeight: "600" }}>
            Share this conversation to Activity
          </Text>
        </Pressable>
      </Card>

      <View
        style={{
          flexDirection: "row",
          gap: spacing.sm,
          alignItems: "center",
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
          style={{ flex: 1, color: colors.textPrimary, fontSize: 15 }}
        />
        <Pressable hitSlop={8}>
          <Mic size={18} color={colors.textSecondary} />
        </Pressable>
        <Pressable hitSlop={8}>
          <Camera size={18} color={colors.textSecondary} />
        </Pressable>
        <Pressable onPress={() => send(draft)} hitSlop={8} disabled={!draft.trim()}>
          <Send size={18} color={draft.trim() ? palette.sourLime : colors.textSecondary} />
        </Pressable>
      </View>
    </ScreenStack>
  );
}
