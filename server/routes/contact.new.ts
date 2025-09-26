import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { emailService } from '../services/emailService.new.js';
import { getClientIp } from '@supercharge/request-ip';
import { logger } from '../utils/logger.js';

const router = Router();

// Rate limiting configuration
const contactLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes by default
  max: parseInt(process.env.RATE_LIMIT_MAX || '5', 10), // 5 requests per window by default
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
  skip: (req) => {
    // Skip rate limiting for localhost in development
    return process.env.NODE_ENV === 'development' && req.ip === '::ffff:127.0.0.1';
  },
});

// Contact form validation schema
const contactSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  email: z.string()
    .email('Please enter a valid email address')
    .max(100, 'Email must be less than 100 characters'),
  phone: z.string()
    .max(20, 'Phone number must be less than 20 characters')
    .optional()
    .or(z.literal('')),
  message: z.string()
    .min(10, 'Message must be at least 10 characters')
    .max(2000, 'Message must be less than 2000 characters')
    .trim(),
  // Honeypot field - should be empty
  website: z.string().max(0, 'This field should be empty').optional(),
});

/**
 * POST /api/contact
 * Submit a contact form
 */
router.post('/', contactLimiter, async (req, res) => {
  try {
    // Validate request body
    const validationResult = contactSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.reduce((acc, curr) => {
        const key = curr.path.join('.');
        acc[key] = curr.message;
        return acc;
      }, {} as Record<string, string>);

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
      });
    }

    const { name, email, phone, message } = validationResult.data;
    const ipAddress = getClientIp(req) || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Send email notification
    const emailResult = await emailService.sendContactFormEmail({
      name,
      email,
      phone: phone || undefined,
      message,
      ipAddress,
      userAgent,
    });

    if (!emailResult.success) {
      logger.error('Failed to send contact form email', { email, error: emailResult.message });
      return res.status(500).json({
        success: false,
        error: 'Failed to send email notification',
      });
    }

    // Log successful submission
    logger.info('Contact form submitted successfully', { email, ipAddress });

    return res.status(200).json({
      success: true,
      message: 'Your message has been sent successfully! We\'ll get back to you soon.',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error processing contact form submission:', error);
    
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    });
  }
});

export default router;
