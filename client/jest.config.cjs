// Jest configuration for Babel + TypeScript with ES modules
// @see https://jestjs.io/docs/configuration

/** @type {import('@jest/types').Config.InitialOptions} */
export default {
  // Test environment that will be used for testing
  testEnvironment: 'jsdom',
  
  // The root directory that Jest should scan for tests and modules within
  roots: ['<rootDir>/src'],
  
  // The glob patterns Jest uses to detect test files
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[tj]s?(x)'
  ],
  
  // Module file extensions for importing
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node'],
  
  // A map from regular expressions to module names or to arrays of module names that allow to stub out resources
  moduleNameMapper: {
    // Handle CSS imports (with CSS modules)
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
    
    // Handle image imports
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
    
    // Handle module aliases (if you're using them in your project)
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Setup files to run before each test
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Transform files before running tests
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  
  // Don't transform node_modules except for specific packages that need it
  transformIgnorePatterns: [
    'node_modules/(?!(react|@testing-library|@babel|@emotion)/)',
  ],
  
  // Reset mocks between tests
  resetMocks: true,
  
  // Collect coverage information while executing the test
  collectCoverage: true,
  
  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',
  
  // An array of glob patterns indicating a set of files for which coverage information should be collected
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/index.{js,jsx,ts,tsx}',
    '!src/**/types.ts',
  ],
  
  // A list of reporter names that Jest uses when writing coverage reports
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  
  // The maximum amount of workers used to run your tests
  maxWorkers: '50%',
};

export default config;
