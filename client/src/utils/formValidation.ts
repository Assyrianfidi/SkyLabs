import type { 
  ContactFormData, 
  ValidationRules, 
  ValidationRule,
  FormErrors 
} from '../components/ContactForm/types';

/**
 * Regular expressions for form validation
 */
export const PATTERNS = {
  email: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  name: /^[a-zA-Z\s'-]+$/,
  phone: /^\+?[\d\s-()]{10,}$/,
  url: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
} as const;

/**
 * Default error messages for validation rules
 */
export const ERROR_MESSAGES = {
  required: (field: string) => `${field} is required`,
  minLength: (field: string, min: number) => 
    `${field} must be at least ${min} characters`,
  maxLength: (field: string, max: number) =>
    `${field} must be less than ${max} characters`,
  pattern: (field: string) => `Please enter a valid ${field.toLowerCase()}`,
  email: 'Please enter a valid email address',
  url: 'Please enter a valid URL',
  phone: 'Please enter a valid phone number',
  default: 'Invalid value'
} as const;

/**
 * Creates a validation rule with default messages
 */
const createRule = <T extends Record<string, unknown>>(
  rule: ValidationRule & { fieldName: string }
): ValidationRule => {
  const { fieldName, ...rest } = rule;
  return {
    ...rest,
    message: rule.message || ERROR_MESSAGES.default,
    validate: async (value: unknown, formData?: Record<string, unknown>) => {
      if (rule.required && !value) {
        return ERROR_MESSAGES.required(fieldName);
      }
      
      if (typeof value === 'string') {
        const strValue = value.trim();
        
        // Handle minLength as number or { value: number; message: string }
        const minLength = typeof rule.minLength === 'number' 
          ? rule.minLength 
          : rule.minLength?.value;
        
        if (minLength !== undefined && strValue.length < minLength) {
          const message = typeof rule.minLength === 'object' 
            ? rule.minLength.message 
            : ERROR_MESSAGES.minLength(fieldName, minLength);
          return message;
        }
        
        // Handle maxLength as number or { value: number; message: string }
        const maxLength = typeof rule.maxLength === 'number'
          ? rule.maxLength
          : rule.maxLength?.value;
        
        if (maxLength !== undefined && strValue.length > maxLength) {
          const message = typeof rule.maxLength === 'object'
            ? rule.maxLength.message
            : ERROR_MESSAGES.maxLength(fieldName, maxLength);
          return message;
        }
        
        if (rule.pattern && !rule.pattern.value.test(strValue)) {
          return rule.pattern.message || ERROR_MESSAGES.pattern(fieldName);
        }
      }
      
      if (rule.validate && formData) {
        return rule.validate(value, formData as T);
      }
      
      return true;
    }
  };
};

/**
 * Default validation rules for the contact form
 */
export const DEFAULT_VALIDATION_RULES: ValidationRules<ContactFormData> = {
  name: createRule({
    fieldName: 'Name',
    required: true,
    minLength: 2,
    maxLength: 100,
    pattern: {
      value: PATTERNS.name,
      message: 'Please enter a valid name (letters, spaces, hyphens, and apostrophes only)'
    }
  }),
  email: createRule({
    fieldName: 'Email',
    required: true,
    pattern: {
      value: PATTERNS.email,
      message: ERROR_MESSAGES.email
    },
    validate: async (value) => {
      if (typeof value === 'string' && !PATTERNS.email.test(value)) {
        return ERROR_MESSAGES.email;
      }
      return true;
    }
  }),
  message: createRule({
    fieldName: 'Message',
    required: true,
    minLength: 10,
    maxLength: 2000,
    message: 'Please enter a message between 10 and 2000 characters'
  }),
  website: createRule({
    fieldName: 'Website',
    required: false,
    validate: (value) => !value || 'Invalid submission' // Honeypot field
  })
};

/**
 * Validates a single form field against its validation rules
 * @param fieldName The name of the field being validated (for error messages)
 * @param value The value to validate
 * @param rule The validation rule to apply
 * @param formData Optional form data for context in validation
 * @returns Promise that resolves to an array of error messages (empty if valid)
 */
export const validateField = async <T extends Record<string, unknown>>(
  fieldName: string,
  value: unknown,
  rule: ValidationRule,
  formData?: T
): Promise<string[]> => {
  try {
    if (!rule) return [];
    
    // Handle custom validation function if provided
    if (rule.validate) {
      // Skip validation if formData is required but not provided
      if (formData === undefined) {
        return [];
      }
      
      const result = await rule.validate(value, formData);
      if (typeof result === 'string') {
        return [result];
      }
      if (result === false) {
        return [rule.message || ERROR_MESSAGES.default];
      }
    }
    
    return [];
  } catch (error) {
    console.error(`Error validating ${fieldName}:`, error);
    return [
      error instanceof Error 
        ? error.message 
        : `Validation failed for ${fieldName}`
    ];
  }
};

/**
 * Validates the entire form
 * @param formData The form data to validate
 * @param rules The validation rules to apply (defaults to DEFAULT_VALIDATION_RULES)
 * @returns Promise that resolves to an object containing validation results
 */
export const validateForm = async <T extends Record<string, unknown>>(
  formData: T,
  rules: Record<keyof T, ValidationRule> = DEFAULT_VALIDATION_RULES as Record<keyof T, ValidationRule>
): Promise<{ isValid: boolean; errors: FormErrors<T> }> => {
  try {
    const fieldNames = Object.keys(rules) as Array<keyof T>;
    const errors: FormErrors<T> = {};
    
    // Process each field's validation rules in parallel
    const validationResults = await Promise.all(
      fieldNames.map(async (fieldName) => {
        const rule = rules[fieldName];
        if (!rule) return { fieldName, error: null };
        
        const value = formData[fieldName];
        const fieldErrors = await validateField(
          String(fieldName),
          value,
          rule,
          formData
        );
        
        return { 
          fieldName, 
          error: fieldErrors.length > 0 ? fieldErrors[0] : null 
        };
      })
    );
    
    // Combine all errors
    validationResults.forEach(({ fieldName, error }) => {
      if (error) {
        errors[fieldName] = error;
      }
    });
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  } catch (error) {
    console.error('Error during form validation:', error);
    throw new Error('Failed to validate form');
  }
};

/**
 * Sanitizes a string to prevent XSS attacks and normalize input
 * @param input The string to sanitize
 * @param options Options for sanitization
 * @returns Sanitized string with potentially dangerous characters escaped
 */
export const sanitizeInput = (
  input: unknown, 
  options: {
    /** Whether to trim whitespace (default: true) */
    trim?: boolean;
    /** Whether to allow HTML (default: false) */
    allowHTML?: boolean;
    /** Maximum length of the string (default: none) */
    maxLength?: number;
  } = {}
): string => {
  const { trim = true, allowHTML = false, maxLength } = options;
  
  // Handle non-string inputs by converting to string
  if (input === null || input === undefined) return '';
  
  let str = String(input);
  
  // Apply max length if specified
  if (typeof maxLength === 'number' && str.length > maxLength) {
    str = str.substring(0, maxLength);
  }
  
  // Return early for empty strings after trimming if needed
  if (trim) {
    str = str.trim();
    if (!str) return '';
  }
  
  if (allowHTML) {
    // Only escape potentially dangerous characters, not all HTML
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
  
  // Escape all HTML tags and special characters
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/`/g, '&#x60;')
    .replace(/=/g, '&#x3D;');
};

/**
 * Sanitizes all string values in the form data
 */
/**
 * Sanitizes form data by cleaning up string values
 * @param data The form data object to sanitize
 * @param options Options for sanitization
 * @returns A new object with sanitized values
 */
export const sanitizeFormData = <T extends Record<string, unknown>>(
  data: T,
  options: {
    /** Whether to trim string values (default: true) */
    trim?: boolean;
    /** Whether to allow HTML in strings (default: false) */
    allowHTML?: boolean;
    /** Maximum length for string values (default: none) */
    maxLength?: number;
    /** Fields to exclude from sanitization */
    exclude?: (keyof T)[];
  } = {}
): T => {
  const { 
    trim = true, 
    allowHTML = false, 
    maxLength, 
    exclude = [] 
  } = options;
  
  // Create a new object to avoid mutating the original
  const result = { ...data } as Record<string, unknown>;
  
  // Process each property in the object
  for (const key in result) {
    if (
      Object.prototype.hasOwnProperty.call(result, key) && 
      !exclude.includes(key as keyof T)
    ) {
      const value = result[key];
      
      // Process string values
      if (typeof value === 'string') {
        result[key] = sanitizeInput(value, { trim, allowHTML, maxLength });
      }
      // Process arrays
      else if (Array.isArray(value)) {
        result[key] = value.map(item => 
          typeof item === 'string' 
            ? sanitizeInput(item, { trim, allowHTML, maxLength })
            : item
        );
      }
      // Process nested objects recursively
      else if (value && typeof value === 'object') {
        // Use type assertion to handle the recursive case
        const sanitized = sanitizeFormData(
          value as Record<string, unknown>,
          { trim, allowHTML, maxLength, exclude: exclude as string[] }
        );
        result[key] = sanitized as unknown;
      }
    }
  }
  
  return result as T;
};

/**
 * Checks if the form data has changed from its initial state
 */
/**
 * Type guard to check if a value is an object (and not null or array)
 */
const isObject = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

/**
 * Deep compares two values for equality
 */
const deepEqual = (a: unknown, b: unknown): boolean => {
  // Handle primitive types and null/undefined
  if (a === b) return true;
  if (a == null || b == null) return false;
  
  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, i) => deepEqual(val, b[i]));
  }
  
  // Handle objects
  if (isObject(a) && isObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    return keysA.every(key => 
      Object.prototype.hasOwnProperty.call(b, key) && 
      deepEqual(a[key], b[key as keyof typeof b])
    );
  }
  
  return false;
};

/**
 * Checks if form data has changed from its initial state
 * @param currentData The current form data
 * @param initialData The initial form data to compare against
 * @param options Comparison options
 * @returns boolean indicating if any field has changed
 */
export const hasFormChanged = <T extends Record<string, unknown>>(
  currentData: T,
  initialData: T,
  options: {
    /** Fields to ignore when checking for changes */
    ignoreFields?: (keyof T)[];
    /** Whether to do a deep comparison (default: true) */
    deep?: boolean;
  } = {}
): boolean => {
  const { 
    ignoreFields = [], 
    deep = true 
  } = options;
  
  // Get all unique keys from both objects, excluding ignored fields
  const allKeys = new Set([
    ...Object.keys(currentData),
    ...Object.keys(initialData)
  ].filter(key => !ignoreFields.includes(key as keyof T))) as Set<keyof T>;

  // Check if any value differs between the two objects
  return Array.from(allKeys).some(key => {
    // Handle cases where a key might be missing in one of the objects
    if (!(key in currentData) || !(key in initialData)) {
      return true;
    }
    
    const currentValue = currentData[key];
    const initialValue = initialData[key];
    
    // Use deep comparison if enabled and values are objects/arrays
    if (deep && (isObject(currentValue) || Array.isArray(currentValue))) {
      return !deepEqual(currentValue, initialValue);
    }
    
    // Use Object.is for primitive values
    return !Object.is(currentValue, initialValue);
  });
};

/**
 * Options for formatting form data
 */
export interface FormatFormDataOptions<T> {
  /** Fields to exclude from the formatted data */
  excludeFields?: (keyof T)[];
  /** Fields to include in the formatted data (takes precedence over excludeFields) */
  includeFields?: (keyof T)[];
  /** Whether to include empty/null values (default: false) */
  includeEmptyValues?: boolean;
  /** Function to transform field values */
  transform?: <K extends keyof T>(
    key: K,
    value: T[K],
    formData: T
  ) => unknown;
}

/**
 * Default options for formatting contact form data
 */
const DEFAULT_FORMAT_OPTIONS: FormatFormDataOptions<ContactFormData> = {
  excludeFields: ['website'], // Exclude honeypot field by default
  includeEmptyValues: false,
};

/**
 * Formats form data for submission
 * @param formData The form data to format
 * @param options Formatting options
 * @returns Formatted form data
 */
export const formatFormData = <T extends Record<string, unknown>>(
  formData: T,
  options: FormatFormDataOptions<T> = {}
): Partial<T> => {
  const {
    excludeFields = [],
    includeFields,
    includeEmptyValues = false,
    transform
  } = { ...DEFAULT_FORMAT_OPTIONS, ...options } as FormatFormDataOptions<T>;
  
  return Object.entries(formData).reduce<Partial<T>>((result, [key, value]) => {
    const field = key as keyof T;
    
    // Skip excluded fields
    if (excludeFields.includes(field)) {
      return result;
    }
    
    // If includeFields is specified, only include those fields
    if (includeFields && !includeFields.includes(field)) {
      return result;
    }
    
    // Skip empty values if not allowed
    if (!includeEmptyValues && (value === '' || value === null || value === undefined)) {
      return result;
    }
    
    // Apply transformation if provided
    let transformedValue = value;
    if (transform) {
      try {
        transformedValue = transform(field, value as T[typeof field], formData);
      } catch (error) {
        console.error(`Error transforming field ${String(field)}:`, error);
        transformedValue = value;
      }
    }
    
    return {
      ...result,
      [field]: transformedValue
    };
  }, {});
};
