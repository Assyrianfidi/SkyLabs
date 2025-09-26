import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      // Test files in tests directory structure
      '**/tests/unit/**/*.{test,spec}.[jt]s?(x)',
      '**/tests/integration/**/*.{test,spec}.[jt]s?(x)',
      '**/tests/server/**/*.{test,spec}.[jt]s?(x)',
      '**/tests/e2e/**/*.{test,spec}.[jt]s?(x)'
    ],
    exclude: [
      // Build and cache directories
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.next/**',
      '**/build/**',
      '**/out/**',
      '**/.vercel/**',
      '**/.netlify/**',
      '**/public/**',
      '**/storybook-static/**',
      '**/.storybook/**',
      
      // Test runner directories
      '**/cypress/**',
      '**/playwright/**',
      '**/e2e/**',
      '**/__mocks__/**',
      '**/test-utils/**',
      
      // Source control and IDE
      '**/.git/**',
      '**/.github/**',
      '**/.vscode/**',
      '**/temp/**',
      '**/tmp/**',
      
      // Old test directories
      '**/__tests__/**',
      '**/tests/archive/**',
      '**/archive/**',
      
      // TypeScript and documentation
      '**/*.d.ts',
      '**/types/**',
      '**/examples/**',
      '**/fixtures/**',
      '**/templates/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/coverage/**',
        '**/*.d.ts',
        '**/*.test.*',
        '**/test-utils/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@pages': resolve(__dirname, './src/pages'),
      '@styles': resolve(__dirname, './src/styles'),
      '@utils': resolve(__dirname, './src/utils'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@types': resolve(__dirname, './src/types'),
    },
  },
});
