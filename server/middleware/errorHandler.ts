import { Request, Response, NextFunction } from 'express';

interface CustomError extends Error {
  statusCode?: number;
  code?: string;
}

/**
 * Error handling middleware
 */
export function errorHandler(err: CustomError, req: Request, res: Response, next: NextFunction) {
  // Default status code is 500 (Internal Server Error)
  const statusCode = err.statusCode || 500;
  
  // Default error message
  const message = err.message || 'Internal Server Error';
  
  // Log the error for debugging
  console.error(`[${new Date().toISOString()}] Error: ${message}`);
  console.error(err.stack);
  
  // Don't leak error details in production
  const response: {
    success: boolean;
    error: string;
    code?: string;
    stack?: string;
  } = {
    success: false,
    error: message,
  };
  
  // Include error code if available
  if (err.code) {
    response.code = err.code;
  }
  
  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }
  
  // Send error response
  res.status(statusCode).json(response);
}

/**
 * Async error handler wrapper for Express routes
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: 'Not Found',
  });
}

export default {
  errorHandler,
  asyncHandler,
  notFoundHandler,
};
