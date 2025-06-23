import express, { Request, Response } from "express";
import { z } from "zod";
import asyncHandler from "express-async-handler";
import { storage } from "./storage";
import { isAuthenticated } from "./auth-middleware";
import { sendSuccess, sendError } from "./api-response";
import { logger } from "./logger";

const router = express.Router();

// Payment session schema for checkout preparation
const createPaymentSessionSchema = z.object({
  customerInfo: z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Valid email is required"),
    phone: z.string().min(1, "Phone number is required")
  }),
  shippingAddress: z.object({
    addressLine1: z.string().min(1, "Address line 1 is required"),
    addressLine2: z.string().optional(),
    city: z.string().min(1, "City is required"),
    province: z.string().min(1, "Province is required"),
    postalCode: z.string().min(1, "Postal code is required")
  }),
  shippingMethod: z.string().default("pudo"),
  shippingCost: z.number(),
  paymentMethod: z.string().default("eft"),
  specialInstructions: z.string().optional(),
  orderItems: z.array(z.object({
    productId: z.number(),
    quantity: z.number(),
    unitPrice: z.number(),
    productAttributes: z.record(z.union([z.string(), z.record(z.number())])).optional()
  })),
  subtotal: z.number(),
  total: z.number(),
  creditUsed: z.number().default(0),
  selectedLockerId: z.number().optional(),
  lockerDetails: z.object({
    code: z.string(),
    name: z.string(),
    address: z.string(),
    provider: z.string()
  }).optional()
});

// Payment confirmation schema
const confirmPaymentSchema = z.object({
  sessionId: z.string(),
  paymentProof: z.object({
    method: z.enum(["eft", "credit"]),
    transactionReference: z.string().optional(),
    amount: z.number()
  })
});

