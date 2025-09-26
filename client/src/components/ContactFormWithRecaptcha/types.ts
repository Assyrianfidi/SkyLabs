import { ReactNode } from 'react';

/**
 * Represents the form data structure for the contact form
 * @property {string} name - The user's full name
 * @property {string} email - The user's email address
 * @property {string} message - The message content
 * @property {string} [website] - Honeypot field for bot detection (should be empty)
 */
export interface ContactFormData {
  name: string;
  email: string;
  message: string;
  website: string; // Honeypot field for bot detection
}

/**
 * Represents form validation errors with field-specific error messages
 */
export type FormErrors = Partial<Record<keyof ContactFormData, string>>;

/**
 * Represents the status of a form submission
 * @property {boolean} success - Whether the submission was successful
 * @property {string} message - Status message to display to the user
 * @property {number} [timestamp] - When the status was set (useful for time-based operations)
 * @property {string} [code] - Optional error code for programmatic handling
 */
export interface FormStatus {
  success: boolean;
  message: string;
  timestamp?: number;
  code?: string;
}

/**
 * Props for the ContactFormWithRecaptcha component
 * @property {string} recaptchaSiteKey - Google reCAPTCHA v3 site key (required)
 * @property {string} [endpoint] - API endpoint for form submission (default: '/api/contact')
 * @property {string} [className] - Additional CSS classes for the form container
 * @property {string} [formTitle] - Form title (default: 'Contact Us')
 * @property {string} [successMessage] - Success message shown after form submission
 * @property {string} [errorMessage] - Error message shown when form submission fails
 * @property {string} [loadingMessage] - Loading message shown while reCAPTCHA is loading
 * @property {string} [submitButtonText] - Custom text for the submit button (default: 'Send Message')
 * @property {string} [submitButtonClassName] - Custom CSS classes for the submit button
 * @property {boolean} [showLabels] - Whether to show field labels (default: true)
 * @property {boolean} [showRequiredAsterisk] - Whether to show asterisks for required fields (default: true)
 * @property {Function} [onSuccess] - Callback function called on successful form submission
 * @property {Function} [onError] - Callback function called when form submission fails
 * @property {Function} [onValidationError] - Callback function called when form validation fails
 * @property {Function} [onSubmitStart] - Callback function called when form submission starts
 * @property {Function} [onSubmitEnd] - Callback function called when form submission ends (success or failure)
 * @property {Function} [onRecaptchaLoad] - Callback function called when reCAPTCHA loads successfully
 * @property {Function} [onRecaptchaError] - Callback function called when reCAPTCHA fails to load
 * @property {number} [rateLimitSeconds] - Time in seconds to wait between form submissions (default: 30)
 * @property {boolean} [enableHoneypot] - Whether to enable the honeypot field (default: true)
 * @property {string} [honeypotFieldName] - Custom name for the honeypot field (default: 'website')
 * @property {Record<string, unknown>} [customFields] - Additional custom fields to include in the form submission
 * @property {Record<string, unknown>} [metadata] - Additional metadata to include with the form submission
 */
export interface ContactFormWithRecaptchaProps {
  recaptchaSiteKey: string;
  endpoint?: string;
  className?: string;
  formTitle?: string | ReactNode;
  successMessage?: string | ReactNode;
  errorMessage?: string | ReactNode;
  loadingMessage?: string | ReactNode;
  submitButtonText?: string;
  submitButtonClassName?: string;
  showLabels?: boolean;
  showRequiredAsterisk?: boolean;
  onSuccess?: (data: ContactFormData) => void;
  onError?: (error: Error) => void;
  onValidationError?: (errors: FormErrors) => void;
  onSubmitStart?: () => void;
  onSubmitEnd?: (success: boolean) => void;
  onRecaptchaLoad?: () => void;
  onRecaptchaError?: (error: Error) => void;
  rateLimitSeconds?: number;
  enableHoneypot?: boolean;
  honeypotFieldName?: string;
  customFields?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Represents the state of the contact form
 * @property {ContactFormData} formData - Current form field values
 * @property {FormErrors} errors - Current validation errors
 * @property {boolean} isSubmitting - Whether the form is currently submitting
 * @property {boolean} isRecaptchaLoading - Whether reCAPTCHA is currently loading
 * @property {FormStatus | null} submitStatus - Current submission status
 * @property {Error | null} recaptchaError - Any error that occurred with reCAPTCHA
 * @property {number} timeUntilNextSubmit - Seconds until the user can submit again (rate limiting)
 * @property {number | null} lastSubmissionTime - Timestamp of the last submission attempt
 * @property {boolean} hasInteracted - Whether the user has interacted with the form
 */
export interface ContactFormState {
  formData: ContactFormData;
  errors: FormErrors;
  isSubmitting: boolean;
  isRecaptchaLoading: boolean;
  submitStatus: FormStatus | null;
  recaptchaError: Error | null;
  timeUntilNextSubmit: number;
  lastSubmissionTime: number | null;
  hasInteracted: boolean;
}

/**
 * Represents the result of a form validation
 * @property {boolean} isValid - Whether the form data is valid
 * @property {FormErrors} errors - Any validation errors found
 */
export interface ValidationResult {
  isValid: boolean;
  errors: FormErrors;
}

/**
 * Represents the reCAPTCHA verification response from Google's API
 * @property {boolean} success - Whether the verification was successful
 * @property {string} [challenge_ts] - Timestamp of the challenge
 * @property {string} [hostname] - The hostname of the site where reCAPTCHA was solved
 * @property {number} [score] - The score for this request (0.0 - 1.0)
 * @property {string} [action] - The action name for this request
 * @property {string[]} ['error-codes'] - Error codes if the verification failed
 */
export interface RecaptchaResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  score?: number;
  action?: string;
  'error-codes'?: string[];
}

