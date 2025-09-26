import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log directory
const logDir = path.join(__dirname, '../../logs');

// Create logs directory if it doesn't exist
async function ensureLogsDir() {
  try {
    await fs.mkdir(logDir, { recursive: true });
  } catch (error) {
    console.error('Failed to create logs directory:', error);
  }
}

// Call the async function immediately
ensureLogsDir().catch(console.error);

// Create a logger that can handle both string and object logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format((info) => {
      if (typeof info.message === 'object') {
        info.message = JSON.stringify(info.message);
      }
      return info;
 })(),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'skylabs-api' },
  transports: [
    // Write all logs with level `error` and below to `error.log`
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
    }),
    // Write all logs to `combined.log`
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
  ],
});

// Add console logging in non-production environments
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Create a stream for morgan
const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  }
};

export { logger, stream };
