/**
 * YoCo Webhook Routes
 * Handles YoCo payment webhooks for card payment verification
 */

import { Router, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { storage } from './storage.js';
import { yocoService, YocoPaymentEvent } from './yoco-service.js';
import { unifiedEmailService } from './unified-email-service.js';

const router = Router();

/**
 * YoCo Webhook Handler
 * Processes payment success/failure notifications from YoCo
 */
router.post('/yoco', asyncHandler(async (req: Request, res: Response) => {
  try {
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers['webhook-signature'] as string;
    const webhookId = req.headers['webhook-id'] as string;
    const timestamp = req.headers['webhook-timestamp'] as string;

    console.log('📨 YoCo webhook received:', {
      webhookId,
      timestamp,
      eventType: req.body.type,
      hasSignature: !!signature,
      paymentId: req.body.payload?.id,
      paymentAmount: req.body.payload?.amount,
      paymentCurrency: req.body.payload?.currency,
      checkoutId: req.body.payload?.metadata?.checkoutId,
      tempCheckoutId: req.body.payload?.metadata?.tempCheckoutId,
      customerId: req.body.payload?.metadata?.customerId,
      customerEmail: req.body.payload?.metadata?.customerEmail,
      webhookSecretConfigured: !!process.env.YOCO_WEBHOOK_SECRET,
      webhookSecretUsed: process.env.YOCO_WEBHOOK_SECRET?.substring(0, 20) + '...',
    });

    // Validate webhook timestamp (prevent replay attacks)
    if (!yocoService.isValidTimestamp(timestamp)) {
      console.error('YoCo webhook timestamp validation failed:', timestamp);
      return res.status(400).json({ error: 'Invalid timestamp' });
    }

    // Verify webhook signature
    if (!(await yocoService.verifyWebhookSignature(rawBody, signature, webhookId, timestamp))) {
      console.error('YoCo webhook signature verification failed');
      return res.status(403).json({ error: 'Invalid signature' });
    }

    const event: YocoPaymentEvent = req.body;

    // Handle different YoCo webhook event types as per documentation requirements
    switch (event.type) {
      case 'payment.succeeded':
        // Continue processing successful payment
        break;
      
      case 'payment.failed':
        console.log('Processing failed payment event:', {
          paymentId: event.payload.id,
          checkoutId: event.payload.metadata?.checkoutId,
          amount: event.payload.amount,
          reason: event.payload.status
        });
        // For failed payments, no order should exist (which is correct behavior)
        return res.status(200).json({ 
          received: true, 
          eventType: 'payment.failed',
          message: 'Payment failure processed - no order created' 
        });
      
      case 'payment.refunded':
        console.log('Processing refund event:', {
          paymentId: event.payload.id,
          checkoutId: event.payload.metadata?.checkoutId,
          amount: event.payload.amount
        });
        // TODO: Implement refund handling when needed
        return res.status(200).json({ 
          received: true, 
          eventType: 'payment.refunded',
          message: 'Refund event acknowledged' 
        });
      
      default:
        console.log('Processing unhandled webhook event type:', {
          eventType: event.type,
          paymentId: event.payload?.id
        });
        return res.status(200).json({ 
          received: true, 
          eventType: event.type,
          message: 'Event acknowledged but not processed' 
        });
    }

    const payment = event.payload;
    const checkoutId = payment.metadata.checkoutId;
    const tempCheckoutId = payment.metadata.tempCheckoutId;
    const customerId = parseInt(payment.metadata.customerId);
    const customerEmail = payment.metadata.customerEmail;
    const cartDataStr = payment.metadata.cartData;

    console.log('Processing successful payment:', {
      paymentId: payment.id,
      checkoutId,
      tempCheckoutId,
      customerId,
      amount: payment.amount,
      currency: payment.currency,
    });

    // CRITICAL: Create order only AFTER successful payment
    if (!cartDataStr) {
      console.error('No cart data found in payment metadata');
      return res.status(400).json({ error: 'Cart data missing from payment' });
    }

    let cartData;
    try {
      cartData = JSON.parse(cartDataStr);
    } catch (error) {
      console.error('Failed to parse cart data:', error);
      return res.status(400).json({ error: 'Invalid cart data format' });
    }

    // Check if order already exists for this checkout (prevent duplicates)
    const existingOrder = await storage.getOrderByYocoCheckoutId(checkoutId);
    if (existingOrder) {
      console.log('Order already created for checkout:', existingOrder.orderNumber);
      return res.status(200).json({ received: true, orderId: existingOrder.id, message: 'Already processed' });
    }

    console.log('Creating order after successful payment:', { checkoutId, customerId });

    // YoCo compliance: Calculate transaction fees for profit tracking (absorbed by company, not charged to customer)
    const fees = yocoService.calculateTransactionFees(payment.amount);
    
    console.log('YoCo transaction fees calculated for profit tracking:', {
      orderAmount: payment.amount / 100,
      feeAmount: fees.feeAmount,
      feePercentage: fees.feePercentage,
      netRevenue: (payment.amount / 100) - fees.feeAmount,
      checkoutId
    });
    
    // Create order with payment information included (camelCase naming convention)
    const orderData = {
      ...cartData,
      userId: customerId,
      paymentMethod: 'card',
      paymentStatus: 'payment_received', // Already paid via card
      status: 'confirmed', // Auto-confirm card payments
      yocoCheckoutId: checkoutId,
      yocoPaymentId: payment.id,
      transactionFeeAmount: fees.feeAmount,
      transactionFeePercentage: fees.feePercentage,
      paymentReceivedDate: new Date().toISOString(),
    };

    const order = await storage.createOrder(orderData);

    // Create order status history entry for the newly created order
    await storage.createOrderStatusHistory({
      orderId: order.id,
      status: 'confirmed',
      paymentStatus: 'payment_received',
      previousStatus: 'pending',
      previousPaymentStatus: 'pending',
      changedBy: 'system',
      eventType: 'order_created_after_payment',
      notes: `Order created after successful card payment. Payment ID: ${payment.id}. Transaction fee: R${fees.feeAmount.toFixed(2)} (${fees.feePercentage}%)`,
    });

    console.log('Order created successfully after payment:', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: 'confirmed',
      paymentStatus: 'payment_received',
      transactionFee: fees.feeAmount,
    });

    // Send order confirmation and payment confirmation emails
    try {
      const newOrder = await storage.getOrderById(order.id);
      if (newOrder) {
        // Send both order confirmation and payment confirmation emails
        await unifiedEmailService.sendOrderConfirmationEmail(newOrder);
        await unifiedEmailService.sendPaymentConfirmationEmail(newOrder);
        console.log('Order confirmation and payment confirmation emails sent for order:', order.orderNumber);
      }
    } catch (emailError) {
      console.error('Failed to send confirmation emails:', emailError);
      // Don't fail the webhook for email errors
    }

    // YoCo compliance: Respond quickly (within 15 seconds as required by documentation)
    const webhookResponse = { 
      received: true, 
      orderId: order.id,
      orderNumber: order.orderNumber,
      checkoutId,
      tempCheckoutId,
      status: 'order_created_and_paid',
      timestamp: new Date().toISOString(),
      processingTime: Date.now() - (event.payload.createdDate ? new Date(event.payload.createdDate).getTime() : Date.now())
    };
    
    console.log('YoCo webhook processed successfully:', webhookResponse);
    res.status(200).json(webhookResponse);

  } catch (error) {
    console.error('YoCo webhook processing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

/**
 * YoCo Webhook Test Endpoint (for development)
 */
router.get('/yoco/test', asyncHandler(async (req: Request, res: Response) => {
  res.json({
    message: 'YoCo webhook endpoint is active',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
}));

export default router;