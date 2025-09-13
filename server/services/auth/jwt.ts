import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from 'dotenv';

// Load environment variables
config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

if (!JWT_SECRET || JWT_SECRET === 'your-secret-key') {
  console.warn('⚠️  WARNING: Using default JWT secret. This is not secure for production!');
}

export interface TokenPayload extends jwt.JwtPayload {
  userId: string;
  email: string;
  [key: string]: any;
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(user: { id: string; email: string; [key: string]: any }): { token: string; expiresIn: number } {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    // Add any additional user data you want to include in the token
  };

  // Calculate expiration time in seconds
  const expiresIn = typeof JWT_EXPIRES_IN === 'string' && JWT_EXPIRES_IN.endsWith('d')
    ? parseInt(JWT_EXPIRES_IN) * 24 * 60 * 60 // Convert days to seconds
    : 3600; // Default to 1 hour in seconds

  const signOptions: SignOptions = {
    expiresIn: expiresIn, // Use the calculated expiresIn in seconds
    issuer: 'skylabs-auth',
  };

  const token = jwt.sign(payload, JWT_SECRET, signOptions);
  return { token, expiresIn };
}

/**
 * Verify a JWT token
 */
export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, JWT_SECRET, { issuer: 'skylabs-auth' }) as TokenPayload;
  } catch (error: unknown) {
    const jwtError = error as jwt.VerifyErrors & { name: string };
    
    if (jwtError.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    }
    
    if (jwtError.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    
    throw new Error('Failed to verify token');
  }
}

export default {
  generateToken,
  verifyToken,
};
