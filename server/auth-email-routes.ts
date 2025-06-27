/**
 * Authentication Email Routes
 * Handles email verification and password reset functionality
 */

import express, { Request, Response } from "express";
import { z } from "zod";
import crypto from "crypto";
import asyncHandler from "express-async-handler";
import { storage } from "./storage";
import { mailerSendService } from "./mailersend-service";
import { hashPassword } from "./auth";
import { sendSuccess, sendError } from "./api-response";
import { logger } from "./logger";
import { validateRequest } from "./middlewares/validation-middleware";

const router = express.Router();

// Email verification token storage (in production, use Redis or database)
interface VerificationToken {
  userId: number;
  email: string;
  token: string;
  createdAt: Date;
  expiresAt: Date;
}

interface PasswordResetToken {
  userId: number;
  email: string;
  token: string;
  createdAt: Date;
  expiresAt: Date;
}

// In-memory storage for tokens (should be replaced with database/Redis in production)
const verificationTokens = new Map<string, VerificationToken>();
const passwordResetTokens = new Map<string, PasswordResetToken>();

// Clean up expired tokens periodically
setInterval(() => {
  const now = new Date();
  
  // Clean verification tokens
  for (const [token, data] of verificationTokens.entries()) {
    if (data.expiresAt < now) {
      verificationTokens.delete(token);
    }
  }
  
  // Clean password reset tokens
  for (const [token, data] of passwordResetTokens.entries()) {
    if (data.expiresAt < now) {
      passwordResetTokens.delete(token);
    }
  }
}, 60 * 60 * 1000); // Clean every hour

// Validation schemas
const emailVerificationRequestSchema = z.object({
  email: z.string().email("Invalid email address")
});

const emailVerificationSchema = z.object({
  token: z.string().min(1, "Verification token is required")
});

const passwordResetRequestSchema = z.object({
  email: z.string().email("Invalid email address")
});

const passwordResetSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Password confirmation is required")
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

/**
 * Request email verification
 * POST /api/auth/request-verification
 */
router.post("/request-verification", 
  validateRequest(emailVerificationRequestSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    try {
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists for security
        return sendSuccess(res, null, "If an account with this email exists, a verification email has been sent.");
      }

      // Check if user is already verified (assuming we have an isEmailVerified field)
      // For now, we'll assume all users need verification on request
      
      // Generate verification token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Store token
      verificationTokens.set(token, {
        userId: user.id,
        email: user.email,
        token,
        createdAt: new Date(),
        expiresAt
      });

      // Send verification email
      const emailSent = await mailerSendService.sendAccountVerificationEmail(
        {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.fullName ? user.fullName.split(' ')[0] : undefined
        },
        token
      );

      if (!emailSent) {
        logger.error('Failed to send verification email', { userId: user.id, email });
        return sendError(res, "Failed to send verification email. Please try again later.", 500);
      }

      logger.info('Verification email sent', { userId: user.id, email });
      return sendSuccess(res, null, "Verification email sent successfully.");

    } catch (error) {
      logger.error('Error in email verification request', { email, error });
      return sendError(res, "An error occurred. Please try again later.", 500);
    }
  })
);

/**
 * Verify email with token
 * POST /api/auth/verify-email
 */
router.post("/verify-email",
  validateRequest(emailVerificationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;

    try {
      // Find token
      const tokenData = verificationTokens.get(token);
      if (!tokenData) {
        return sendError(res, "Invalid or expired verification token.", 400);
      }

      // Check if token is expired
      if (tokenData.expiresAt < new Date()) {
        verificationTokens.delete(token);
        return sendError(res, "Verification token has expired. Please request a new one.", 400);
      }

      // Find user
      const user = await storage.getUserByEmail(tokenData.email);
      if (!user) {
        verificationTokens.delete(token);
        return sendError(res, "User not found.", 404);
      }

      // Mark user as verified (assuming we have an isEmailVerified field)
      // For now, we'll just update the user as active
      await storage.updateUser(user.id, { isActive: true });

      // Remove used token
      verificationTokens.delete(token);

      logger.info('Email verified successfully', { userId: user.id, email: user.email });
      return sendSuccess(res, null, "Email verified successfully! Your account is now active.");

    } catch (error) {
      logger.error('Error in email verification', { token, error });
      return sendError(res, "An error occurred during verification. Please try again.", 500);
    }
  })
);

/**
 * Request password reset
 * POST /api/auth/forgot-password
 */
router.post("/forgot-password",
  validateRequest(passwordResetRequestSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    try {
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists for security
        return sendSuccess(res, null, "If an account with this email exists, a password reset email has been sent.");
      }

      // Generate reset token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store token
      passwordResetTokens.set(token, {
        userId: user.id,
        email: user.email,
        token,
        createdAt: new Date(),
        expiresAt
      });

      // Send password reset email
      const emailSent = await mailerSendService.sendPasswordResetEmail(
        {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.fullName ? user.fullName.split(' ')[0] : undefined
        },
        token
      );

      if (!emailSent) {
        logger.error('Failed to send password reset email', { userId: user.id, email });
        return sendError(res, "Failed to send password reset email. Please try again later.", 500);
      }

      logger.info('Password reset email sent', { userId: user.id, email });
      return sendSuccess(res, null, "Password reset email sent successfully.");

    } catch (error) {
      logger.error('Error in password reset request', { email, error });
      return sendError(res, "An error occurred. Please try again later.", 500);
    }
  })
);

/**
 * Reset password with token
 * POST /api/auth/reset-password
 */
router.post("/reset-password",
  validateRequest(passwordResetSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { token, password } = req.body;

    try {
      // Find token
      const tokenData = passwordResetTokens.get(token);
      if (!tokenData) {
        return sendError(res, "Invalid or expired reset token.", 400);
      }

      // Check if token is expired
      if (tokenData.expiresAt < new Date()) {
        passwordResetTokens.delete(token);
        return sendError(res, "Reset token has expired. Please request a new password reset.", 400);
      }

      // Find user
      const user = await storage.getUserByEmail(tokenData.email);
      if (!user) {
        passwordResetTokens.delete(token);
        return sendError(res, "User not found.", 404);
      }

      // Hash new password
      const hashedPassword = await hashPassword(password);

      // Update user password
      await storage.updateUser(user.id, { password: hashedPassword });

      // Remove used token
      passwordResetTokens.delete(token);

      logger.info('Password reset successfully', { userId: user.id, email: user.email });
      return sendSuccess(res, null, "Password reset successfully! You can now log in with your new password.");

    } catch (error) {
      logger.error('Error in password reset', { token, error });
      return sendError(res, "An error occurred during password reset. Please try again.", 500);
    }
  })
);

/**
 * Get verification status for debugging (admin only)
 * GET /api/auth/verification-status
 */
router.get("/verification-status", asyncHandler(async (req: Request, res: Response) => {
  // This is for debugging - in production, add admin middleware
  const stats = {
    activeVerificationTokens: verificationTokens.size,
    activePasswordResetTokens: passwordResetTokens.size,
    mailerSendConfigured: mailerSendService.isReady()
  };

  return sendSuccess(res, stats, "Verification system status");
}));

export { router as authEmailRoutes };