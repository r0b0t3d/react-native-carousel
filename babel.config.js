module.exports = {
  presets: [
    ['module:@react-native/babel-preset', { enableBabelRuntime: '7.29.2' }],
  ],
  env: {
    // The worklets plugin must run for Jest so useAnimatedScrollHandler's
    // handlers are recognized as worklets (Reanimated throws otherwise).
    // Scoped to the "test" env (babel-jest sets BABEL_ENV/NODE_ENV=test) so
    // it doesn't affect the Metro/bob production build, which has its own
    // babel config (see example/babel.config.js) for that.
    test: {
      plugins: ['react-native-worklets/plugin'],
    },
  },
};
