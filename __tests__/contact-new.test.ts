import { describe, it, expect, beforeAll, afterAll, jest, beforeEach } from '@jest/globals';
import { Pool } from 'pg';
import request from 'supertest';
import express from 'express';
import contactRouter from '../server/routes/contact.js';
import axios from 'axios';

// Mock the entire axios module
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Create a test app
const app = express();
app.use(express.json());
app.use('/api/contact', contactRouter);

// Test database connection
const testPool = new Pool({
  user: process.env.DB_USER || 'skylabs',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'skylabs_test',
  password: process.env.DB_PASSWORD || 'skylabs',
  port: parseInt(process.env.DB_PORT || '5432'),
});

describe('Contact API', () => {
  beforeAll(async () => {
    try {
      // Set up test database
      await testPool.query('DROP TABLE IF EXISTS contacts CASCADE');
      await testPool.query(`
        CREATE TABLE IF NOT EXISTS contacts (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT,
          message TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
        );
      `);
      
      // Mock reCAPTCHA verification
      mockedAxios.post.mockResolvedValue({
        data: { success: true },
        status: 200,
        statusText: 'OK',
        config: { url: 'https://www.google.com/recaptcha/api/siteverify' },
        headers: {}
      });
    } catch (error) {
      console.error('Failed to set up test database:', error);
      throw error;
    }
  });

  afterAll(async () => {
    // Clean up test database
    try {
      await testPool.query('DROP TABLE IF EXISTS contacts CASCADE');
      await testPool.end();
    } catch (error) {
      console.error('Error during test cleanup:', error);
    }
  });

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('POST /api/contact', () => {
    it('should submit a valid contact form', async () => {
      const contactData = {
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Hello, this is a test message',
        'g-recaptcha-response': 'valid-recaptcha-token'
      };

      const response = await request(app)
        .post('/api/contact')
        .send(contactData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Contact form submitted successfully');
      
      // Verify the data was saved to the database
      const result = await testPool.query('SELECT * FROM contacts WHERE email = $1', [contactData.email]);
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].name).toBe(contactData.name);
      expect(result.rows[0].message).toBe(contactData.message);
    });

    it('should return 400 for invalid input', async () => {
      const response = await request(app)
        .post('/api/contact')
        .send({}) // Empty data
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
    });

    it('should return 400 for invalid reCAPTCHA', async () => {
      // Mock failed reCAPTCHA verification
      mockedAxios.post.mockResolvedValueOnce({
        data: { success: false },
        status: 200,
        statusText: 'OK',
        config: { url: 'https://www.google.com/recaptcha/api/siteverify' },
        headers: {}
      });

      const response = await request(app)
        .post('/api/contact')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          message: 'Hello, this is a test message',
          'g-recaptcha-response': 'invalid-recaptcha-token'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'reCAPTCHA verification failed');
    });
  });
});
