import express, { Request, Response } from "express";
import { z } from "zod";
import asyncHandler from "express-async-handler";
import { storage } from "./storage";
import { isAuthenticated } from "./auth-middleware";
import { sendSuccess, sendError } from "./api-response";
import { insertOrderSchema, insertOrderItemSchema } from "@shared/schema";
import { logger } from "./logger";
import multer from "multer";
import path from "path";
import fs from "fs";
import { objectStore } from "./object-store";
import { databaseEmailService } from "./database-email-service";
import { PromotionValidationService } from "./promotion-validation-service";

// Define the order creation schema that matches the checkout form structure
const checkoutOrderSchema = z.object({
  customerInfo: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
  }),
  shippingAddress: z.object({
    addressLine1: z.string().min(1),
    addressLine2: z.string().optional(),
    city: z.string().min(1),
    province: z.string().min(1),
    postalCode: z.string().min(1),
  }),
  orderItems: z.array(z.object({
    productId: z.number(),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
    productAttributes: z.record(z.union([z.string(), z.record(z.number())])).optional(),
  })),
  shippingMethod: z.string(),
  shippingCost: z.number(),
  paymentMethod: z.string(),
  subtotal: z.number(),
  total: z.number(),
  specialInstructions: z.string().optional(),
  paymentReferenceNumber: z.string().optional(),
  paymentStatus: z.string().optional(),
});

const router = express.Router();

// Configure multer for PDF uploads - use memory storage like product images
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // Only allow PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Create order schema validation
const createOrderSchema = z.object({
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
  paymentReferenceNumber: z.string().optional(),
  paymentStatus: z.string().optional(),
  selectedLockerId: z.number().optional(),
  lockerDetails: z.object({
    code: z.string(),
    name: z.string(),
    address: z.string(),
    provider: z.string()
  }).optional()
});

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
        // Handle quantity-based attributes like {"Boy": 2, "Girl": 1}
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

