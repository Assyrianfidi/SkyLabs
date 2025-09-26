import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)'
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/\\\..*/', // Ignore nested node_modules
    '/dist/',
    '/coverage/',
    '/public/',
    '/.next/',
    '/out/',
    '/build/',
    '/e2e-tests/'
  ],
  
  // Transform settings
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      configFile: './babel.config.cjs'
    }],
  },
  
  // Module file extensions
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node'],
  
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
    '^next/(.*)$': '<rootDir>/node_modules/next/$1',
    '^react-google-recaptcha$': '<rootDir>/__mocks__/react-google-recaptcha.tsx'
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts', '@testing-library/jest-dom'],
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost',
  },
  
  // TypeScript configuration
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json',
      babelConfig: true,
      useESM: false // Use CommonJS for better compatibility
    }
  },
  
  // Disable ESM support for CommonJS compatibility
  extensionsToTreatAsEsm: [],
  
  // Coverage settings
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!**/node_modules/**',
    '!**/vendor/**',
    '!**/types/**',
    '!**/*.d.ts',
    '!**/__tests__/**',
    '!**/test-utils/**'
  ],
  
  // Test timeout
  testTimeout: 10000
};

export default config;
