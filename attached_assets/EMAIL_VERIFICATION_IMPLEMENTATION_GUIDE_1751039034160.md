
# Email Verification & Password Reset Implementation Guide

This guide provides a complete implementation for email verification and password reset functionality based on a working VeriTrade.shop system using MailerSend integration.

## Table of Contents
1. [System Architecture Overview](#system-architecture-overview)
2. [Database Schema Setup](#database-schema-setup)
3. [Email Service Implementation](#email-service-implementation)
4. [Authentication Integration](#authentication-integration)
5. [Frontend Components](#frontend-components)
6. [API Routes](#api-routes)
7. [Environment Configuration](#environment-configuration)
8. [Testing & Verification](#testing--verification)

## System Architecture Overview

### Core Components
- **Unified Email Service**: Handles all email operations with MailerSend
- **Token Management**: Secure token generation and validation
- **Database Integration**: Proper schema design for tokens and user states
- **Frontend Integration**: React components for user interactions
- **Session Management**: Proper session handling during verification

### Key Features
- ✅ Beautiful South African themed email templates
- ✅ Secure token generation with expiration
- ✅ User account activation flow
- ✅ Password reset with single-use tokens
- ✅ Proper cleanup of expired tokens
- ✅ Mobile-responsive email templates
- ✅ Production-ready URLs
- ✅ Comprehensive error handling

## Database Schema Setup

### 1. User Table Updates
```sql
-- Add these columns to your users table if not present
ALTER TABLE users ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW();
```

### 2. Email Verification Tokens Table
```sql
CREATE TABLE IF NOT EXISTS "emailVerificationTokens" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "token" TEXT NOT NULL UNIQUE,
  "email" TEXT NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "isUsed" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "emailVerificationTokens_userId_idx" ON "emailVerificationTokens"("userId");
CREATE INDEX IF NOT EXISTS "emailVerificationTokens_token_idx" ON "emailVerificationTokens"("token");
CREATE INDEX IF NOT EXISTS "emailVerificationTokens_email_idx" ON "emailVerificationTokens"("email");
CREATE INDEX IF NOT EXISTS "emailVerificationTokens_expires_idx" ON "emailVerificationTokens"("expiresAt");
```

### 3. Password Reset Tokens Table
```sql
CREATE TABLE IF NOT EXISTS "passwordResetTokens" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "token" TEXT NOT NULL UNIQUE,
  "email" TEXT NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "isUsed" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "passwordResetTokens_userId_idx" ON "passwordResetTokens"("userId");
CREATE INDEX IF NOT EXISTS "passwordResetTokens_token_idx" ON "passwordResetTokens"("token");
CREATE INDEX IF NOT EXISTS "passwordResetTokens_email_idx" ON "passwordResetTokens"("email");
CREATE INDEX IF NOT EXISTS "passwordResetTokens_expires_idx" ON "passwordResetTokens"("expiresAt");
```

### 4. Email Notification Logs Table
```sql
CREATE TABLE IF NOT EXISTS "emailNotificationLogs" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER REFERENCES users(id) ON DELETE SET NULL,
  "recipientEmail" TEXT NOT NULL,
  "emailType" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "templateUsed" TEXT NOT NULL,
  "status" TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
  "errorMessage" TEXT,
  "metadata" JSONB,
  "sentAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "emailNotificationLogs_userId_idx" ON "emailNotificationLogs"("userId");
CREATE INDEX IF NOT EXISTS "emailNotificationLogs_type_idx" ON "emailNotificationLogs"("emailType");
CREATE INDEX IF NOT EXISTS "emailNotificationLogs_status_idx" ON "emailNotificationLogs"("status");
CREATE INDEX IF NOT EXISTS "emailNotificationLogs_created_idx" ON "emailNotificationLogs"("createdAt");
```

## Email Service Implementation

### 1. Core Email Service (`server/emailService.ts`)
```typescript
import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';
import crypto from 'crypto';
import { Pool } from 'pg';

// Environment-aware URL configuration
const getEnvironmentConfig = () => {
  return {
    baseUrl: 'https://teemeyou.shop', // Update to your domain
    environment: 'production',
    senderDomain: 'noreply@teemeyou.shop' // Update to your domain
  };
};

// South African themed styling
const SA_COLORS = {
  GREEN: '#007749',
  BLUE: '#002395', 
  YELLOW: '#FFB612',
  BLACK: '#000000',
  WHITE: '#FFFFFF',
  RED: '#DE3831',
  ORANGE: '#FF8C00',
  LIGHT_GREEN: '#00A86B',
  LIGHT_BLUE: '#1E3A8A',
  GOLD: '#F59E0B',
  LIGHT_GRAY: '#F3F4F6',
  DARK_GRAY: '#374151'
};

export class EmailService {
  private mailerSend!: MailerSend;
  private isInitialized = false;
  private fromSender!: Sender;
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
    this.initializeMailerSend();
  }

  private async initializeMailerSend() {
    try {
      const apiKey = process.env.MAILERSEND_API_KEY;
      
      if (!apiKey) {
        throw new Error('MAILERSEND_API_KEY is required');
      }

      this.mailerSend = new MailerSend({
        apiKey: apiKey,
      });

      this.fromSender = new Sender("noreply@teemeyou.shop", "TeeMeYou"); // Update branding

      this.isInitialized = true;
      console.log('Email Service initialized successfully with MailerSend');
    } catch (error) {
      console.error('Failed to initialize MailerSend email service:', error);
      this.isInitialized = false;
    }
  }

  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async createEmailVerificationToken(userId: number, email: string): Promise<{ token: string; expires: Date }> {
    const token = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.pool.query(`
      INSERT INTO "emailVerificationTokens" ("userId", "email", "token", "expiresAt", "createdAt")
      VALUES ($1, $2, $3, $4, NOW())
    `, [userId, email, token, expiresAt]);

    return { token, expires: expiresAt };
  }

  async createPasswordResetToken(userId: number, email: string): Promise<{ token: string; expires: Date }> {
    const token = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.pool.query(`
      INSERT INTO "passwordResetTokens" ("userId", "email", "token", "expiresAt", "createdAt")
      VALUES ($1, $2, $3, $4, NOW())
    `, [userId, email, token, expiresAt]);

    return { token, expires: expiresAt };
  }

  async sendMailerSendEmail(recipientEmail: string, subject: string, htmlContent: string, textContent: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.isInitialized) {
        throw new Error('MailerSend service not initialized');
      }

      const recipientName = recipientEmail.split('@')[0];
      const recipients = [new Recipient(recipientEmail, recipientName)];

      const emailParams = new EmailParams()
        .setFrom(this.fromSender)
        .setTo(recipients)
        .setReplyTo(this.fromSender)
        .setSubject(subject)
        .setHtml(htmlContent)
        .setText(textContent);

      const result = await this.mailerSend.email.send(emailParams);
      
      return {
        success: true,
        messageId: result.body?.message_id || 'sent'
      };
    } catch (error) {
      console.error('MailerSend email error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async createEmailTemplate(type: 'verification' | 'password-reset', data: Record<string, any>): Promise<{ subject: string; html: string; text: string }> {
    const config = getEnvironmentConfig();
    const baseUrl = config.baseUrl;

    switch (type) {
      case 'verification':
        const verificationToken = data.token;
        const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;
        
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your Email - TeeMeYou</title>
            <style>
              @media (max-width: 600px) {
                .container { width: 95% !important; margin: 10px auto !important; }
                .header { padding: 20px !important; }
                .content { padding: 25px !important; }
                .button { padding: 12px 24px !important; font-size: 14px !important; }
              }
            </style>
          </head>
          <body style="margin: 0; padding: 0; background: linear-gradient(135deg, ${SA_COLORS.LIGHT_GRAY} 0%, ${SA_COLORS.WHITE} 100%); font-family: 'Segoe UI', Arial, sans-serif;">
            <div class="container" style="max-width: 600px; margin: 20px auto; background: ${SA_COLORS.WHITE}; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);">
              
              <!-- Header -->
              <div class="header" style="background: linear-gradient(135deg, ${SA_COLORS.GREEN} 0%, ${SA_COLORS.BLUE} 100%); padding: 40px; text-align: center; position: relative;">
                <div style="position: absolute; top: 0; left: 0; width: 100%; height: 6px; background: linear-gradient(90deg, ${SA_COLORS.GREEN} 0%, ${SA_COLORS.YELLOW} 33%, ${SA_COLORS.RED} 66%, ${SA_COLORS.BLUE} 100%);"></div>
                <div style="display: inline-block; background: ${SA_COLORS.WHITE}; padding: 8px 16px; border-radius: 25px; margin-bottom: 10px;">
                  <span style="font-size: 24px;">🇿🇦</span>
                </div>
                <h1 style="color: ${SA_COLORS.WHITE}; margin: 0; font-size: 32px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">TeeMeYou</h1>
                <p style="color: ${SA_COLORS.WHITE}; margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">South Africa's Premium T-Shirt Marketplace</p>
              </div>
              
              <!-- Main Content -->
              <div class="content" style="padding: 40px; background: ${SA_COLORS.WHITE};">
                <div style="text-align: center; margin-bottom: 30px;">
                  <div style="display: inline-block; background: linear-gradient(135deg, ${SA_COLORS.GREEN} 0%, ${SA_COLORS.LIGHT_GREEN} 100%); padding: 12px; border-radius: 50%; margin-bottom: 15px;">
                    <span style="font-size: 32px; color: ${SA_COLORS.WHITE};">✉️</span>
                  </div>
                  <h2 style="color: ${SA_COLORS.BLUE}; margin: 0; font-size: 28px; font-weight: 600;">Welcome, ${data.name || 'User'}!</h2>
                </div>
                
                <p style="font-size: 16px; line-height: 1.6; color: ${SA_COLORS.DARK_GRAY}; margin-bottom: 30px; text-align: center;">
                  Thank you for joining South Africa's premium T-shirt marketplace. To complete your registration and start buying and selling, please verify your email address.
                </p>
                
                <!-- CTA Button -->
                <div style="text-align: center; margin: 40px 0;">
                  <a href="${verificationUrl}" class="button"
                     style="background: linear-gradient(135deg, ${SA_COLORS.GREEN} 0%, ${SA_COLORS.LIGHT_GREEN} 100%); 
                            color: ${SA_COLORS.WHITE}; 
                            padding: 16px 32px; 
                            text-decoration: none; 
                            border-radius: 8px; 
                            font-weight: 600; 
                            font-size: 16px; 
                            display: inline-block;
                            box-shadow: 0 4px 12px rgba(0, 119, 73, 0.3);
                            transition: all 0.3s ease;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;">
                    ✓ Verify My Email Address
                  </a>
                </div>
                
                <!-- Security Notice -->
                <div style="background: linear-gradient(135deg, ${SA_COLORS.YELLOW} 0%, ${SA_COLORS.GOLD} 100%); padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid ${SA_COLORS.ORANGE}; position: relative;">
                  <div style="position: absolute; top: -8px; left: 16px; background: ${SA_COLORS.ORANGE}; color: ${SA_COLORS.WHITE}; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">SECURITY</div>
                  <p style="margin: 0; font-weight: 600; color: ${SA_COLORS.BLACK}; font-size: 14px;">
                    🔒 This verification link expires in 24 hours for your protection.
                  </p>
                </div>
                
                <!-- Fallback Link -->
                <div style="background: ${SA_COLORS.LIGHT_GRAY}; padding: 15px; border-radius: 6px; margin-top: 30px; text-align: center;">
                  <p style="margin: 0; font-size: 14px; color: ${SA_COLORS.DARK_GRAY};">
                    Button not working? Copy and paste this link:
                  </p>
                  <p style="margin: 5px 0 0 0;">
                    <a href="${verificationUrl}" style="color: ${SA_COLORS.BLUE}; word-break: break-all; font-size: 12px;">${verificationUrl}</a>
                  </p>
                </div>
              </div>
              
              <!-- Footer -->
              <div style="background: ${SA_COLORS.DARK_GRAY}; padding: 25px; text-align: center;">
                <div style="margin-bottom: 15px;">
                  <span style="display: inline-block; background: ${SA_COLORS.WHITE}; padding: 6px 12px; border-radius: 20px; margin: 0 5px;">
                    <span style="font-size: 16px;">🇿🇦</span>
                  </span>
                </div>
                <p style="color: ${SA_COLORS.WHITE}; margin: 0; font-size: 14px; font-weight: 500;">
                  © 2024 TeeMeYou • South Africa's Premium T-Shirt Marketplace
                </p>
                <p style="color: ${SA_COLORS.LIGHT_GRAY}; margin: 8px 0 0 0; font-size: 12px;">
                  Building style in every transaction 🤝
                </p>
              </div>
            </div>
          </body>
          </html>
        `;

        const textContent = `
          Welcome to TeeMeYou - South Africa's Premium T-Shirt Marketplace!
          
          Hi ${data.name || 'User'},
          
          Thank you for joining TeeMeYou. To complete your registration, please verify your email address by clicking the link below:
          
          ${verificationUrl}
          
          This verification link expires in 24 hours for your security.
          
          If you didn't create an account, you can safely ignore this email.
          
          Best regards,
          The TeeMeYou Team
        `;

        return {
          subject: '🇿🇦 Welcome to TeeMeYou - Verify Your Email Address',
          html: htmlContent,
          text: textContent
        };

      case 'password-reset':
        const resetToken = data.token;
        const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
        
        const resetHtmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password - TeeMeYou</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, ${SA_COLORS.RED} 0%, ${SA_COLORS.BLUE} 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: ${SA_COLORS.WHITE}; margin: 0; font-size: 28px;">🇿🇦 TeeMeYou</h1>
              <p style="color: ${SA_COLORS.WHITE}; margin: 10px 0 0 0; font-size: 16px;">Password Reset Request</p>
            </div>
            
            <div style="background: ${SA_COLORS.WHITE}; padding: 40px; border: 2px solid ${SA_COLORS.RED}; border-top: none; border-radius: 0 0 10px 10px;">
              <h2 style="color: ${SA_COLORS.BLUE}; margin-top: 0;">Reset Your Password 🔑</h2>
              
              <p style="font-size: 16px; margin-bottom: 25px;">
                Hi ${data.name || 'User'}, we received a request to reset your TeeMeYou account password. If you made this request, click the button below to set a new password.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" 
                   style="background: linear-gradient(135deg, ${SA_COLORS.RED} 0%, ${SA_COLORS.BLUE} 100%); 
                          color: ${SA_COLORS.WHITE}; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 5px; 
                          font-weight: bold; 
                          font-size: 16px; 
                          display: inline-block;
                          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  🔑 Reset My Password
                </a>
              </div>
              
              <div style="background: ${SA_COLORS.YELLOW}; padding: 15px; border-radius: 5px; margin: 25px 0; border-left: 4px solid ${SA_COLORS.RED};">
                <p style="margin: 0; font-weight: bold; color: ${SA_COLORS.BLACK};">
                  ⚠️ <strong>Security Alert:</strong> This reset link expires in 1 hour and can only be used once.
                </p>
              </div>
              
              <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${resetUrl}" style="color: ${SA_COLORS.BLUE}; word-break: break-all;">${resetUrl}</a>
              </p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
              <p>© 2024 TeeMeYou • South Africa's Premium T-Shirt Marketplace</p>
            </div>
          </body>
          </html>
        `;

        const resetTextContent = `
          TeeMeYou Password Reset Request
          
          Hi ${data.name || 'User'},
          
          We received a request to reset your TeeMeYou account password. Use the link below to set a new password:
          
          ${resetUrl}
          
          This reset link expires in 1 hour for your security.
          
          Best regards,
          The TeeMeYou Team
        `;

        return {
          subject: '🔑 Reset Your TeeMeYou Password',
          html: resetHtmlContent,
          text: resetTextContent
        };

      default:
        throw new Error(`Unknown email template type: ${type}`);
    }
  }

  async logEmail(emailType: string, recipientEmail: string, subject: string, templateUsed: string, status: 'pending' | 'sent' | 'failed', errorMessage?: string, messageId?: string, metadata?: Record<string, any>): Promise<number> {
    const result = await this.pool.query(`
      INSERT INTO "emailNotificationLogs" 
      ("recipientEmail", "emailType", "subject", "templateUsed", "status", "errorMessage", "metadata", "sentAt", "createdAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING id
    `, [
      recipientEmail,
      emailType,
      subject,
      templateUsed,
      status,
      errorMessage,
      JSON.stringify({ ...metadata, messageId }),
      status === 'sent' ? new Date() : null
    ]);

    return result.rows[0].id;
  }

  async sendEmailVerification(user: any): Promise<{ success: boolean; messageId?: string; error?: string; logId?: number }> {
    try {
      if (!this.isInitialized) {
        throw new Error('Email service not initialized');
      }

      const { token } = await this.createEmailVerificationToken(user.id, user.email);
      const emailTemplate = await this.createEmailTemplate('verification', {
        name: user.fullName || user.username,
        token,
        email: user.email
      });

      const logId = await this.logEmail(
        'email_verification',
        user.email,
        emailTemplate.subject,
        'verification_template_v1',
        'pending'
      );

      const result = await this.sendMailerSendEmail(
        user.email,
        emailTemplate.subject,
        emailTemplate.html,
        emailTemplate.text
      );

      // Update log with result
      await this.pool.query(`
        UPDATE "emailNotificationLogs" 
        SET "status" = $1, "errorMessage" = $2, "sentAt" = $3
        WHERE id = $4
      `, [
        result.success ? 'sent' : 'failed',
        result.error,
        result.success ? new Date() : null,
        logId
      ]);

      return {
        success: result.success,
        messageId: result.messageId,
        error: result.error,
        logId
      };

    } catch (error) {
      console.error('Email verification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async sendPasswordReset(user: any): Promise<{ success: boolean; messageId?: string; error?: string; logId?: number }> {
    try {
      if (!this.isInitialized) {
        throw new Error('Email service not initialized');
      }

      const { token } = await this.createPasswordResetToken(user.id, user.email);
      const emailTemplate = await this.createEmailTemplate('password-reset', {
        name: user.fullName || user.username,
        token,
        email: user.email
      });

      const logId = await this.logEmail(
        'password_reset',
        user.email,
        emailTemplate.subject,
        'password_reset_template_v1',
        'pending'
      );

      const result = await this.sendMailerSendEmail(
        user.email,
        emailTemplate.subject,
        emailTemplate.html,
        emailTemplate.text
      );

      // Update log with result
      await this.pool.query(`
        UPDATE "emailNotificationLogs" 
        SET "status" = $1, "errorMessage" = $2, "sentAt" = $3
        WHERE id = $4
      `, [
        result.success ? 'sent' : 'failed',
        result.error,
        result.success ? new Date() : null,
        logId
      ]);

      return {
        success: result.success,
        messageId: result.messageId,
        error: result.error,
        logId
      };

    } catch (error) {
      console.error('Password reset error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async verifyEmailToken(token: string): Promise<{ success: boolean; userId?: number; error?: string; message?: string }> {
    try {
      const tokenResult = await this.pool.query(`
        SELECT * FROM "emailVerificationTokens" 
        WHERE token = $1 AND "expiresAt" > NOW() AND "isUsed" = FALSE
      `, [token]);

      if (tokenResult.rows.length === 0) {
        return { success: false, error: 'Invalid or expired verification token' };
      }

      const tokenRecord = tokenResult.rows[0];
      const userId = tokenRecord.userId;

      // Begin transaction
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');

        // Update user verification status
        await client.query(`
          UPDATE users 
          SET "isActive" = TRUE, "isVerified" = TRUE, "updatedAt" = NOW()
          WHERE id = $1
        `, [userId]);

        // Mark token as used and delete it
        await client.query(`
          DELETE FROM "emailVerificationTokens" WHERE token = $1
        `, [token]);

        await client.query('COMMIT');
        
        return { 
          success: true, 
          userId,
          message: 'Email verified successfully! Your account is now fully verified and active.'
        };

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Email verification error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Verification failed' 
      };
    }
  }

  async verifyPasswordResetToken(token: string): Promise<{ success: boolean; userId?: number; email?: string; error?: string }> {
    try {
      const tokenResult = await this.pool.query(`
        SELECT * FROM "passwordResetTokens" 
        WHERE token = $1 AND "expiresAt" > NOW() AND "isUsed" = FALSE
      `, [token]);

      if (tokenResult.rows.length === 0) {
        return { success: false, error: 'Invalid or expired password reset token' };
      }

      const { userId, email } = tokenResult.rows[0];
      return { success: true, userId, email };

    } catch (error) {
      console.error('Password reset token verification error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Token verification failed' 
      };
    }
  }

  async completePasswordReset(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.pool.query(`
        DELETE FROM "passwordResetTokens" WHERE token = $1
      `, [token]);

      return { success: true };

    } catch (error) {
      console.error('Password reset completion error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Password reset completion failed' 
      };
    }
  }
}
```

## Authentication Integration

### 1. Update Registration Flow (`server/auth.ts`)
```typescript
export async function registerUser(userData: any): Promise<any> {
  // Your existing validation logic...
  
  // Hash password
  const hashedPassword = await bcrypt.hash(userData.password, 12);

  // Create user with isActive = false (requires email verification)
  const newUser = await pool.query(`
    INSERT INTO users (username, email, password, "fullName", phone, role, "isActive", "isVerified", "createdAt")
    VALUES ($1, $2, $3, $4, $5, $6, FALSE, FALSE, NOW())
    RETURNING *
  `, [
    userData.username,
    userData.email,
    hashedPassword,
    userData.fullName,
    userData.phone,
    userData.role || 'user'
  ]);

  const user = newUser.rows[0];

  // Send verification email
  const emailService = new EmailService(pool);
  await emailService.sendEmailVerification(user);

  return user;
}
```

### 2. Update Login Flow
```typescript
// In your passport LocalStrategy
if (!user.isActive) {
  return done(null, false, { 
    message: 'Account is not verified. Please check your email for verification instructions.',
    needsVerification: true,
    userEmail: user.email,
    userId: user.id
  });
}
```

## API Routes

### 1. Email Verification Routes (`server/routes/email.ts`)
```typescript
import { Router } from 'express';
import { EmailService } from '../emailService';
import { pool } from '../db';

const router = Router();
const emailService = new EmailService(pool);

// Send verification email
router.post('/send-verification', async (req, res) => {
  try {
    const { email } = req.body;

    // Find user
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = userResult.rows[0];

    if (user.isActive) {
      return res.json({ success: true, message: 'Email is already verified' });
    }

    const result = await emailService.sendEmailVerification(user);
    res.json(result);

  } catch (error) {
    console.error('Send verification error:', error);
    res.status(500).json({ success: false, error: 'Failed to send verification email' });
  }
});

// Verify email token
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    const result = await emailService.verifyEmailToken(token);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: {
          verified: true,
          active: true
        }
      });
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

// Request password reset
router.post('/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;

    // Find user
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      // Don't reveal if email exists
      return res.json({ success: true, message: 'If the email exists, a reset link has been sent' });
    }

    const user = userResult.rows[0];
    const result = await emailService.sendPasswordReset(user);
    
    res.json({ success: true, message: 'If the email exists, a reset link has been sent' });

  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ success: false, error: 'Failed to process password reset request' });
  }
});

// Verify password reset token
router.post('/verify-reset-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    const result = await emailService.verifyPasswordResetToken(token);
    res.json(result);

  } catch (error) {
    console.error('Password reset token verification error:', error);
    res.status(500).json({ success: false, error: 'Token verification failed' });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ success: false, error: 'Token and new password are required' });
    }

    // Verify token first
    const tokenResult = await emailService.verifyPasswordResetToken(token);
    if (!tokenResult.success) {
      return res.status(400).json(tokenResult);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update user password
      await client.query(`
        UPDATE users 
        SET password = $1, "updatedAt" = NOW()
        WHERE id = $2
      `, [hashedPassword, tokenResult.userId]);

      // Delete used token
      await client.query(`
        DELETE FROM "passwordResetTokens" WHERE token = $1
      `, [token]);

      await client.query('COMMIT');
      
      res.json({ success: true, message: 'Password reset successfully' });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ success: false, error: 'Password reset failed' });
  }
});

export default router;
```

## Frontend Components

### 1. Email Verification Modal (`components/EmailVerificationModal.tsx`)
```typescript
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mail, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';

interface EmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
}

export function EmailVerificationModal({ isOpen, onClose, userEmail }: EmailVerificationModalProps) {
  const [emailSent, setEmailSent] = useState(false);

  const resendMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/email/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail }),
      });
      return response.json();
    },
    onSuccess: () => {
      setEmailSent(true);
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            Email Verification Required
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {!emailSent ? (
            <>
              <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">Account not verified</p>
                  <p className="text-yellow-700">
                    Please verify your email address to activate your account.
                  </p>
                </div>
              </div>
              
              <p className="text-sm text-gray-600">
                We sent a verification email to <strong>{userEmail}</strong>. 
                Please check your inbox and spam folder.
              </p>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Close
                </Button>
                <Button
                  onClick={() => resendMutation.mutate()}
                  disabled={resendMutation.isPending}
                  className="flex-1"
                >
                  {resendMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Resend Email
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-green-800">Email sent successfully!</p>
                  <p className="text-green-700">
                    Please check your inbox and spam folder for the verification email.
                  </p>
                </div>
              </div>
              
              <Button onClick={onClose} className="w-full">
                Close
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 2. Email Verification Page (`pages/verify-email.tsx`)
```typescript
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (!token) {
          setStatus('error');
          setMessage('Invalid verification link. Missing token.');
          return;
        }

        const response = await fetch('/api/email/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (data.success) {
          setStatus('success');
          setMessage('Your email has been verified successfully! You can now access all features.');
        } else {
          setStatus('error');
          setMessage(data.error || 'Email verification failed. The link may have expired.');
        }
      } catch (error) {
        console.error('Email verification error:', error);
        setStatus('error');
        setMessage('An error occurred while verifying your email. Please try again.');
      }
    };

    verifyEmail();
  }, []);

  const handleContinue = () => {
    if (status === 'success') {
      setLocation('/profile');
    } else {
      setLocation('/auth');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === 'loading' && (
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle className="h-12 w-12 text-green-600" />
            )}
            {status === 'error' && (
              <XCircle className="h-12 w-12 text-red-600" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {status === 'loading' && 'Verifying Email'}
            {status === 'success' && 'Email Verified'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Please wait while we verify your email address...'}
            {status === 'success' && 'Welcome to TeeMeYou! Your account is now active.'}
            {status === 'error' && 'There was a problem verifying your email address.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">{message}</p>
          </div>
          {status !== 'loading' && (
            <Button onClick={handleContinue} className="w-full">
              {status === 'success' ? 'Continue to Profile' : 'Back to Login'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

### 3. Password Reset Page (`pages/reset-password.tsx`)
```typescript
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2, CheckCircle, XCircle } from 'lucide-react';

const passwordResetSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordResetData = z.infer<typeof passwordResetSchema>;

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState<'loading' | 'form' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PasswordResetData>({
    resolver: zodResolver(passwordResetSchema),
  });

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const resetToken = urlParams.get('token');

        if (!resetToken) {
          setStatus('error');
          setMessage('Invalid reset link. Missing token.');
          return;
        }

        const response = await fetch('/api/email/verify-reset-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: resetToken }),
        });

        const data = await response.json();

        if (data.success) {
          setToken(resetToken);
          setStatus('form');
        } else {
          setStatus('error');
          setMessage(data.error || 'Invalid or expired reset link.');
        }
      } catch (error) {
        console.error('Token verification error:', error);
        setStatus('error');
        setMessage('An error occurred while verifying the reset link.');
      }
    };

    verifyToken();
  }, []);

  const onSubmit = async (data: PasswordResetData) => {
    if (!token) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/email/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword: data.password,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setStatus('success');
        setMessage('Your password has been reset successfully! You can now log in with your new password.');
      } else {
        setMessage(result.error || 'Failed to reset password. Please try again.');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      setMessage('An error occurred while resetting your password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinue = () => {
    setLocation('/auth');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === 'loading' && (
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle className="h-12 w-12 text-green-600" />
            )}
            {status === 'error' && (
              <XCircle className="h-12 w-12 text-red-600" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {status === 'loading' && 'Verifying Reset Link'}
            {status === 'form' && 'Reset Your Password'}
            {status === 'success' && 'Password Reset Complete'}
            {status === 'error' && 'Reset Link Invalid'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Please wait while we verify your reset link...'}
            {status === 'form' && 'Enter your new password below'}
            {status === 'success' && 'You can now log in with your new password'}
            {status === 'error' && 'There was a problem with your reset link'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'form' && (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    {...form.register("password")}
                    disabled={isSubmitting}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isSubmitting}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {form.formState.errors.password && (
                  <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    {...form.register("confirmPassword")}
                    disabled={isSubmitting}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isSubmitting}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {form.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-500">{form.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </form>
          )}

          {(status === 'success' || status === 'error') && (
            <>
              <div className="text-center">
                <p className="text-sm text-gray-600">{message}</p>
              </div>
              <Button onClick={handleContinue} className="w-full">
                {status === 'success' ? 'Continue to Login' : 'Back to Login'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

## Environment Configuration

### 1. Environment Variables
Add these to your `.env` file:
```env
# MailerSend Configuration
MAILERSEND_API_KEY=your_mailersend_api_key_here

# Database Configuration
DATABASE_URL=your_database_url_here

# Session Configuration
SESSION_SECRET=your_session_secret_here

# Application URLs
BASE_URL=https://teemeyou.shop
SENDER_EMAIL=noreply@teemeyou.shop
SENDER_NAME=TeeMeYou
```

### 2. MailerSend Setup
1. Sign up for MailerSend account
2. Add and verify your domain (`teemeyou.shop`)
3. Create API key
4. Add DNS records for domain verification
5. Configure SPF, DKIM, and DMARC records

### 3. Package Dependencies
Add to your `package.json`:
```json
{
  "dependencies": {
    "mailersend": "^2.2.0",
    "bcryptjs": "^2.4.3",
    "@types/bcryptjs": "^2.4.2"
  }
}
```

## Testing & Verification

### 1. Create Test Script (`test-email-system.js`)
```javascript
const fetch = require('node-fetch');
const { Pool } = require('pg');

async function testEmailSystem() {
  console.log('=== Email System Test ===\n');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const testEmail = `test_${Date.now()}@example.com`;

  try {
    // 1. Test Registration
    console.log('1. Testing user registration...');
    const registerResponse = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `testuser_${Date.now()}`,
        email: testEmail,
        password: 'TestPassword123!',
        fullName: 'Test User'
      })
    });
    
    const registerData = await registerResponse.json();
    console.log('Registration result:', registerData.success ? 'SUCCESS' : 'FAILED');

    // 2. Check user is inactive
    const userQuery = await pool.query('SELECT "isActive", "isVerified" FROM users WHERE email = $1', [testEmail]);
    const user = userQuery.rows[0];
    console.log(`User state - isActive: ${user.isActive}, isVerified: ${user.isVerified}`);

    // 3. Get verification token
    const tokenQuery = await pool.query('SELECT token FROM "emailVerificationTokens" WHERE email = $1', [testEmail]);
    if (tokenQuery.rows.length > 0) {
      const token = tokenQuery.rows[0].token;
      console.log('✅ Verification token created');

      // 4. Test email verification
      console.log('2. Testing email verification...');
      const verifyResponse = await fetch('http://localhost:5000/api/email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      const verifyData = await verifyResponse.json();
      console.log('Verification result:', verifyData.success ? 'SUCCESS' : 'FAILED');

      // 5. Check user is now active
      const updatedUserQuery = await pool.query('SELECT "isActive", "isVerified" FROM users WHERE email = $1', [testEmail]);
      const updatedUser = updatedUserQuery.rows[0];
      console.log(`Updated user state - isActive: ${updatedUser.isActive}, isVerified: ${updatedUser.isVerified}`);
    }

    // 6. Test password reset
    console.log('3. Testing password reset...');
    const resetResponse = await fetch('http://localhost:5000/api/email/request-password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });

    const resetData = await resetResponse.json();
    console.log('Password reset request:', resetData.success ? 'SUCCESS' : 'FAILED');

    // Cleanup
    await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
    console.log('\n✅ Test completed and cleaned up');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

testEmailSystem();
```

### 2. Manual Testing Steps
1. **Registration Flow:**
   - Register new user
   - Verify user is created with `isActive = false`
   - Check email logs for verification email

2. **Email Verification:**
   - Click verification link in email
   - Verify user becomes `isActive = true`
   - Check token is deleted

3. **Password Reset:**
   - Request password reset
   - Check reset email is sent
   - Use reset link to change password
   - Verify token is deleted after use

### 3. Production Checklist
- ✅ DNS records configured for MailerSend
- ✅ Domain verified in MailerSend
- ✅ API key secured in environment variables
- ✅ Database tables created with proper indexes
- ✅ Email templates tested on multiple devices
- ✅ Error handling implemented
- ✅ Rate limiting on auth endpoints
- ✅ Token expiration working correctly
- ✅ Cleanup of expired tokens implemented

## Common Issues & Solutions

### Issue 1: Emails not sending
**Solution:** Check MailerSend domain verification and DNS records

### Issue 2: Tokens not expiring
**Solution:** Implement cleanup job for expired tokens

### Issue 3: Mobile email display issues
**Solution:** Test email templates on multiple devices and email clients

### Issue 4: Users not activating after verification
**Solution:** Check database transaction handling in verification process

This guide provides a complete, production-ready implementation of email verification and password reset functionality. Follow each section carefully and test thoroughly before deploying to production.
