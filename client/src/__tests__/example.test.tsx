import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('Example Test', () => {
  it('renders a heading', () => {
    render(<h1>Hello, Jest!</h1>);
    const heading = screen.getByRole('heading', { name: /hello, jest!/i });
    expect(heading).toBeInTheDocument();
  });

  it('renders a button', () => {
    render(<button>Click me</button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
  });
});
