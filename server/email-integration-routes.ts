/**
 * Email Integration Routes
 * Simple implementation for authentication emails without complex validation
 */

import express, { Request, Response } from "express";
import crypto from "crypto";
import asyncHandler from "express-async-handler";
import { storage } from "./storage";
import { unifiedEmailService } from "./unified-email-service";
import { hashPassword } from "./auth";
import { sendSuccess, sendError } from "./api-response";
import { logger } from "./logger";

const router = express.Router();

// In-memory token storage (replace with database in production)
const verificationTokens = new Map<string, {
  userId: number;
  email: string;
  token: string;
  createdAt: Date;
  expiresAt: Date;
}>();

const passwordResetTokens = new Map<string, {
  userId: number;
  email: string;
  token: string;
  createdAt: Date;
  expiresAt: Date;
}>();

// Clean up expired tokens periodically
setInterval(() => {
  const now = new Date();
  
  // Clean verification tokens
  const verificationEntries = Array.from(verificationTokens.entries());
  for (const [token, data] of verificationEntries) {
    if (data.expiresAt < now) {
      verificationTokens.delete(token);
    }
  }
  
  // Clean password reset tokens
  const resetEntries = Array.from(passwordResetTokens.entries());
  for (const [token, data] of resetEntries) {
    if (data.expiresAt < now) {
      passwordResetTokens.delete(token);
    }
  }
}, 60 * 60 * 1000); // Clean every hour

/**
 * Request email verification
 */
router.post("/request-verification", asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    return sendError(res, "Email is required", 400);
  }

  try {
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return sendSuccess(res, null, "If an account with this email exists, a verification email has been sent.");
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    verificationTokens.set(token, {
      userId: user.id,
      email: user.email,
      token,
      createdAt: new Date(),
      expiresAt
    });

    const emailSent = await unifiedEmailService.sendAccountVerificationEmail(
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
}));

/**
 * Verify email with token
 */
router.post("/verify-email", asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token || typeof token !== 'string') {
    return sendError(res, "Verification token is required", 400);
  }

  try {
    const tokenData = verificationTokens.get(token);
    if (!tokenData) {
      return sendError(res, "Invalid or expired verification token.", 400);
    }

    if (tokenData.expiresAt < new Date()) {
      verificationTokens.delete(token);
      return sendError(res, "Verification token has expired. Please request a new one.", 400);
    }

    const user = await storage.getUserByEmail(tokenData.email);
    if (!user) {
      verificationTokens.delete(token);
      return sendError(res, "User not found.", 404);
    }

    await storage.updateUser(user.id, { isActive: true });
    verificationTokens.delete(token);

    logger.info('Email verified successfully', { userId: user.id, email: user.email });
    return sendSuccess(res, null, "Email verified successfully! Your account is now active.");

  } catch (error) {
    logger.error('Error in email verification', { token, error });
    return sendError(res, "An error occurred during verification. Please try again.", 500);
  }
}));

/**
 * Request password reset
 */
router.post("/forgot-password", asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    return sendError(res, "Email is required", 400);
  }

  try {
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return sendSuccess(res, null, "If an account with this email exists, a password reset email has been sent.");
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    passwordResetTokens.set(token, {
      userId: user.id,
      email: user.email,
      token,
      createdAt: new Date(),
      expiresAt
    });

    const emailSent = await unifiedEmailService.sendPasswordResetEmail(
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
}));

/**
 * Reset password with token
 */
router.post("/reset-password", asyncHandler(async (req: Request, res: Response) => {
  const { token, password, confirmPassword } = req.body;

  if (!token || typeof token !== 'string') {
    return sendError(res, "Reset token is required", 400);
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    return sendError(res, "Password must be at least 8 characters", 400);
  }

  if (password !== confirmPassword) {
    return sendError(res, "Passwords don't match", 400);
  }

  try {
    const tokenData = passwordResetTokens.get(token);
    if (!tokenData) {
      return sendError(res, "Invalid or expired reset token.", 400);
    }

    if (tokenData.expiresAt < new Date()) {
      passwordResetTokens.delete(token);
      return sendError(res, "Reset token has expired. Please request a new password reset.", 400);
    }

    const user = await storage.getUserByEmail(tokenData.email);
    if (!user) {
      passwordResetTokens.delete(token);
      return sendError(res, "User not found.", 404);
    }

    const hashedPassword = await hashPassword(password);
    await storage.updateUser(user.id, { password: hashedPassword });
    passwordResetTokens.delete(token);

    logger.info('Password reset successfully', { userId: user.id, email: user.email });
    return sendSuccess(res, null, "Password reset successfully! You can now log in with your new password.");

  } catch (error) {
    logger.error('Error in password reset', { token, error });
    return sendError(res, "An error occurred during password reset. Please try again.", 500);
  }
}));

/**
 * Test email service status
 */
router.get("/email-status", asyncHandler(async (req: Request, res: Response) => {
  const stats = {
    activeVerificationTokens: verificationTokens.size,
    activePasswordResetTokens: passwordResetTokens.size,
    mailerSendConfigured: unifiedEmailService.isReady()
  };

  return sendSuccess(res, stats, "Email system status");
}));

export { router as emailIntegrationRoutes };