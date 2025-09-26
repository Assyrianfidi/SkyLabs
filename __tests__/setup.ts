// Mock console methods to keep test output clean
import { beforeAll, afterAll, jest } from '@jest/globals';

// Mock console methods to keep test output clean
const consoleMethods = ['log', 'warn', 'error', 'info', 'debug'] as const;

// Store original console methods
const originalConsole = {} as Record<typeof consoleMethods[number], any>;

beforeAll(() => {
  // Mock all console methods
  consoleMethods.forEach(method => {
    originalConsole[method] = console[method];
    console[method] = jest.fn();
  });
});

afterAll(() => {
  // Restore original console methods
  consoleMethods.forEach(method => {
    console[method] = originalConsole[method];
  });
});

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3003';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Global test timeout
jest.setTimeout(30000);
