export enum RecaptchaErrorCode {
  NOT_INITIALIZED = 'NOT_INITIALIZED',
  EXECUTION_FAILED = 'EXECUTION_FAILED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  SCRIPT_LOAD_FAILED = 'SCRIPT_LOAD_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_SITE_KEY = 'INVALID_SITE_KEY',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class RecaptchaError extends Error {
  constructor(
    public code: RecaptchaErrorCode,
    message: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'RecaptchaError';
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RecaptchaError);
    }
  }
}

export function createRecaptchaError(
  code: RecaptchaErrorCode,
  message: string,
  originalError?: unknown
): RecaptchaError {
  return new RecaptchaError(code, message, originalError);
}

export function getErrorMessage(code: RecaptchaErrorCode): string {
  const messages: Record<RecaptchaErrorCode, string> = {
    [RecaptchaErrorCode.NOT_INITIALIZED]: 'reCAPTCHA is not initialized',
    [RecaptchaErrorCode.EXECUTION_FAILED]: 'Failed to execute reCAPTCHA',
    [RecaptchaErrorCode.TOKEN_EXPIRED]: 'Security token has expired',
    [RecaptchaErrorCode.SCRIPT_LOAD_FAILED]: 'Failed to load reCAPTCHA script',
    [RecaptchaErrorCode.NETWORK_ERROR]: 'Network error occurred',
    [RecaptchaErrorCode.INVALID_SITE_KEY]: 'Invalid reCAPTCHA site key',
    [RecaptchaErrorCode.UNKNOWN_ERROR]: 'An unknown error occurred with reCAPTCHA',
  };
  
  return messages[code] || messages[RecaptchaErrorCode.UNKNOWN_ERROR];
}

/**
 * Type guard to check if an error is a RecaptchaError
 * @param error The error to check
 * @returns True if the error is a RecaptchaError
 */
export function isRecaptchaError(error: unknown): error is RecaptchaError {
  return (
    error instanceof RecaptchaError ||
    (typeof error === 'object' && 
     error !== null &&
     'code' in error && 
     'message' in error &&
     'name' in error &&
     (error as RecaptchaError).name === 'RecaptchaError')
  );
}
