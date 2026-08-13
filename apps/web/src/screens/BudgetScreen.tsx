import { useEffect, useRef, useState } from "react";
import { View, Pressable, TextInput } from "react-native";
import { Plus } from "lucide-react-native";
import { Card, OwnershipBadge, StackedProgressBar, Skeleton, Text, useTheme, spacing, radius, palette } from "@noivos/ui";
import { budgetSnapshot } from "../data/mockData";
import { ProgressRing } from "../components/ProgressRing";
import { ScreenGrid, ScreenGridWide } from "../components/ScreenLayout";

// A dedicated categorical set for the "Spending by category" chart below —
// NOT the same as packages/ui's calm UI-accent palette (sourLime/sourPunch/
// etc.), which fails the dataviz skill's categorical-chart validator badly
// when checked directly (too desaturated/narrow a lightness range for a
// chart mark — the opposite problem the *old* neon palette had, which is
// why a dedicated chart-safe shade existed for the Goals contributor chart
// too). Derived and validated specifically for this chart via
// scripts/validate_palette.js against this app's actual dark (#221F17) and
// light (#FFFFFF) card surfaces — all six categorical checks pass in both
// modes, including the adjacent-pair CVD floor (a stacked bar only needs
// adjacent pairs distinct, not all-pairs). Order is fixed and load-bearing:
// re-running the validator on a 5-hue reorder is required before changing
// it, not just picking colors that individually "look fine."
// Exported so the marketing landing page's product-preview mockup
// (components/marketing/ProductPreview.tsx) can reuse this exact validated
// set for its own "spending by category" bar instead of inventing/
// re-validating a second one.
export const BUDGET_CATEGORY_COLORS = ["#C36E42", "#3D71AC", "#2F8F6C", "#B08A28", "#8A5FB0"];

interface ApiCategory {
  id: string;
  name: string;
  shared: boolean;
  planned: number;
  spent: number;
}

interface ApiBudget {
  month: string;
  planned: number;
  spent: number;
  categories: ApiCategory[];
}