/**
 * Represents the API response from the form submission
 * @property {boolean} success - Whether the submission was successful
 * @property {string} message - Status message from the server
 * @property {Record<string, string>} [errors] - Field-specific error messages
 * @property {string} [timestamp] - When the response was generated
 * @property {string} [requestId] - Unique identifier for the submission
 */
export interface FormSubmissionResponse {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
  timestamp?: string;
  requestId?: string;
}

/**
 * Represents the configuration for form validation rules
 * @property {boolean} [required] - Whether the field is required
 * @property {number} [minLength] - Minimum length of the field value
 * @property {number} [maxLength] - Maximum length of the field value
 * @property {RegExp} [pattern] - Regular expression pattern for validation
 * @property {string} [message] - Custom error message for pattern validation
 * @property {Function} [validate] - Custom validation function
 */
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: {
    value: RegExp;
    message: string;
  };
  validate?: (value: string, formData: ContactFormData) => string | boolean | Promise<string | boolean>;
}

/**
 * Represents the validation rules for the contact form
 */
export type ValidationRules = Record<keyof ContactFormData, ValidationRule>;

/**
 * Represents the configuration for rate limiting
 * @property {number} maxAttempts - Maximum number of attempts allowed
 * @property {number} timeWindow - Time window in milliseconds
 * @property {Function} onLimitReached - Callback when rate limit is reached
 */
export interface RateLimitConfig {
  maxAttempts: number;
  timeWindow: number;
  onLimitReached: () => FormStatus;
}

/**
 * Represents the analytics event names
 */
export enum AnalyticsEvent {
  FORM_LOAD = 'form_load',
  FORM_SUBMIT = 'form_submit',
  FORM_SUCCESS = 'form_success',
  FORM_ERROR = 'form_error',
  VALIDATION_ERROR = 'validation_error',
  RECAPTCHA_LOAD = 'recaptcha_load',
  RECAPTCHA_ERROR = 'recaptcha_error',
  RATE_LIMIT = 'rate_limit',
}

/**
 * Represents the analytics event payload
 */
export interface AnalyticsEventPayload {
  event: AnalyticsEvent;
  timestamp: number;
  formData?: Partial<ContactFormData>;
  errors?: FormErrors;
  error?: Error;
  metadata?: Record<string, unknown>;
}

/**
 * Represents the analytics service interface
 */
export interface AnalyticsService {
  trackEvent: (event: AnalyticsEvent, payload: Omit<AnalyticsEventPayload, 'event' | 'timestamp'>) => void;
  trackError: (error: Error, metadata?: Record<string, unknown>) => void;
  trackMetric: (name: string, value: number, metadata?: Record<string, unknown>) => void;
}

/**
 * Represents the configuration for the useContactForm hook
 */
export interface UseContactFormConfig {
  endpoint: string;
  onSuccess?: (data: ContactFormData) => void;
  onError?: (error: Error) => void;
  onValidationError?: (errors: FormErrors) => void;
  onSubmitStart?: () => void;
  onSubmitEnd?: (success: boolean) => void;
  onRecaptchaLoad?: () => void;
  onRecaptchaError?: (error: Error) => void;
  rateLimitSeconds?: number;
  enableHoneypot?: boolean;
  honeypotFieldName?: string;
  customFields?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  analyticsService?: AnalyticsService;
  validationRules?: ValidationRules;
}
