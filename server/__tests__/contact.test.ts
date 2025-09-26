import request from 'supertest';
import express from 'express';
import { createServer, Server } from 'http';
import { registerRoutes } from '../routes.js';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the email service
const mockSendContactFormEmail = vi.fn().mockResolvedValue({ success: true });
const mockSendTestEmail = vi.fn().mockResolvedValue({ success: true });

// Mock the email service module
vi.mock('../services/emailService.fixed.js', () => {
  return {
    __esModule: true,
    default: {
      sendContactFormEmail: mockSendContactFormEmail,
      sendTestEmail: mockSendTestEmail,
    },
    EmailService: {
      getInstance: vi.fn().mockImplementation(() => ({
        sendContactFormEmail: mockSendContactFormEmail,
        sendTestEmail: mockSendTestEmail,
      })),
    },
  };
});

// Import the mocked email service
import { EmailService } from '../services/emailService.fixed.js';
const emailService = EmailService.getInstance();

// Mock the database connection
const mockDb = {
  query: {
    contacts: {
      insert: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([])
    }
  }
};

vi.mock('../db/index.js', () => ({
  db: mockDb,
  default: {
    db: mockDb
  }
}));

// Mock the request-ip module
vi.mock('@supercharge/request-ip', () => ({
  getClientIp: vi.fn(() => '127.0.0.1')
}));

describe('Contact Form API', () => {
  let app: express.Express;
  let server: Server;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    server = await registerRoutes(app);
  });

  afterAll((done) => {
    server.close(done);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/contact', () => {
    const validContactData = {
      name: 'John Doe',
      email: 'john@example.com',
      message: 'This is a test message',
      phone: '+1234567890'
    };

    it('should successfully submit a contact form', async () => {
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
      expect(vi.isMockFunction(mockSendContactFormEmail)).toBe(true);
      expect(mockSendContactFormEmail).toHaveBeenCalledWith({
        name: validContactData.name,
        email: validContactData.email,
        phone: validContactData.phone,
        message: validContactData.message,
        ipAddress: expect.any(String),
        userAgent: expect.any(String)
      });
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(server)
        .post('/api/contact')
        .send({
          name: '', // Invalid: empty name
          email: 'not-an-email', // Invalid email
          message: 'short' // Too short message
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Validation failed',
        details: {
          name: 'Name must be at least 2 characters',
          email: 'Please enter a valid email address',
          message: 'Message must be at least 10 characters'
        }
      });

      // Verify email service was not called
      expect(mockSendContactFormEmail).not.toHaveBeenCalled();
    });

    it('should detect honeypot field', async () => {
      const response = await request(server)
        .post('/api/contact')
        .send({
          ...validContactData,
          website: 'spambot' // Honeypot field should be empty
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Validation failed',
        details: {
          website: 'This field should be empty'
        }
      });

      // Verify email service was not called
      expect(mockSendContactFormEmail).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/contacts', () => {
    it('should return list of contacts', async () => {
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

    it('should handle database errors', async () => {
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
