/**
 * Payment Routes
 * Handles both EFT and YoCo card payment processing
 */

import { Router, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { yocoService } from './yoco-service.js';
import { storage } from './storage.js';
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

    // Convert total amount to cents (YoCo requires cents)
    const amountInCents = Math.round(cartData.total * 100);
    const vatAmountInCents = Math.round(cartData.vatAmount * 100);
    const subtotalInCents = Math.round(cartData.subtotal * 100);

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
        // Store complete cart data for order creation after successful payment
        cartData: JSON.stringify(cartData)
      },
      totalTaxAmount: vatAmountInCents,
      subtotalAmount: subtotalInCents,
      lineItems: enrichedLineItems,
    };

    console.log('Creating YoCo checkout session with cart data:', {
      tempCheckoutId,
      customerId,
      amount: amountInCents,
      currency: 'ZAR',
    });

    // Create YoCo checkout session (NO ORDER CREATED)
    const checkoutResponse = await yocoService.createCheckout(checkoutData);

    // Store temporary checkout data for webhook processing
    // TODO: Store tempCheckoutId mapping if needed for webhook processing
    
    console.log('YoCo checkout session created successfully (no order created yet):', {
      checkoutId: checkoutResponse.id,
      tempCheckoutId,
      redirectUrl: checkoutResponse.redirectUrl,
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