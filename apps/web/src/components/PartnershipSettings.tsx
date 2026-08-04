"use client";

import { useState } from "react";
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

// Previously these three rows (You & Marcus / Invite settings / Disconnect
// Partnership) had no onClick at all — nothing happened when tapped. This
// makes each one actually do something, still against local state only
// (no Partnership backend/invite-email service exists yet — see
// PROJECT_MEMORY.md §8): inviting shows an honest "not wired up yet" note
// instead of pretending to send an email, and disconnecting is real local
// state that flips the UI to a "not connected" state, matching the
// approved disconnect/frozen-history product decision (PRD/PROJECT_MEMORY
// §4) even though there's no data to actually freeze yet.
export function PartnershipSettings() {
  const { colors } = useTheme();
  const [connected, setConnected] = useState(true);
  const [view, setView] = useState<View>("summary");
  const [inviteInput, setInviteInput] = useState("");
  const [inviteSentTo, setInviteSentTo] = useState<string | null>(null);

  function handleDisconnect() {
    setConnected(false);
    setInviteSentTo(null);
    setView("summary");
  }

  function handleSendInvite() {
    if (!inviteInput.trim()) return;
    setInviteSentTo(inviteInput.trim());
  }

  return (
    <Card>
      <Text variant="h3" style={{ marginBottom: spacing.sm }}>
        Partnership
      </Text>

      {view === "summary" && (
        <>
          <Row
            label={connected ? `You & ${currentUser.partnerName}` : "Not connected to a partner"}
            onPress={() => setView(connected ? "summary" : "invite")}
            colors={colors}
            showChevron={!connected}
          />
          <Row label="Invite settings" onPress={() => setView("invite")} colors={colors} />
          {connected && (
            <Row label="Disconnect Partnership" onPress={() => setView("disconnect-confirm")} colors={colors} />
          )}
        </>
      )}

      {view === "invite" && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <Text variant="bodySmall" secondary style={{ marginBottom: spacing.sm }}>
            {connected
              ? `Already connected to ${currentUser.partnerName}. Send another invite if you'd like them to have their own login.`
              : "Invite your partner by email — they'll get their own account, connected to yours."}
          </Text>
          {inviteSentTo ? (
            <Text variant="bodySmall" style={{ color: palette.sourLime, marginBottom: spacing.sm }}>
              Would send an invite to {inviteSentTo} — no invite-email service is wired up yet, so nothing was
              actually sent.
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
          <div style={{ display: "flex", gap: spacing.sm }}>
            {!inviteSentTo && (
              <button
                onClick={handleSendInvite}
                disabled={!inviteInput.trim()}
                style={{
                  ...pillButtonStyle(palette.sourLime, getTextColorFor(palette.sourLime)),
                  backgroundColor: inviteInput.trim() ? palette.sourLime : colors.border,
                  border: "none",
                  cursor: inviteInput.trim() ? "pointer" : "not-allowed",
                }}
              >
                Send invite
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
            You&apos;ll keep frozen, read-only access to your shared history with {currentUser.partnerName}. Nothing
            new will sync between you going forward. This can&apos;t be undone from here.
          </Text>
          <div style={{ display: "flex", gap: spacing.sm }}>
            <button
              onClick={handleDisconnect}
              style={{ ...pillButtonStyle(palette.sourPunch, getTextColorFor(palette.sourPunch)), backgroundColor: palette.sourPunch, border: "none" }}
            >
              Disconnect
            </button>
            <button onClick={() => setView("summary")} style={pillButtonStyle(colors.border, colors.textPrimary)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {!connected && view === "summary" && (
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

