import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
  
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^@testing-library/jest-dom/extend-expect$': '<rootDir>/node_modules/@testing-library/jest-dom',
    '^@testing-library/jest-dom$': '<rootDir>/node_modules/@testing-library/jest-dom',
    '^@testing-library/react$': '<rootDir>/node_modules/@testing-library/react',
  },
  
  transform: {
    '^.+\\.(ts|tsx|js|jsx|mjs)$': ['ts-jest', {
      useESM: true,
      tsconfig: 'tsconfig.jest.json',
      isolatedModules: true,
    }],
  },
  
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?@?react|@testing-library|@babel|@jest|@testing-library/jest-dom)',
  ],
  
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node', 'mjs'],
  
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/coverage',
    '<rootDir>/dist',
  ],
  
  globals: {
    'ts-jest': {
      useESM: true,
      tsconfig: 'tsconfig.jest.json',
      isolatedModules: true,
    },
  },
  
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  
  // Handle ESM modules
  moduleDirectories: ['node_modules', '<rootDir>/src'],
  
  // Add support for absolute imports
  modulePaths: ['<rootDir>/src'],
};

export default config;
