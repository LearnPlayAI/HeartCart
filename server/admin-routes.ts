import express, { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { storage } from "./storage";
import { isAuthenticated, isAdmin } from "./auth-middleware";
import { sendSuccess, sendError } from "./api-response";
import { logger } from "./logger";
import { z } from "zod";
import { databaseEmailService } from "./database-email-service";
import { InvoiceGenerator } from "./services/invoice-generator";
import { objectStoreAdapter } from "./object-store-adapter";

const router = express.Router();

// Helper function to get estimated delivery text based on status
function getEstimatedDeliveryText(status: string): string {
  switch (status) {
    case 'pending':
      return 'Processing your order';
    case 'confirmed':
      return 'Order confirmed, preparing for shipment';
    case 'processing':
      return 'Order is being processed';
    case 'shipped':
      return '3-5 business days';
    case 'delivered':
      return 'Delivered';
    case 'cancelled':
      return 'Order cancelled';
    default:
      return 'Status updated';
  }
}

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
    const { status, trackingNumber } = req.body;
    
    if (isNaN(orderId)) {
      return sendError(res, "Invalid order ID", 400);
    }

    if (!status) {
      return sendError(res, "Status is required", 400);
    }

    // Update order status
    const updatedOrder = await storage.updateOrderStatus(orderId, status);
    
    if (!updatedOrder) {
      return sendError(res, "Order not found", 404);
    }
    
    // If tracking number is provided (for shipped status), update it
    if (trackingNumber && status === 'shipped') {
      await storage.updateOrderTracking(orderId, trackingNumber);
    }

    // Send order status update email only for shipped and delivered status changes
    if (status === 'shipped' || status === 'delivered') {
      try {
        // Get updated order details to ensure we have the latest tracking number
        const finalOrder = await storage.getOrderById(orderId);
        
        const emailData = {
          email: finalOrder.customerEmail,
          customerName: finalOrder.customerName,
          orderNumber: finalOrder.orderNumber,
          orderId: finalOrder.id,
          status: status,
          trackingNumber: finalOrder.trackingNumber || null,
          estimatedDelivery: getEstimatedDeliveryText(status),
          shippingMethod: finalOrder.shippingMethod,
          selectedLockerName: finalOrder.lockerDetails?.name || null,
          selectedLockerAddress: finalOrder.lockerDetails?.address || null
        };

        await databaseEmailService.sendOrderStatusEmail(emailData);
        
        logger.info("Order status update email sent", {
          orderId,
          status,
          customerEmail: updatedOrder.customerEmail,
          adminUserId: req.user?.id
        });
      } catch (emailError) {
        // Log email error but don't fail the status update
        logger.error("Failed to send order status update email", {
          error: emailError,
          orderId,
          status,
          customerEmail: updatedOrder.customerEmail
        });
      }
    }

    // Calculate and create commission when order is delivered
    if (status === 'delivered') {
      try {
        const order = await storage.getOrderById(orderId);
        if (order && order.userId) {
          const user = await storage.getUserById(order.userId);
          if (user && user.repCode) {
            const rep = await storage.getSalesRepByCode(user.repCode);
            if (rep) {
              // Calculate commission using the rep's actual commission rate from database
              const orderItems = await storage.getOrderItems(orderId);
              let totalCommission = 0;
              let totalProfitAmount = 0;
              let totalCustomerPaidAmount = 0;
              let totalCostAmount = 0;
              
              // Convert rep commission rate to decimal (1.0000 = 1%)
              const commissionRate = parseFloat(rep.commissionRate.toString()) / 100;

              for (const item of orderItems) {
                const product = await storage.getProductById(item.productId);
                if (product && product.costPrice) {
                  // Use the actual price the customer paid (unitPrice from order item)
                  // This accounts for sale prices, discounts, and any promotional pricing
                  const customerPaidPrice = item.unitPrice;
                  const costPrice = parseFloat(product.costPrice.toString());
                  const itemTotalCustomerPaid = customerPaidPrice * item.quantity;
                  const itemTotalCost = costPrice * item.quantity;
                  
                  totalCustomerPaidAmount += itemTotalCustomerPaid;
                  totalCostAmount += itemTotalCost;
                  
                  if (customerPaidPrice > costPrice) {
                    const profitMargin = (customerPaidPrice - costPrice) * item.quantity;
                    const itemCommission = profitMargin * commissionRate; // Use actual rep commission rate
                    totalCommission += itemCommission;
                    totalProfitAmount += profitMargin;
                    
                    logger.info("Commission calculated for order item", {
                      orderId,
                      productId: item.productId,
                      customerPaidPrice,
                      costPrice,
                      quantity: item.quantity,
                      profitMargin,
                      itemCommission
                    });
                  }
                }
              }

              if (totalCommission > 0) {
                const commissionData = {
                  repId: rep.id,
                  orderId: orderId,
                  userId: order.userId,
                  commissionAmount: totalCommission.toString(),
                  orderAmount: order.totalAmount.toString(),
                  commissionRate: commissionRate.toString(),
                  totalProfitAmount: totalProfitAmount.toString(),
                  totalCustomerPaidAmount: totalCustomerPaidAmount.toString(),
                  totalCostAmount: totalCostAmount.toString(),
                  status: 'earned' as const,
                  notes: `Commission for delivered order ${order.orderNumber}`
                };

                await storage.createRepCommission(commissionData);
                
                logger.info("Commission created for delivered order", {
                  orderId,
                  repId: rep.id,
                  repCode: user.repCode,
                  commissionAmount: totalCommission,
                  orderAmount: order.totalAmount
                });
              }
            }
          }
        }
      } catch (commissionError) {
        // Log commission error but don't fail the status update
        logger.error("Failed to create commission for delivered order", {
          error: commissionError,
          orderId,
          status
        });
      }
    }

    logger.info("Order status updated by admin", { orderId, status, adminUserId: req.user?.id });
    return sendSuccess(res, updatedOrder);
  } catch (error) {
    logger.error("Error updating order status", { error, orderId: req.params.id });
    return sendError(res, "Failed to update order status", 500);
  }
}));

