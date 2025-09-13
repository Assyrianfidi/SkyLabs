import express, { type Request, Response, NextFunction } from "express";
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";
import { initializeDatabase } from "./db/index.js";
import { logError } from "./utils/errorLogger.js";
// Error types are globally declared in ./types/error.d.ts
import { databaseMonitor } from "./services/databaseMonitor.js";

// Initialize database monitoring
async function initializeApp() {
  try {
    // Initialize database connection and monitoring
    await initializeDatabase();
    await databaseMonitor.startMonitoring();
    
    // Verify database is responsive
    const stats = await databaseMonitor.getDatabaseStats();
    console.log(`✅ Database monitoring initialized. Size: ${stats.databaseSize}, Active connections: ${stats.activeConnections}`);
    
  } catch (error) {
    await logError(
      error as Error,
      'Application Initialization',
      'System',
      '🔴 Critical',
      { action: 'Failed to initialize application services' },
      'monitor_connection'
    );
    console.error('❌ Failed to initialize application. Check ERROR_LOG.md for details.');
    process.exit(1);
  }
}

// Start the application
initializeApp();

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https: http:"],
      connectSrc: ["'self'", process.env.CORS_ORIGIN || 'http://localhost:3000'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
});

// Apply rate limiting to all requests
app.use(limiter);

// Enable CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Error handling middleware
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Error stack:', err.stack);
    console.error('Error details:', {
      message: err.message,
      name: err.name,
      ...(err as any).details && { details: (err as any).details },
      ...(err as any).code && { code: (err as any).code },
      ...(err as any).constraint && { constraint: (err as any).constraint },
    });
    
    const status = 'status' in err && typeof err.status === 'number' ? err.status : 500;
    const message = err.message || 'Internal Server Error';
    const category = 'category' in err ? err.category : 'server';
    const severity = 'severity' in err ? err.severity : (status >= 500 ? '🔴 Critical' : '🟠 Major');
    
    logError(err, `HTTP ${status}: ${_req.method} ${_req.path}`, category as any, severity as any)
      .catch(console.error);

    // Don't expose internal errors in production
    const errorResponse = process.env.NODE_ENV === 'production' && status >= 500
      ? { 
          error: 'Internal Server Error',
          statusCode: 500
        }
      : { 
          error: message,
          statusCode: status,
          ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
          ...('details' in err && { details: (err as any).details })
        };

    res.status(status).json(errorResponse);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Start the server
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;
  
  server.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
    
    // Start database monitoring after server is running
    databaseMonitor.startMonitoring().catch(err => {
      console.error('❌ Failed to start database monitoring:', err);
    });
  });

  // Handle server errors
  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${port} is already in use. Please check for other running instances.`);
    } else {
      console.error('❌ Server error:', error);
    }
    process.exit(1);
  });
})();
