const request = require('supertest');
const express = require('express');

// Create a simple Express app for testing
const app = express();
app.use(express.json());

// Mock contact form submission
app.post('/api/contact', (req, res) => {
  const { name, email, message } = req.body;
  
  // Simple validation
  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: {
        name: !name ? 'Name is required' : undefined,
        email: !email ? 'Email is required' : undefined,
        message: !message ? 'Message is required' : undefined
      }
    });
  }
  
  // Mock successful submission
  res.status(200).json({
    success: true,
    message: 'Thank you for your message! We will get back to you soon.'
  });
});

describe('Simple Contact Form API', () => {
  it('should submit a contact form successfully', async () => {
    const contactData = {
      name: 'Test User',
      email: 'test@example.com',
      message: 'This is a test message'
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
  });
  
  it('should return validation errors for missing fields', async () => {
    const response = await request(app)
      .post('/api/contact')
      .send({}) // Empty request
      .expect('Content-Type', /json/)
      .expect(400);
    
    expect(response.body).toMatchObject({
      success: false,
      error: 'Validation failed',
      details: {
        name: 'Name is required',
        email: 'Email is required',
        message: 'Message is required'
      }
    });
  });
});
