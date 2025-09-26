import express, { type Request, type Response, type NextFunction, type Express, type ErrorRequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer, type Server as HttpServer } from 'http';
import { initializeDatabase } from './db/index.js';
import { logger } from './utils/logger.js';
import { registerRoutes } from './routes.js';
import { ZodError } from 'zod';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV?: 'development' | 'production' | 'test';
      PORT?: string;
      CORS_ORIGINS?: string;
    }
  }
}

const app: Express = express();
let httpServer: HttpServer | null = null;

// Generate a unique request ID for each incoming request
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.requestId = Math.random().toString(36).substring(2, 9);
  next();
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'"],
      connectSrc: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
}));

// Request parsing middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, originalUrl, ip } = req;
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(JSON.stringify({
      method,
      url: originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip,
      requestId: req.requestId
    }));
  });
  
  next();
});

// CORS configuration
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (process.env.NODE_ENV === 'development' || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Request-Id']
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' }
});

// Apply rate limiting to all API routes
app.use('/api', limiter);

// Register routes
registerRoutes(app);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: 'The requested resource was not found'
  });
});

// Error handling middleware
const errorHandler: ErrorRequestHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const errorId = req.requestId || 'unknown';
  
  const errorData: Record<string, any> = {
    errorId,
    message: err.message,
    path: req.path,
    method: req.method,
  };

  if (process.env.NODE_ENV === 'development') {
    errorData.stack = err.stack;
  }

  logger.error(JSON.stringify(errorData));

  const response: Record<string, any> = {
    success: false,
    error: statusCode === 500 ? 'Internal Server Error' : err.name || 'Error',
    message,
    errorId,
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  if (err instanceof ZodError) {
    response.errors = err.errors;
  }

  res.status(statusCode).json(response);
};

// Apply error handler
app.use(errorHandler);

// Start the server
export const startServer = async (port: number = 3002): Promise<HttpServer> => {
  try {
    // Initialize database
    await initializeDatabase();

    // Create HTTP server
    const server = createServer(app);
    httpServer = server;

    // Start listening
    return new Promise((resolve) => {
      server.listen(port, () => {
        logger.info(`Server is running on port ${port}`);
        resolve(server);
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  
  if (httpServer) {
    httpServer.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

// Handle process termination signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  logger.error(JSON.stringify({
    message: 'Unhandled Rejection',
    error: error.message,
    stack: error.stack
  }));
  
  // In production, we might want to restart the process
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error(JSON.stringify({
    message: 'Uncaught Exception',
    error: error.message,
    stack: error.stack
  }));
  
  // In production, we might want to restart the process
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Export app and httpServer for testing
export { app, httpServer as server };
