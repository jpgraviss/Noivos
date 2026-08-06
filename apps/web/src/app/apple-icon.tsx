import { ImageResponse } from "next/og";

// iOS home-screen icon — iOS applies its own corner mask, so this fills
// edge-to-edge with no rounding baked in, unlike icon.tsx.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
        }}
      >
        <div
          style={{
            width: 124,
            height: 124,
            borderRadius: 999,
            background: "linear-gradient(135deg, #B8F000, #1E7FFF)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
