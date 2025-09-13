export const getEnvVar = (key: string, fallback = ""): string => {
  try {
    // For Vite client-side environment variables
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      const value = (import.meta as any).env[key];
      if (value !== undefined) return String(value);
    }

    // For Vite's import.meta.env.VITE_* variables
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      const viteKey = `VITE_${key}`;
      const value = (import.meta as any).env[viteKey];
      if (value !== undefined) return String(value);
    }

    // For Node.js process.env (SSR/Next.js)
    if (typeof process !== 'undefined' && process.env) {
      const value = (process as any).env?.[key];
      if (value) return String(value);
    }

    // Fallback to test key for reCAPTCHA in development
    if (key === 'VITE_NEXT_PUBLIC_RECAPTCHA_SITE_KEY' || key === 'NEXT_PUBLIC_RECAPTCHA_SITE_KEY') {
      return '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';
    }

    return fallback;
  } catch (error) {
    console.error(`Error getting environment variable ${key}:`, error);
    return fallback;
  }
};
