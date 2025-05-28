import express, { Request, Response } from "express";
import { z } from "zod";
import asyncHandler from "express-async-handler";
import { storage } from "./storage";
import { isAuthenticated } from "./auth-middleware";
import { sendSuccess, sendError } from "./api-response";
import { insertOrderSchema, insertOrderItemSchema } from "@shared/schema";
import { logger } from "./logger";

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
    productAttributes: z.record(z.string()).optional(),
  })),
  shippingMethod: z.string(),
  shippingCost: z.number(),
  paymentMethod: z.string(),
  subtotal: z.number(),
  total: z.number(),
  specialInstructions: z.string().optional(),
});

const router = express.Router();

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
    productAttributes: z.record(z.string()).optional()
  })),
  subtotal: z.number(),
  total: z.number()
});

// Helper function to generate attribute display text
function generateAttributeDisplayText(attributes: Record<string, string>): string {
  if (!attributes || Object.keys(attributes).length === 0) {
    return "";
  }
  
  return Object.entries(attributes)
    .map(([key, value]) => `${key}: ${value}`)
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
    const orderData = checkoutOrderSchema.parse(req.body);
    logger.info("Order data validation successful", { orderData });

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

    // Create order object with new structure
    const order = {
      userId: userId,
      status: "pending",
      customerName: `${orderData.customerInfo.firstName} ${orderData.customerInfo.lastName}`,
      customerEmail: orderData.customerInfo.email,
      customerPhone: orderData.customerInfo.phone,
      shippingAddress: `${orderData.shippingAddress.addressLine1}${orderData.shippingAddress.addressLine2 ? ', ' + orderData.shippingAddress.addressLine2 : ''}`,
      shippingCity: orderData.shippingAddress.city,
      shippingPostalCode: orderData.shippingAddress.postalCode,
      shippingMethod: orderData.shippingMethod,
      shippingCost: orderData.shippingCost,
      paymentMethod: orderData.paymentMethod,
      paymentStatus: "pending",
      subtotalAmount: orderData.subtotal,
      totalAmount: orderData.total,
      customerNotes: orderData.specialInstructions || null,
    };

    // Create the order
    const newOrder = await storage.createOrder(order, orderItems);

    logger.info("Order created successfully", {
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      userId: userId,
      totalAmount: orderData.total,
      itemCount: orderItems.length,
    });

    // Send success response with proper structure
    res.status(200).json({
      success: true,
      data: {
        id: newOrder.id,
        orderNumber: newOrder.orderNumber,
        status: newOrder.status,
        totalAmount: newOrder.totalAmount,
        message: "Order created successfully"
      }
    });
    return;

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

// Get specific order by ID
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

    const order = await storage.getOrderById(orderId);
    
    if (!order) {
      return sendError(res, "Order not found", 404);
    }

    // Check if user owns this order (or is admin)
    if (order.userId !== userId && req.user?.role !== "admin") {
      return sendError(res, "Access denied", 403);
    }

    return sendSuccess(res, order);
  } catch (error) {
    logger.error("Error fetching order", { error, orderId: req.params.id, userId: req.user?.id });
    return sendError(res, "Failed to fetch order", 500);
  }
}));

export { router as orderRoutes };