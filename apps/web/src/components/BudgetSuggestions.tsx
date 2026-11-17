"use client";

import { useState } from "react";
import { Card, Text, useTheme, spacing, radius, palette, getTextColorFor } from "@noivos/ui";

interface Suggestion {
  categoryId: string;
  categoryName: string;
  suggestedAmount: number;
  rationale: string;
  currentPlannedAmount: number | null;
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

export interface BudgetSuggestionsProps {
  // Lets the parent BudgetScreen refetch /api/budget once a suggestion is
  // applied, so the category card's own planned/left numbers update —
  // same "tell the parent to reload rather than duplicate its state"
  // pattern as every other write action on that screen.
  onApplied?: () => void;
}

// AI-suggested budget amounts (PRD §12.6, SE-82's last open piece) — a
// manual entry point (the UX blueprint's own phrasing), never fetched
// automatically on mount like every other real-data card in this app:
// unlike those, a request here calls the real Claude API and costs real
// money, so it only ever fires on an explicit tap. Mirrors
// RecurringExpenses.tsx's "detected, not yet confirmed" card shape, but
// "confirming" here means writing straight to budget_categories.planned_amount
// (via PATCH /api/budget) rather than creating a new row.
export function BudgetSuggestions({ onApplied }: BudgetSuggestionsProps) {
  const { colors } = useTheme();
  const [status, setStatus] = useState<"idle" | "loading" | "loaded">("idle");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  async function handleSuggest() {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/ai/budget-suggestions", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(
          res.status === 402
            ? "AI-suggested budget amounts is a Noivos Premium feature."
            : (data.error ?? "Couldn't generate suggestions.")
        );
        setStatus("idle");
        return;
      }
      setSuggestions(data.suggestions ?? []);
      setAppliedIds(new Set());
      setStatus("loaded");
    } catch {
      setError("Couldn't reach the server — try again.");
      setStatus("idle");
    }
  }

  async function handleApply(s: Suggestion) {
    setApplyingId(s.categoryId);
    setError(null);
    try {
      const res = await fetch("/api/budget", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryAmounts: [{ categoryId: s.categoryId, plannedAmount: s.suggestedAmount }] }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't apply that suggestion.");
        return;
      }
      setAppliedIds((prev) => new Set(prev).add(s.categoryId));
      onApplied?.();
    } catch {
      setError("Couldn't reach the server — try again.");
    } finally {
      setApplyingId(null);
    }
  }

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md }}>
        <div>
          <Text variant="h3">AI-suggested amounts</Text>
          <Text variant="bodySmall" secondary style={{ marginTop: 2 }}>
            Suggestions based on your own recent spending — a starting point to plan next month from, not a rule.
          </Text>
        </div>
        <button
          onClick={handleSuggest}
          disabled={status === "loading"}
          style={{ ...pillButtonStyle(palette.sourLime, getTextColorFor(palette.sourLime)), backgroundColor: palette.sourLime, border: "none", whiteSpace: "nowrap" }}
        >
          {status === "loading" ? "Thinking…" : "Suggest amounts"}
        </button>
      </div>

      {error && (
        <Text variant="bodySmall" style={{ color: colors.danger, marginTop: spacing.sm }}>
          {error}
        </Text>
      )}

      {status === "loaded" && suggestions.length === 0 && !error && (
        <Text variant="bodySmall" secondary style={{ marginTop: spacing.sm }}>
          Not enough spending history yet to suggest from — check back after logging a bit more.
        </Text>
      )}

      {suggestions.length > 0 && (
        <div style={{ marginTop: spacing.md }}>
          {suggestions.map((s) => {
            const applied = appliedIds.has(s.categoryId);
            return (
              <div
                key={s.categoryId}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: spacing.md, borderTop: `1px solid ${colors.border}`, padding: `${spacing.sm}px 0` }}
              >
                <div style={{ flex: 1 }}>
                  <Text variant="body">
                    {s.categoryName} · ${s.suggestedAmount.toLocaleString()}
                    {s.currentPlannedAmount !== null && s.currentPlannedAmount !== s.suggestedAmount && (
                      <Text variant="caption" secondary>
                        {" "}
                        (currently ${s.currentPlannedAmount.toLocaleString()})
                      </Text>
                    )}
                  </Text>
                  <Text variant="caption" secondary>
                    {s.rationale}
                  </Text>
                </div>
                <button
                  onClick={() => handleApply(s)}
                  disabled={applyingId === s.categoryId || applied}
                  style={pillButtonStyle(colors.border, applied ? colors.textSecondary : colors.textPrimary)}
                >
                  {applied ? "Applied" : applyingId === s.categoryId ? "Applying…" : "Apply"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
