import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Card, Text, useTheme, spacing, radius, palette, getTextColorFor } from '@noivos/ui';
import { useApiFetch } from '../lib/api';

interface Suggestion {
  categoryId: string;
  categoryName: string;
  suggestedAmount: number;
  rationale: string;
  currentPlannedAmount: number | null;
}

function pillStyle(filled: boolean, borderColor?: string) {
  return {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: filled ? palette.sourLime : 'transparent',
    borderWidth: 1,
    borderColor: filled ? palette.sourLime : borderColor,
  } as const;
}

export interface BudgetSuggestionsProps {
  // Lets the parent BudgetScreen refetch /api/budget once a suggestion is
  // applied — same "tell the parent to reload" pattern as the web twin.
  onApplied?: () => void;
}

// Mirrors apps/web's BudgetSuggestions.tsx (PRD §12.6, SE-82's last open
// piece) — a manual entry point, never fetched on mount: unlike every
// other real-data card in this app, a request here calls the real Claude
// API and costs real money, so it only ever fires on an explicit tap.
export function BudgetSuggestions({ onApplied }: BudgetSuggestionsProps) {
  const { colors } = useTheme();
  const apiFetch = useApiFetch();
  const [status, setStatus] = useState<'idle' | 'loading' | 'loaded'>('idle');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  async function handleSuggest() {
    setStatus('loading');
    setError(null);
    try {
      const res = await apiFetch('/api/ai/budget-suggestions', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(
          res.status === 402
            ? 'AI-suggested budget amounts is a Noivos Premium feature.'
            : (data.error ?? "Couldn't generate suggestions.")
        );
        setStatus('idle');
        return;
      }
      setSuggestions(data.suggestions ?? []);
      setAppliedIds(new Set());
      setStatus('loaded');
    } catch {
      setError("Couldn't reach the server — try again.");
      setStatus('idle');
    }
  }

  async function handleApply(s: Suggestion) {
    setApplyingId(s.categoryId);
    setError(null);
    try {
      const res = await apiFetch('/api/budget', {
        method: 'PATCH',
        body: { categoryAmounts: [{ categoryId: s.categoryId, plannedAmount: s.suggestedAmount }] },
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
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text variant="h3">AI-suggested amounts</Text>
          <Text variant="bodySmall" secondary style={{ marginTop: 2 }}>
            Suggestions based on your own recent spending — a starting point to plan next month from, not a rule.
          </Text>
        </View>
        <Pressable onPress={handleSuggest} disabled={status === 'loading'} role="button" style={pillStyle(true)}>
          <Text variant="bodySmall" color={getTextColorFor(palette.sourLime)} style={{ fontWeight: '600' }}>
            {status === 'loading' ? 'Thinking…' : 'Suggest amounts'}
          </Text>
        </Pressable>
      </View>

      {error && (
        <Text variant="bodySmall" style={{ color: colors.danger, marginTop: spacing.sm }}>
          {error}
        </Text>
      )}

      {status === 'loaded' && suggestions.length === 0 && !error && (
        <Text variant="bodySmall" secondary style={{ marginTop: spacing.sm }}>
          Not enough spending history yet to suggest from — check back after logging a bit more.
        </Text>
      )}

      {suggestions.length > 0 && (
        <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
          {suggestions.map((s) => {
            const applied = appliedIds.has(s.categoryId);
            return (
              <View
                key={s.categoryId}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: spacing.md,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                  paddingTop: spacing.sm,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text variant="body">
                    {s.categoryName} · ${s.suggestedAmount.toLocaleString()}
                    {s.currentPlannedAmount !== null && s.currentPlannedAmount !== s.suggestedAmount
                      ? ` (currently $${s.currentPlannedAmount.toLocaleString()})`
                      : ''}
                  </Text>
                  <Text variant="caption" secondary>
                    {s.rationale}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleApply(s)}
                  disabled={applyingId === s.categoryId || applied}
                  role="button"
                  style={pillStyle(false, colors.border)}
                >
                  <Text variant="bodySmall" style={{ fontWeight: '600', color: applied ? colors.textSecondary : colors.textPrimary }}>
                    {applied ? 'Applied' : applyingId === s.categoryId ? 'Applying…' : 'Apply'}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}
