import { Request, Response, NextFunction } from 'express';
import verifyRecaptchaToken from '../utils/recaptchaVerifier.js';
import type { VerifyRecaptchaOptions } from '../utils/recaptchaVerifier.js';

// Simple in-memory cache with TTL
interface CacheEntry {
  timestamp: number;
  result: { success: boolean; error?: string; score?: number };
}

const tokenCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Clean up expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of tokenCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      tokenCache.delete(key);
    }
  }
}, CACHE_TTL);

interface RecaptchaRequest extends Request {
  recaptcha?: {
    success: boolean;
    score?: number;
    error?: string;
  };
}

/**
 * Middleware to verify reCAPTCHA token in request body
 * @param options Configuration options
 * @returns Express middleware function
 */
export interface RecaptchaMiddlewareOptions {
  input?: string; // Name of the field containing the token (default: 'g-recaptcha-response')
  action?: string; // Expected action name (optional)
  minScore?: number; // Minimum score required (0.0 to 1.0)
  required?: boolean; // Whether reCAPTCHA is required (default: true)
  useCache?: boolean; // Whether to use token caching (default: true)
}

export const verifyRecaptcha = (options: RecaptchaMiddlewareOptions = {}) => {
  const {
    input = 'g-recaptcha-response',
    action,
    minScore = 0.5,
    required = true,
  } = options;

  return async (req: RecaptchaRequest, res: Response, next: NextFunction) => {
    // Skip if not required and no token provided
    if (!required && !req.body[input]) {
      return next();
    }

    const token = req.body[input];
    const cacheKey = options.useCache !== false ? `${token}:${action || ''}` : null;
    
    if (!token) {
      return res.status(400).json([{
        errors: {
          recaptcha: 'reCAPTCHA token is required',
        },
      }]);
    }

    try {
      // Check cache first if enabled
      if (cacheKey && tokenCache.has(cacheKey)) {
        const cached = tokenCache.get(cacheKey)!;
        if (Date.now() - cached.timestamp < CACHE_TTL) {
          req.recaptcha = cached.result;
          if (!cached.result.success) {
            return res.status(403).json([{
              errors: { recaptcha: cached.result.error || 'reCAPTCHA verification failed' },
            }]);
          }
          return next();
        }
        // Remove expired cache entry
        tokenCache.delete(cacheKey);
      }

      const verifyOptions: VerifyRecaptchaOptions = {
        minScore,
        expectedAction: action,
      };

      const result = await verifyRecaptchaToken(token, verifyOptions);
      
      // Cache the result if successful or non-transient error
      if (cacheKey && (result.success || result.error?.includes('score'))) {
        tokenCache.set(cacheKey, {
          timestamp: Date.now(),
          result,
        });
      }
      
      // Store verification result in request object
      req.recaptcha = {
        success: result.success,
        score: result.score,
        error: result.error,
      };

      if (!result.success) {
        return res.status(403).json([{
          errors: {
            recaptcha: result.error || 'reCAPTCHA verification failed',
          },
        }]);
      }

      // Verify action if specified
      if (action && req.body.action && req.body.action !== action) {
        return res.status(403).json([{
          errors: {
            recaptcha: 'Invalid reCAPTCHA action',
          },
        }]);
      }

      next();
    } catch (error) {
      console.error('Error in reCAPTCHA middleware:', error);
      return res.status(500).json([{
        errors: {
          recaptcha: 'Error processing reCAPTCHA',
        },
      }]);
    }
  };
};

export default verifyRecaptcha;
