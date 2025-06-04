import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import { z } from 'zod';
import { storage } from './storage';
import { isAuthenticated, isAdmin } from './auth-middleware';
import { sendError, sendSuccess } from './api-response';

const router = Router();

// Validation schemas
const updateStatusSchema = z.object({
  status: z.enum(['pending', 'ordered', 'unavailable', 'received']),
  notes: z.string().optional(),
  supplierOrderNumber: z.string().optional(),
  expectedDelivery: z.string().optional(),
});

// GET /api/admin/supplier-orders - Get all supplier orders with filtering
router.get('/', isAuthenticated, isAdmin, asyncHandler(async (req, res) => {
  const { status = 'all', search = '' } = req.query;
  
  try {
    const supplierOrders = await storage.getSupplierOrders({
      status: status === 'all' ? undefined : status as string,
    });
    
    return sendSuccess(res, supplierOrders);
  } catch (error) {
    console.error('Error fetching supplier orders:', error);
    return sendError(res, 'Failed to fetch supplier orders', 500);
  }
}));

// POST /api/admin/supplier-orders/:id/update-status - Update supplier order status
router.post('/:id/update-status', isAuthenticated, isAdmin, asyncHandler(async (req, res) => {
  const orderId = parseInt(req.params.id);
  
  if (isNaN(orderId)) {
    return sendError(res, 'Invalid order ID', 400);
  }
  
  try {
    const validation = updateStatusSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(res, 'Invalid status data', 400);
    }
    
    const updatedOrder = await storage.updateSupplierOrder(orderId, validation.data);
    if (!updatedOrder) {
      return sendError(res, 'Supplier order not found', 404);
    }
    
    // If status is 'unavailable', create credit transaction
    if (validation.data.status === 'unavailable') {
      const orderItem = await storage.getOrderItemById(orderId);
      if (orderItem?.order) {
        const creditAmount = orderItem.totalPrice.toString();
        
        // Create credit transaction
        await storage.createCreditTransaction({
          userId: orderItem.order.userId,
          transactionType: 'credit',
          amount: creditAmount,
          description: `Credit for unavailable item: ${orderItem.productName}`,
          orderId: orderItem.orderId,
        });
        
        // Update user credit balance
        const currentBalance = await storage.getUserCreditBalance(orderItem.order.userId);
        const newBalance = parseFloat(currentBalance.toString()) + parseFloat(creditAmount);
        await storage.updateUserCreditBalance(orderItem.order.userId, newBalance);
        
        // Create notification
        await storage.createNotification({
          userId: orderItem.order.userId,
          type: 'credit_issued',
          title: 'Credit Issued',
          message: `You have received R${creditAmount} credit for unavailable item: ${orderItem.productName}`,
          isRead: false,
        });
      }
    }
    
    return sendSuccess(res, updatedOrder);
  } catch (error) {
    console.error('Error updating supplier order status:', error);
    return sendError(res, 'Failed to update supplier order status', 500);
  }
}));

// GET /api/admin/supplier-orders/:id - Get specific supplier order
router.get('/:id', isAuthenticated, isAdmin, asyncHandler(async (req, res) => {
  const orderId = parseInt(req.params.id);
  
  if (isNaN(orderId)) {
    return sendError(res, 'Invalid order ID', 400);
  }
  
  try {
    const supplierOrder = await storage.getSupplierOrderById(orderId);
    if (!supplierOrder) {
      return sendError(res, 'Supplier order not found', 404);
    }
    
    return sendSuccess(res, supplierOrder);
  } catch (error) {
    console.error('Error fetching supplier order:', error);
    return sendError(res, 'Failed to fetch supplier order', 500);
  }
}));

export default router;