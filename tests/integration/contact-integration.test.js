import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from '../server/routes.js';

// Mock the email service
jest.mock('../server/services/emailService.new.js', () => ({
  emailService: {
    sendContactFormEmail: jest.fn().mockResolvedValue({ success: true })
  }
}));

// Mock the database
jest.mock('../server/db/index.js', () => ({
  db: {
    query: {
      contacts: {
        findMany: jest.fn().mockResolvedValue([])
      }
    }
  }
}));

describe('Contact Form API', () => {
  let app;
  let server;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    server = await registerRoutes(app);
  });

  afterAll((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/contact', () => {
    const validContactData = {
      name: 'Test User',
      email: 'test@example.com',
      message: 'This is a test message',
      phone: '+1234567890'
    };

    it('should submit a contact form successfully', async () => {
      const response = await request(server)
        .post('/api/contact')
        .send(validContactData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('Thank you')
      });
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(server)
        .post('/api/contact')
        .send({
          name: '', // Invalid: empty name
          email: 'not-an-email',
          message: 'short' // Too short
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Validation failed',
        details: expect.any(Object)
      });
    });
  });

  describe('GET /api/contacts', () => {
    it('should return a list of contacts', async () => {
      const mockContacts = [
        { id: 1, name: 'Test User', email: 'test@example.com', message: 'Test message' }
      ];
      
      // Update the mock for this test
      require('../server/db/index.js').db.query.contacts.findMany
        .mockResolvedValueOnce(mockContacts);

      const response = await request(server)
        .get('/api/contacts')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual(mockContacts);
    });
  });
});
