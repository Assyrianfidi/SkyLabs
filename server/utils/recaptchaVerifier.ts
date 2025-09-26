// Using Node.js built-in fetch
import { URLSearchParams } from 'url';

interface RecaptchaVerificationResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
  score?: number;
  action?: string;
}

export interface VerifyRecaptchaOptions {
  secret?: string;
  minScore?: number;
  expectedHostname?: string;
  expectedAction?: string;
}

/**
 * Verifies a reCAPTCHA token with Google's API
 * @param token - The reCAPTCHA token to verify
 * @param secret - Your reCAPTCHA secret key (defaults to process.env.RECAPTCHA_SECRET_KEY)
 * @param minScore - Minimum score to consider the verification successful (0.0 to 1.0)
 * @returns Promise with verification result
 */
/**
 * Verifies a reCAPTCHA token with Google's API
 * @param token - The reCAPTCHA token to verify
 * @param options - Verification options
 * @returns Verification result with success status and optional score/error
 */
export async function verifyRecaptchaToken(
  token: string,
  options: VerifyRecaptchaOptions = {}
): Promise<{ success: boolean; error?: string; score?: number }> {
  const {
    secret = process.env.RECAPTCHA_SECRET_KEY!,
    minScore = 0.5,
    expectedHostname = process.env.EXPECTED_DOMAIN,
    expectedAction
  } = options;
  if (!token) {
    return { success: false, error: 'reCAPTCHA token is required' };
  }

  if (!secret) {
    console.error('reCAPTCHA secret key is not configured');
    return { success: false, error: 'Server configuration error' };
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret,
        response: token,
      }).toString(),
    });

    const data: RecaptchaVerificationResponse = await response.json();

    // Verify the response
    if (!data.success) {
      const errorMessage = data['error-codes']?.join(', ') || 'reCAPTCHA verification failed';
      console.error('reCAPTCHA verification failed:', errorMessage);
      return { success: false, error: errorMessage };
    }

    // Verify hostname if expectedHostname is provided
    if (expectedHostname && data.hostname !== expectedHostname) {
      console.error(`reCAPTCHA hostname mismatch: expected ${expectedHostname}, got ${data.hostname}`);
      return { 
        success: false, 
        error: 'reCAPTCHA verification failed: Invalid domain',
        score: data.score
      };
    }

    // Verify action if expectedAction is provided
    if (expectedAction && data.action !== expectedAction) {
      console.error(`reCAPTCHA action mismatch: expected ${expectedAction}, got ${data.action}`);
      return { 
        success: false, 
        error: 'reCAPTCHA verification failed: Invalid action',
        score: data.score
      };
    }

    // For reCAPTCHA v3, check the score if available
    if (typeof data.score === 'number' && data.score < minScore) {
      console.warn(`reCAPTCHA score ${data.score} is below threshold ${minScore}`);
      return { 
        success: false, 
        error: 'reCAPTCHA verification failed: Low score',
        score: data.score
      };
    }

    return { 
      success: true, 
      score: data.score
    };
  } catch (error) {
    console.error('Error verifying reCAPTCHA token:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error verifying reCAPTCHA' 
    };
  }
}

export default verifyRecaptchaToken;
