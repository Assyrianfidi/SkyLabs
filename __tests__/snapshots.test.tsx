import React from 'react';
import renderer from 'react-test-renderer';
import ContactForm from '@/components/ContactForm';
import { ThemeProvider } from '@/components/theme-provider';
import { render, screen } from '@testing-library/react';

// Mock components that might cause issues in tests
jest.mock('react-google-recaptcha', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-recaptcha">Mock reCAPTCHA</div>,
}));

describe('Snapshot Tests', () => {
  // Test light theme rendering
  test('ContactForm matches light theme snapshot', () => {
    const tree = renderer
      .create(
        <ThemeProvider defaultTheme="light">
          <ContactForm />
        </ThemeProvider>
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });

  // Test dark theme rendering
  test('ContactForm matches dark theme snapshot', () => {
    const tree = renderer
      .create(
        <ThemeProvider defaultTheme="dark">
          <ContactForm />
        </ThemeProvider>
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });

  // Test form with validation errors
  test('ContactForm with validation errors matches snapshot', () => {
    const { container } = render(
      <ThemeProvider defaultTheme="light">
        <ContactForm />
      </ThemeProvider>
    );
    
    // Trigger validation errors
    const submitButton = screen.getByRole('button', { name: /send message/i });
    submitButton.click();
    
    expect(container).toMatchSnapshot();
  });

  // Test form in loading state
  test('ContactForm in loading state matches snapshot', () => {
    // Mock the fetch to return a promise that never resolves
    const originalFetch = global.fetch;
    global.fetch = jest.fn(() => new Promise(() => {}));
    
    const { container } = render(
      <ThemeProvider defaultTheme="light">
        <ContactForm />
      </ThemeProvider>
    );
    
    // Fill out and submit the form
    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const messageInput = screen.getByLabelText(/message/i);
    const submitButton = screen.getByRole('button', { name: /send message/i });
    
    userEvent.type(nameInput, 'Test User');
    userEvent.type(emailInput, 'test@example.com');
    userEvent.type(messageInput, 'Test message');
    userEvent.click(submitButton);
    
    expect(container).toMatchSnapshot();
    
    // Clean up
    global.fetch = originalFetch;
  });
});
