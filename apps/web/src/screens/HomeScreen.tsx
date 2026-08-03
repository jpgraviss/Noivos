import { View } from "react-native";
import { CreditCard, Lightbulb, Users } from "lucide-react-native";
import { Card, Text, useTheme, spacing, palette, getTextColorFor } from "@noivos/ui";
import { budgetSnapshot, goals, activityFeed, insights, upcomingBills, moneyMeeting, currentUser } from "../data/mockData";
import { AvatarStack } from "../components/AvatarStack";
import { StatTile } from "../components/StatTile";
import { TrendChart } from "../components/TrendChart";
import { ScreenGrid, ScreenGridWide } from "../components/ScreenLayout";

// Mock 8-week combined-savings trend, ending at the current total across all
// goals — there's no real time-series backend yet (no Neon connection),
// so this is shaped to land on today's real mock total rather than an
// arbitrary number.
function useSavingsTrend() {
  const total = goals.reduce((sum, g) => sum + g.contributors.reduce((s, c) => s + c.amount, 0), 0);
  const weeks = ["7wk ago", "6wk ago", "5wk ago", "4wk ago", "3wk ago", "2wk ago", "Last wk", "This wk"];
  const shape = [0.78, 0.8, 0.83, 0.85, 0.89, 0.93, 0.97, 1];
  return weeks.map((label, i) => ({ label, value: Math.round(total * shape[i]) }));
}

export function HomeScreen() {
  const { colors } = useTheme();
  const weddingGoal = goals[0];
  const weddingTotal = weddingGoal.contributors.reduce((s, c) => s + c.amount, 0);
  const weddingPercent = Math.round((weddingTotal / weddingGoal.target) * 100);
  const savingsTotal = goals.reduce((sum, g) => sum + g.contributors.reduce((s, c) => s + c.amount, 0), 0);
  const overBudget = budgetSnapshot.spent > budgetSnapshot.planned * 0.9;
  const trend = useSavingsTrend();

  return (
    <ScreenGrid>
      <ScreenGridWide>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: spacing.md,
          }}
        >
          <View>
            <Text variant="caption" secondary>
              Good afternoon
            </Text>
            <Text variant="display">Hey, {currentUser.name}</Text>
          </View>
          <AvatarStack names={[currentUser.name, currentUser.partnerName]} />
        </View>
      </ScreenGridWide>

      <StatTile
        label="Total saved"
        value={`$${savingsTotal.toLocaleString()}`}
        deltaLabel="4.2% this month"
        deltaDirection="up"
        deltaIsGood
        sparkline={trend.map((t) => t.value)}
      />
      <StatTile
        label="Spent this month"
        value={`$${budgetSnapshot.spent.toLocaleString()}`}
        deltaLabel={`of $${budgetSnapshot.planned.toLocaleString()} planned`}
        deltaDirection={overBudget ? "up" : "down"}
        deltaIsGood={!overBudget}
      />
      <StatTile
        label="Wedding progress"
        value={`${weddingPercent}%`}
        deltaLabel={`$${weddingTotal.toLocaleString()} of $${weddingGoal.target.toLocaleString()}`}
      />

      {/* Money Meeting ritual card — a distinct treatment, UX Blueprint §3.3 */}
      <ScreenGridWide>
        <Card glow={palette.grape}>
          <Text variant="caption" color={palette.grape}>
            WEEK OF {moneyMeeting.weekOf.toUpperCase()}
          </Text>
          <Text variant="h3" style={{ marginTop: spacing.xs }}>
            Your Money Meeting is ready
          </Text>
          <View style={{ marginTop: spacing.sm, gap: 4 }}>
            {moneyMeeting.topics.map((t, i) => (
              <Text key={i} variant="bodySmall" secondary>
                • {t}
              </Text>
            ))}
          </View>
        </Card>
      </ScreenGridWide>

      <ScreenGridWide>
        <Card>
          <Text variant="h3" style={{ marginBottom: spacing.sm }}>
            Combined savings
          </Text>
          <TrendChart points={trend} />
        </Card>
      </ScreenGridWide>

      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
          <Text variant="h3">{budgetSnapshot.month} Budget</Text>
          <Text variant="bodySmall" secondary>
            ${budgetSnapshot.spent} of ${budgetSnapshot.planned}
          </Text>
        </View>
        <View style={{ height: 10, borderRadius: 999, backgroundColor: colors.border, marginTop: spacing.sm, overflow: "hidden" }}>
          <View
            style={{
              height: "100%",
              width: `${Math.min((budgetSnapshot.spent / budgetSnapshot.planned) * 100, 100)}%`,
              backgroundColor: palette.sourLime,
            }}
          />
        </View>
      </Card>

      <Card glow={palette.sourLime}>
        <Text variant="h3">{weddingGoal.name}</Text>
        <Text variant="bodySmall" secondary style={{ marginTop: 2 }}>
          ${weddingTotal.toLocaleString()} of ${weddingGoal.target.toLocaleString()} · {weddingPercent}%
        </Text>
      </Card>

      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm }}>
          <Lightbulb size={16} color={palette.citrus} />
          <Text variant="h3">AI Insights</Text>
        </View>
        <View style={{ gap: spacing.sm }}>
          {insights.map((i) => (
            <Text key={i.id} variant="body" secondary>
              {i.text}
            </Text>
          ))}
        </View>
      </Card>

      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm }}>
          <CreditCard size={16} color={colors.textSecondary} />
          <Text variant="h3">Upcoming Bills</Text>
        </View>
        {upcomingBills.map((b) => (
          <View key={b.id} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
            <Text variant="body">{b.name}</Text>
            <Text variant="body" secondary>
              ${b.amount} · {b.due}
            </Text>
          </View>
        ))}
      </Card>

      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm }}>
          <Users size={16} color={colors.textSecondary} />
          <Text variant="h3">Activity</Text>
        </View>
        {activityFeed.map((a) => (
          <View key={a.id} style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.xs, alignItems: "flex-start" }}>
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 999,
                backgroundColor: palette.electricBlue,
                alignItems: "center",
                justifyContent: "center",
                marginTop: 2,
              }}
            >
              <Text variant="caption" style={{ color: getTextColorFor(palette.electricBlue), fontWeight: "700" }}>
                {a.text.slice(0, 1)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="body">{a.text}</Text>
              <Text variant="caption" secondary>
                {a.time}
              </Text>
            </View>
          </View>
        ))}
      </Card>
    </ScreenGrid>
  );
}
