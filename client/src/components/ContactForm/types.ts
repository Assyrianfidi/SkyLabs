import type { ReactNode } from 'react';

export interface ContactFormData {
  name: string;
  email: string;
  message: string;
  website?: string; // Honeypot field
}

export type FormErrors<T> = Partial<Record<keyof T, string>>;

export interface FormStatus {
  success: boolean;
  message: string;
  timestamp?: number;
  code?: string;
}

export interface ValidationRule {
  required?: boolean | string;
  minLength?: number | { value: number; message: string };
  maxLength?: number | { value: number; message: string };
  pattern?: { value: RegExp; message: string };
  validate?: <T extends Record<string, unknown>>(
    value: unknown,
    formData: T
  ) => string | boolean | Promise<string | boolean>;
  message?: string;
}

export type ValidationRules<T> = {
  [K in keyof T]?: ValidationRule;
};

export interface ContactFormProps<T = ContactFormData> {
  /** Google reCAPTCHA v3 site key */
  recaptchaSiteKey: string;
  /** API endpoint for form submission */
  endpoint?: string;
  /** Additional CSS classes */
  className?: string;
  /** Form title */
  formTitle?: string | ReactNode;
  /** Success message shown after submission */
  successMessage?: string | ReactNode;
  /** Error message shown on submission failure */
  errorMessage?: string | ReactNode;
  /** Loading message shown during submission */
  loadingMessage?: string | ReactNode;
  /** Submit button text */
  submitButtonText?: string;
  /** Custom CSS classes for the submit button */
  submitButtonClassName?: string;
  /** Whether to show field labels */
  showLabels?: boolean;
  /** Whether to show asterisks for required fields */
  showRequiredAsterisk?: boolean;
  /** Callback on successful form submission */
  onSuccess?: (data: T) => void;
  /** Callback on form submission error */
  onError?: (error: Error) => void;
  /** Callback on validation error */
  onValidationError?: (errors: FormErrors<T>) => void;
  /** Callback when form submission starts */
  onSubmitStart?: () => void;
  /** Callback when form submission ends (success or failure) */
  onSubmitEnd?: (success: boolean) => void;
  /** Callback when reCAPTCHA loads successfully */
  onRecaptchaLoad?: () => void;
  /** Callback when reCAPTCHA fails to load */
  onRecaptchaError?: (error: Error) => void;
  /** Time in seconds to wait between form submissions */
  rateLimitSeconds?: number;
  /** Whether to enable the honeypot field */
  enableHoneypot?: boolean;
  /** Custom name for the honeypot field */
  honeypotFieldName?: string;
  /** Additional custom fields to include in submission */
  customFields?: Record<string, unknown>;
  /** Additional metadata for submission */
  metadata?: Record<string, unknown>;
  /** Custom validation rules */
  validationRules?: ValidationRules<T>;
  /** Initial form values */
  initialValues?: Partial<T>;
  /** Whether to enable debug mode */
  debug?: boolean;
}

export interface ContactFormState<T = ContactFormData> {
  formData: T;
  errors: FormErrors<T>;
  isSubmitting: boolean;
  isRecaptchaLoading: boolean;
  submitStatus: FormStatus | null;
  recaptchaError: Error | null;
  timeUntilNextSubmit: number;
  lastSubmissionTime: number | null;
  hasInteracted: boolean;
  submissionAttempts: number;
}

export enum FormActionType {
  SET_FIELD = 'SET_FIELD',
  SET_ERRORS = 'SET_ERRORS',
  SET_SUBMITTING = 'SET_SUBMITTING',
  SET_RECAPTCHA_LOADING = 'SET_RECAPTCHA_LOADING',
  SET_SUBMIT_STATUS = 'SET_SUBMIT_STATUS',
  SET_RECAPTCHA_ERROR = 'SET_RECAPTCHA_ERROR',
  SET_TIME_UNTIL_NEXT_SUBMIT = 'SET_TIME_UNTIL_NEXT_SUBMIT',
  SET_LAST_SUBMISSION_TIME = 'SET_LAST_SUBMISSION_TIME',
  SET_HAS_INTERACTED = 'SET_HAS_INTERACTED',
  INCREMENT_SUBMISSION_ATTEMPTS = 'INCREMENT_SUBMISSION_ATTEMPTS',
  RESET_FORM = 'RESET_FORM',
}

export type FormAction<T> =
  | { type: FormActionType.SET_FIELD; field: keyof T; value: unknown }
  | { type: FormActionType.SET_ERRORS; errors: FormErrors<T> }
  | { type: FormActionType.SET_SUBMITTING; isSubmitting: boolean }
  | { type: FormActionType.SET_RECAPTCHA_LOADING; isRecaptchaLoading: boolean }
  | { type: FormActionType.SET_SUBMIT_STATUS; status: FormStatus | null }
  | { type: FormActionType.SET_RECAPTCHA_ERROR; error: Error | null }
  | { type: FormActionType.SET_TIME_UNTIL_NEXT_SUBMIT; seconds: number }
  | { type: FormActionType.SET_LAST_SUBMISSION_TIME; timestamp: number | null }
  | { type: FormActionType.SET_HAS_INTERACTED; hasInteracted: boolean }
  | { type: FormActionType.INCREMENT_SUBMISSION_ATTEMPTS }
  | { type: FormActionType.RESET_FORM; initialValues?: Partial<T> };

export interface RecaptchaResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  score?: number;
  action?: string;
  'error-codes'?: string[];
}

export interface FormSubmissionResponse {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
  timestamp?: string;
  requestId?: string;
}

export interface RateLimitConfig {
  maxAttempts: number;
  timeWindow: number; // in milliseconds
  onLimitReached: () => FormStatus;
}

export interface AnalyticsEventPayload<T = unknown> {
  event: string;
  timestamp: number;
  formData?: Partial<T>;
  errors?: FormErrors<T>;
  error?: Error;
  metadata?: Record<string, unknown>;
}

export interface AnalyticsService<T = unknown> {
  trackEvent: (
    event: string,
    payload: Omit<AnalyticsEventPayload<T>, 'event' | 'timestamp'>
  ) => void;
  trackError: (error: Error, metadata?: Record<string, unknown>) => void;
  trackMetric: (name: string, value: number, metadata?: Record<string, unknown>) => void;
}

export interface UseContactFormConfig<T = ContactFormData> {
  endpoint: string;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  onValidationError?: (errors: FormErrors<T>) => void;
  onSubmitStart?: () => void;
  onSubmitEnd?: (success: boolean) => void;
  onRecaptchaLoad?: () => void;
  onRecaptchaError?: (error: Error) => void;
  rateLimitSeconds?: number;
  enableHoneypot?: boolean;
  honeypotFieldName?: string;
  customFields?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  analyticsService?: AnalyticsService<T>;
  validationRules?: ValidationRules<T>;
  initialValues?: Partial<T>;
  debug?: boolean;
}
