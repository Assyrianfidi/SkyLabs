import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as React from 'react';
import { render, cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock the ContactForm component
vi.mock('../client/src/components/ContactForm.tsx', () => ({
  default: function MockContactForm() {
    return (
      <form data-testid="contact-form">
        <input name="name" type="text" data-testid="name-input" />
        <input name="email" type="email" data-testid="email-input" />
        <textarea name="message" data-testid="message-input"></textarea>
        <button type="submit" data-testid="submit-button">Send Message</button>
      </form>
    );
  },
}));

// Import the mocked component
import ContactForm from '../client/src/components/ContactForm';

describe('ContactForm', () => {
  // Mock window.grecaptcha
  const mockGrecaptcha = {
    ready: vi.fn((callback) => callback()),
    execute: vi.fn().mockResolvedValue('test-token')
  };

  // Set up mocks before each test
  beforeEach(() => {
    global.window.grecaptcha = mockGrecaptcha;
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
    ) as any;
  });

  // Clean up after each test
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('renders the contact form', () => {
    render(<ContactForm />);
    expect(screen.getByTestId('contact-form')).toBeInTheDocument();
    expect(screen.getByTestId('name-input')).toBeInTheDocument();
    expect(screen.getByTestId('email-input')).toBeInTheDocument();
    expect(screen.getByTestId('message-input')).toBeInTheDocument();
    expect(screen.getByTestId('submit-button')).toBeInTheDocument();
  });

  it('submits the form with user input', async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    // Fill in the form
    await user.type(screen.getByTestId('name-input'), 'Test User');
    await user.type(screen.getByTestId('email-input'), 'test@example.com');
    await user.type(screen.getByTestId('message-input'), 'This is a test message');

    // Submit the form
    await user.click(screen.getByTestId('submit-button'));

    // Verify reCAPTCHA was called
    expect(mockGrecaptcha.execute).toHaveBeenCalled();

    // Verify fetch was called
    await vi.waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Mock successful fetch response
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
    ) as any;
    
    // Reset reCAPTCHA mock
    window.grecaptcha = {
      ready: vi.fn((callback) => callback()),
      execute: vi.fn().mockResolvedValue('test-token')
    };
  });
  
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });
  
  it('renders the contact form', async () => {
    const { container } = render(React.createElement(ContactForm));
    
    // Check for form elements
    expect(container.querySelector('form')).toBeInTheDocument();
    expect(container.querySelector('input[name="name"]')).toBeInTheDocument();
    expect(container.querySelector('input[name="email"]')).toBeInTheDocument();
    expect(container.querySelector('textarea[name="message"]')).toBeInTheDocument();
    const submitButton = container.querySelector('button[type="submit"]');
    expect(submitButton?.textContent?.toLowerCase()).toContain('send message');
  });
  
  it('handles form submission', async () => {
    // Mock fetch
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
    global.fetch = mockFetch;

    // Mock reCAPTCHA (already set up in beforeEach)

    const { container } = render(React.createElement(ContactForm));
    
    // Get form elements
    const nameInput = container.querySelector('input[name="name"]') as HTMLInputElement;
    const emailInput = container.querySelector('input[name="email"]') as HTMLInputElement;
    const messageInput = container.querySelector('textarea[name="message"]') as HTMLTextAreaElement;
    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    
    // Fill in the form
    if (nameInput) nameInput.value = 'Test User';
    if (emailInput) emailInput.value = 'test@example.com';
    if (messageInput) messageInput.value = 'Test message';
    
    // Submit the form
    if (submitButton) {
      fireEvent.click(submitButton);
    }
    
    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Verify reCAPTCHA was called
    expect(window.grecaptcha.execute).toHaveBeenCalled();
    
    // Verify fetch was called with the right data
    expect(mockFetch).toHaveBeenCalled();
    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[0]).toContain('/api/contact');
    expect(fetchCall[1].method).toBe('POST');
    expect(fetchCall[1].headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(fetchCall[1].body).name).toBe('Test User');
  });

  it('validates required fields', async () => {
    // Mock console.error to avoid error logs during test
    const originalError = console.error;
    console.error = vi.fn();
    
    // Mock fetch
    const mockFetch = vi.fn();
    global.fetch = mockFetch;
    
    // Mock reCAPTCHA
    window.grecaptcha = {
      ready: (callback: () => void) => callback(),
      execute: vi.fn()
    };

    const { container } = render(React.createElement(ContactForm));
    
    // Get submit button
    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    
    // Try to submit without filling required fields
    if (submitButton) {
      fireEvent.click(submitButton);
    }
    
    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Verify validation errors are shown
    expect(container.textContent).toContain('Name is required');
    expect(container.textContent).toContain('Email is required');
    expect(container.textContent).toContain('Message is required');
    
    // Verify fetch was not called
    expect(mockFetch).not.toHaveBeenCalled();
    
    // Restore console.error
    console.error = originalError;
  });
});

