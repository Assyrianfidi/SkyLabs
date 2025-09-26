// Setup for Vitest tests
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

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

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock reCAPTCHA
global.grecaptcha = {
  ready: (callback: () => void) => callback(),
  execute: vi.fn().mockResolvedValue('test-token'),
  render: vi.fn(),
  getResponse: vi.fn().mockReturnValue('test-token'),
  reset: vi.fn(),
} as any;

// Mock console methods to track errors and warnings
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = (...args) => {
    // Ignore specific warnings
    if (args.some(arg => 
      typeof arg === 'string' && 
      (
        arg.includes('React does not recognize the `%s` prop on a DOM element') ||
        arg.includes('Unknown event handler property')
      )
    )) {
      return;
    }
    originalConsoleError(...args);
  };

  console.warn = (...args) => {
    // Ignore specific warnings
    if (args.some(arg => 
      typeof arg === 'string' && 
      arg.includes('A component is changing an uncontrolled input')
    )) {
      return;
    }
    originalConsoleWarn(...args);
  };
});

afterAll(() => {
  // Restore original console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Mock next/router if using Next.js
vi.mock('next/router', () => ({
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
}));

// Mock react-google-recaptcha
vi.mock('react-google-recaptcha', () => ({
  __esModule: true,
  default: () => ({
    type: 'div',
    props: { 'data-testid': 'recaptcha-mock' },
    children: 'Mock reCAPTCHA'
  })
}));

// Add any other global mocks or configurations here
