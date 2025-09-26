// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

// Extend expect with jest-axe for accessibility testing
import { toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

// Mock next/router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '',
      query: {},
      asPath: '',
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(() => Promise.resolve()),
      back: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    };
  },
}));

// Mock next/head
jest.mock('next/head', () => {
  return {
    __esModule: true,
    default: function Head({ children }) {
      return <>{children}</>;
    },
  };
});

// Mock next/dynamic
jest.mock('next/dynamic', () => (func) => {
  const DynamicComponent = () => {
    const [Component, setComponent] = React.useState(null);
    
    React.useEffect(() => {
      func().then((module) => {
        setComponent(() => module.default);
      });
    }, []);

    return Component ? <Component /> : <div>Loading...</div>;
  };
  
  DynamicComponent.displayName = 'LoadableComponent';
  DynamicComponent.preload = jest.fn();
  return DynamicComponent;
});

// Mock react-google-recaptcha
jest.mock('react-google-recaptcha', () => {
  return function MockRecaptcha(props) {
    return (
      <div data-testid="mock-recaptcha" {...props}>
        Mock reCAPTCHA
      </div>
    );
  };
});

// Mock global objects
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

// Suppress React 18 act() warnings
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (args[0]?.includes('act(...)')) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
