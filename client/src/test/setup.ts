// Import testing libraries
import React from 'react';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi, beforeAll, expect } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Setup userEvent
const user = userEvent.setup();

export { user, expect };

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '',
      query: {},
      asPath: '',
      push: vi.fn(),
      replace: vi.fn(),
      reload: vi.fn(),
      back: vi.fn(),
      prefetch: vi.fn(),
      beforePopState: vi.fn(),
      events: {
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn(),
      },
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '';
  },
}));

// Mock next/head
vi.mock('next/head', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: function Head({ children }: { children: React.ReactNode }) {
      return React.createElement('div', { 'data-testid': 'mock-head' }, children);
    },
  };
});

type ScrollToOptions = {
  top?: number;
  left?: number;
  behavior?: 'auto' | 'smooth';
};

type WindowWithScrollTo = Window & {
  scrollTo: (options?: ScrollToOptions | number, y?: number) => void;
};

declare const window: WindowWithScrollTo;

// Clean up after each test
// This will ensure that tests are completely isolated from each other
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock global objects
Object.defineProperty(global, 'IntersectionObserver', {
  writable: true,
  value: class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
});

// Mock ResizeObserver
Object.defineProperty(global, 'ResizeObserver', {
  writable: true,
  value: class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
});

// Mock window.scrollTo
const scrollToMock = vi.fn<[number, number], void>();
window.scrollTo = scrollToMock as unknown as Window['scrollTo'];

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Clean up after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
