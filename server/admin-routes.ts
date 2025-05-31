import express, { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { storage } from "./storage";
import { isAuthenticated } from "./auth-middleware";
import { sendSuccess, sendError } from "./api-response";
import { logger } from "./logger";

const router = express.Router();

// Get all orders for admin management
router.get("/orders", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
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

// Get specific order by ID for admin
router.get("/orders/:id", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
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

// Update order status
router.patch("/orders/:id/status", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  try {
    // TODO: Add admin role check here
    const orderId = parseInt(req.params.id);
    const { status } = req.body;
    
    if (isNaN(orderId)) {
      return sendError(res, "Invalid order ID", 400);
    }

    if (!status) {
      return sendError(res, "Status is required", 400);
    }

    const updatedOrder = await storage.updateOrderStatus(orderId, status);
    
    if (!updatedOrder) {
      return sendError(res, "Order not found", 404);
    }

    logger.info("Order status updated by admin", { orderId, status, adminUserId: req.user?.id });
    return sendSuccess(res, updatedOrder);
  } catch (error) {
    logger.error("Error updating order status", { error, orderId: req.params.id });
    return sendError(res, "Failed to update order status", 500);
  }
}));

// Update tracking number
router.patch("/orders/:id/tracking", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  try {
    // TODO: Add admin role check here
    const orderId = parseInt(req.params.id);
    const { trackingNumber } = req.body;
    
    if (isNaN(orderId)) {
      return sendError(res, "Invalid order ID", 400);
    }

    if (!trackingNumber) {
      return sendError(res, "Tracking number is required", 400);
    }

    const updatedOrder = await storage.updateOrderTracking(orderId, trackingNumber);
    
    if (!updatedOrder) {
      return sendError(res, "Order not found", 404);
    }

    logger.info("Order tracking updated by admin", { orderId, trackingNumber, adminUserId: req.user?.id });
    return sendSuccess(res, updatedOrder);
  } catch (error) {
    logger.error("Error updating tracking number", { error, orderId: req.params.id });
    return sendError(res, "Failed to update tracking number", 500);
  }
}));

// Mark payment as received
router.post("/orders/:id/payment-received", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
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

    // Update payment status to received and order status to processing
    const updatedOrder = await storage.updateOrderPaymentStatus(orderId, "received");
    let finalOrder = updatedOrder;
    
    if (updatedOrder && updatedOrder.status === "pending") {
      finalOrder = await storage.updateOrderStatus(orderId, "processing");
    }

    logger.info("Order payment marked as received by admin and status updated to processing", {
      orderId,
      previousStatus: order.status,
      adminUserId: req.user?.id,
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

export { router as adminRoutes };