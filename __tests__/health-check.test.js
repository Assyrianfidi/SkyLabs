import request  from "supertest";
import express  from "express";

// Create a simple Express app for testing
const app = express();
app.use(express.json());

// Add a test route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

describe('Health Check', () => {
  it('should return 200 and status ok', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toEqual({ status: 'ok' });
  });
});
