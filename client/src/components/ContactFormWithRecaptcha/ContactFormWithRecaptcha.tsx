import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { ErrorBoundary } from '../ErrorBoundary';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useContactForm, type FormData, type FormStatus } from '../../hooks/useContactForm';
import { useRouter } from 'next/router';
import Head from 'next/head';

// Types
type InputType = 'text' | 'email' | 'tel' | 'textarea' | 'url';

interface InputFieldProps {
  id: string;
  name: keyof FormData;
  type?: InputType;
  label: string;
  value: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  inputMode?: 'text' | 'email' | 'tel' | 'url' | 'numeric';
  rows?: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  inputRef?: React.Ref<HTMLInputElement | HTMLTextAreaElement>;
  className?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
  'aria-required'?: boolean | 'true' | 'false';
}

interface FormStatusProps {
  status: FormStatus | null;
  onRetry?: () => void;
  className?: string;
}

interface SkipToFormLinkProps {
  targetId?: string;
  className?: string;
  children?: React.ReactNode;
}

interface LoadingStateProps {
  message?: string;
  className?: string;
}

// Constants
const DEFAULT_FORM_TITLE = 'Contact Us';
const DEFAULT_SUCCESS_MESSAGE = 'Your message has been sent successfully! We\'ll get back to you soon.';
const DEFAULT_ERROR_MESSAGE = 'An error occurred while sending your message. Please try again.';
const DEFAULT_LOADING_MESSAGE = 'Loading security verification...';

