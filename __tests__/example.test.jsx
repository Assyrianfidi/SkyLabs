import React from 'react';
import { render, screen } from '@testing-library/react';

test('renders learn react link', () => {
  render(
    <div>
      <h1>Hello, World!</h1>
    </div>
  );
  
  const headingElement = screen.getByText(/hello, world!/i);
  expect(headingElement).toBeInTheDocument();
});
