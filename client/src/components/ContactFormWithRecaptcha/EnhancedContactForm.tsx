import { useState, useEffect, useCallback, useRef, useMemo, type ReactNode, type ChangeEvent, type FocusEvent, type Ref } from 'react';
import dynamic from 'next/dynamic';
import { ErrorBoundary } from '../ErrorBoundary';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useContactForm } from '../../hooks/useContactForm';
import type { ContactFormWithRecaptchaProps, FormStatus } from './types';

// Constants
const DEFAULT_FORM_TITLE = 'Contact Us';
const DEFAULT_SUCCESS_MESSAGE = 'Your message has been sent successfully! We\'ll get back to you soon.';
const DEFAULT_ERROR_MESSAGE = 'An error occurred while sending your message. Please try again.';
const DEFAULT_LOADING_MESSAGE = 'Loading security verification...';

/**
 * InputField component for form inputs with proper TypeScript types and accessibility
 */
const InputField = ({
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
}: {
  id: string;
  name: string;
  type?: string;
  label: string;
  value: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  inputMode?: 'text' | 'email' | 'tel' | 'url' | 'numeric' | 'search';
  rows?: number;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur: (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  inputRef?: Ref<HTMLInputElement | HTMLTextAreaElement>;
  className?: string;
}) => {
  const isTextarea = type === 'textarea';
  const commonProps = {
    id,
    name,
    value,
    onChange,
    onBlur,
    disabled,
    className: `mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
      error ? 'border-red-500' : 'border-gray-300'
    } ${className}`,
    'aria-invalid': error ? 'true' as const : 'false' as const,
    'aria-describedby': error ? `${id}-error` : undefined,
    'aria-required': required || undefined,
    ...props,
  } as const;

  // Handle input element
  if (!isTextarea) {
    const inputProps = {
      ...commonProps,
      type,
      autoComplete,
      inputMode,
    } as const;

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
            aria-live="polite"
            aria-atomic="true"
          >
            {error}
          </p>
        )}
      </div>
    );
  }

  // Handle textarea element
  const textareaProps = {
    ...commonProps,
    rows: rows || 4,
  } as const;

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
          aria-live="polite"
          aria-atomic="true"
        >
          {error}
        </p>
      )}
    </div>
  );
};

/**
 * FormStatus component to display form submission status
 */
