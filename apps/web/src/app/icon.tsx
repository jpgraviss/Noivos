import { ImageResponse } from "next/og";

// A generated brand favicon (browser tab, bookmarks) — the repo previously
// only had Next.js's default placeholder favicon.ico, never replaced with
// anything brand-matched. Mirrors the same gradient logo mark AppShell's
// sidebar already uses (packages/ui/src/tokens.ts's sourLime → electricBlue),
// generated at build time rather than a checked-in binary asset.
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#141316",
          borderRadius: 14,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 999,
            background: "linear-gradient(135deg, #B8F000, #1E7FFF)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