// Update payment status
router.patch("/orders/:id/payment-status", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  try {
    // TODO: Add admin role check here
    const orderId = parseInt(req.params.id);
    const { paymentStatus } = req.body;
    
    if (isNaN(orderId)) {
      return sendError(res, "Invalid order ID", 400);
    }

    if (!paymentStatus) {
      return sendError(res, "Payment status is required", 400);
    }

    const updatedOrder = await storage.updateOrderPaymentStatus(orderId, paymentStatus);
    
    if (!updatedOrder) {
      return sendError(res, "Order not found", 404);
    }

    // Generate PDF invoice and send payment confirmation email when status is changed to "payment_received"
    if (paymentStatus === "payment_received") {
      try {
        // Get full order details with items for payment confirmation email and invoice
        const fullOrder = await storage.getOrderById(orderId);
        if (fullOrder && fullOrder.items && fullOrder.items.length > 0) {
          let invoicePath = null;
          
          // Generate PDF invoice first
          try {
            const invoiceData = {
              orderNumber: fullOrder.orderNumber,
              customerName: fullOrder.customerName,
              customerEmail: fullOrder.customerEmail,
              customerPhone: fullOrder.customerPhone,
              shippingAddress: fullOrder.shippingAddress,
              shippingCity: fullOrder.shippingCity,
              shippingPostalCode: fullOrder.shippingPostalCode,
              orderItems: fullOrder.items.map(item => ({
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                attributeDisplayText: item.attributeDisplayText
              })),
              subtotalAmount: fullOrder.subtotalAmount,
              shippingCost: fullOrder.shippingCost,
              totalAmount: fullOrder.totalAmount,
              paymentMethod: fullOrder.paymentMethod,
              paymentReceivedDate: new Date().toISOString(),
              userId: fullOrder.userId
            };

            const invoiceGenerator = InvoiceGenerator.getInstance();
            invoicePath = await invoiceGenerator.generateInvoicePDF(invoiceData);
            
            // Update order with invoice path
            await storage.updateOrderInvoicePath(orderId, invoicePath);
            
            logger.info("PDF invoice generated and stored", {
              orderId,
              invoicePath,
              customerEmail: fullOrder.customerEmail,
              adminUserId: req.user?.id
            });
          } catch (invoiceError) {
            // Log invoice error but continue with email
            logger.error("Failed to generate PDF invoice", {
              error: invoiceError,
              orderId,
              customerEmail: fullOrder.customerEmail
            });
          }

          // Send payment confirmation email with invoice attachment if available
          const emailData = {
            email: fullOrder.customerEmail,
            customerName: fullOrder.customerName,
            orderNumber: fullOrder.orderNumber,
            orderId: fullOrder.id,
            amount: fullOrder.totalAmount,
            currency: 'R',
            paymentMethod: fullOrder.paymentMethod,
            invoicePath: invoicePath // Include invoice path for attachment
          };

          await databaseEmailService.sendPaymentConfirmationEmail(emailData);
          
          logger.info("Payment confirmation email sent with invoice attachment", {
            orderId,
            customerEmail: fullOrder.customerEmail,
            hasInvoiceAttachment: !!invoicePath,
            adminUserId: req.user?.id
          });
        }
      } catch (emailError) {
        // Log email error but don't fail the payment status update
        logger.error("Failed to send payment confirmation email", {
          error: emailError,
          orderId,
          customerEmail: updatedOrder.customerEmail
        });
      }
    }

    logger.info("Order payment status updated by admin", { orderId, paymentStatus, adminUserId: req.user?.id });
    return sendSuccess(res, updatedOrder);
  } catch (error) {
    logger.error("Error updating payment status", { error, orderId: req.params.id });
    return sendError(res, "Failed to update payment status", 500);
  }
}));