// Create a new order
router.post("/", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  try {
    logger.info("Order creation attempt", { 
      userId: req.user?.id, 
      bodyKeys: Object.keys(req.body || {}),
      body: req.body 
    });

    const userId = req.user?.id;
    if (!userId) {
      logger.error("Order creation failed: User not authenticated");
      return sendError(res, "User not authenticated", 401);
    }

    // Validate request body using the checkout form schema
    logger.info("Validating order data", { orderData: req.body });
    let orderData;
    try {
      orderData = createOrderSchema.parse(req.body);
      logger.info("Order data validation successful", { orderData });
    } catch (validationError) {
      logger.error("Order validation failed", { 
        error: validationError.message, 
        issues: validationError.issues || validationError
      });
      return sendError(res, `Validation failed: ${validationError.message}`, 400);
    }

    // Use the order items from the request (checkout form already validates these)
    if (!orderData.orderItems || orderData.orderItems.length === 0) {
      return sendError(res, "No order items provided", 400);
    }

    // Validate products exist and prepare order items
    const orderItems = [];
    for (const item of orderData.orderItems) {
      // Verify product exists
      const product = await storage.getProductById(item.productId);
      if (!product) {
        return sendError(res, `Product with ID ${item.productId} not found`, 400);
      }

      // Generate attribute display text
      const attributeDisplayText = generateAttributeDisplayText(
        item.productAttributes || {}
      );

      // Create order item
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

    // Validate credit balance if specified, but don't deduct yet
    let finalPaymentStatus = orderData.paymentStatus || "verifying_payment"; // Default to verifying_payment for admin verification
    let remainingBalance = orderData.total;
    let shippingExemption = false;
    
    if (orderData.creditUsed && orderData.creditUsed > 0) {
      // Check if credits qualify for shipping exemption (from unshipped orders)
      shippingExemption = await storage.checkShippingExemptionForCredits(userId, orderData.creditUsed);
      
      if (shippingExemption) {
        // Recalculate total without shipping costs
        const subtotalWithoutShipping = orderData.subtotal;
        const newTotal = subtotalWithoutShipping;
        
        // Update order data with exempted shipping
        orderData.total = newTotal;
        orderData.shippingCost = 0;
        
        logger.info("Shipping exemption applied for credit usage", {
          userId: userId,
          creditUsed: orderData.creditUsed,
          originalTotal: remainingBalance + orderData.creditUsed,
          newTotal: newTotal,
          shippingSaved: 85 // R85 shipping cost waived
        });
      }
      
      // Calculate remaining balance after credit application
      remainingBalance = orderData.total - orderData.creditUsed;
      
      // If credit covers full amount, mark as paid (only if not already set by client)
      if (remainingBalance <= 0 && !orderData.paymentStatus) {
        finalPaymentStatus = "paid";
        remainingBalance = 0;
      }
      
      logger.info("Credit will be applied after order creation", {
        userId: userId,
        creditUsed: orderData.creditUsed,
        remainingBalance: remainingBalance,
        shippingExemption: shippingExemption,
        clientPaymentStatus: orderData.paymentStatus,
        finalPaymentStatus: finalPaymentStatus
      });
    }

    // Determine order status based on payment type
    let orderStatus = "pending";
    // Only automatically confirm orders that are fully paid with credits
    // EFT payments marked as "paid" by customer still need admin verification
    if (finalPaymentStatus === "paid" && remainingBalance === 0 && orderData.creditUsed > 0) {
      orderStatus = "confirmed"; // Only auto-confirm when fully paid with credits
    }
    // All other orders remain "pending" until admin manually verifies payment

    // Create order object with new structure including locker details
    const order = {
      userId: userId,
      status: orderStatus,
      customerName: `${orderData.customerInfo.firstName} ${orderData.customerInfo.lastName}`,
      customerEmail: orderData.customerInfo.email,
      customerPhone: orderData.customerInfo.phone,
      shippingAddress: `${orderData.shippingAddress.addressLine1}${orderData.shippingAddress.addressLine2 ? ', ' + orderData.shippingAddress.addressLine2 : ''}`,
      shippingCity: orderData.shippingAddress.city,
      shippingPostalCode: orderData.shippingAddress.postalCode,
      shippingMethod: orderData.shippingMethod,
      shippingCost: orderData.shippingCost,
      paymentMethod: orderData.paymentMethod,
      paymentStatus: finalPaymentStatus,
      subtotalAmount: orderData.subtotal,
      totalAmount: orderData.total,
      customerNotes: orderData.specialInstructions || null,
      creditUsed: orderData.creditUsed || 0,
      remainingBalance: remainingBalance,
      paymentReferenceNumber: orderData.paymentReferenceNumber || null,
      // PUDO Locker Details - mapping to camelCase columns
      selectedLockerId: orderData.selectedLockerId || null,
      selectedLockerCode: orderData.lockerDetails?.code || null,
      selectedLockerName: orderData.lockerDetails?.name || null,
      selectedLockerAddress: orderData.lockerDetails?.address || null,
      // Also save to the lockerDetails JSONB column
      lockerDetails: orderData.lockerDetails ? {
        id: orderData.selectedLockerId,
        code: orderData.lockerDetails.code,
        name: orderData.lockerDetails.name,
        address: orderData.lockerDetails.address,
        provider: orderData.lockerDetails.provider
      } : null,
    };

    // Validate cart items against promotion requirements before creating order
    try {
      // Convert orderItems to cart format for validation
      const cartItems = orderItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        product: {
          id: item.productId,
          name: item.productName,
          price: item.unitPrice,
          salePrice: item.unitPrice
        }
      }));

      const validationResult = await PromotionValidationService.validateCartForCheckout(cartItems);
      
      if (!validationResult.canProceedToCheckout) {
        logger.warn("Order creation blocked due to promotion validation failure", {
          userId,
          errors: validationResult.errors,
          blockedPromotions: validationResult.blockedPromotions
        });
        
        return sendError(res, 
          `Promotion requirements not met: ${validationResult.errors.join(', ')}`, 
          400, 
          {
            validationErrors: validationResult.errors,
            blockedPromotions: validationResult.blockedPromotions
          }
        );
      }

      logger.info("Promotion validation passed for order creation", {
        userId,
        validationResult: validationResult.isValid
      });
    } catch (validationError) {
      logger.error("Error during promotion validation", {
        error: validationError instanceof Error ? validationError.message : String(validationError),
        userId
      });
      // On validation error, allow order to proceed (fail safe)
    }

    // Create the order
    const newOrder = await storage.createOrder(order, orderItems);
    
    // ONLY NOW deduct credits after successful order creation using transaction-based system
    if (orderData.creditUsed && orderData.creditUsed > 0) {
      try {
        // Use the proper transaction-based credit deduction
        await storage.useUserCredits(
          userId,
          orderData.creditUsed,
          `Credit applied to order #${newOrder.orderNumber}`,
          newOrder.id
        );
        
        logger.info("Credit successfully deducted after order creation", {
          userId: userId,
          orderId: newOrder.id,
          orderNumber: newOrder.orderNumber,
          creditUsed: orderData.creditUsed
        });
      } catch (creditError) {
        logger.error("Credit deduction failed after order creation", {
          error: creditError,
          userId: userId,
          orderId: newOrder.id,
          requestedCredit: orderData.creditUsed
        });
        
        // Note: Order was already created successfully, credit deduction failure is logged but doesn't fail the order
        // This ensures order completion even if there's a credit system issue
      }
    }

    logger.info("Order created successfully", {
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      userId: userId,
      totalAmount: orderData.total,
      itemCount: orderItems.length,
    });

    // Send order confirmation email
    try {
      // Debug logging for order ID
      logger.info("Order confirmation email data preparation", {
        newOrderId: newOrder.id,
        newOrderNumber: newOrder.orderNumber,
        newOrderStructure: Object.keys(newOrder)
      });

      const emailData = {
        email: orderData.customerInfo.email,
        customerName: `${orderData.customerInfo.firstName} ${orderData.customerInfo.lastName}`,
        orderNumber: newOrder.orderNumber,
        orderId: newOrder.id,
        orderItems: orderItems.map(item => ({
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          attributeDisplayText: item.attributeDisplayText
        })),
        subtotalAmount: orderData.subtotal,
        shippingCost: orderData.shippingCost,
        totalAmount: orderData.total,
        paymentMethod: orderData.paymentMethod,
        paymentStatus: finalPaymentStatus,
        shippingMethod: orderData.shippingMethod,
        selectedLockerName: orderData.lockerDetails?.name,
        selectedLockerAddress: orderData.lockerDetails?.address,
        shippingAddress: orderData.shippingAddress.addressLine1 + (orderData.shippingAddress.addressLine2 ? ', ' + orderData.shippingAddress.addressLine2 : ''),
        shippingCity: orderData.shippingAddress.city,
        shippingPostalCode: orderData.shippingAddress.postalCode
      };

      await databaseEmailService.sendOrderConfirmationEmail(emailData);
      
      logger.info("Order confirmation email sent", {
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        customerEmail: orderData.customerInfo.email
      });
    } catch (emailError) {
      // Log email error but don't fail the order creation
      logger.error("Failed to send order confirmation email", {
        error: emailError,
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        customerEmail: orderData.customerInfo.email
      });
    }

    // Send standardized success response
    return sendSuccess(res, {
      id: newOrder.id,
      orderNumber: newOrder.orderNumber,
      status: newOrder.status,
      totalAmount: newOrder.totalAmount,
      message: "Order created successfully"
    }, 200);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, "Invalid order data", 400, error.errors);
    }
    
    // Log the full error details for debugging
    logger.error("Error creating order", { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.user?.id 
    });
    return sendError(res, "Failed to create order", 500);
  }
}));

