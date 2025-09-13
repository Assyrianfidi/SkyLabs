// server/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
function verifyToken(token) {
  if (!token) {
    throw new Error('No token provided');
  }

  // Remove 'Bearer ' prefix if present
  const tokenValue = token.startsWith('Bearer ') ? token.slice(7) : token;
  
  return jwt.verify(tokenValue, process.env.JWT_SECRET, {
    issuer: process.env.JWT_ISSUER || 'skylabs-api'
  });
}

/**
 * Middleware to authenticate requests using JWT
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export function authenticate(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        success: false, 
        error: 'No authorization token provided' 
      });
    }

    // Verify token and attach user to request
    const decoded = verifyToken(authHeader);
    req.user = decoded;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    
    // Handle different types of errors
    if (error.message.includes('expired')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Token has expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.message.includes('invalid') || error.message.includes('malformed')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    
    res.status(401).json({ 
      success: false, 
      error: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
  }
}

/**
 * Middleware to check if user has required roles
 * @param {string[]} roles - Array of allowed roles
 * @returns {Function} Middleware function
 */
export function authorize(roles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
}

