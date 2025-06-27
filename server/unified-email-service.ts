/**
 * Unified Email Service - Simplified Implementation
 * Handles all email communications for TeeMeYou platform
 */

import { MailerSend, EmailParams, Sender, Recipient, Attachment } from "mailersend";
import { logger } from "./logger";
import fs from "fs";

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface UserEmailData {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

interface OrderEmailData {
  id: number;
  orderNumber: string;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostalCode: string;
  shippingMethod: string;
  shippingCost: number;
  paymentMethod: string;
  paymentStatus: string;
  subtotalAmount: number;
  totalAmount: number;
  createdAt: string;
  trackingNumber?: string;
  orderItems: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

interface PaymentEmailData {
  orderNumber: string;
  amount: number;
  paymentMethod: string;
  transactionReference?: string;
  paymentDate: string;
}

class UnifiedEmailService {
  private mailerSend: MailerSend | null = null;
  private isConfigured = false;
  private fromEmail = "sales@teemeyou.shop";
  private fromName = "TeeMeYou";
  private baseUrl = "https://teemeyou.shop";

  constructor() {
    this.initializeMailerSend();
  }

  private initializeMailerSend() {
    try {
      const apiKey = process.env.MAILERSEND_API_KEY;
      
      if (!apiKey) {
        logger.warn('MailerSend API key not configured. Email service disabled.');
        return;
      }

      this.mailerSend = new MailerSend({
        apiKey: apiKey,
      });

      this.isConfigured = true;
      logger.info('MailerSend email service configured successfully');
    } catch (error) {
      logger.error('Failed to configure MailerSend service', { error });
      this.isConfigured = false;
    }
  }

  public isReady(): boolean {
    return this.isConfigured && this.mailerSend !== null;
  }

  private async sendEmail(template: EmailTemplate, recipientEmail: string, recipientName: string, attachments?: Attachment[]): Promise<boolean> {
    if (!this.isReady() || !this.mailerSend) {
      logger.error('MailerSend service not configured');
      return false;
    }

    try {
      const sentFrom = new Sender(this.fromEmail, this.fromName);
      const recipients = [new Recipient(recipientEmail, recipientName)];

      const emailParams = new EmailParams()
        .setFrom(sentFrom)
        .setTo(recipients)
        .setReplyTo(sentFrom)
        .setSubject(template.subject)
        .setHtml(template.html)
        .setText(template.text);

      if (attachments && attachments.length > 0) {
        emailParams.setAttachments(attachments);
      }

      await this.mailerSend.email.send(emailParams);
      return true;
    } catch (error) {
      logger.error('Failed to send email', { error, recipientEmail });
      return false;
    }
  }

  /**
   * Send account verification email
   */
  public async sendAccountVerificationEmail(userData: UserEmailData, verificationToken: string): Promise<boolean> {
    const displayName = userData.firstName || userData.username;
    const verificationUrl = `${this.baseUrl}/verify-email?token=${verificationToken}`;

    const template: EmailTemplate = {
      subject: "Verify Your TeeMeYou Account",
      html: this.generateAccountVerificationHtml(displayName, verificationUrl),
      text: this.generateAccountVerificationText(displayName, verificationUrl)
    };

    const result = await this.sendEmail(template, userData.email, displayName);
    
    if (result) {
      logger.info('Account verification email sent successfully', {
        userId: userData.id,
        email: userData.email
      });
    }
    
    return result;
  }

  /**
   * Send password reset email
   */
  public async sendPasswordResetEmail(userData: UserEmailData, resetToken: string): Promise<boolean> {
    const displayName = userData.firstName || userData.username;
    const resetUrl = `${this.baseUrl}/reset-password?token=${resetToken}`;

    const template: EmailTemplate = {
      subject: "Reset Your TeeMeYou Password",
      html: this.generatePasswordResetHtml(displayName, resetUrl),
      text: this.generatePasswordResetText(displayName, resetUrl)
    };

    const result = await this.sendEmail(template, userData.email, displayName);
    
    if (result) {
      logger.info('Password reset email sent successfully', {
        userId: userData.id,
        email: userData.email
      });
    }
    
    return result;
  }

  /**
   * Send payment received notification
   */
  public async sendPaymentReceivedEmail(orderData: OrderEmailData, paymentData: PaymentEmailData): Promise<boolean> {
    const template: EmailTemplate = {
      subject: `Payment Received - Order #${orderData.orderNumber}`,
      html: this.generatePaymentReceivedHtml(orderData, paymentData),
      text: this.generatePaymentReceivedText(orderData, paymentData)
    };

    const result = await this.sendEmail(template, orderData.customerEmail, orderData.customerName);
    
    if (result) {
      logger.info('Payment received email sent successfully', {
        orderId: orderData.id,
        orderNumber: orderData.orderNumber,
        email: orderData.customerEmail
      });
    }
    
    return result;
  }

  /**
   * Send order status update email
   */
  public async sendOrderStatusUpdateEmail(orderData: OrderEmailData, previousStatus: string): Promise<boolean> {
    const template: EmailTemplate = {
      subject: `Order Update - #${orderData.orderNumber} is now ${orderData.status.charAt(0).toUpperCase() + orderData.status.slice(1)}`,
      html: this.generateOrderStatusUpdateHtml(orderData, previousStatus),
      text: this.generateOrderStatusUpdateText(orderData, previousStatus)
    };

    const result = await this.sendEmail(template, orderData.customerEmail, orderData.customerName);
    
    if (result) {
      logger.info('Order status update email sent successfully', {
        orderId: orderData.id,
        orderNumber: orderData.orderNumber,
        status: orderData.status,
        email: orderData.customerEmail
      });
    }
    
    return result;
  }

  /**
   * Send invoice email with PDF attachment
   */
  public async sendInvoiceEmail(orderData: OrderEmailData, invoicePdfPath?: string): Promise<boolean> {
    const template: EmailTemplate = {
      subject: `Invoice for Order #${orderData.orderNumber}`,
      html: this.generateInvoiceHtml(orderData),
      text: this.generateInvoiceText(orderData)
    };

    let attachments: Attachment[] = [];
    if (invoicePdfPath && fs.existsSync(invoicePdfPath)) {
      try {
        const pdfContent = fs.readFileSync(invoicePdfPath, { encoding: 'base64' });
        const filename = `invoice-${orderData.orderNumber}.pdf`;
        attachments.push(new Attachment(pdfContent, filename, 'attachment'));
      } catch (error) {
        logger.warn('Failed to attach invoice PDF', { error, invoicePdfPath });
      }
    }

    const result = await this.sendEmail(template, orderData.customerEmail, orderData.customerName, attachments);
    
    if (result) {
      logger.info('Invoice email sent successfully', {
        orderId: orderData.id,
        orderNumber: orderData.orderNumber,
        email: orderData.customerEmail,
        hasAttachment: attachments.length > 0
      });
    }
    
    return result;
  }

  // Template generation methods
  private generateAccountVerificationHtml(displayName: string, verificationUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Account</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #FF69B4, #FF1493); color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .button { display: inline-block; background: #FF69B4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Welcome to TeeMeYou!</h1>
        </div>
        <div class="content">
          <p>Hi ${displayName},</p>
          <p>Thank you for creating an account with TeeMeYou! To complete your registration and start shopping, please verify your email address by clicking the button below:</p>
          <p style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verify My Account</a>
          </p>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #007bff;">${verificationUrl}</p>
          <p>This verification link will expire in 24 hours for security purposes.</p>
          <p>If you didn't create this account, please ignore this email.</p>
          <p>Happy shopping!<br>The TeeMeYou Team</p>
        </div>
        <div class="footer">
          <p>&copy; 2025 TeeMeYou. All rights reserved.</p>
          <p>Visit us at <a href="${this.baseUrl}">${this.baseUrl}</a></p>
        </div>
      </body>
      </html>
    `;
  }

  private generateAccountVerificationText(displayName: string, verificationUrl: string): string {
    return `
      Welcome to TeeMeYou!
      
      Hi ${displayName},
      
      Thank you for creating an account with TeeMeYou! To complete your registration and start shopping, please verify your email address by visiting this link:
      
      ${verificationUrl}
      
      This verification link will expire in 24 hours for security purposes.
      
      If you didn't create this account, please ignore this email.
      
      Happy shopping!
      The TeeMeYou Team
      
      © 2025 TeeMeYou. All rights reserved.
      Visit us at ${this.baseUrl}
    `;
  }

  private generatePasswordResetHtml(displayName: string, resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #FF69B4, #FF1493); color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .button { display: inline-block; background: #FF69B4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <p>Hi ${displayName},</p>
          <p>We received a request to reset your TeeMeYou account password. Click the button below to create a new password:</p>
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset My Password</a>
          </p>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #007bff;">${resetUrl}</p>
          <div class="warning">
            <strong>Security Notice:</strong> This password reset link will expire in 1 hour for your security. If you didn't request this password reset, please ignore this email and your password will remain unchanged.
          </div>
          <p>Need help? Contact our support team at ${this.fromEmail}</p>
          <p>Best regards,<br>The TeeMeYou Team</p>
        </div>
        <div class="footer">
          <p>&copy; 2025 TeeMeYou. All rights reserved.</p>
          <p>Visit us at <a href="${this.baseUrl}">${this.baseUrl}</a></p>
        </div>
      </body>
      </html>
    `;
  }

  private generatePasswordResetText(displayName: string, resetUrl: string): string {
    return `
      Password Reset Request
      
      Hi ${displayName},
      
      We received a request to reset your TeeMeYou account password. Visit this link to create a new password:
      
      ${resetUrl}
      
      SECURITY NOTICE: This password reset link will expire in 1 hour for your security. If you didn't request this password reset, please ignore this email and your password will remain unchanged.
      
      Need help? Contact our support team at ${this.fromEmail}
      
      Best regards,
      The TeeMeYou Team
      
      © 2025 TeeMeYou. All rights reserved.
      Visit us at ${this.baseUrl}
    `;
  }

  private generatePaymentReceivedHtml(orderData: OrderEmailData, paymentData: PaymentEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Received</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #FF69B4, #FF1493); color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .success-box { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .order-details { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
          .button { display: inline-block; background: #FF69B4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Payment Received!</h1>
        </div>
        <div class="content">
          <p>Hi ${orderData.customerName},</p>
          <div class="success-box">
            <strong>Great news!</strong> We've received your payment for order #${orderData.orderNumber}. Your order is now being processed.
          </div>
          <div class="order-details">
            <h3>Payment Details</h3>
            <p><strong>Order Number:</strong> ${orderData.orderNumber}</p>
            <p><strong>Payment Amount:</strong> R${paymentData.amount.toFixed(2)}</p>
            <p><strong>Payment Method:</strong> ${paymentData.paymentMethod.toUpperCase()}</p>
            <p><strong>Payment Date:</strong> ${new Date(paymentData.paymentDate).toLocaleDateString('en-ZA')}</p>
            ${paymentData.transactionReference ? `<p><strong>Transaction Reference:</strong> ${paymentData.transactionReference}</p>` : ''}
          </div>
          <p>Your order is now in our processing queue. You'll receive another email with tracking information once your items are shipped.</p>
          <p style="text-align: center;">
            <a href="${this.baseUrl}/orders/${orderData.id}" class="button">Track Your Order</a>
          </p>
          <p>Thank you for choosing TeeMeYou!</p>
          <p>Best regards,<br>The TeeMeYou Team</p>
        </div>
        <div class="footer">
          <p>&copy; 2025 TeeMeYou. All rights reserved.</p>
          <p>Visit us at <a href="${this.baseUrl}">${this.baseUrl}</a></p>
        </div>
      </body>
      </html>
    `;
  }

  private generatePaymentReceivedText(orderData: OrderEmailData, paymentData: PaymentEmailData): string {
    return `
      Payment Received!
      
      Hi ${orderData.customerName},
      
      Great news! We've received your payment for order #${orderData.orderNumber}. Your order is now being processed.
      
      Payment Details:
      - Order Number: ${orderData.orderNumber}
      - Payment Amount: R${paymentData.amount.toFixed(2)}
      - Payment Method: ${paymentData.paymentMethod.toUpperCase()}
      - Payment Date: ${new Date(paymentData.paymentDate).toLocaleDateString('en-ZA')}
      ${paymentData.transactionReference ? `- Transaction Reference: ${paymentData.transactionReference}` : ''}
      
      Your order is now in our processing queue. You'll receive another email with tracking information once your items are shipped.
      
      Track your order: ${this.baseUrl}/orders/${orderData.id}
      
      Thank you for choosing TeeMeYou!
      
      Best regards,
      The TeeMeYou Team
      
      © 2025 TeeMeYou. All rights reserved.
      Visit us at ${this.baseUrl}
    `;
  }

  private generateOrderStatusUpdateHtml(orderData: OrderEmailData, previousStatus: string): string {
    const statusMessages: Record<string, string> = {
      'pending': 'Your order has been placed and is awaiting payment.',
      'paid': 'Payment confirmed! Your order is being prepared.',
      'processing': 'Your order is being processed and prepared for shipment.',
      'shipped': 'Great news! Your order has been shipped.',
      'delivered': 'Your order has been delivered successfully.',
      'cancelled': 'Your order has been cancelled.'
    };

    const currentStatusMessage = statusMessages[orderData.status] || 'Your order status has been updated.';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Status Update</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #FF69B4, #FF1493); color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .status-update { background: #e3f2fd; border: 1px solid #bbdefb; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .order-details { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
          .button { display: inline-block; background: #FF69B4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Order Status Update</h1>
        </div>
        <div class="content">
          <p>Hi ${orderData.customerName},</p>
          <div class="status-update">
            <h3>Status Update for Order #${orderData.orderNumber}</h3>
            <p><strong>Current Status:</strong> ${orderData.status.charAt(0).toUpperCase() + orderData.status.slice(1)}</p>
            <p>${currentStatusMessage}</p>
          </div>
          ${orderData.trackingNumber ? `
          <div class="order-details">
            <h3>Tracking Information</h3>
            <p><strong>Tracking Number:</strong> ${orderData.trackingNumber}</p>
            <p>You can track your package using this tracking number with your shipping provider.</p>
          </div>
          ` : ''}
          <div class="order-details">
            <h3>Order Summary</h3>
            <p><strong>Order Number:</strong> ${orderData.orderNumber}</p>
            <p><strong>Order Total:</strong> R${orderData.totalAmount.toFixed(2)}</p>
            <p><strong>Shipping Address:</strong> ${orderData.shippingAddress}, ${orderData.shippingCity}, ${orderData.shippingPostalCode}</p>
          </div>
          <p style="text-align: center;">
            <a href="${this.baseUrl}/orders/${orderData.id}" class="button">View Order Details</a>
          </p>
          <p>Thank you for choosing TeeMeYou!</p>
          <p>Best regards,<br>The TeeMeYou Team</p>
        </div>
        <div class="footer">
          <p>&copy; 2025 TeeMeYou. All rights reserved.</p>
          <p>Visit us at <a href="${this.baseUrl}">${this.baseUrl}</a></p>
        </div>
      </body>
      </html>
    `;
  }

  private generateOrderStatusUpdateText(orderData: OrderEmailData, previousStatus: string): string {
    const statusMessages: Record<string, string> = {
      'pending': 'Your order has been placed and is awaiting payment.',
      'paid': 'Payment confirmed! Your order is being prepared.',
      'processing': 'Your order is being processed and prepared for shipment.',
      'shipped': 'Great news! Your order has been shipped.',
      'delivered': 'Your order has been delivered successfully.',
      'cancelled': 'Your order has been cancelled.'
    };

    const currentStatusMessage = statusMessages[orderData.status] || 'Your order status has been updated.';

    return `
      Order Status Update
      
      Hi ${orderData.customerName},
      
      Status Update for Order #${orderData.orderNumber}
      Current Status: ${orderData.status.charAt(0).toUpperCase() + orderData.status.slice(1)}
      
      ${currentStatusMessage}
      
      ${orderData.trackingNumber ? `
      Tracking Information:
      Tracking Number: ${orderData.trackingNumber}
      You can track your package using this tracking number with your shipping provider.
      ` : ''}
      
      Order Summary:
      - Order Number: ${orderData.orderNumber}
      - Order Total: R${orderData.totalAmount.toFixed(2)}
      - Shipping Address: ${orderData.shippingAddress}, ${orderData.shippingCity}, ${orderData.shippingPostalCode}
      
      View order details: ${this.baseUrl}/orders/${orderData.id}
      
      Thank you for choosing TeeMeYou!
      
      Best regards,
      The TeeMeYou Team
      
      © 2025 TeeMeYou. All rights reserved.
      Visit us at ${this.baseUrl}
    `;
  }

  private generateInvoiceHtml(orderData: OrderEmailData): string {
    const itemsHtml = orderData.orderItems.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.productName}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">R${item.unitPrice.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">R${item.totalPrice.toFixed(2)}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #FF69B4, #FF1493); color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .invoice-details { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .items-table th { background: #e9ecef; padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
          .total-row { font-weight: bold; background: #e9ecef; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Invoice</h1>
          <p>Order #${orderData.orderNumber}</p>
        </div>
        <div class="content">
          <div class="invoice-details">
            <h3>Invoice Details</h3>
            <p><strong>Order Number:</strong> ${orderData.orderNumber}</p>
            <p><strong>Order Date:</strong> ${new Date(orderData.createdAt).toLocaleDateString('en-ZA')}</p>
            <p><strong>Customer:</strong> ${orderData.customerName}</p>
            <p><strong>Email:</strong> ${orderData.customerEmail}</p>
            <p><strong>Phone:</strong> ${orderData.customerPhone}</p>
          </div>
          
          <div class="invoice-details">
            <h3>Shipping Address</h3>
            <p>${orderData.shippingAddress}<br>
            ${orderData.shippingCity}, ${orderData.shippingPostalCode}</p>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Unit Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr>
                <td colspan="3" style="padding: 8px; text-align: right; font-weight: bold;">Subtotal:</td>
                <td style="padding: 8px; text-align: right; font-weight: bold;">R${orderData.subtotalAmount.toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="3" style="padding: 8px; text-align: right; font-weight: bold;">Shipping:</td>
                <td style="padding: 8px; text-align: right; font-weight: bold;">R${orderData.shippingCost.toFixed(2)}</td>
              </tr>
              <tr class="total-row">
                <td colspan="3" style="padding: 12px; text-align: right; font-weight: bold;">Total:</td>
                <td style="padding: 12px; text-align: right; font-weight: bold;">R${orderData.totalAmount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <p>Thank you for your business!</p>
          <p>Best regards,<br>The TeeMeYou Team</p>
        </div>
        <div class="footer">
          <p>&copy; 2025 TeeMeYou. All rights reserved.</p>
          <p>Visit us at <a href="${this.baseUrl}">${this.baseUrl}</a></p>
        </div>
      </body>
      </html>
    `;
  }

  private generateInvoiceText(orderData: OrderEmailData): string {
    const itemsText = orderData.orderItems.map(item => 
      `${item.productName} (Qty: ${item.quantity}) - R${item.unitPrice.toFixed(2)} each = R${item.totalPrice.toFixed(2)}`
    ).join('\n');

    return `
      INVOICE - Order #${orderData.orderNumber}
      
      Invoice Details:
      - Order Number: ${orderData.orderNumber}
      - Order Date: ${new Date(orderData.createdAt).toLocaleDateString('en-ZA')}
      - Customer: ${orderData.customerName}
      - Email: ${orderData.customerEmail}
      - Phone: ${orderData.customerPhone}
      
      Shipping Address:
      ${orderData.shippingAddress}
      ${orderData.shippingCity}, ${orderData.shippingPostalCode}
      
      Order Items:
      ${itemsText}
      
      Subtotal: R${orderData.subtotalAmount.toFixed(2)}
      Shipping: R${orderData.shippingCost.toFixed(2)}
      TOTAL: R${orderData.totalAmount.toFixed(2)}
      
      Thank you for your business!
      
      Best regards,
      The TeeMeYou Team
      
      © 2025 TeeMeYou. All rights reserved.
      Visit us at ${this.baseUrl}
    `;
  }
}

// Export singleton instance
export const unifiedEmailService = new UnifiedEmailService();
export { UnifiedEmailService, UserEmailData, OrderEmailData, PaymentEmailData };