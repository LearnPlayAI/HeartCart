/**
 * YoCo Webhook Routes
 * Handles YoCo payment webhooks for card payment verification
 */

import { Router, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { yocoService, YocoPaymentEvent } from './yoco-service.js';
import { unifiedEmailService } from './unified-email-service.js';
import { db } from './db';
import { products } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

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

    console.log('\n💥💥💥 YOCO WEBHOOK RECEIVED! 💥💥💥');
    console.log('═'.repeat(80));
    console.log('WEBHOOK DETAILS:');
    console.log('  webhookId:', webhookId);
    console.log('  timestamp:', timestamp);
    console.log('  eventType:', req.body.type);
    console.log('  hasSignature:', !!signature);
    console.log('  paymentId:', req.body.payload?.id);
    console.log('  paymentAmount:', req.body.payload?.amount);
    console.log('  paymentCurrency:', req.body.payload?.currency);
    console.log('  checkoutId:', req.body.payload?.metadata?.checkoutId);
    console.log('  tempCheckoutId:', req.body.payload?.metadata?.tempCheckoutId);
    console.log('  customerId:', req.body.payload?.metadata?.customerId);
    console.log('  customerEmail:', req.body.payload?.metadata?.customerEmail);
    console.log('  customerFullName:', req.body.payload?.metadata?.customerFullName);
    console.log('  customerPhone:', req.body.payload?.metadata?.customerPhone);
    console.log('  webhookSecretConfigured:', !!process.env.YOCO_WEBHOOK_SECRET);
    console.log('  webhookSecretUsed:', process.env.YOCO_WEBHOOK_SECRET?.substring(0, 20) + '...');
    console.log('═'.repeat(80));

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
    const customerFullName = payment.metadata.customerFullName; // Extract customer's full name from metadata
    const customerPhone = payment.metadata.customerPhone; // CRITICAL FIX: Extract customer phone from metadata
    const cartDataStr = payment.metadata.cartData;

    console.log('Processing successful payment:', {
      paymentId: payment.id,
      checkoutId,
      tempCheckoutId,
      customerId,
      customerEmail,
      customerFullName, // Log customer's full name for debugging
      customerPhone, // CRITICAL FIX: Log customer phone for debugging
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

    // CRITICAL FIX: Validate customer data before order creation with robust fallbacks
    if (!customerEmail) {
      console.error('CustomerEmail is null or missing from payment metadata');
      return res.status(400).json({ error: 'Customer email missing from payment data' });
    }
    
    // ENHANCED: Use fallback values for non-critical fields instead of failing entire order
    const finalCustomerFullName = customerFullName || cartData.customerName || `Customer ${customerId}`;
    const finalCustomerPhone = customerPhone || cartData.customerPhone || '+27712063084'; // Use TeeMeYou contact as fallback
    
    if (!finalCustomerFullName || finalCustomerFullName.trim() === '') {
      console.error('CustomerFullName could not be determined from metadata or cart data');
      return res.status(400).json({ error: 'Customer name missing from payment data' });
    }
    
    console.log('CRITICAL DEBUG: Customer data validation results:', {
      originalCustomerFullName: customerFullName,
      originalCustomerPhone: customerPhone,
      cartCustomerName: cartData.customerName,
      cartCustomerPhone: cartData.customerPhone,
      finalCustomerFullName,
      finalCustomerPhone,
      fallbackUsedForName: finalCustomerFullName !== customerFullName,
      fallbackUsedForPhone: finalCustomerPhone !== customerPhone
    });

    // CRITICAL FIX: Import storage once for entire webhook processing
    const { storage } = await import('./storage.js');

    // Check if order already exists for this checkout (prevent duplicates)
    try {
      const existingOrder = await storage.getOrderByYocoCheckoutId(checkoutId);
      if (existingOrder) {
        console.log('Order already created for checkout:', existingOrder.orderNumber);
        return res.status(200).json({ received: true, orderId: existingOrder.id, message: 'Already processed' });
      }
    } catch (orderCheckError) {
      console.warn('Error checking for existing order (proceeding with creation):', {
        error: orderCheckError.message,
        checkoutId
      });
      // Continue with order creation even if check fails
    }

    console.log('CRITICAL DEBUG: Cart data structure analysis:', {
      cartDataKeys: Object.keys(cartData),
      fullCartData: JSON.stringify(cartData, null, 2)
    });

    console.log('CRITICAL DEBUG: Address field extraction with validated customer data:', { 
      checkoutId, 
      customerId,
      customerEmail,
      originalCustomerFullName: customerFullName, // Debug original customer name from metadata
      originalCustomerPhone: customerPhone, // Debug original customer phone from metadata
      finalCustomerFullName, // Debug validated customer name with fallbacks
      finalCustomerPhone, // Debug validated customer phone with fallbacks
      hasOrderItems: !!cartData.orderItems,
      orderItemsCount: cartData.orderItems?.length || 0,
      cartDataCustomerName: cartData.customerName, // Debug customer name in cart data
      cartDataCustomerPhone: cartData.customerPhone, // Debug customer phone in cart data
      // CRITICAL FIX: Debug nested address structure (matching EFT flow)
      hasShippingAddress: !!cartData.shippingAddress,
      shippingAddressStructure: cartData.shippingAddress,
      addressLine1: cartData.shippingAddress?.addressLine1,
      addressLine2: cartData.shippingAddress?.addressLine2,
      city: cartData.shippingAddress?.city,
      province: cartData.shippingAddress?.province,
      postalCode: cartData.shippingAddress?.postalCode
    });

    // YoCo compliance: Calculate transaction fees for profit tracking (absorbed by company, not charged to customer)
    const fees = yocoService.calculateTransactionFees(payment.amount);
    
    console.log('YoCo transaction fees calculated for profit tracking:', {
      orderAmount: payment.amount / 100,
      feeAmount: fees.feeAmount,
      feePercentage: fees.feePercentage,
      netRevenue: (payment.amount / 100) - fees.feeAmount,
      checkoutId
    });
    
    // Extract order and orderItems from cart data (like EFT flow)
    // CRITICAL FIX: Extract address fields from nested shippingAddress object
    // CRITICAL DEBUG: Check multiple possible field names for order items
    let rawOrderItems = cartData.orderItems || cartData.items || cartData.lineItems || [];
    const { shippingAddress: addressData, ...orderData } = cartData;
    
    console.log('\n🚨🚨🚨 YOCO WEBHOOK ORDER ITEMS DEBUG 🚨🚨🚨');
    console.log('=' .repeat(80));
    console.log('ORDER ITEMS FIELD DETECTION:');
    console.log('  hasOrderItems:', !!cartData.orderItems);
    console.log('  hasItems:', !!cartData.items);
    console.log('  hasLineItems:', !!cartData.lineItems);
    console.log('  orderItemsLength:', cartData.orderItems?.length || 0);
    console.log('  itemsLength:', cartData.items?.length || 0);
    console.log('  lineItemsLength:', cartData.lineItems?.length || 0);
    console.log('  selectedField:', rawOrderItems === cartData.orderItems ? 'orderItems' : 
                     rawOrderItems === cartData.items ? 'items' :
                     rawOrderItems === cartData.lineItems ? 'lineItems' : 'none');
    console.log('  rawOrderItemsLength:', rawOrderItems?.length || 0);
    console.log('=' .repeat(80));

    // CRITICAL FIX: Enrich order items with product names from database (preventing null productName constraint violations)
    console.log('CRITICAL DEBUG: Raw order items before enrichment:', {
      rawOrderItems: rawOrderItems,
      itemCount: rawOrderItems?.length || 0,
      sampleItem: rawOrderItems?.[0],
      isArray: Array.isArray(rawOrderItems),
      typeOfRawOrderItems: typeof rawOrderItems
    });

    // EMERGENCY DEBUG: If no order items found in any expected field, log all cart data fields
    if (!rawOrderItems || !Array.isArray(rawOrderItems) || rawOrderItems.length === 0) {
      console.log('\n❌❌❌ CRITICAL ISSUE: NO ORDER ITEMS FOUND! ❌❌❌');
      console.log('*'.repeat(80));
      console.log('CART DATA ANALYSIS:');
      console.log('  cartDataKeys:', Object.keys(cartData));
      console.log('  cartDataValues:');
      Object.entries(cartData).forEach(([key, value]) => {
        console.log(`    ${key}:`, Array.isArray(value) ? `Array(${value.length})` : typeof value);
      });
      console.log('\nFULL CART DATA SAMPLE:');
      console.log(JSON.stringify(cartData, null, 2).substring(0, 2000));
      console.log('*'.repeat(80));
    }

    const orderItems = [];
    if (rawOrderItems && Array.isArray(rawOrderItems)) {
      for (const item of rawOrderItems) {
        try {
          // Fetch product name from database using productId
          const product = await db
            .select({ name: products.name })
            .from(products)
            .where(eq(products.id, item.productId))
            .limit(1);

          const productName = product[0]?.name || `Product ID ${item.productId}`;
          
          // CRITICAL FIX: Ensure all required database fields are present
          const enrichedItem = {
            ...item,
            productName: productName,  // CRITICAL FIX: Add productName from database
            totalPrice: item.quantity * item.unitPrice,  // CRITICAL FIX: Calculate totalPrice (required field)
            selectedAttributes: item.selectedAttributes || item.attributeSelections || {},  // Ensure selectedAttributes exists
            productSku: item.productSku || null,  // Optional field
            productImageUrl: item.productImageUrl || null,  // Optional field
            attributeDisplayText: item.attributeDisplayText || null  // Optional field
          };
          
          orderItems.push(enrichedItem);
          
          console.log('CRITICAL DEBUG: Enriched order item with productName:', {
            productId: item.productId,
            productName: productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice
          });
        } catch (productFetchError) {
          console.error('Error fetching product name for order item:', {
            error: productFetchError,
            productId: item.productId,
            itemIndex: orderItems.length
          });
          
          // Use fallback product name to prevent null constraint violation
          const enrichedItem = {
            ...item,
            productName: `Product ID ${item.productId}`
          };
          orderItems.push(enrichedItem);
        }
      }
    }

    // CRITICAL DEBUG: Ensure we have order items before proceeding
    if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
      console.error('CRITICAL ERROR: No order items found after enrichment process!', {
        originalRawOrderItems: rawOrderItems,
        enrichedOrderItems: orderItems,
        cartDataKeys: Object.keys(cartData),
        checkoutId
      });
      return res.status(400).json({ error: 'No order items found in cart data' });
    }

    console.log('CRITICAL DEBUG: Final enriched order items before database insertion:', {
      enrichedItemCount: orderItems.length,
      allItemsHaveProductName: orderItems.every(item => item.productName),
      sampleEnrichedItem: orderItems[0],
      allItemDetails: orderItems.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice
      }))
    });

    // EMERGENCY STOP: If no order items after enrichment, fail the webhook
    if (!orderItems || orderItems.length === 0) {
      console.error('CRITICAL FAILURE: No order items after enrichment process!');
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
    
    console.log('CRITICAL DEBUG: Destructured address fields from nested structure:', {
      hasShippingAddress: !!addressData,
      shippingAddressObject: addressData,
      addressLine1,
      addressLine2, 
      city,
      province,
      postalCode,
      orderDataKeys: Object.keys(orderData)
    });
    
    // CRITICAL FIX: Properly map address fields from cart data to order fields with fallback
    const shippingAddress = addressLine2 ? `${addressLine1}, ${addressLine2}` : addressLine1;
    
    console.log('CRITICAL DEBUG: Final address mapping before order creation:', {
      shippingAddress,
      shippingCity: city,
      shippingProvince: province,
      shippingPostalCode: postalCode
    });
    
    // CRITICAL FIX: Calculate all required financial fields from order items
    let calculatedSubtotal = 0;
    let calculatedShippingCost = 85; // Default PUDO shipping
    let calculatedVatAmount = 0;
    let calculatedVatRate = 0;

    // Calculate subtotal from order items
    if (orderItems && Array.isArray(orderItems)) {
      calculatedSubtotal = orderItems.reduce((sum, item) => {
        return sum + (item.quantity * item.unitPrice);
      }, 0);
    }

    // Extract shipping cost from cart data if available
    if (orderData.shippingCost && typeof orderData.shippingCost === 'number') {
      calculatedShippingCost = orderData.shippingCost;
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

    console.log('CRITICAL FIX: Calculated financial fields for order creation:', {
      calculatedSubtotal,
      calculatedShippingCost,
      calculatedVatAmount,
      calculatedVatRate,
      calculatedTotalAmount,
      paymentAmountFromYoCo: payment.amount / 100, // YoCo amount in cents
      orderItemsCount: orderItems?.length || 0,
      orderDataShippingCost: orderData.shippingCost,
      orderDataVatAmount: orderData.vatAmount,
      orderDataVatRate: orderData.vatRate
    });

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
      // CRITICAL FIX: Set all required financial fields to prevent null constraint errors
      subtotalAmount: calculatedSubtotal,
      totalAmount: calculatedTotalAmount,
      shippingCost: calculatedShippingCost,
      vatAmount: calculatedVatAmount,
      vatRate: calculatedVatRate,
      vatRegistrationNumber: orderData.vatRegistrationNumber || '4567890123', // Default VAT number
      paymentMethod: 'card',
      paymentStatus: 'payment_received', // Already paid via card
      status: 'confirmed', // Auto-confirm card payments
      yocoCheckoutId: checkoutId,
      yocoPaymentId: payment.id,
      transactionFeeAmount: fees.feeAmount,
      transactionFeePercentage: fees.feePercentage,
      paymentReceivedDate: new Date().toISOString(),
    };

    // Use the exact same method signature as EFT flow: createOrder(order, orderItems)
    console.log('FINAL DEBUG: Complete order object before database insertion:', {
      fullOrder: JSON.stringify(order, null, 2),
      orderKeys: Object.keys(order),
      orderItemsCount: orderItems?.length || 0,
      // Specific fields that are failing
      customerId: order.userId,
      customerEmail: order.customerEmail,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      shippingAddress: order.shippingAddress,
      shippingCity: order.shippingCity,
      shippingProvince: order.shippingProvince,
      shippingPostalCode: order.shippingPostalCode,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      status: order.status
    });
    
    // CRITICAL DEBUG: Log exactly what we're passing to storage.createOrder
    console.log('\n✅✅✅ CALLING storage.createOrder() ✅✅✅');
    console.log('#'.repeat(80));
    console.log('ORDER DATA KEYS:', Object.keys(order));
    console.log('ORDER SAMPLE:');
    console.log('  customerName:', order.customerName);
    console.log('  customerEmail:', order.customerEmail);
    console.log('  customerPhone:', order.customerPhone);
    console.log('  userId:', order.userId);
    console.log('  totalAmount:', order.totalAmount);
    console.log('  subtotalAmount:', order.subtotalAmount);
    console.log('  paymentMethod:', order.paymentMethod);
    console.log('  paymentStatus:', order.paymentStatus);
    console.log('  status:', order.status);
    console.log('\nORDER ITEMS COUNT:', orderItems.length);
    if (orderItems.length > 0) {
      console.log('ORDER ITEMS ARRAY:');
      orderItems.forEach((item, index) => {
        console.log(`  [${index}]:`, {
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          hasAllRequiredFields: !!(item.productId && item.productName && item.quantity && item.unitPrice)
        });
      });
      console.log('\nFULL ORDER ITEMS JSON:');
      console.log(JSON.stringify(orderItems, null, 2));
    } else {
      console.log('⚠️ WARNING: ZERO ORDER ITEMS TO CREATE!');
    }
    console.log('#'.repeat(80));

    try {
      const newOrder = await storage.createOrder(order, orderItems);
      
      console.log('Order created successfully:', {
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        status: newOrder.status,
        paymentStatus: newOrder.paymentStatus,
        itemsPassedToCreate: orderItems.length,
        orderCreationSuccess: true
      });

      // Verify order items were actually created in database
      const verifyOrderItems = await storage.getOrderItems(newOrder.id);
      console.log('Order items verification after creation:', {
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        orderItemsInDatabase: verifyOrderItems.length,
        expectedOrderItems: orderItems.length,
        orderItemsMatch: verifyOrderItems.length === orderItems.length,
        orderItemsSample: verifyOrderItems.slice(0, 2).map(item => ({
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity
        }))
      });

    // Create order status history entry for the newly created order
    await storage.createOrderStatusHistory({
      orderId: newOrder.id,
      status: 'confirmed',
      paymentStatus: 'payment_received',
      previousStatus: 'pending',
      previousPaymentStatus: 'pending',
      changedBy: 'system',
      eventType: 'order_created_after_payment',
      notes: `Order created after successful card payment. Payment ID: ${payment.id}. Transaction fee: R${fees.feeAmount.toFixed(2)} (${fees.feePercentage}%)`,
    });

    console.log('Order created successfully after payment:', {
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      status: 'confirmed',
      paymentStatus: 'payment_received',
      transactionFee: fees.feeAmount,
    });

    // CRITICAL ADDITION: Generate PDF invoice for card payment (same as admin payment_received workflow)
    let invoicePath = null;
    try {
      // Get full order details with items for invoice generation
      const baseOrder = await storage.getOrderById(newOrder.id);
      console.log('INVOICE DEBUG: Retrieved base order for invoice generation:', {
        orderId: newOrder.id,
        orderExists: !!baseOrder,
        baseOrderStatus: baseOrder?.status,
        baseOrderPaymentStatus: baseOrder?.paymentStatus
      });
      
      if (baseOrder) {
        const orderItemsData = await storage.getOrderItems(newOrder.id);
        const fullOrder = {
          ...baseOrder,
          orderItems: orderItemsData || []
        };

        console.log('INVOICE DEBUG: Order items retrieved for invoice generation:', {
          orderId: newOrder.id,
          orderItemsCount: fullOrder.orderItems?.length || 0,
          orderItems: fullOrder.orderItems?.map(item => ({
            id: item.id,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice
          }))
        });

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

            console.log('VAT settings fetched for YoCo invoice generation:', {
              orderId: newOrder.id,
              vatRate: vatSettings.vatRate,
              vatAmount: vatSettings.vatAmount,
              vatRegistered: vatSettings.vatRegistered
            });
          } catch (vatError) {
            console.error('Failed to fetch VAT settings for YoCo invoice, using defaults:', vatError);
          }

          const invoiceData = {
            orderNumber: fullOrder.orderNumber,
            customerName: fullOrder.customerName,
            customerEmail: fullOrder.customerEmail,
            customerPhone: fullOrder.customerPhone,
            shippingAddress: fullOrder.shippingAddress,
            shippingCity: fullOrder.shippingCity,
            shippingPostalCode: fullOrder.shippingPostalCode,
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

          console.log('PDF invoice generated for YoCo payment:', {
            orderId: newOrder.id,
            orderNumber: newOrder.orderNumber,
            invoicePath
          });
        } else {
          console.error('INVOICE ERROR: No order items found for invoice generation:', {
            orderId: newOrder.id,
            orderNumber: newOrder.orderNumber,
            orderItemsCount: fullOrder.orderItems?.length || 0,
            orderItemsData: fullOrder.orderItems
          });
        }
      } else {
        console.error('INVOICE ERROR: No base order found for invoice generation:', {
          orderId: newOrder.id,
          orderNumber: newOrder.orderNumber
        });
      }
    } catch (invoiceError) {
      console.error('Failed to generate invoice for YoCo payment:', {
        error: invoiceError,
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        errorMessage: invoiceError instanceof Error ? invoiceError.message : String(invoiceError),
        errorStack: invoiceError instanceof Error ? invoiceError.stack : undefined
      });
      // Don't fail the webhook for invoice errors
    }

      // Send order confirmation and payment confirmation emails
      try {
        const orderWithDetails = await storage.getOrderById(newOrder.id);
        if (orderWithDetails) {
          // Send both order confirmation and payment confirmation emails
          await unifiedEmailService.sendOrderConfirmationEmail(orderWithDetails);
          await unifiedEmailService.sendPaymentConfirmationEmail(orderWithDetails);
          console.log('Order confirmation and payment confirmation emails sent for order:', newOrder.orderNumber);
        }
      } catch (emailError) {
        console.error('Failed to send confirmation emails:', emailError);
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
      
      console.log('YoCo webhook processed successfully:', webhookResponse);
      res.status(200).json(webhookResponse);

    } catch (orderCreationError) {
      console.error('Failed to create order from YoCo webhook:', {
        error: orderCreationError,
        checkoutId,
        customerEmail,
        orderItemsCount: orderItems.length,
        errorMessage: orderCreationError instanceof Error ? orderCreationError.message : String(orderCreationError),
        errorStack: orderCreationError instanceof Error ? orderCreationError.stack : undefined
      });
      return res.status(500).json({ error: 'Failed to create order from payment' });
    }

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