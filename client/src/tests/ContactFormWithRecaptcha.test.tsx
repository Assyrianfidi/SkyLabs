import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { toast } from 'react-hot-toast';
import ContactFormWithRecaptcha from '../components/ContactFormWithRecaptcha';
import { testBlurValidation, testFormSubmission, testHoneypot } from './utils/validationHelpers';

// Mock react-hot-toast
vi.mock('react-hot-toast');

// Mock reCAPTCHA
vi.mock('react-google-recaptcha-v3', () => ({
  useGoogleReCaptcha: () => ({
    executeRecaptcha: vi.fn().mockResolvedValue('test-token')
  })
}));

describe('ContactFormWithRecaptcha', () => {
  const user = userEvent.setup();
  const mockToast = vi.mocked(toast);
  
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
  });

  it('renders all form fields', () => {
    render(<ContactFormWithRecaptcha />);
    
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
  });

  it('validates name field', async () => {
    render(<ContactFormWithRecaptcha />);
    
    const nameInput = screen.getByLabelText(/name/i);
    
    // Test required validation
    await user.click(nameInput);
    await user.tab();
    
    await waitFor(() => {
      expect(nameInput).toHaveAttribute('aria-invalid', 'true');
      const errorId = nameInput.getAttribute('aria-describedby');
      const errorElement = document.getElementById(errorId || '');
      expect(errorElement).toHaveTextContent('Name is required');
    });
    
    // Test valid input
    await user.type(nameInput, 'John Doe');
    await user.tab();
    
    await waitFor(() => {
      expect(nameInput).toHaveAttribute('aria-invalid', 'false');
      expect(nameInput).toHaveAttribute('aria-describedby', '');
    });
  });

  it('validates email field', async () => {
    render(<ContactFormWithRecaptcha />);
    
    const emailInput = screen.getByLabelText(/email/i);
    
    // Test required validation
    await user.click(emailInput);
    await user.tab();
    
    await waitFor(() => {
      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      const errorId = emailInput.getAttribute('aria-describedby');
      const errorElement = document.getElementById(errorId || '');
      expect(errorElement).toHaveTextContent('Email is required');
    });
    
    // Test invalid format
    await user.type(emailInput, 'invalid-email');
    await user.tab();
    
    await waitFor(() => {
      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      const errorId = emailInput.getAttribute('aria-describedby');
      const errorElement = document.getElementById(errorId || '');
      expect(errorElement).toHaveTextContent('Please enter a valid email');
    });
    
    // Test valid input
    await user.clear(emailInput);
    await user.type(emailInput, 'test@example.com');
    await user.tab();
    
    await waitFor(() => {
      expect(emailInput).toHaveAttribute('aria-invalid', 'false');
      expect(emailInput).toHaveAttribute('aria-describedby', '');
    });
  });

  it('validates phone field format', async () => {
    render(<ContactFormWithRecaptcha />);
    
    const phoneInput = screen.getByLabelText(/phone/i);
    
    // Test invalid format
    await user.type(phoneInput, '1234567890');
    await user.tab();
    
    await waitFor(() => {
      expect(phoneInput).toHaveAttribute('aria-invalid', 'true');
      const errorId = phoneInput.getAttribute('aria-describedby');
      const errorElement = document.getElementById(errorId || '');
      expect(errorElement).toHaveTextContent('Phone must be in format (123) 456-7890');
    });
    
    // Test valid format
    await user.clear(phoneInput);
    await user.type(phoneInput, '(123) 456-7890');
    await user.tab();
    
    await waitFor(() => {
      expect(phoneInput).toHaveAttribute('aria-invalid', 'false');
      expect(phoneInput).toHaveAttribute('aria-describedby', '');
    });
  });

  it('validates message field', async () => {
    render(<ContactFormWithRecaptcha />);
    
    const messageInput = screen.getByLabelText(/message/i);
    
    // Test required validation
    await user.click(messageInput);
    await user.tab();
    
    await waitFor(() => {
      expect(messageInput).toHaveAttribute('aria-invalid', 'true');
      const errorId = messageInput.getAttribute('aria-describedby');
      const errorElement = document.getElementById(errorId || '');
      expect(errorElement).toHaveTextContent('Message is required');
    });
    
    // Test minimum length
    await user.type(messageInput, 'Short');
    await user.tab();
    
    await waitFor(() => {
      expect(messageInput).toHaveAttribute('aria-invalid', 'true');
      const errorId = messageInput.getAttribute('aria-describedby');
      const errorElement = document.getElementById(errorId || '');
      expect(errorElement).toHaveTextContent('Message must be at least 10 characters');
    });
    
    // Test valid input
    await user.clear(messageInput);
    await user.type(messageInput, 'This is a valid test message with more than 10 characters');
    await user.tab();
    
    await waitFor(() => {
      expect(messageInput).toHaveAttribute('aria-invalid', 'false');
      expect(messageInput).toHaveAttribute('aria-describedby', '');
    });
  });

  it('prevents form submission when honeypot is filled', async () => {
    render(<ContactFormWithRecaptcha />);
    
    // Fill required fields
    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/message/i), 'This is a valid test message');
    
    // Fill honeypot
    const honeypot = document.querySelector('[name="website"]') as HTMLInputElement;
    await user.type(honeypot, 'spam@example.com');
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /send message/i });
    await user.click(submitButton);
    
    // Verify no submission occurred
    await waitFor(() => {
      expect(mockToast.error).not.toHaveBeenCalled();
      expect(mockToast.success).not.toHaveBeenCalled();
    });
  });

  it('submits the form successfully with valid data', async () => {
    render(<ContactFormWithRecaptcha />);
    
    // Fill form
    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/phone/i), '(123) 456-7890');
    await user.type(screen.getByLabelText(/message/i), 'This is a valid test message');
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /send message/i });
    await user.click(submitButton);
    
    // Verify submission
    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Thank you! Your message has been sent successfully');
    });
  });

  it('handles form submission error', async () => {
    // Mock failed API response
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Submission failed' })
    });
    
    render(<ContactFormWithRecaptcha />);
    
    // Fill form
    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/message/i), 'This is a valid test message');
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /send message/i });
    await user.click(submitButton);
    
    // Verify error handling
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to send message. Please try again.');
    });
  });

  it('shows loading state during submission', async () => {
    // Mock slow API response
    global.fetch = vi.fn().mockImplementation(
      () => new Promise(resolve => 
        setTimeout(() => resolve({ 
          ok: true, 
          json: () => Promise.resolve({ success: true }) 
        }), 1000)
      )
    );
    
    render(<ContactFormWithRecaptcha />);
    
    // Fill form
    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/message/i), 'This is a valid test message');
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /send message/i });
    await user.click(submitButton);
    
    // Verify loading state
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent(/sending/i);
    });
    
    // Verify loading state is removed after submission
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
      expect(submitButton).toHaveTextContent(/send message/i);
    }, { timeout: 2000 });
  });
});
