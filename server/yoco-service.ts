/**
 * YoCo Payment Service
 * Handles YoCo API integration for credit/debit card payments
 */

import { v4 as uuidv4 } from 'uuid';

// Environment-based YoCo configuration
const YOCO_CONFIG = {
  publicKey: process.env.NODE_ENV === 'production' 
    ? process.env.YOCO_PROD_PUBLIC_KEY 
    : process.env.YOCO_OFFICIAL_TEST_PUBLIC, // Temporarily using official YoCo test keys for 3D Secure debugging
  secretKey: process.env.NODE_ENV === 'production'
    ? process.env.YOCO_PROD_SECRET_KEY
    : process.env.YOCO_OFFICIAL_TEST_SECRET, // Temporarily using official YoCo test keys for 3D Secure debugging
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
    checkoutId: string; // YoCo compliance: proper checkout reference
    tempCheckoutId?: string; // Backward compatibility
    customerId: string;
    customerEmail: string;
    cartData: string; // JSON string of cart data for order creation
  };
  totalTaxAmount?: number; // VAT amount in cents
  subtotalAmount?: number; // Subtotal in cents
  lineItems?: Array<{
    displayName: string;
    quantity: number;
    pricingDetails: {
      price: number; // YoCo API expects price within pricingDetails object
    };
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
  type: string; // "payment.succeeded", "payment.failed", "payment.refunded"
  createdDate: string; // ISO 8601 timestamp
  payload: {
    id: string; // Payment ID
    type: string; // Always "payment"
    createdDate: string; // ISO 8601 timestamp
    amount: number; // Amount in cents
    currency: string; // "ZAR"
    paymentMethodDetails: {
      type: string; // "card"
      card: {
        expiryMonth: number;
        expiryYear: number;
        maskedCard: string; // "************1111"
        scheme: string; // "visa", "mastercard", etc.
      };
    };
    status: string; // "succeeded", "failed", "refunded"
    mode: string; // "live" or "test"
    metadata: {
      checkoutId: string; // Our checkout ID from the original request
      // Additional metadata we set during checkout
      tempCheckoutId?: string;
      customerId?: string;
      customerEmail?: string;
      cartData?: string;
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

    // Debug: Log YoCo configuration for verification
    console.log('🔑 YoCo API Configuration:', {
      publicKey: YOCO_CONFIG.publicKey?.substring(0, 20) + '...',
      secretKey: this.secretKey?.substring(0, 20) + '...',
      apiUrl: this.baseUrl,
      environment: process.env.NODE_ENV || 'development',
      checkoutAmount: checkoutData.amount,
      currency: checkoutData.currency
    });

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

    // YoCo compliance: Handle specific error codes as per documentation
    if (!response.ok) {
      const errorData = await response.text();
      let errorMessage = `YoCo API Error: ${response.status} - ${errorData}`;
      
      switch (response.status) {
        case 403:
          errorMessage = 'YoCo authentication failed: Invalid or missing secret key';
          break;
        case 409:
          errorMessage = 'YoCo conflict: Request with same idempotency key is being processed';
          break;
        case 422:
          errorMessage = 'YoCo validation error: Request payload does not match original request for this idempotency key';
          break;
        default:
          errorMessage = `YoCo API Error: ${response.status} - ${errorData}`;
      }
      
      console.error('YoCo checkout creation failed:', {
        status: response.status,
        error: errorData,
        idempotencyKey,
        amount: checkoutData.amount
      });
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('YoCo checkout created successfully:', {
      checkoutId: result.id,
      redirectUrl: result.redirectUrl,
      amount: result.amount,
      currency: result.currency,
      processingMode: result.processingMode,
      environment: process.env.NODE_ENV || 'development',
      usingTestKeys: process.env.NODE_ENV !== 'production'
    });
    
    return result;
  }

  /**
   * Calculate YoCo transaction fees
   * YoCo charges 2.95% (ex. VAT) + R2.00 per transaction
   * Note: These fees are absorbed by the company, not charged to customers
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
   * YoCo compliance: Implement proper timestamp validation as per security requirements
   * SAST timezone support: Extended tolerance for South African users (UTC+2)
   */
  isValidTimestamp(timestamp: string, toleranceInMinutes: number = 5): boolean {
    if (!timestamp) {
      console.warn('YoCo webhook timestamp validation: No timestamp provided');
      return false;
    }
    
    try {
      const webhookTime = parseInt(timestamp) * 1000; // Convert to milliseconds
      if (isNaN(webhookTime)) {
        console.warn('YoCo webhook timestamp validation: Invalid timestamp format');
        return false;
      }
      
      const currentTime = Date.now();
      
      // Extended tolerance for SAST timezone differences (UTC+2)
      // South African users may experience up to 2 hours timezone difference
      const sastToleranceInMinutes = toleranceInMinutes + 120; // Add 2 hours for SAST
      const tolerance = sastToleranceInMinutes * 60 * 1000; // Convert to milliseconds
      const timeDifference = Math.abs(currentTime - webhookTime);
      
      console.log('YoCo webhook timestamp validation:', {
        webhookTime: new Date(webhookTime).toISOString(),
        currentTime: new Date(currentTime).toISOString(),
        differenceMs: timeDifference,
        toleranceMs: tolerance,
        sastToleranceMinutes: sastToleranceInMinutes,
        isValid: timeDifference <= tolerance
      });
      
      if (timeDifference > tolerance) {
        console.warn('YoCo webhook timestamp validation: Timestamp outside SAST tolerance window', {
          webhookTime: new Date(webhookTime).toISOString(),
          currentTime: new Date(currentTime).toISOString(),
          differenceMs: timeDifference,
          toleranceMs: tolerance,
          sastToleranceMinutes: sastToleranceMinutes
        });
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('YoCo webhook timestamp validation error:', error);
      return false;
    }
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