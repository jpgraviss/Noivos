import { useEffect, useRef, useState } from 'react';
import { View, TextInput, Pressable, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Mic, Send, X } from 'lucide-react-native';
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
  createdAt: string;
  // Which backend conversation this came from — Financial Coach and
  // Purchase Advisor are two separate ai_conversations rows (distinct
  // conversation_type), merged into one visual thread here, same as the
  // web twin. Only needed to know which fetched history a message
  // belongs to; nothing renders differently based on it except the chat
  // bubble's optional image.
  source: 'coach' | 'advisor';
  // Client-only, never persisted (see apps/web's api/ai/purchase-advisor/
  // route.ts — attached photos are analyzed via vision in the moment and
  // never saved) — only set on the message just sent in this session, so
  // a reload shows the same history without the image, honestly
  // reflecting what's actually saved.
  imagePreviewUri?: string;
}

interface AttachedImage {
  base64: string;
  previewUri: string;
}

// Brought to parity with apps/web's AICoachScreen.tsx on 2026-10-12 — this
// screen had drifted behind web since 2026-10-08, when the AI Purchase
// Advisor (PRD §12.9) and the real "Share to Activity" action were added
// to web only. Same unified "chat-first interface" per docs/03 UX/
// UX-UI Blueprint.md: one screen, one input bar, two independent backends
// underneath. A plain typed question still goes to the Financial Coach
// (POST/GET /api/ai/coach, real since 2026-09-25 on this screen);
// attaching a photo routes that send to the Purchase Advisor instead
// (POST/GET /api/ai/purchase-advisor) — evaluating a specific purchase
// with vision input is what that backend/system-prompt is built for (see
// apps/web/src/lib/ai.ts's askPurchaseAdvisor).
//
// One genuine divergence from a straight port, not just an RN-ified copy:
// web's Camera button opens a plain file `<input>` (the browser's own
// camera-or-library chooser); there's no single native-API equivalent, so
// this uses expo-image-picker and offers the choice explicitly via a
// native Alert (Take Photo / Choose from Library) — same "native,
// idiomatic equivalent over a literal port" posture as AICoachScreen's
// earlier native Share button and TrendChart's tap-to-inspect.
export function AICoachScreen() {
  const { colors } = useTheme();
  const apiFetch = useApiFetch();
  const [messages, setMessages] = useState<Message[]>([]);
  const [coachConversationId, setCoachConversationId] = useState<string | null>(null);
  const [advisorConversationId, setAdvisorConversationId] = useState<string | null>(null);
  const [advisorShared, setAdvisorShared] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [draft, setDraft] = useState('');
  const [attachedImage, setAttachedImage] = useState<AttachedImage | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(apiConfigured());
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch-cancellation guard, same pattern as every other real-data screen
  // in this app — without it, an unmount mid-fetch (navigating away from
  // AI Coach before both history loads resolve) could still call
  // setMessages/setLoadingHistory on an unmounted component.
  const loadRequestRef = useRef(0);

  useEffect(() => {
    if (!apiConfigured()) return;
    const requestId = ++loadRequestRef.current;

    Promise.allSettled([
      apiFetch('/api/ai/coach').then(async (res) => {
        if (!res.ok) throw new Error('coach history fetch failed');
        return res.json() as Promise<{
          conversationId: string | null;
          messages: { role: string; content: string; createdAt: string }[];
        }>;
      }),
      apiFetch('/api/ai/purchase-advisor').then(async (res) => {
        if (!res.ok) throw new Error('advisor history fetch failed');
        return res.json() as Promise<{
          conversationId: string | null;
          shared: boolean;
          messages: { role: string; content: string; createdAt: string }[];
        }>;
      }),
    ]).then(([coachResult, advisorResult]) => {
      if (loadRequestRef.current !== requestId) return;

      const merged: Message[] = [];
      if (coachResult.status === 'fulfilled') {
        setCoachConversationId(coachResult.value.conversationId);
        for (const m of coachResult.value.messages) {
          merged.push({ role: m.role as 'user' | 'assistant', text: m.content, createdAt: m.createdAt, source: 'coach' });
        }
      }
      if (advisorResult.status === 'fulfilled') {
        setAdvisorConversationId(advisorResult.value.conversationId);
        setAdvisorShared(advisorResult.value.shared);
        for (const m of advisorResult.value.messages) {
          merged.push({ role: m.role as 'user' | 'assistant', text: m.content, createdAt: m.createdAt, source: 'advisor' });
        }
      }
      merged.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      setMessages(merged);
      setLoadingHistory(false);
    });
    // No .catch() needed beyond allSettled's own per-promise handling —
    // a rejected fetch (no database/Clerk/AI backend reachable) just
    // leaves that thread's conversationId null and contributes no
    // messages, starting an honest, genuinely-fresh conversation rather
    // than fabricating history.
    return () => {
      loadRequestRef.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apiFetch is stable (useCallback in src/lib/api.ts); only ever needs to run once per mount.
  }, []);

  async function pickFromCamera() {
    setImageError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setImageError("Camera access is off for Noivos — check this device's Settings to attach a photo this way.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', base64: true, quality: 0.7 });
    applyPickerResult(result);
  }

  async function pickFromLibrary() {
    setImageError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setImageError("Photo library access is off for Noivos — check this device's Settings to attach a photo this way.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', base64: true, quality: 0.7 });
    applyPickerResult(result);
  }

  function applyPickerResult(result: ImagePicker.ImagePickerResult) {
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset?.base64) {
      setImageError("Couldn't read that photo — try another one.");
      return;
    }
    setAttachedImage({ base64: asset.base64, previewUri: asset.uri });
  }

  function handlePickImage() {
    Alert.alert('Attach a photo', 'Of a receipt, a price tag, or anything else to ask the Purchase Advisor about.', [
      { text: 'Take Photo', onPress: () => void pickFromCamera() },
      { text: 'Choose from Library', onPress: () => void pickFromLibrary() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function send(text: string) {
    const trimmed = text.trim();
    const image = attachedImage;
    // sending guard (same bug class as every other missing-double-tap-
    // guard fix this session): without it, a fast double-tap on Send — or
    // tapping a suggestion chip while a prior message is still in
    // flight — could fire two overlapping POSTs against the same
    // conversation, racing which reply lands first. A photo with no
    // caption is a valid send (PRD §12.9's own "take a picture"/"scan a
    // receipt" input modes have no typed text at all); only a genuinely
    // empty send (no text, no photo) is blocked.
    if ((!trimmed && !image) || sending) return;

    if (!apiConfigured()) {
      // Distinct from every other error branch below — this isn't a
      // network failure or an outage, there's no server configured to
      // even attempt reaching yet.
      setError(
        image
          ? "The Purchase Advisor isn't connected on this device yet — set EXPO_PUBLIC_API_BASE_URL (see apps/mobile/.env.example)."
          : "The Coach isn't connected on this device yet — set EXPO_PUBLIC_API_BASE_URL (see apps/mobile/.env.example)."
      );
      return;
    }

    setSending(true);
    setError(null);
    const sentAt = new Date().toISOString();
    setMessages((prev) => [
      ...prev,
      {
        role: 'user',
        text: trimmed || (image ? '(photo attached, no caption)' : ''),
        createdAt: sentAt,
        source: image ? 'advisor' : 'coach',
        imagePreviewUri: image?.previewUri,
      },
    ]);
    setDraft('');

    try {
      const endpoint = image ? '/api/ai/purchase-advisor' : '/api/ai/coach';
      const res = await apiFetch(endpoint, {
        method: 'POST',
        body: image
          ? { conversationId: advisorConversationId, message: trimmed, imageBase64: image.base64, imageMediaType: 'image/jpeg' }
          : { conversationId: coachConversationId, message: trimmed },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          typeof data.error === 'string'
            ? data.error
            : image
              ? 'Something went wrong reaching the Purchase Advisor.'
              : 'Something went wrong reaching the Coach.'
        );
        return;
      }
      if (image) {
        setAdvisorConversationId(data.conversationId);
        setAttachedImage(null);
      } else {
        setCoachConversationId(data.conversationId);
      }
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: data.reply, createdAt: new Date().toISOString(), source: image ? 'advisor' : 'coach' },
      ]);
    } catch {
      setError(image ? "Couldn't reach the Purchase Advisor — try again." : "Couldn't reach the Coach — try again.");
    } finally {
      setSending(false);
    }
  }

  async function handleShare() {
    if (!advisorConversationId || advisorShared || sharing) return;
    setSharing(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/ai/conversations/${advisorConversationId}/share`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : "Couldn't share that conversation.");
        return;
      }
      setAdvisorShared(true);
    } catch {
      setError("Couldn't reach the server — try again.");
    } finally {
      setSharing(false);
    }
  }

  const sendDisabled = (!draft.trim() && !attachedImage) || sending;

  return (
    <ScreenContainer>
      <Text variant="h1">AI Coach</Text>
      <Text variant="body" secondary>
        Ask anything, or attach a photo of a receipt or price tag — no judgment, just clarity.
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
            {m.imagePreviewUri && (
              <Image
                source={{ uri: m.imagePreviewUri }}
                accessibilityLabel="Photo you attached to this message"
                style={{ width: 160, height: 160, borderRadius: radius.medium, marginBottom: spacing.xs }}
                resizeMode="cover"
              />
            )}
            <Text variant="body" color={m.role === 'user' ? getTextColorFor(palette.grape) : colors.textPrimary}>
              {m.text}
            </Text>
          </Card>
        ))
      )}

      {sending && (
        <Card style={{ alignSelf: 'flex-start', maxWidth: '90%' }}>
          <Text variant="body" secondary>
            {attachedImage ? 'The Purchase Advisor is thinking…' : 'The Coach is thinking…'}
          </Text>
        </Card>
      )}

      {error && (
        <Text variant="bodySmall" style={{ color: colors.danger }}>
          {error}
        </Text>
      )}

      {/* Real "Share this conversation to Activity" action (PRD §12.9) —
          only shown once a real Purchase Advisor conversation exists;
          nothing to share before that, same "hide rather than fake a
          control" posture as HomeScreen's Money Meeting card. Financial
          Coach conversations have no share action at all — see
          apps/web's api/ai/coach/route.ts's own comment on why those stay
          private by design. */}
      {advisorConversationId && (
        <Card>
          <Text variant="caption" secondary>
            PURCHASE ADVISOR
          </Text>
          {advisorShared ? (
            <Text variant="bodySmall" style={{ color: colors.success, marginTop: spacing.sm, fontWeight: '600' }}>
              Shared to your Activity feed
            </Text>
          ) : (
            <Pressable
              onPress={handleShare}
              disabled={sharing}
              role="button"
              style={{
                marginTop: spacing.sm,
                paddingVertical: spacing.sm,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                opacity: sharing ? 0.6 : 1,
              }}
            >
              <Text variant="bodySmall" secondary style={{ fontWeight: '600' }}>
                {sharing ? 'Sharing…' : 'Share this conversation to Activity'}
              </Text>
            </Pressable>
          )}
        </Card>
      )}

      {attachedImage && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Image
            source={{ uri: attachedImage.previewUri }}
            accessibilityLabel="Photo you're about to send"
            style={{ width: 48, height: 48, borderRadius: radius.medium }}
          />
          <Text variant="bodySmall" secondary style={{ flex: 1 }}>
            Photo attached — add a caption or just send it.
          </Text>
          <Pressable onPress={() => setAttachedImage(null)} hitSlop={8} role="button" aria-label="Remove attached photo">
            <X size={16} color={colors.textSecondary} aria-hidden={true} />
          </Pressable>
        </View>
      )}
      {imageError && (
        <Text variant="bodySmall" style={{ color: colors.danger }}>
          {imageError}
        </Text>
      )}

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
          aria-label="Ask the Money Coach a question, or describe a purchase"
          style={{ flex: 1, color: colors.textPrimary, fontSize: 15 }}
        />
        {/* Not wired to anything — no voice transcription pipeline exists
            yet (PRD §12.9 lists "speak" as an input mode, but real
            speech-to-text is a distinct, separate piece of work). Left
            visible with an honest label rather than a silently dead icon,
            same posture as elsewhere in this app. */}
        <Pressable hitSlop={8} role="button" aria-label="Voice input — coming soon">
          <Mic size={18} color={colors.textSecondary} aria-hidden={true} />
        </Pressable>
        {/* Real as of 2026-10-12 — opens a native Take Photo/Choose from
            Library chooser (expo-image-picker); attaching a photo routes
            the next Send to the Purchase Advisor instead of the Coach. */}
        <Pressable onPress={handlePickImage} hitSlop={8} role="button" aria-label="Attach a photo of a receipt or price tag">
          <Camera size={18} color={colors.textSecondary} aria-hidden={true} />
        </Pressable>
        <Pressable onPress={() => send(draft)} hitSlop={8} disabled={sendDisabled} role="button" aria-label="Send message">
          {/* colors.success, not palette.sourLime directly — see tokens.ts's
              `success` token comment: raw sourLime on this input bar's
              colors.surface background fails WCAG AA in light mode. */}
          <Send size={18} color={!sendDisabled ? colors.success : colors.textSecondary} aria-hidden={true} />
        </Pressable>
      </View>
    </ScreenContainer>
  );
}
