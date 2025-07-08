/**
 * YoCo Payment Service
 * Handles YoCo API integration for credit/debit card payments
 */

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// YoCo configuration function that reads from admin settings
async function getYocoConfig() {
  const { storage } = await import('./storage.js');
  
  // Get YoCo environment setting from admin (defaults to 'test' if not set)
  let yocoEnvironment = 'test';
  try {
    const environmentSetting = await storage.getSystemSetting('yoco_environment');
    yocoEnvironment = environmentSetting?.settingValue || 'test';
  } catch (error) {
    console.warn('Failed to get YoCo environment setting, defaulting to test:', error);
  }
  
  const isProduction = yocoEnvironment === 'production';
  
  return {
    publicKey: isProduction 
      ? process.env.YOCO_PROD_PUBLIC_KEY 
      : process.env.YOCO_TEST_PUBLIC_KEY,
    secretKey: isProduction
      ? process.env.YOCO_PROD_SECRET_KEY
      : process.env.YOCO_TEST_SECRET_KEY,
    apiUrl: 'https://payments.yoco.com/api',
    webhookSecret: process.env.YOCO_WEBHOOK_SECRET || '',
    environment: yocoEnvironment,
    isProduction
  };
}

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
    customerFullName: string; // Customer's full name for order creation
    customerPhone: string; // Customer's phone number for order creation
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
      customerFullName?: string;
      customerPhone?: string;
      cartData?: string;
    };
  };
}

class YocoService {
  /**
   * Create a YoCo checkout session
   */
  async createCheckout(checkoutData: YocoCheckoutRequest): Promise<YocoCheckoutResponse> {
    // Get dynamic YoCo configuration from admin settings
    const config = await getYocoConfig();
    
    if (!config.secretKey) {
      throw new Error('YoCo secret key not configured');
    }

    // COMPREHENSIVE YoCo DEBUG LOGGING
    console.log('🔑 YoCo API Configuration (Admin Settings):', {
      adminEnvironmentSetting: config.environment,
      isProduction: config.isProduction,
      keyType: config.secretKey?.startsWith('sk_test_') ? 'TEST' : (config.secretKey?.startsWith('sk_live_') ? 'LIVE' : 'UNKNOWN'),
      publicKey: config.publicKey?.substring(0, 25) + '...',
      secretKey: config.secretKey?.substring(0, 25) + '...',
      fullPublicKey: config.publicKey, // FULL KEY FOR DEBUGGING
      fullSecretKey: config.secretKey?.substring(0, 15) + '...', // MORE CHARS FOR DEBUGGING
      apiUrl: config.apiUrl,
      checkoutAmount: checkoutData.amount,
      currency: checkoutData.currency,
      webhookSecret: config.webhookSecret?.substring(0, 20) + '...',
      note: 'YoCo will set processingMode automatically based on key type',
      configSource: 'ADMIN SETTINGS (not NODE_ENV)',
      availableEnvKeys: {
        YOCO_TEST_PUBLIC: !!process.env.YOCO_TEST_PUBLIC_KEY,
        YOCO_TEST_SECRET: !!process.env.YOCO_TEST_SECRET_KEY,
        YOCO_PROD_PUBLIC: !!process.env.YOCO_PROD_PUBLIC_KEY,
        YOCO_PROD_SECRET: !!process.env.YOCO_PROD_SECRET_KEY,
        YOCO_WEBHOOK_SECRET: !!process.env.YOCO_WEBHOOK_SECRET,
      }
    });

    const idempotencyKey = uuidv4();
    
    const response = await fetch(`${config.apiUrl}/checkouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.secretKey}`,
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
    console.log('✅ YoCo checkout created successfully:', {
      checkoutId: result.id,
      redirectUrl: result.redirectUrl,
      amount: result.amount,
      currency: result.currency,
      yocoProcessingMode: result.processingMode, // YoCo's automatically set processing mode
      adminEnvironment: config.environment,
      keyType: config.secretKey?.startsWith('sk_test_') ? 'TEST' : 'LIVE',
      usedSecretKey: config.secretKey?.substring(0, 15) + '...',
      usedPublicKey: config.publicKey?.substring(0, 25) + '...',
      idempotencyKey: idempotencyKey,
      requestPayload: {
        amount: checkoutData.amount,
        currency: checkoutData.currency,
        metadata: checkoutData.metadata,
        lineItemsCount: checkoutData.lineItems?.length || 0
      }
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
  async verifyWebhookSignature(
    payload: string,
    signature: string,
    webhookId: string,
    timestamp: string
  ): Promise<boolean> {
    const config = await getYocoConfig();
    
    if (!config.webhookSecret) {
      console.error('CRITICAL SECURITY: YoCo webhook secret not configured - REJECTING ALL WEBHOOKS');
      return false; // SECURITY FIX: Reject all webhooks without proper secret
    }

    try {
      // Construct signed content: webhookId.timestamp.payload
      const signedContent = `${webhookId}.${timestamp}.${payload}`;
      
      // Remove whsec_ prefix from secret
      const secretBytes = Buffer.from(config.webhookSecret.split('_')[1], 'base64');
      
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
  isValidTimestamp(timestamp: string): boolean {
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
      
      // YoCo COMPLIANCE: Use exactly 3 minutes as recommended by official documentation
      const toleranceInMinutes = 3; // YoCo recommended maximum
      const tolerance = toleranceInMinutes * 60 * 1000; // Convert to milliseconds
      const timeDifference = Math.abs(currentTime - webhookTime);
      
      console.log('YoCo webhook timestamp validation (3-minute compliance):', {
        webhookTime: new Date(webhookTime).toISOString(),
        currentTime: new Date(currentTime).toISOString(),
        differenceMs: timeDifference,
        toleranceMs: tolerance,
        toleranceMinutes: toleranceInMinutes,
        differenceInMinutes: (timeDifference / (1000 * 60)).toFixed(2),
        isValid: timeDifference <= tolerance,
        yocoCompliant: true
      });
      
      if (timeDifference > tolerance) {
        console.warn('YoCo webhook timestamp validation FAILED: Timestamp outside 3-minute compliance window', {
          webhookTime: new Date(webhookTime).toISOString(),
          currentTime: new Date(currentTime).toISOString(),
          differenceMs: timeDifference,
          toleranceMs: tolerance,
          toleranceMinutes: toleranceInMinutes,
          complianceNote: 'YoCo recommends max 3 minutes for security'
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