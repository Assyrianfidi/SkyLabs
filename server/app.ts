import express, { type Express, type Request, type Response, type RequestHandler } from 'express';
import { config } from 'dotenv';
import cors from 'cors';
import { securityHeaders, enforceHTTPS, loginLimiter } from './middleware/securityMiddleware.js';
import authRoutes from './routes/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createServer } from 'http';
import { setupVite, log } from './vite.js';

// Load environment variables
config();

// Initialize Express app
const app: Express = express();
const PORT = process.env.PORT || 3002;

// Create HTTP server
const server = createServer(app);

// Security Middleware - Apply in correct order
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply security headers (array of middleware functions)
securityHeaders.forEach((middleware: RequestHandler) => app.use(middleware));

// Apply HTTPS enforcement
app.use(enforceHTTPS);

// CORS configuration - Apply after security headers
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-RateLimit-Limit', 'X-RateLimit-Remaining']
}));

// Rate limiting on auth routes - Apply after CORS
app.use('/api/auth/login', loginLimiter);

// API Routes
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Setup Vite in development
    if (process.env.NODE_ENV === 'development') {
      await setupVite(app, server);
    }

    // Start the server
    server.listen(PORT, () => {
      log(`Server running on port ${PORT}`);
      log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: unknown) => {
  console.error('Unhandled Rejection:', err instanceof Error ? err : String(err));
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: unknown) => {
  console.error('Uncaught Exception:', err instanceof Error ? err : String(err));
  server.close(() => process.exit(1));
});

// Export the app for testing
export { app, startServer };

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export default app;
