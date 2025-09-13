import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import helmet from 'helmet';
import { config } from 'dotenv';
import { Request, Response, NextFunction, RequestHandler } from 'express';

// Load environment variables
config();

/**
 * Rate limiting middleware for login attempts
 * Limits to 5 attempts per 10 minutes per IP
 */
const loginLimiter: RequestHandler = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    success: false,
    error: 'Too many login attempts. Please try again after 10 minutes.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req: Request) => {
    // Use ipKeyGenerator to handle IPv6 addresses properly
    const ip = req.ip ? ipKeyGenerator(req.ip) : 'unknown-ip';
    const userAgent = req.headers['user-agent'] || 'no-user-agent';
    return `${ip}_${userAgent}`;
  },
  validate: { trustProxy: false }, // Explicitly disable trust proxy to avoid IP spoofing
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Too many login attempts. Please try again later.'
    });
  }
});

/**
 * Security headers middleware
 * Applies various security-related HTTP headers
 */
const securityHeaders: RequestHandler[] = [
  // Set security headers using helmet
  helmet(),
  
  // Additional security headers
  (req: Request, res: Response, next: NextFunction) => {
    // Set X-Content-Type-Options to prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Set X-Frame-Options to prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Set X-XSS-Protection (for older browsers)
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Set Referrer-Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Set Permissions-Policy
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), fullscreen=(self)'
    );
    
    // Set Strict-Transport-Security (HSTS)
    if (req.secure) {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
    }
    
    // Set Content Security Policy
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "connect-src 'self' " + (process.env.API_BASE_URL || 'http://localhost:3000') + "; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'; " +
      "frame-ancestors 'none'; " +
      "upgrade-insecure-requests;"
    );
    
    next();
  }
];

/**
 * HTTPS redirection middleware
 * Redirects HTTP requests to HTTPS in production
 */
const enforceHTTPS: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  // Skip in development or if already on HTTPS
  if (process.env.NODE_ENV === 'development' || req.secure) {
    return next();
  }
  
  // Redirect to HTTPS
  res.redirect(301, `https://${req.headers.host}${req.url}`);
};

export { loginLimiter, securityHeaders, enforceHTTPS };
