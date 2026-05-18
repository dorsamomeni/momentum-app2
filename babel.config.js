module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Explicitly disable the Hermes parser
      ['@babel/plugin-syntax-flow', { disableHermesParser: true }]
    ]
  };
}; 