module.exports = (api) => {
  // Cache configuration is a good practice for performance
  const isTest = api.env('test');
  api.cache(true);

  const presets = [
    ['@babel/preset-env', {
      // For testing, we want to use the current Node.js version
      targets: isTest ? { node: 'current' } : '> 0.25%, not dead',
      // Use the minimal transforms for the target environments
      useBuiltIns: 'entry',
      corejs: 3,
      // Use commonjs for tests, auto for production
      modules: isTest ? 'commonjs' : 'auto',
      // Exclude transforms that make all code slower
      exclude: ['transform-typeof-symbol']
    }],
    ['@babel/preset-typescript', {
      allowDeclareFields: true,
      onlyRemoveTypeImports: true
    }],
    ['@babel/preset-react', { 
      runtime: 'automatic',
      development: process.env.NODE_ENV !== 'production'
    }]
  ],
  plugins = [
    // Runtime transform for async/await and other modern features
    ['@babel/plugin-transform-runtime', {
      corejs: 3,
      version: '^7.22.5',
      useESModules: !isTest, // Use ESM in production, CJS in tests
      regenerator: true
    }],
    
    // Class properties and private methods
    ['@babel/plugin-proposal-class-properties', { loose: true }],
    ['@babel/plugin-proposal-private-methods', { loose: true }],
    ['@babel/plugin-proposal-private-property-in-object', { loose: true }],
    
    // Nullish coalescing and optional chaining
    '@babel/plugin-proposal-nullish-coalescing-operator',
    '@babel/plugin-proposal-optional-chaining',
    
    // Other proposals
    '@babel/plugin-proposal-logical-assignment-operators',
    '@babel/plugin-proposal-numeric-separator',
    
    // Keep this for Jest compatibility
    isTest ? '@babel/plugin-transform-modules-commonjs' : null,
    
    // Remove falsy values (like the conditional above)
  ].filter(Boolean);

  // Add test-specific plugins
  if (isTest) {
    plugins.push('babel-plugin-dynamic-import-node');
  }

  return {
    presets,
    plugins,
  };
};
