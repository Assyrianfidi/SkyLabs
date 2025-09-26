/**
 * Form validation and sanitization utilities
 */

// Type for form validation rules
type ValidationRule<T> = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: {
    value: RegExp;
    message: string;
  };
  validate?: (value: T) => string | boolean | Promise<string | boolean>;
};

type ValidationRules<T> = {
  [K in keyof T]?: ValidationRule<T[K]>;
};

// Default validation messages
const DEFAULT_MESSAGES = {
  required: 'This field is required',
  minLength: (min: number) => `Must be at least ${min} characters`,
  maxLength: (max: number) => `Must be at most ${max} characters`,
  email: 'Please enter a valid email address',
};

// Common validation patterns
export const PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  url: /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?$/,
  phone: /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/,
};

/**
 * Sanitize form input to prevent XSS and other attacks
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim();
}

/**
 * Validate a single form field against validation rules
 */
export async function validateField<T>(
  name: string,
  value: T,
  rules: ValidationRule<T> = {}
): Promise<string | true> {
  const { required, minLength, maxLength, pattern, validate } = rules;
  
  if (required && (value === undefined || value === null || value === '')) {
    return DEFAULT_MESSAGES.required;
  }

  if (typeof value === 'string') {
    const strValue = value as string;
    
    if (minLength !== undefined && strValue.length < minLength) {
      return DEFAULT_MESSAGES.minLength(minLength);
    }
    
    if (maxLength !== undefined && strValue.length > maxLength) {
      return DEFAULT_MESSAGES.maxLength(maxLength);
    }
    
    if (name === 'email' && !PATTERNS.email.test(strValue)) {
      return DEFAULT_MESSAGES.email;
    }
    
    if (pattern && !pattern.value.test(strValue)) {
      return pattern.message;
    }
  }
  
  if (validate) {
    const validationResult = await validate(value);
    if (validationResult !== true) {
      return validationResult === false ? 'Invalid value' : validationResult;
    }
  }
  
  return true;
}

/**
 * Validate all form fields against their respective validation rules
 */
export async function validateForm<T extends Record<string, any>>(
  data: T,
  rules: ValidationRules<T>
): Promise<{ isValid: boolean; errors: Record<keyof T, string> }> {
  const errors: Record<string, string> = {};
  const fields = Object.keys(data) as Array<keyof T>;
  
  await Promise.all(
    fields.map(async (field) => {
      const fieldRules = rules[field];
      if (!fieldRules) return;
      
      const error = await validateField(field as string, data[field], fieldRules);
      if (error !== true) {
        errors[field as string] = error;
      }
    })
  );
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors: errors as Record<keyof T, string>,
  };
}

/**
 * Create a rate limiter for form submissions
 */
export function createRateLimiter(options: {
  maxAttempts: number;
  timeWindow: number; // in milliseconds
  onLimitReached?: () => void;
}) {
  const { maxAttempts, timeWindow, onLimitReached } = options;
  let attempts: number[] = [];
  
  return () => {
    const now = Date.now();
    
    // Remove attempts outside the current time window
    attempts = attempts.filter(timestamp => now - timestamp < timeWindow);
    
    // Check if we've exceeded the maximum attempts
    if (attempts.length >= maxAttempts) {
      onLimitReached?.();
      const timeLeft = Math.ceil((attempts[0] + timeWindow - now) / 1000);
      return {
        allowed: false,
        timeLeft,
        message: `Too many attempts. Please try again in ${timeLeft} seconds.`,
      };
    }
    
    // Record this attempt
    attempts.push(now);
    
    return {
      allowed: true,
      attemptsRemaining: maxAttempts - attempts.length,
    };
  };
}

/**
 * Format form data for submission
 */
export function formatFormData<T extends Record<string, any>>(data: T): T {
  const formatted: Record<string, any> = {};
  
  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === 'string') {
      formatted[key] = value.trim();
    } else {
      formatted[key] = value;
    }
  });
  
  return formatted as T;
}