// Get user's orders
router.get("/", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, "User not authenticated", 401);
    }

    const orders = await storage.getOrdersByUser(userId);
    
    return sendSuccess(res, orders);
  } catch (error) {
    logger.error("Error fetching user orders", { error, userId: req.user?.id });
    return sendError(res, "Failed to fetch orders", 500);
  }
}));

// Get specific order by ID with items
router.get("/:id", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);
    const userId = req.user?.id;
    
    if (!userId) {
      return sendError(res, "User not authenticated", 401);
    }

    if (isNaN(orderId)) {
      return sendError(res, "Invalid order ID", 400);
    }

    // Get the basic order details first
    const order = await storage.getOrderById(orderId);
    
    if (!order) {
      return sendError(res, "Order not found", 404);
    }

    // Check if user owns this order (or is admin)
    if (order.userId !== userId && req.user?.role !== "admin") {
      return sendError(res, "Access denied", 403);
    }

    logger.info("Retrieved order with items", { 
      orderId, 
      userId, 
      itemCount: order.items?.length || 0 
    });

    return sendSuccess(res, order);
  } catch (error) {
    logger.error("Error fetching order", { error, orderId: req.params.id, userId: req.user?.id });
    return sendError(res, "Failed to fetch order", 500);
  }
}));

// Custom multer configuration for EFT proof of payment uploads


