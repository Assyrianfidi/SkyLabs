import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContactForm } from '../index';

// Mock the toast notification
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ContactForm', () => {
  const originalFetch = global.fetch;
  const mockOnSubmit = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockOnError = vi.fn();
  
  const defaultProps = {
    onSubmit: mockOnSubmit,
    onSuccess: mockOnSuccess,
    onError: mockOnError,
    contactInfo: {
      email: 'test@example.com',
      phone: '+1234567890',
      location: 'Test Location',
    },
  };
  
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Mock the fetch API
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    );
    
    // Mock window.scrollTo with a simple no-op function
    window.scrollTo = (() => {}) as typeof window.scrollTo;
  });
  
  afterEach(() => {
    // Restore the original fetch implementation
    global.fetch = originalFetch;
  });
  
  it('renders the contact form with all fields', () => {
    render(<ContactForm {...defaultProps} />);
    
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
  });
  
  it('validates required fields', async () => {
    const user = userEvent.setup();
    render(<ContactForm {...defaultProps} />);
    
    const submitButton = screen.getByRole('button', { name: /send message/i });
    await user.click(submitButton);
    
    // Check for validation errors
    expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/message is required/i)).toBeInTheDocument();
  });
  
  it('validates email format on submit', async () => {
    const user = userEvent.setup();
    const mockSubmit = vi.fn().mockResolvedValue({ success: true });
    
    render(
      <ContactForm 
        {...defaultProps} 
        onSubmit={mockSubmit}
      />
    );
    
    // Fill in required fields with valid data
    await user.type(screen.getByLabelText(/name/i), 'Test User');
    await user.type(screen.getByLabelText(/message/i), 'This is a test message');
    
    // Test invalid email
    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    await user.clear(emailInput);
    await user.type(emailInput, 'invalid-email');
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: /send message/i });
    await user.click(submitButton);
    
    // Check that the form was not submitted
    expect(mockSubmit).not.toHaveBeenCalled();
    
    // Clear the invalid email and enter a valid one
    await user.clear(emailInput);
    await user.type(emailInput, 'test@example.com');
    
    // Submit the form again
    await user.click(submitButton);
    
    // Check that the form was submitted with the correct data
    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
        message: 'This is a test message',
        phone: '',
        website: ''
      });
    });
  });
  
  it('keeps button disabled with invalid email', async () => {
    const user = userEvent.setup();
    render(<ContactForm {...defaultProps} />);
    
    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const messageInput = screen.getByLabelText(/message/i);
    const submitButton = screen.getByRole('button', { name: /send message/i });

    // Fill in required fields with valid data
    await user.type(nameInput, 'Test User');
    await user.type(messageInput, 'Test message');
    
    // Fill in invalid email
    await user.clear(emailInput);
    await user.type(emailInput, 'invalid-email');
    
    // Button should be disabled due to invalid email
    expect(submitButton).toBeDisabled();
    
    // Fix the email
    await user.clear(emailInput);
    await user.type(emailInput, 'valid@example.com');
    
    // Button should now be enabled
    expect(submitButton).not.toBeDisabled();
  });
  
  it('enables button when form is valid', async () => {
    const user = userEvent.setup();
    render(<ContactForm {...defaultProps} />);
    
    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const messageInput = screen.getByLabelText(/message/i);
    const submitButton = screen.getByRole('button', { name: /send message/i });

    // Initial state - button should be disabled
    expect(submitButton).toBeDisabled();

    // Fill in valid data
    await user.type(nameInput, 'John Doe');
    await user.type(emailInput, 'john@example.com');
    await user.type(messageInput, 'This is a valid message');

    // Button should be enabled now
    expect(submitButton).not.toBeDisabled();
  });
  
  it('shows success message on successful submission', async () => {
    const user = userEvent.setup();
    const mockSubmit = vi.fn().mockResolvedValue({ success: true });
    
    render(
      <ContactForm 
        {...defaultProps} 
        onSubmit={mockSubmit}
      />
    );
    
    // Fill in valid data
    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/message/i), 'This is a test message');
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: /send message/i });
    await user.click(submitButton);
    
    // Check that the form was submitted
    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });
  });
  
  it('handles form submission error', async () => {
    const errorMessage = 'Network error';
    const mockSubmit = vi.fn().mockRejectedValueOnce(new Error(errorMessage));
    
    const user = userEvent.setup();
    render(
      <ContactForm 
        {...defaultProps} 
        onSubmit={mockSubmit}
      />
    );
    
    // Fill out the form
    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/message/i), 'Test message');
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: /send message/i });
    await user.click(submitButton);
    
    // Check that the error was handled
    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(expect.any(Error));
    });
  });
  
  it('submits the form successfully', async () => {
    mockOnSubmit.mockResolvedValueOnce({ success: true });
    const user = userEvent.setup();
    render(<ContactForm {...defaultProps} />);
    
    // Fill out the form
    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/phone/i), '123-456-7890');
    await user.type(screen.getByLabelText(/message/i), 'Test message');
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: /send message/i });
    await user.click(submitButton);
    
    // Check that the form was submitted
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123-456-7890',
        message: 'Test message',
        website: '', // Honeypot field
      });
    });
    
    // Check for success state
    expect(screen.getByText(/thank you/i)).toBeInTheDocument();
    expect(mockOnSuccess).toHaveBeenCalledTimes(1);
  });
  
  it('shows loading state during form submission', async () => {
    // Create a promise that we can resolve later
    let resolveSubmit: (value: { success: boolean }) => void;
    const submitPromise = new Promise<{ success: boolean }>((resolve) => {
      resolveSubmit = resolve;
    });
    
    mockOnSubmit.mockReturnValueOnce(submitPromise);
    
    const user = userEvent.setup();
    render(<ContactForm {...defaultProps} />);
    
    // Fill out the form
    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/message/i), 'Test message');
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: /send message/i });
    await user.click(submitButton);
    
    // Check that the button is in loading state
    expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled();
    
    // Resolve the promise
    resolveSubmit!({ success: true });
    
    // Wait for the success state
    await waitFor(() => {
      expect(screen.getByText(/thank you/i)).toBeInTheDocument();
    });
  });
  
  it('shows success message after submission', async () => {
    mockOnSubmit.mockResolvedValueOnce({ success: true });
    const user = userEvent.setup();
    render(<ContactForm {...defaultProps} />);
    
    // Fill out and submit the form
    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/message/i), 'Test message');
    await user.click(screen.getByRole('button', { name: /send message/i }));
    
    // Check that success message is shown
    await waitFor(() => {
      expect(screen.getByText(/thank you/i)).toBeInTheDocument();
      expect(screen.getByText(/your message has been sent successfully/i)).toBeInTheDocument();
    });
    
    // Click the "Send another message" button
    await user.click(screen.getByText(/send another message/i));
    
    // Check that the form is shown again
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  });
  
  it('handles bot detection with honeypot field', async () => {
    const user = userEvent.setup();
    render(<ContactForm {...defaultProps} />);
    
    // Fill out the form with honeypot field
    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/message/i), 'Test message');
    
    // Get the honeypot input and fill it (simulating a bot)
    const honeypotInput = document.querySelector('input[name="website"]') as HTMLInputElement;
    await user.type(honeypotInput, 'spam-bot');
    
    // Submit the form
    await user.click(screen.getByRole('button', { name: /send message/i }));
    
    // Check that the form shows success but doesn't call onSubmit
    await waitFor(() => {
      expect(screen.getByText(/thank you/i)).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });
});
