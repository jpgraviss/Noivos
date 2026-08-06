import { StackedProgressBar, palette, radius } from "@noivos/ui";
import { budgetSnapshot, goals } from "../../data/mockData";
import { BUDGET_CATEGORY_COLORS } from "../../screens/BudgetScreen";

// A stylized illustration of the dashboard, not a literal screenshot or a
// live-fetching embed — it reuses the same illustrative Ava/Marcus persona
// and numbers already in data/mockData.ts (the same demo data every screen
// in the dev build falls back to), rather than inventing new figures for
// marketing purposes. The two headline numbers below (63% funded / 66%
// used) are the same ones already quoted verbatim in AICoachScreen's canned
// reply, so this preview stays internally consistent with the rest of the
// app rather than picking its own illustrative numbers.
const wedding = goals.find((g) => g.type === "wedding")!;
const weddingSaved = wedding.contributors.reduce((sum, c) => sum + c.amount, 0);
const weddingPct = Math.round((weddingSaved / wedding.target) * 100);
const budgetPct = Math.round((budgetSnapshot.spent / budgetSnapshot.planned) * 100);

const categoryContributors = budgetSnapshot.categories.map((c, i) => ({
  name: c.name,
  amount: c.spent,
  color: BUDGET_CATEGORY_COLORS[i % BUDGET_CATEGORY_COLORS.length],
}));
const categoryTotal = categoryContributors.reduce((sum, c) => sum + c.amount, 0);

function fmt(n: number) {
  return `$${n.toLocaleString()}`;
}

export function ProductPreview() {
  return (
    <div
      style={{
        borderRadius: radius.large + 6,
        border: `1px solid ${palette.sourCloud}1F`,
        background: "#1E1D21",
        boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
        overflow: "hidden",
        width: "100%",
        maxWidth: 480,
      }}
    >
      {/* Browser-chrome bar — signals "this is the product," not a random card */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "12px 16px",
          borderBottom: `1px solid ${palette.sourCloud}14`,
        }}
      >
        <span style={{ width: 9, height: 9, borderRadius: 999, background: palette.sourPunch, opacity: 0.7 }} />
        <span style={{ width: 9, height: 9, borderRadius: 999, background: palette.citrus, opacity: 0.7 }} />
        <span style={{ width: 9, height: 9, borderRadius: 999, background: palette.sourLime, opacity: 0.7 }} />
      </div>

      <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 18, color: palette.sourCloud }}>
            Good evening, Ava
          </span>
          <div style={{ display: "flex" }}>
            {[
              { n: "A", c: palette.sourLime },
              { n: "M", c: palette.sourPunch },
            ].map((p, i) => (
              <span
                key={p.n}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  background: p.c,
                  color: "#141316",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-inter)",
                  fontWeight: 700,
                  fontSize: 11,
                  border: "2px solid #1E1D21",
                  marginLeft: i > 0 ? -8 : 0,
                }}
              >
                {p.n}
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          {[
            { label: "Wedding fund", value: `${fmt(weddingSaved)} / ${fmt(wedding.target)}`, delta: `${weddingPct}% funded` },
            { label: "This month's budget", value: `${fmt(budgetSnapshot.spent)} / ${fmt(budgetSnapshot.planned)}`, delta: `${budgetPct}% used` },
          ].map((tile) => (
            <div
              key={tile.label}
              style={{
                borderRadius: radius.medium,
                border: `1px solid ${palette.sourCloud}14`,
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <span style={{ fontFamily: "var(--font-inter)", fontSize: 10, letterSpacing: 0.6, textTransform: "uppercase", color: `${palette.sourCloud}A3` }}>
                {tile.label}
              </span>
              <span style={{ fontFamily: "var(--font-inter)", fontWeight: 700, fontSize: 15, color: palette.sourCloud }}>
                {tile.value}
              </span>
              <span style={{ fontFamily: "var(--font-inter)", fontWeight: 600, fontSize: 11, color: palette.sourLime }}>
                {tile.delta}
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "var(--font-inter)", fontSize: 11, fontWeight: 600, color: `${palette.sourCloud}A3` }}>
              Spending by category
            </span>
          </div>
          <StackedProgressBar contributors={categoryContributors} target={categoryTotal} height={10} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "var(--font-inter)", fontSize: 11, fontWeight: 600, color: `${palette.sourCloud}A3` }}>
              Our Wedding
            </span>
            <span style={{ fontFamily: "var(--font-inter)", fontSize: 11, fontWeight: 600, color: palette.sourCloud }}>
              {weddingPct}%
            </span>
          </div>
          <StackedProgressBar
            contributors={wedding.contributors}
            target={wedding.target}
            height={10}
          />
        </div>
      </div>
    </div>
  );
}
