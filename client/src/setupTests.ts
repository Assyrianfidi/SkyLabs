// Import jest-dom for custom matchers
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
  Toaster: () => React.createElement('div', { 'data-testid': 'toaster' }),
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  MapPin: () => React.createElement('div', { 'data-testid': 'map-pin' }),
  Loader2: () => React.createElement('div', { 'data-testid': 'loader' }),
  Send: () => React.createElement('div', { 'data-testid': 'send' }),
}));

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  value: vi.fn(),
  writable: true,
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
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
