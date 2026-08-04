import { useEffect, useState } from "react";
import { View, Pressable, TextInput } from "react-native";
import { Circle, CircleCheck, Plus } from "lucide-react-native";
import { Card, OwnershipBadge, StackedProgressBar, Text, useTheme, spacing, radius, palette } from "@noivos/ui";
import { goals as mockGoals, weddingDetails } from "../data/mockData";
import { ScreenGrid, ScreenGridWide } from "../components/ScreenLayout";

// Validated chart-safe categorical colors (see PROJECT_MEMORY.md's dashboard-
// redesign entry — raw Sour Lime fails the dataviz skill's lightness-band
// check for a categorical mark). Rotated per distinct contributor.
const CONTRIBUTOR_COLORS = ["#638C00", palette.sourPunch, palette.grape, palette.electricBlue];

interface ApiContribution {
  id: string;
  contributorId: string;
  contributorName: string;
  amount: number;
  date: string;
  note: string | null;
}

interface ApiGoal {
  id: string;
  name: string;
  goalType: string;
  targetAmount: number;
  targetDate: string | null;
  contributions: ApiContribution[];
}

interface DisplayGoal {
  id: string;
  name: string;
  target: number;
  shared: boolean;
  contributors: { name: string; amount: number; color: string }[];
}

function toDisplayGoal(g: ApiGoal): DisplayGoal {
  const contributorIds = Array.from(new Set(g.contributions.map((c) => c.contributorId)));
  const contributors = contributorIds.map((id, idx) => {
    const rows = g.contributions.filter((c) => c.contributorId === id);
    return {
      name: rows[0].contributorName,
      amount: rows.reduce((s, c) => s + c.amount, 0),
      color: CONTRIBUTOR_COLORS[idx % CONTRIBUTOR_COLORS.length],
    };
  });
  return { id: g.id, name: g.name, target: g.targetAmount, shared: false, contributors };
}

