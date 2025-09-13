// server/services/auth/jwt.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_ISSUER = process.env.JWT_ISSUER || 'skylabs-api';

/**
 * Generate a JWT token for the given user
 * @param {Object} user - User object containing at least id and email
 * @returns {string} JWT token
 */
export function generateToken(user) {
  if (!user || !user.id || !user.email) {
    throw new Error('User object must contain id and email');
  }

  const payload = {
    sub: user.id,
    email: user.email,
    username: user.username,
    iat: Math.floor(Date.now() / 1000),
    iss: JWT_ISSUER
  };

  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRES_IN 
  });
}

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
export function verifyToken(token) {
  if (!token) {
    throw new Error('No token provided');
  }

  // Remove 'Bearer ' prefix if present
  const tokenValue = token.startsWith('Bearer ') ? token.split(' ')[1] : token;

  try {
    return jwt.verify(tokenValue, JWT_SECRET, {
      issuer: JWT_ISSUER
    });
  } catch (error) {
    // Provide more specific error messages
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else {
      throw new Error('Failed to verify token');
    }
  }
}

export default {
  generateToken,
  verifyToken
};
