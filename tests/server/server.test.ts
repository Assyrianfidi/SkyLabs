import request from 'supertest';
import { Server } from 'http';
import { afterAll, beforeAll, afterEach, describe, expect, it, vi } from 'vitest';

// Import the logger and server with correct paths
import { logger } from '../../server/utils/logger.js';
import { app, startServer } from '../../server/server.js';

// Mock the logger to avoid polluting test output
vi.mock('../../server/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Server', () => {
  let server: Server;
  const testPort = 3003; // Use a different port for testing

  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.CORS_ORIGINS = 'http://localhost:3000';
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.PORT = testPort.toString();
    
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    try {
      logger.info('Starting test server...');
      server = await startServer(testPort);
      logger.info(`Test server started on port ${testPort}`);
    } catch (error) {
      logger.error('Failed to start test server:', error);
      throw error;
    }
  });

  afterAll(async () => {
    // Close the server after tests
    logger.info('Closing test server...');
    
    // If server is defined, close it
    if (server) {
      return new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) {
            logger.error('Error closing test server:', err);
            reject(err);
          } else {
            // Clear environment variables
            delete process.env.NODE_ENV;
            delete process.env.PORT;
            delete process.env.CORS_ORIGINS;
            delete process.env.DATABASE_URL;
            resolve();
          }
        });
      });
    } else {
      logger.warn('No server instance to close');
    }
  });
  
  afterEach(() => {
    // Clear all mocks after each test
    vi.clearAllMocks();
  });

  it('should return 200 for health check', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200);
      
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');

    expect(response.body).toHaveProperty('status', 'ok');
  });

  it('should return 404 for non-existent routes', async () => {
    const response = await request(server)
      .get('/api/non-existent-route')
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      error: 'Not Found',
      message: 'The requested resource was not found'
    });
  });

  it('should handle errors properly', async () => {
    const response = await request(server)
      .get('/api/non-existent-endpoint')
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      error: 'Not Found',
      message: 'The requested resource was not found'
    });
  });

  it('should handle CORS preflight requests', async () => {
    const response = await request(app)
      .options('/')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'content-type');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(response.headers['access-control-allow-methods']).toContain('GET');
    // Convert to lowercase for case-insensitive comparison
    const allowedHeaders = response.headers['access-control-allow-headers']?.toLowerCase() || '';
    expect(allowedHeaders).toContain('content-type');
  });
});
