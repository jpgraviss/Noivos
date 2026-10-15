"use client";

import { useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { Card, Text, useTheme, spacing, radius, palette, getTextColorFor } from "@noivos/ui";

type View = "summary" | "confirm";

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

// The UI half of SE-81 — POST /api/account/delete does the real work (see
// that route + lib/accountDeletion.ts for exactly what's deleted vs. kept
// as a Partnership keepsake). Typing "DELETE" to confirm, not just a second
// button tap, matches how destructive this specific action is relative to
// everything else in Settings (disconnecting a Partnership is reversible
// by re-inviting; this isn't reversible at all).
export function DeleteAccountSettings() {
  const { colors } = useTheme();
  const { signOut } = useClerk();

  const [view, setView] = useState<View>("summary");
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: confirmText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't delete your account.");
        return;
      }
      await signOut({ redirectUrl: "/" });
    } catch {
      setError("Couldn't reach the server — try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card>
      <Text variant="h3" style={{ marginBottom: spacing.sm, color: colors.danger }}>
        Delete Account
      </Text>

      {view === "summary" && (
        <>
          <Text variant="bodySmall" secondary style={{ marginBottom: spacing.sm }}>
            Permanently deletes your profile, personal accounts, transactions, goals, budgets, AI conversation
            history, and anything else that&apos;s yours alone. Anything shared with a partner is kept for them,
            exactly like disconnecting a Partnership. This can&apos;t be undone.
          </Text>
          <button
            onClick={() => setView("confirm")}
            style={{ ...pillButtonStyle(palette.sourPunch, getTextColorFor(palette.sourPunch)), backgroundColor: palette.sourPunch, border: "none" }}
          >
            Delete my account
          </button>
        </>
      )}

      {view === "confirm" && (
        <div>
          <Text variant="bodySmall" secondary style={{ marginBottom: spacing.sm }}>
            This is permanent. Type <strong>DELETE</strong> below to confirm.
          </Text>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            aria-label='Type DELETE to confirm'
            style={{ ...inputStyle(colors.border, colors.textPrimary), marginBottom: spacing.sm }}
          />
          {error && (
            <Text variant="bodySmall" style={{ color: colors.danger, marginBottom: spacing.sm }}>
              {error}
            </Text>
          )}
          <div style={{ display: "flex", gap: spacing.sm }}>
            <button
              onClick={handleDelete}
              disabled={confirmText !== "DELETE" || deleting}
              style={{
                ...pillButtonStyle(palette.sourPunch, getTextColorFor(palette.sourPunch)),
                backgroundColor: confirmText === "DELETE" ? palette.sourPunch : colors.border,
                border: "none",
                cursor: confirmText === "DELETE" && !deleting ? "pointer" : "not-allowed",
              }}
            >
              {deleting ? "Deleting…" : "Permanently delete"}
            </button>
            {/* disabled={deleting} — same Cancel-vs-in-flight-save guard as
                PartnershipSettings' disconnect-confirm (SE-59's bug class):
                without it, Cancel during the request would hide this view
                while the delete + sign-out still completed moments later. */}
            <button onClick={() => setView("summary")} disabled={deleting} style={pillButtonStyle(colors.border, colors.textPrimary)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
