"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Card, Text, useTheme, spacing, radius, palette, getTextColorFor } from "@noivos/ui";

interface Identity {
  name: string;
  birthdate: string; // ISO yyyy-mm-dd, from <input type="date">
}

function inputStyle(borderColor: string, textColor: string, locked: boolean): CSSProperties {
  return {
    width: "100%",
    padding: "10px 14px",
    borderRadius: radius.medium,
    border: `1px solid ${borderColor}`,
    backgroundColor: "transparent",
    color: textColor,
    fontFamily: "var(--font-inter)",
    fontSize: 14,
    opacity: locked ? 0.7 : 1,
  };
}

// Persists via /api/profile (Neon, behind Clerk auth + RLS — see
// src/lib/db.ts) as of 2026-08-03. Falls back to local-component-state-only
// behavior if that route isn't reachable (Clerk not configured, signed out,
// or any other failure) — same graceful-passthrough posture used everywhere
// else in this app, so the dev/no-backend path never breaks.
// Once set, name + birthdate lock (both are used for identity verification
// ahead of Plaid integration) — enforced server-side in the route itself,
// not just by disabling this input. Changing either after that is meant to
// require admin approval; there's no admin system built yet, so "Request a
// change" only shows an explanatory note rather than sending anything real.
export function IdentitySettings({ defaultName }: { defaultName?: string }) {
  const { colors } = useTheme();
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState<Identity | null>(null);
  const [nameDraft, setNameDraft] = useState(defaultName ?? "");
  const [birthdateDraft, setBirthdateDraft] = useState("");
  const [requestNoteVisible, setRequestNoteVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile")
      .then(async (res) => {
        if (!res.ok) throw new Error("profile fetch failed");
        return res.json() as Promise<{ name: string | null; birthdate: string | null }>;
      })
      .then((data) => {
        if (cancelled) return;
        setBackendAvailable(true);
        if (data.name && data.birthdate) {
          setSaved({ name: data.name, birthdate: data.birthdate });
        } else if (data.name) {
          setNameDraft(data.name);
        }
      })
      .catch(() => {
        // No database/Clerk/route available — fall back to local-only.
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const locked = saved !== null;
  const canSave = nameDraft.trim().length > 0 && birthdateDraft.length > 0 && !saving;

  async function handleSave() {
    if (!canSave) return;
    setError(null);

    if (!backendAvailable) {
      setSaved({ name: nameDraft.trim(), birthdate: birthdateDraft });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameDraft.trim(), birthdate: birthdateDraft }),
      });
      const data = await res.json();
      if (res.status === 409) {
        // Already set (e.g. saved from another tab) — reload the real value.
        const refetch = await fetch("/api/profile").then((r) => r.json());
        if (refetch.name && refetch.birthdate) {
          setSaved({ name: refetch.name, birthdate: refetch.birthdate });
        }
        setError("This was already saved — showing what's on file.");
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Something went wrong saving this.");
        return;
      }
      setSaved({ name: data.name, birthdate: data.birthdate });
    } catch {
      setError("Couldn't reach the server — check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return (
      <Card>
        <Text variant="h3" style={{ marginBottom: 4 }}>
          Name &amp; Birthdate
        </Text>
        <Text variant="bodySmall" secondary>
          Loading…
        </Text>
      </Card>
    );
  }

  return (
    <Card>
      <Text variant="h3" style={{ marginBottom: 4 }}>
        Name &amp; Birthdate
      </Text>
      <Text variant="bodySmall" secondary style={{ marginBottom: spacing.md }}>
        {locked
          ? "Locked for identity verification. Changing it needs admin approval."
          : "Used to verify your identity — double-check it, this can only be set once."}
      </Text>

      <div style={{ marginBottom: spacing.md }}>
        <Text variant="caption" secondary style={{ marginBottom: 4 }}>
          Full name
        </Text>
        <input
          type="text"
          value={locked ? saved.name : nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          disabled={locked}
          placeholder="Your full legal name"
          aria-label="Full name"
          style={inputStyle(colors.border, colors.textPrimary, locked)}
        />
      </div>

      <div style={{ marginBottom: spacing.lg }}>
        <Text variant="caption" secondary style={{ marginBottom: 4 }}>
          Birthdate
        </Text>
        <input
          type="date"
          value={locked ? saved.birthdate : birthdateDraft}
          onChange={(e) => setBirthdateDraft(e.target.value)}
          disabled={locked}
          aria-label="Birthdate"
          style={inputStyle(colors.border, colors.textPrimary, locked)}
        />
      </div>

      {error && (
        <Text variant="bodySmall" style={{ color: palette.sourPunch, marginBottom: spacing.sm }}>
          {error}
        </Text>
      )}

      {locked ? (
        <>
          <button
            onClick={() => setRequestNoteVisible(true)}
            style={{
              padding: "10px 16px",
              borderRadius: radius.pill,
              border: `1px solid ${colors.border}`,
              backgroundColor: "transparent",
              color: colors.textPrimary,
              fontFamily: "var(--font-inter)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Request a change
          </button>
          {requestNoteVisible && (
            <Text variant="caption" secondary style={{ marginTop: spacing.sm }}>
              Change requests aren&apos;t reviewed yet — there&apos;s no admin system built for this. This button will
              actually notify an admin once that exists.
            </Text>
          )}
        </>
      ) : (
        <button
          onClick={handleSave}
          disabled={!canSave}
          style={{
            padding: "10px 16px",
            borderRadius: radius.pill,
            border: "none",
            backgroundColor: canSave ? palette.sourLime : colors.border,
            color: canSave ? getTextColorFor(palette.sourLime) : colors.textSecondary,
            fontFamily: "var(--font-inter)",
            fontSize: 13,
            fontWeight: 600,
            cursor: canSave ? "pointer" : "not-allowed",
          }}
        >
          {saving ? "Saving…" : "Save (one-time)"}
        </button>
      )}
    </Card>
  );
}
