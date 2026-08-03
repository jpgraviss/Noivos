// Placeholder home page — apps/web is brand new (Phase: post-fast-track).
// The real marketing site and app.yourdomain.com experience are separate,
// not-yet-scoped work (docs/README.md's deferred Phase 12). This page exists
// only to prove Clerk works end-to-end on the web.
export default function Home() {
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
      <h1 style={{ fontSize: 40, margin: 0 }}>Noivos</h1>
      <p style={{ color: "rgba(245,245,247,0.64)", margin: 0 }}>Better money. Together.</p>
    </main>
  );
}
