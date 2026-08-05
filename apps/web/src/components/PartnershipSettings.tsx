"use client";

import { useEffect, useState } from "react";
import { ChevronRight, UserPlus } from "lucide-react-native";
import { Card, Text, useTheme, spacing, radius, palette, getTextColorFor } from "@noivos/ui";
import { currentUser } from "../data/mockData";

type View = "summary" | "invite" | "disconnect-confirm";

function inputStyle(borderColor: string, textColor: string) {
  return {
    width: "100%" as const,
    padding: "10px 14px",
    borderRadius: radius.medium,
    border: `1px solid ${borderColor}`,
    backgroundColor: "transparent",
    color: textColor,
    fontFamily: "var(--font-inter)",
    fontSize: 14,
  };
}

function pillButtonStyle(borderColor: string, textColor: string) {
  return {
    padding: "10px 16px",
    borderRadius: radius.pill,
    border: `1px solid ${borderColor}`,
    backgroundColor: "transparent",
    color: textColor,
    fontFamily: "var(--font-inter)",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer" as const,
  };
}

// Persists via /api/partnership* (Neon, behind Clerk auth + RLS) as of
// 2026-08-03. Falls back to local-component-state-only behavior if that
// route isn't reachable (Clerk unconfigured, signed out, etc.) — same
// graceful-passthrough posture as IdentitySettings/GoalsScreen.
//
// Inviting creates a genuinely real Partnership row (+ this user's
// membership + a pending invite) — there's still no email-sending service,
// so nothing is actually delivered to the invitee, and there's no real
// accept-invite flow yet either for a second person to join. Both are
// flagged honestly in the UI rather than faked.
export function PartnershipSettings() {
  const { colors } = useTheme();

  const [loaded, setLoaded] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [connected, setConnected] = useState(false);
  const [invited, setInvited] = useState(false);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);

  const [view, setView] = useState<View>("summary");
  const [inviteInput, setInviteInput] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/partnership")
      .then(async (res) => {
        if (!res.ok) throw new Error("partnership fetch failed");
        return res.json() as Promise<{ connected: boolean; invited: boolean; partnerName?: string; invitedEmail?: string }>;
      })
      .then((data) => {
        if (cancelled) return;
        setBackendAvailable(true);
        setConnected(data.connected);
        setInvited(data.invited);
        setPartnerName(data.partnerName ?? null);
        setInvitedEmail(data.invitedEmail ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        // No database/Clerk reachable — fall back to the illustrative mock.
        setConnected(true);
        setPartnerName(currentUser.partnerName);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasActivePartnership = connected || invited;

  async function handleSendInvite() {
    const email = inviteInput.trim();
    if (!email) return;

    if (!backendAvailable) {
      setInvitedEmail(email);
      setInvited(true);
      return;
    }

    setSendingInvite(true);
    setInviteError(null);
    try {
      const res = await fetch("/api/partnership/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error ?? "Couldn't send that invite.");
        return;
      }
      setInvited(true);
      setInvitedEmail(data.invitedEmail);
    } catch {
      setInviteError("Couldn't reach the server — try again.");
    } finally {
      setSendingInvite(false);
    }
  }

  async function handleDisconnect() {
    if (!backendAvailable) {
      setConnected(false);
      setInvited(false);
      setPartnerName(null);
      setInvitedEmail(null);
      setView("summary");
      return;
    }

    setDisconnecting(true);
    setDisconnectError(null);
    try {
      const res = await fetch("/api/partnership/disconnect", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setDisconnectError(data.error ?? "Couldn't disconnect.");
        return;
      }
      setConnected(false);
      setInvited(false);
      setPartnerName(null);
      setInvitedEmail(null);
      setView("summary");
    } catch {
      setDisconnectError("Couldn't reach the server — try again.");
    } finally {
      setDisconnecting(false);
    }
  }

  if (!loaded) {
    return (
      <Card>
        <Text variant="h3" style={{ marginBottom: spacing.sm }}>
          Partnership
        </Text>
        <Text variant="bodySmall" secondary>
          Loading…
        </Text>
      </Card>
    );
  }

  return (
    <Card>
      <Text variant="h3" style={{ marginBottom: spacing.sm }}>
        Partnership
      </Text>

      {view === "summary" && (
        <>
          <Row
            label={connected ? `You & ${partnerName}` : invited ? "Invite pending" : "Not connected to a partner"}
            onPress={() => setView("invite")}
            colors={colors}
            showChevron={!connected}
          />
          <Row label="Invite settings" onPress={() => setView("invite")} colors={colors} />
          {hasActivePartnership && (
            <Row label="Disconnect Partnership" onPress={() => setView("disconnect-confirm")} colors={colors} />
          )}
        </>
      )}

      {view === "invite" && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <Text variant="bodySmall" secondary style={{ marginBottom: spacing.sm }}>
            {connected
              ? `Already connected to ${partnerName}. Send another invite if you'd like them to have their own login.`
              : "Invite your partner by email — they'll get their own account, connected to yours."}
          </Text>
          {invited && invitedEmail ? (
            <Text variant="bodySmall" style={{ color: palette.sourLime, marginBottom: spacing.sm }}>
              {backendAvailable
                ? `A Partnership was created and an invite is waiting for ${invitedEmail} to accept — but no email was actually sent (there's no email service wired up yet), so you'll need another way to let them know for now.`
                : `Would send an invite to ${invitedEmail} — no invite-email service is wired up yet, so nothing was actually sent.`}
            </Text>
          ) : (
            <input
              type="email"
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              placeholder="partner@email.com"
              style={{ ...inputStyle(colors.border, colors.textPrimary), marginBottom: spacing.sm }}
            />
          )}
          {inviteError && (
            <Text variant="bodySmall" style={{ color: palette.sourPunch, marginBottom: spacing.sm }}>
              {inviteError}
            </Text>
          )}
          <div style={{ display: "flex", gap: spacing.sm }}>
            {!(invited && invitedEmail) && (
              <button
                onClick={handleSendInvite}
                disabled={!inviteInput.trim() || sendingInvite}
                style={{
                  ...pillButtonStyle(palette.sourLime, getTextColorFor(palette.sourLime)),
                  backgroundColor: inviteInput.trim() ? palette.sourLime : colors.border,
                  border: "none",
                  cursor: inviteInput.trim() ? "pointer" : "not-allowed",
                }}
              >
                {sendingInvite ? "Sending…" : "Send invite"}
              </button>
            )}
            <button onClick={() => setView("summary")} style={pillButtonStyle(colors.border, colors.textPrimary)}>
              Back
            </button>
          </div>
        </div>
      )}

      {view === "disconnect-confirm" && (
        <div>
          <Text variant="bodySmall" secondary style={{ marginBottom: spacing.sm }}>
            {connected
              ? `You'll keep frozen, read-only access to your shared history with ${partnerName}. Nothing new will sync between you going forward. This can't be undone from here.`
              : "This will cancel the pending invite and free you up to start a new Partnership."}
          </Text>
          {disconnectError && (
            <Text variant="bodySmall" style={{ color: palette.sourPunch, marginBottom: spacing.sm }}>
              {disconnectError}
            </Text>
          )}
          <div style={{ display: "flex", gap: spacing.sm }}>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              style={{ ...pillButtonStyle(palette.sourPunch, getTextColorFor(palette.sourPunch)), backgroundColor: palette.sourPunch, border: "none" }}
            >
              {disconnecting ? "Disconnecting…" : "Disconnect"}
            </button>
            <button onClick={() => setView("summary")} style={pillButtonStyle(colors.border, colors.textPrimary)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {!hasActivePartnership && view === "summary" && (
        <div style={{ marginTop: spacing.sm, display: "flex", alignItems: "center", gap: spacing.sm }}>
          <UserPlus size={16} color={palette.sourLime} />
          <Text variant="bodySmall" style={{ color: palette.sourLime }}>
            Invite a partner to reconnect
          </Text>
        </div>
      )}
    </Card>
  );
}

function Row({
  label,
  onPress,
  colors,
  showChevron = true,
}: {
  label: string;
  onPress: () => void;
  colors: { border: string; textSecondary: string };
  showChevron?: boolean;
}) {
  return (
    <button
      onClick={onPress}
      style={{
        display: "flex",
        width: "100%",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 0",
        borderWidth: 0,
        borderTopWidth: 1,
        borderTopStyle: "solid",
        borderTopColor: colors.border,
        background: "none",
        cursor: "pointer",
        textAlign: "left",
        font: "inherit",
      }}
    >
      <Text variant="body" secondary>
        {label}
      </Text>
      {showChevron && <ChevronRight size={16} color={colors.textSecondary} />}
    </button>
  );
}
