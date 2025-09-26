// Add jest-dom for better test assertions
import '@testing-library/jest-dom';
import type { JestConfigWithTsJest } from 'ts-jest';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '',
      query: {},
      asPath: '',
      push: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
      },
      beforePopState: jest.fn(),
      prefetch: jest.fn(),
    };
  },
}));

// Mock next/head
jest.mock('next/head', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({
      children,
    }: {
      children: React.ReactNode;
    }) => React.createElement('div', {}, children),
  };
});

// Mock next/dynamic
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: (...props: unknown[]) => {
    const dynamicModule = jest.requireActual('next/dynamic');
    const dynamicModuleCompress = dynamicModule.default;
    const requiredLoadable = '__next_app__' in dynamicModule ? dynamicModule.default : dynamicModule;
    requiredLoadable.preload = () => {};
    return dynamicModuleCompress;
  },
}));

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
    dispatchEvent: jest.fn(),
  })),
});

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  value: jest.fn(),
  writable: true,
});

// Add global test timeout
jest.setTimeout(30000);

// Suppress console errors during tests
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  // Suppress specific warnings that are not relevant to tests
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('ReactDOM.render is no longer supported in React 18') ||
      args[0].includes('ReactDOM.hydrate is no longer supported in React 18'))
  ) {
    return;
  }
  originalConsoleError(...args);
};
