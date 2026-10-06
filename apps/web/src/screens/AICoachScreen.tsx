import { useEffect, useRef, useState } from "react";
import { View, TextInput, Pressable, Image } from "react-native";
import { Camera, Mic, Send, X } from "lucide-react-native";
import { Card, Text, Skeleton, useTheme, spacing, radius, palette, getTextColorFor } from "@noivos/ui";
import { ScreenStack } from "../components/ScreenLayout";

const SUGGESTIONS = [
  "How's our wedding budget doing?",
  "Can we afford a night out this month?",
  "Ask about your spending",
];

const VALID_IMAGE_MEDIA_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type ImageMediaType = (typeof VALID_IMAGE_MEDIA_TYPES)[number];

interface Message {
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  // Which backend conversation this came from — Financial Coach and
  // Purchase Advisor are two separate ai_conversations rows (distinct
  // conversation_type) merged into one visual thread here; only needed to
  // know which fetched history a message belongs to, nothing renders
  // differently based on it except the chat bubble's optional image.
  source: "coach" | "advisor";
  // Client-only, never persisted (see api/ai/purchase-advisor/route.ts's
  // own comment on why photos aren't saved) — only set on the message
  // that was just sent in this session, so a reload shows the same
  // history without the image, honestly reflecting what's actually saved.
  imagePreview?: string;
}

interface AttachedImage {
  base64: string;
  mediaType: ImageMediaType;
  previewDataUrl: string;
}