const FormStatus = ({ 
  status, 
  onRetry,
  className = '' 
}: { 
  status: FormStatus | null; 
  onRetry?: () => void;
  className?: string;
}) => {
  if (!status) return null;

  const isSuccess = status.success;
  const iconProps = {
    className: `h-5 w-5 ${isSuccess ? 'text-green-500' : 'text-yellow-500'}`,
    'aria-hidden': true,
  };

  return (
    <div
      className={`mb-6 p-4 rounded-md ${
        isSuccess
          ? 'bg-green-50 border-l-4 border-green-500 text-green-700'
          : 'bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700'
      } ${className}`}
      role="alert"
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

/**
 * SkipToFormLink component for keyboard users
 */
const SkipToFormLink = ({
  targetId = 'contact-form',
  className = '',
  children = 'Skip to form',
}: {
  targetId?: string;
  className?: string;
  children?: React.ReactNode;
}) => (
  <a
    href={`#${targetId}`}
    className={`sr-only focus:not-sr-only focus:block p-2 text-center text-blue-600 underline ${className}`}
    aria-label="Skip to contact form"
  >
    {children}
  </a>
);

/**
 * LoadingState component for form loading state
 */
const LoadingState = ({
  message = DEFAULT_LOADING_MESSAGE,
  className = '',
}: {
  message?: string;
  className?: string;
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
 * EnhancedContactForm - A production-ready contact form with reCAPTCHA v3 integration
 * 
 * @component
 * @example
 * ```tsx
 * <EnhancedContactForm 
 *   recaptchaSiteKey="your-site-key"
 *   onSuccess={(data) => console.log('Form submitted:', data)}
 * />
 * ```
 */
const EnhancedContactForm = ({
  recaptchaSiteKey,
  endpoint = '/api/contact',
  className = '',
  formTitle = DEFAULT_FORM_TITLE,
  successMessage = DEFAULT_SUCCESS_MESSAGE,
  errorMessage = DEFAULT_ERROR_MESSAGE,
  loadingMessage = DEFAULT_LOADING_MESSAGE,
  rateLimitSeconds = 30,
  onSuccess,
  onError,
  onValidationError,
}: ContactFormWithRecaptchaProps) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  // State for form submission and reCAPTCHA
  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false);
  const [submitButtonText, setSubmitButtonText] = useState('Send Message');
  const submitButtonClassName = '';
  
  // Initialize form hook
  const {
    formData,
    formErrors,
    isSubmitting,
    isRecaptchaLoading,
    submitStatus,
    recaptchaError,
    timeUntilNextSubmit,
    firstErrorRef,
    handleChange,
    handleBlur,
    handleSubmit,
    handleRefreshRecaptcha,
    submitWithRecaptcha,
  } = useContactForm(recaptchaSiteKey, {
    endpoint,
    onSuccess: (data) => {
      onSuccess?.(data);
      // Reset form after successful submission
      if (formRef.current) {
        formRef.current.reset();
      }
      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: (error) => {
      onError?.(error);
      // Scroll to top to show error message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onValidationError: (errors) => {
      onValidationError?.(errors);
      // Focus on first error field
      if (firstErrorRef.current) {
        firstErrorRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    },
    rateLimitSeconds,
  });
  
  // Set mounted state to avoid hydration issues
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);
  
  // Handle form submission with validation and reCAPTCHA
  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      const result = await handleSubmit(e);
      if (onSuccess && result) onSuccess(result);
    } catch (error: unknown) {
      if (onError && error instanceof Error) onError(error);
    }
  };
  
  // Handle retry submission
  const handleRetry = useCallback(() => {
    if (recaptchaError) {
      handleRefreshRecaptcha();
    } else if (formRef.current) {
      formRef.current.dispatchEvent(
        new Event('submit', { cancelable: true, bubbles: true })
      );
    }
  }, [recaptchaError, handleRefreshRecaptcha]);
  
  // Show loading state while reCAPTCHA is loading
  if (isRecaptchaLoading || !isMounted) {
    return <LoadingState message={loadingMessage} />;
  }
  
  // Format the success message with the user's name if available
  const formattedSuccessMessage = formData.name 
    ? `Thank you, ${formData.name.split(' ')[0]}! ${successMessage}` 
    : successMessage;
  
  // Format the status for the FormStatus component
  const formattedStatus = useMemo<FormStatus | null>(() => {
    if (!submitStatus) return null;
    
    let message: string;
    if (typeof submitStatus.message === 'string') {
      message = submitStatus.message;
    } else if (submitStatus.success) {
      message = 'Message sent successfully!';
    } else {
      message = 'An error occurred';
    }
    
    return {
      message,
      success: submitStatus.success,
      code: submitStatus.code,
      timestamp: submitStatus.timestamp
    };
  }, [submitStatus]);
  
  return (
    <ErrorBoundary>
      <SkipToFormLink />
      
      <div 
        id="contact-form"
        className={`max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md ${className}`}
        aria-labelledby="form-title"
      >
        <h1 id="form-title" className="text-2xl font-bold mb-6 text-gray-800">
          {formTitle}
        </h1>
        
        <FormStatus 
          status={formattedStatus} 
          onRetry={handleRetry}
          className="mb-6"
        />
        
        <form 
          ref={formRef}
          onSubmit={handleFormSubmit}
          className={`space-y-6 ${className}`}
          aria-busy={isSubmitting ? 'true' : 'false'}
          aria-live="polite"
          aria-atomic="true"
          aria-describedby="form-status"
          noValidate
        >
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <InputField
              id="name"
              name="name"
              type="text"
              label="Full Name"
              value={formData.name}
              error={formErrors.name}
              required
              disabled={isSubmitting}
              onChange={handleChange}
              onBlur={handleBlur}
              inputRef={formErrors.name ? firstErrorRef : undefined}
              autoComplete="name"
              inputMode="text"
              aria-required="true"
              aria-invalid={formErrors.name ? 'true' : 'false'}
              aria-describedby={formErrors.name ? 'name-error' : undefined}
            />
            
            <InputField
              id="email"
              name="email"
              type="email"
              label="Email Address"
              value={formData.email}
              error={formErrors.email}
              required
              disabled={isSubmitting}
              onChange={handleChange}
              onBlur={handleBlur}
              inputRef={formErrors.email ? firstErrorRef : undefined}
              autoComplete="email"
              inputMode="email"
              aria-required="true"
              aria-invalid={formErrors.email ? 'true' : 'false'}
              aria-describedby={formErrors.email ? 'email-error' : undefined}
            />
          </div>
          
          <InputField
            id="message"
            name="message"
            type="textarea"
            label="Your Message"
            value={formData.message}
            error={formErrors.message}
            required
            disabled={isSubmitting}
            rows={6}
            onChange={handleChange}
            onBlur={handleBlur}
            inputRef={formErrors.message ? firstErrorRef : undefined}
            aria-required="true"
            aria-invalid={formErrors.message ? 'true' : 'false'}
            aria-describedby={formErrors.message ? 'message-error' : undefined}
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
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
            <div className="text-sm text-gray-600">
              <span className="text-red-500" aria-hidden="true">*</span>{' '}
              <span className="sr-only">Required fields</span>
              <span aria-hidden="true">Indicates required fields</span>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {timeUntilNextSubmit > 0 && (
                <p className="text-sm text-red-600 whitespace-nowrap">
                  Please wait {timeUntilNextSubmit} seconds before trying again
                </p>
              )}
              
              <button
                type="submit"
                disabled={isSubmitting || !recaptchaLoaded}
                className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${submitButtonClassName} ${
                  (isSubmitting || !recaptchaLoaded) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                aria-busy={isSubmitting ? 'true' : 'false'}
                aria-disabled={isSubmitting || !recaptchaLoaded ? 'true' : 'false'}
                aria-live="polite"
                aria-label={isSubmitting ? 'Sending message, please wait' : 'Submit form'}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </>
                ) : (
                  submitButtonText
                )}
              </button>
            </div>
          </div>
          
          {/* Status messages for screen readers */}
          <div 
            className="sr-only" 
            aria-live="polite"
            aria-atomic="true"
          >
            {isSubmitting && 'Submitting form, please wait...'}
            {isRecaptchaLoading && 'Loading security verification...'}
            {recaptchaError && 'Security verification failed. Please try again.'}
          </div>
        </form>
        
        {/* Form submission status for screen readers */}
        <div 
          className="sr-only" 
          role="status" 
          aria-live="polite"
          aria-atomic="true"
        >
          {submitStatus?.success && 'Your message has been sent successfully.'}
          {submitStatus && !submitStatus.success && `Form submission failed. ${submitStatus.message}`}
        </div>
      </div>
    </ErrorBoundary>
  );
};

// Export a dynamic version with no SSR to avoid window/document issues
export default dynamic<ContactFormWithRecaptchaProps>(
  () => Promise.resolve(EnhancedContactForm),
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
export { EnhancedContactForm };

// Add display name for better debugging
EnhancedContactForm.displayName = 'EnhancedContactForm';