// Upload proof of payment
router.post("/:id/upload-proof", isAuthenticated, upload.single('proofOfPayment'), asyncHandler(async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);
    const userId = req.user?.id;

    if (!userId) {
      return sendError(res, "User not authenticated", 401);
    }

    if (isNaN(orderId)) {
      return sendError(res, "Invalid order ID", 400);
    }

    if (!req.file) {
      return sendError(res, "No file uploaded", 400);
    }

    // First check if the order belongs to the user
    const order = await storage.getOrderById(orderId);
    if (!order) {
      return sendError(res, "Order not found", 404);
    }

    if (order.userId !== userId) {
      return sendError(res, "Unauthorized", 403);
    }

    // Get user details for the folder path
    const user = await storage.getUser(userId);
    if (!user) {
      return sendError(res, "User not found", 401);
    }

    // Use object store to save the PDF file
    try {
      // Store the PDF in object store with the proper path structure
      const objectKey = `POPS/${user.email}/${order.orderNumber}/pdf_file.pdf`;
      
      await objectStore.uploadFromBuffer(
        objectKey,
        req.file.buffer,
        {
          contentType: 'application/pdf',
          metadata: {
            originalname: req.file.originalname,
            size: String(req.file.size),
            orderId: String(orderId),
            orderNumber: order.orderNumber,
            userEmail: user.email,
            uploadedAt: new Date().toISOString()
          }
        }
      );

      // Update the order with the object store key
      const updatedOrder = await storage.updateOrderEftProof(orderId, objectKey);

      // Also update payment status to "paid" since proof of payment was uploaded
      const orderWithPaidStatus = await storage.updateOrderPaymentStatus(orderId, "paid");

      logger.info("Proof of payment uploaded", {
        orderId,
        orderNumber: order.orderNumber,
        userId,
        filename: req.file.originalname,
        objectKey: objectKey,
        filesize: req.file.size,
        paymentStatusUpdated: "paid"
      });

      return sendSuccess(res, {
        message: "Proof of payment uploaded successfully",
        filename: req.file.originalname,
        objectKey: objectKey,
        order: orderWithPaidStatus || updatedOrder,
      });
    } catch (uploadError) {
      logger.error("Error uploading proof of payment", { 
        error: uploadError instanceof Error ? uploadError.message : String(uploadError),
        orderId: orderId,
        userId: userId 
      });
      return sendError(res, "Failed to upload proof of payment", 500);
    }
  } catch (error) {
    logger.error("Error in upload proof route", { 
      error: error instanceof Error ? error.message : String(error),
      orderId: req.params.id,
      userId: req.user?.id 
    });
    return sendError(res, "Internal server error", 500);
  }
}));

// Mark order as paid
router.post("/:id/mark-paid", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);
    const userId = req.user?.id;

    if (!userId) {
      return sendError(res, "User not authenticated", 401);
    }

    if (isNaN(orderId)) {
      return sendError(res, "Invalid order ID", 400);
    }

    // First check if the order belongs to the user
    const order = await storage.getOrderById(orderId);
    if (!order) {
      return sendError(res, "Order not found", 404);
    }

    if (order.userId !== userId) {
      return sendError(res, "Unauthorized", 403);
    }

    // Update payment status
    const updatedOrder = await storage.updateOrderPaymentStatus(orderId, 'paid');

    logger.info("Order marked as paid", {
      orderId,
      orderNumber: order.orderNumber,
      userId,
    });

    return sendSuccess(res, updatedOrder);
  } catch (error) {
    logger.error("Error marking order as paid", { 
      error: error instanceof Error ? error.message : String(error),
      orderId: req.params.id,
      userId: req.user?.id 
    });
    return sendError(res, "Failed to update order payment status", 500);
  }
}));

