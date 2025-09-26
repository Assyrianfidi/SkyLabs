// Test utilities for React component testing
import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

export const mockTheme = {
  colors: {
    primary: '#2563eb',
    secondary: '#1e293b',
    background: '#ffffff',
    text: '#1e293b',
    error: '#dc2626',
    success: '#16a34a',
    warning: '#d97706',
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  spacing: {
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
    32: '8rem',
    40: '10rem',
    48: '12rem',
    56: '14rem',
    64: '16rem',
  },
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    DEFAULT: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
    full: '9999px',
  },
};

// Mock reCAPTCHA
global.grecaptcha = {
  ready: (callback: () => void) => callback(),
  execute: jest.fn().mockResolvedValue('test-token'),
  render: jest.fn(),
  getResponse: jest.fn().mockReturnValue('test-token'),
  reset: jest.fn(),
} as any;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
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

// Custom render function with providers
const AllTheProviders = ({ 
  children,
  theme = mockTheme,
  route = '/',
}: { 
  children: ReactNode;
  theme?: typeof mockTheme;
  route?: string;
}) => {
  return (
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[route]}>
        {children}
      </MemoryRouter>
    </ThemeProvider>
  );
};

// Custom render with router
const renderWithRouter = (
  ui: ReactElement,
  { route = '/', ...renderOptions }: { route?: string } & Omit<RenderOptions, 'wrapper'> = {}
) => {
  window.history.pushState({}, 'Test page', route);
  
  return {
    ...render(ui, {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={[route]}>
          {children}
        </MemoryRouter>
      ),
      ...renderOptions,
    }),
  };
};

// Re-export everything from testing-library
// Override render method with our custom render
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render, renderWithRouter };

// Helper functions for testing
export const mockMatchMedia = () => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
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
};

// Mock next/router if using Next.js
export const mockNextRouter = () => {
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
        beforePopState: jest.fn(() => null),
        prefetch: jest.fn(() => Promise.resolve()),
      };
    },
  }));
};

// Mock fetch API
export const mockFetch = (response: any, ok = true) => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok,
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(JSON.stringify(response)),
      status: ok ? 200 : 400,
      statusText: ok ? 'OK' : 'Bad Request',
      headers: new Headers(),
      redirected: false,
      type: 'basic',
      url: '',
      clone: function() { return this; },
      body: null,
      bodyUsed: false,
      arrayBuffer: function() { return Promise.resolve(new ArrayBuffer(0)); },
      blob: function() { return Promise.resolve(new Blob()); },
      formData: function() { return Promise.resolve(new FormData()); },
    } as Response)
  );
};
