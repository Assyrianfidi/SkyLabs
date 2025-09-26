const request = require('supertest');
const express = require('express');
const { Router } = require('express');

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
const contactRouter = require('../server/routes/contact.new.js');
const { emailService } = require('../server/services/emailService.new.js');
const { logger } = require('../server/utils/logger.js');

// Create a test app with the contact router
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Create a test router with rate limiting disabled for testing
  const testRouter = Router();
  
  // Add the contact routes to the test router
  testRouter.use(contactRouter);
  
  // Mount the test router
  app.use('/api/contact', testRouter);
  
  return app;
};

describe('Contact Form API Integration', () => {
  let app;
  
  beforeAll(() => {
    // Create a test app with the contact router
    app = createTestApp();
  });
  
  afterEach(() => {
    // Clear all mocks between tests
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
    
    expect(response.body).toMatchObject({
      success: true,
      message: expect.stringContaining('Thank you')
    });
    
    // Verify email service was called
    expect(emailService.sendContactFormEmail).toHaveBeenCalled();
  });
  
  it('should return validation errors for missing required fields', async () => {
    const response = await request(app)
      .post('/api/contact')
      .send({}) // Missing required fields
      .expect('Content-Type', /json/)
      .expect(400);
    
    expect(response.body).toMatchObject({
      success: false,
      error: 'Validation failed',
      details: expect.objectContaining({
        name: expect.any(String),
        email: expect.any(String),
        message: expect.any(String)
      })
    });
    
    // Verify email service was not called
    expect(emailService.sendContactFormEmail).not.toHaveBeenCalled();
  });
  
  it('should detect honeypot field', async () => {
    const response = await request(app)
      .post('/api/contact')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        message: 'This is a test message',
        website: 'spam-bot' // Honeypot field should be empty
      })
      .expect('Content-Type', /json/)
      .expect(400);
    
    expect(response.body).toMatchObject({
      success: false,
      error: 'Validation failed',
      details: expect.objectContaining({
        website: expect.any(String)
      })
    });
    
    // Verify email service was not called
    expect(emailService.sendContactFormEmail).not.toHaveBeenCalled();
  });
});
