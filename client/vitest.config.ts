import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitest.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'src/**/__tests__/**/*.{test,spec}.{ts,tsx}'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.git/**',
      '**/.idea/**',
      '**/.vscode/**',
      '**/public/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        '**/*.d.ts',
        '**/*.test.{js,jsx,ts,tsx}',
        '**/test-utils/**',
        '**/__mocks__/**',
        '**/node_modules/**',
        '**/dist/**',
        '**/coverage/**',
        '**/public/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    environmentOptions: {
      jsdom: {
        url: 'http://localhost:3000',
        resources: 'usable',
      },
    },
    deps: {
      inline: ['@testing-library/user-event'],
    },
    testTimeout: 10000,
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    css: {
      modules: {
        classNameStrategy: 'non-scoped',
      },
    },
  },
});
