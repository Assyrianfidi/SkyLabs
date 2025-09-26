import request from 'supertest';
import { createServer } from 'http';
import express from 'express';
import { registerRoutes } from '../routes.js';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the email service first
const mockSendContactFormEmail = vi.fn().mockResolvedValue({ success: true });
const mockSendTestEmail = vi.fn().mockResolvedValue({ success: true });

// Mock the email service module
vi.mock('../services/emailService.fixed.js', () => ({
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
}));

// Import the mocked email service
import { EmailService } from '../services/emailService.fixed.js';
const emailService = EmailService.getInstance();

type ContactFormData = {
  name: string;
  email: string;
  phone?: string;
  message: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: string;
};
import { db } from '../db/index.js';

// Mock the database connection
const mockDb = {
  query: {
    contacts: {
      insert: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([])
    }
  }
};

jest.mock('../db/index.js', () => ({
  db: mockDb
}));

describe('Contact Form API', () => {
  let app: express.Express;
  let server: ReturnType<typeof createServer>;

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
      mockSendContactFormEmail.mockResolvedValue({
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

    it('should return 500 if email service fails', async () => {
      // Mock email service failure
      mockSendContactFormEmail.mockResolvedValue({
        success: false,
        message: 'Failed to send email'
      });

      const response = await request(server)
        .post('/api/contact')
        .send(validContactData)
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to send email notification'
      });
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
      
      mockDb.query.contacts.findMany.mockResolvedValue(mockContacts);

      const response = await request(server)
        .get('/api/contacts')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual(mockContacts);
    });

    it('should handle database errors', async () => {
      mockDb.query.contacts.findMany.mockRejectedValue(new Error('Database error'));

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