// Create payment session - prepare order without creating it
router.post("/session", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  try {
    const sessionData = createPaymentSessionSchema.parse(req.body);
    const userId = req.user!.id;

    logger.info("Creating payment session", { 
      userId: userId,
      paymentMethod: sessionData.paymentMethod,
      total: sessionData.total
    });

    // Validate cart items exist and prices match
    const cart = await storage.getCartWithProducts(userId);
    if (!cart || cart.length === 0) {
      return sendError(res, "Cart is empty", 400);
    }

    // Validate credit balance if using credits
    if (sessionData.creditUsed && sessionData.creditUsed > 0) {
      const creditBalance = await storage.getUserCreditBalance(userId);
      if (creditBalance.availableCreditAmount < sessionData.creditUsed) {
        return sendError(res, "Insufficient credit balance", 400);
      }
    }

    // Create temporary payment session
    const sessionId = `pay_session_${Date.now()}_${userId}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Store session data temporarily (in production, use Redis or similar)
    const sessionInfo = {
      sessionId,
      userId,
      sessionData,
      expiresAt: expiresAt.toISOString(),
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // For now, store in memory - in production, use proper session storage
    global.paymentSessions = global.paymentSessions || new Map();
    global.paymentSessions.set(sessionId, sessionInfo);

    logger.info("Payment session created", {
      sessionId,
      userId,
      expiresAt: expiresAt.toISOString()
    });

    return sendSuccess(res, {
      sessionId,
      expiresAt: expiresAt.toISOString(),
      paymentMethod: sessionData.paymentMethod,
      total: sessionData.total,
      remainingBalance: sessionData.total - (sessionData.creditUsed || 0)
    });

  } catch (error) {
    logger.error("Error creating payment session", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.user?.id,
      requestBody: req.body
    });
    
    if (error instanceof z.ZodError) {
      return sendError(res, `Validation error: ${error.errors.map(e => e.message).join(', ')}`, 400);
    }
    
    return sendError(res, "Failed to create payment session", 500);
  }
}));

// Confirm payment and create order
router.post("/confirm", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  try {
    const paymentData = confirmPaymentSchema.parse(req.body);
    const userId = req.user!.id;

    logger.info("Payment confirmation attempt", {
      sessionId: paymentData.sessionId,
      userId: userId,
      paymentMethod: paymentData.paymentProof.method
    });

    // Retrieve payment session
    global.paymentSessions = global.paymentSessions || new Map();
    const session = global.paymentSessions.get(paymentData.sessionId);
    
    if (!session) {
      return sendError(res, "Payment session not found or expired", 404);
    }

    if (session.userId !== userId) {
      return sendError(res, "Unauthorized access to payment session", 403);
    }

    if (new Date() > new Date(session.expiresAt)) {
      global.paymentSessions.delete(paymentData.sessionId);
      return sendError(res, "Payment session has expired", 400);
    }

    if (session.status !== 'pending') {
      return sendError(res, "Payment session already processed", 400);
    }

    const sessionData = session.sessionData;

    // Process payment based on method
    let paymentVerified = false;
    let finalPaymentStatus = "pending";
    let remainingBalance = sessionData.total;

    if (paymentData.paymentProof.method === "credit") {
      // For credit payments, verify and deduct immediately
      if (sessionData.creditUsed && sessionData.creditUsed > 0) {
        const creditBalance = await storage.getUserCreditBalance(userId);
        if (creditBalance.availableCreditAmount >= sessionData.creditUsed) {
          remainingBalance = sessionData.total - sessionData.creditUsed;
          if (remainingBalance <= 0) {
            paymentVerified = true;
            finalPaymentStatus = "paid";
            remainingBalance = 0;
          }
        } else {
          return sendError(res, "Insufficient credit balance", 400);
        }
      }
    } else if (paymentData.paymentProof.method === "eft") {
      // For EFT, mark as pending payment (to be verified by admin)
      finalPaymentStatus = "pending";
      paymentVerified = false; // Will be verified later by admin
    }

    // Mark session as processing
    session.status = 'processing';
    global.paymentSessions.set(paymentData.sessionId, session);

    // Only create order if payment is verified OR if it's EFT (pending verification)
    if (paymentVerified || paymentData.paymentProof.method === "eft") {
      
      // Prepare order items with product details
      const orderItems = [];
      for (const item of sessionData.orderItems) {
        const product = await storage.getProductById(item.productId);
        if (!product) {
          return sendError(res, `Product ${item.productId} not found`, 404);
        }

        // Generate attribute display text
        const attributeDisplayText = generateAttributeDisplayText(item.productAttributes || {});

        orderItems.push({
          productId: item.productId,
          productName: product.name,
          productSku: product.sku,
          productImageUrl: product.imageUrl,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice * item.quantity,
          selectedAttributes: item.productAttributes || {},
          attributeDisplayText: attributeDisplayText,
        });
      }

      // Determine order status
      let orderStatus = "pending";
      if (finalPaymentStatus === "paid") {
        orderStatus = "confirmed";
      }

      // Create order object
      const order = {
        userId: userId,
        status: orderStatus,
        customerName: `${sessionData.customerInfo.firstName} ${sessionData.customerInfo.lastName}`,
        customerEmail: sessionData.customerInfo.email,
        customerPhone: sessionData.customerInfo.phone,
        shippingAddress: `${sessionData.shippingAddress.addressLine1}${sessionData.shippingAddress.addressLine2 ? ', ' + sessionData.shippingAddress.addressLine2 : ''}`,
        shippingCity: sessionData.shippingAddress.city,
        shippingPostalCode: sessionData.shippingAddress.postalCode,
        shippingMethod: sessionData.shippingMethod,
        shippingCost: sessionData.shippingCost,
        paymentMethod: sessionData.paymentMethod,
        paymentStatus: finalPaymentStatus,
        subtotalAmount: sessionData.subtotal,
        totalAmount: sessionData.total,
        customerNotes: sessionData.specialInstructions || null,
        creditUsed: sessionData.creditUsed || 0,
        remainingBalance: remainingBalance,
        selectedLockerId: sessionData.selectedLockerId || null,
        lockerDetails: sessionData.lockerDetails || null,
      };

      // Create the order
      const newOrder = await storage.createOrder(order, orderItems);

      // If using credits and payment verified, deduct credits now
      if (paymentVerified && sessionData.creditUsed && sessionData.creditUsed > 0) {
        try {
          await storage.useUserCredits(
            userId,
            sessionData.creditUsed,
            `Credit applied to order #${newOrder.orderNumber}`,
            newOrder.id
          );
          
          logger.info("Credit successfully deducted after order creation", {
            userId: userId,
            orderId: newOrder.id,
            orderNumber: newOrder.orderNumber,
            creditUsed: sessionData.creditUsed
          });
        } catch (creditError) {
          logger.error("Credit deduction failed after order creation", {
            error: creditError,
            userId: userId,
            orderId: newOrder.id,
            requestedCredit: sessionData.creditUsed
          });
        }
      }

      // Clean up session
      global.paymentSessions.delete(paymentData.sessionId);

      logger.info("Order created successfully after payment confirmation", {
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        userId: userId,
        totalAmount: sessionData.total,
        paymentMethod: sessionData.paymentMethod,
        paymentStatus: finalPaymentStatus
      });

      return sendSuccess(res, {
        id: newOrder.id,
        orderNumber: newOrder.orderNumber,
        status: newOrder.status,
        totalAmount: newOrder.totalAmount,
        paymentStatus: finalPaymentStatus,
        message: "Order created successfully"
      });

    } else {
      // Clean up session if payment not verified
      global.paymentSessions.delete(paymentData.sessionId);
      return sendError(res, "Payment verification failed", 400);
    }

  } catch (error) {
    logger.error("Error confirming payment", {
      error: error instanceof Error ? error.message : String(error),
      userId: req.user?.id
    });
    return sendError(res, "Failed to confirm payment", 500);
  }
}));

// Helper function to generate attribute display text
function generateAttributeDisplayText(attributes: Record<string, string | Record<string, number>>): string {
  if (!attributes || Object.keys(attributes).length === 0) {
    return "";
  }
  
  return Object.entries(attributes)
    .map(([key, value]) => {
      if (typeof value === 'string') {
        return `${key}: ${value}`;
      } else if (typeof value === 'object' && value !== null) {
        const selections = Object.entries(value)
          .filter(([, qty]) => qty > 0)
          .map(([option, qty]) => qty > 1 ? `${option} x${qty}` : option)
          .join(', ');
        return `${key}: ${selections}`;
      }
      return `${key}: ${value}`;
    })
    .join(", ");
}

export default router;