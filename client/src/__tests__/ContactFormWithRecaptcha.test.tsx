import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, beforeAll } from 'vitest';
import toast from 'react-hot-toast';
import ContactFormWithRecaptcha from '../components/ContactFormWithRecaptcha';

// Create mock functions
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
};

// Mock the module with our mock functions
vi.mock('react-hot-toast', () => ({
  ...mockToast,
  default: mockToast,
  __esModule: true,
}));

// Mock react-google-recaptcha-v3
const mockExecuteRecaptcha = vi.fn().mockResolvedValue('test-token');
vi.mock('react-google-recaptcha-v3', () => ({
  useGoogleReCaptcha: vi.fn(() => ({
    executeRecaptcha: mockExecuteRecaptcha,
  })),
}));

// Mock next/head
vi.mock('next/head', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Extend the Window interface to include grecaptcha
declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

// Mock window.grecaptcha
const mockGrecaptcha = {
  ready: (callback: () => void) => callback(),
  execute: vi.fn().mockImplementation((siteKey: string, options: { action: string }) => 
    Promise.resolve('test-token')
  ),
};

beforeAll(() => {
  // @ts-ignore - We're mocking the global grecaptcha
  window.grecaptcha = mockGrecaptcha;
});

describe('ContactFormWithRecaptcha', () => {
  const user = userEvent.setup();
  const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecuteRecaptcha.mockClear();
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
  });

  it('renders all form fields', () => {
    render(<ContactFormWithRecaptcha onSubmit={mockOnSubmit} />);
    
    expect(screen.getByLabelText(/name \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message \*/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
  });

  it('validates required fields on blur', async () => {
    render(<ContactFormWithRecaptcha onSubmit={mockOnSubmit} />);
    
    const nameInput = screen.getByLabelText(/name \*/i);
    const emailInput = screen.getByLabelText(/email \*/i);
    const messageInput = screen.getByLabelText(/message \*/i);

    // Test name validation
    await user.click(nameInput);
    await user.tab(); // Move focus away to trigger blur
    
    // Check that the error message is displayed and input has error styling
    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(nameInput).toHaveAttribute('aria-invalid', 'true');
      expect(nameInput).toHaveAttribute('aria-describedby');
      expect(screen.getByText('Name is required')).toHaveAttribute('id', 'name-error');
    });

    // Test email validation
    await user.click(emailInput);
    await user.tab(); // Move focus away to trigger blur
    
    // Check that the error message is displayed and input has error styling
    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      expect(emailInput).toHaveAttribute('aria-describedby');
      expect(screen.getByText('Email is required')).toHaveAttribute('id', 'email-error');
    });

    // Test message validation
    await user.click(messageInput);
    await user.tab(); // Move focus away to trigger blur
    
    // Check that the error message is displayed and input has error styling
    await waitFor(() => {
      expect(screen.getByText('Message is required')).toBeInTheDocument();
      expect(messageInput).toHaveAttribute('aria-invalid', 'true');
      expect(messageInput).toHaveAttribute('aria-describedby');
      expect(screen.getByText('Message is required')).toHaveAttribute('id', 'message-error');
    });
  });

  it('validates email format', async () => {
    render(<ContactFormWithRecaptcha onSubmit={mockOnSubmit} />);
    
    const emailInput = screen.getByLabelText(/email \*/i);
    await user.type(emailInput, 'invalid-email');
    await user.tab();
    
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      expect(emailInput).toHaveAttribute('aria-describedby');
    });
    
    // Test valid email clears the error
    await user.clear(emailInput);
    await user.type(emailInput, 'valid@example.com');
    await user.tab();
    
    await waitFor(() => {
      expect(screen.queryByText(/please enter a valid email/i)).not.toBeInTheDocument();
      expect(emailInput).toHaveAttribute('aria-invalid', 'false');
      expect(emailInput).not.toHaveAttribute('aria-describedby');
    });
  });

  it('validates message length', async () => {
    render(<ContactFormWithRecaptcha onSubmit={mockOnSubmit} />);
    
    const messageInput = screen.getByLabelText(/message \*/i);
    await user.type(messageInput, 'short');
    await user.tab();
    
    await waitFor(() => {
      expect(screen.getByText(/message must be at least 10 characters/i)).toBeInTheDocument();
      expect(messageInput).toHaveAttribute('aria-invalid', 'true');
    });
  });

  it('enables submit button when form is valid', async () => {
    render(<ContactFormWithRecaptcha onSubmit={mockOnSubmit} />);
    
    const submitButton = screen.getByRole('button', { name: /send message/i });
    expect(submitButton).toBeDisabled();
    
    // Fill in required fields
    const nameInput = screen.getByLabelText(/name \*/i);
    const emailInput = screen.getByLabelText(/email \*/i);
    const messageInput = screen.getByLabelText(/message \*/i);
    
    await user.type(nameInput, 'John Doe');
    await user.type(emailInput, 'test@example.com');
    await user.type(messageInput, 'This is a test message with more than 10 characters');
    
    // Wait for validation to complete
    await waitFor(() => {
      expect(nameInput).toHaveValue('John Doe');
      expect(emailInput).toHaveValue('test@example.com');
      expect(messageInput).toHaveValue('This is a test message with more than 10 characters');
    });
    
    // Check if button is enabled
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('shows loading state during submission', async () => {
    render(<ContactFormWithRecaptcha onSubmit={mockOnSubmit} />);
    
    // Fill in required fields
    await user.type(screen.getByLabelText(/name \*/i), 'John Doe');
    await user.type(screen.getByLabelText(/email \*/i), 'test@example.com');
    await user.type(screen.getByLabelText(/message \*/i), 'This is a test message with more than 10 characters');
    
    const submitButton = screen.getByRole('button', { name: /send message/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(submitButton).toHaveTextContent(/sending/i);
      expect(submitButton).toBeDisabled();
    });
  });

  it('calls onSubmit with form data when form is valid', async () => {
    render(<ContactFormWithRecaptcha onSubmit={mockOnSubmit} />);
    
    // Fill in required fields
    const nameInput = screen.getByLabelText(/name \*/i);
    const emailInput = screen.getByLabelText(/email \*/i);
    const phoneInput = screen.getByLabelText(/phone/i);
    const messageInput = screen.getByLabelText(/message \*/i);
    
    await user.type(nameInput, 'John Doe');
    await user.type(emailInput, 'test@example.com');
    await user.type(phoneInput, '(123) 456-7890');
    await user.type(messageInput, 'This is a test message');
    
    const submitButton = screen.getByRole('button', { name: /send message/i });
    
    // Mock the reCAPTCHA token
    mockExecuteRecaptcha.mockResolvedValueOnce('test-token');
    
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'test@example.com',
        phone: '(123) 456-7890',
        message: 'This is a test message',
        website: ''
      });
    });
    
    // Verify reCAPTCHA was called
    expect(mockExecuteRecaptcha).toHaveBeenCalledWith('contact_form');
  });

  it('shows success toast on successful submission', async () => {
    mockOnSubmit.mockResolvedValueOnce(undefined);
    render(<ContactFormWithRecaptcha onSubmit={mockOnSubmit} />);
    
    // Fill in required fields
    const nameInput = screen.getByLabelText(/name \*/i);
    const emailInput = screen.getByLabelText(/email \*/i);
    const messageInput = screen.getByLabelText(/message \*/i);
    
    await user.type(nameInput, 'John Doe');
    await user.type(emailInput, 'test@example.com');
    await user.type(messageInput, 'This is a test message');
    
    const submitButton = screen.getByRole('button', { name: /send message/i });
    
    // Verify button is enabled before submission
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
    
    await user.click(submitButton);
    
    // Wait for reCAPTCHA to be called
    await waitFor(() => {
      expect(mockExecuteRecaptcha).toHaveBeenCalledWith('contact_form');
    });
    
    // Wait for form submission to complete
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        'Thank you! Your message has been sent successfully'
      );
    });
  });

  it('shows error toast on submission failure', async () => {
    const error = new Error('Submission failed');
    mockOnSubmit.mockRejectedValueOnce(error);
    
    render(<ContactFormWithRecaptcha onSubmit={mockOnSubmit} />);
    
    // Fill in required fields
    await user.type(screen.getByLabelText(/name \*/i), 'John Doe');
    await user.type(screen.getByLabelText(/email \*/i), 'test@example.com');
    await user.type(screen.getByLabelText(/message \*/i), 'This is a test message');
    
    const submitButton = screen.getByRole('button', { name: /send message/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Failed to send message. Please try again.'
      );
    });
  });

  it('prevents submission when honeypot is filled', async () => {
    render(<ContactFormWithRecaptcha onSubmit={mockOnSubmit} />);
    
    // Fill in required fields
    await user.type(screen.getByLabelText(/name \*/i), 'John Doe');
    await user.type(screen.getByLabelText(/email \*/i), 'test@example.com');
    await user.type(screen.getByLabelText(/message \*/i), 'This is a test message');
    
    // Fill honeypot field
    const honeypot = screen.getByLabelText(/leave this field empty/i);
    await user.type(honeypot, 'spam-bot');
    
    const submitButton = screen.getByRole('button', { name: /send message/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });
});
