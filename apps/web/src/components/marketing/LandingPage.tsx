"use client";

import type { ComponentType } from "react";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import {
  Activity,
  CalendarClock,
  PieChart,
  Sparkles,
  Target,
  Users,
} from "lucide-react-native";
import { palette, radius, getTextColorFor, ThemeProvider } from "@noivos/ui";
import { ProductPreview } from "./ProductPreview";

// The signed-out marketing site (only rendered when Clerk is configured —
// see app/page.tsx's <Show when="signed-out">). Built per Brand Guidelines
// §17 "Website Direction": large headlines, bold color moments, big product
// visuals, minimal copy, "I need this" rather than "here's another finance
// tool." Every feature claim below describes something that actually ships
// in the app today (see the screen files linked in each comment) — nothing
// here is aspirational copy for a feature that doesn't exist yet, and there
// is deliberately no fake customer count, testimonial, or press logo since
// none of that exists yet either.
const FEATURES: {
  icon: ComponentType<{ size?: number; color?: string; "aria-hidden"?: boolean }>;
  color: string;
  title: string;
  body: string;
}[] = [
  {
    icon: PieChart,
    color: palette.electricBlue,
    title: "One shared budget",
    body: "Plan spending by category together, see who's paid for what, and know exactly where this month's money is going — not just your half of it.",
  },
  {
    icon: Target,
    color: palette.sourLime,
    title: "Goals built for two",
    body: "Track savings goals — including a dedicated Wedding Mode with a vendor tracker, checklist, and countdown — with every partner's (and family's) contribution shown, never lumped into one anonymous number.",
  },
  {
    icon: Users,
    color: palette.sourPunch,
    title: "Actually shared, not just visible",
    body: "Invite your partner once. From then on your accounts, budget, and goals are a real shared view for both of you — row-level access control, not a screen-sharing workaround.",
  },
  {
    icon: CalendarClock,
    color: palette.citrus,
    title: "A weekly money meeting",
    body: "A short, ready-made agenda pulled straight from your real budget and goals — over-budget categories, upcoming bills, goals ahead of schedule — so 'let's talk about money' has an actual starting point.",
  },
  {
    icon: Activity,
    color: palette.grape,
    title: "See it happen, together",
    body: "Every contribution, vendor payment, and milestone shows up in a shared activity feed — so nobody has to ask 'did you see what I added?'",
  },
  {
    icon: Sparkles,
    color: palette.sourLime,
    title: "Ask about your money",
    body: "Noivos' Money Coach answers plain-English questions about your budget and goals — what you can afford this month, how a big purchase would shift your wedding timeline, and more.",
  },
];

const STEPS = [
  { n: "1", title: "Create your account", body: "Free to start — no credit card." },
  { n: "2", title: "Invite your partner", body: "One link. They join your shared Partnership in a click." },
  { n: "3", title: "Plan money together", body: "Budget, goals, and wedding planning — one shared view for both of you." },
];

