import { Router } from "express";
import { z } from "zod";
import asyncHandler from "express-async-handler";
import { storage } from "./storage";
import { insertCreditTransactionSchema, insertOrderItemSupplierStatusSchema } from "@shared/schema";
import { isAuthenticated } from "./auth-middleware";

const router = Router();

// Get user's credit balance
router.get("/balance", isAuthenticated, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  
  try {
    const creditBalance = await storage.getUserCreditBalance(userId);
    
    res.json({
      success: true,
      data: {
        userId,
        totalCredits: creditBalance.totalCreditAmount || 0,
        availableCredits: creditBalance.availableCreditAmount || 0
      }
    });
  } catch (error) {
    console.error("Error fetching credit balance:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch credit balance"
    });
  }
}));

// Get user's credit transaction history
router.get("/transactions", isAuthenticated, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;
  
  try {
    const transactions = await storage.getUserCreditTransactions(userId, limit, offset);
    
    res.json({
      success: true,
      data: transactions,
      meta: {
        page,
        limit,
        total: transactions.length
      }
    });
  } catch (error) {
    console.error("Error fetching credit transactions:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch credit transactions"
    });
  }
}));

// Admin route: Add credits to a user
router.post("/admin/add-credits", isAuthenticated, asyncHandler(async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: "Admin access required"
    });
  }

  const addCreditsSchema = z.object({
    userId: z.number(),
    amount: z.number().positive(),
    description: z.string().optional()
  });

  try {
    const { userId, amount, description } = addCreditsSchema.parse(req.body);
    
    const result = await storage.addUserCredits(userId, amount, description || 'Admin credit adjustment');
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Error adding credits:", error);
    res.status(500).json({
      success: false,
      error: "Failed to add credits"
    });
  }
}));

// Admin route: Update order item supplier status
router.put("/admin/supplier-status/:orderItemId", isAuthenticated, asyncHandler(async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: "Admin access required"
    });
  }

  const orderItemId = parseInt(req.params.orderItemId);
  
  const updateStatusSchema = z.object({
    supplierStatus: z.enum(['pending', 'ordered', 'backordered', 'unavailable', 'received']),
    supplierOrderPlaced: z.boolean().optional(),
    supplierOrderDate: z.string().optional(),
    adminNotes: z.string().optional(),
    customerNotified: z.boolean().optional()
  });

  try {
    const statusData = updateStatusSchema.parse(req.body);
    
    const result = await storage.updateOrderItemSupplierStatus(orderItemId, statusData);
    
    // If item is marked as unavailable, automatically generate credit
    if (statusData.supplierStatus === 'unavailable') {
      const orderItem = await storage.getOrderItemById(orderItemId);
      if (orderItem) {
        const creditAmount = orderItem.totalPrice;
        const description = `Credit for unavailable item: ${orderItem.productName} (Order #${orderItem.orderId})`;
        
        await storage.addUserCredits(orderItem.order?.userId || 0, creditAmount, description);
      }
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Error updating supplier status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update supplier status"
    });
  }
}));

// Admin route: Get all supplier order statuses
router.get("/admin/supplier-orders", isAuthenticated, asyncHandler(async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: "Admin access required"
    });
  }

  const status = req.query.status as string;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = (page - 1) * limit;
  
  try {
    const supplierOrders = await storage.getSupplierOrderStatuses(status, limit, offset);
    
    res.json({
      success: true,
      data: supplierOrders,
      meta: {
        page,
        limit,
        status: status || 'all'
      }
    });
  } catch (error) {
    console.error("Error fetching supplier orders:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch supplier orders"
    });
  }
}));

// Admin route: Generate credit for specific order item
router.post("/admin/generate-credit", isAuthenticated, asyncHandler(async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: "Admin access required"
    });
  }

  const generateCreditSchema = z.object({
    orderItemId: z.number(),
    amount: z.number().positive().optional(),
    description: z.string()
  });

  try {
    const { orderItemId, amount, description } = generateCreditSchema.parse(req.body);
    
    const orderItem = await storage.getOrderItemById(orderItemId);
    if (!orderItem) {
      return res.status(404).json({
        success: false,
        error: "Order item not found"
      });
    }

    const creditAmount = amount || orderItem.totalPrice;
    const userId = orderItem.order?.userId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "Unable to determine user for credit"
      });
    }

    const result = await storage.addUserCredits(userId, creditAmount, description);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Error generating credit:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate credit"
    });
  }
}));

export default router;