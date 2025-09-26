import fetch from 'node-fetch';

/**
 * Verifies a reCAPTCHA token with Google's reCAPTCHA API
 * @param token - The reCAPTCHA token to verify
 * @param secret - The reCAPTCHA secret key
 * @returns Promise<boolean> - Whether the token is valid
 */
export async function verifyRecaptcha(token: string, secret: string = process.env.RECAPTCHA_SECRET_KEY!): Promise<boolean> {
  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${secret}&response=${token}`,
    });

    const data = await response.json();
    return data.success === true && data.score >= 0.5; // Adjust score threshold as needed
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return false;
  }
}

export default verifyRecaptcha;
