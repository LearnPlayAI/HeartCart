import crypto from 'crypto';
import { storage } from './storage';
import { logger } from './logger';
import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';
import type { InsertMailToken, InsertEmailLog } from '@shared/schema';

// Types for email templates
export interface VerificationEmailData {
  email: string;
  username: string;
  verificationUrl: string;
}

export interface PasswordResetEmailData {
  email: string;
  username: string;
  resetUrl: string;
}

export interface PaymentConfirmationEmailData {
  email: string;
  customerName: string;
  orderNumber: string;
  amount: number;
  currency: string;
  paymentMethod: string;
}

export interface OrderStatusEmailData {
  email: string;
  customerName: string;
  orderNumber: string;
  status: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
}

export interface InvoiceEmailData {
  email: string;
  customerName: string;
  orderNumber: string;
  invoiceUrl: string;
  amount: number;
  currency: string;
}

/**
 * Database-driven email service using MailerSend
 * All tokens and email logs are stored in PostgreSQL database
 */
export class DatabaseEmailService {
  private mailerSend: MailerSend;
  private sender: Sender;

  constructor() {
    if (!process.env.MAILERSEND_API_KEY) {
      throw new Error('MAILERSEND_API_KEY environment variable is required');
    }

    this.mailerSend = new MailerSend({
      apiKey: process.env.MAILERSEND_API_KEY,
    });

    this.sender = new Sender('sales@teemeyou.shop', 'TeeMeYou Support');
    logger.info('DatabaseEmailService initialized with MailerSend');
  }

  /**
   * Generate a secure token and its hash
   */
  private generateToken(): { token: string; hash: string } {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    return { token, hash };
  }

  /**
   * Clean up expired tokens periodically
   */
  async cleanupExpiredTokens(): Promise<void> {
    try {
      const deletedCount = await storage.deleteExpiredTokens();
      if (deletedCount > 0) {
        logger.info(`Cleaned up ${deletedCount} expired tokens`);
      }
    } catch (error) {
      logger.error('Error cleaning up expired tokens', { error });
    }
  }

