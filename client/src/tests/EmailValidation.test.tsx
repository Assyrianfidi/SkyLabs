import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { toast } from 'react-hot-toast';
import EmailValidation from '../components/EmailValidation';
import { testBlurValidation, testFormSubmission } from './utils/validationHelpers';

// Mock react-hot-toast
vi.mock('react-hot-toast');

describe('EmailValidation', () => {
  const user = userEvent.setup();
  let mockOnSubmit: ReturnType<typeof vi.fn>;

  const mockToast = vi.mocked(toast);
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSubmit = vi.fn().mockResolvedValue(undefined);
  });

  it('renders email input and submit button', () => {
    render(<EmailValidation />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /validate email/i })).toBeInTheDocument();
  });

  it('validates email on blur', async () => {
    render(<EmailValidation />);
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

  it('calls onSubmit with email when form is valid', async () => {
    render(<EmailValidation onSubmit={mockOnSubmit} />);
    const email = 'test@example.com';
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /validate email/i });

    await user.type(emailInput, email);
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(email);
      expect(mockToast.success).toHaveBeenCalledWith(
        'Thank you! Your email has been validated successfully'
      );
    });
  });

  it('handles form submission with loading state', async () => {
    render(<EmailValidation onSubmit={mockOnSubmit} />);
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /validate email/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);
    
    // Verify loading state
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent(/validating/i);
    });
    
    // Verify loading state is removed after submission
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
      expect(submitButton).toHaveTextContent(/validate email/i);
    });
  });
  
  it('disables submit button when email is invalid', async () => {
    render(<EmailValidation />);
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /validate email/i });
    
    // Initially disabled
    await waitFor(() => expect(submitButton).toBeDisabled());
    
    // Invalid email
    await user.type(emailInput, 'invalid');
    await waitFor(() => expect(submitButton).toBeDisabled());
    
    // Valid email
    await user.clear(emailInput);
    await user.type(emailInput, 'valid@example.com');
    await waitFor(() => expect(submitButton).not.toBeDisabled());
    
    // Clear input
    await user.clear(emailInput);
    await waitFor(() => expect(submitButton).toBeDisabled());
  });
  
  it('shows success message on successful submission', async () => {
    render(<EmailValidation onSubmit={mockOnSubmit} />);
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /validate email/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith(
        'Thank you! Your email has been validated successfully'
      );
    });
  });
  
  it('shows error message on submission failure', async () => {
    const error = new Error('Validation failed');
    mockOnSubmit.mockRejectedValueOnce(error);
    
    render(<EmailValidation onSubmit={mockOnSubmit} />);
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /validate email/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        'Failed to validate email. Please try again.'
      );
    });
  });

    // Initially disabled
    await waitFor(() => expect(submitButton).toBeDisabled());

    // Invalid email
    await user.type(emailInput, 'invalid');
    await waitFor(() => expect(submitButton).toBeDisabled());

    // Valid email
    await user.clear(emailInput);
    await user.type(emailInput, 'valid@example.com');
    await waitFor(() => expect(submitButton).not.toBeDisabled());

    // Clear input
    await user.clear(emailInput);
    await waitFor(() => expect(submitButton).toBeDisabled());
  });

  it('shows success message on successful submission', async () => {
    render(<EmailValidation onSubmit={mockOnSubmit} />);
    const emailInput = screen.getByTestId('email-input');
    const submitButton = screen.getByTestId('submit-button');
    
    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/thank you! your email has been validated successfully/i)).toBeInTheDocument();
    });
  });
});
