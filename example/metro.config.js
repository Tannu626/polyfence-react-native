const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

const config = {
  projectRoot,
  watchFolders: [monorepoRoot],
  resolver: {
    extraNodeModules: {
      'polyfence-react-native': path.resolve(monorepoRoot, 'src'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
