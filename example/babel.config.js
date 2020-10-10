module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    // NOTE: Reanimated plugin has to be listed last.
    'react-native-reanimated/plugin',
  ],
};
