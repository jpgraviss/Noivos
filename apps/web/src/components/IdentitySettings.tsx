"use client";

import { useState, type CSSProperties } from "react";
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

// Not persisted anywhere yet — there's no database connected (mock-data
// phase, see PROJECT_MEMORY.md §8). This is deliberately built as a working
// UI ahead of that: local component state only, so it resets on reload.
// Once set, name + birthdate lock (both are used for identity verification
// ahead of Plaid integration); changing either after that is meant to
// require admin approval — there's no admin system built yet either, so
// "Request a change" only shows an explanatory note rather than sending
// anything real anywhere.
export function IdentitySettings({ defaultName }: { defaultName?: string }) {
  const { colors } = useTheme();
  const [saved, setSaved] = useState<Identity | null>(null);
  const [nameDraft, setNameDraft] = useState(defaultName ?? "");
  const [birthdateDraft, setBirthdateDraft] = useState("");
  const [requestNoteVisible, setRequestNoteVisible] = useState(false);

  const locked = saved !== null;
  const canSave = nameDraft.trim().length > 0 && birthdateDraft.length > 0;

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
          style={inputStyle(colors.border, colors.textPrimary, locked)}
        />
      </div>

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
          onClick={() => canSave && setSaved({ name: nameDraft.trim(), birthdate: birthdateDraft })}
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
          Save (one-time)
        </button>
      )}
    </Card>
  );
}
