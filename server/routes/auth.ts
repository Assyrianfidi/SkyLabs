import { Router, Request, Response } from 'express';
// Import with .js extensions for ES modules
import { loginUser } from '../services/auth/login.js';
import { signupUser } from '../services/auth/signup.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// Extend Express Request type to include user
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

// Type definitions for request bodies
interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  asyncHandler(async (req: Request<{}, {}, RegisterRequest>, res: Response) => {
    const { username, email, password } = req.body;

    // Input validation
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide username, email, and password',
      });
    }

    try {
      const user = await signupUser({ username, email, password });
      
      return res.status(201).json({
        success: true,
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.created_at,
        },
      });
    } catch (error: unknown) {
      const err = error as Error;
      if (err.message.includes('already exists')) {
        return res.status(400).json({
          success: false,
          error: 'User with this email or username already exists',
        });
      }
      // Re-throw the error to be handled by the global error handler
      throw error;
    }
  })
);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
router.post(
  '/login',
  asyncHandler(async (req: Request<{}, {}, LoginRequest>, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email and password',
      });
    }

    try {
      const { user, token, expiresIn } = await loginUser(email, password);
      
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: expiresIn * 1000, // Convert to milliseconds
      });

      return res.json({
        success: true,
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          token,
          expiresIn,
        },
      });
    } catch (error: unknown) {
      const err = error as Error;
      
      if (err.message.includes('Invalid credentials')) {
        const match = err.message.match(/(\d+)/);
        if (match) {
          return res.status(401).json({
            success: false,
            error: err.message,
            code: 'INVALID_CREDENTIALS',
            remainingAttempts: parseInt(match[0], 10)
          });
        }
        
        return res.status(401).json({
          success: false,
          error: err.message,
          code: 'INVALID_CREDENTIALS',
        });
      }
      
      // Forward other errors to the error handler
      throw error;
    }
  })
);

/**
 * @route   GET /api/auth/check-auth
 * @desc    Get current user data
 * @access  Private
 */
router.get(
  '/check-auth',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    // User data is attached to req.user by the authenticate middleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
    }
    
    const { id, username, email, role } = req.user;
    
    return res.json({
      success: true,
      data: {
        id,
        username,
        email,
        role,
      },
    });
  })
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (clear token)
 * @access  Private
 */
router.post(
  '/logout',
  authenticate,
  // Use _req to indicate the parameter is intentionally unused
  asyncHandler(async (_req: Request, res: Response) => {
    // Clear the token cookie
    res.clearCookie('token');
    
    return res.json({
      success: true,
      message: 'Logout successful',
    });
  })
);

export default router;
