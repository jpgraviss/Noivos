import { useEffect, useRef, useState } from "react";
import { View, TextInput, Pressable } from "react-native";
import { Camera, Mic, Send } from "lucide-react-native";
import { Card, Text, Skeleton, useTheme, spacing, radius, palette, getTextColorFor } from "@noivos/ui";
import { ScreenStack } from "../components/ScreenLayout";

const SUGGESTIONS = [
  "How's our wedding budget doing?",
  "Can we afford a night out this month?",
  "Ask about your spending",
];

interface Message {
  role: "user" | "assistant";
  text: string;
}

// Wired to the real AI Financial Coach backend (POST/GET /api/ai/coach) on
// 2026-08-14 — until now this screen ran a canned, keyword-matched reply
// with no real model call and no real financial data. See lib/ai.ts's
// top-of-file comment for why this backend was built now despite PRD
// §12.10's "legal review required before public launch, not yet
// scheduled" language: founder directive, building-to-demo-for-legal, not
// a launch-readiness decision — this screen going live internally is not
// the same thing as this feature being cleared for real users.
export function AICoachScreen() {
  const { colors } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch-cancellation guard, same pattern as BudgetScreen.tsx's
  // loadRequestRef (found 2026-08-13) — without it, an unmount mid-fetch
  // (navigating away from AI Coach before the initial history load
  // resolves) could still call setMessages/setLoadingHistory on an
  // unmounted component.
  const loadRequestRef = useRef(0);

  useEffect(() => {
    const requestId = ++loadRequestRef.current;
    fetch("/api/ai/coach")
      .then(async (res) => {
        if (!res.ok) throw new Error("history fetch failed");
        return res.json() as Promise<{ conversationId: string | null; messages: { role: string; content: string }[] }>;
      })
      .then((data) => {
        if (loadRequestRef.current !== requestId) return;
        setConversationId(data.conversationId);
        setMessages(data.messages.map((m) => ({ role: m.role as "user" | "assistant", text: m.content })));
      })
      .catch(() => {
        // No database/Clerk/AI backend reachable — start with an empty,
        // genuinely-fresh conversation rather than fabricating history.
      })
      .finally(() => {
        if (loadRequestRef.current === requestId) setLoadingHistory(false);
      });
    return () => {
      loadRequestRef.current += 1;
    };
  }, []);

  async function send(text: string) {
    const trimmed = text.trim();
    // sending guard (same bug class as every other missing-double-tap-
    // guard fix this session): without it, a fast double-tap on Send — or
    // tapping a suggestion chip while a prior message is still in
    // flight — could fire two overlapping POSTs against the same
    // conversation, racing which reply lands first.
    if (!trimmed || sending) return;

    setSending(true);
    setError(null);
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setDraft("");

    try {
      const res = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Something went wrong reaching the Coach.");
        return;
      }
      setConversationId(data.conversationId);
      setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
    } catch {
      setError("Couldn't reach the Coach — try again.");
    } finally {
      setSending(false);
    }
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
            disabled={sending}
            role="button"
            style={{
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              opacity: sending ? 0.6 : 1,
            }}
          >
            <Text variant="bodySmall">{s}</Text>
          </Pressable>
        ))}
      </View>

      {loadingHistory ? (
        <>
          <Skeleton width="70%" height={52} radiusSize={radius.large} />
          <Skeleton width="60%" height={40} radiusSize={radius.large} style={{ alignSelf: "flex-end" }} />
        </>
      ) : (
        messages.map((m, i) => (
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
        ))
      )}

      {sending && (
        <Card style={{ alignSelf: "flex-start", maxWidth: "90%" }}>
          <Text variant="body" secondary>
            The Coach is thinking…
          </Text>
        </Card>
      )}

      {error && (
        <Text variant="bodySmall" style={{ color: colors.danger }}>
          {error}
        </Text>
      )}

      <Card>
        {/* Was `SHARE WITH {currentUser.partnerName.toUpperCase()}` — that
            mock name ("MARCUS") was shown unconditionally to every real
            user regardless of who their actual connected partner is, or
            whether they have one at all (found 2026-08-08, same bug class
            as BudgetScreen's earlier partnerName fix). This screen now has
            real data (a real backend as of 2026-08-14), but the "share to
            Activity" action itself still doesn't exist as a real feature —
            ai_conversations is deliberately kept personal, not partnership-
            shared, until that's built (see api/ai/coach/route.ts's own
            comment) — so this keeps using a neutral, never-wrong "YOUR
            PARTNER" instead of a specific name, matching OwnershipBadge's
            own precedent (packages/ui/src/OwnershipBadge.tsx) of omitting a
            name entirely rather than fabricating one when it isn't known. */}
        <Text variant="caption" secondary>
          SHARE WITH YOUR PARTNER
        </Text>
        {/* Not wired to anything — there's no "share an AI conversation to
            Activity" event type yet. Disabled with honest copy rather than
            a silently dead tap target, same posture as the icons below and
            AppShell's Search icon. Found during the 2026-08-06 accessibility
            pass; not present in the 2026-08-05 dead-button audit, which
            didn't cover this screen. */}
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
            alignItems: "center",
            opacity: 0.5,
          }}
        >
          <Text variant="bodySmall" secondary style={{ fontWeight: "600" }}>
            Share this conversation to Activity (coming soon)
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
          editable={!sending}
          placeholder="Can we afford..."
          placeholderTextColor={colors.textSecondary}
          aria-label="Ask the Money Coach a question"
          style={{ flex: 1, color: colors.textPrimary, fontSize: 15 }}
        />
        {/* Not wired to anything — no voice/photo capture backend exists.
            Left visible with an honest label rather than a silently dead
            icon, same posture as AppShell's Search icon. */}
        <Pressable hitSlop={8} role="button" aria-label="Voice input — coming soon">
          <Mic size={18} color={colors.textSecondary} aria-hidden={true} />
        </Pressable>
        <Pressable hitSlop={8} role="button" aria-label="Attach a photo — coming soon">
          <Camera size={18} color={colors.textSecondary} aria-hidden={true} />
        </Pressable>
        <Pressable
          onPress={() => send(draft)}
          hitSlop={8}
          disabled={!draft.trim() || sending}
          role="button"
          aria-label="Send message"
        >
          {/* colors.success, not palette.sourLime directly (found
              2026-08-14 — see tokens.ts's `success` token comment for the
              full explanation): raw sourLime on this input bar's
              colors.surface background was ~1.30:1 in light mode. */}
          <Send size={18} color={draft.trim() && !sending ? colors.success : colors.textSecondary} aria-hidden={true} />
        </Pressable>
      </View>
    </ScreenStack>
  );
}
