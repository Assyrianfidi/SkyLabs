import { useEffect, useCallback } from 'react';
import { ErrorBoundary } from '../ErrorBoundary';
import { useContactForm } from '../../hooks/useContactForm';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export interface ContactFormWithRecaptchaProps {
  recaptchaSiteKey: string;
  endpoint: string;
  formTitle?: string;
  successMessage?: string;
  errorMessage?: string;
  loadingMessage?: string;
}

/**
 * ContactFormWithRecaptcha - A secure, accessible, and performant contact form with reCAPTCHA v3 protection.
 * 
 * @component
 * @example
 * ```tsx
 * <ContactFormWithRecaptcha 
 *   recaptchaSiteKey="your-recaptcha-site-key"
 *   endpoint="/api/contact"
 *   formTitle="Contact Us"
 *   successMessage="Thank you for your message!"
 *   errorMessage="Failed to send message. Please try again later."
 *   loadingMessage="Sending..."
 * />
 * ```
 * 
 * @remarks
 * This component handles form validation, submission, error handling, and reCAPTCHA verification.
 * It includes accessibility features, rate limiting, and security measures.
 */
const ContactFormWithRecaptcha: React.FC<ContactFormWithRecaptchaProps> = ({
  recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '',
  endpoint = '/api/contact',
  formTitle = 'Contact Us',
  successMessage = 'Thank you for your message!',
  errorMessage = 'Failed to send message. Please try again later.',
  loadingMessage = 'Sending...',
}) => {
  // Get form state and handlers from custom hook
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
  } = useContactForm(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '');

  // Auto-focus first error field when errors change
  useEffect(() => {
    if (firstErrorRef?.current) {
      (firstErrorRef.current as HTMLElement).focus();
    }
  }, [formErrors, firstErrorRef]);

  // Skip to form link for keyboard users
  const SkipToFormLink = useCallback(() => (
    <a 
      href="#contact-form"
      className="sr-only focus:not-sr-only focus:block p-2 text-center text-blue-600 underline"
      aria-label="Skip to contact form"
    >
      Skip to form
    </a>
  ), []);

  // Loading state
  if (isRecaptchaLoading) {
    return (
      <div 
        className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md text-center"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <h2 className="text-2xl font-bold mb-4">Loading Security Verification</h2>
        <p className="text-gray-600 mb-4">Please wait while we load the security verification...</p>
        <LoadingSpinner />
        <span className="sr-only">Loading security verification...</span>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <SkipToFormLink />
      
      <div 
        id="contact-form"
        className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow-md"
        aria-labelledby="form-title"
      >
        <h1 id="form-title" className="text-2xl font-bold mb-6 text-gray-800">
          Contact Us
        </h1>
        
        {/* Status Message - Announce form submission status to screen readers */}
        {submitStatus && (
          <div 
            id="form-status"
            role="alert"
            className={`mb-6 p-4 rounded-md ${
              submitStatus.success 
                ? 'bg-green-50 border-l-4 border-green-500 text-green-700' 
                : 'bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700'
            }`}
            aria-live="polite"
            aria-relevant="additions text"
          >
            <div className="flex">
              <div className="flex-shrink-0">
                {submitStatus.success ? (
                  <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-yellow-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </div>
          </div>
        )}
        
{{ ... }}
          onSubmit={handleSubmit}
          className="space-y-6"
          aria-busy={isSubmitting}
          aria-live="polite"
          aria-atomic="true"
          noValidate
          aria-describedby={submitStatus ? 'form-status' : undefined}
        >
          {/* Name Field */}
          <div>
            <label 
              htmlFor="name" 
              className="block text-sm font-medium text-gray-700"
            >
              Name <span className="text-red-500" aria-hidden="true">*</span>
              <span className="sr-only"> (required)</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
              aria-invalid={!!formErrors.name}
              aria-describedby={formErrors.name ? 'name-error' : undefined}
              className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                formErrors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
              ref={formErrors.name ? firstErrorRef as React.RefObject<HTMLInputElement> : undefined}
            />
            {formErrors.name && (
              <p id="name-error" className="mt-1 text-sm text-red-600">
                {formErrors.name}
              </p>
            )}
          </div>

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email <span className="text-red-500" aria-hidden="true">*</span>
              <span className="sr-only"> (required)</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              aria-invalid={!!formErrors.email}
              aria-describedby={formErrors.email ? 'email-error' : undefined}
              className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                formErrors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
              ref={formErrors.email ? firstErrorRef as React.RefObject<HTMLInputElement> : undefined}
            />
            {formErrors.email && (
              <p id="email-error" className="mt-1 text-sm text-red-600">
                {formErrors.email}
              </p>
            )}
          </div>
              name="message"
              rows={4}
              value={formData.message}
              onChange={handleChange}
              onBlur={handleBlur}
              aria-invalid={formErrors.message ? true : false}
              aria-describedby={formErrors.message ? 'message-error' : undefined}
              className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                formErrors.message ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
              aria-required="true"
            />
            {formErrors.message && (
              <p 
                id="message-error" 
                className="mt-1 text-sm text-red-600"
                role="alert"
              >
                {formErrors.message}
              </p>
            )}
          </div>

          {/* Honeypot field - hidden from users but visible to bots */}
          <div 
            className="absolute left-[-9999px] w-px h-px overflow-hidden"
            aria-hidden="true"
          >
            <label htmlFor="website">
              Don't fill this out if you're human:
            </label>
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
                type="submit"
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  isSubmitting || timeUntilNextSubmit > 0
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
                disabled={isSubmitting || timeUntilNextSubmit > 0}
                aria-busy={isSubmitting}
                aria-live="polite"
                aria-label={isSubmitting ? 'Sending message, please wait' : 'Submit form'}
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="small" aria-hidden="true" />
                    <span className="ml-2">
                      Sending...
                    </span>
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
          {submitStatus?.success ? 'Your message has been sent successfully.' : 
           submitStatus ? `Form submission failed. ${submitStatus.message}` : ''}
        </div>
      </div>
    </ErrorBoundary>
  );
};

// Export the component
export { ContactFormWithRecaptcha as default };