// Download invoice (admin access)
router.get("/orders/:id/invoice", isAdmin, asyncHandler(async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);
    
    logger.info("Admin invoice download requested", {
      orderId,
      adminUserId: req.user?.id,
      userRole: req.user?.role
    });
    
    if (isNaN(orderId)) {
      return sendError(res, "Invalid order ID", 400);
    }

    const order = await storage.getOrderById(orderId);
    
    if (!order) {
      logger.warn("Order not found for admin download", { orderId });
      return sendError(res, "Order not found", 404);
    }

    if (!order.invoicePath) {
      logger.warn("No invoice path for order", { orderId, orderNumber: order.orderNumber });
      return sendError(res, "No invoice available for this order", 404);
    }

    logger.info("Attempting to retrieve invoice file", {
      orderId,
      invoicePath: order.invoicePath
    });

    try {
      // Get the PDF file from object storage using the correct method
      const { data: fileData, contentType } = await objectStoreAdapter.getFileAsBuffer(order.invoicePath);
      
      if (!fileData) {
        logger.error("File data is null from object store", { 
          orderId, 
          invoicePath: order.invoicePath 
        });
        return sendError(res, "Invoice file not found", 404);
      }

      logger.info("Successfully retrieved invoice file", {
        orderId,
        fileSize: fileData.length,
        contentType
      });

      // Set proper headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Invoice-${order.orderNumber}.pdf"`);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.setHeader('Content-Length', fileData.length.toString());
      
      // Send the PDF buffer
      res.send(fileData);
      
      logger.info("Admin downloaded invoice", {
        orderId,
        orderNumber: order.orderNumber,
        invoicePath: order.invoicePath,
        adminUserId: req.user?.id
      });
    } catch (fileError) {
      logger.error("Error retrieving invoice file", {
        error: fileError,
        orderId,
        invoicePath: order.invoicePath
      });
      return sendError(res, "Failed to retrieve invoice file", 500);
    }
  } catch (error) {
    logger.error("Error downloading invoice", { error, orderId: req.params.id });
    return sendError(res, "Failed to download invoice", 500);
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

    // Validate that payment status is "paid" before allowing "payment_received"
    if (order.paymentStatus !== "paid") {
      return sendError(res, "Order payment status must be 'paid' before marking as received", 400);
    }

    // Update payment status to "payment_received"
    const updatedOrder = await storage.updateOrderPaymentStatus(orderId, "payment_received");
    
    if (!updatedOrder) {
      return sendError(res, "Failed to update order payment status", 500);
    }

    // Automatically update the order status to "processing" when payment is received
    const finalOrder = await storage.updateOrderStatus(orderId, "processing");

    // Send payment confirmation email
    try {
      // Get full order details with items for payment confirmation email
      const fullOrder = await storage.getOrderById(orderId);
      if (fullOrder && fullOrder.orderItems && fullOrder.orderItems.length > 0) {
        const emailData = {
          email: fullOrder.customerEmail,
          customerName: fullOrder.customerName,
          orderNumber: fullOrder.orderNumber,
          orderId: fullOrder.id,
          amount: fullOrder.totalAmount,
          currency: 'R',
          paymentMethod: fullOrder.paymentMethod,
          invoicePath: fullOrder.invoicePath
        };

        await databaseEmailService.sendPaymentConfirmationEmail(emailData);
        
        logger.info("Payment received confirmation email sent", {
          orderId,
          customerEmail: fullOrder.customerEmail,
          adminUserId: req.user?.id
        });
      }
    } catch (emailError) {
      // Log email error but don't fail the payment process
      logger.error("Failed to send payment received confirmation email", {
        error: emailError,
        orderId,
        customerEmail: order.customerEmail
      });
    }

    logger.info("Order payment marked as received by admin and status updated to processing", {
      orderId,
      orderNumber: order.orderNumber,
      adminUserId: req.user?.id,
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

// Get unassigned users (not assigned to any sales rep)
router.get("/users/unassigned", isAdmin, asyncHandler(async (req: Request, res: Response) => {
  try {
    const unassignedUsers = await storage.getUnassignedUsers();
    
    logger.info("Unassigned users fetched", { userCount: unassignedUsers.length });
    return sendSuccess(res, unassignedUsers);
  } catch (error) {
    logger.error("Error fetching unassigned users", { error });
    return sendError(res, "Failed to fetch unassigned users", 500);
  }
}));

// Search users for assignment purposes
router.get("/users/search", isAdmin, asyncHandler(async (req: Request, res: Response) => {
  try {
    const { q: searchTerm } = req.query;
    
    if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim().length < 2) {
      return sendError(res, "Search term must be at least 2 characters", 400);
    }

    const searchResults = await storage.searchUsersForAssignment(searchTerm.trim());
    
    logger.info("User search completed", { searchTerm, resultCount: searchResults.length });
    return sendSuccess(res, searchResults);
  } catch (error) {
    logger.error("Error searching users", { error, searchTerm: req.query.q });
    return sendError(res, "Failed to search users", 500);
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

// Update user (general endpoint)
router.patch("/users/:id", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  try {
    // TODO: Add admin role check here
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return sendError(res, "Invalid user ID", 400);
    }

    const updateData = req.body;
    
    // If it's just an isActive update, use the status endpoint logic
    if (Object.keys(updateData).length === 1 && 'isActive' in updateData) {
      const { isActive } = updateData;
      
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
    }

    // For other updates, use the general update method
    const updatedUser = await storage.updateUser(userId, updateData);
    
    if (!updatedUser) {
      return sendError(res, "User not found", 404);
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser;

    logger.info("User updated successfully", { 
      userId,
      updateData: Object.keys(updateData),
      adminUserId: req.user?.id
    });

    return sendSuccess(res, userWithoutPassword);
  } catch (error) {
    logger.error("Error updating user", { error, userId: req.params.id });
    return sendError(res, "Failed to update user", 500);
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

// System Settings routes for admin configuration
router.get("/settings", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  try {
    // TODO: Add admin role check here
    const settings = await storage.getAllSystemSettings();
    
    logger.info("System settings fetched successfully", { settingsCount: settings.length });
    return sendSuccess(res, settings);
  } catch (error) {
    logger.error("Error fetching system settings", { error });
    return sendError(res, "Failed to fetch system settings", 500);
  }
}));

// Get specific system setting by key
router.get("/settings/:key", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  try {
    // TODO: Add admin role check here
    const { key } = req.params;
    
    const setting = await storage.getSystemSetting(key);
    
    if (!setting) {
      return sendError(res, "Setting not found", 404);
    }

    return sendSuccess(res, setting);
  } catch (error) {
    logger.error("Error fetching system setting", { error, key: req.params.key });
    return sendError(res, "Failed to fetch system setting", 500);
  }
}));

// Update system setting
router.patch("/settings/:key", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  try {
    // TODO: Add admin role check here
    const { key } = req.params;
    const { value } = req.body;
    
    if (!value && value !== "false" && value !== "") {
      return sendError(res, "Value is required", 400);
    }

    const updatedSetting = await storage.updateSystemSetting(key, String(value));
    
    if (!updatedSetting) {
      return sendError(res, "Setting not found", 404);
    }

    logger.info("System setting updated successfully", { 
      key,
      value,
      adminUserId: req.user?.id
    });

    return sendSuccess(res, updatedSetting);
  } catch (error) {
    logger.error("Error updating system setting", { error, key: req.params.key });
    return sendError(res, "Failed to update system setting", 500);
  }
}));

// Sales Rep Commission System Admin Routes
router.get("/sales-reps", isAdmin, asyncHandler(async (req: Request, res: Response) => {
  try {
    const reps = await storage.getAllSalesReps();
    
    // Get earnings for each rep
    const repsWithEarnings = await Promise.all(
      reps.map(async (rep) => {
        const earnings = await storage.calculateRepEarnings(rep.id);
        return {
          ...rep,
          totalEarnings: earnings.totalEarnings,
          commissionCount: earnings.commissionCount
        };
      })
    );
    
    logger.info("Admin sales reps fetched successfully", { repCount: reps.length });
    return sendSuccess(res, repsWithEarnings);
  } catch (error) {
    logger.error("Error fetching admin sales reps", { error });
    return sendError(res, "Failed to fetch sales reps", 500);
  }
}));

// Get all sales reps with earnings data
router.get("/sales-reps", isAdmin, asyncHandler(async (req: Request, res: Response) => {
  try {
    const reps = await storage.getAllSalesReps();
    
    // Enrich each rep with earnings and payment data
    const enrichedReps = await Promise.all(reps.map(async (rep) => {
      const earnings = await storage.calculateRepEarnings(rep.id);
      const payments = await storage.getRepPayments(rep.id);
      
      // Calculate total payments made
      const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
      
      // Calculate amount owed (total earnings - total paid)
      const amountOwed = Math.max(0, earnings.totalEarnings - totalPaid);
      
      return {
        ...rep,
        totalEarnings: earnings.totalEarnings,
        commissionCount: earnings.commissionCount,
        totalPaid: totalPaid,
        amountOwed: amountOwed
      };
    }));
    
    logger.info("Admin sales reps fetched successfully", { repCount: enrichedReps.length });
    return sendSuccess(res, enrichedReps);
  } catch (error) {
    logger.error("Error fetching admin sales reps", { error });
    return sendError(res, "Failed to fetch sales reps", 500);
  }
}));

router.post("/sales-reps", isAdmin, asyncHandler(async (req: Request, res: Response) => {
  try {
    const repData = req.body;
    const newRep = await storage.createSalesRep(repData);
    
    logger.info("Sales rep created by admin", { repId: newRep.id, adminUserId: req.user?.id });
    return sendSuccess(res, newRep, 201);
  } catch (error) {
    logger.error("Error creating sales rep", { error });
    return sendError(res, "Failed to create sales rep", 500);
  }
}));

router.put("/sales-reps/:id", isAdmin, asyncHandler(async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const repData = req.body;
    const updatedRep = await storage.updateSalesRep(id, repData);
    
    if (!updatedRep) {
      return sendError(res, "Sales rep not found", 404);
    }
    
    logger.info("Sales rep updated by admin", { repId: id, adminUserId: req.user?.id });
    return sendSuccess(res, updatedRep);
  } catch (error) {
    logger.error("Error updating sales rep", { error });
    return sendError(res, "Failed to update sales rep", 500);
  }
}));

