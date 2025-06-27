import express, { Request, Response } from "express";
import { z } from "zod";
import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "@shared/schema";
import { unifiedEmailService } from "./unified-email-service";
import { sendSuccess, sendError } from "./api-response";

const router = express.Router();

// Password Reset Request
router.post('/forgot-password', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { email } = z.object({
      email: z.string().email()
    }).parse(req.body);

    console.log(`🔄 Processing password reset request for: ${email}`);

    // Find user by email
    const user = await db.select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (user.length === 0) {
      console.log(`⚠️ User not found for email: ${email}`);
      return sendSuccess(res, { message: "If an account with that email exists, a password reset link has been sent." });
    }

    const foundUser = user[0];
    console.log(`✅ User found: ${foundUser.username} (ID: ${foundUser.id})`);

    // Create password reset token
    const { token } = await unifiedEmailService.createPasswordResetToken(foundUser.id, email);
    console.log(`🔑 Password reset token created for user: ${foundUser.id}`);

    // Send password reset email using your existing HTML template
    const result = await unifiedEmailService.sendPasswordResetEmail(email, token, foundUser.username);

    if (result.success) {
      console.log(`✅ Password reset email sent successfully to: ${email}`);
      return sendSuccess(res, { 
        message: "If an account with that email exists, a password reset link has been sent.",
        debugInfo: { emailSent: true, token: token.substring(0, 8) + "..." } 
      });
    } else {
      console.error(`❌ Failed to send password reset email to: ${email}`, result.error);
      return sendError(res, "Failed to send password reset email", 500);
    }

  } catch (error: any) {
    console.error('❌ Error in password reset request:', error);
    return sendError(res, "An error occurred. Please try again later.", 500);
  }
}));

// Password Reset Verification
router.post('/reset-password', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = z.object({
      token: z.string(),
      newPassword: z.string().min(6)
    }).parse(req.body);

    console.log(`🔄 Processing password reset with token: ${token.substring(0, 8)}...`);

    // Validate token
    const validation = await unifiedEmailService.validatePasswordResetToken(token);

    if (!validation.valid) {
      console.log(`❌ Invalid token: ${validation.error}`);
      return sendError(res, validation.error || "Invalid or expired token", 400);
    }

    console.log(`✅ Token validated for user ID: ${validation.userId}`);

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    await db.update(users)
      .set({ 
        password: hashedPassword,
        updatedAt: new Date().toISOString()
      })
      .where(eq(users.id, validation.userId!));

    // Mark token as used
    await unifiedEmailService.markTokenAsUsed(token);

    console.log(`✅ Password updated successfully for user ID: ${validation.userId}`);

    return sendSuccess(res, { message: "Password has been reset successfully. You can now login with your new password." });

  } catch (error: any) {
    console.error('❌ Error in password reset:', error);
    return sendError(res, "An error occurred. Please try again later.", 500);
  }
}));

// Test endpoint for debugging
router.get('/test-email', asyncHandler(async (req: Request, res: Response) => {
  try {
    const testEmail = 'admin@teemeyou.shop';
    
    // Find user
    const user = await db.select()
      .from(users)
      .where(eq(users.email, testEmail))
      .limit(1);

    if (user.length === 0) {
      return sendError(res, "Test user not found", 404);
    }

    const foundUser = user[0];
    
    // Create test token
    const { token } = await unifiedEmailService.createPasswordResetToken(foundUser.id, testEmail);
    
    // Send test email
    const result = await unifiedEmailService.sendPasswordResetEmail(testEmail, token, foundUser.username);
    
    return sendSuccess(res, { 
      message: "Test email sent",
      result,
      token: token.substring(0, 8) + "..."
    });

  } catch (error: any) {
    console.error('❌ Error in test email:', error);
    return sendError(res, "Test email failed", 500);
  }
}));

export default router;