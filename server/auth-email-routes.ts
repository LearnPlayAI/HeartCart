/**
 * Authentication Email Routes - Database-Driven Version
 * Handles email verification and password reset functionality
 * Uses PostgreSQL database for token storage instead of memory
 */

import express, { Request, Response } from "express";
import { z } from "zod";
import asyncHandler from "express-async-handler";
import { storage } from "./storage";
import { databaseEmailService } from "./database-email-service";
import { hashPassword } from "./auth";
import { sendSuccess, sendError } from "./api-response";
import { logger } from "./logger";

const router = express.Router();

// Clean up expired tokens periodically using database storage
setInterval(async () => {
  try {
    await databaseEmailService.cleanupExpiredTokens();
  } catch (error) {
    logger.error('Error during scheduled token cleanup', { error });
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

// Validation schemas
const emailSchema = z.object({
  email: z.string().email("Invalid email format"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

/**
 * Send email verification
 * POST /api/auth/send-verification
 */
router.post('/send-verification', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { email } = emailSchema.parse(req.body);
    
    logger.info('Email verification request received', { email });

    // Check if user exists
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return sendError(res, 'User not found with this email address', 404);
    }

    // Check if user is already verified (assuming we track this via a separate field or check tokens)
    // For now, we'll proceed with sending verification email
    
    // Send verification email using database service
    await databaseEmailService.sendVerificationEmail(user.id, email, user.username);

    logger.info('Verification email sent successfully', { email, userId: user.id });

    sendSuccess(res, null, 'Verification email sent successfully');
  } catch (error) {
    logger.error('Error sending verification email', { error, body: req.body });
    
    if (error instanceof z.ZodError) {
      return sendError(res, error.errors[0].message, 400);
    }
    
    sendError(res, 'Failed to send verification email', 500);
  }
}));

/**
 * Verify email with token
 * POST /api/auth/verify-email
 */
router.post('/verify-email', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { token } = verifyEmailSchema.parse(req.body);
    
    logger.info('Email verification attempt', { token: token.substring(0, 10) + '...' });

    // Verify token using database service
    const tokenResult = await databaseEmailService.verifyToken(token, 'verification');
    
    if (!tokenResult.valid || !tokenResult.userId) {
      return sendError(res, 'Invalid or expired verification token', 400);
    }

    // Mark token as used (one-time use)
    await databaseEmailService.useToken(token);

    logger.info('Email verified successfully', { 
      userId: tokenResult.userId, 
      email: tokenResult.email 
    });

    sendSuccess(res, { verified: true }, 'Email verified successfully');
  } catch (error) {
    logger.error('Error verifying email', { error, body: req.body });
    
    if (error instanceof z.ZodError) {
      return sendError(res, error.errors[0].message, 400);
    }
    
    sendError(res, 'Failed to verify email', 500);
  }
}));

/**
 * Send password reset email
 * POST /api/auth/forgot-password
 */
router.post('/forgot-password', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { email } = emailSchema.parse(req.body);
    
    logger.info('Password reset request received', { email });

    // Check if user exists
    const user = await storage.getUserByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not for security
      return sendSuccess(res, null, 'If the email exists, a password reset link has been sent');
    }

    // Send password reset email using database service
    await databaseEmailService.sendPasswordResetEmail(user.id, email, user.username);

    logger.info('Password reset email sent successfully', { email, userId: user.id });

    sendSuccess(res, null, 'If the email exists, a password reset link has been sent');
  } catch (error) {
    logger.error('Error sending password reset email', { error, body: req.body });
    
    if (error instanceof z.ZodError) {
      return sendError(res, error.errors[0].message, 400);
    }
    
    sendError(res, 'Failed to process password reset request', 500);
  }
}));

/**
 * Reset password with token
 * POST /api/auth/reset-password
 */
router.post('/reset-password', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);
    
    logger.info('Password reset attempt', { token: token.substring(0, 10) + '...' });

    // Verify token using database service
    const tokenResult = await databaseEmailService.verifyToken(token, 'password_reset');
    
    if (!tokenResult.valid || !tokenResult.userId) {
      return sendError(res, 'Invalid or expired reset token', 400);
    }

    // Mark token as used (one-time use)
    await databaseEmailService.useToken(token);

    // Update user password
    const hashedPassword = await hashPassword(newPassword);
    await storage.updateUser(tokenResult.userId, { password: hashedPassword });

    logger.info('Password reset successfully', { 
      userId: tokenResult.userId, 
      email: tokenResult.email 
    });

    sendSuccess(res, { reset: true }, 'Password reset successfully');
  } catch (error) {
    logger.error('Error resetting password', { error, body: req.body });
    
    if (error instanceof z.ZodError) {
      return sendError(res, error.errors[0].message, 400);
    }
    
    sendError(res, 'Failed to reset password', 500);
  }
}));

/**
 * Validate reset token (for frontend form display)
 * GET /api/auth/validate-reset-token/:token
 */
router.get('/validate-reset-token/:token', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return sendError(res, 'Token is required', 400);
    }

    // Verify token using database service
    const tokenResult = await databaseEmailService.verifyToken(token, 'password_reset');
    
    if (!tokenResult.valid) {
      return sendError(res, 'Invalid or expired reset token', 400);
    }

    sendSuccess(res, { 
      valid: true, 
      email: tokenResult.email 
    }, 'Token is valid');
  } catch (error) {
    logger.error('Error validating reset token', { error, token: req.params.token });
    sendError(res, 'Invalid token', 400);
  }
}));

/**
 * Validate verification token (for frontend form display)
 * GET /api/auth/validate-verification-token/:token
 */
router.get('/validate-verification-token/:token', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return sendError(res, 'Token is required', 400);
    }

    // Verify token using database service
    const tokenResult = await databaseEmailService.verifyToken(token, 'verification');
    
    if (!tokenResult.valid) {
      return sendError(res, 'Invalid or expired verification token', 400);
    }

    sendSuccess(res, { 
      valid: true, 
      email: tokenResult.email 
    }, 'Token is valid');
  } catch (error) {
    logger.error('Error validating verification token', { error, token: req.params.token });
    sendError(res, 'Invalid token', 400);
  }
}));

export default router;