import { ImageResponse } from "next/og";

// Social-share preview image (link unfurls in iMessage/Slack/Twitter/etc.) —
// there was none before, so a shared link just showed a bare title/URL.
// Kept to satori's supported CSS subset (flexbox, no CSS vars/custom fonts),
// same brand colors as packages/ui/src/tokens.ts's merge-round palette.
export const alt = "Noivos — Better money. Together.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#141316",
          color: "#F5F3F0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22, marginBottom: 28 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 999,
              background: "linear-gradient(135deg, #B8F000, #1E7FFF)",
              display: "flex",
            }}
          />
          <div style={{ fontSize: 64, fontWeight: 700, display: "flex" }}>Noivos</div>
        </div>
        <div style={{ fontSize: 44, fontWeight: 700, display: "flex" }}>
          Better money.&nbsp;<span style={{ color: "#B8F000" }}>Together.</span>
        </div>
        <div style={{ fontSize: 26, color: "rgba(245,243,240,0.64)", marginTop: 18, display: "flex" }}>
          The shared money app for couples
        </div>
      </div>
    ),
    { ...size }
  );
}
