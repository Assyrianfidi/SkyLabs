// Jest configuration for TypeScript, ESM, and React
// Using .cjs extension to work with ESM projects
module.exports = {
  // Use ts-jest for TypeScript support
  preset: 'ts-jest/presets/default',
  
  // Test environment for React components
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js', '@testing-library/jest-dom'],
  
  // Transform settings
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { 
      configFile: './babel.config.cjs',
      // Enable ESM support
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        '@babel/preset-typescript',
        ['@babel/preset-react', { runtime: 'automatic' }]
      ]
    }],
  },
  
  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@pages/(.*)$': '<rootDir>/src/pages/$1',
    '^@styles/(.*)$': '<rootDir>/src/styles/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  
  // TypeScript configuration
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json',
      babelConfig: true,
      useESM: true,
    },
  },
  
  // Module file extensions to include
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node'],
  
  // File patterns to test - include all test files in __tests__ directory
  testMatch: [
    '**/__tests__/**/*.@(js|jsx|ts|tsx)',
    '**/__tests__/**/*.test.@(js|jsx|ts|tsx)',
    '**/__tests__/**/*.spec.@(js|jsx|ts|tsx)',
    '**/?(*.)+(spec|test).@(js|jsx|ts|tsx)'
  ],
  
  // Enable ESM support
  extensionsToTreatAsEsm: ['.ts', '.tsx', '.js', '.jsx'],
  
  // Transform all JavaScript and TypeScript files
  transformIgnorePatterns: [
    'node_modules/(?!(.*\.mjs$|@babel/runtime/helpers/esm/))',
  ],
  
  // Enable module direct transformation
  transform: {
    '^.+\\.(js|jsx|ts|tsx|mjs)$': ['babel-jest', {
      configFile: './babel.config.js',
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        '@babel/preset-typescript',
        ['@babel/preset-react', { runtime: 'automatic' }]
      ]
    }],
  },
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/\\..*/', // Ignore nested node_modules
    '/dist/',
    '/coverage/',
    '/public/',
    '/.next/',
    '/out/',
    '/build/',
    '/e2e-tests/', // Exclude Playwright tests
    '.*\.d\.ts$'  // Exclude type declaration files
  ],
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/index.{js,jsx,ts,tsx}',
    '!src/pages/_app.tsx',
    '!src/pages/_document.tsx',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  
  // Module name mapper (for path aliases and static assets)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@pages/(.*)$': '<rootDir>/src/pages/$1',
    '^@styles/(.*)$': '<rootDir>/src/styles/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@public/(.*)$': '<rootDir>/public/$1',
    '^@server/(.*)$': '<rootDir>/server/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@test/(.*)$': '<rootDir>/__tests__/$1',
    '^@mocks/(.*)$': '<rootDir>/__mocks__/$1',
    '^\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^\\.(jpg|jpeg|png|gif|webp|svg|woff|woff2|ttf|eot)$': '<rootDir>/__mocks__/fileMock.js',
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js', '@testing-library/jest-dom'],
  
  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        '@babel/preset-react',
        '@babel/preset-typescript',
      ],
      plugins: [
        '@babel/plugin-transform-runtime',
        '@babel/plugin-transform-modules-commonjs',
      ],
    }],
  },
  
  // Module path ignore patterns
  modulePathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  
  // Extensions to treat as ESM
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  
  // Coverage configuration (temporarily disabled)
  collectCoverage: false,
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**',
    '!**/__tests__/**',
    '!**/types/**',
    '!**/*.d.ts',
    '!**/.next/**',
    '!**/out/**',
    '!**/build/**',
    '!**/public/**',
    '!**/cypress/**',
    '!**/e2e/**',
    '!**/playwright-tests/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'json', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
  },
  
  // Global test timeout (30 seconds)
  testTimeout: 30000,
  
  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  
  // Clear mock calls between tests
  clearMocks: true,
  
  // Reset modules between tests to avoid state leakage
  resetModules: true,
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(express|bcrypt|jsonwebtoken|helmet|express-rate-limit|express-validator|dotenv|@supercharge/request-ip|@?react)/)',
  ],
};