router.get("/sales-reps/:id/commissions", isAdmin, asyncHandler(async (req: Request, res: Response) => {
  try {
    const repId = parseInt(req.params.id);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
    logger.info("Fetching commissions for rep", { repId, page, limit, offset });
    
    const commissions = await storage.getSalesRepCommissions(repId, limit, offset);
    
    logger.info("Commissions fetched successfully", { 
      repId, 
      commissionCount: commissions.length,
      commissions: commissions.map(c => ({ 
        id: c.id, 
        orderId: c.orderId, 
        commissionAmount: c.commissionAmount,
        status: c.status 
      }))
    });
    
    return sendSuccess(res, {
      commissions,
      pagination: {
        page,
        limit,
        hasMore: commissions.length === limit
      }
    });
  } catch (error) {
    logger.error("Error fetching rep commissions", { error, repId: req.params.id });
    return sendError(res, "Failed to fetch commissions", 500);
  }
}));

router.get("/sales-reps/:id/commissions-for-payment", isAdmin, asyncHandler(async (req: Request, res: Response) => {
  try {
    const repId = parseInt(req.params.id);
    
    logger.info("Fetching commissions for payment", { repId });
    
    // Get all unpaid commissions for this rep
    const unpaidCommissions = await storage.getUnpaidRepCommissions(repId);
    
    // Calculate total amount owed from unpaid commissions
    let totalAmountOwed = 0;
    const orderNumbers: string[] = [];
    
    for (const commission of unpaidCommissions) {
      const commissionAmount = Number(commission.commissionAmount);
      totalAmountOwed += commissionAmount;
      
      // Get order number for this commission
      if (commission.orderNumber) {
        orderNumbers.push(commission.orderNumber);
      }
    }
    
    logger.info("Commissions for payment calculated", { 
      repId, 
      unpaidCount: unpaidCommissions.length,
      totalAmountOwed,
      orderNumbers
    });
    
    return sendSuccess(res, {
      commissions: unpaidCommissions,
      totalAmountOwed,
      orderNumbers
    });
  } catch (error) {
    logger.error("Error fetching commissions for payment", { error, repId: req.params.id });
    return sendError(res, "Failed to fetch commissions for payment", 500);
  }
}));

