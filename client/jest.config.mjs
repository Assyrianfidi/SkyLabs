// @ts-check
/** @type {import('ts-jest').JestConfigWithTsJest} */
const config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^(\\.{1,2}/.*)\.js$': '$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^react($|/.*)$': '<rootDir>/node_modules/react$1',
    '^react-dom($|/.*)$': '<rootDir>/node_modules/react-dom$1',
    '^next($|/.*)$': '<rootDir>/node_modules/next$1'
  },
  transform: {
    '^.+\\.(t|j)sx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.jest.json',
        isolatedModules: true,
        babelConfig: {
          presets: [
            ['@babel/preset-env', { targets: { node: 'current' } }],
            '@babel/preset-typescript',
            ['@babel/preset-react', { runtime: 'automatic' }]
          ]
        }
      }
    ]
  },
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  extensionsToTreatAsEsm: ['.ts', '.tsx', '.jsx'],
  transformIgnorePatterns: [
    'node_modules/(?!(next|@babel/runtime|@react-hook/intersection-observer|@testing-library|@testing-library/react|@testing-library/user-event|@testing-library/dom|@testing-library/jest-dom|jest-axe|@babel/preset-env|@babel/preset-typescript|@babel/preset-react)/)'
  ],
  globals: {
    'ts-jest': {
      useESM: true,
      tsconfig: 'tsconfig.jest.json',
      isolatedModules: true,
      diagnostics: {
        ignoreCodes: [1343, 151001]
      }
    }
  }
};

export default config;
