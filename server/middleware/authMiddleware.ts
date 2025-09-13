import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// Extend the Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        userId: string;
        username: string;
        email: string;
        role?: string;
        [key: string]: any;
      };
    }
  }
}

/**
 * Verify JWT token
 * @param token - JWT token to verify
 * @returns Decoded token payload
 */
function verifyToken(token: string): any {
  if (!token) {
    throw new Error('No token provided');
  }

  try {
    // Remove 'Bearer ' prefix if present
    const tokenValue = token.startsWith('Bearer ') ? token.slice(7) : token;
    
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }
    
    const decoded = jwt.verify(tokenValue, secret, {
      issuer: process.env.JWT_ISSUER || 'skylabs-api'
    });
    
    if (!decoded || typeof decoded !== 'object') {
      throw new Error('Invalid token payload');
    }
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error; // Re-throw other errors
  }
}

/**
 * Middleware to authenticate requests using JWT
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({ 
        success: false, 
        error: 'No authorization token provided' 
      });
      return;
    }

    // Verify token and attach user to request
    const decoded = verifyToken(authHeader);
    
    // Ensure required fields are present
    if (!decoded.userId || !decoded.email) {
      throw new Error('Invalid token payload');
    }
    
    req.user = {
      id: decoded.userId, // Map userId to id for consistency
      userId: decoded.userId,
      username: decoded.username || '',
      email: decoded.email,
      role: decoded.role || 'user',
      ...decoded // Include any additional fields
    };
    
    // Continue to the next middleware/route handler
    next();
    return;
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ 
        success: false, 
        error: 'Token has expired' 
      });
      return;
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ 
        success: false, 
        error: 'Invalid token' 
      });
      return;
    }
    
    // Handle other types of errors
    if (error instanceof Error) {
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Authentication failed' 
      });
      return;
    }
    
    // Fallback for unknown error types
    res.status(500).json({ 
      success: false, 
      error: 'Authentication failed due to an unknown error' 
    });
    return;
  }
}

/**
 * Middleware to check if user has required roles
 * @param roles - Array of allowed roles
 * @returns Middleware function
 */
export function authorize(roles: string[] = []) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Not authenticated' 
      });
    }

    if (roles.length > 0 && !roles.includes(req.user.role || '')) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to access this resource' 
      });
    }

    // Call next() to continue to the next middleware/route handler
    return next();
  };
}

export default {
  authenticate,
  authorize
};