router.get("/sales-reps/:id/earnings", isAdmin, asyncHandler(async (req: Request, res: Response) => {
  try {
    const repId = parseInt(req.params.id);
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    
    const earnings = await storage.calculateRepEarnings(repId, startDate, endDate);
    
    return sendSuccess(res, earnings);
  } catch (error) {
    logger.error("Error calculating rep earnings", { error });
    return sendError(res, "Failed to calculate earnings", 500);
  }
}));

router.post("/sales-reps/:id/payments", isAdmin, asyncHandler(async (req: Request, res: Response) => {
  try {
    const repId = parseInt(req.params.id);
    
    // Get the commissions that will be paid and their order details
    const commissionsForPayment = await storage.getCommissionsForPayment(repId, parseFloat(req.body.amount));
    
    // Auto-generate reference number if not provided
    const rep = await storage.getSalesRepById(repId);
    const today = new Date();
    const ddmmyy = today.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: '2-digit' 
    }).replace(/\//g, '');
    
    // Get next sequential number for this rep and date
    const sequentialNumber = await storage.getNextPaymentSequentialNumber(repId, ddmmyy);
    const autoReferenceNumber = `${rep?.repCode || `REP${repId}`}-${sequentialNumber.toString().padStart(2, '0')}-${ddmmyy}`;
    
    // Create auto-notes with order IDs
    const orderIds = commissionsForPayment.map(c => `#${c.orderId}`).join(', ');
    const autoNotes = `Commission payment for Order IDs: ${orderIds}`;
    const finalNotes = req.body.notes ? `${autoNotes}\n\nAdmin notes: ${req.body.notes}` : autoNotes;
    
    const paymentData = { 
      ...req.body, 
      repId,
      processedBy: req.user?.id,
      referenceNumber: req.body.referenceNumber || autoReferenceNumber,
      notes: finalNotes
    };
    
    // Create the payment record
    const newPayment = await storage.createRepPayment(paymentData);
    
    // Mark commissions as paid based on payment amount
    await storage.markCommissionsAsPaid(repId, parseFloat(req.body.amount));
    
    // If payment method is store credit, award store credit to the sales rep
    if (req.body.paymentMethod === 'Store Credit') {
      // Get the sales rep information
      const rep = await storage.getSalesRepById(repId);
      if (rep) {
        // Find user account with matching email
        const user = await storage.getUserByEmail(rep.email);
        if (user) {
          // Create credit transaction for the sales rep
          const creditTransaction = await storage.createCreditTransaction({
            userId: user.id,
            orderId: null,
            supplierOrderId: null,
            transactionType: 'earned',
            amount: parseFloat(req.body.amount).toFixed(2),
            description: `Commission payment converted to store credit - Payment #${newPayment.id}`
          });
          
          logger.info("Credit awarded to sales rep", { 
            repId, 
            userId: user.id,
            creditAmount: parseFloat(req.body.amount),
            creditTransactionId: creditTransaction.id,
            paymentId: newPayment.id
          });
        } else {
          logger.warn("Sales rep user account not found for credit payment", { 
            repId, 
            repEmail: rep.email 
          });
        }
      } else {
        logger.warn("Sales rep not found for credit payment", { repId });
      }
    }
    
    logger.info("Rep payment created by admin", { 
      repId, 
      paymentId: newPayment.id,
      amount: newPayment.amount,
      paymentMethod: req.body.paymentMethod,
      adminUserId: req.user?.id 
    });
    
    return sendSuccess(res, newPayment, 201);
  } catch (error) {
    logger.error("Error creating rep payment", { error });
    return sendError(res, "Failed to create payment", 500);
  }
}));

