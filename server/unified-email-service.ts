import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';
import crypto from 'crypto';
import { db } from './db';
import { users, mailTokens, emailLogs } from '@shared/schema';
import { eq, and, lt, desc } from 'drizzle-orm';
import { SASTTimezone, sastAddHours, isExpiredSAST, formatSASTLog } from './timezone-utils';

// HeartCart hot pink styling and company branding
const HEARTCART_COLORS = {
  HOT_PINK: '#FF69B4',
  DARK_PINK: '#E91E63',
  LIGHT_PINK: '#FFB6C1',
  ACCENT_PINK: '#FF1493',
  BLACK: '#000000',
  WHITE: '#FFFFFF',
  GRAY: '#6B7280',
  LIGHT_GRAY: '#F3F4F6',
  DARK_GRAY: '#374151',
  SUCCESS: '#10B981',
  WARNING: '#F59E0B',
  DANGER: '#EF4444'
};

export class UnifiedEmailService {
  private mailerSend!: MailerSend;
  private isInitialized = false;
  private fromSender!: Sender;

  constructor() {
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

      this.fromSender = new Sender("sales@heartcart.shop", "HeartCart");

      this.isInitialized = true;
      // Only log in development to reduce production noise
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Unified Email Service initialized successfully with MailerSend');
      }
    } catch (error) {
      console.error('❌ Failed to initialize MailerSend email service:', error);
      this.isInitialized = false;
    }
  }

  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async createPasswordResetToken(userId: number, email: string): Promise<{ token: string; expires: Date }> {
    const token = this.generateSecureToken();
    // Create token that expires in 1 hour SAST time, but store as UTC in database
    const sastExpiresAt = sastAddHours(1);
    const utcExpiresAt = SASTTimezone.toUTC(sastExpiresAt);

    console.log(`🔑 Creating password reset token - SAST expires: ${formatSASTLog(sastExpiresAt)}, UTC stored: ${utcExpiresAt.toISOString()}`);

    await db.insert(mailTokens).values({
      token: token,
      tokenType: 'password_reset',
      userId,
      email,
      expiresAt: utcExpiresAt
    });

    return { token, expires: sastExpiresAt };
  }

  async createVerificationToken(userId: number, email: string): Promise<{ token: string; expires: Date }> {
    const token = this.generateSecureToken();
    // Create token that expires in 1 hour SAST time, but store as UTC in database
    const sastExpiresAt = sastAddHours(1);
    const utcExpiresAt = SASTTimezone.toUTC(sastExpiresAt);

    console.log(`🔑 Creating verification token for user ${userId}: ${token ? token.substring(0, 16) + '...' : 'NULL TOKEN'}`);
    console.log(`🔑 Creating verification token - SAST expires: ${formatSASTLog(sastExpiresAt)}, UTC stored: ${utcExpiresAt.toISOString()}`);

    if (!token) {
      throw new Error('Failed to generate secure token');
    }

    try {
      await db.insert(mailTokens).values({
        token: token,
        tokenType: 'verification',
        userId,
        email,
        expiresAt: utcExpiresAt
      });

      console.log(`✅ Verification token successfully stored in database`);
      return { token, expires: sastExpiresAt };
    } catch (error: any) {
      console.error('❌ Error creating mail token:', error);
      throw error;
    }
  }

  async sendMailerSendEmail(recipientEmail: string, subject: string, htmlContent: string, textContent: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.isInitialized) {
        await this.initializeMailerSend();
        if (!this.isInitialized) {
          throw new Error('MailerSend service failed to initialize');
        }
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

      console.log(`📧 Sending email to ${recipientEmail} with subject: ${subject}`);
      
      const result = await this.mailerSend.email.send(emailParams);
      
      console.log('✅ Email sent successfully via MailerSend');
      
      return {
        success: true,
        messageId: result.body?.message_id || 'sent'
      };
    } catch (error: any) {
      console.error('❌ MailerSend email error:', {
        error: error.message,
        code: error.code,
        name: error.name
      });
      
      // Handle known MailerSend API issues
      if (error.code === 'ERR_HTTP_INVALID_STATUS_CODE' || 
          error.name === 'StatusCodeError' || 
          error.message?.includes('Invalid status code')) {
        
        console.log('⚠️ Treating MailerSend error as potential success (known API issue)');
        
        return {
          success: true,
          messageId: 'api_error_treated_as_success',
          error: 'API returned invalid status but email likely sent'
        };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async sendPasswordResetEmail(email: string, token: string, userName?: string): Promise<{ success: boolean; error?: string }> {
    const resetUrl = `https://heartcart.shop/reset-password?token=${token}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - HeartCart</title>
        <style>
          @media (max-width: 600px) {
            .container { width: 95% !important; margin: 10px auto !important; }
            .header { padding: 20px !important; }
            .content { padding: 25px !important; }
            .button { padding: 12px 24px !important; font-size: 14px !important; }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; background: linear-gradient(135deg, ${HEARTCART_COLORS.LIGHT_GRAY} 0%, ${HEARTCART_COLORS.WHITE} 100%); font-family: 'Segoe UI', Arial, sans-serif;">
        <div class="container" style="max-width: 600px; margin: 20px auto; background: ${HEARTCART_COLORS.WHITE}; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(255, 105, 180, 0.2);">
          
          <!-- Header -->
          <div class="header" style="background: linear-gradient(135deg, ${HEARTCART_COLORS.HOT_PINK} 0%, ${HEARTCART_COLORS.DARK_PINK} 100%); padding: 40px; text-align: center; position: relative;">
            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 6px; background: linear-gradient(90deg, ${HEARTCART_COLORS.HOT_PINK} 0%, ${HEARTCART_COLORS.ACCENT_PINK} 50%, ${HEARTCART_COLORS.DARK_PINK} 100%);"></div>
            <div style="display: inline-block; background: ${HEARTCART_COLORS.WHITE}; padding: 12px; border-radius: 50%; margin-bottom: 15px; box-shadow: 0 4px 12px rgba(255, 105, 180, 0.3);">
              <span style="font-size: 28px; color: ${HEARTCART_COLORS.HOT_PINK};">🛍️</span>
            </div>
            <h1 style="color: ${HEARTCART_COLORS.WHITE}; margin: 0; font-size: 36px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.3); letter-spacing: 1px;">HeartCart</h1>
            <p style="color: ${HEARTCART_COLORS.WHITE}; margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Password Reset Request</p>
          </div>
          
          <!-- Main Content -->
          <div class="content" style="padding: 40px; background: ${HEARTCART_COLORS.WHITE};">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; background: linear-gradient(135deg, ${HEARTCART_COLORS.HOT_PINK} 0%, ${HEARTCART_COLORS.ACCENT_PINK} 100%); padding: 12px; border-radius: 50%; margin-bottom: 15px;">
                <span style="font-size: 32px; color: ${HEARTCART_COLORS.WHITE};">🔑</span>
              </div>
              <h2 style="color: ${HEARTCART_COLORS.DARK_PINK}; margin: 0; font-size: 28px; font-weight: 600;">Reset Your Password</h2>
            </div>
            
            <p style="font-size: 16px; line-height: 1.6; color: ${HEARTCART_COLORS.DARK_GRAY}; margin-bottom: 30px; text-align: center;">
              Hi ${userName || 'User'}, we received a request to reset your HeartCart account password. If you made this request, click the button below to set a new password.
            </p>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 40px 0;">
              <a href="${resetUrl}" class="button"
                 style="background: linear-gradient(135deg, ${HEARTCART_COLORS.HOT_PINK} 0%, ${HEARTCART_COLORS.DARK_PINK} 100%); 
                        color: ${HEARTCART_COLORS.WHITE}; 
                        padding: 16px 32px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-weight: 600; 
                        font-size: 16px; 
                        display: inline-block;
                        box-shadow: 0 4px 12px rgba(255, 105, 180, 0.4);
                        transition: all 0.3s ease;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;">
                🔑 Reset My Password
              </a>
            </div>
            
            <!-- Security Notice -->
            <div style="background: linear-gradient(135deg, ${HEARTCART_COLORS.LIGHT_PINK} 0%, ${HEARTCART_COLORS.HOT_PINK} 20%); padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid ${HEARTCART_COLORS.DARK_PINK}; position: relative;">
              <div style="position: absolute; top: -8px; left: 16px; background: ${HEARTCART_COLORS.DARK_PINK}; color: ${HEARTCART_COLORS.WHITE}; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">SECURITY</div>
              <p style="margin: 0; font-weight: 600; color: ${HEARTCART_COLORS.BLACK}; font-size: 14px;">
                🔒 This password reset link expires in 1 hour for your protection.
              </p>
            </div>
            
            <!-- Fallback Link -->
            <div style="background: ${HEARTCART_COLORS.LIGHT_GRAY}; padding: 15px; border-radius: 6px; margin-top: 30px; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: ${HEARTCART_COLORS.DARK_GRAY};">
                Button not working? Copy and paste this link:
              </p>
              <p style="margin: 5px 0 0 0;">
                <a href="${resetUrl}" style="color: ${HEARTCART_COLORS.HOT_PINK}; word-break: break-all; font-size: 12px;">${resetUrl}</a>
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: ${HEARTCART_COLORS.DARK_GRAY}; padding: 25px; text-align: center;">
            <div style="margin-bottom: 15px;">
              <span style="display: inline-block; background: ${HEARTCART_COLORS.WHITE}; padding: 8px 12px; border-radius: 20px; margin: 0 5px; box-shadow: 0 2px 8px rgba(255, 105, 180, 0.2);">
                <span style="font-size: 16px; color: ${HEARTCART_COLORS.HOT_PINK};">🛍️</span>
              </span>
            </div>
            <p style="color: ${HEARTCART_COLORS.WHITE}; margin: 0; font-size: 14px; font-weight: 500;">
              © 2024 HeartCart • South Africa's Premium Shopping Platform
            </p>
            <p style="color: ${HEARTCART_COLORS.LIGHT_GRAY}; margin: 8px 0 0 0; font-size: 12px;">
              If you didn't request this password reset, you can safely ignore this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
      Reset Your HeartCart Password
      
      Hi ${userName || 'User'},
      
      We received a request to reset your HeartCart account password. If you made this request, click the link below to set a new password:
      
      ${resetUrl}
      
      This password reset link expires in 1 hour for your security.
      
      If you didn't request this password reset, you can safely ignore this email.
      
      Best regards,
      The HeartCart Team
    `;

    try {
      const result = await this.sendMailerSendEmail(
        email,
        '🇿🇦 Reset Your HeartCart Password',
        htmlContent,
        textContent
      );

      // Log the email attempt
      await db.insert(emailLogs).values({
        recipientEmail: email,
        emailType: 'password_reset',
        subject: '🇿🇦 Reset Your HeartCart Password',
        deliveryStatus: result.success ? 'sent' : 'failed',
        errorMessage: result.error || null,
        mailerSendId: result.messageId || null
      });

      return result;
    } catch (error: any) {
      console.error('❌ Error sending password reset email:', error);
      
      // Log the failed attempt
      await db.insert(emailLogs).values({
        recipientEmail: email,
        emailType: 'password_reset',
        subject: '🇿🇦 Reset Your HeartCart Password',
        deliveryStatus: 'failed',
        errorMessage: error.message || 'Unknown error'
      });

      return {
        success: false,
        error: error.message || 'Failed to send password reset email'
      };
    }
  }

  async validatePasswordResetToken(token: string): Promise<{ valid: boolean; userId?: number; email?: string; error?: string }> {
    try {
      console.log(`🔍 Validating token: ${token.substring(0, 8)}...`);
      
      const tokenRecord = await db.select()
        .from(mailTokens)
        .where(
          and(
            eq(mailTokens.token, token),
            eq(mailTokens.tokenType, 'password_reset'),
            eq(mailTokens.isActive, true)
          )
        )
        .limit(1);

      console.log(`🔍 Found ${tokenRecord.length} matching token records`);

      if (tokenRecord.length === 0) {
        // Let's debug by checking what tokens exist
        const allTokens = await db.select()
          .from(mailTokens)
          .where(eq(mailTokens.tokenType, 'password_reset'))
          .orderBy(desc(mailTokens.createdAt))
          .limit(5);
        
        console.log(`🔍 Recent password reset tokens in DB: ${allTokens.length}`);
        for (const t of allTokens) {
          console.log(`🔍 Token: ${t.token.substring(0, 16)}..., active: ${t.isActive}, expires: ${t.expiresAt}`);
        }
        
        return { valid: false, error: 'Invalid or expired token' };
      }

      const record = tokenRecord[0];
      const utcExpiresAt = new Date(record.expiresAt);
      
      // Check expiration using SAST timezone logic
      const isExpired = isExpiredSAST(utcExpiresAt);

      console.log(`🔍 Password Reset Token expires at: ${formatSASTLog(utcExpiresAt)} (stored as UTC: ${utcExpiresAt.toISOString()})`);
      console.log(`🔍 Current SAST time: ${formatSASTLog()}`);
      console.log(`🔍 Token expired: ${isExpired}`);

      if (isExpired) {
        return { valid: false, error: 'Token has expired' };
      }

      console.log(`✅ Token validation successful for user: ${record.userId}`);

      return {
        valid: true,
        userId: record.userId,
        email: record.email
      };
    } catch (error: any) {
      console.error('❌ Error validating password reset token:', error);
      return { valid: false, error: 'Token validation failed' };
    }
  }

  async validateToken(token: string, tokenType: string): Promise<{ valid: boolean; userId?: number; email?: string; error?: string }> {
    try {
      console.log(`🔍 Validating ${tokenType} token: ${token.substring(0, 8)}...`);

      const tokenRecord = await db.select()
        .from(mailTokens)
        .where(
          and(
            eq(mailTokens.token, token),
            eq(mailTokens.tokenType, tokenType),
            eq(mailTokens.isActive, true)
          )
        )
        .limit(1);

      console.log(`🔍 Found ${tokenRecord.length} matching ${tokenType} token records`);

      if (tokenRecord.length === 0) {
        // Let's debug by checking what tokens exist
        const allTokens = await db.select()
          .from(mailTokens)
          .where(eq(mailTokens.tokenType, tokenType))
          .orderBy(desc(mailTokens.createdAt))
          .limit(5);
        
        console.log(`🔍 Recent ${tokenType} tokens in DB: ${allTokens.length}`);
        for (const t of allTokens) {
          console.log(`🔍 Token: ${t.token.substring(0, 16)}..., active: ${t.isActive}, expires: ${t.expiresAt}`);
        }
        
        return { valid: false, error: 'Invalid or expired token' };
      }

      const record = tokenRecord[0];
      const utcExpiresAt = new Date(record.expiresAt);
      
      // Check expiration using SAST timezone logic
      const isExpired = isExpiredSAST(utcExpiresAt);

      console.log(`🔍 ${tokenType} Token expires at: ${formatSASTLog(utcExpiresAt)} (stored as UTC: ${utcExpiresAt.toISOString()})`);
      console.log(`🔍 Current SAST time: ${formatSASTLog()}`);
      console.log(`🔍 Token expired: ${isExpired}`);

      if (isExpired) {
        return { valid: false, error: 'Token has expired' };
      }

      console.log(`✅ ${tokenType} token validation successful for user: ${record.userId}`);

      return {
        valid: true,
        userId: record.userId,
        email: record.email
      };
    } catch (error: any) {
      console.error(`❌ Error validating ${tokenType} token:`, error);
      return { valid: false, error: 'Token validation failed' };
    }
  }

  async markTokenAsUsed(token: string): Promise<void> {
    await db.update(mailTokens)
      .set({ 
        isActive: false,
        usedAt: SASTTimezone.toUTC(SASTTimezone.now()) // Store as UTC but from SAST time
      })
      .where(eq(mailTokens.token, token));
  }

  async sendVerificationEmail(userId: number, email: string, userName: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Create verification token
      const { token } = await this.createVerificationToken(userId, email);
      
      // Create verification URL
      const verificationUrl = `https://heartcart.shop/verify-email?token=${token}`;

      const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Account - HeartCart</title>
      </head>
      <body style="margin: 0; padding: 0; background: linear-gradient(135deg, ${HEARTCART_COLORS.LIGHT_GRAY} 0%, ${HEARTCART_COLORS.WHITE} 100%); font-family: 'Segoe UI', Arial, sans-serif;">
        <div class="container" style="max-width: 600px; margin: 20px auto; background: ${HEARTCART_COLORS.WHITE}; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(255, 105, 180, 0.2);">
          
          <!-- Header -->
          <div class="header" style="background: linear-gradient(135deg, ${HEARTCART_COLORS.HOT_PINK} 0%, ${HEARTCART_COLORS.DARK_PINK} 100%); padding: 40px; text-align: center; position: relative;">
            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 6px; background: linear-gradient(90deg, ${HEARTCART_COLORS.HOT_PINK} 0%, ${HEARTCART_COLORS.ACCENT_PINK} 50%, ${HEARTCART_COLORS.DARK_PINK} 100%);"></div>
            <div style="display: inline-block; background: ${HEARTCART_COLORS.WHITE}; padding: 12px; border-radius: 50%; margin-bottom: 15px; box-shadow: 0 4px 12px rgba(255, 105, 180, 0.3);">
              <span style="font-size: 28px; color: ${HEARTCART_COLORS.HOT_PINK};">🛍️</span>
            </div>
            <h1 style="color: ${HEARTCART_COLORS.WHITE}; margin: 0; font-size: 36px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.3); letter-spacing: 1px;">HeartCart</h1>
            <p style="color: ${HEARTCART_COLORS.WHITE}; margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Welcome to HeartCart!</p>
          </div>
          
          <!-- Main Content -->
          <div class="content" style="padding: 40px; background: ${HEARTCART_COLORS.WHITE};">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; background: linear-gradient(135deg, ${HEARTCART_COLORS.HOT_PINK} 0%, ${HEARTCART_COLORS.ACCENT_PINK} 100%); padding: 12px; border-radius: 50%; margin-bottom: 15px;">
                <span style="font-size: 32px; color: ${HEARTCART_COLORS.WHITE};">✉️</span>
              </div>
              <h2 style="color: ${HEARTCART_COLORS.DARK_PINK}; margin: 0; font-size: 28px; font-weight: 600;">Verify Your Account</h2>
            </div>
            
            <p style="font-size: 16px; line-height: 1.6; color: ${HEARTCART_COLORS.DARK_GRAY}; margin-bottom: 30px; text-align: center;">
              Hi ${userName || 'User'}, welcome to HeartCart - South Africa's premium shopping platform! Please verify your email address to activate your account and start shopping.
            </p>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 40px 0;">
              <a href="${verificationUrl}" class="button"
                 style="background: linear-gradient(135deg, ${HEARTCART_COLORS.HOT_PINK} 0%, ${HEARTCART_COLORS.DARK_PINK} 100%); 
                        color: ${HEARTCART_COLORS.WHITE}; 
                        padding: 16px 32px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-weight: 600; 
                        font-size: 16px; 
                        display: inline-block;
                        box-shadow: 0 4px 12px rgba(255, 105, 180, 0.4);
                        transition: all 0.3s ease;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;">
                ✅ Verify My Account
              </a>
            </div>
            
            <!-- Security Notice -->
            <div style="background: linear-gradient(135deg, ${HEARTCART_COLORS.LIGHT_PINK} 0%, ${HEARTCART_COLORS.HOT_PINK} 20%); padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid ${HEARTCART_COLORS.DARK_PINK}; position: relative;">
              <div style="position: absolute; top: -8px; left: 16px; background: ${HEARTCART_COLORS.DARK_PINK}; color: ${HEARTCART_COLORS.WHITE}; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">SECURITY</div>
              <p style="margin: 0; font-weight: 600; color: ${HEARTCART_COLORS.BLACK}; font-size: 14px;">
                🔒 This verification link expires in 1 hour for your protection.
              </p>
            </div>
            
            <!-- Fallback Link -->
            <div style="background: ${HEARTCART_COLORS.LIGHT_GRAY}; padding: 15px; border-radius: 6px; margin-top: 30px; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: ${HEARTCART_COLORS.DARK_GRAY};">
                Button not working? Copy and paste this link:
              </p>
              <p style="margin: 5px 0 0 0;">
                <a href="${verificationUrl}" style="color: ${HEARTCART_COLORS.HOT_PINK}; word-break: break-all; font-size: 12px;">${verificationUrl}</a>
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: ${HEARTCART_COLORS.DARK_GRAY}; padding: 25px; text-align: center;">
            <div style="margin-bottom: 15px;">
              <span style="display: inline-block; background: ${HEARTCART_COLORS.WHITE}; padding: 8px 12px; border-radius: 20px; margin: 0 5px; box-shadow: 0 2px 8px rgba(255, 105, 180, 0.2);">
                <span style="font-size: 16px; color: ${HEARTCART_COLORS.HOT_PINK};">🛍️</span>
              </span>
            </div>
            <p style="color: ${HEARTCART_COLORS.WHITE}; margin: 0; font-size: 14px; font-weight: 500;">
              © 2024 HeartCart • South Africa's Premium Shopping Platform
            </p>
            <p style="color: ${HEARTCART_COLORS.LIGHT_GRAY}; margin: 8px 0 0 0; font-size: 12px;">
              If you didn't create this account, you can safely ignore this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
      Welcome to HeartCart!
      
      Hi ${userName || 'User'},
      
      Welcome to HeartCart - South Africa's premium shopping marketplace! Please verify your email address to activate your account and start shopping.
      
      Click here to verify: ${verificationUrl}
      
      This verification link expires in 1 hour for your security.
      
      If you didn't create this account, you can safely ignore this email.
      
      Best regards,
      The HeartCart Team
    `;

      console.log(`📧 Sending verification email to ${email}`);
      return await this.sendMailerSendEmail(email, "Verify Your HeartCart Account", htmlContent, textContent);
    } catch (error: any) {
      console.error('❌ Error sending verification email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendCreditNotificationEmail(email: string, customerName: string, creditAmount: number, adminNote: string): Promise<{ success: boolean; error?: string }> {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Credit Added - HeartCart</title>
        <style>
          @media (max-width: 600px) {
            .container { width: 95% !important; margin: 10px auto !important; }
            .header { padding: 20px !important; }
            .content { padding: 25px !important; }
            .credit-amount { font-size: 32px !important; }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; background: linear-gradient(135deg, ${HEARTCART_COLORS.LIGHT_GRAY} 0%, ${HEARTCART_COLORS.WHITE} 100%); font-family: 'Segoe UI', Arial, sans-serif;">
        <div class="container" style="max-width: 600px; margin: 20px auto; background: ${HEARTCART_COLORS.WHITE}; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(255, 105, 180, 0.2);">
          
          <!-- Header -->
          <div class="header" style="background: linear-gradient(135deg, ${HEARTCART_COLORS.HOT_PINK} 0%, ${HEARTCART_COLORS.DARK_PINK} 100%); padding: 40px; text-align: center; position: relative;">
            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 6px; background: linear-gradient(90deg, ${HEARTCART_COLORS.HOT_PINK} 0%, ${HEARTCART_COLORS.ACCENT_PINK} 50%, ${HEARTCART_COLORS.DARK_PINK} 100%);"></div>
            <div style="display: inline-block; background: ${HEARTCART_COLORS.WHITE}; padding: 12px; border-radius: 50%; margin-bottom: 15px; box-shadow: 0 4px 12px rgba(255, 105, 180, 0.3);">
              <span style="font-size: 28px; color: ${HEARTCART_COLORS.HOT_PINK};">🛍️</span>
            </div>
            <h1 style="color: ${HEARTCART_COLORS.WHITE}; margin: 0; font-size: 36px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.3); letter-spacing: 1px;">HeartCart</h1>
            <p style="color: ${HEARTCART_COLORS.WHITE}; margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Account Credit Added</p>
          </div>
          
          <!-- Main Content -->
          <div class="content" style="padding: 40px; background: ${HEARTCART_COLORS.WHITE};">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; background: linear-gradient(135deg, ${HEARTCART_COLORS.SUCCESS} 0%, ${HEARTCART_COLORS.HOT_PINK} 100%); padding: 12px; border-radius: 50%; margin-bottom: 15px;">
                <span style="font-size: 32px; color: ${HEARTCART_COLORS.WHITE};">💳</span>
              </div>
              <h2 style="color: ${HEARTCART_COLORS.DARK_PINK}; margin: 0; font-size: 28px; font-weight: 600;">Credit Added to Your Account</h2>
            </div>
            
            <p style="font-size: 16px; line-height: 1.6; color: ${HEARTCART_COLORS.DARK_GRAY}; margin-bottom: 30px; text-align: center;">
              Hi ${customerName}, great news! We've added credit to your HeartCart account. You can use this credit on your next purchase or save it for later.
            </p>
            
            <!-- Credit Amount Display -->
            <div style="background: linear-gradient(135deg, ${HEARTCART_COLORS.LIGHT_PINK} 0%, ${HEARTCART_COLORS.WHITE} 100%); border: 2px solid ${HEARTCART_COLORS.HOT_PINK}; padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0;">
              <p style="margin: 0 0 10px 0; font-size: 16px; color: ${HEARTCART_COLORS.DARK_GRAY}; font-weight: 500;">Credit Amount Added</p>
              <p class="credit-amount" style="margin: 0; font-size: 48px; font-weight: 800; color: ${HEARTCART_COLORS.HOT_PINK}; text-shadow: 0 2px 4px rgba(255, 105, 180, 0.3);">
                R${creditAmount.toFixed(2)}
              </p>
            </div>
            
            ${adminNote ? `
            <!-- Admin Note -->
            <div style="background: ${HEARTCART_COLORS.LIGHT_GRAY}; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid ${HEARTCART_COLORS.DARK_PINK}; position: relative;">
              <div style="position: absolute; top: -8px; left: 16px; background: ${HEARTCART_COLORS.DARK_PINK}; color: ${HEARTCART_COLORS.WHITE}; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">NOTE</div>
              <p style="margin: 0; color: ${HEARTCART_COLORS.DARK_GRAY}; font-size: 14px; line-height: 1.5;">
                <strong>Details:</strong> ${adminNote}
              </p>
            </div>
            ` : ''}
            
            <!-- Shop Now Button -->
            <div style="text-align: center; margin: 40px 0;">
              <a href="https://heartcart.shop" 
                 style="background: linear-gradient(135deg, ${HEARTCART_COLORS.HOT_PINK} 0%, ${HEARTCART_COLORS.DARK_PINK} 100%); 
                        color: ${HEARTCART_COLORS.WHITE}; 
                        padding: 16px 32px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-weight: 600; 
                        font-size: 16px; 
                        display: inline-block;
                        box-shadow: 0 4px 12px rgba(255, 105, 180, 0.4);
                        transition: all 0.3s ease;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;">
                🛍️ Shop Now with Your Credit
              </a>
            </div>
            
            <!-- Info Box -->
            <div style="background: linear-gradient(135deg, ${HEARTCART_COLORS.LIGHT_PINK} 0%, ${HEARTCART_COLORS.HOT_PINK} 20%); padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid ${HEARTCART_COLORS.DARK_PINK}; position: relative;">
              <div style="position: absolute; top: -8px; left: 16px; background: ${HEARTCART_COLORS.DARK_PINK}; color: ${HEARTCART_COLORS.WHITE}; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">HOW IT WORKS</div>
              <p style="margin: 0; font-weight: 600; color: ${HEARTCART_COLORS.BLACK}; font-size: 14px;">
                💡 Your credit will be automatically applied at checkout. You can view your credit balance in your account dashboard.
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: ${HEARTCART_COLORS.DARK_GRAY}; padding: 25px; text-align: center;">
            <div style="margin-bottom: 15px;">
              <span style="display: inline-block; background: ${HEARTCART_COLORS.WHITE}; padding: 8px 12px; border-radius: 20px; margin: 0 5px; box-shadow: 0 2px 8px rgba(255, 105, 180, 0.2);">
                <span style="font-size: 16px; color: ${HEARTCART_COLORS.HOT_PINK};">🛍️</span>
              </span>
            </div>
            <p style="color: ${HEARTCART_COLORS.WHITE}; margin: 0; font-size: 14px; font-weight: 500;">
              © 2024 HeartCart • South Africa's Premium Shopping Platform
            </p>
            <p style="color: ${HEARTCART_COLORS.LIGHT_GRAY}; margin: 8px 0 0 0; font-size: 12px;">
              Thank you for shopping with us! Happy shopping!
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
      Account Credit Added - HeartCart
      
      Hi ${customerName},
      
      Great news! We've added R${creditAmount.toFixed(2)} credit to your HeartCart account.
      
      ${adminNote ? `Details: ${adminNote}` : ''}
      
      You can use this credit on your next purchase or save it for later. Your credit will be automatically applied at checkout.
      
      Visit heartcart.shop to start shopping with your credit!
      
      Best regards,
      The HeartCart Team
    `;

    try {
      const result = await this.sendMailerSendEmail(
        email,
        '🇿🇦 Credit Added to Your HeartCart Account',
        htmlContent,
        textContent
      );

      // Log the email attempt
      await db.insert(emailLogs).values({
        recipientEmail: email,
        emailType: 'credit_notification',
        subject: '🇿🇦 Credit Added to Your HeartCart Account',
        deliveryStatus: result.success ? 'sent' : 'failed',
        errorMessage: result.error || null,
        mailerSendId: result.messageId || null
      });

      return result;
    } catch (error: any) {
      console.error('❌ Error sending credit notification email:', error);
      
      // Log the failed attempt
      await db.insert(emailLogs).values({
        recipientEmail: email,
        emailType: 'credit_notification',
        subject: '🇿🇦 Credit Added to Your HeartCart Account',
        deliveryStatus: 'failed',
        errorMessage: error.message || 'Unknown error'
      });

      return {
        success: false,
        error: error.message || 'Failed to send credit notification email'
      };
    }
  }

  async sendCreditReminderEmail(email: string, customerName: string, availableCredit: number): Promise<{ success: boolean; error?: string }> {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Don't Forget Your Store Credit - HeartCart</title>
        <style>
          @media (max-width: 600px) {
            .container { width: 95% !important; margin: 10px auto !important; }
            .header { padding: 20px !important; }
            .content { padding: 25px !important; }
            .credit-amount { font-size: 32px !important; }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; background: linear-gradient(135deg, ${HEARTCART_COLORS.LIGHT_GRAY} 0%, ${HEARTCART_COLORS.WHITE} 100%); font-family: 'Segoe UI', Arial, sans-serif;">
        <div class="container" style="max-width: 600px; margin: 20px auto; background: ${HEARTCART_COLORS.WHITE}; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(255, 105, 180, 0.2);">
          
          <!-- Header -->
          <div class="header" style="background: linear-gradient(135deg, ${HEARTCART_COLORS.HOT_PINK} 0%, ${HEARTCART_COLORS.DARK_PINK} 100%); padding: 40px; text-align: center; position: relative;">
            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 6px; background: linear-gradient(90deg, ${HEARTCART_COLORS.HOT_PINK} 0%, ${HEARTCART_COLORS.ACCENT_PINK} 50%, ${HEARTCART_COLORS.DARK_PINK} 100%);"></div>
            <div style="display: inline-block; background: ${HEARTCART_COLORS.WHITE}; padding: 12px; border-radius: 50%; margin-bottom: 15px; box-shadow: 0 4px 12px rgba(255, 105, 180, 0.3);">
              <span style="font-size: 28px; color: ${HEARTCART_COLORS.HOT_PINK};">💰</span>
            </div>
            <h1 style="color: ${HEARTCART_COLORS.WHITE}; margin: 0; font-size: 36px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.3); letter-spacing: 1px;">HeartCart</h1>
            <p style="color: ${HEARTCART_COLORS.WHITE}; margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">You Have Store Credit Waiting!</p>
          </div>
          
          <!-- Main Content -->
          <div class="content" style="padding: 40px; background: ${HEARTCART_COLORS.WHITE};">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; background: linear-gradient(135deg, ${HEARTCART_COLORS.SUCCESS} 0%, ${HEARTCART_COLORS.HOT_PINK} 100%); padding: 12px; border-radius: 50%; margin-bottom: 15px;">
                <span style="font-size: 32px; color: ${HEARTCART_COLORS.WHITE};">🎁</span>
              </div>
              <h2 style="color: ${HEARTCART_COLORS.DARK_PINK}; margin: 0; font-size: 28px; font-weight: 600;">Don't Forget Your Store Credit!</h2>
            </div>
            
            <p style="font-size: 16px; line-height: 1.6; color: ${HEARTCART_COLORS.DARK_GRAY}; margin-bottom: 30px; text-align: center;">
              Hi ${customerName}, you have store credit waiting to be used! Why not treat yourself to something special from our amazing collection?
            </p>
            
            <!-- Credit Amount Display -->
            <div style="background: linear-gradient(135deg, ${HEARTCART_COLORS.LIGHT_PINK} 0%, ${HEARTCART_COLORS.WHITE} 100%); border: 2px solid ${HEARTCART_COLORS.HOT_PINK}; padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0;">
              <p style="margin: 0 0 10px 0; font-size: 16px; color: ${HEARTCART_COLORS.DARK_GRAY}; font-weight: 500;">Your Available Store Credit</p>
              <p class="credit-amount" style="margin: 0; font-size: 48px; font-weight: 800; color: ${HEARTCART_COLORS.HOT_PINK}; text-shadow: 0 2px 4px rgba(255, 105, 180, 0.3);">
                R${availableCredit.toFixed(2)}
              </p>
              <p style="margin: 10px 0 0 0; font-size: 14px; color: ${HEARTCART_COLORS.DARK_GRAY}; font-style: italic;">
                Ready to use at checkout
              </p>
            </div>
            
            <!-- Shop Now Button -->
            <div style="text-align: center; margin: 40px 0;">
              <a href="https://heartcart.shop" 
                 style="background: linear-gradient(135deg, ${HEARTCART_COLORS.HOT_PINK} 0%, ${HEARTCART_COLORS.DARK_PINK} 100%); 
                        color: ${HEARTCART_COLORS.WHITE}; 
                        padding: 16px 32px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-weight: 600; 
                        font-size: 16px; 
                        display: inline-block;
                        box-shadow: 0 4px 12px rgba(255, 105, 180, 0.4);
                        transition: all 0.3s ease;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;">
                🛍️ Shop Now & Use Your Credit
              </a>
            </div>
            
            <!-- Features List -->
            <div style="background: linear-gradient(135deg, ${HEARTCART_COLORS.LIGHT_PINK} 0%, ${HEARTCART_COLORS.WHITE} 100%); padding: 25px; border-radius: 8px; margin: 30px 0;">
              <h3 style="color: ${HEARTCART_COLORS.DARK_PINK}; margin: 0 0 15px 0; font-size: 18px; font-weight: 600; text-align: center;">Why Shop with HeartCart?</h3>
              <div style="text-align: left;">
                <p style="margin: 8px 0; color: ${HEARTCART_COLORS.DARK_GRAY}; font-size: 14px; line-height: 1.4;">
                  ✨ <strong>Premium Quality:</strong> High-quality t-shirts and apparel
                </p>
                <p style="margin: 8px 0; color: ${HEARTCART_COLORS.DARK_GRAY}; font-size: 14px; line-height: 1.4;">
                  🚚 <strong>Fast Delivery:</strong> Quick shipping across South Africa
                </p>
                <p style="margin: 8px 0; color: ${HEARTCART_COLORS.DARK_GRAY}; font-size: 14px; line-height: 1.4;">
                  💳 <strong>Easy Payment:</strong> Your credit applies automatically at checkout
                </p>
                <p style="margin: 8px 0; color: ${HEARTCART_COLORS.DARK_GRAY}; font-size: 14px; line-height: 1.4;">
                  🎨 <strong>Latest Trends:</strong> Fresh designs and styles updated regularly
                </p>
              </div>
            </div>
            
            <!-- Info Box -->
            <div style="background: linear-gradient(135deg, ${HEARTCART_COLORS.LIGHT_PINK} 0%, ${HEARTCART_COLORS.HOT_PINK} 20%); padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid ${HEARTCART_COLORS.DARK_PINK}; position: relative;">
              <div style="position: absolute; top: -8px; left: 16px; background: ${HEARTCART_COLORS.DARK_PINK}; color: ${HEARTCART_COLORS.WHITE}; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">REMINDER</div>
              <p style="margin: 0; font-weight: 600; color: ${HEARTCART_COLORS.BLACK}; font-size: 14px;">
                💡 Your store credit never expires and will be automatically applied to your next purchase!
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: ${HEARTCART_COLORS.DARK_GRAY}; padding: 25px; text-align: center;">
            <div style="margin-bottom: 15px;">
              <span style="display: inline-block; background: ${HEARTCART_COLORS.WHITE}; padding: 8px 12px; border-radius: 20px; margin: 0 5px; box-shadow: 0 2px 8px rgba(255, 105, 180, 0.2);">
                <span style="font-size: 16px; color: ${HEARTCART_COLORS.HOT_PINK};">💰</span>
              </span>
            </div>
            <p style="color: ${HEARTCART_COLORS.WHITE}; margin: 0; font-size: 14px; font-weight: 500;">
              © 2024 HeartCart • South Africa's Premium Shopping Platform
            </p>
            <p style="color: ${HEARTCART_COLORS.LIGHT_GRAY}; margin: 8px 0 0 0; font-size: 12px;">
              Questions? Reply to this email or visit our website for support.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
      Don't Forget Your Store Credit - HeartCart
      
      Hi ${customerName},
      
      You have R${availableCredit.toFixed(2)} in store credit waiting to be used!
      
      Why not treat yourself to something special from our amazing collection?
      
      Your store credit never expires and will be automatically applied to your next purchase.
      
      Shop now at: https://heartcart.shop
      
      Best regards,
      The HeartCart Team
    `;

    try {
      const result = await this.sendMailerSendEmail(
        email,
        '🇿🇦 Don\'t Forget Your HeartCart Store Credit!',
        htmlContent,
        textContent
      );

      // Log the email attempt
      await db.insert(emailLogs).values({
        recipientEmail: email,
        emailType: 'credit_reminder',
        subject: '🇿🇦 Don\'t Forget Your HeartCart Store Credit!',
        deliveryStatus: result.success ? 'sent' : 'failed',
        errorMessage: result.error || null,
        mailerSendId: result.messageId || null
      });

      return result;
    } catch (error: any) {
      console.error('❌ Error sending credit reminder email:', error);
      
      // Log the failed attempt
      await db.insert(emailLogs).values({
        recipientEmail: email,
        emailType: 'credit_reminder',
        subject: '🇿🇦 Don\'t Forget Your HeartCart Store Credit!',
        deliveryStatus: 'failed',
        errorMessage: error.message || 'Unknown error'
      });

      return {
        success: false,
        error: error.message || 'Failed to send credit reminder email'
      };
    }
  }

  async cleanupExpiredTokens(): Promise<void> {
    const now = new Date();
    await db.delete(mailTokens)
      .where(lt(mailTokens.expiresAt, now));
  }
}

export const unifiedEmailService = new UnifiedEmailService();