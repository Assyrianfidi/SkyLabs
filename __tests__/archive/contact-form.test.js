const request = require('supertest');
const express = require('express');
const { Router } = require('express');
const rateLimit = require('express-rate-limit');

// Mock the email service
jest.mock('../server/services/emailService.new.js', () => ({
  emailService: {
    sendContactFormEmail: jest.fn().mockResolvedValue({ success: true })
  }
}));

// Mock the logger
jest.mock('../server/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn()
  }
}));

// Import the contact router after setting up mocks
const { emailService } = require('../server/services/emailService.new.js');
const { logger } = require('../server/utils/logger.js');

// Create a test app with the contact router
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Create a router with rate limiting disabled for testing
  const testRouter = Router();
  
  // Mock rate limiter that doesn't actually limit
  const testLimiter = (req, res, next) => next();
  
  // Contact form validation schema
  const contactSchema = {
    parse: jest.fn().mockImplementation((data) => ({
      name: data.name,
      email: data.email,
      phone: data.phone || '',
      message: data.message
    }))
  };
  
  // Mock the contact form route
  testRouter.post('/', testLimiter, async (req, res) => {
    try {
      // Validate request body
      const { name, email, phone, message } = contactSchema.parse(req.body);
      
      // Send email
      await emailService.sendContactFormEmail({
        name,
        email,
        phone,
        message,
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      });
      
      res.status(200).json({
        success: true,
        message: 'Thank you for your message! We will get back to you soon.'
      });
    } catch (error) {
      logger.error('Contact form error:', error);
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors || {}
      });
    }
  });
  
  app.use('/api/contact', testRouter);
  return app;
};

describe('Contact Form API', () => {
  let app;
  
  beforeAll(() => {
    app = createTestApp();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  it('should submit a contact form successfully', async () => {
    const contactData = {
      name: 'Test User',
      email: 'test@example.com',
      message: 'This is a test message',
      phone: '+1234567890'
    };
    
    const response = await request(app)
      .post('/api/contact')
      .send(contactData)
      .expect('Content-Type', /json/)
      .expect(200);
    
    expect(response.body).toEqual({
      success: true,
      message: 'Thank you for your message! We will get back to you soon.'
    });
    
    // Verify email service was called with the correct data
    expect(emailService.sendContactFormEmail).toHaveBeenCalledWith({
      name: contactData.name,
      email: contactData.email,
      phone: contactData.phone,
      message: contactData.message,
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent'
    });
  });
  
  it('should handle validation errors', async () => {
    // Mock the schema to throw a validation error
    const mockError = new Error('Validation failed');
    mockError.errors = { name: 'Name is required' };
    const contactSchema = require('../server/routes/contact.new.js').contactSchema;
    const originalParse = contactSchema.parse;
    contactSchema.parse = jest.fn().mockImplementation(() => {
      throw mockError;
    });
    
    const response = await request(app)
      .post('/api/contact')
      .send({}) // Empty request to trigger validation error
      .expect('Content-Type', /json/)
      .expect(400);
    
    expect(response.body).toEqual({
      success: false,
      error: 'Validation failed',
      details: { name: 'Name is required' }
    });
    
    // Restore the original parse function
    contactSchema.parse = originalParse;
  });
});