// Memoized InputField component to prevent unnecessary re-renders
const InputField = React.memo(({
  id,
  name,
  type = 'text',
  label,
  value,
  error,
  required = false,
  disabled = false,
  autoComplete,
  inputMode,
  rows,
  onChange,
  onBlur,
  inputRef,
  className = '',
  ...props
}: InputFieldProps) => {
  const isTextarea = type === 'textarea';
  
  // Common props for both input and textarea
  const commonProps: Omit<React.InputHTMLAttributes<HTMLInputElement> & 
                        React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'aria-invalid' | 'aria-required'> & {
    'aria-invalid'?: boolean | 'true' | 'false' | 'grammar' | 'spelling';
    'aria-required'?: boolean | 'true' | 'false';
  } = {
    id,
    name,
    value,
    onChange,
    onBlur,
    disabled,
    className: `mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
      error ? 'border-red-500' : 'border-gray-300'
    } ${className}`,
    'aria-invalid': !!error,
    'aria-describedby': error ? `${id}-error` : undefined,
    'aria-required': required ? 'true' as const : undefined,
    ...props,
  };
  
  // Handle input element
  if (!isTextarea) {
    const inputProps: React.InputHTMLAttributes<HTMLInputElement> = {
      ...commonProps,
      type,
      autoComplete,
      inputMode,
    };
    
    return (
      <div className="space-y-1">
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
          {label}
          {required && (
            <>
              <span className="text-red-500" aria-hidden="true">*</span>
              <span className="sr-only"> (required)</span>
            </>
          )}
        </label>
        <div className="mt-1">
          <input 
            {...inputProps} 
            ref={inputRef as React.Ref<HTMLInputElement>} 
          />
        </div>
        {error && (
          <p 
            id={`${id}-error`} 
            className="mt-1 text-sm text-red-600" 
            role="alert"
            aria-live="assertive"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
  
  // Handle textarea element
  const textareaProps: React.TextareaHTMLAttributes<HTMLTextAreaElement> = {
    ...commonProps,
    rows: rows || 4,
  };
  
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
        {required && (
          <>
            <span className="text-red-500" aria-hidden="true">*</span>
            <span className="sr-only"> (required)</span>
          </>
        )}
      </label>
      <div className="mt-1">
        <textarea 
          {...textareaProps} 
          ref={inputRef as React.Ref<HTMLTextAreaElement>} 
        />
      </div>
      {error && (
        <p 
          id={`${id}-error`} 
          className="mt-1 text-sm text-red-600" 
          role="alert"
          aria-live="assertive"
        >
          {error}
        </p>
      )}
    </div>
  );
});

// FormStatus component for displaying form submission status
const FormStatus: React.FC<FormStatusProps> = ({ 
  status, 
  onRetry, 
  className = '' 
}) => {
  if (!status) return null;

  const isSuccess = status.success;
  const iconProps = {
    className: `h-5 w-5 ${isSuccess ? 'text-green-500' : 'text-yellow-500'}`,
    'aria-hidden': true,
  };

  const role = isSuccess ? 'status' : 'alert';

  return (
    <div
      role="status"
      className={`mb-6 p-4 rounded-md ${
        isSuccess
          ? 'bg-green-50 border-l-4 border-green-500 text-green-700'
          : 'bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700'
      } ${className}`}
      aria-live="polite"
      aria-atomic="true"
      data-testid="form-status"
    >
      <div className="flex">
        <div className="flex-shrink-0">
          {isSuccess ? (
            <svg {...iconProps} viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg {...iconProps} viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium">{status.message}</p>
          {!isSuccess && onRetry && (
            <div className="mt-2">
              <button
                type="button"
                onClick={onRetry}
                className="text-sm font-medium text-yellow-700 hover:text-yellow-600 underline focus:outline-none"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Skip to form link for keyboard navigation
const SkipToFormLink: React.FC<SkipToFormLinkProps> = ({
  targetId = 'contact-form',
  className = '',
  children = 'Skip to form',
}) => (
  <a
    href={`#${targetId}`}
    className={`sr-only focus:not-sr-only focus:block p-2 text-center text-blue-600 underline ${className}`}
    aria-label="Skip to contact form"
  >
    {children}
  </a>
);

// Loading state component
const LoadingState: React.FC<LoadingStateProps> = ({
  message = DEFAULT_LOADING_MESSAGE,
  className = '',
}) => (
  <div
    className={`max-w-md mx-auto p-6 bg-white rounded-lg shadow-md text-center ${className}`}
    role="status"
    aria-live="polite"
    aria-busy="true"
  >
    <h2 className="text-2xl font-bold mb-4">{DEFAULT_FORM_TITLE}</h2>
    <p className="text-gray-600 mb-4">{message}</p>
    <LoadingSpinner />
    <span className="sr-only">Loading security verification...</span>
  </div>
);

/**
 * Props for the ContactFormWithRecaptcha component
 */
interface ContactFormWithRecaptchaProps {
  /** Google reCAPTCHA v3 site key */
  recaptchaSiteKey: string;
  /** API endpoint for form submission (default: '/api/contact') */
  endpoint?: string;
  /** Additional CSS classes for the form container */
  className?: string;
  /** Form title (default: 'Contact Us') */
  formTitle?: string;
  /** Success message shown after form submission (default: 'Your message has been sent successfully!') */
  successMessage?: string;
  /** Error message shown when form submission fails (default: 'An error occurred while sending your message.') */
  errorMessage?: string;
  /** Loading message shown while reCAPTCHA is loading (default: 'Loading security verification...') */
  loadingMessage?: string;
  /** Callback function called on successful form submission */
  onSuccess?: (data: FormData) => void;
  /** Callback function called when form submission fails */
  onError?: (error: Error) => void;
  /** Callback function called when form validation fails */
  onValidationError?: (errors: Record<string, string>) => void;
}

/**
 * A secure, accessible, and performant contact form with reCAPTCHA v3 protection.
 * 
 * @component
 * @example
 * ```tsx
 * <ContactFormWithRecaptcha recaptchaSiteKey="your-site-key" />
 * ```
 * 
 * @param {Object} props - Component props
 * @param {string} props.recaptchaSiteKey - Google reCAPTCHA v3 site key
 * @param {string} [props.endpoint='/api/contact'] - API endpoint for form submission
 * @param {string} [props.className] - Additional CSS classes for the form container
 * @param {string} [props.formTitle='Contact Us'] - Form title
 * @param {string} [props.successMessage='Your message has been sent successfully!'] - Success message shown after form submission
 * @param {string} [props.errorMessage='An error occurred while sending your message.'] - Error message shown when form submission fails
 * @param {string} [props.loadingMessage='Loading security verification...'] - Loading message shown while reCAPTCHA is loading
 * @param {function} [props.onSuccess] - Callback function called on successful form submission
 * @param {function} [props.onError] - Callback function called when form submission fails
 * @param {function} [props.onValidationError] - Callback function called when form validation fails
 */
const ContactFormWithRecaptcha: React.FC<ContactFormWithRecaptchaProps> = ({
  recaptchaSiteKey,
  endpoint = '/api/contact',
  className = '',
  formTitle = DEFAULT_FORM_TITLE,
  successMessage = DEFAULT_SUCCESS_MESSAGE,
  errorMessage = DEFAULT_ERROR_MESSAGE,
  loadingMessage = DEFAULT_LOADING_MESSAGE,
  onSuccess,
  onError,
  onValidationError,
}) => {
  const {
    // State
    formData,
    formErrors,
    isSubmitting,
    isRecaptchaLoading,
    submitStatus,
    recaptchaError,
    timeUntilNextSubmit,
    
    // Refs
    firstErrorRef,
    
    // Handlers
    handleChange,
    handleBlur,
    handleSubmit,
    handleRefreshRecaptcha,
    submitWithRecaptcha,
  } = useContactForm(recaptchaSiteKey, endpoint);

  // Auto-focus first error field when errors change
  useEffect(() => {
    if (firstErrorRef.current) {
      firstErrorRef.current.focus();
    }
  }, [formErrors, firstErrorRef]);

  // Handle form submission with validation and reCAPTCHA
  const handleFormSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const isValid = await handleSubmit(e);
    if (isValid) {
      await submitWithRecaptcha();
    }
  }, [handleSubmit, submitWithRecaptcha]);

  // Loading state
  if (isRecaptchaLoading) {
    return <LoadingState message={loadingMessage} />;
  }

  return (
    <ErrorBoundary>
      <SkipToFormLink targetId="contact-form" />
      
      <div 
        id="contact-form"
        className={`max-w-xl mx-auto p-6 bg-white rounded-lg shadow-md ${className}`}
        aria-labelledby="form-title"
      >
        <h1 id="form-title" className="text-2xl font-bold mb-6 text-gray-800">
          {formTitle}
        </h1>
        
        <FormStatus 
          status={submitStatus} 
          onRetry={recaptchaError ? handleRefreshRecaptcha : undefined} 
        />
        
        <form 
          onSubmit={handleFormSubmit}
          className="space-y-6"
          aria-busy={isSubmitting ? 'true' : 'false'}
          aria-live="polite"
          aria-atomic="true"
          noValidate
          aria-describedby={submitStatus ? 'form-status' : undefined}
        >
          <InputField
            id="name"
            name="name"
            type="text"
            label="Name"
            value={formData.name}
            error={formErrors.name}
            required
            disabled={isSubmitting}
            onChange={handleChange}
            onBlur={handleBlur}
            inputRef={formErrors.name ? firstErrorRef : undefined}
            autoComplete="name"
          />
          
          <InputField
            id="email"
            name="email"
            type="email"
            label="Email"
            value={formData.email}
            error={formErrors.email}
            required
            disabled={isSubmitting}
            onChange={handleChange}
            onBlur={handleBlur}
            inputRef={formErrors.email ? firstErrorRef : undefined}
            autoComplete="email"
            inputMode="email"
          />
          
          <InputField
            id="message"
            name="message"
            type="textarea"
            label="Message"
            value={formData.message}
            error={formErrors.message}
            required
            disabled={isSubmitting}
            rows={4}
            onChange={handleChange}
            onBlur={handleBlur}
            inputRef={formErrors.message ? firstErrorRef : undefined}
          />
          
          {/* Honeypot field - hidden from users but visible to bots */}
          <div 
            className="absolute left-[-9999px] w-px h-px overflow-hidden"
            aria-hidden="true"
          >
            <label htmlFor="website">Don't fill this out if you're human:</label>
            <input
              type="text"
              id="website"
              name="website"
              value={formData.website}
              onChange={handleChange}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-sm text-gray-600">
              <span className="text-red-500" aria-hidden="true">*</span>{' '}
              <span className="sr-only">Required fields</span>
              <span aria-hidden="true">Indicates required fields</span>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {timeUntilNextSubmit > 0 && (
                <p className="text-sm text-red-600">
                  Please wait {timeUntilNextSubmit} seconds before trying again
                </p>
              )}
              
              <button
                className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    (isSubmitting || !recaptchaLoaded) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                aria-busy={isSubmitting ? 'true' : 'false'}
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="small" aria-hidden="true" />
                    <span className="ml-2">Sending...</span>
                  </>
                ) : (
                  'Send Message'
                )}
              </button>
            </div>
          </div>
          
          {/* Hidden status messages for screen readers */}
          <div className="sr-only" aria-live="polite">
            {isSubmitting && 'Submitting form, please wait...'}
            {isRecaptchaLoading && 'Loading security verification...'}
            {recaptchaError && 'Security verification failed. Please try again.'}
          </div>
        </form>
        
        {/* Hidden form submission status for screen readers */}
        <div className="sr-only" role="status" aria-live="polite">
          {submitStatus?.success && successMessage}
          {submitStatus && !submitStatus.success && errorMessage}
        </div>
      </div>
    </ErrorBoundary>
  );
};

/**
 * Export a dynamic version with no SSR to avoid window/document issues
 * This is important for reCAPTCHA which requires browser APIs
 */
export default dynamic<ContactFormWithRecaptchaProps>(
  () => Promise.resolve(ContactFormWithRecaptcha),
  { 
    ssr: false,
    loading: () => (
      <div 
        className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md text-center"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
        <span className="sr-only">Loading contact form...</span>
      </div>
    )
  }
);

// Named export for TypeScript support
export { ContactFormWithRecaptcha };

// Re-export types for easier imports
export type { ContactFormWithRecaptchaProps };

// Add display name for better debugging
ContactFormWithRecaptcha.displayName = 'ContactFormWithRecaptcha';