// Per docs/03 UX/UX-UI Blueprint.md §3.2: while Wedding Mode is active this
// tab relabels to "Wedding" and leads with the vendor tracker/countdown;
// standard goals live in a secondary segment within the same screen.
//
// The "All Goals" segment is wired to real Neon data (/api/goals) as of
// 2026-08-03 — the Wedding segment's countdown/vendors/checklist stay mock
// for now, that's a separate wiring pass (wedding_details/wedding_vendors
// tables exist but aren't connected yet). Falls back to the mock goals list
// if the backend isn't reachable, same posture as IdentitySettings.
export function GoalsScreen() {
  const { colors } = useTheme();
  const [segment, setSegment] = useState<"wedding" | "goals">(weddingDetails.active ? "wedding" : "goals");

  const [loaded, setLoaded] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [apiGoals, setApiGoals] = useState<ApiGoal[]>([]);

  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState("");
  const [addingGoal, setAddingGoal] = useState(false);
  const [addGoalError, setAddGoalError] = useState<string | null>(null);

  const [contributionDrafts, setContributionDrafts] = useState<Record<string, string>>({});
  const [contributingGoalId, setContributingGoalId] = useState<string | null>(null);
  const [contributionErrors, setContributionErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    fetch("/api/goals")
      .then(async (res) => {
        if (!res.ok) throw new Error("goals fetch failed");
        return res.json() as Promise<{ goals: ApiGoal[] }>;
      })
      .then((data) => {
        if (cancelled) return;
        setBackendAvailable(true);
        setApiGoals(data.goals);
      })
      .catch(() => {
        // No database/Clerk/route available — fall back to mock goals.
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAddGoal() {
    const name = newGoalName.trim();
    const target = Number(newGoalTarget);
    if (!name || !Number.isFinite(target) || target <= 0) {
      setAddGoalError("Enter a name and a target amount greater than $0.");
      return;
    }
    setAddingGoal(true);
    setAddGoalError(null);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, targetAmount: target, goalType: "custom" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddGoalError(data.error ?? "Couldn't create that goal.");
        return;
      }
      setApiGoals((prev) => [...prev, data]);
      setNewGoalName("");
      setNewGoalTarget("");
      setShowAddGoal(false);
    } catch {
      setAddGoalError("Couldn't reach the server — check your connection and try again.");
    } finally {
      setAddingGoal(false);
    }
  }

  async function handleAddContribution(goalId: string) {
    const draft = contributionDrafts[goalId] ?? "";
    const amount = Number(draft);
    if (!Number.isFinite(amount) || amount <= 0) {
      setContributionErrors((prev) => ({ ...prev, [goalId]: "Enter an amount greater than $0." }));
      return;
    }
    setContributingGoalId(goalId);
    setContributionErrors((prev) => ({ ...prev, [goalId]: "" }));
    try {
      const res = await fetch(`/api/goals/${goalId}/contributions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setContributionErrors((prev) => ({ ...prev, [goalId]: data.error ?? "Couldn't add that contribution." }));
        return;
      }
      setApiGoals((prev) =>
        prev.map((g) =>
          g.id === goalId
            ? {
                ...g,
                contributions: [
                  ...g.contributions,
                  { id: data.id, contributorId: data.contributorId, contributorName: "You", amount: data.amount, date: data.date, note: data.note },
                ],
              }
            : g
        )
      );
      setContributionDrafts((prev) => ({ ...prev, [goalId]: "" }));
    } catch {
      setContributionErrors((prev) => ({ ...prev, [goalId]: "Couldn't reach the server — try again." }));
    } finally {
      setContributingGoalId(null);
    }
  }

  const displayGoals: DisplayGoal[] = backendAvailable
    ? apiGoals.map(toDisplayGoal)
    : mockGoals.map((g) => ({ id: g.id, name: g.name, target: g.target, shared: g.shared, contributors: g.contributors }));

  return (
    <ScreenGrid>
      <ScreenGridWide>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: spacing.md }}>
          <Text variant="h1">{weddingDetails.active ? "Wedding" : "Goals"}</Text>

          {weddingDetails.active && (
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              {(["wedding", "goals"] as const).map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setSegment(s)}
                  style={{
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.lg,
                    borderRadius: radius.pill,
                    backgroundColor: segment === s ? palette.sourLime : colors.surface,
                    borderWidth: 1,
                    borderColor: segment === s ? palette.sourLime : colors.border,
                  }}
                >
                  <Text variant="bodySmall" color={segment === s ? palette.licorice : colors.textPrimary} style={{ fontWeight: "600" }}>
                    {s === "wedding" ? "Wedding" : "All Goals"}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScreenGridWide>

      {segment === "wedding" && weddingDetails.active ? (
        <>
          <Card glow={palette.sourPunch}>
            <Text variant="display" color={palette.sourPunch}>
              {weddingDetails.daysLeft}
            </Text>
            <Text variant="body" secondary>
              days until {weddingDetails.date}
            </Text>
            <Text variant="bodySmall" secondary style={{ marginTop: spacing.xs }}>
              ~{weddingDetails.guestEstimate} guests
            </Text>
          </Card>

          <Card>
            <Text variant="h3" style={{ marginBottom: spacing.sm }}>
              Vendors
            </Text>
            {weddingDetails.vendors.map((v) => (
              <View key={v.name} style={{ marginBottom: spacing.md }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text variant="body">{v.name}</Text>
                  <Text variant="bodySmall" secondary>
                    ${v.balanceDue} due {v.dueDate}
                  </Text>
                </View>
                <Text variant="caption" color={palette.sourLime}>
                  {v.status}
                </Text>
              </View>
            ))}
          </Card>

          <Card>
            <Text variant="h3" style={{ marginBottom: spacing.sm }}>
              Checklist
            </Text>
            {weddingDetails.checklist.map((item) => (
              <View key={item.title} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xs }}>
                {item.done ? <CircleCheck size={18} color={palette.sourLime} /> : <Circle size={18} color={colors.textSecondary} />}
                <Text variant="body" secondary={item.done}>
                  {item.title}
                </Text>
              </View>
            ))}
          </Card>
        </>
      ) : !loaded ? (
        <Card>
          <Text variant="bodySmall" secondary>
            Loading…
          </Text>
        </Card>
      ) : (
        <>
          {displayGoals.map((g) => {
            const total = g.contributors.reduce((s, c) => s + c.amount, 0);
            const pct = Math.round((total / g.target) * 100);
            return (
              <Card key={g.id}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text variant="h3">{g.name}</Text>
                  <OwnershipBadge shared={g.shared} />
                </View>
                <Text variant="bodySmall" secondary style={{ marginBottom: spacing.sm }}>
                  ${total.toLocaleString()} of ${g.target.toLocaleString()} · {pct}%
                </Text>
                <StackedProgressBar contributors={g.contributors} target={g.target} />
                <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.sm, flexWrap: "wrap" }}>
                  {g.contributors.map((c) => (
                    <View key={c.name} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.color }} />
                      <Text variant="caption" secondary>
                        {c.name} · ${c.amount.toLocaleString()}
                      </Text>
                    </View>
                  ))}
                </View>

                {backendAvailable && (
                  <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, alignItems: "center" }}>
                    <TextInput
                      value={contributionDrafts[g.id] ?? ""}
                      onChangeText={(v) => setContributionDrafts((prev) => ({ ...prev, [g.id]: v }))}
                      placeholder="Add $ amount"
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
                    <Pressable
                      onPress={() => handleAddContribution(g.id)}
                      disabled={contributingGoalId === g.id}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 14,
                        borderRadius: radius.pill,
                        backgroundColor: palette.sourLime,
                      }}
                    >
                      <Text variant="bodySmall" color={palette.licorice} style={{ fontWeight: "600" }}>
                        {contributingGoalId === g.id ? "Adding…" : "Add"}
                      </Text>
                    </Pressable>
                  </View>
                )}
                {contributionErrors[g.id] && (
                  <Text variant="caption" style={{ color: palette.sourPunch, marginTop: 4 }}>
                    {contributionErrors[g.id]}
                  </Text>
                )}
              </Card>
            );
          })}

          {backendAvailable && (
            <Card>
              {showAddGoal ? (
                <View style={{ gap: spacing.sm }}>
                  <Text variant="h3">New goal</Text>
                  <TextInput
                    value={newGoalName}
                    onChangeText={setNewGoalName}
                    placeholder="Goal name"
                    placeholderTextColor={colors.textSecondary}
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: radius.medium,
                      padding: 10,
                      color: colors.textPrimary,
                    }}
                  />
                  <TextInput
                    value={newGoalTarget}
                    onChangeText={setNewGoalTarget}
                    placeholder="Target amount"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: radius.medium,
                      padding: 10,
                      color: colors.textPrimary,
                    }}
                  />
                  {addGoalError && (
                    <Text variant="caption" style={{ color: palette.sourPunch }}>
                      {addGoalError}
                    </Text>
                  )}
                  <View style={{ flexDirection: "row", gap: spacing.sm }}>
                    <Pressable
                      onPress={handleAddGoal}
                      disabled={addingGoal}
                      style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: palette.sourLime }}
                    >
                      <Text variant="bodySmall" color={palette.licorice} style={{ fontWeight: "600" }}>
                        {addingGoal ? "Saving…" : "Create goal"}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setShowAddGoal(false)}
                      style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border }}
                    >
                      <Text variant="bodySmall">Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable onPress={() => setShowAddGoal(true)} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                  <Plus size={18} color={palette.sourLime} />
                  <Text variant="body" style={{ fontWeight: "600" }}>
                    Add a goal
                  </Text>
                </Pressable>
              )}
            </Card>
          )}
        </>
      )}
    </ScreenGrid>
  );
}
