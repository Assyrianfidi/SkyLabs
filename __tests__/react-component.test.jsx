import React from 'react';
import { render, screen } from '@testing-library/react';

// A simple component to test
const Hello = () => <h1>Hello, World!</h1>;

test('renders hello world', () => {
  render(<Hello />);
  const heading = screen.getByText(/hello, world!/i);
  expect(heading).toBeInTheDocument();
});
