import React from 'react';
import { render, screen } from '@testing-library/react';

// A simple component to test
const HelloWorld = () => (
  <div>
    <h1>Hello, World!</h1>
    <p>This is a test component</p>
  </div>
);

describe('HelloWorld Component', () => {
  it('renders the component', () => {
    render(<HelloWorld />);
    
    // Check if the heading is rendered
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Hello, World!');
    
    // Check if the paragraph is rendered
    const paragraph = screen.getByText('This is a test component');
    expect(paragraph).toBeInTheDocument();
  });
});
