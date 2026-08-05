import { useEffect, useState } from "react";
import { View, Pressable, TextInput } from "react-native";
import { Plus } from "lucide-react-native";
import { Card, OwnershipBadge, Text, useTheme, spacing, radius, palette } from "@noivos/ui";
import { budgetSnapshot } from "../data/mockData";
import { ProgressRing } from "../components/ProgressRing";
import { ScreenGrid, ScreenGridWide } from "../components/ScreenLayout";

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
export function BudgetScreen() {
  const { colors } = useTheme();

  const [loaded, setLoaded] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [apiBudget, setApiBudget] = useState<ApiBudget | null>(null);

  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({});
  const [merchantDrafts, setMerchantDrafts] = useState<Record<string, string>>({});
  const [submittingFor, setSubmittingFor] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function loadBudget() {
    fetch("/api/budget")
      .then(async (res) => {
        if (!res.ok) throw new Error("budget fetch failed");
        return res.json() as Promise<ApiBudget>;
      })
      .then((data) => {
        setBackendAvailable(true);
        setApiBudget(data);
      })
      .catch(() => {
        // No database/Clerk reachable — fall back to the mock snapshot below.
      })
      .finally(() => {
        setLoaded(true);
      });
  }

  useEffect(() => {
    loadBudget();
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

  if (!loaded) {
    return (
      <ScreenGrid>
        <ScreenGridWide>
          <Text variant="body" secondary>
            Loading your Budget…
          </Text>
        </ScreenGridWide>
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

      {budget.categories.map((c) => {
        const over = c.spent > c.planned;
        const pct = c.planned > 0 ? Math.min((c.spent / c.planned) * 100, 100) : 0;
        const isAdding = addingFor === c.id;
        return (
          <Card key={c.id}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text variant="h3">{c.name}</Text>
              <OwnershipBadge shared={c.shared} partnerName="Marcus" />
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
                    style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.sm }}
                  >
                    <Plus size={14} color={palette.sourLime} />
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
