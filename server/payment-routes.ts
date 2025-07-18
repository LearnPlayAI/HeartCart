/**
 * Payment Routes
 * Handles both EFT and YoCo card payment processing
 */

import { Router, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { yocoService } from './yoco-service.js';
import { isAuthenticated } from './auth-middleware.js';

const router = Router();

/**
 * Create YoCo card payment checkout session
 * POST /api/payments/card/checkout
 */
router.post('/card/checkout', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  try {
    const { cartData, customerId: requestCustomerId, customerEmail } = req.body;

    if (!cartData) {
      return res.status(400).json({ error: 'Cart data is required' });
    }

    // Use authenticated user's ID if customerId not provided
    const customerId = requestCustomerId || req.user?.id;
    
    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    // Validate user access
    if (req.user?.role !== 'admin' && customerId !== req.user?.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // CRITICAL FIX: Import storage once for entire function
    const { storage } = await import('./storage.js');
    
    // CRITICAL FIX: Fetch customer's fullName and phone from users table for proper order creation
    let customerFullName = '';
    let customerPhone = '';
    try {
      const customer = await storage.getUserById(customerId);
      customerFullName = customer?.fullName || `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() || 'Unknown Customer';
      customerPhone = customer?.phone || ''; // ALWAYS use customer's actual phone number, never fallback
      console.log('✅ Customer data fetched from database:', {
        customerId,
        customerFullName,
        customerEmail: customer?.email,
        customerPhone,
        hasFullName: !!customer?.fullName,
        hasPhone: !!customer?.phone
      });
    } catch (error) {
      console.error('❌ Failed to fetch customer data from database:', error);
      customerFullName = 'Unknown Customer';
      customerPhone = ''; // ALWAYS use customer's actual phone number, never fallback
    }

    // Convert total amount to cents (YoCo requires cents)
    let amountInCents = Math.round(cartData.total * 100);
    const vatAmountInCents = Math.round(cartData.vatAmount * 100);
    const subtotalInCents = Math.round(cartData.subtotal * 100);

    // Check if admin user has enabled shipping fee skip for testing
    if (req.user?.role === 'admin') {
      try {
        const shippingFeeSetting = await storage.getSystemSetting('skip_shipping_fee_for_admin');
        const skipShippingFee = shippingFeeSetting?.settingValue === 'true';
        
        if (skipShippingFee) {
          const originalAmount = amountInCents;
          amountInCents = Math.max(0, amountInCents - 8500); // Subtract R85 (8500 cents)
          
          console.log('🎯 Admin shipping fee skip applied:', {
            adminUser: req.user?.email,
            originalAmountCents: originalAmount,
            originalAmountRands: originalAmount / 100,
            adjustedAmountCents: amountInCents,
            adjustedAmountRands: amountInCents / 100,
            savedAmount: (originalAmount - amountInCents) / 100,
            note: 'Order will still show full amount in database/emails'
          });
        }
      } catch (error) {
        console.warn('Failed to check admin shipping fee setting, proceeding with normal amount:', error);
      }
    }

    // Generate temporary checkout ID for tracking (no order exists yet)
    const tempCheckoutId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    // Prepare checkout data with cart information (NO ORDER CREATED YET)
    // Get product details for proper line items display (YoCo compliance)
    const enrichedLineItems = [];
    if (cartData.orderItems) {
      for (const item of cartData.orderItems) {
        try {
          const product = await storage.getProductById(item.productId);
          enrichedLineItems.push({
            displayName: product ? product.name : `Product ${item.productId}`,
            quantity: item.quantity,
            pricingDetails: {
              price: Math.round(item.unitPrice * 100), // YoCo expects pricingDetails.price structure
            }
          });
        } catch (error) {
          console.error(`Failed to get product ${item.productId} for line items:`, error);
          enrichedLineItems.push({
            displayName: `Product ${item.productId}`,
            quantity: item.quantity,
            pricingDetails: {
              price: Math.round(item.unitPrice * 100),
            }
          });
        }
      }
    }

    const checkoutData = {
      amount: amountInCents,
      currency: 'ZAR',
      cancelUrl: `${process.env.FRONTEND_URL || 'https://teemeyou.shop'}/payment-failed?checkoutId=${tempCheckoutId}`,
      successUrl: `${process.env.FRONTEND_URL || 'https://teemeyou.shop'}/payment-success?checkoutId=${tempCheckoutId}`,
      failureUrl: `${process.env.FRONTEND_URL || 'https://teemeyou.shop'}/payment-failed?checkoutId=${tempCheckoutId}`,
      externalId: tempCheckoutId, // YoCo compliance: external reference for reconciliation
      metadata: {
        checkoutId: tempCheckoutId, // YoCo compliance: proper checkout reference
        tempCheckoutId, // Keep for backward compatibility
        customerId: customerId.toString(),
        customerEmail: customerEmail,
        customerFullName: customerFullName, // Include customer's full name for webhook processing
        customerPhone: customerPhone, // CRITICAL FIX: Include customer phone for webhook processing
        // Store complete cart data for order creation after successful payment  
        cartData: JSON.stringify({
          ...cartData,
          customerName: customerFullName, // Ensure customerName is in cart data for webhook
          customerPhone: customerPhone // CRITICAL FIX: Ensure customerPhone is in cart data for webhook
        })
      },
      totalTaxAmount: vatAmountInCents,
      subtotalAmount: subtotalInCents,
      lineItems: enrichedLineItems
      // NOTE: processingMode is determined by YoCo based on API keys used:
      // - Test keys (sk_test_...) → YoCo sets processingMode: "test"
      // - Live keys (sk_live_...) → YoCo sets processingMode: "live"
    };

    // COMPREHENSIVE DEBUGGING: Check admin YoCo environment setting
    let adminYocoEnvironment = 'test';
    try {
      const environmentSetting = await storage.getSystemSetting('yoco_environment');
      adminYocoEnvironment = environmentSetting?.settingValue || 'test';
    } catch (error) {
      console.warn('Failed to get YoCo environment setting, defaulting to test:', error);
    }
    
    console.log('🔍 ADMIN ENVIRONMENT DEBUG at checkout creation:', {
      adminYocoSetting: adminYocoEnvironment,
      isProductionMode: adminYocoEnvironment === 'production',
      keyTypeUsed: adminYocoEnvironment === 'production' ? 'LIVE keys' : 'TEST keys',
      expectedYoCoMode: adminYocoEnvironment === 'production' ? 'live (set by YoCo)' : 'test (set by YoCo)',
      configSource: 'ADMIN SETTINGS ONLY',
      YOCO_TEST_PUBLIC_KEY: process.env.YOCO_TEST_PUBLIC_KEY?.substring(0, 30) + '...',
      YOCO_TEST_SECRET_KEY: process.env.YOCO_TEST_SECRET_KEY?.substring(0, 20) + '...',
      YOCO_PROD_PUBLIC_KEY: process.env.YOCO_PROD_PUBLIC_KEY?.substring(0, 30) + '...',
      YOCO_PROD_SECRET_KEY: process.env.YOCO_PROD_SECRET_KEY?.substring(0, 20) + '...',
      YOCO_WEBHOOK_SECRET: process.env.YOCO_WEBHOOK_SECRET?.substring(0, 25) + '...',
      actualSelectedPublic: adminYocoEnvironment === 'production' ? process.env.YOCO_PROD_PUBLIC_KEY : process.env.YOCO_TEST_PUBLIC_KEY,
      actualSelectedSecret: adminYocoEnvironment === 'production' ? process.env.YOCO_PROD_SECRET_KEY?.substring(0, 20) + '...' : process.env.YOCO_TEST_SECRET_KEY?.substring(0, 20) + '...',
    });

    console.log('🚀 Creating YoCo checkout session with cart data:', {
      tempCheckoutId,
      customerId,
      customerEmail,
      amount: amountInCents,
      amountInRands: amountInCents / 100,
      currency: 'ZAR',
      adminEnvironment: adminYocoEnvironment,
      usingTestKeys: adminYocoEnvironment !== 'production',
      keyConfigurationUsed: adminYocoEnvironment === 'production' ? 'PRODUCTION KEYS' : 'TEST KEYS',
      adminEnvironmentSetting: adminYocoEnvironment,
      note: 'processingMode will be set by YoCo based on API keys used',
      lineItemsCount: enrichedLineItems.length,
      vatAmount: vatAmountInCents,
      vatAmountInRands: vatAmountInCents / 100,
      subtotal: subtotalInCents,
      subtotalInRands: subtotalInCents / 100,
      checkoutDataPayload: {
        amount: amountInCents,
        currency: 'ZAR',
        metadataCheckoutId: checkoutData.metadata.checkoutId,
        metadataTempCheckoutId: checkoutData.metadata.tempCheckoutId,
        lineItemsPreview: enrichedLineItems.slice(0, 2) // Show first 2 items
      }
    });

    // Create YoCo checkout session (NO ORDER CREATED)
    const checkoutResponse = await yocoService.createCheckout(checkoutData);

    // Store temporary checkout data for webhook processing
    // TODO: Store tempCheckoutId mapping if needed for webhook processing
    
    console.log('✅ YoCo checkout session created successfully (no order created yet):', {
      checkoutId: checkoutResponse.id,
      tempCheckoutId,
      redirectUrl: checkoutResponse.redirectUrl,
      amount: checkoutResponse.amount,
      currency: checkoutResponse.currency,
      yocoProcessingMode: checkoutResponse.processingMode,
      keyTypeConfirmed: checkoutResponse.processingMode === 'test' ? 'TEST KEYS CONFIRMED' : 'LIVE KEYS CONFIRMED',
      environmentMatch: (adminYocoEnvironment !== 'production' && checkoutResponse.processingMode === 'test') || 
                        (adminYocoEnvironment === 'production' && checkoutResponse.processingMode === 'live'),
      debugInfo: {
        expectedMode: adminYocoEnvironment === 'production' ? 'live' : 'test',
        actualMode: checkoutResponse.processingMode,
        configurationCorrect: (adminYocoEnvironment !== 'production' && checkoutResponse.processingMode === 'test') || 
                              (adminYocoEnvironment === 'production' && checkoutResponse.processingMode === 'live'),
        adminSetting: adminYocoEnvironment,
        settingSource: 'ADMIN_SETTINGS'
      }
    });

    res.json({
      success: true,
      checkoutId: checkoutResponse.id,
      tempCheckoutId,
      redirectUrl: checkoutResponse.redirectUrl,
      amount: cartData.total,
      currency: 'ZAR',
    });

  } catch (error) {
    console.error('Error creating YoCo checkout session:', error);
    
    // Provide specific error messages based on error type
    let errorMessage = 'Failed to create payment session';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('API Error: 400')) {
        errorMessage = 'Invalid payment details. Please check your order and try again.';
        statusCode = 400;
      } else if (error.message.includes('API Error: 401') || error.message.includes('unauthorized')) {
        errorMessage = 'Payment service authentication failed. Please try again later.';
        statusCode = 503;
      } else if (error.message.includes('API Error: 403')) {
        errorMessage = 'Payment not authorized. Please verify your payment details.';
        statusCode = 403;
      } else if (error.message.includes('network') || error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Payment service temporarily unavailable. Please try again in a few moments.';
        statusCode = 503;
      }
    }
    
    res.status(statusCode).json({ 
      error: errorMessage,
      message: error instanceof Error ? error.message : 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    });
  }
}));

/**
 * Get payment status for an order
 * GET /api/payments/status/:orderId
 */
router.get('/status/:orderId', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.orderId);

    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const { storage } = await import('./storage.js');
    const order = await storage.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Verify order belongs to the current user (unless admin)
    if (req.user?.role !== 'admin' && order.userId !== req.user?.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      status: order.status,
      yocoCheckoutId: order.yocoCheckoutId,
      yocoPaymentId: order.yocoPaymentId,
      transactionFeeAmount: order.transactionFeeAmount,
      transactionFeePercentage: order.transactionFeePercentage,
    });

  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(500).json({ 
      error: 'Failed to get payment status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

export default router;