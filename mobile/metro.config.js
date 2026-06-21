/** @type {import('expo/metro-config').MetroConfig} */
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure .cjs files resolve (needed by some i18next internals)
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];

module.exports = config;
