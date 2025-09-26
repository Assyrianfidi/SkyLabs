import request from 'supertest';
import express from 'express';
import { createServer } from 'http';

// Create a simple test app
const app = express();
app.use(express.json());

// Add a test route
app.post('/api/contact', (req, res) => {
  res.json({ success: true, message: 'Test message received' });
});

// Create server
const server = createServer(app);

describe('Basic Contact Form API', () => {
  afterAll((done) => {
    server.close(done);
  });

  test('should respond to POST /api/contact', async () => {
    const response = await request(server)
      .post('/api/contact')
      .send({ name: 'Test', email: 'test@example.com', message: 'Hello' })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      message: 'Test message received'
    });
  });
});
