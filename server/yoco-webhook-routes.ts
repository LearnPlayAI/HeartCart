/**
 * YoCo Webhook Routes
 * Handles YoCo payment webhooks for card payment verification
 */

import { Router, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { yocoService, YocoPaymentEvent } from './yoco-service.js';
import { databaseEmailService } from './database-email-service.js';
import { db } from './db';
import { products, users } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import { logger } from './logger';

const router = Router();

/**
 * YoCo Webhook Handler
 * Processes payment success/failure notifications from YoCo
 */
router.post('/yoco', asyncHandler(async (req: Request, res: Response) => {
  console.log('🎯 WEBHOOK: Yoco webhook received:', req.body?.type || 'unknown event');
  
  try {
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers['webhook-signature'] as string;
    const webhookId = req.headers['webhook-id'] as string;
    const timestamp = req.headers['webhook-timestamp'] as string;



    // CRITICAL SECURITY: Validate webhook timestamp (prevent replay attacks)
    if (!yocoService.isValidTimestamp(timestamp)) {
      return res.status(400).json({ error: 'Invalid timestamp' });
    }

    // CRITICAL SECURITY: Verify webhook signature (prevents phantom orders)
    const signatureValid = await yocoService.verifyWebhookSignature(rawBody, signature, webhookId, timestamp);
    if (!signatureValid) {
      return res.status(403).json({ error: 'Invalid signature' });
    }

    const event: YocoPaymentEvent = req.body;
    
    console.log('✅ WEBHOOK: Signature validated, processing event:', event.type);

    // Handle different YoCo webhook event types as per documentation requirements
    switch (event.type) {
      case 'payment.succeeded':
        console.log('💳 WEBHOOK: Processing successful payment for checkout:', event.payload?.metadata?.checkoutId);
        // Continue processing successful payment
        break;
      
      case 'payment.failed':
        // For failed payments, no order should exist (which is correct behavior)
        return res.status(200).json({ 
          received: true, 
          eventType: 'payment.failed',
          message: 'Payment failure processed - no order created' 
        });
      
      case 'payment.refunded':
        // TODO: Implement refund handling when needed
        return res.status(200).json({ 
          received: true, 
          eventType: 'payment.refunded',
          message: 'Refund event acknowledged' 
        });
      
      default:
        return res.status(200).json({ 
          received: true, 
          eventType: event.type,
          message: 'Event acknowledged but not processed' 
        });
    }

    // Import storage after validation
    const { storage } = await import('./storage.js');

    const payment = event.payload;
    const checkoutId = payment.metadata.checkoutId;
    const tempCheckoutId = payment.metadata.tempCheckoutId;
    const customerId = parseInt(payment.metadata.customerId);
    const customerEmail = payment.metadata.customerEmail;
    const customerFullName = payment.metadata.customerFullName; // Extract customer's full name from metadata
    const customerPhone = payment.metadata.customerPhone; // CRITICAL FIX: Extract customer phone from metadata
    const cartDataStr = payment.metadata.cartData || '';
    
    console.log('📋 WEBHOOK: Extracted payment metadata:', {
      checkoutId,
      customerId,
      customerEmail,
      hasCartData: !!cartDataStr
    });



    // CRITICAL: Create order only AFTER successful payment
    if (!cartDataStr) {
      return res.status(400).json({ error: 'Cart data missing from payment' });
    }

    let cartData;
    try {
      cartData = JSON.parse(cartDataStr);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid cart data format' });
    }

    // CRITICAL FIX: Validate customer data before order creation with robust fallbacks
    if (!customerEmail) {
      return res.status(400).json({ error: 'Customer email missing from payment data' });
    }
    
    // ENHANCED: Use fallback values for non-critical fields instead of failing entire order
    const finalCustomerFullName = customerFullName || cartData.customerName || `Customer ${customerId}`;
    
    // CRITICAL FIX: Always fetch the user's actual phone number - never use admin fallback
    let finalCustomerPhone = customerPhone || cartData.customerPhone;
    
    // If phone number is missing from payment data, fetch it from the user's database profile
    if (!finalCustomerPhone) {
      try {
        const userProfile = await db
          .select({ phoneNumber: users.phoneNumber })
          .from(users)
          .where(eq(users.id, customerId))
          .limit(1);
        
        if (userProfile.length > 0 && userProfile[0].phoneNumber) {
          finalCustomerPhone = userProfile[0].phoneNumber;
        } else {
          return res.status(400).json({ error: 'Customer phone number not found in user profile' });
        }
      } catch (error) {
        return res.status(400).json({ error: 'Failed to fetch customer phone number from database' });
      }
    }
    
    if (!finalCustomerFullName || finalCustomerFullName.trim() === '') {
      return res.status(400).json({ error: 'Customer name missing from payment data' });
    }

    // Check if order already exists for this checkout (prevent duplicates)
    try {
      const existingOrder = await storage.getOrderByYocoCheckoutId(checkoutId);
      if (existingOrder) {
        return res.status(200).json({ received: true, orderId: existingOrder.id, message: 'Already processed' });
      }
    } catch (orderCheckError) {
      // Continue with order creation even if check fails
    }

    // YoCo compliance: Calculate transaction fees for profit tracking (absorbed by company, not charged to customer)
    const fees = yocoService.calculateTransactionFees(payment.amount);
    
    // Extract order and orderItems from cart data (like EFT flow)
    // CRITICAL FIX: Extract address fields from nested shippingAddress object
    let rawOrderItems = cartData.orderItems || cartData.items || cartData.lineItems || [];
    const { shippingAddress: addressData, ...orderData } = cartData;

    // CRITICAL FIX: Enrich order items with product names from database (preventing null productName constraint violations)

    const orderItems = [];
    if (rawOrderItems && Array.isArray(rawOrderItems)) {
      for (const item of rawOrderItems) {
        try {
          // Fetch product name AND image URL from database using productId
          const product = await db
            .select({ 
              name: products.name,
              imageUrl: products.imageUrl  // Use imageUrl from schema (maps to image_url in database)
            })
            .from(products)
            .where(eq(products.id, item.productId))
            .limit(1);

          const productName = product[0]?.name || `Product ID ${item.productId}`;
          const productImageUrl = product[0]?.imageUrl || null;
          
          // CRITICAL FIX: Ensure all required database fields are present
          const enrichedItem = {
            ...item,
            productName: productName,  // CRITICAL FIX: Add productName from database
            totalPrice: item.quantity * item.unitPrice,  // CRITICAL FIX: Calculate totalPrice (required field)
            selectedAttributes: item.selectedAttributes || item.attributeSelections || {},  // Ensure selectedAttributes exists
            productSku: item.productSku || null,  // Optional field
            productImageUrl: productImageUrl,  // CRITICAL FIX: Use actual product image URL from database
            attributeDisplayText: item.attributeDisplayText || null  // Optional field
          };
          
          orderItems.push(enrichedItem);
          

        } catch (productFetchError) {
          // Use fallback product name to prevent null constraint violation
          const enrichedItem = {
            ...item,
            productName: `Product ID ${item.productId}`,
            totalPrice: item.quantity * item.unitPrice,  // CRITICAL FIX: Calculate totalPrice (required field)
            selectedAttributes: item.selectedAttributes || item.attributeSelections || {},  // Ensure selectedAttributes exists
            productSku: item.productSku || null,  // Optional field
            productImageUrl: null,  // CRITICAL FIX: No image available if product fetch fails
            attributeDisplayText: item.attributeDisplayText || null  // Optional field
          };
          orderItems.push(enrichedItem);
        }
      }
    }

    // CRITICAL DEBUG: Ensure we have order items before proceeding
    if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
      return res.status(400).json({ error: 'No order items found in cart data' });
    }

    // EMERGENCY STOP: If no order items after enrichment, fail the webhook
    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ 
        error: 'No order items found in payment data',
        checkoutId,
        cartDataKeys: Object.keys(cartData)
      });
    }
    
    // CRITICAL FIX: Ensure all required address fields have fallbacks to prevent null constraints
    const addressLine1 = addressData?.addressLine1 || 'Address not provided';
    const addressLine2 = addressData?.addressLine2 || '';
    const city = addressData?.city || 'City not provided';
    const province = addressData?.province || 'Province not provided';
    const postalCode = addressData?.postalCode || '0000';
    
    // CRITICAL FIX: Properly map address fields from cart data to order fields with fallback
    const shippingAddress = addressLine2 ? `${addressLine1}, ${addressLine2}` : addressLine1;
    
    // CRITICAL FIX: Calculate all required financial fields from order items
    let calculatedSubtotal = 0;
    let calculatedShippingCost = 0;
    let calculatedVatAmount = 0;
    let calculatedVatRate = 0;

    // Calculate subtotal from order items
    if (orderItems && Array.isArray(orderItems)) {
      calculatedSubtotal = orderItems.reduce((sum, item) => {
        return sum + (item.quantity * item.unitPrice);
      }, 0);
    }

    // Extract shipping cost from cart data (REQUIRED - no defaults)
    if (orderData.shippingCost && typeof orderData.shippingCost === 'number') {
      calculatedShippingCost = orderData.shippingCost;
    } else {
      console.error('⚠️ WEBHOOK ERROR: Missing or invalid shippingCost in orderData!', {
        checkoutId,
        hasOrderData: !!orderData,
        orderDataKeys: orderData ? Object.keys(orderData) : [],
        shippingCostValue: orderData?.shippingCost,
        shippingCostType: typeof orderData?.shippingCost
      });
      return res.status(400).json({ 
        error: 'Invalid order data: shippingCost is required',
        checkoutId
      });
    }

    // Extract VAT information from cart data if available
    if (orderData.vatAmount && typeof orderData.vatAmount === 'number') {
      calculatedVatAmount = orderData.vatAmount;
    }
    if (orderData.vatRate && typeof orderData.vatRate === 'number') {
      calculatedVatRate = orderData.vatRate;
    }

    // Calculate total amount
    const calculatedTotalAmount = calculatedSubtotal + calculatedShippingCost + calculatedVatAmount;

    // CRITICAL FIX: Extract PUDO locker information from cart data using same pattern as EFT flow
    const selectedLockerName = cartData.lockerDetails?.name || cartData.selectedLockerName || null;
    const selectedLockerAddress = cartData.lockerDetails?.address || cartData.selectedLockerAddress || null;
    const selectedLockerCode = cartData.lockerDetails?.code || cartData.selectedLockerCode || null;
    
    // CRITICAL FIX: Extract credit usage information from cart data
    const creditUsed = cartData.creditUsed || orderData.creditUsed || 0;

    // Create order with payment information included (camelCase naming convention)
    const order = {
      ...orderData,
      userId: customerId,
      customerEmail: customerEmail, // CRITICAL FIX: Explicitly set customerEmail from metadata
      customerName: finalCustomerFullName, // CRITICAL FIX: Use validated customer name with fallbacks
      customerPhone: finalCustomerPhone, // CRITICAL FIX: Use validated customer phone with fallbacks
      // CRITICAL FIX: Map address fields correctly (matching EFT flow structure) 
      shippingAddress: shippingAddress,
      shippingCity: city,
      shippingProvince: province, 
      shippingPostalCode: postalCode,
      // CRITICAL FIX: Add PUDO locker information to order
      selectedLockerName: selectedLockerName,
      selectedLockerAddress: selectedLockerAddress,
      selectedLockerCode: selectedLockerCode,
      shippingMethod: orderData.shippingMethod || 'pudo', // Default to PUDO
      // CRITICAL FIX: Set all required financial fields to prevent null constraint errors
      subtotalAmount: calculatedSubtotal,
      totalAmount: calculatedTotalAmount,
      shippingCost: calculatedShippingCost,
      vatAmount: calculatedVatAmount,
      vatRate: calculatedVatRate,
      vatRegistrationNumber: orderData.vatRegistrationNumber || '4567890123', // Default VAT number
      paymentMethod: 'card',
      paymentStatus: 'payment_received', // Already paid via card
      status: 'processing', // Set to processing as requested by user
      yocoCheckoutId: checkoutId,
      yocoPaymentId: payment.id,
      transactionFeeAmount: fees.feeAmount,
      transactionFeePercentage: fees.feePercentage,
      paymentReceivedDate: new Date().toISOString(),
      creditUsed: creditUsed, // Include credit usage in order
    };

    // Use the exact same method signature as EFT flow: createOrder(order, orderItems)

    try {
      console.log('🚀 WEBHOOK: Attempting to create order with data:', {
        orderNumber: order.orderNumber,
        customerEmail: order.customerEmail,
        totalAmount: order.totalAmount,
        orderItemsCount: orderItems.length,
        paymentId: payment.id
      });
      
      const newOrder = await storage.createOrder(order, orderItems);
      
      console.log('✅ WEBHOOK: Order created successfully:', {
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        status: newOrder.status,
        paymentStatus: newOrder.paymentStatus
      });

      // Verify order items were actually created in database
      const verifyOrderItems = await storage.getOrderItems(newOrder.id);
      console.log('✅ WEBHOOK: Order items verified:', verifyOrderItems.length, 'items created');

    // Create order status history entry for the newly created order
    await storage.addOrderStatusHistory(
      newOrder.id,
      'confirmed',
      'payment_received',
      'system',
      null, // changedByUserId
      'order_created_after_payment',
      `Order created after successful card payment. Payment ID: ${payment.id}. Transaction fee: R${fees.feeAmount.toFixed(2)} (${fees.feePercentage}%)`
    );

    // CRITICAL FIX: Deduct customer credits if credits were used in the order
    if (creditUsed > 0) {
      try {
        await storage.useUserCredits(
          customerId,
          creditUsed,
          `Credits used for Order #${newOrder.orderNumber}`,
          newOrder.id
        );
        
        console.log(`✅ Successfully deducted R${creditUsed} credits from customer ${customerId} for order ${newOrder.id}`);
        
        // Add additional status history entry for credit deduction
        await storage.addOrderStatusHistory(
          newOrder.id,
          'confirmed',
          'payment_received',
          'system',
          null,
          'credits_deducted',
          `R${creditUsed.toFixed(2)} credits deducted from customer balance for this order`
        );
        
      } catch (creditError: any) {
        console.error(`❌ Failed to deduct credits for order ${newOrder.id}:`, creditError);
        
        // Log the credit deduction failure but don't fail the entire order
        await storage.addOrderStatusHistory(
          newOrder.id,
          'confirmed',
          'payment_received',
          'system',
          null,
          'credit_deduction_failed',
          `Failed to deduct R${creditUsed.toFixed(2)} credits: ${creditError?.message || 'Unknown error'}`
        );
      }
    }



    // CRITICAL ADDITION: Generate PDF invoice for card payment (same as admin payment_received workflow)
    let invoicePath = null;
    try {
      // Get full order details with items for invoice generation
      const baseOrder = await storage.getOrderById(newOrder.id);
      
      if (baseOrder) {
        const orderItemsData = await storage.getOrderItems(newOrder.id);
        const fullOrder = {
          ...baseOrder,
          orderItems: orderItemsData || []
        };



        if (fullOrder.orderItems && fullOrder.orderItems.length > 0) {
          // Fetch VAT settings from systemSettings for invoice generation
          let vatSettings = {
            vatRate: 0,
            vatAmount: 0,
            vatRegistered: false,
            vatRegistrationNumber: ''
          };

          try {
            const vatRateResult = await storage.getSystemSetting('vatRate');
            const vatRegNumberResult = await storage.getSystemSetting('vatRegistrationNumber');
            const vatRegisteredResult = await storage.getSystemSetting('vatRegistered');

            const vatRate = parseFloat(vatRateResult?.settingValue || '0');
            const vatRegistered = vatRegisteredResult?.settingValue === 'true';
            const vatRegistrationNumber = vatRegNumberResult?.settingValue || '';

            if (vatRegistered && vatRate > 0) {
              const vatableAmount = fullOrder.subtotalAmount + fullOrder.shippingCost;
              vatSettings.vatAmount = parseFloat((vatableAmount * (vatRate / 100)).toFixed(2));
            }

            vatSettings.vatRate = vatRate;
            vatSettings.vatRegistered = vatRegistered;
            vatSettings.vatRegistrationNumber = vatRegistrationNumber;


          } catch (vatError) {

          }

          const invoiceData = {
            orderNumber: fullOrder.orderNumber,
            customerName: fullOrder.customerName,
            customerEmail: fullOrder.customerEmail,
            customerPhone: fullOrder.customerPhone,
            shippingAddress: fullOrder.shippingAddress, // Legacy field, not used on invoice
            shippingCity: fullOrder.shippingCity, // Legacy field, not used on invoice
            shippingPostalCode: fullOrder.shippingPostalCode, // Legacy field, not used on invoice
            selectedLockerName: fullOrder.selectedLockerName || undefined, // PUDO locker name for invoice
            selectedLockerAddress: fullOrder.selectedLockerAddress || undefined, // PUDO locker address for invoice
            selectedLockerCode: fullOrder.selectedLockerCode || undefined, // PUDO locker code for invoice
            orderItems: fullOrder.orderItems.map(item => ({
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              attributeDisplayText: item.attributeDisplayText || undefined
            })),
            subtotalAmount: fullOrder.subtotalAmount,
            shippingCost: fullOrder.shippingCost,
            vatAmount: vatSettings.vatAmount,
            vatRate: vatSettings.vatRate,
            vatRegistered: vatSettings.vatRegistered,
            vatRegistrationNumber: vatSettings.vatRegistrationNumber,
            creditUsed: fullOrder.creditUsed ? parseFloat(fullOrder.creditUsed.toString()) : undefined,
            remainingBalance: fullOrder.remainingBalance ? parseFloat(fullOrder.remainingBalance.toString()) : undefined,
            totalAmount: fullOrder.totalAmount,
            paymentMethod: fullOrder.paymentMethod,
            paymentReceivedDate: new Date().toISOString(),
            userId: fullOrder.userId
          };



          const { InvoiceGenerator } = await import('./services/invoice-generator.js');
          const invoiceGenerator = InvoiceGenerator.getInstance();
          invoicePath = await invoiceGenerator.generateInvoicePDF(invoiceData);

          // Update order with invoice path
          await storage.updateOrderInvoicePath(newOrder.id, invoicePath);


        }
      }
    } catch (invoiceError) {
      // Don't fail the webhook for invoice errors
    }

      // Send combined order confirmation and payment confirmation email
      try {
        const orderWithDetails = await storage.getOrderById(newOrder.id);
        
        if (orderWithDetails) {
          // Get order items for the combined email
          const orderItemsData = await storage.getOrderItems(newOrder.id);
          
          // Create combined order confirmation and payment confirmation email data
          const combinedEmailData = {
            email: orderWithDetails.customerEmail,
            customerName: orderWithDetails.customerName,
            orderNumber: orderWithDetails.orderNumber,
            orderId: orderWithDetails.id,
            orderItems: orderItemsData.map(item => ({
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              attributeDisplayText: item.attributeDisplayText || undefined
            })),
            subtotalAmount: orderWithDetails.subtotalAmount,
            shippingCost: orderWithDetails.shippingCost,
            totalAmount: orderWithDetails.totalAmount,
            paymentMethod: 'card',
            paymentStatus: 'payment_received',
            shippingMethod: orderWithDetails.shippingMethod || 'pudo',
            selectedLockerName: orderWithDetails.selectedLockerName,
            selectedLockerAddress: orderWithDetails.selectedLockerAddress,
            selectedLockerCode: orderWithDetails.selectedLockerCode,
            shippingAddress: orderWithDetails.shippingAddress,
            shippingCity: orderWithDetails.shippingCity,
            shippingPostalCode: orderWithDetails.shippingPostalCode,
            vatAmount: orderWithDetails.vatAmount || 0,
            vatRate: orderWithDetails.vatRate || 0,
            vatRegistered: false, // Default value since field doesn't exist on order
            vatRegistrationNumber: orderWithDetails.vatRegistrationNumber || '',
            invoicePath: invoicePath // Include the generated invoice path for attachment
          };
          

          
          // Send payment confirmation email with invoice attachment - same pattern as EFT admin flow
          const paymentEmailData = {
            email: orderWithDetails.customerEmail,
            customerName: orderWithDetails.customerName,
            orderNumber: orderWithDetails.orderNumber,
            orderId: orderWithDetails.id,
            amount: orderWithDetails.totalAmount,
            currency: 'R',
            paymentMethod: orderWithDetails.paymentMethod,
            invoicePath: invoicePath || undefined // Include invoice path for attachment - same as EFT
          };

          await databaseEmailService.sendPaymentConfirmationEmail(paymentEmailData);
        }
      } catch (emailError) {
        // Email sending failed but don't fail the webhook
        // Don't fail the webhook for email errors
      }

      // YoCo compliance: Respond quickly (within 15 seconds as required by documentation)
      const webhookResponse = { 
        received: true, 
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        checkoutId,
        tempCheckoutId,
        status: 'order_created_and_paid',
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - (event.payload.createdDate ? new Date(event.payload.createdDate).getTime() : Date.now())
      };
      
      res.status(200).json(webhookResponse);

    } catch (orderCreationError) {
      console.error('❌ WEBHOOK: Order creation failed:', orderCreationError);
      logger.error('Order creation failed in YoCo webhook', { 
        error: orderCreationError,
        checkoutId,
        customerEmail,
        orderData: {
          orderNumber: order.orderNumber,
          customerEmail: order.customerEmail,
          totalAmount: order.totalAmount
        }
      });
      return res.status(500).json({ error: 'Failed to create order from payment' });
    }

  } catch (error) {
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