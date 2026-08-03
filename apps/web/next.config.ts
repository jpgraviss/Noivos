import type { NextConfig } from "next";

// packages/ui is built on react-native-web (Frontend Architecture §2 — shared
// UI between apps/mobile and apps/web). This alias is what makes its
// `import { View } from 'react-native'` resolve in the browser bundle.
const nextConfig: NextConfig = {
  transpilePackages: ["react-native-web"],
  turbopack: {
    resolveAlias: {
      "react-native": "react-native-web",
    },
  },
};

export default nextConfig;