// Unified "chat-first interface" per docs/03 UX/UX-UI Blueprint.md
// ("AI Coach... unifies AI Purchase Advisor + AI Financial Coach"): one
// screen, one input bar, two independent backends underneath. Financial
// Coach (POST/GET /api/ai/coach) wired real 2026-08-14 — see lib/ai.ts's
// top-of-file comment for why this backend was built despite PRD §12.10's
// "legal review required before public launch, not yet scheduled"
// language: founder directive, building-to-demo-for-legal, not a launch-
// readiness decision. Purchase Advisor (POST/GET /api/ai/purchase-advisor,
// Linear SE-69) wired real 2026-10-08 — a photo attached via the Camera
// button routes to it instead of the Coach, since evaluating a specific
// purchase with vision input is what that backend/system-prompt is built
// for (see lib/ai.ts's askPurchaseAdvisor); a plain typed question with no
// photo still goes to the Coach as before. Both threads' histories are
// fetched on mount and merged by timestamp into one chronological
// `messages` list — genuinely two separate ai_conversations rows, shown
// as one conversation, matching the Blueprint's own framing.
export function AICoachScreen() {
  const { colors } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [coachConversationId, setCoachConversationId] = useState<string | null>(null);
  const [advisorConversationId, setAdvisorConversationId] = useState<string | null>(null);
  const [advisorShared, setAdvisorShared] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [draft, setDraft] = useState("");
  const [attachedImage, setAttachedImage] = useState<AttachedImage | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch-cancellation guard, same pattern as BudgetScreen.tsx's
  // loadRequestRef — without it, an unmount mid-fetch (navigating away
  // from AI Coach before both history loads resolve) could still call
  // setMessages/setLoadingHistory on an unmounted component.
  const loadRequestRef = useRef(0);

  useEffect(() => {
    const requestId = ++loadRequestRef.current;
    Promise.allSettled([
      fetch("/api/ai/coach").then(async (res) => {
        if (!res.ok) throw new Error("coach history fetch failed");
        return res.json() as Promise<{
          conversationId: string | null;
          messages: { role: string; content: string; createdAt: string }[];
        }>;
      }),
      fetch("/api/ai/purchase-advisor").then(async (res) => {
        if (!res.ok) throw new Error("advisor history fetch failed");
        return res.json() as Promise<{
          conversationId: string | null;
          shared: boolean;
          messages: { role: string; content: string; createdAt: string }[];
        }>;
      }),
    ]).then(([coachResult, advisorResult]) => {
      if (loadRequestRef.current !== requestId) return;

      const merged: Message[] = [];
      if (coachResult.status === "fulfilled") {
        setCoachConversationId(coachResult.value.conversationId);
        for (const m of coachResult.value.messages) {
          merged.push({ role: m.role as "user" | "assistant", text: m.content, createdAt: m.createdAt, source: "coach" });
        }
      }
      if (advisorResult.status === "fulfilled") {
        setAdvisorConversationId(advisorResult.value.conversationId);
        setAdvisorShared(advisorResult.value.shared);
        for (const m of advisorResult.value.messages) {
          merged.push({ role: m.role as "user" | "assistant", text: m.content, createdAt: m.createdAt, source: "advisor" });
        }
      }
      merged.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      setMessages(merged);
      setLoadingHistory(false);
    });
    // No .catch() needed beyond allSettled's own per-promise handling — a
    // rejected fetch (no database/Clerk/AI backend reachable) just leaves
    // that thread's conversationId null and contributes no messages,
    // starting an honest, genuinely-fresh conversation rather than
    // fabricating history, same posture as the original single-thread
    // version of this screen.
    return () => {
      loadRequestRef.current += 1;
    };
  }, []);

  function handlePickImage() {
    fileInputRef.current?.click();
  }

  function handleImageSelected(file: File) {
    setImageError(null);
    if (!(VALID_IMAGE_MEDIA_TYPES as readonly string[]).includes(file.type)) {
      setImageError("That file type isn't supported — try a JPEG, PNG, GIF, or WebP photo.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      const base64 = dataUrl.split(",")[1] ?? "";
      if (!base64) {
        setImageError("Couldn't read that photo — try another one.");
        return;
      }
      setAttachedImage({ base64, mediaType: file.type as ImageMediaType, previewDataUrl: dataUrl });
    };
    reader.onerror = () => setImageError("Couldn't read that photo — try another one.");
    reader.readAsDataURL(file);
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

    setSending(true);
    setError(null);
    const sentAt = new Date().toISOString();
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        text: trimmed || (image ? "(photo attached, no caption)" : ""),
        createdAt: sentAt,
        source: image ? "advisor" : "coach",
        imagePreview: image?.previewDataUrl,
      },
    ]);
    setDraft("");

    try {
      const endpoint = image ? "/api/ai/purchase-advisor" : "/api/ai/coach";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          image
            ? { conversationId: advisorConversationId, message: trimmed, imageBase64: image.base64, imageMediaType: image.mediaType }
            : { conversationId: coachConversationId, message: trimmed }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : image
              ? "Something went wrong reaching the Purchase Advisor."
              : "Something went wrong reaching the Coach."
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
        { role: "assistant", text: data.reply, createdAt: new Date().toISOString(), source: image ? "advisor" : "coach" },
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
      const res = await fetch(`/api/ai/conversations/${advisorConversationId}/share`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Couldn't share that conversation.");
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
    <ScreenStack>
      <View>
        <Text variant="h1">AI Coach</Text>
        <Text variant="body" secondary>
          Ask anything, or attach a photo of a receipt or price tag — no judgment, just clarity.
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
            {m.imagePreview && (
              <Image
                source={{ uri: m.imagePreview }}
                alt="Photo you attached to this message"
                style={{ width: 160, height: 160, borderRadius: radius.medium, marginBottom: spacing.xs }}
                resizeMode="cover"
              />
            )}
            <Text variant="body" color={m.role === "user" ? getTextColorFor(palette.grape) : colors.textPrimary}>
              {m.text}
            </Text>
          </Card>
        ))
      )}

      {sending && (
        <Card style={{ alignSelf: "flex-start", maxWidth: "90%" }}>
          <Text variant="body" secondary>
            {attachedImage ? "The Purchase Advisor is thinking…" : "The Coach is thinking…"}
          </Text>
        </Card>
      )}

      {error && (
        <Text variant="bodySmall" style={{ color: colors.danger }}>
          {error}
        </Text>
      )}

      {/* Real "Share this conversation to Activity" action (PRD §12.9,
          Linear SE-69) — only shown once a real Purchase Advisor
          conversation exists; there's genuinely nothing to share before
          that, same "hide rather than fake a control" posture as
          HomeScreen's Money Meeting card (hidden entirely for a confirmed
          solo user). Financial Coach conversations have no share
          action at all — PRD §12.9 is the one place this app's spec
          calls for AI output to be shareable, and Coach conversations
          stay private by design (see api/ai/coach/route.ts's comment). */}
      {advisorConversationId && (
        <Card>
          <Text variant="caption" secondary>
            PURCHASE ADVISOR
          </Text>
          {advisorShared ? (
            <Text variant="bodySmall" style={{ color: colors.success, marginTop: spacing.sm, fontWeight: "600" }}>
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
                alignItems: "center",
                opacity: sharing ? 0.6 : 1,
              }}
            >
              <Text variant="bodySmall" secondary style={{ fontWeight: "600" }}>
                {sharing ? "Sharing…" : "Share this conversation to Activity"}
              </Text>
            </Pressable>
          )}
        </Card>
      )}

      {attachedImage && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <Image
            source={{ uri: attachedImage.previewDataUrl }}
            alt="Photo you're about to send"
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
          aria-label="Ask the Money Coach a question, or describe a purchase"
          style={{ flex: 1, color: colors.textPrimary, fontSize: 15 }}
        />
        {/* Not wired to anything — no voice transcription pipeline exists
            yet (PRD §12.9 lists "speak" as an input mode, but building
            real speech-to-text is a distinct, separate piece of work from
            the photo/receipt/price-tag scanning this pass added). Left
            visible with an honest label rather than a silently dead icon,
            same posture as AppShell's Search icon. */}
        <Pressable hitSlop={8} role="button" aria-label="Voice input — coming soon">
          <Mic size={18} color={colors.textSecondary} aria-hidden={true} />
        </Pressable>
        {/* Real as of 2026-10-08 (Linear SE-69) — opens a file picker
            (camera on a phone's browser, file browser on desktop);
            selecting a photo routes the next Send to the Purchase
            Advisor instead of the Coach. Hidden <input type="file"> is
            the only way to trigger a native file/camera picker from a
            plain button on web. */}
        <Pressable onPress={handlePickImage} hitSlop={8} role="button" aria-label="Attach a photo of a receipt or price tag">
          <Camera size={18} color={colors.textSecondary} aria-hidden={true} />
        </Pressable>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          capture="environment"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageSelected(file);
            e.target.value = ""; // allows picking the same file again after removing it
          }}
        />
        <Pressable onPress={() => send(draft)} hitSlop={8} disabled={sendDisabled} role="button" aria-label="Send message">
          {/* colors.success, not palette.sourLime directly (found
              2026-08-14 — see tokens.ts's `success` token comment for the
              full explanation): raw sourLime on this input bar's
              colors.surface background was ~1.30:1 in light mode. */}
          <Send size={18} color={!sendDisabled ? colors.success : colors.textSecondary} aria-hidden={true} />
        </Pressable>
      </View>
    </ScreenStack>
  );
}
