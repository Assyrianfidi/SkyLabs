import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { createServer } from 'http';

// Mock the email service
const mockSendContactFormEmail = jest.fn().mockResolvedValue({ success: true });
const mockSendTestEmail = jest.fn().mockResolvedValue({ success: true });

// Mock the email service module
jest.mock('../server/services/emailService.fixed.js', () => {
  const originalModule = jest.requireActual('../server/services/emailService.fixed.js');
  return {
    __esModule: true,
    ...originalModule,
    default: {
      sendContactFormEmail: mockSendContactFormEmail,
      sendTestEmail: mockSendTestEmail,
    },
    EmailService: {
      getInstance: () => ({
        sendContactFormEmail: mockSendContactFormEmail,
        sendTestEmail: mockSendTestEmail,
      }),
    },
  };
});

// Mock the database connection
const mockDb = {
  query: {
    contacts: {
      insert: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([])
    }
  }
};

jest.mock('../server/db/index.js', () => ({
  db: mockDb,
  default: {
    db: mockDb
  }
}));

// Mock the request-ip module
jest.mock('@supercharge/request-ip', () => ({
  getClientIp: () => '127.0.0.1'
}));

// Import the app after setting up mocks
import { registerRoutes } from '../server/routes.js';

describe('Contact Form API', () => {
  let app;
  let server;

  beforeAll(async () => {
    try {
      app = express();
      app.use(express.json());
      server = await registerRoutes(app);
      if (!server || typeof server.close !== 'function') {
        console.error('Server not properly initialized:', server);
        throw new Error('Server not properly initialized');
      }
    } catch (error) {
      console.error('Error in beforeAll:', error);
      throw error;
    }
  });

  afterAll((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/contact', () => {
    const validContactData = {
      name: 'John Doe',
      email: 'john@example.com',
      message: 'This is a test message',
      phone: '+1234567890'
    };

    test('should successfully submit a contact form', async () => {
    if (!server) {
      throw new Error('Server not initialized');
    }
      // Mock the email service response
      mockSendContactFormEmail.mockResolvedValueOnce({
        success: true,
        message: 'Email sent successfully'
      });

      const response = await request(server)
        .post('/api/contact')
        .send(validContactData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: expect.stringContaining('Your message has been sent successfully!')
      });

      // Verify email service was called with the correct data
      expect(mockSendContactFormEmail).toHaveBeenCalledWith({
        name: validContactData.name,
        email: validContactData.email,
        phone: validContactData.phone,
        message: validContactData.message,
        ipAddress: expect.any(String),
        userAgent: expect.any(String)
      });
    });

    test('should return 400 for invalid data', async () => {
      if (!server) {
        throw new Error('Server not initialized');
      }
      const response = await request(server)
        .post('/api/contact')
        .send({
          name: '', // Invalid: empty name
          email: 'not-an-email', // Invalid email
          message: 'short' // Too short message
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Validation failed',
        details: expect.any(Object)
      });

      // Verify email service was not called
      expect(mockSendContactFormEmail).not.toHaveBeenCalled();
    });

    test('should detect honeypot field', async () => {
      if (!server) {
        throw new Error('Server not initialized');
      }
      const response = await request(server)
        .post('/api/contact')
        .send({
          ...validContactData,
          website: 'spambot' // Honeypot field should be empty
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Validation failed',
        details: expect.any(Object)
      });

      // Verify email service was not called
      expect(mockSendContactFormEmail).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/contacts', () => {
    test('should return list of contacts', async () => {
      if (!server) {
        throw new Error('Server not initialized');
      }
      const mockContacts = [
        { id: 1, name: 'John Doe', email: 'john@example.com', message: 'Test message' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', message: 'Another test' }
      ];
      
      mockDb.query.contacts.findMany.mockResolvedValueOnce(mockContacts);

      const response = await request(server)
        .get('/api/contacts')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual(mockContacts);
    });

    test('should handle database errors', async () => {
      if (!server) {
        throw new Error('Server not initialized');
      }
      mockDb.query.contacts.findMany.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(server)
        .get('/api/contacts')
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Failed to retrieve contacts.'
      });
    });
  });
});
