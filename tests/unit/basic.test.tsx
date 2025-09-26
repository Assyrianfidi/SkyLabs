import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Add type definitions for jest-dom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveTextContent(text: string | RegExp): R;
      toBeVisible(): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
    }
  }
}

// A simple component to test
const HelloWorld = () => <h1>Hello, World!</h1>;

describe('Basic Test', () => {
  it('renders hello world', () => {
    render(<HelloWorld />);
    const heading = screen.getByText(/hello, world!/i);
    expect(heading).toBeInTheDocument();
  });
});
