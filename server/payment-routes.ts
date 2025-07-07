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
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    // Get the order details
    const order = await storage.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Verify order belongs to the current user (unless admin)
    if (req.user?.role !== 'admin' && order.userId !== req.user?.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if order is already paid
    if (order.paymentStatus === 'payment_received') {
      return res.status(400).json({ error: 'Order is already paid' });
    }

    // Convert total amount to cents (YoCo requires cents)
    const amountInCents = Math.round(order.totalAmount * 100);
    const vatAmountInCents = Math.round(order.vatAmount * 100);
    const subtotalInCents = Math.round(order.subtotalAmount * 100);

    // Prepare checkout data
    const checkoutData = {
      amount: amountInCents,
      currency: 'ZAR',
      cancelUrl: `${process.env.FRONTEND_URL || 'https://teemeyou.shop'}/payment-failed?orderId=${orderId}`,
      successUrl: `${process.env.FRONTEND_URL || 'https://teemeyou.shop'}/payment-success?orderId=${orderId}`,
      failureUrl: `${process.env.FRONTEND_URL || 'https://teemeyou.shop'}/payment-failed?orderId=${orderId}`,
      metadata: {
        orderId: orderId.toString(),
        orderNumber: order.orderNumber,
        customerId: order.userId.toString(),
        customerEmail: order.customerEmail,
      },
      totalTaxAmount: vatAmountInCents,
      subtotalAmount: subtotalInCents,
      lineItems: order.items?.map(item => ({
        displayName: item.productName,
        quantity: item.quantity,
        priceCents: Math.round(item.unitPrice * 100),
      })) || [],
    };

    console.log('Creating YoCo checkout session:', {
      orderId,
      orderNumber: order.orderNumber,
      amount: amountInCents,
      currency: 'ZAR',
    });

    // Create YoCo checkout session
    const checkoutResponse = await yocoService.createCheckout(checkoutData);

    // Update order with YoCo checkout ID
    await storage.updateOrder(orderId, {
      yocoCheckoutId: checkoutResponse.id,
      paymentMethod: 'card',
    });

    console.log('YoCo checkout session created successfully:', {
      checkoutId: checkoutResponse.id,
      redirectUrl: checkoutResponse.redirectUrl,
    });

    res.json({
      success: true,
      checkoutId: checkoutResponse.id,
      redirectUrl: checkoutResponse.redirectUrl,
      amount: order.totalAmount,
      currency: 'ZAR',
    });

  } catch (error) {
    console.error('Error creating YoCo checkout session:', error);
    res.status(500).json({ 
      error: 'Failed to create payment session',
      message: error instanceof Error ? error.message : 'Unknown error'
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