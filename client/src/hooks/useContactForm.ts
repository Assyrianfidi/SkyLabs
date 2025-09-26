import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useRecaptcha } from './useRecaptcha';
import { PATTERNS } from '../utils/formUtils';

// Types

export interface FormData {
  name: string;
  email: string;
  message: string;
  website: string; // Honeypot field
}

export type FormErrors = Partial<Record<keyof FormData, string>>;

export interface FormStatus {
  success: boolean;
  message: string;
  code?: string;
  timestamp?: number;
}

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: {
    value: RegExp;
    message: string;
  };
  validate?: (value: string) => string | boolean | Promise<string | boolean>;
}

type ValidationRules = Record<keyof FormData, ValidationRule>;

interface UseContactFormOptions {
  endpoint: string;
  onSuccess?: (data: FormData) => void;
  onError?: (error: Error) => void;
  onValidationError?: (errors: FormErrors) => void;
}

interface RateLimitState {
  attempts: number;
  lastAttempt: number;
  isRateLimited: boolean;
}

// Constants
const FORM_VALIDATION_RULES: ValidationRules = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  email: {
    required: true,
    pattern: {
      value: PATTERNS.email,
      message: 'Please enter a valid email address',
    },
  },
  message: {
    required: true,
    minLength: 10,
    maxLength: 2000,
  },
  website: {
    // Honeypot field - should always be empty
    validate: (value: string) => !value || 'Invalid submission',
  },
} as const;

const RATE_LIMIT_CONFIG = {
  maxAttempts: 5,
  timeWindow: 15 * 60 * 1000, // 15 minutes
  onLimitReached: (): FormStatus => ({
    success: false,
    message: 'Too many attempts. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
    timestamp: Date.now(),
  }),
} as const;

const INITIAL_FORM_DATA: FormData = {
  name: '',
  email: '',
  message: '',
  website: '',
};

// Utility function to format form data for submission
const formatFormData = (data: FormData): Record<string, string> => {
  const { website, ...rest } = data;
  return rest;
};

/**
 * Custom hook for handling contact form state, validation, and submission
 * with reCAPTCHA v3 integration and rate limiting.
 * 
 * @param {string} recaptchaSiteKey - Google reCAPTCHA v3 site key
 * @param {string} [endpoint='/api/contact'] - API endpoint for form submission
 * @param {Object} [options] - Additional options
 * @param {Function} [options.onSuccess] - Callback on successful form submission
 * @param {Function} [options.onError] - Callback when form submission fails
 * @param {Function} [options.onValidationError] - Callback when form validation fails
 * @returns {Object} Form state and handlers
 */
