import { useEffect, useRef, useState } from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { Camera, Mic, Send } from 'lucide-react-native';
import { Card, ScreenContainer, Text, Skeleton, useTheme, spacing, radius, palette, getTextColorFor } from '@noivos/ui';
import { useApiFetch, apiConfigured } from '../lib/api';

const SUGGESTIONS = [
  "How's our wedding budget doing?",
  'Can we afford a night out this month?',
  'Ask about your spending',
];

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

// Wired to the real AI Financial Coach backend (POST/GET /api/ai/coach) on
// 2026-09-25 — brought to parity with apps/web's AICoachScreen.tsx, which
// got this same real backend on 2026-08-14 (see apps/web/src/lib/ai.ts's
// top-of-file comment for why this backend exists despite PRD §12.10's
// "legal review required before public launch, not yet scheduled"
// language: founder directive, building-to-demo-for-legal, not a launch-
// readiness decision — unchanged by this mobile wiring). Until now this
// screen ran a canned, keyword-matched reply with no real model call.
//
// Unlike the web screen, this one calls a separate origin (see
// src/lib/api.ts — apps/mobile has no API routes of its own, everything
// goes through the deployed apps/web Vercel project), and that base URL
// can be genuinely unset on a given device/build (EXPO_PUBLIC_API_BASE_URL
// — see apps/mobile/.env.example), a state apps/web's twin screen never
// has to handle since it's always same-origin. apiConfigured() covers
// that case explicitly; everything downstream of a configured API behaves
// identically to the web screen (same fetch-cancellation guard, same
// sending guard, same Skeleton-gated loading state).
export function AICoachScreen() {
  const { colors } = useTheme();
  const apiFetch = useApiFetch();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(apiConfigured());
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch-cancellation guard, same pattern as apps/web's BudgetScreen.tsx/
  // AICoachScreen.tsx loadRequestRef — without it, an unmount mid-fetch
  // (navigating away from AI Coach before the initial history load
  // resolves) could still call setMessages/setLoadingHistory on an
  // unmounted component.
  const loadRequestRef = useRef(0);

  useEffect(() => {
    if (!apiConfigured()) {
      // loadingHistory already initialized to false in this case — nothing
      // to fetch, so this effect has nothing to do. Stays a genuinely
      // empty conversation rather than fabricating history.
      return;
    }
    const requestId = ++loadRequestRef.current;
    apiFetch('/api/ai/coach')
      .then(async (res) => {
        if (!res.ok) throw new Error('history fetch failed');
        return res.json() as Promise<{ conversationId: string | null; messages: { role: string; content: string }[] }>;
      })
      .then((data) => {
        if (loadRequestRef.current !== requestId) return;
        setConversationId(data.conversationId);
        setMessages(data.messages.map((m) => ({ role: m.role as 'user' | 'assistant', text: m.content })));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apiFetch is stable (useCallback in src/lib/api.ts); only ever needs to run once per mount, same as the web twin's identical effect.
  }, []);

  async function send(text: string) {
    const trimmed = text.trim();
    // sending guard (same bug class as every other missing-double-tap-
    // guard fix this session): without it, a fast double-tap on Send — or
    // tapping a suggestion chip while a prior message is still in
    // flight — could fire two overlapping POSTs against the same
    // conversation, racing which reply lands first.
    if (!trimmed || sending) return;

    if (!apiConfigured()) {
      // Distinct from every other error branch below — this isn't a
      // network failure or an outage, there's no server configured to
      // even attempt reaching yet. Surfaced as an honest, specific message
      // rather than the generic "couldn't reach the Coach" a real network
      // failure gets, same "don't fabricate a transient-sounding error for
      // a permanent unconfigured state" posture as every other
      // *Configured() check in this app.
      setError("The Coach isn't connected on this device yet — set EXPO_PUBLIC_API_BASE_URL (see apps/mobile/.env.example).");
      return;
    }

    setSending(true);
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setDraft('');

    try {
      const res = await apiFetch('/api/ai/coach', {
        method: 'POST',
        body: { conversationId, message: trimmed },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Something went wrong reaching the Coach.');
        return;
      }
      setConversationId(data.conversationId);
      setMessages((prev) => [...prev, { role: 'assistant', text: data.reply }]);
    } catch {
      setError("Couldn't reach the Coach — try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <ScreenContainer>
      <Text variant="h1">AI Coach</Text>
      <Text variant="body" secondary>
        Ask anything — no judgment, just clarity.
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
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
          <Skeleton width="60%" height={40} radiusSize={radius.large} style={{ alignSelf: 'flex-end' }} />
        </>
      ) : (
        messages.map((m, i) => (
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
        ))
      )}

      {sending && (
        <Card style={{ alignSelf: 'flex-start', maxWidth: '90%' }}>
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
            whether they have one at all. apps/web's twin screen got this
            fix on 2026-08-08; found 2026-08-14 that this mobile screen
            never did, and fixed with a neutral "YOUR PARTNER" then. Kept
            unchanged by this real-backend wiring — the "share to Activity"
            action itself still doesn't exist as a real feature
            (ai_conversations is deliberately kept personal, not
            partnership-shared — see api/ai/coach/route.ts's own comment). */}
        <Text variant="caption" secondary>
          SHARE WITH YOUR PARTNER
        </Text>
        {/* Not wired to anything — there's no "share an AI conversation to
            Activity" event type yet. Disabled with honest copy rather than
            a silently dead tap target. */}
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
          <Text variant="bodySmall" secondary style={{ fontWeight: '600' }}>
            Share this conversation to Activity (coming soon)
          </Text>
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
          editable={!sending}
          placeholder="Can we afford..."
          placeholderTextColor={colors.textSecondary}
          aria-label="Ask the Money Coach a question"
          style={{ flex: 1, color: colors.textPrimary, fontSize: 15 }}
        />
        {/* Not wired to anything — no voice/photo capture backend exists.
            Left visible with an honest label rather than a silently dead
            icon, same posture as elsewhere in this app. */}
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
          {/* colors.success, not palette.sourLime directly — see tokens.ts's
              `success` token comment: raw sourLime on this input bar's
              colors.surface background fails WCAG AA in light mode. */}
          <Send size={18} color={draft.trim() && !sending ? colors.success : colors.textSecondary} aria-hidden={true} />
        </Pressable>
      </View>
    </ScreenContainer>
  );
}