// Admin route: Mark payment as received
router.post("/:id/admin/payment-received", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);
    const { paymentReceivedDate } = req.body;

    // TODO: Add admin role check here
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, "User not authenticated", 401);
    }

    if (isNaN(orderId)) {
      return sendError(res, "Invalid order ID", 400);
    }

    if (!paymentReceivedDate) {
      return sendError(res, "Payment received date is required", 400);
    }

    // Get the order to check current status
    const order = await storage.getOrderById(orderId);
    if (!order) {
      return sendError(res, "Order not found", 404);
    }

    // Validate that payment status is "paid" before allowing "payment_received"
    if (order.paymentStatus !== "paid") {
      return sendError(res, "Order payment status must be 'paid' before marking as received", 400);
    }

    // Update the order payment status to "payment_received" with the date
    const updatedOrder = await storage.updateOrderPaymentStatus(orderId, "payment_received", paymentReceivedDate);

    if (!updatedOrder) {
      return sendError(res, "Failed to update order payment status", 500);
    }

    // Automatically update the order status to "processing" when payment is received
    const finalOrder = await storage.updateOrderStatus(orderId, "processing");

    logger.info("Order payment marked as received by admin and status updated to processing", {
      orderId,
      orderNumber: order.orderNumber,
      adminUserId: userId,
      paymentReceivedDate,
      previousPaymentStatus: order.paymentStatus,
      newPaymentStatus: "payment_received",
      previousOrderStatus: order.status,
      newOrderStatus: "processing",
    });

    return sendSuccess(res, {
      message: "Payment marked as received and order moved to processing",
      order: finalOrder || updatedOrder,
    });
  } catch (error) {
    logger.error("Error marking payment as received", { 
      error: error instanceof Error ? error.message : String(error),
      orderId: req.params.id,
      userId: req.user?.id 
    });
    return sendError(res, "Internal server error", 500);
  }
}));

// Admin Routes - Get all orders for admin management
router.get("/admin/orders", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  try {
    // TODO: Add admin role check here
    const orders = await storage.getAllOrders();
    
    logger.info("Admin orders fetched successfully", { orderCount: orders.length });
    return sendSuccess(res, orders);
  } catch (error) {
    logger.error("Error fetching admin orders", { error });
    return sendError(res, "Failed to fetch orders", 500);
  }
}));

// Admin Routes - Get specific order by ID for admin
router.get("/admin/orders/:id", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  try {
    // TODO: Add admin role check here
    const orderId = parseInt(req.params.id);
    
    if (isNaN(orderId)) {
      return sendError(res, "Invalid order ID", 400);
    }

    const order = await storage.getOrderById(orderId);
    
    if (!order) {
      return sendError(res, "Order not found", 404);
    }

    return sendSuccess(res, order);
  } catch (error) {
    logger.error("Error fetching admin order", { error, orderId: req.params.id });
    return sendError(res, "Failed to fetch order", 500);
  }
}));

// Order Status History routes
router.get("/:id/status-history", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);
    const userId = req.user?.id;

    if (!userId) {
      return sendError(res, "User not authenticated", 401);
    }

    if (isNaN(orderId)) {
      return sendError(res, "Invalid order ID", 400);
    }

    // First check if the order exists
    const order = await storage.getOrderById(orderId);
    if (!order) {
      return sendError(res, "Order not found", 404);
    }

    // Check if user has access to this order (either owns it or is admin)
    const user = await storage.getUser(userId);
    if (!user) {
      return sendError(res, "User not found", 401);
    }

    // Allow access if user owns the order OR if user is admin
    logger.debug("Authorization check for order status history", {
      orderId,
      userId,
      orderUserId: order.userId,
      userRole: user.role,
      ownsOrder: order.userId === userId,
      isAdmin: user.role === 'admin'
    });

    if (order.userId !== userId && user.role !== 'admin') {
      logger.warn("Access denied to order status history", {
        orderId,
        userId,
        orderUserId: order.userId,
        userRole: user.role
      });
      return sendError(res, "Unauthorized", 403);
    }

    // Get order status history
    const history = await storage.getOrderStatusHistory(orderId);

    logger.debug("Retrieved order status history", {
      orderId,
      userId,
      entryCount: history.length
    });

    return sendSuccess(res, history);
  } catch (error) {
    logger.error("Error fetching order status history", { 
      error: error instanceof Error ? error.message : String(error),
      orderId: req.params.id,
      userId: req.user?.id 
    });
    return sendError(res, "Failed to fetch order status history", 500);
  }
}));

// Note: PDF route has been moved to routes.ts to bypass response wrapper middleware

export { router as orderRoutes };