export function useContactForm(
  recaptchaSiteKey: string, 
  endpoint: string = '/api/contact',
  options: Partial<UseContactFormOptions> = {}
) {
  const mergedOptions: UseContactFormOptions = {
    endpoint,
    ...options,
  };
  
  const { onSuccess, onError, onValidationError } = mergedOptions;
  // Form state
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [touchedFields, setTouchedFields] = useState<Partial<Record<keyof FormData, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<FormStatus | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitState>({
    attempts: 0,
    lastAttempt: 0,
    isRateLimited: false,
  });
  
  // Refs
  const firstErrorRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  
  // Initialize reCAPTCHA with error handling
  const { 
    executeRecaptcha, 
    refreshRecaptcha,
    isLoading: isRecaptchaLoading,
    error: recaptchaError,
  } = useRecaptcha(recaptchaSiteKey, {
    maxRetries: 3,
    retryDelay: 1000,
  });
  
  // Handle reCAPTCHA errors
  useEffect(() => {
    if (recaptchaError) {
      const errorStatus: FormStatus = {
        success: false,
        message: 'Security verification failed. Please try again.',
        code: 'RECAPTCHA_ERROR',
        timestamp: Date.now(),
      };
      setSubmitStatus(errorStatus);
      onError?.(new Error(recaptchaError.message));
    }
  }, [recaptchaError, onError]);

  // Rate limiting logic
  const checkRateLimit = useCallback((): { allowed: boolean; message?: string } => {
    const now = Date.now();
    const { attempts, lastAttempt, isRateLimited } = rateLimit;
    
    // Reset rate limit if time window has passed
    if (now - lastAttempt > RATE_LIMIT_CONFIG.timeWindow) {
      setRateLimit({ attempts: 0, lastAttempt: 0, isRateLimited: false });
      return { allowed: true };
    }
    
    // Check if rate limited
    if (isRateLimited || attempts >= RATE_LIMIT_CONFIG.maxAttempts) {
      const timeLeft = Math.ceil((RATE_LIMIT_CONFIG.timeWindow - (now - lastAttempt)) / 1000);
      return {
        allowed: false,
        message: `Too many attempts. Please try again in ${timeLeft} seconds.`,
      };
    }
    
    return { allowed: true };
  }, [rateLimit]);
  
  // Update rate limit on submission attempts
  const updateRateLimit = useCallback((success: boolean) => {
    setRateLimit(prev => {
      const now = Date.now();
      const newAttempts = success ? 0 : prev.attempts + 1;
      const isLimited = newAttempts >= RATE_LIMIT_CONFIG.maxAttempts;
      
      if (isLimited) {
        const status = RATE_LIMIT_CONFIG.onLimitReached();
        setSubmitStatus(status);
      }
      
      return {
        attempts: newAttempts,
        lastAttempt: now,
        isRateLimited: isLimited,
      };
    });
  }, []);
  
  // Calculate time until next allowed submission
  const timeUntilNextSubmit = useMemo(() => {
    const { lastAttempt, isRateLimited } = rateLimit;
    if (!isRateLimited) return 0;
    
    const timePassed = Date.now() - lastAttempt;
    const timeLeft = Math.ceil((RATE_LIMIT_CONFIG.timeWindow - timePassed) / 1000);
    
    return Math.max(0, timeLeft);
  }, [rateLimit]);
  
  /**
   * Resets the form to its initial state
   */
  const resetForm = useCallback((newData: Partial<FormData> = {}) => {
    setFormData({ ...INITIAL_FORM_DATA, ...newData });
    setFormErrors({});
    setTouchedFields({});
    setSubmitStatus(null);
    setRateLimit(prev => ({ ...prev, isRateLimited: false }));
  }, []);
  
  /**
   * Handles input change events and updates form data
   */
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Type guard to ensure name is a valid form field
    if (!(name in INITIAL_FORM_DATA)) {
      console.warn(`Unknown form field: ${name}`);
      return;
    }
    
    // Update form data
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear any existing error for this field
    if (formErrors[name as keyof FormData]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name as keyof FormData];
        return newErrors;
      });
    }
  }, [formErrors]);
  
  /**
   * Handles input blur events and marks fields as touched
   */
  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name } = e.target;
    
    // Type guard to ensure name is a valid form field
    if (!(name in INITIAL_FORM_DATA)) return;
    
    // Mark field as touched if not already
    setTouchedFields(prev => ({
      ...prev,
      [name]: true,
    }));
  }, []);
  
  /**
   * Validates a single form field against its validation rules
   */
  const validateField = useCallback(async (
    name: keyof FormData, 
    value: string
  ): Promise<string | undefined> => {
    const rules = FORM_VALIDATION_RULES[name];
    if (!rules) return undefined;
    
    // Check required field
    if (rules.required && !value.trim()) {
      return 'This field is required';
    }
    
    // Skip further validation if field is empty and not required
    if (!value.trim()) return undefined;
    
    // Check min length
    if (rules.minLength && value.length < rules.minLength) {
      return `Must be at least ${rules.minLength} characters`;
    }
    
    // Check max length
    if (rules.maxLength && value.length > rules.maxLength) {
      return `Must be less than ${rules.maxLength} characters`;
    }
    
    // Check pattern
    if (rules.pattern && !rules.pattern.value.test(value)) {
      return rules.pattern.message;
    }
    
    // Custom validation
    if (rules.validate) {
      try {
        const validationResult = await rules.validate(value);
        if (validationResult !== true) {
          return typeof validationResult === 'string' ? validationResult : 'Invalid value';
        }
      } catch (error) {
        console.error(`Validation error for field ${name}:`, error);
        return 'Validation failed. Please try again.';
      }
    }
    
    return undefined;
  }, []);
  
  /**
   * Validates all form fields and returns validation status
   */
  const validateForm = useCallback(async (): Promise<boolean> => {
    const errors: FormErrors = {};
    let hasErrors = false;
    
    // Validate each field
    for (const [field, value] of Object.entries(formData) as [keyof FormData, string][]) {
      try {
        const error = await validateField(field, value);
        if (error) {
          errors[field] = error;
          hasErrors = true;
        }
      } catch (error) {
        console.error(`Error validating field ${field}:`, error);
        errors[field] = 'Validation error. Please try again.';
        hasErrors = true;
      }
    }
    
    // Update form errors
    setFormErrors(errors);
    
    // Call validation error callback if there are errors
    if (hasErrors) {
      onValidationError?.(errors);
      
      // Focus first error field if any
      const firstErrorField = Object.keys(errors)[0] as keyof FormData | undefined;
      if (firstErrorField && firstErrorRef.current) {
        firstErrorRef.current.focus();
      }
    }
    
    return !hasErrors;
  }, [formData, validateField, onValidationError]);
  
  // Submit form with reCAPTCHA
  const submitWithRecaptcha = useCallback(async (action: string = 'contact_form_submit'): Promise<boolean> => {
    // Check rate limit before proceeding
    const rateLimitCheck = checkRateLimit();
    if (!rateLimitCheck.allowed) {
      setSubmitStatus({
        success: false,
        message: rateLimitCheck.message || 'Too many attempts. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        timestamp: Date.now(),
      });
      return false;
    }
    
    try {
      setIsSubmitting(true);
      
      // Get reCAPTCHA token
      const token = await executeRecaptcha(action);
      
      // Prepare form data, excluding honeypot field
      const submissionData = formatFormData(formData);
      
      // Submit to API
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          ...submissionData,
          'g-recaptcha-response': token,
        }),
      });
      
      // Handle response
      if (!response.ok) {
        let errorMessage = 'Failed to send message';
        let errorCode = 'SUBMISSION_ERROR';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          errorCode = errorData.code || errorCode;
        } catch (e) {
          console.error('Error parsing error response:', e);
        }
        
        throw new Error(errorMessage, { cause: { code: errorCode, status: response.status } });
      }
      
      // Handle successful submission
      const successStatus: FormStatus = {
        success: true,
        message: 'Your message has been sent successfully! We\'ll get back to you soon.',
        timestamp: Date.now(),
      };
      
      setSubmitStatus(successStatus);
      updateRateLimit(true);
      onSuccess?.(formData);
      
      return true;
      
    } catch (error) {
      console.error('Form submission error:', error);
      
      // Handle different error types
      let errorMessage = 'An unexpected error occurred';
      let errorCode = 'UNKNOWN_ERROR';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        errorCode = (error as any).code || errorCode;
      }
      
      const errorStatus: FormStatus = {
        success: false,
        message: errorMessage,
        code: errorCode,
        timestamp: Date.now(),
      };
      
      setSubmitStatus(errorStatus);
      updateRateLimit(false);
      
      const errorToReport = error instanceof Error 
        ? error 
        : new Error(errorMessage, { cause: { code: errorCode } });
      
      onError?.(errorToReport);
      
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [
    checkRateLimit, 
    executeRecaptcha, 
    formData, 
    endpoint, 
    onSuccess, 
    onError, 
    updateRateLimit
  ]);
  
  /**
   * Handles form submission with validation and reCAPTCHA
   */
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check rate limit
    const rateLimitCheck = checkRateLimit();
    if (!rateLimitCheck.allowed) {
      setSubmitStatus({
        success: false,
        message: rateLimitCheck.message || 'Too many attempts. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        timestamp: Date.now(),
      });
      return false;
    }
    
    // Honeypot check - silent fail for bots
    if (formData.website) {
      console.warn('Bot detected by honeypot field');
      updateRateLimit(false);
      return false;
    }
    
    // Validate form
    const isValid = await validateForm();
    if (!isValid) {
      updateRateLimit(false);
      return false;
    }
    
    // Submit with reCAPTCHA
    return submitWithRecaptcha();
  }, [checkRateLimit, formData.website, validateForm, submitWithRecaptcha, updateRateLimit]);
  
  /**
   * Handles reCAPTCHA refresh
   */
  const handleRefreshRecaptcha = useCallback(async () => {
    try {
      await refreshRecaptcha('contact_form_submit');
      setSubmitStatus(null);
      return true;
    } catch (error) {
      console.error('Failed to refresh reCAPTCHA:', error);
      
      const errorStatus: FormStatus = {
        success: false,
        message: 'Failed to refresh security check. Please try again.',
        code: 'RECAPTCHA_REFRESH_ERROR',
        timestamp: Date.now(),
      };
      
      setSubmitStatus(errorStatus);
      onError?.(error instanceof Error ? error : new Error('Failed to refresh reCAPTCHA'));
      
      return false;
    }
  }, [refreshRecaptcha, onError]);
  
  // Auto-dismiss success message after 8 seconds
  useEffect(() => {
    if (submitStatus?.success) {
      const timer = setTimeout(() => {
        setSubmitStatus(prev => (prev?.success ? null : prev));
      }, 8000);
      
      return () => clearTimeout(timer);
    }
  }, [submitStatus]);
  
  // Reset rate limit when component unmounts
  useEffect(() => {
    return () => {
      // Cleanup any pending operations if needed
    };
  }, []);
  
  // Memoize the returned object to prevent unnecessary re-renders
  return useMemo(() => ({
    // State
    formData,
    formErrors,
    touchedFields,
    isSubmitting,
    isRecaptchaLoading,
    submitStatus,
    recaptchaError,
    timeUntilNextSubmit,
    
    // Refs
    firstErrorRef,
    formRef,
    
    // Handlers
    handleChange,
    handleBlur,
    handleSubmit,
    handleRefreshRecaptcha,
    submitWithRecaptcha,
    resetForm,
    
    // Validation
    validateForm,
    validateField,
  }), [
    formData,
    formErrors,
    touchedFields,
    isSubmitting,
    isRecaptchaLoading,
    submitStatus,
    recaptchaError,
    timeUntilNextSubmit,
    handleChange,
    handleBlur,
    handleSubmit,
    handleRefreshRecaptcha,
    submitWithRecaptcha,
    resetForm,
    validateForm,
    validateField,
  ]);
}
