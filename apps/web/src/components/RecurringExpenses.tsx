"use client";

import { useEffect, useState } from "react";
import { Card, Text, useTheme, spacing, radius, palette, getTextColorFor } from "@noivos/ui";

interface Confirmed {
  id: string;
  merchantName: string;
  amount: number;
  frequency: string;
  nextDueDate: string | null;
  isShared: boolean;
}

interface Candidate {
  merchantName: string;
  occurrences: number;
  avgAmount: number;
  lastAmount: number;
  frequency: string;
}

function pillButtonStyle(borderColor: string, textColor: string) {
  return {
    padding: "6px 12px",
    borderRadius: radius.pill,
    border: `1px solid ${borderColor}`,
    backgroundColor: "transparent",
    color: textColor,
    fontFamily: "var(--font-inter)",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer" as const,
  };
}

// Recurring expense detection & management (PRD §12.5, SE-77) — confirmed
// expenses come from real transaction history GET /api/recurring-expenses
// already reconciled server-side; candidates are merchants it noticed
// recur often enough but aren't tracked yet. "Track this" turns a
// candidate into a real recurring_expenses row in one tap — no manual-add
// form in this pass, since detection (not hand-entry) is the point of this
// feature; a manual-add path can follow later if a merchant never
// generates enough transaction history to be detected on its own.
export function RecurringExpenses() {
  const { colors } = useTheme();
  const [loaded, setLoaded] = useState(false);
  const [confirmed, setConfirmed] = useState<Confirmed[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [workingOn, setWorkingOn] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Plain async function, reused by the confirm/remove handlers below to
  // refresh after a write — but the initial mount load is its own inline
  // effect (not a call to this) with a cancelled-on-unmount guard, same
  // convention as every other real-data card in this app, since calling a
  // setState-triggering async function directly from an effect body risks
  // a cascading-render lint error without that guard in place.
  async function load() {
    try {
      const res = await fetch("/api/recurring-expenses");
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setConfirmed(data.confirmed ?? []);
      setCandidates(data.candidates ?? []);
    } catch {
      // No database/Clerk reachable — this card just stays empty, same
      // graceful-passthrough posture as every other real-data card.
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/recurring-expenses")
      .then(async (res) => {
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setConfirmed(data.confirmed ?? []);
        setCandidates(data.candidates ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleTrack(candidate: Candidate) {
    setWorkingOn(candidate.merchantName);
    setError(null);
    try {
      const res = await fetch("/api/recurring-expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantName: candidate.merchantName,
          amount: candidate.lastAmount,
          frequency: candidate.frequency,
          isShared: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't track that.");
        return;
      }
      await load();
    } catch {
      setError("Couldn't reach the server — try again.");
    } finally {
      setWorkingOn(null);
    }
  }

  async function handleRemove(id: string) {
    setWorkingOn(id);
    setError(null);
    try {
      const res = await fetch(`/api/recurring-expenses/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Couldn't remove that.");
        return;
      }
      await load();
    } catch {
      setError("Couldn't reach the server — try again.");
    } finally {
      setWorkingOn(null);
    }
  }

  if (!loaded) {
    return (
      <Card>
        <Text variant="h3" style={{ marginBottom: 4 }}>
          Recurring Expenses
        </Text>
        <Text variant="bodySmall" secondary>
          Loading…
        </Text>
      </Card>
    );
  }

  if (confirmed.length === 0 && candidates.length === 0) {
    return null;
  }

  return (
    <Card>
      <Text variant="h3" style={{ marginBottom: spacing.sm }}>
        Recurring Expenses
      </Text>

      {error && (
        <Text variant="bodySmall" style={{ color: colors.danger, marginBottom: spacing.sm }}>
          {error}
        </Text>
      )}

      {confirmed.map((r) => (
        <div
          key={r.id}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${colors.border}`, padding: `${spacing.sm}px 0` }}
        >
          <div>
            <Text variant="body">{r.merchantName}</Text>
            <Text variant="caption" secondary>
              ${r.amount.toLocaleString()} / {r.frequency}
              {r.nextDueDate ? ` — next ~${r.nextDueDate}` : ""}
            </Text>
          </div>
          <button onClick={() => handleRemove(r.id)} disabled={workingOn === r.id} style={pillButtonStyle(colors.border, colors.textSecondary)}>
            {workingOn === r.id ? "Removing…" : "Stop tracking"}
          </button>
        </div>
      ))}

      {candidates.length > 0 && (
        <div style={{ marginTop: confirmed.length > 0 ? spacing.md : 0 }}>
          <Text variant="caption" secondary style={{ marginBottom: spacing.sm }}>
            Detected for you — not tracked yet
          </Text>
          {candidates.map((c) => (
            <div
              key={c.merchantName}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `${spacing.sm}px 0`, borderTop: `1px solid ${colors.border}` }}
            >
              <div>
                <Text variant="body">{c.merchantName}</Text>
                <Text variant="caption" secondary>
                  ~${c.avgAmount.toLocaleString()} / {c.frequency} · seen {c.occurrences}x
                </Text>
              </div>
              <button
                onClick={() => handleTrack(c)}
                disabled={workingOn === c.merchantName}
                style={{ ...pillButtonStyle(palette.sourLime, getTextColorFor(palette.sourLime)), backgroundColor: palette.sourLime, border: "none" }}
              >
                {workingOn === c.merchantName ? "Tracking…" : "Track this"}
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
