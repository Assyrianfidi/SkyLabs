// Mock modules before importing anything that might use them
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock the database module
const mockQuery = vi.fn();
const mockRelease = vi.fn();
const mockConnect = vi.fn().mockResolvedValue({
  query: mockQuery,
  release: mockRelease,
});

// Mock the database module
vi.mock('../../server/db/index.js', () => ({
  getPool: vi.fn().mockResolvedValue({
    connect: mockConnect,
    query: mockQuery,
    end: vi.fn().mockResolvedValue(undefined),
  }),
}));

// Mock the email service
vi.mock('../../server/services/emailService.js', () => ({
  emailService: {
    sendEmail: vi.fn().mockResolvedValue(true)
  }
}));

// Mock reCAPTCHA verification
vi.mock('../../server/utils/recaptcha.js', () => ({
  verifyRecaptcha: vi.fn().mockResolvedValue(true)
}));

// Mock dotenv
vi.mock('dotenv/config', () => ({
  config: vi.fn()
}));

// Mock global fetch
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ success: true })
});

// Mock process.env
vi.stubGlobal('process', {
  ...process,
  env: {
    ...process.env,
    NODE_ENV: 'test',
    HONEYPOT_FIELD: 'website',
    RATE_LIMIT_WINDOW_MS: '900000',
    RATE_LIMIT_MAX: '100',
  },
});

// Now import the modules
import request from 'supertest';
import express from 'express';

describe('Contact API', () => {
  let app: express.Express;
  const validContactData = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '123-456-7890',
    message: 'Hello, this is a test message',
    'g-recaptcha-response': 'valid-recaptcha-token',
  };

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Set up default mock implementations
    mockQuery.mockReset().mockResolvedValue({ rows: [{ id: 1 }] });
    mockConnect.mockResolvedValue({
      query: mockQuery,
      release: mockRelease,
    });
    
    // Re-import the router to get a fresh instance for each test
    const { default: freshRouter } = await import('../../server/routes/contact.js');
    
    // Create a new Express app for each test
    app = express();
    app.use(express.json());
    app.use('/api/contact', freshRouter);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/contact', () => {
    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/contact')
        .send({});

      expect(response.status).toBe(400);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('errors');
      expect(response.body[0].errors).toHaveProperty('name');
      expect(response.body[0].errors).toHaveProperty('email');
      expect(response.body[0].errors).toHaveProperty('message');
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/contact')
        .send({
          ...validContactData,
          email: 'invalid-email'
        });

      expect(response.status).toBe(400);
      expect(response.body[0].errors).toHaveProperty('email');
    });

    it('should return 403 for invalid reCAPTCHA token', async () => {
      // Mock reCAPTCHA verification to fail
      const { verifyRecaptcha } = await import('../../server/utils/recaptcha');
      (verifyRecaptcha as any).mockResolvedValueOnce(false);

      const response = await request(app)
        .post('/api/contact')
        .send(validContactData);

      expect(response.status).toBe(403);
      expect(response.body[0].errors).toHaveProperty('recaptcha');
    });

    it('should return 500 if database query fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/api/contact')
        .send(validContactData);

      expect(response.status).toBe(500);
      expect(response.body[0].errors).toBeDefined();
    });

    it('should return 200 and success message for valid submission', async () => {
      const response = await request(app)
        .post('/api/contact')
        .send(validContactData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(mockQuery).toHaveBeenCalled();
    });
  });
});
