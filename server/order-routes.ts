import express, { Request, Response } from "express";
import { z } from "zod";
import asyncHandler from "express-async-handler";
import { storage } from "./storage";
import { isAuthenticated } from "./auth-middleware";
import { sendSuccess, sendError } from "./api-response";
import { insertOrderSchema, insertOrderItemSchema } from "@shared/schema";
import { logger } from "./logger";

const router = express.Router();

// Create order schema validation
const createOrderSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email("Valid email is required"),
  customerPhone: z.string().min(1, "Phone number is required"),
  shippingAddress: z.string().min(1, "Shipping address is required"),
  shippingCity: z.string().min(1, "City is required"),
  shippingPostalCode: z.string().min(1, "Postal code is required"),
  shippingMethod: z.enum(["standard", "express"]).default("standard"),
  paymentMethod: z.enum(["eft"]).default("eft"),
  customerNotes: z.string().optional(),
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
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, "User not authenticated", 401);
    }

    // Validate request body
    const orderData = createOrderSchema.parse(req.body);

    // Get user's cart items
    const cartItems = await storage.getCartItems(userId);
    
    if (!cartItems || cartItems.length === 0) {
      return sendError(res, "Cart is empty", 400);
    }

    // Calculate totals
    let subtotalAmount = 0;
    const orderItems = [];

    for (const cartItem of cartItems) {
      // Get product details
      const product = await storage.getProductById(cartItem.productId);
      if (!product) {
        return sendError(res, `Product with ID ${cartItem.productId} not found`, 400);
      }

      // Calculate item total
      const unitPrice = parseFloat(cartItem.itemPrice);
      const totalPrice = unitPrice * cartItem.quantity;
      subtotalAmount += totalPrice;

      // Generate attribute display text
      const attributeDisplayText = generateAttributeDisplayText(
        cartItem.attributeSelections as Record<string, string> || {}
      );

      // Create order item
      orderItems.push({
        productId: cartItem.productId,
        productName: product.name,
        productSku: product.sku,
        productImageUrl: product.imageUrl,
        quantity: cartItem.quantity,
        unitPrice: unitPrice,
        totalPrice: totalPrice,
        selectedAttributes: cartItem.attributeSelections || {},
        attributeDisplayText: attributeDisplayText,
      });
    }

    // Calculate shipping cost based on method
    const shippingCost = orderData.shippingMethod === "express" ? 100 : 85;
    const totalAmount = subtotalAmount + shippingCost;

    // Create order object
    const order = {
      userId: userId,
      status: "pending",
      customerName: orderData.customerName,
      customerEmail: orderData.customerEmail,
      customerPhone: orderData.customerPhone,
      shippingAddress: orderData.shippingAddress,
      shippingCity: orderData.shippingCity,
      shippingPostalCode: orderData.shippingPostalCode,
      shippingMethod: orderData.shippingMethod,
      shippingCost: shippingCost,
      paymentMethod: orderData.paymentMethod,
      paymentStatus: "pending",
      subtotalAmount: subtotalAmount,
      totalAmount: totalAmount,
      customerNotes: orderData.customerNotes || null,
    };

    // Create the order
    const newOrder = await storage.createOrder(order, orderItems);

    logger.info("Order created successfully", {
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      userId: userId,
      totalAmount: totalAmount,
      itemCount: orderItems.length,
    });

    return sendSuccess(res, {
      order: newOrder,
      message: "Order created successfully",
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, "Invalid order data", 400, error.errors);
    }
    
    logger.error("Error creating order", { error, userId: req.user?.id });
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