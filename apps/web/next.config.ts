import type { NextConfig } from "next";

// packages/ui is built on react-native-web (Frontend Architecture §2 — shared
// UI between apps/mobile and apps/web). This alias is what makes its
// `import { View } from 'react-native'` resolve in the browser bundle.
const nextConfig: NextConfig = {
  transpilePackages: ["react-native-web", "react-native-svg", "lucide-react-native"],
  turbopack: {
    resolveAlias: {
      "react-native": "react-native-web",
    },
    // react-native-svg (a lucide-react-native dependency) ships Metro-style
    // `.web.js` platform variants alongside the native ones; Turbopack has no
    // built-in platform resolution, so `.web.*` must be listed ahead of the
    // plain extensions here or it silently picks the native/Fabric build
    // (which imports native-only APIs that don't exist in the browser).
    resolveExtensions: [
      ".web.tsx",
      ".web.ts",
      ".web.jsx",
      ".web.js",
      ".tsx",
      ".ts",
      ".jsx",
      ".js",
      ".mjs",
      ".json",
    ],
  },
};

export default nextConfig;