  /**
   * Send account verification email
   */
  async sendVerificationEmail(userId: number, email: string, username: string): Promise<string> {
    try {
      // Clean up any existing verification tokens for this user
      await storage.cleanupUserTokens(userId, 'verification');

      // Generate new token
      const { token, hash } = this.generateToken();
      const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 hours server-side

      // Store token in database
      const tokenData: InsertMailToken = {
        userId,
        email,
        tokenHash: hash,
        tokenType: 'verification',
        expiresAt,
        isActive: true
      };

      await storage.createMailToken(tokenData);

      // Create verification URL
      const verificationUrl = `https://teemeyou.shop/verify-email?token=${token}`;

      // Email content
      const emailParams = new EmailParams()
        .setFrom(this.sender)
        .setTo([new Recipient(email, username)])
        .setSubject('Verify Your TeeMeYou Account')
        .setHtml(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your Account - TeeMeYou</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to TeeMeYou!</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
              <h2 style="color: #495057; margin-top: 0;">Hello ${username}!</h2>
              
              <p style="font-size: 16px; margin-bottom: 25px;">
                Thank you for joining TeeMeYou! Please verify your email address to activate your account and start shopping.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 8px; 
                          font-weight: bold; 
                          font-size: 16px; 
                          display: inline-block;
                          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                  Verify My Account
                </a>
              </div>
              
              <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
                This verification link will expire in 1 hour for security reasons.
              </p>
              
              <p style="color: #6c757d; font-size: 14px;">
                If you didn't create an account with TeeMeYou, please ignore this email.
              </p>
              
              <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
              
              <p style="color: #6c757d; font-size: 12px; text-align: center; margin-bottom: 0;">
                Best regards,<br>
                The TeeMeYou Team<br>
                <a href="https://teemeyou.shop" style="color: #667eea;">teemeyou.shop</a>
              </p>
            </div>
          </body>
          </html>
        `)
        .setText(`
          Welcome to TeeMeYou!
          
          Hello ${username}!
          
          Thank you for joining TeeMeYou! Please verify your email address to activate your account.
          
          Click here to verify: ${verificationUrl}
          
          This verification link will expire in 1 hour for security reasons.
          
          If you didn't create an account with TeeMeYou, please ignore this email.
          
          Best regards,
          The TeeMeYou Team
          https://teemeyou.shop
        `);

      // Send email
      const response = await this.mailerSend.email.send(emailParams);
      
      // Log email with proper response handling
      const emailLogData: InsertEmailLog = {
        userId,
        recipientEmail: email,
        emailType: 'verification',
        subject: 'Verify Your TeeMeYou Account',
        deliveryStatus: response.statusCode === 202 ? 'sent' : 'failed',
        mailerSendId: response.body?.message_id || null,
        errorMessage: response.statusCode !== 202 ? `HTTP ${response.statusCode}` : null
      };

      await storage.logEmail(emailLogData);
      
      if (response.statusCode === 202) {
        logger.info('Verification email sent successfully', { 
          userId, 
          email,
          messageId: response.body?.message_id 
        });
        return token;
      } else {
        throw new Error(`Email send failed with status ${response.statusCode}`);
      }
    } catch (error) {
      logger.error('Error sending verification email', { error, userId, email });
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(userId: number, email: string, username: string): Promise<string> {
    try {
      // Clean up any existing password reset tokens for this user
      await storage.cleanupUserTokens(userId, 'password_reset');

      // Generate new token
      const { token, hash } = this.generateToken();
      const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 hours server-side

      // Store token in database
      const tokenData: InsertMailToken = {
        userId,
        email,
        tokenHash: hash,
        tokenType: 'password_reset',
        expiresAt,
        isActive: true
      };

      await storage.createMailToken(tokenData);

      // Create reset URL
      const resetUrl = `https://teemeyou.shop/reset-password?token=${token}`;

      // Email content
      const emailParams = new EmailParams()
        .setFrom(this.sender)
        .setTo([new Recipient(email, username)])
        .setSubject('Reset Your TeeMeYou Password')
        .setHtml(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password - TeeMeYou</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
              <h2 style="color: #495057; margin-top: 0;">Hello ${username}!</h2>
              
              <p style="font-size: 16px; margin-bottom: 25px;">
                We received a request to reset the password for your TeeMeYou account. Click the button below to create a new password.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 8px; 
                          font-weight: bold; 
                          font-size: 16px; 
                          display: inline-block;
                          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                  Reset My Password
                </a>
              </div>
              
              <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
                This password reset link will expire in 1 hour for security reasons.
              </p>
              
              <p style="color: #6c757d; font-size: 14px;">
                If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
              </p>
              
              <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
              
              <p style="color: #6c757d; font-size: 12px; text-align: center; margin-bottom: 0;">
                Best regards,<br>
                The TeeMeYou Team<br>
                <a href="https://teemeyou.shop" style="color: #667eea;">teemeyou.shop</a>
              </p>
            </div>
          </body>
          </html>
        `)
        .setText(`
          Password Reset - TeeMeYou
          
          Hello ${username}!
          
          We received a request to reset the password for your TeeMeYou account.
          
          Click here to reset your password: ${resetUrl}
          
          This password reset link will expire in 1 hour for security reasons.
          
          If you didn't request a password reset, please ignore this email.
          
          Best regards,
          The TeeMeYou Team
          https://teemeyou.shop
        `);

      // Send email
      const response = await this.mailerSend.email.send(emailParams);
      
      // Log email with proper response handling
      const emailLogData: InsertEmailLog = {
        userId,
        recipientEmail: email,
        emailType: 'password_reset',
        subject: 'Reset Your TeeMeYou Password',
        deliveryStatus: response.statusCode === 202 ? 'sent' : 'failed',
        mailerSendId: response.body?.message_id || null,
        errorMessage: response.statusCode !== 202 ? `HTTP ${response.statusCode}` : null
      };

      await storage.logEmail(emailLogData);
      
      if (response.statusCode === 202) {
        logger.info('Password reset email sent successfully', { 
          userId, 
          email,
          messageId: response.body?.message_id 
        });
        return token;
      } else {
        throw new Error(`Email send failed with status ${response.statusCode}`);
      }
    } catch (error) {
      logger.error('Error sending password reset email', { error, userId, email });
      throw error;
    }
  }

  /**
   * Verify a token from the database
   */
  async verifyToken(token: string, tokenType: string): Promise<{ valid: boolean; userId?: number; email?: string }> {
    try {
      const hash = crypto.createHash('sha256').update(token).digest('hex');
      const dbToken = await storage.getMailTokenByHash(hash);

      if (!dbToken) {
        return { valid: false };
      }

      // Check if token is active, not expired, and correct type
      const now = new Date();
      const isValid = dbToken.isActive && 
                     dbToken.expiresAt > now && 
                     dbToken.tokenType === tokenType &&
                     !dbToken.usedAt; // Token hasn't been used

      if (!isValid) {
        return { valid: false };
      }

      return {
        valid: true,
        userId: dbToken.userId,
        email: dbToken.email
      };
    } catch (error) {
      logger.error('Error verifying token', { error, tokenType });
      return { valid: false };
    }
  }

  /**
   * Mark a token as used (one-time use)
   */
  async useToken(token: string): Promise<boolean> {
    try {
      const hash = crypto.createHash('sha256').update(token).digest('hex');
      return await storage.markTokenUsed(hash);
    } catch (error) {
      logger.error('Error marking token as used', { error });
      return false;
    }
  }

  /**
   * Send payment confirmation email
   */
  async sendPaymentConfirmationEmail(data: PaymentConfirmationEmailData): Promise<void> {
    try {
      const emailParams = new EmailParams()
        .setFrom(this.sender)
        .setTo([new Recipient(data.email, data.customerName)])
        .setSubject(`Payment Confirmed - Order ${data.orderNumber}`)
        .setHtml(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Payment Confirmed - TeeMeYou</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Payment Confirmed!</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
              <h2 style="color: #495057; margin-top: 0;">Thank you, ${data.customerName}!</h2>
              
              <p style="font-size: 16px; margin-bottom: 25px;">
                Your payment has been successfully processed. Here are your payment details:
              </p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #dee2e6; margin: 25px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Order Number:</td>
                    <td style="padding: 8px 0;">${data.orderNumber}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Amount:</td>
                    <td style="padding: 8px 0;">${data.currency} ${data.amount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Payment Method:</td>
                    <td style="padding: 8px 0;">${data.paymentMethod}</td>
                  </tr>
                </table>
              </div>
              
              <p style="font-size: 16px; margin: 25px 0;">
                We're now processing your order and will send you a shipping confirmation once your items are on their way.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://teemeyou.shop/orders" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 8px; 
                          font-weight: bold; 
                          font-size: 16px; 
                          display: inline-block;
                          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                  Track Your Order
                </a>
              </div>
              
              <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
              
              <p style="color: #6c757d; font-size: 12px; text-align: center; margin-bottom: 0;">
                Best regards,<br>
                The TeeMeYou Team<br>
                <a href="https://teemeyou.shop" style="color: #667eea;">teemeyou.shop</a>
              </p>
            </div>
          </body>
          </html>
        `);

      await this.mailerSend.email.send(emailParams);
      
      logger.info('Payment confirmation email sent successfully', { 
        email: data.email,
        orderNumber: data.orderNumber 
      });
    } catch (error) {
      logger.error('Error sending payment confirmation email', { error, data });
      throw error;
    }
  }

  /**
   * Send order status update email
   */
  async sendOrderStatusEmail(data: OrderStatusEmailData): Promise<void> {
    try {
      const emailParams = new EmailParams()
        .setFrom(this.sender)
        .setTo([new Recipient(data.email, data.customerName)])
        .setSubject(`Order Update - ${data.orderNumber}`)
        .setHtml(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Order Update - TeeMeYou</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Order Update</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
              <h2 style="color: #495057; margin-top: 0;">Hello ${data.customerName}!</h2>
              
              <p style="font-size: 16px; margin-bottom: 25px;">
                Your order ${data.orderNumber} status has been updated to: <strong>${data.status}</strong>
              </p>
              
              ${data.trackingNumber ? `
                <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #dee2e6; margin: 25px 0;">
                  <p style="margin: 0; font-weight: bold;">Tracking Number:</p>
                  <p style="margin: 5px 0 0 0; font-size: 18px; color: #667eea;">${data.trackingNumber}</p>
                </div>
              ` : ''}
              
              ${data.estimatedDelivery ? `
                <p style="font-size: 16px; margin: 25px 0;">
                  <strong>Estimated Delivery:</strong> ${data.estimatedDelivery}
                </p>
              ` : ''}
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://teemeyou.shop/orders" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 8px; 
                          font-weight: bold; 
                          font-size: 16px; 
                          display: inline-block;
                          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                  View Order Details
                </a>
              </div>
              
              <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
              
              <p style="color: #6c757d; font-size: 12px; text-align: center; margin-bottom: 0;">
                Best regards,<br>
                The TeeMeYou Team<br>
                <a href="https://teemeyou.shop" style="color: #667eea;">teemeyou.shop</a>
              </p>
            </div>
          </body>
          </html>
        `);

      await this.mailerSend.email.send(emailParams);
      
      logger.info('Order status email sent successfully', { 
        email: data.email,
        orderNumber: data.orderNumber,
        status: data.status 
      });
    } catch (error) {
      logger.error('Error sending order status email', { error, data });
      throw error;
    }
  }

  /**
   * Send invoice email
   */
  async sendInvoiceEmail(data: InvoiceEmailData): Promise<void> {
    try {
      const emailParams = new EmailParams()
        .setFrom(this.sender)
        .setTo([new Recipient(data.email, data.customerName)])
        .setSubject(`Invoice for Order ${data.orderNumber}`)
        .setHtml(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invoice - TeeMeYou</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Invoice</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
              <h2 style="color: #495057; margin-top: 0;">Hello ${data.customerName}!</h2>
              
              <p style="font-size: 16px; margin-bottom: 25px;">
                Your invoice for order ${data.orderNumber} is ready. You can download it using the link below.
              </p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #dee2e6; margin: 25px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Order Number:</td>
                    <td style="padding: 8px 0;">${data.orderNumber}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Total Amount:</td>
                    <td style="padding: 8px 0;">${data.currency} ${data.amount.toFixed(2)}</td>
                  </tr>
                </table>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.invoiceUrl}" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 8px; 
                          font-weight: bold; 
                          font-size: 16px; 
                          display: inline-block;
                          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                  Download Invoice
                </a>
              </div>
              
              <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
              
              <p style="color: #6c757d; font-size: 12px; text-align: center; margin-bottom: 0;">
                Best regards,<br>
                The TeeMeYou Team<br>
                <a href="https://teemeyou.shop" style="color: #667eea;">teemeyou.shop</a>
              </p>
            </div>
          </body>
          </html>
        `);

      await this.mailerSend.email.send(emailParams);
      
      logger.info('Invoice email sent successfully', { 
        email: data.email,
        orderNumber: data.orderNumber 
      });
    } catch (error) {
      logger.error('Error sending invoice email', { error, data });
      throw error;
    }
  }
}

// Singleton instance
export const databaseEmailService = new DatabaseEmailService();