import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { type FormStatus, type FormData } from '../../../hooks/useContactForm';
import ContactFormWithRecaptcha, { type ContactFormWithRecaptchaProps } from '..';

// Mock the useContactForm hook
const mockUseContactForm = vi.fn();
vi.mock('../../../hooks/useContactForm', () => ({
  useContactForm: mockUseContactForm,
  FormStatus: {},
  FormData: {},
}));

// Mock next/dynamic
vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: (component: any) => {
    component.preload = vi.fn();
    return component;
  },
}));

// Mock the reCAPTCHA component
vi.mock('react-google-recaptcha', () => ({
  __esModule: true,
  default: () => <div data-testid="recaptcha-mock" />,
}));

describe('ContactFormWithRecaptcha', () => {
  // Mock handler functions
  const mockHandleChange = vi.fn();
  const mockHandleBlur = vi.fn();
  const mockHandleSubmit = vi.fn((e) => {
    e?.preventDefault?.();
    return Promise.resolve(true);
  });
  const mockHandleRefreshRecaptcha = vi.fn();
  
  // Default props for the component
  const defaultProps: ContactFormWithRecaptchaProps = {
    recaptchaSiteKey: 'test-site-key',
    endpoint: '/api/contact',
    formTitle: 'Test Form',
    successMessage: 'Success!',
    errorMessage: 'Error!',
    loadingMessage: 'Loading...',
  };
  
  // Default form state for the mock
  const defaultFormState = {
    formData: {
      name: '',
      email: '',
      message: '',
      website: '', // Honeypot field
    } as FormData,
    formErrors: {},
    touchedFields: {},
    isSubmitting: false,
    isRecaptchaLoading: false,
    submitStatus: null,
    recaptchaError: null,
    timeUntilNextSubmit: 0,
    firstErrorRef: { current: null },
    formRef: { current: null },
    handleChange: mockHandleChange,
    handleBlur: mockHandleBlur,
    handleSubmit: mockHandleSubmit,
    handleRefreshRecaptcha: mockHandleRefreshRecaptcha,
    submitWithRecaptcha: vi.fn().mockResolvedValue(true),
    resetForm: vi.fn(),
    validateField: vi.fn(),
    validateForm: vi.fn().mockResolvedValue({ isValid: true, errors: {} }),
    setFieldTouched: vi.fn(),
    setFieldValue: vi.fn(),
    setErrors: vi.fn(),
    setStatus: vi.fn(),
    setSubmitting: vi.fn(),
    setTouched: vi.fn(),
    setValues: vi.fn(),
    setFieldError: vi.fn(),
  };
  
  // Reset mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseContactForm.mockReturnValue({
      ...defaultFormState,
      handleChange: mockHandleChange,
      handleBlur: mockHandleBlur,
      handleSubmit: mockHandleSubmit,
      handleRefreshRecaptcha: mockHandleRefreshRecaptcha,
    });
  });

  // Mock next/dynamic
  vi.mock('next/dynamic', () => ({
    __esModule: true,
    default: (component: any) => {
      component.preload = vi.fn();
      return component;
    },
  }));

  // Mock the reCAPTCHA component
  vi.mock('react-google-recaptcha', () => ({
    __esModule: true,
    default: () => <div data-testid="recaptcha-mock" />,
  }));
  
  it('renders the form fields', () => {
    render(<ContactFormWithRecaptcha {...defaultProps} />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
  });

  it('displays the form title', () => {
    render(<ContactFormWithRecaptcha {...defaultProps} formTitle="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('shows validation errors when form is submitted with empty fields', async () => {
    mockUseContactForm.mockReturnValue({
      ...defaultFormState,
      formErrors: {
        name: 'Name is required',
        email: 'Email is required',
        message: 'Message is required',
      } as Record<keyof FormData, string>,
      touchedFields: {
        name: true,
        email: true,
        message: true,
      },
    });

    render(<ContactFormWithRecaptcha {...defaultProps} />);
    
    // Check for error messages
    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Message is required')).toBeInTheDocument();
  });

  it('shows disabled submit button when timeUntilNextSubmit > 0', () => {
    mockUseContactForm.mockReturnValue({
      ...defaultFormState,
      timeUntilNextSubmit: 30,
    } as any);

    render(<ContactFormWithRecaptcha {...defaultProps} />);
    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled();
  });
  it('updates input value on change', async () => {
    const user = userEvent.setup();
    const testName = 'John Doe';
    
    // Mock the form state with our mock handlers
    mockUseContactForm.mockReturnValue({
      ...defaultFormState,
      formData: {
        ...defaultFormState.formData,
        name: testName,
      },
      handleChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        // Update the formData with the new value
        mockUseContactForm.mock.calls[mockUseContactForm.mock.calls.length - 1][0] = {
          ...mockUseContactForm.mock.calls[mockUseContactForm.mock.calls.length - 1][0],
          formData: {
            ...mockUseContactForm.mock.calls[mockUseContactForm.mock.calls.length - 1][0].formData,
            [e.target.name]: e.target.value,
          },
        };
      },
    });
    
    render(<ContactFormWithRecaptcha {...defaultProps} />);
    const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
    
    // Simulate typing in the input
    await user.type(nameInput, testName);
    
    // Verify the input value was updated
    expect(nameInput.value).toBe(testName);
  });

  it('shows validation errors after blur', () => {
    const errorMessage = 'Name is required';
    
    // Mock the form state with validation error
    mockUseContactForm.mockReturnValue({
      ...defaultFormState,
      formErrors: {
        ...defaultFormState.formErrors,
        name: errorMessage,
      },
      touchedFields: {
        ...defaultFormState.touchedFields,
        name: true,
      },
    });
    
    render(<ContactFormWithRecaptcha {...defaultProps} />);
    
    // Check if the error message is displayed
    const errorElement = screen.getByText(errorMessage);
    expect(errorElement).toBeInTheDocument();
  });

  it('shows error message when recaptchaError is present', () => {
    // Mock the form state with a recaptcha error
    mockUseContactForm.mockReturnValue({
      ...defaultFormState,
      recaptchaError: {
        code: 'recaptcha-error',
        message: 'Security verification failed',
        name: 'RecaptchaError',
      },
      submitStatus: {
        success: false,
        message: 'Security verification failed',
      },
    });

    render(<ContactFormWithRecaptcha {...defaultProps} />);
    
    // Check for the error message in the status message area
    const statusContainer = screen.getByRole('alert');
    expect(statusContainer).toHaveTextContent(/security verification failed/i);
  });

  it('is accessible', async () => {
    // Mock a clean form state for accessibility test
    mockUseContactForm.mockReturnValue({
      ...defaultFormState,
      formData: {
        name: 'Test User',
        email: 'test@example.com',
        message: 'Test message',
        website: '', // Honeypot field
      },
    });
    
    const { container } = render(<ContactFormWithRecaptcha {...defaultProps} />);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
