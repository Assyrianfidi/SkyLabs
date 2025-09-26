import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from 'zod-express-middleware';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';
import { getPool } from '../db/index.js';
import { emailService } from '../services/emailService.js';
import { logger } from '../utils/logger.js';

// Environment variables validation
const envVars = {
  HONEYPOT_FIELD: process.env.HONEYPOT_FIELD || 'website',
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '5', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
};

// Contact form schema
const contactSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  email: z.string()
    .email('Please enter a valid email')
    .max(100, 'Email must be less than 100 characters')
    .toLowerCase()
    .trim(),
  phone: z.string()
    .max(20, 'Phone number is too long')
    .regex(/^[\d\s\-+()]*$/, 'Please enter a valid phone number')
    .optional()
    .or(z.literal(''))
    .transform(val => val || undefined),
  message: z.string()
    .min(10, 'Message must be at least 10 characters')
    .max(2000, 'Message must be less than 2000 characters')
    .trim(),
  // Honeypot field: should be empty; bots often fill it
  [envVars.HONEYPOT_FIELD]: z.string().max(0, 'Invalid form submission').optional().default(''),
});

const router = Router();

// Request logger middleware
router.use((req, _, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  logger.info(`Contact form request from ${ip}: ${req.method} ${req.path}`);
  next();
});

// Rate limiting middleware
const contactLimiter = rateLimit({
  windowMs: envVars.RATE_LIMIT_WINDOW_MS,
  max: envVars.NODE_ENV === 'test' ? 100 : envVars.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for certain IPs (e.g., your office IP)
    const whitelist = process.env.RATE_LIMIT_WHITELIST?.split(',') || [];
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    return whitelist.includes(ip as string);
  },
  handler: (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    logger.warn(`Rate limit exceeded for IP: ${ip}`);
    
    res.status(429).json({
      success: false,
      error: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil(envVars.RATE_LIMIT_WINDOW_MS / 1000), // in seconds
    });
  },
});

// Get the database pool
const pool = await getPool();

// POST /api/contact - Submit contact form
router.post(
  '/',
  contactLimiter,
  validateRequest({
    body: contactSchema,
  }),
  async (req, res) => {
    const startTime = Date.now();
    const { name, email, phone, message } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    // Log the submission attempt
    logger.info(`Contact form submission attempt from ${email} (IP: ${ip})`);
    
    // Get database connection
    if (!pool) {
      logger.error('Database connection pool is not available');
      return res.status(503).json({
        success: false,
        error: 'Service temporarily unavailable. Please try again later.'
      });
    }

    const client = await pool.connect().catch(err => {
      logger.error('Failed to get database client:', err);
      return null;
    });

    if (!client) {
      return res.status(500).json({
        success: false,
        error: 'Failed to connect to the database. Please try again later.'
      });
    }
    
    try {
      // Start a transaction
      await client.query('BEGIN');
      
      // Insert into database
      const result = await client.query(
        `INSERT INTO contacts 
         (name, email, phone, message, ip_address, user_agent, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
         RETURNING *`,
        [
          name, 
          email, 
          phone || null, 
          message,
          ip,
          req.headers['user-agent'] || null
        ]
      );
      
      const newContact = result.rows[0];
      
      // Send email notification
      const emailResult = await emailService.sendContactFormEmail({
        name,
        email,
        phone: phone || undefined,
        message
      });
      
      if (!emailResult.success) {
        logger.warn('Failed to send email notification:', emailResult.error);
        // Don't fail the request, just log the error
      }
      
      await client.query('COMMIT');
      
      // Log successful submission
      const duration = Date.now() - startTime;
      logger.info(`Contact form submitted successfully in ${duration}ms`, { 
        email,
        contactId: newContact.id,
        duration
      });
      
      return res.status(201).json({
        success: true,
        message: 'Your message has been sent successfully! We\'ll get back to you soon.',
        data: {
          id: newContact.id,
          name: newContact.name,
          email: newContact.email,
          submittedAt: newContact.created_at
        }
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      
      // Log the error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error submitting contact form:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        email,
        ip,
        userAgent: req.headers['user-agent']
      });
      
      // Handle specific error types
      if (error instanceof Error) {
        // Handle database constraint violations
        if (error.message.includes('duplicate key value')) {
          return res.status(400).json({
            success: false,
            error: 'A message with these details already exists. Please wait before submitting again.',
            code: 'DUPLICATE_SUBMISSION'
          });
        }
        
        // Handle validation errors
        if (error.name === 'ZodError') {
          return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: JSON.parse(error.message)
          });
        }
      }
      
      // Generic error response
      return res.status(500).json({
        success: false,
        error: 'An unexpected error occurred while processing your request. Please try again later.',
        code: 'INTERNAL_SERVER_ERROR'
      });
    } finally {
      client.release();
    }
  }
);

export default router;
