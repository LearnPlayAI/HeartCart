/**
 * YoCo Payment Service
 * Handles YoCo API integration for credit/debit card payments
 */

import { v4 as uuidv4 } from 'uuid';

// Environment-based YoCo configuration
const YOCO_CONFIG = {
  publicKey: process.env.NODE_ENV === 'production' 
    ? process.env.YOCO_PROD_PUBLIC_KEY 
    : process.env.YOCO_TEST_PUBLIC_KEY,
  secretKey: process.env.NODE_ENV === 'production'
    ? process.env.YOCO_PROD_SECRET_KEY
    : process.env.YOCO_TEST_SECRET_KEY,
  apiUrl: 'https://payments.yoco.com/api',
  webhookSecret: process.env.YOCO_WEBHOOK_SECRET || '',
};

interface YocoCheckoutRequest {
  amount: number; // Amount in cents (ZAR)
  currency: string; // Always 'ZAR'
  cancelUrl: string;
  successUrl: string;
  failureUrl: string;
  metadata: {
    orderId: string;
    orderNumber: string;
    customerId: string;
    customerEmail: string;
  };
  totalTaxAmount?: number; // VAT amount in cents
  subtotalAmount?: number; // Subtotal in cents
  lineItems?: Array<{
    displayName: string;
    quantity: number;
    priceCents: number;
  }>;
}

interface YocoCheckoutResponse {
  id: string;
  redirectUrl: string;
  status: string;
  amount: number;
  currency: string;
  paymentId: string | null;
  metadata: Record<string, any>;
  processingMode: string;
}

interface YocoPaymentEvent {
  id: string;
  type: string;
  createdDate: string;
  payload: {
    id: string;
    type: string;
    createdDate: string;
    amount: number;
    currency: string;
    paymentMethodDetails: {
      type: string;
      card: {
        expiryMonth: number;
        expiryYear: number;
        maskedCard: string;
        scheme: string;
      };
    };
    status: string;
    mode: string;
    metadata: {
      checkoutId: string;
      orderId?: string;
      orderNumber?: string;
    };
  };
}

class YocoService {
  private baseUrl = YOCO_CONFIG.apiUrl;
  private secretKey = YOCO_CONFIG.secretKey;

  /**
   * Create a YoCo checkout session
   */
  async createCheckout(checkoutData: YocoCheckoutRequest): Promise<YocoCheckoutResponse> {
    if (!this.secretKey) {
      throw new Error('YoCo secret key not configured');
    }

    const idempotencyKey = uuidv4();
    
    const response = await fetch(`${this.baseUrl}/checkouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.secretKey}`,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(checkoutData),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('YoCo checkout creation failed:', response.status, errorData);
      throw new Error(`YoCo API Error: ${response.status} - ${errorData}`);
    }

    const result = await response.json();
    console.log('YoCo checkout created successfully:', result.id);
    
    return result;
  }

  /**
   * Calculate YoCo transaction fees
   * YoCo charges approximately 2.95% + R2.00 per transaction
   */
  calculateTransactionFees(amountInCents: number): { feeAmount: number; feePercentage: number } {
    const feePercentage = 2.95; // 2.95%
    const fixedFee = 200; // R2.00 in cents
    
    const percentageFee = Math.round((amountInCents * feePercentage) / 100);
    const totalFee = percentageFee + fixedFee;
    
    return {
      feeAmount: totalFee / 100, // Convert back to rands
      feePercentage: feePercentage,
    };
  }

  /**
   * Verify webhook signature for security
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    webhookId: string,
    timestamp: string
  ): boolean {
    if (!YOCO_CONFIG.webhookSecret) {
      console.warn('YoCo webhook secret not configured, skipping verification');
      return true; // Allow for development
    }

    try {
      const crypto = require('crypto');
      
      // Construct signed content: webhookId.timestamp.payload
      const signedContent = `${webhookId}.${timestamp}.${payload}`;
      
      // Remove whsec_ prefix from secret
      const secretBytes = Buffer.from(YOCO_CONFIG.webhookSecret.split('_')[1], 'base64');
      
      // Calculate expected signature
      const expectedSignature = crypto
        .createHmac('sha256', secretBytes)
        .update(signedContent)
        .digest('base64');
      
      // Extract signature from header (remove version prefix like "v1,")
      const actualSignature = signature.split(' ')[0].split(',')[1];
      
      // Use constant-time comparison
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(actualSignature)
      );
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Validate webhook timestamp to prevent replay attacks
   */
  isValidTimestamp(timestamp: string, toleranceInMinutes: number = 3): boolean {
    const webhookTime = parseInt(timestamp) * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const tolerance = toleranceInMinutes * 60 * 1000; // Convert to milliseconds
    
    return Math.abs(currentTime - webhookTime) <= tolerance;
  }

  /**
   * Register webhook with YoCo (for development setup)
   */
  async registerWebhook(webhookUrl: string, name: string = 'teemeyou-webhook'): Promise<any> {
    if (!this.secretKey) {
      throw new Error('YoCo secret key not configured');
    }

    const response = await fetch(`${this.baseUrl}/webhooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.secretKey}`,
      },
      body: JSON.stringify({
        name,
        url: webhookUrl,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to register webhook: ${response.status} - ${errorData}`);
    }

    return response.json();
  }

  /**
   * List all registered webhooks
   */
  async listWebhooks(): Promise<any> {
    if (!this.secretKey) {
      throw new Error('YoCo secret key not configured');
    }

    const response = await fetch(`${this.baseUrl}/webhooks`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to list webhooks: ${response.status} - ${errorData}`);
    }

    return response.json();
  }
}

export const yocoService = new YocoService();
export type { YocoCheckoutRequest, YocoCheckoutResponse, YocoPaymentEvent };