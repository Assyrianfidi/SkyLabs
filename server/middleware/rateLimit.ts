import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { Redis } from 'ioredis';
import RedisStore from 'rate-limit-redis';

// In-memory store for development
const memoryStore = new Map();

// Create Redis client if REDIS_URL is provided
const redisClient = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  
  // Use Redis if available, otherwise fall back to in-memory store
  store: redisClient 
    ? new RedisStore({
        client: redisClient,
        prefix: 'rate_limit:',
      })
    : {
        // Simple in-memory store for development
        increment: (key: string, _: number, cb: (err: Error | null, hits: number, resetTime: Date) => void) => {
          const now = Date.now();
          const windowMs = 15 * 60 * 1000; // 15 minutes
          
          if (!memoryStore.has(key)) {
            memoryStore.set(key, { hits: 0, resetTime: new Date(now + windowMs) });
          }
          
          const entry = memoryStore.get(key);
          
          if (now > entry.resetTime) {
            entry.hits = 0;
            entry.resetTime = new Date(now + windowMs);
          }
          
          entry.hits++;
          memoryStore.set(key, entry);
          
          cb(null, entry.hits, entry.resetTime);
        },
      },
  
  // Custom message when rate limit is exceeded
  message: {
    status: 'error',
    message: 'Too many requests, please try again later.',
  },
  
  // Skip rate limiting for certain paths
  skip: (req: Request) => {
    // Skip rate limiting for static assets and health checks
    return req.path.includes('/health') || 
           req.path.includes('/public/') ||
           req.path.endsWith('.js') ||
           req.path.endsWith('.css') ||
           req.path.endsWith('.jpg') ||
           req.path.endsWith('.png');
  },
});

// More aggressive rate limiting for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: {
    status: 'error',
    message: 'Too many login attempts, please try again later.',
  },
});
