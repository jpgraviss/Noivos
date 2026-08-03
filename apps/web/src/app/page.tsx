import { Show } from "@clerk/nextjs";
import { AppShell } from "@/components/AppShell";
import { AuthenticatedAppShell } from "@/components/AuthenticatedAppShell";

// Same fallback pattern as layout.tsx/proxy.ts: without Clerk env vars there's
// no ClerkProvider ancestor, so <Show> would throw — render the app straight
// through instead.
const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function MarketingPlaceholder() {
  return (
    <main
      style={{
        minHeight: "80vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        backgroundColor: "#0D0D0F",
        color: "#F5F5F7",
      }}
    >
      <h1 style={{ fontFamily: "var(--font-bebas)", fontSize: 40, margin: 0 }}>Noivos</h1>
      <p style={{ fontFamily: "var(--font-inter)", color: "rgba(245,245,247,0.64)", margin: 0 }}>
        Better money. Together.
      </p>
    </main>
  );
}

export default function Home() {
  if (!clerkConfigured) {
    return <AppShell />;
  }

  return (
    <>
      <Show when="signed-in">
        <AuthenticatedAppShell />
      </Show>
      <Show when="signed-out">
        <MarketingPlaceholder />
      </Show>
    </>
  );
}
