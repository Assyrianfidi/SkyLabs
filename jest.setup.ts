import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

// Extend Jest matchers
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveAttribute(attr: string, value?: string): R;
      toHaveStyle(style: string | Record<string, unknown>): R;
    }
  }

  // Add global test utilities
  // eslint-disable-next-line no-var
  var flushPromises: () => Promise<void>;
  // eslint-disable-next-line no-var
  var wait: (ms?: number) => Promise<void>;
}

// Configure test environment
configure({
  testIdAttribute: 'data-testid',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);

// Extend window type
declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(() => true),
  })),
});

// Mock window.scrollTo
window.scrollTo = jest.fn();

// Mock IntersectionObserver
const MockIntersectionObserver = jest.fn();
MockIntersectionObserver.mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

// Mock ResizeObserver
const MockResizeObserver = jest.fn();
MockResizeObserver.mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: MockResizeObserver,
});

// Mock localStorage
const createStorageMock = () => {
  const store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = String(value);
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
  };
};

Object.defineProperty(window, 'localStorage', {
  value: createStorageMock(),
});

Object.defineProperty(window, 'sessionStorage', {
  value: createStorageMock(),
});

// Mock fetch
global.fetch = jest.fn() as jest.Mock;

// Mock console methods
const originalConsole = { ...console };

const shouldSuppressError = (message: any): boolean => {
  if (typeof message !== 'string') return false;
  return (
    message.includes('ReactDOM.render is no longer supported in React 18') ||
    (message.includes('An update to') && message.includes('inside a test was not wrapped in act'))
  );
};

const shouldSuppressWarning = (message: any): boolean => {
  if (typeof message !== 'string') return false;
  return (
    message.startsWith('Deprecation:') ||
    message.startsWith('Please update the following components:')
  );
};

global.console = {
  ...originalConsole,
  error: jest.fn((...args) => {
    if (!shouldSuppressError(args[0])) {
      originalConsole.error(...args);
    }
  }),
  warn: jest.fn((...args) => {
    if (!shouldSuppressWarning(args[0])) {
      originalConsole.warn(...args);
    }
  }),
};

// Global teardown
afterEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
  (global.fetch as jest.Mock).mockClear();
});

// Utility function to flush promises
global.flushPromises = () => new Promise(setImmediate);

// Utility function to wait for a specific time
global.wait = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));

// Export test utilities
export {};
