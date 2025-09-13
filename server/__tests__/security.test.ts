import request from 'supertest';
import { app } from '../app.js';
import { config } from 'dotenv';

// Load environment variables
config();

describe('Security Middleware', () => {
  describe('HTTPS Redirection', () => {
    it('should redirect HTTP to HTTPS in production', async () => {
      // Save original NODE_ENV
      const originalNodeEnv = process.env.NODE_ENV;
      
      try {
        // Set to production for this test
        process.env.NODE_ENV = 'production';
        
        const response = await request(app)
          .get('/')
          .set('X-Forwarded-Proto', 'http');

        expect([301, 302]).toContain(response.status);
        expect(response.header.location).toMatch(/^https:/);
      } finally {
        // Restore original NODE_ENV
        process.env.NODE_ENV = originalNodeEnv;
      }
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app)
        .get('/')
        .set('X-Forwarded-Proto', 'https');

      // Check for common security headers
      const headers = response.header;
      
      // Required security headers
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['x-frame-options']).toBe('DENY');
      
      // Optional but recommended headers
      if (headers['x-xss-protection']) {
        expect(headers['x-xss-protection']).toBe('1; mode=block');
      }
      
      // Check for other security headers that might be set by Helmet
      expect(headers['referrer-policy']).toBeDefined();
      
      // These headers might be set in production
      if (process.env.NODE_ENV === 'production') {
        expect(headers['strict-transport-security']).toBeDefined();
      }
    });
  });
});
