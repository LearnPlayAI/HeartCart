import nodemailer from 'nodemailer';
import { logger } from './logger';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface AbandonedCartEmailData {
  customerName: string;
  customerEmail: string;
  cartItems: Array<{
    name: string;
    price: string;
    quantity: number;
    imageUrl?: string;
  }>;
  cartTotal: string;
  recoveryLink: string;
  discountCode?: string;
  discountPercentage?: number;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured = false;

  constructor() {
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    try {
      // SMTP configuration for TeeMeYou using smtp.ionos.com:587
      const config: EmailConfig = {
        host: process.env.SMTP_HOST || 'smtp.ionos.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false, // TLS on port 587
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || ''
        }
      };

      if (!config.auth.user || !config.auth.pass) {
        logger.warn('SMTP credentials not configured. Email service disabled.');
        return;
      }

      this.transporter = nodemailer.createTransporter(config);
      
      // Verify connection
      await this.transporter.verify();
      this.isConfigured = true;
      logger.info('Email service configured successfully');
    } catch (error) {
      logger.error('Failed to configure email service', { error });
      this.isConfigured = false;
    }
  }

  public isReady(): boolean {
    return this.isConfigured && this.transporter !== null;
  }

  /**
   * Send abandoned cart recovery email
   */
  public async sendAbandonedCartEmail(data: AbandonedCartEmailData): Promise<boolean> {
    if (!this.isReady()) {
      logger.error('Email service not configured');
      return false;
    }

    try {
      const emailHtml = this.generateAbandonedCartHtml(data);
      const emailText = this.generateAbandonedCartText(data);

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@teemeyou.shop',
        to: data.customerEmail,
        subject: data.discountCode 
          ? `Don't miss out! Complete your order and save ${data.discountPercentage}%`
          : 'You left something in your cart - Complete your purchase',
        html: emailHtml,
        text: emailText
      };

      const info = await this.transporter!.sendMail(mailOptions);
      logger.info('Abandoned cart email sent successfully', { 
        messageId: info.messageId,
        customerEmail: data.customerEmail,
        hasDiscount: !!data.discountCode
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to send abandoned cart email', { 
        error, 
        customerEmail: data.customerEmail 
      });
      return false;
    }
  }

  /**
   * Generate HTML template for abandoned cart email
   */
  private generateAbandonedCartHtml(data: AbandonedCartEmailData): string {
    const discountSection = data.discountCode ? `
      <div style="background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
        <h3 style="color: #92400e; margin: 0 0 10px 0;">🎉 Special Offer Just For You!</h3>
        <p style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">
          Complete your purchase and save <strong>${data.discountPercentage}%</strong>
        </p>
        <p style="color: #92400e; margin: 0; font-size: 14px;">
          Use code: <strong style="background-color: #fbbf24; padding: 4px 8px; border-radius: 4px;">${data.discountCode}</strong>
        </p>
      </div>
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Complete Your Purchase - TeeMeYou</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #ec4899 0%, #be185d 100%); padding: 30px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">TeeMeYou</h1>
            <p style="color: #fce7f3; margin: 10px 0 0 0; font-size: 16px;">Don't let your favorites slip away!</p>
          </div>

          <!-- Content -->
          <div style="padding: 30px 20px;">
            <h2 style="color: #1f2937; margin: 0 0 20px 0;">Hi ${data.customerName},</h2>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              You left some amazing items in your cart! We've saved them for you, but they're in high demand and might not be available much longer.
            </p>

            ${discountSection}

            <!-- Cart Items -->
            <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #1f2937; margin: 0 0 20px 0; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">Your Cart</h3>
              
              ${data.cartItems.map(item => `
                <div style="display: flex; align-items: center; padding: 15px 0; border-bottom: 1px solid #f3f4f6;">
                  ${item.imageUrl ? `
                    <img src="${item.imageUrl}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px; margin-right: 15px;">
                  ` : ''}
                  <div style="flex: 1;">
                    <h4 style="margin: 0 0 5px 0; color: #1f2937; font-size: 16px;">${item.name}</h4>
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">
                      Quantity: ${item.quantity} × R${item.price}
                    </p>
                  </div>
                </div>
              `).join('')}
              
              <div style="text-align: right; padding: 15px 0 0 0;">
                <p style="margin: 0; font-size: 18px; font-weight: bold; color: #1f2937;">
                  Total: R${data.cartTotal}
                </p>
              </div>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.recoveryLink}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #be185d 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                Complete My Purchase
              </a>
            </div>

            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0; text-align: center;">
              This link will expire in 48 hours. If you no longer wish to receive these emails, 
              <a href="#" style="color: #ec4899;">unsubscribe here</a>.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 12px;">
              © 2024 TeeMeYou. All rights reserved.<br>
              Making fashion accessible for everyone.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate plain text version for abandoned cart email
   */
  private generateAbandonedCartText(data: AbandonedCartEmailData): string {
    const discountText = data.discountCode ? `
SPECIAL OFFER: Complete your purchase and save ${data.discountPercentage}%!
Use code: ${data.discountCode}

` : '';

    const cartItems = data.cartItems.map(item => 
      `- ${item.name} (Qty: ${item.quantity}) - R${item.price}`
    ).join('\n');

    return `
Hi ${data.customerName},

You left some amazing items in your cart! We've saved them for you, but they're in high demand and might not be available much longer.

${discountText}YOUR CART:
${cartItems}

Total: R${data.cartTotal}

Complete your purchase: ${data.recoveryLink}

This link will expire in 48 hours.

Thanks,
The TeeMeYou Team

© 2024 TeeMeYou. All rights reserved.
Making fashion accessible for everyone.
    `.trim();
  }

  /**
   * Send order confirmation email
   */
  public async sendOrderConfirmation(orderData: any): Promise<boolean> {
    if (!this.isReady()) {
      logger.error('Email service not configured');
      return false;
    }

    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@teemeyou.shop',
        to: orderData.customerEmail,
        subject: `Order Confirmation #${orderData.orderNumber} - TeeMeYou`,
        html: this.generateOrderConfirmationHtml(orderData),
        text: this.generateOrderConfirmationText(orderData)
      };

      const info = await this.transporter!.sendMail(mailOptions);
      logger.info('Order confirmation email sent successfully', { 
        messageId: info.messageId,
        orderNumber: orderData.orderNumber
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to send order confirmation email', { error });
      return false;
    }
  }

  private generateOrderConfirmationHtml(orderData: any): string {
    // Implementation for order confirmation HTML
    return `<p>Order confirmation for order #${orderData.orderNumber}</p>`;
  }

  private generateOrderConfirmationText(orderData: any): string {
    // Implementation for order confirmation text
    return `Order confirmation for order #${orderData.orderNumber}`;
  }
}

export const emailService = new EmailService();