router.get("/sales-reps/:id/payments", isAdmin, asyncHandler(async (req: Request, res: Response) => {
  try {
    const repId = parseInt(req.params.id);
    const payments = await storage.getRepPayments(repId);
    
    return sendSuccess(res, payments);
  } catch (error) {
    logger.error("Error fetching rep payments", { error });
    return sendError(res, "Failed to fetch payments", 500);
  }
}));

// Get commission summary statistics for a sales rep
router.get("/sales-reps/:id/summary", isAdmin, asyncHandler(async (req: Request, res: Response) => {
  try {
    const repId = parseInt(req.params.id);
    if (isNaN(repId)) {
      return sendError(res, "Invalid sales rep ID", 400);
    }

    logger.info("Fetching commission summary for rep", { repId });

    // Get all commissions and payments for calculations
    const commissions = await storage.getRepCommissions(repId);
    const payments = await storage.getRepPayments(repId);

    // Calculate server-side totals
    const totalEarned = commissions.data
      .filter(c => c.status === 'earned')
      .reduce((sum, c) => sum + Number(c.commissionAmount), 0);
    
    const totalPaid = payments
      .reduce((sum, p) => sum + Number(p.amount), 0);
    
    const amountOwed = Math.max(0, totalEarned - totalPaid);

    const summary = {
      totalEarned,
      totalPaid,
      amountOwed,
      earnedCount: commissions.data.filter(c => c.status === 'earned').length,
      paidCount: commissions.data.filter(c => c.status === 'paid').length,
      totalCommissions: commissions.data.length,
      totalPayments: payments.length
    };

    logger.info("Commission summary calculated", { 
      repId, 
      summary,
      totalCommissions: commissions.data.length,
      totalPayments: payments.length 
    });

    return sendSuccess(res, summary);
  } catch (error) {
    logger.error("Error fetching commission summary", { error });
    return sendError(res, "Failed to fetch commission summary", 500);
  }
}));

