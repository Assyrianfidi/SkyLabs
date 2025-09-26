import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import helmet from 'helmet';
import { config } from 'dotenv';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { randomBytes } from 'crypto';

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
    
    // Set Content Security Policy with nonce-based approach
    const nonce = randomBytes(16).toString('base64');
    res.locals.cspNonce = nonce; // Make nonce available in templates
    
    // Default CSP directives with environment overrides
    const cspDirectives = [
      `default-src 'self'`,
      // Script sources
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ` +
        `https://www.google.com/recaptcha/ ` +
        `https://www.gstatic.com/recaptcha/ ` +
        `https://replit.com ` +
        `https://repl.it ` +
        `https://replit.com/ ` +
        `https://replit-public.nyc3.digitaloceanspaces.com ` +
        `https://unpkg.com ` +
        `'unsafe-inline'`,
      `script-src-elem 'self' 'nonce-${nonce}' ` +
        `https://www.google.com/recaptcha/ ` +
        `https://www.gstatic.com/recaptcha/ ` +
        `https://replit.com ` +
        `https://repl.it ` +
        `https://replit.com/ ` +
        `https://replit-public.nyc3.digitaloceanspaces.com ` +
        `https://unpkg.com ` +
        `'unsafe-inline'`,
      // Style sources
      `style-src 'self' 'unsafe-inline' 'unsafe-hashes' ` +
        `https://fonts.googleapis.com ` +
        `https://replit.com ` +
        `https://repl.it ` +
        `https://unpkg.com`,
      `style-src-elem 'self' 'unsafe-inline' ` +
        `https://fonts.googleapis.com ` +
        `https://replit.com ` +
        `https://repl.it ` +
        `https://unpkg.com`,
      // Media sources
      `img-src 'self' data: blob: https: http:`,
      // Font sources
      `font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com data: blob:`,
      // Connect sources
      `connect-src 'self' ` +
        `https://www.google.com/recaptcha/ ` +
        `https://www.gstatic.com/recaptcha/ ` +
        `ws: wss: ` +
        `https://replit.com ` +
        `https://repl.it ` +
        `http://localhost:3001 ` +
        `http://127.0.0.1:3001 ` +
        `http://localhost:5173 ` +
        `http://127.0.0.1:5173 ` +
        `http://localhost:${process.env.PORT || 3002} ` +
        `http://127.0.0.1:${process.env.PORT || 3002} ` +
        `${process.env.API_BASE_URL || 'http://localhost:3001'}`,
      // Frame sources
      `frame-src 'self' ` +
        `https://www.google.com/recaptcha/ ` +
        `https://replit.com ` +
        `https://repl.it`,
      // Other directives
      `prefetch-src 'self' https://fonts.gstatic.com`,
      `manifest-src 'self'`,
      `worker-src 'self' blob:`,
      `object-src 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `frame-ancestors 'self'`,
      `upgrade-insecure-requests`,
      `media-src 'self' https: blob: data:`
    ];
    
    // Add report-uri if configured
    if (process.env.CSP_REPORT_URI) {
      cspDirectives.push(`report-uri ${process.env.CSP_REPORT_URI}`);
      cspDirectives.push('report-to csp-endpoint');
    }
    
    // Set the CSP header
    const cspHeader = cspDirectives.join('; ');
    res.setHeader('Content-Security-Policy', cspHeader);
    
    // Set Report-To header for CSP violation reporting
    if (process.env.NODE_ENV !== 'production' || process.env.CSP_REPORT_URI) {
      res.setHeader('Report-To', JSON.stringify({
        group: 'csp-endpoint',
        max_age: 10886400,
        endpoints: [
          { url: process.env.CSP_REPORT_URI || '/csp-report' }
        ],
        include_subdomains: true
      }));
    }
    
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
