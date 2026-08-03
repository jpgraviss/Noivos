import { View } from "react-native";
import { Card, OwnershipBadge, Text, useTheme, spacing, palette } from "@noivos/ui";
import { budgetSnapshot } from "../data/mockData";
import { ProgressRing } from "../components/ProgressRing";
import { ScreenGrid, ScreenGridWide } from "../components/ScreenLayout";

export function BudgetScreen() {
  const { colors } = useTheme();
  const overallPercent = (budgetSnapshot.spent / budgetSnapshot.planned) * 100;
  const overallOver = overallPercent > 100;

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
              {budgetSnapshot.month} · zero-based
            </Text>
          </View>
          <ProgressRing
            percent={overallPercent}
            color={overallOver ? palette.citrus : palette.sourLime}
            label="of budget used"
            sublabel={`$${budgetSnapshot.spent.toLocaleString()} of $${budgetSnapshot.planned.toLocaleString()}`}
          />
        </View>
      </ScreenGridWide>

      {budgetSnapshot.categories.map((c) => {
        const over = c.spent > c.planned;
        const pct = Math.min((c.spent / c.planned) * 100, 100);
        return (
          <Card key={c.name}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text variant="h3">{c.name}</Text>
              <OwnershipBadge shared={c.shared} partnerName="Marcus" />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xs }}>
              <Text variant="bodySmall" secondary>
                ${c.spent} spent
              </Text>
              <Text variant="bodySmall" color={over ? palette.citrus : colors.textSecondary}>
                {over ? `$${c.spent - c.planned} over` : `$${c.planned - c.spent} left`}
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
          </Card>
        );
      })}
    </ScreenGrid>
  );
}
