import express, { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { storage } from "./storage";
import { isAuthenticated } from "./auth-middleware";
import { sendSuccess, sendError } from "./api-response";
import { logger } from "./logger";
import { z } from "zod";

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

// ===============================================================
// USER ADMIN MANAGEMENT ROUTES
// ===============================================================

// Get users with pagination, search, and filtering
router.get("/users", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  try {
    // TODO: Add admin role check here
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search as string;
    const roleFilter = req.query.role as string;
    const statusFilter = req.query.status as string;
    const sortBy = req.query.sortBy as string || 'createdAt';
    const sortOrder = req.query.sortOrder as 'asc' | 'desc' || 'desc';

    const result = await storage.getUsersWithPagination(
      limit,
      offset,
      search,
      roleFilter,
      statusFilter,
      sortBy,
      sortOrder
    );

    const totalPages = Math.ceil(result.total / limit);

    logger.info("Admin users fetched successfully", { 
      userCount: result.users.length,
      total: result.total,
      page,
      totalPages
    });

    return sendSuccess(res, {
      users: result.users,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages
      }
    });
  } catch (error) {
    logger.error("Error fetching admin users", { error });
    return sendError(res, "Failed to fetch users", 500);
  }
}));

// Get user statistics
router.get("/users/stats", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  try {
    // TODO: Add admin role check here
    const stats = await storage.getUserStats();
    
    logger.info("User statistics fetched successfully", stats);
    return sendSuccess(res, stats);
  } catch (error) {
    logger.error("Error fetching user statistics", { error });
    return sendError(res, "Failed to fetch user statistics", 500);
  }
}));

// Get specific user by ID
router.get("/users/:id", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  try {
    // TODO: Add admin role check here
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return sendError(res, "Invalid user ID", 400);
    }

    const user = await storage.getUser(userId);
    
    if (!user) {
      return sendError(res, "User not found", 404);
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    return sendSuccess(res, userWithoutPassword);
  } catch (error) {
    logger.error("Error fetching user", { error, userId: req.params.id });
    return sendError(res, "Failed to fetch user", 500);
  }
}));

// Update user information
router.put("/users/:id", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  try {
    // TODO: Add admin role check here
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return sendError(res, "Invalid user ID", 400);
    }

    // Validation schema for user updates
    const updateUserSchema = z.object({
      username: z.string().min(1).optional(),
      email: z.string().email().optional(),
      fullName: z.string().optional(),
      phoneNumber: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      province: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
      role: z.enum(['user', 'admin']).optional(),
      isActive: z.boolean().optional()
    });

    const validatedData = updateUserSchema.parse(req.body);

    const updatedUser = await storage.updateUser(userId, validatedData);
    
    if (!updatedUser) {
      return sendError(res, "User not found", 404);
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser;

    logger.info("User updated successfully", { 
      userId,
      updatedFields: Object.keys(validatedData),
      adminUserId: req.user?.id
    });

    return sendSuccess(res, userWithoutPassword);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, "Invalid user data", 400);
    }
    logger.error("Error updating user", { error, userId: req.params.id });
    return sendError(res, "Failed to update user", 500);
  }
}));

// Update user role
router.patch("/users/:id/role", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  try {
    // TODO: Add admin role check here
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return sendError(res, "Invalid user ID", 400);
    }

    const { role } = req.body;
    
    if (!role || !['user', 'admin'].includes(role)) {
      return sendError(res, "Invalid role. Must be 'user' or 'admin'", 400);
    }

    const updatedUser = await storage.updateUserRole(userId, role);
    
    if (!updatedUser) {
      return sendError(res, "User not found", 404);
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser;

    logger.info("User role updated successfully", { 
      userId,
      newRole: role,
      adminUserId: req.user?.id
    });

    return sendSuccess(res, userWithoutPassword);
  } catch (error) {
    logger.error("Error updating user role", { error, userId: req.params.id });
    return sendError(res, "Failed to update user role", 500);
  }
}));

// Update user status (active/inactive)
router.patch("/users/:id/status", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  try {
    // TODO: Add admin role check here
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return sendError(res, "Invalid user ID", 400);
    }

    const { isActive } = req.body;
    
    if (typeof isActive !== 'boolean') {
      return sendError(res, "Invalid status. Must be true or false", 400);
    }

    const updatedUser = await storage.updateUserStatus(userId, isActive);
    
    if (!updatedUser) {
      return sendError(res, "User not found", 404);
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser;

    logger.info("User status updated successfully", { 
      userId,
      isActive,
      adminUserId: req.user?.id
    });

    return sendSuccess(res, userWithoutPassword);
  } catch (error) {
    logger.error("Error updating user status", { error, userId: req.params.id });
    return sendError(res, "Failed to update user status", 500);
  }
}));

// Reset user password
router.post("/users/:id/reset-password", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  try {
    // TODO: Add admin role check here
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return sendError(res, "Invalid user ID", 400);
    }

    const { newPassword } = req.body;
    
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return sendError(res, "Password must be at least 6 characters long", 400);
    }

    const success = await storage.resetUserPassword(userId, newPassword);
    
    if (!success) {
      return sendError(res, "User not found", 404);
    }

    logger.info("User password reset successfully", { 
      userId,
      adminUserId: req.user?.id
    });

    return sendSuccess(res, { message: "Password reset successfully" });
  } catch (error) {
    logger.error("Error resetting user password", { error, userId: req.params.id });
    return sendError(res, "Failed to reset password", 500);
  }
}));

// Delete user (soft delete)
router.delete("/users/:id", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  try {
    // TODO: Add admin role check here
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return sendError(res, "Invalid user ID", 400);
    }

    const success = await storage.deleteUser(userId);
    
    if (!success) {
      return sendError(res, "User not found", 404);
    }

    logger.info("User soft deleted successfully", { 
      userId,
      adminUserId: req.user?.id
    });

    return sendSuccess(res, { message: "User deleted successfully" });
  } catch (error) {
    logger.error("Error deleting user", { error, userId: req.params.id });
    return sendError(res, "Failed to delete user", 500);
  }
}));

export { router as adminRoutes };