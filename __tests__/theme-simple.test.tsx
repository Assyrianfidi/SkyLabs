import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';

// Simple test theme
const testTheme = {
  colors: {
    text: '#333333',
    background: '#ffffff',
    primary: '#0070f3',
  },
  fonts: {
    body: 'system-ui, sans-serif',
    heading: 'system-ui, sans-serif',
  },
  fontSizes: [12, 14, 16, 20, 24, 32, 48, 64],
  space: [0, 4, 8, 16, 32, 64, 128, 256],
};

// Simple styled component
const Box = ({ children }: { children: React.ReactNode }) => (
  <div 
    style={{
      color: testTheme.colors.text,
      backgroundColor: testTheme.colors.background,
      padding: testTheme.space[3] + 'px',
      fontFamily: testTheme.fonts.body,
    }}
    data-testid="test-box"
  >
    {children}
  </div>
);

describe('Theme', () => {
  test('renders with theme styles', () => {
    render(
      <ThemeProvider theme={testTheme}>
        <Box>Test Content</Box>
      </ThemeProvider>
    );

    const box = screen.getByTestId('test-box');
    expect(box).toHaveStyle(`color: ${testTheme.colors.text}`);
    expect(box).toHaveStyle(`background-color: ${testTheme.colors.background}`);
    expect(box).toHaveStyle(`padding: ${testTheme.space[3]}px`);
    expect(box).toHaveStyle(`font-family: ${testTheme.fonts.body}`);
  });

  test('matches snapshot', () => {
    const { container } = render(
      <ThemeProvider theme={testTheme}>
        <Box>Test Content</Box>
      </ThemeProvider>
    );
    expect(container).toMatchSnapshot();
  });
});
