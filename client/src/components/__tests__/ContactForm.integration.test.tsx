import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'react-hot-toast';
import ContactForm from '../ContactForm';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ContactForm - Integration Tests', () => {
  const user = userEvent.setup();
  
  beforeEach(() => {
    vi.clearAllMocks();
    render(<ContactForm />);
  });

  // Helper function to fill and submit the form
  const fillAndSubmitForm = async (overrides = {}) => {
    const values = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '(123) 456-7890',
      message: 'This is a test message that is long enough',
      ...overrides,
    };

    // Fill in form fields
    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const phoneInput = screen.getByLabelText(/phone/i);
    const messageInput = screen.getByLabelText(/message/i);
    const submitButton = screen.getByRole('button', { name: /send message/i });

    // Clear any existing values
    await user.clear(nameInput);
    await user.clear(emailInput);
    await user.clear(phoneInput);
    await user.clear(messageInput);

    // Fill in new values
    await user.type(nameInput, values.name);
    await user.type(emailInput, values.email);
    
    // Only type phone if it's provided (it's optional)
    if (values.phone) {
      await user.type(phoneInput, values.phone);
    }
    
    await user.type(messageInput, values.message);
    
    // Submit form
    await user.click(submitButton);
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders all form fields and submit button', () => {
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    // Submit empty form
    await user.click(screen.getByRole('button', { name: /send message/i }));

    // Check for validation errors
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(await screen.findByText('Message is required')).toBeInTheDocument();
    
    // Phone is optional, should not show error
    expect(screen.queryByText('Phone is required')).not.toBeInTheDocument();
  });

  it('validates email format', async () => {
    // Enter invalid email
    await user.type(screen.getByLabelText(/email/i), 'invalid-email');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(await screen.findByText('Please enter a valid email')).toBeInTheDocument();
  });

  it('submits the form with valid data', async () => {
    // Fill and submit form
    await fillAndSubmitForm();

    // Verify success toast was shown
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Thank you! Your message has been sent successfully');
    });
  });

  it('handles submission errors', async () => {
    // Mock fetch to reject
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

    // Fill and submit form
    await fillAndSubmitForm();

    // Verify error handling
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to send message. Please try again.');
    });
  }, 10000); // Increase timeout for this test

  it('blocks form submission when honeypot field is filled', async () => {
    // Fill in the honeypot field
    const honeypot = screen.getByLabelText(/leave this field empty/i);
    await user.type(honeypot, 'spam-bot');
    
    // Fill in the rest of the form
    await fillAndSubmitForm();
    
    // Verify no success toast was shown
    await waitFor(() => {
      expect(toast.success).not.toHaveBeenCalled();
    });
  });
});