// Real data as of 2026-08-05, same fetch-then-fallback posture as every
// other real-data slice this session: /api/budget bootstraps a first-time
// user's categories/budget from the same defaults budgetSnapshot used, so
// the real version looks like the mock instead of starting empty. Falls
// back to the mock snapshot if the backend isn't reachable. No new
// migration was needed — the budgets/categories/transactions schema and its
// RLS policies were already part of 0001_init.sql/0002_rls.sql, just unused
// until now.
//
// Loading state history, 2026-08-11 to 2026-08-13: this screen used to
// gate its whole render behind a bare "Loading…" text row until the fetch
// resolved. That was removed on the theory that it was pure friction, in
// favor of showing `budget`'s mock fallback immediately — but that traded
// one real problem for a worse one: a real, signed-in user with a working
// backend now saw an actual flash of WRONG numbers (the mock ones) before
// the correct ones replaced them a moment later, on every load (confirmed
// via production runtime logs — the real fetch genuinely succeeds, it
// just isn't instant). `resolved` restores the gate, but the loading state
// itself is now a neutral <Skeleton> shaped like the real layout rather
// than either a bare loading line or fabricated numbers — the middle
// ground that satisfies both complaints. See Skeleton.tsx.
export function BudgetScreen() {
  const { colors } = useTheme();

  const [resolved, setResolved] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [apiBudget, setApiBudget] = useState<ApiBudget | null>(null);

  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({});
  const [merchantDrafts, setMerchantDrafts] = useState<Record<string, string>>({});
  const [submittingFor, setSubmittingFor] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Guards two distinct races (found 2026-08-13, same audit pass that
  // built the Skeleton-gating above but missed hardening this specific
  // function at the time): unlike every sibling screen's fetch effect
  // (HomeScreen's six, GoalsScreen's two), loadBudget() had no
  // cancellation guard at all, and it's called from two places — the
  // mount effect below, and handleAddExpense's post-save refetch — so a
  // request token beats a simple boolean flag here.
  // 1. Unmount: AppShell swaps ActiveScreen wholesale on tab switch,
  //    unmounting this screen entirely. Without a guard, a slow /api/budget
  //    response that resolves after the user has already clicked away
  //    calls setState on an unmounted component (a real React warning/leak).
  // 2. Out-of-order responses: two expenses logged to two different
  //    categories in quick succession (each category's add-form is only
  //    gated by its own submittingFor === c.id, so two concurrent adds are
  //    possible) fire two overlapping loadBudget() GETs whose responses can
  //    arrive in either order — without a token, whichever resolves last
  //    wins even if it was fired first, silently overwriting a fresher
  //    budget snapshot with a staler one.
  const loadRequestRef = useRef(0);

  function loadBudget() {
    const requestId = ++loadRequestRef.current;
    fetch("/api/budget")
      .then(async (res) => {
        if (!res.ok) throw new Error("budget fetch failed");
        return res.json() as Promise<ApiBudget>;
      })
      .then((data) => {
        if (loadRequestRef.current !== requestId) return;
        setBackendAvailable(true);
        setApiBudget(data);
      })
      .catch(() => {
        // No database/Clerk reachable — fall back to the mock snapshot below.
      })
      .finally(() => {
        if (loadRequestRef.current === requestId) setResolved(true);
      });
  }

  useEffect(() => {
    loadBudget();
    return () => {
      // Unmounting invalidates any in-flight request — bump past whatever
      // requestId it captured so its .then()/.finally() become no-ops.
      loadRequestRef.current += 1;
    };
  }, []);

  async function handleAddExpense(categoryId: string) {
    const amount = Number(amountDrafts[categoryId] ?? "");
    if (!Number.isFinite(amount) || amount <= 0) {
      setErrors((prev) => ({ ...prev, [categoryId]: "Enter an amount greater than $0." }));
      return;
    }
    setSubmittingFor(categoryId);
    setErrors((prev) => ({ ...prev, [categoryId]: "" }));
    try {
      const res = await fetch("/api/budget/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, amount, merchantName: merchantDrafts[categoryId] || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors((prev) => ({ ...prev, [categoryId]: data.error ?? "Couldn't record that expense." }));
        return;
      }
      setAmountDrafts((prev) => ({ ...prev, [categoryId]: "" }));
      setMerchantDrafts((prev) => ({ ...prev, [categoryId]: "" }));
      setAddingFor(null);
      loadBudget(); // Refetch so "spent" reflects the real new total.
    } catch {
      setErrors((prev) => ({ ...prev, [categoryId]: "Couldn't reach the server — try again." }));
    } finally {
      setSubmittingFor(null);
    }
  }

  const budget: { month: string; planned: number; spent: number; categories: ApiCategory[] } =
    backendAvailable && apiBudget
      ? apiBudget
      : {
          month: budgetSnapshot.month,
          planned: budgetSnapshot.planned,
          spent: budgetSnapshot.spent,
          categories: budgetSnapshot.categories.map((c) => ({ id: c.name, ...c })),
        };

  const overallPercent = budget.planned > 0 ? (budget.spent / budget.planned) * 100 : 0;
  const overallOver = overallPercent > 100;

  const categoryBreakdown = budget.categories.map((c, i) => ({
    name: c.name,
    amount: c.spent,
    color: BUDGET_CATEGORY_COLORS[i % BUDGET_CATEGORY_COLORS.length],
  }));
  // Denominator is the sum of category spends, not budget.spent — the mock
  // snapshot's top-level "spent" doesn't exactly equal the sum of its
  // category spends (a pre-existing inconsistency in the mock data), which
  // would make the stacked bar overflow past 100% width. The real /api/budget
  // data doesn't have this problem (its "spent" IS that sum), but computing
  // it locally keeps the chart correct either way.
  const totalCategorySpend = categoryBreakdown.reduce((sum, c) => sum + c.amount, 0);

  if (!resolved) {
    return (
      <ScreenGrid>
        <ScreenGridWide>
          <Skeleton width="30%" height={30} />
          <Skeleton width="45%" height={14} style={{ marginTop: spacing.sm }} />
        </ScreenGridWide>
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <Skeleton width="50%" height={18} />
            <Skeleton height={8} radiusSize={999} style={{ marginTop: spacing.md }} />
          </Card>
        ))}
      </ScreenGrid>
    );
  }

  return (
    <ScreenGrid>
      <ScreenGridWide>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: spacing.lg,
          }}
        >
          <View>
            <Text variant="h1">Budget</Text>
            <Text variant="body" secondary>
              {budget.month} · zero-based
            </Text>
          </View>
          <ProgressRing
            percent={overallPercent}
            color={overallOver ? palette.citrus : palette.sourLime}
            label="of budget used"
            sublabel={`$${budget.spent.toLocaleString()} of $${budget.planned.toLocaleString()}`}
          />
        </View>
      </ScreenGridWide>

      {totalCategorySpend > 0 && (
        <ScreenGridWide>
          <Card>
            <Text variant="h3" style={{ marginBottom: spacing.md }}>
              Spending by category
            </Text>
            <StackedProgressBar contributors={categoryBreakdown} target={totalCategorySpend} height={14} />
            {/* Direct labels + a legend, not color alone — the category
                cards below already give a full accessible breakdown, this
                is a compact visual summary of the same numbers. */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.md }}>
              {categoryBreakdown.map((c) => (
                <View key={c.name} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: c.color }} />
                  <Text variant="bodySmall" secondary>
                    {c.name} · ${c.amount.toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        </ScreenGridWide>
      )}

      {budget.categories.map((c) => {
        const over = c.spent > c.planned;
        const pct = c.planned > 0 ? Math.min((c.spent / c.planned) * 100, 100) : 0;
        const isAdding = addingFor === c.id;
        return (
          <Card key={c.id}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text variant="h3">{c.name}</Text>
              {/* No partnerName — this rendered "Shared with Marcus" for
                  every real user regardless of who their actual partner is
                  (this component's used for both the mock fallback and real
                  /api/budget data, and there's no real-partner-name fetch
                  here to plug in instead). Same convention as GoalsScreen's
                  OwnershipBadge: falls back to a plain "Shared" label
                  rather than showing a name that might be wrong. */}
              <OwnershipBadge shared={c.shared} />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xs }}>
              <Text variant="bodySmall" secondary>
                ${c.spent.toLocaleString()} spent
              </Text>
              <Text variant="bodySmall" color={over ? palette.citrus : colors.textSecondary}>
                {over ? `$${(c.spent - c.planned).toLocaleString()} over` : `$${(c.planned - c.spent).toLocaleString()} left`}
              </Text>
            </View>
            <View style={{ height: 8, borderRadius: 999, backgroundColor: colors.border, marginTop: spacing.sm, overflow: "hidden" }}>
              <View
                style={{
                  height: "100%",
                  width: `${pct}%`,
                  backgroundColor: over ? palette.citrus : palette.sourLime,
                }}
              />
            </View>

            {backendAvailable && (
              <>
                {!isAdding ? (
                  <Pressable
                    onPress={() => setAddingFor(c.id)}
                    role="button"
                    style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.sm }}
                  >
                    <Plus size={14} color={palette.sourLime} aria-hidden={true} />
                    <Text variant="bodySmall" color={palette.sourLime}>
                      Log an expense
                    </Text>
                  </Pressable>
                ) : (
                  <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
                    <View style={{ flexDirection: "row", gap: spacing.sm }}>
                      <TextInput
                        value={amountDrafts[c.id] ?? ""}
                        onChangeText={(v) => setAmountDrafts((prev) => ({ ...prev, [c.id]: v }))}
                        placeholder="Amount"
                        placeholderTextColor={colors.textSecondary}
                        aria-label={`Expense amount for ${c.name}`}
                        keyboardType="numeric"
                        style={{
                          flex: 1,
                          borderWidth: 1,
                          borderColor: colors.border,
                          borderRadius: radius.medium,
                          padding: 8,
                          color: colors.textPrimary,
                          fontSize: 13,
                        }}
                      />
                      <TextInput
                        value={merchantDrafts[c.id] ?? ""}
                        onChangeText={(v) => setMerchantDrafts((prev) => ({ ...prev, [c.id]: v }))}
                        placeholder="Merchant (optional)"
                        placeholderTextColor={colors.textSecondary}
                        aria-label={`Merchant name for this ${c.name} expense (optional)`}
                        style={{
                          flex: 1,
                          borderWidth: 1,
                          borderColor: colors.border,
                          borderRadius: radius.medium,
                          padding: 8,
                          color: colors.textPrimary,
                          fontSize: 13,
                        }}
                      />
                    </View>
                    {errors[c.id] ? (
                      <Text variant="caption" color={palette.citrus}>
                        {errors[c.id]}
                      </Text>
                    ) : null}
                    <View style={{ flexDirection: "row", gap: spacing.sm }}>
                      <Pressable
                        onPress={() => handleAddExpense(c.id)}
                        disabled={submittingFor === c.id}
                        role="button"
                        style={{
                          paddingVertical: 8,
                          paddingHorizontal: 14,
                          borderRadius: radius.pill,
                          backgroundColor: palette.sourLime,
                        }}
                      >
                        <Text variant="bodySmall" color={palette.licorice} style={{ fontWeight: "600" }}>
                          {submittingFor === c.id ? "Saving…" : "Save"}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setAddingFor(null)}
                        role="button"
                        style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border }}
                      >
                        <Text variant="bodySmall">Cancel</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </>
            )}
          </Card>
        );
      })}
    </ScreenGrid>
  );
}
