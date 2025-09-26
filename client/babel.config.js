module.exports = function(api) {
  const isTest = api.env('test');
  
  const presets = [
    ['@babel/preset-env', {
      targets: isTest ? { node: 'current' } : { esmodules: true },
      modules: isTest ? 'commonjs' : false,
      useBuiltIns: 'usage',
      corejs: 3
    }],
    ['@babel/preset-react', {
      runtime: 'automatic',
      importSource: '@emotion/react'
    }],
    '@babel/preset-typescript'
  ];

  const plugins = [
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-transform-runtime',
    '@babel/plugin-transform-modules-commonjs',
    isTest ? null : null
  ].filter(Boolean);

  return {
    presets,
    plugins
  };
};
