import { Router } from 'express';
import { Pool } from 'pg';
import { z } from 'zod';
import { validateRequest } from 'zod-express-middleware';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';

// Contact form schema
const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().optional(),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  // Honeypot field: should be empty; bots often fill it
  website: z.string().optional(),
});

const router = Router();

// Per-route rate limiter (looser in test environment)
const contactLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 100 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});

// Create a new pool instance
const pool = new Pool({
  user: process.env.DB_USER || 'skylabs',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'skylabs_dev',
  password: process.env.DB_PASSWORD || 'skylabs',
  port: parseInt(process.env.DB_PORT || '5432'),
});

// Test the connection
pool.query('SELECT NOW()', (err) => {
  if (err) {
    console.error('❌ Database connection error:', err);
  } else {
    console.log('✅ Connected to PostgreSQL database');
  }
});

// POST /api/contact - Submit contact form
router.post(
  '/',
  contactLimiter,
  validateRequest({
    body: contactSchema,
  }),
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      const { name, email, phone, message, website } = req.body;

      // Honeypot check
      if (website && website.trim().length > 0) {
        console.log('Spam detected - honeypot field filled');
        return res.status(200).json({ 
          success: true, 
          message: 'Thank you for your message!' 
        });
      }
      
      // Start a transaction
      await client.query('BEGIN');
      
      // Insert into database
      const result = await client.query(
        'INSERT INTO contacts (name, email, phone, message, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
        [name, email, phone || null, message]
      );
      
      await client.query('COMMIT');
      
      const newContact = result.rows[0];
      
      return res.status(201).json({
        success: true,
        data: newContact,
        message: 'Your message has been sent successfully!',
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error submitting contact form:', error);
      
      // Check for specific error types
      if (error instanceof Error) {
        if (error.message.includes('duplicate key value')) {
          return res.status(400).json({
            success: false,
            error: 'A message with these details already exists',
          });
        }
      }
      
      return res.status(500).json({
        success: false,
        error: 'Failed to submit contact form. Please try again later.',
      });
    } finally {
      client.release();
    }
  }
);

export default router;
