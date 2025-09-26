import React, { ReactNode, ReactElement } from 'react';
import { render, RenderResult } from '@testing-library/react';
import { ThemeProvider, DefaultTheme } from 'styled-components';
import { lightTheme, darkTheme } from '../src/styles/theme';
import { GlobalStyle } from '../src/styles/global';
import styled from 'styled-components';
import '@testing-library/jest-dom';

// Define theme interface
type ThemeType = DefaultTheme & {
  colors: {
    text: string;
    background: string;
  };
};

// Create a simple test component that uses the theme
const ThemedBox = styled.div<{ theme: ThemeType }>`
  color: ${(props) => props.theme.colors.text};
  background-color: ${(props) => props.theme.colors.background};
  padding: 1rem;
`;

// Wrapper component to apply theme
interface ThemeWrapperProps {
  theme: ThemeType;
  children: ReactNode;
}

const ThemeWrapper: React.FC<ThemeWrapperProps> = ({ theme, children }) => {
  // Ensure children is a valid ReactElement
  const childrenArray = React.Children.toArray(children);
  const validChildren = childrenArray.filter(
    (child): child is ReactElement => React.isValidElement(child)
  );
  
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      {validChildren}
    </ThemeProvider>
  );
};

describe('Theme Consistency', () => {
  test('applies light theme correctly', () => {
    const { getByTestId }: RenderResult = render(
      <ThemeWrapper theme={lightTheme as ThemeType}>
        <ThemedBox data-testid="themed-box">Test</ThemedBox>
      </ThemeWrapper>
    );
    
    const box = getByTestId('themed-box');
    expect(box).toHaveStyle({ color: lightTheme.colors.text });
    expect(box).toHaveStyle({ backgroundColor: lightTheme.colors.background });
  });

  test('applies dark theme correctly', () => {
    const { getByTestId }: RenderResult = render(
      <ThemeWrapper theme={darkTheme as ThemeType}>
        <ThemedBox data-testid="themed-box">Test</ThemedBox>
      </ThemeWrapper>
    );
    
    const box = getByTestId('themed-box');
    expect(box).toHaveStyle({ color: darkTheme.colors.text });
    expect(box).toHaveStyle({ backgroundColor: darkTheme.colors.background });
  });

  test('matches light theme snapshot', () => {
    const { container }: RenderResult = render(
      <ThemeWrapper theme={lightTheme as ThemeType}>
        <ThemedBox>Test</ThemedBox>
      </ThemeWrapper>
    );
    
    expect(container).toMatchSnapshot();
  });

  test('matches dark theme snapshot', () => {
    const { container }: RenderResult = render(
      <ThemeWrapper theme={darkTheme as ThemeType}>
        <ThemedBox>Test</ThemedBox>
      </ThemeWrapper>
    );
    
    expect(container).toMatchSnapshot();
  });
});
