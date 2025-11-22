/**
 * Authentication Routes
 * 
 * Provides REST API endpoints for:
 * - POST /api/auth/register - Register new user
 * - POST /api/auth/login - Login with email/password
 * - POST /api/auth/logout - Logout (clear session)
 * - GET /api/auth/me - Get current user info
 */

import { Router, Request, Response } from 'express';
import * as db from '../db';
import {
  hashPassword,
  comparePassword,
  generateToken,
  generateUserId,
  isValidEmail,
  validatePassword,
  verifyToken,
  extractTokenFromHeader,
} from './auth-utils';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * POST /api/auth/register
 * Register new user with email/password
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: passwordValidation.error,
      });
    }

    // Check if user already exists
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists',
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate user ID
    const userId = generateUserId();

    // Create user in database
    await db.upsertUser({
      id: userId,
      email,
      passwordHash,
      name: name || null,
      loginMethod: 'email',
      role: 'user',
      isVerified: 1,
      createdAt: new Date(),
      lastSignedIn: new Date(),
    });

    // Create initial credits for new user (100 free credits)
    await db.upsertUserCredits(userId, 100);

    // Generate JWT token
    const token = generateToken({ userId, email });

    // Get user data (without password hash)
    const user = await db.getUserByEmail(email);
    const { passwordHash: _, ...userWithoutPassword } = user!;

    return res.status(201).json({
      success: true,
      user: userWithoutPassword,
      token,
    });
  } catch (error) {
    console.error('[Auth] Register error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/auth/login
 * Login with email/password
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    // Find user by email
    const user = await db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Check if user has password hash (email/password login)
    if (!user.passwordHash) {
      return res.status(401).json({
        success: false,
        error: 'This account uses OAuth login. Please use Google Sign In.',
      });
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Update last login time
    await db.upsertUser({
      id: user.id,
      email: user.email,
      lastSignedIn: new Date(),
    });

    // Generate JWT token
    const token = generateToken({ userId: user.id, email: user.email });

    // Return user data (without password hash)
    const { passwordHash: _, ...userWithoutPassword } = user;

    return res.status(200).json({
      success: true,
      user: userWithoutPassword,
      token,
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout (client-side token removal)
 */
router.post('/logout', async (req: Request, res: Response) => {
  // For JWT-based auth, logout is handled client-side by removing the token
  // This endpoint is here for consistency and future enhancements (e.g., token blacklist)
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * GET /api/auth/me
 * Get current user info from JWT token
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    // Extract token from Authorization header
    const token = extractTokenFromHeader(req.headers.authorization);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No authorization token provided',
      });
    }

    // Verify token
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }

    // Get user from database
    const user = await db.getUserByEmail(payload.email);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Return user data (without password hash)
    const { passwordHash: _, ...userWithoutPassword } = user;

    return res.status(200).json({
      success: true,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('[Auth] Get user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
