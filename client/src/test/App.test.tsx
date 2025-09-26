import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import App from '../App';

describe('App', () => {
  it('renders without crashing', () => {
    render(
      <React.Suspense fallback="Loading...">
        <App />
      </React.Suspense>
    );
    
    // Simple test to verify the app renders
    const appElement = screen.getByTestId('app');
    expect(appElement).toBeInTheDocument();
  });
});