function NavCta() {
  return (
    <div className="noivos-nav-cta" style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <SignInButton mode="redirect">
        <button
          style={{
            padding: "9px 16px",
            borderRadius: radius.pill,
            border: "none",
            background: "transparent",
            color: palette.sourCloud,
            fontFamily: "var(--font-inter)",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Sign in
        </button>
      </SignInButton>
      <SignUpButton mode="redirect">
        <button
          style={{
            padding: "9px 18px",
            borderRadius: radius.pill,
            border: "none",
            backgroundColor: palette.sourLime,
            color: getTextColorFor(palette.sourLime),
            fontFamily: "var(--font-inter)",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Get started
        </button>
      </SignUpButton>
    </div>
  );
}

// Wrapped in ThemeProvider because ProductPreview reuses @noivos/ui's
// StackedProgressBar, which reads its colors via useTheme() — this page
// otherwise never mounts inside the dashboard's own ThemeProvider (that one
// only wraps AppShell), so without this it throws at render.
export function LandingPage() {
  return (
    <ThemeProvider>
    <div style={{ backgroundColor: "#141316", color: palette.sourCloud, minHeight: "100vh" }}>
      <header
        className="noivos-marketing-header"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backdropFilter: "blur(10px)",
          background: "rgba(20,19,22,0.72)",
          borderBottom: `1px solid ${palette.sourCloud}14`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flexShrink: 0 }}>
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: 999,
              flexShrink: 0,
              background: `linear-gradient(135deg, ${palette.sourLime}, ${palette.electricBlue})`,
            }}
          />
          <span style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 19 }}>Noivos</span>
        </div>
        <NavCta />
      </header>

      {/* Hero */}
      <section
        style={{
          maxWidth: 1160,
          margin: "0 auto",
          padding: "64px 24px 40px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 48,
        }}
      >
        <div style={{ flex: "1 1 420px", minWidth: 300 }}>
          <span
            style={{
              display: "inline-block",
              padding: "6px 14px",
              borderRadius: radius.pill,
              background: `${palette.electricBlue}22`,
              color: palette.electricBlue,
              fontFamily: "var(--font-inter)",
              fontWeight: 600,
              fontSize: 12,
              letterSpacing: 0.3,
              marginBottom: 20,
            }}
          >
            Money, planned together
          </span>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 600,
              fontSize: "clamp(40px, 6vw, 68px)",
              lineHeight: 1.05,
              margin: "0 0 20px",
              letterSpacing: -0.5,
            }}
          >
            Better money.
            <br />
            <span style={{ color: palette.sourLime }}>Together.</span>
          </h1>
          <p
            style={{
              fontFamily: "var(--font-inter)",
              fontSize: 18,
              lineHeight: 1.6,
              color: `${palette.sourCloud}A3`,
              maxWidth: 480,
              margin: "0 0 32px",
            }}
          >
            Noivos is the money app built for couples — one shared view of your budget, goals, and wedding plans,
            so you make decisions as a team instead of comparing notes after the fact.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 18 }}>
            <SignUpButton mode="redirect">
              <button
                style={{
                  padding: "14px 26px",
                  borderRadius: radius.pill,
                  border: "none",
                  backgroundColor: palette.sourLime,
                  color: getTextColorFor(palette.sourLime),
                  fontFamily: "var(--font-inter)",
                  fontWeight: 700,
                  fontSize: 16,
                  cursor: "pointer",
                }}
              >
                Get started free
              </button>
            </SignUpButton>
            <a
              href="#features"
              style={{
                fontFamily: "var(--font-inter)",
                fontWeight: 600,
                fontSize: 15,
                color: palette.sourCloud,
              }}
            >
              See what&apos;s inside ↓
            </a>
          </div>
          <p
            style={{
              fontFamily: "var(--font-inter)",
              fontSize: 13,
              color: `${palette.sourCloud}75`,
              marginTop: 16,
            }}
          >
            Free while we&apos;re building. No credit card required.
          </p>
        </div>

        <div style={{ flex: "1 1 400px", minWidth: 300, display: "flex", justifyContent: "center" }}>
          <ProductPreview />
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ maxWidth: 1160, margin: "0 auto", padding: "56px 24px" }}>
        <h2
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 600,
            fontSize: "clamp(28px, 4vw, 38px)",
            textAlign: "center",
            margin: "0 0 12px",
          }}
        >
          Built for two, from the ground up
        </h2>
        <p
          style={{
            fontFamily: "var(--font-inter)",
            fontSize: 16,
            color: `${palette.sourCloud}A3`,
            textAlign: "center",
            maxWidth: 560,
            margin: "0 auto 44px",
          }}
        >
          Not a solo budgeting app with a second login bolted on — every feature below is shared by design.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 20,
          }}
        >
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="noivos-hoverable"
              style={{
                borderRadius: radius.large,
                border: `1px solid ${palette.sourCloud}14`,
                background: "#1E1D21",
                padding: 24,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: radius.medium,
                  background: `${f.color}22`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <f.icon size={20} color={f.color} aria-hidden={true} />
              </div>
              <h3 style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 19, margin: "0 0 8px" }}>
                {f.title}
              </h3>
              <p style={{ fontFamily: "var(--font-inter)", fontSize: 14, lineHeight: 1.55, color: `${palette.sourCloud}A3`, margin: 0 }}>
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ maxWidth: 1160, margin: "0 auto", padding: "24px 24px 64px" }}>
        <h2
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 600,
            fontSize: "clamp(26px, 4vw, 34px)",
            textAlign: "center",
            margin: "0 0 40px",
          }}
        >
          Up and running in a few minutes
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 24,
          }}
        >
          {STEPS.map((s) => (
            <div key={s.n} style={{ textAlign: "center", padding: "0 12px" }}>
              <span
                style={{
                  display: "inline-flex",
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  background: `${palette.sourLime}22`,
                  color: palette.sourLime,
                  fontFamily: "var(--font-inter)",
                  fontWeight: 700,
                  fontSize: 15,
                  marginBottom: 14,
                }}
              >
                {s.n}
              </span>
              <h3 style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 18, margin: "0 0 6px" }}>
                {s.title}
              </h3>
              <p style={{ fontFamily: "var(--font-inter)", fontSize: 14, color: `${palette.sourCloud}A3`, margin: 0 }}>
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section
        style={{
          margin: "0 24px 64px",
          maxWidth: 1112,
          marginLeft: "auto",
          marginRight: "auto",
          borderRadius: radius.large + 6,
          background: `linear-gradient(135deg, ${palette.sourLime}1F, ${palette.electricBlue}1F)`,
          border: `1px solid ${palette.sourCloud}14`,
          padding: "48px 32px",
          textAlign: "center",
        }}
      >
        <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: "clamp(26px, 4vw, 36px)", margin: "0 0 12px" }}>
          Ready to plan your money together?
        </h2>
        <p style={{ fontFamily: "var(--font-inter)", fontSize: 15, color: `${palette.sourCloud}A3`, margin: "0 0 28px" }}>
          Free while we&apos;re building. Bring your partner along whenever you&apos;re ready.
        </p>
        <SignUpButton mode="redirect">
          <button
            style={{
              padding: "14px 28px",
              borderRadius: radius.pill,
              border: "none",
              backgroundColor: palette.sourLime,
              color: getTextColorFor(palette.sourLime),
              fontFamily: "var(--font-inter)",
              fontWeight: 700,
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            Get started free
          </button>
        </SignUpButton>
      </section>

      <footer
        style={{
          borderTop: `1px solid ${palette.sourCloud}14`,
          padding: "28px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: 1160,
          margin: "0 auto",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <span style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 15 }}>Noivos</span>
        <span style={{ fontFamily: "var(--font-inter)", fontSize: 13, color: `${palette.sourCloud}75` }}>
          Better money. Together.
        </span>
      </footer>
    </div>
    </ThemeProvider>
  );
}
