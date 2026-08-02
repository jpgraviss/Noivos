// Expo SDK 52+ auto-configures Metro for npm/yarn workspace monorepos when
// using expo/metro-config's getDefaultConfig — see docs/08 Frontend/Frontend
// Architecture.md. No manual watchFolders/nodeModulesPaths needed.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
