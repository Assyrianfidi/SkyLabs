import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

describe('Example Test Suite', () => {
  it('should pass a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should render a simple component', () => {
    const { container } = render(React.createElement('div', { 'data-testid': 'test-element' }, 'Test Content'));
    expect(screen.getByTestId('test-element')).toHaveTextContent('Test Content');
  });
});
