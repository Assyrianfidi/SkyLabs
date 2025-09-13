import express, { type Request, Response, NextFunction } from "express";
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";
import { initializeDatabase } from "./db/index.js";
import { logError, logger } from "./utils/errorLogger.js";
// Error types are globally declared in ./types/error.d.ts
import { databaseMonitor } from "./services/databaseMonitor.js";
import { securityHeaders, loginLimiter, enforceHTTPS } from "./middleware/securityMiddleware.js";
import cspReportRouter from './routes/cspReport.js';

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

// CORS configuration must come before other middleware
const allowedOrigins = [
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://skylabs.tech',
  'https://skylabs-1.onrender.com'
];

// Add any additional origins from environment variable
if (process.env.CORS_ORIGINS) {
  allowedOrigins.push(...process.env.CORS_ORIGINS.split(','));
}

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all subdomains of onrender.com in production
    if (process.env.NODE_ENV === 'production' && origin.endsWith('.onrender.com')) {
      return callback(null, true);
    }
    
    // Allow explicitly listed origins
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    console.warn(`Blocked by CORS: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'X-Content-Type-Options',
    'Origin',
    'Accept',
    'Accept-Version',
    'Content-Length',
    'Content-MD5',
    'Date',
    'X-Api-Version'
  ],
  exposedHeaders: [
    'Content-Length', 
    'X-Content-Length',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS with the above options
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Add headers before the routes are defined
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin as string)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  }
  next();
});

// Apply security middleware
app.use(securityHeaders);

// CSP report endpoint
app.use('/csp-report', express.json({ type: ['json', 'application/csp-report'] }), cspReportRouter);

// Security headers with Helmet
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Changed to allow cross-origin
  originAgentCluster: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  strictTransportSecurity: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  } : false, // Disable HSTS in development
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // More lenient in development
  message: JSON.stringify({ 
    success: false, 
    error: 'Too many requests from this IP, please try again after 15 minutes' 
  })
});

// Apply rate limiting to API routes
app.use('/api', limiter);

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
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3002;
  
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