// ===============================================================
// SALES REP USER ASSIGNMENT MANAGEMENT ROUTES
// ===============================================================

// Get users assigned to a specific sales rep
router.get("/sales-reps/:id/users", isAdmin, asyncHandler(async (req: Request, res: Response) => {
  try {
    const repId = parseInt(req.params.id);
    if (isNaN(repId)) {
      return sendError(res, "Invalid sales rep ID", 400);
    }

    // Get the sales rep to verify it exists and get the repCode
    const rep = await storage.getSalesRepById(repId);
    if (!rep) {
      return sendError(res, "Sales rep not found", 404);
    }

    const assignedUsers = await storage.getUsersByRepCode(rep.repCode);
    
    logger.info("Users fetched for sales rep", { repId, repCode: rep.repCode, userCount: assignedUsers.length });
    return sendSuccess(res, assignedUsers);
  } catch (error) {
    logger.error("Error fetching users for sales rep", { error, repId: req.params.id });
    return sendError(res, "Failed to fetch users", 500);
  }
}));

// Assign user to sales rep
router.put("/users/:userId/rep-assignment", isAdmin, asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const { repCode } = req.body;

    if (isNaN(userId)) {
      return sendError(res, "Invalid user ID", 400);
    }

    // Validate repCode if provided (null means removing assignment)
    if (repCode !== null && repCode !== undefined) {
      if (typeof repCode !== 'string' || repCode.trim().length === 0) {
        return sendError(res, "Invalid rep code", 400);
      }
    }

    const updatedUser = await storage.assignUserToRep(userId, repCode || null);
    
    if (!updatedUser) {
      return sendError(res, "User not found", 404);
    }

    logger.info("User rep assignment updated by admin", { 
      userId, 
      newRepCode: repCode || null,
      adminUserId: req.user?.id
    });
    
    return sendSuccess(res, updatedUser);
  } catch (error) {
    logger.error("Error updating user rep assignment", { 
      error: error instanceof Error ? error.message : String(error),
      userId: req.params.userId,
      repCode: req.body.repCode
    });
    return sendError(res, error instanceof Error ? error.message : "Failed to update assignment", 500);
  }
}));

