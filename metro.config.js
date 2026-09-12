const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.assetExts = [...new Set([...config.resolver.assetExts, 'glb', 'gltf', 'webp'])];
config.resolver.sourceExts = config.resolver.sourceExts.filter((ext) => ext !== 'glb' && ext !== 'gltf');

module.exports = config;