// Remove user's rep assignment
router.delete("/users/:userId/rep-assignment", isAdmin, asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);

    if (isNaN(userId)) {
      return sendError(res, "Invalid user ID", 400);
    }

    const updatedUser = await storage.removeUserRepAssignment(userId);
    
    if (!updatedUser) {
      return sendError(res, "User not found", 404);
    }

    logger.info("User rep assignment removed by admin", { 
      userId,
      adminUserId: req.user?.id
    });
    
    return sendSuccess(res, updatedUser);
  } catch (error) {
    logger.error("Error removing user rep assignment", { 
      error: error instanceof Error ? error.message : String(error),
      userId: req.params.userId
    });
    return sendError(res, "Failed to remove assignment", 500);
  }
}));

// Get assignment statistics for a sales rep
router.get("/sales-reps/:id/assignment-stats", isAdmin, asyncHandler(async (req: Request, res: Response) => {
  try {
    const repId = parseInt(req.params.id);
    if (isNaN(repId)) {
      return sendError(res, "Invalid sales rep ID", 400);
    }

    // Get the sales rep to verify it exists and get the repCode
    const rep = await storage.getSalesRepById(repId);
    if (!rep) {
      return sendError(res, "Sales rep not found", 404);
    }

    const stats = await storage.getRepAssignmentStats(rep.repCode);
    
    logger.info("Assignment stats fetched for sales rep", { repId, repCode: rep.repCode, stats });
    return sendSuccess(res, stats);
  } catch (error) {
    logger.error("Error fetching assignment stats", { error, repId: req.params.id });
    return sendError(res, "Failed to fetch assignment stats", 500);
  }
}));

export { router as adminRoutes };