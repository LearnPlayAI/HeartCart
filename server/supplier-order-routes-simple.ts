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

// GET /api/admin/supplier-orders - Get all order items that need supplier management
router.get('/', isAuthenticated, isAdmin, asyncHandler(async (req, res) => {
  const { status = 'all', search = '' } = req.query;
  
  try {
    // Get all order items from paid orders that need supplier management
    const orderItemsWithStatus = await storage.getOrderItemsForSupplierManagement({
      status: status === 'all' ? undefined : status as string,
    });
    
    return sendSuccess(res, orderItemsWithStatus);
  } catch (error) {
    console.error('Error fetching supplier order items:', error);
    return sendError(res, 'Failed to fetch supplier order items', 500);
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

// PATCH /api/admin/supplier-orders/:id/status - Update supplier order status (new endpoint)
router.patch('/:id/status', isAuthenticated, isAdmin, asyncHandler(async (req, res) => {
  const orderId = parseInt(req.params.id);
  
  if (isNaN(orderId)) {
    return sendError(res, 'Invalid order ID', 400);
  }
  
  try {
    console.log('PATCH status update - Received request body:', JSON.stringify(req.body, null, 2));
    console.log('PATCH status update - Request body type:', typeof req.body);
    console.log('PATCH status update - Request body keys:', Object.keys(req.body || {}));
    console.log('PATCH status update - Status value:', req.body?.status);
    console.log('PATCH status update - Notes value:', req.body?.notes);
    
    const validation = updateStatusSchema.safeParse(req.body);
    if (!validation.success) {
      console.log('PATCH status update - Validation failed:', validation.error);
      console.log('PATCH status update - Validation error details:', validation.error.issues);
      return sendError(res, 'Invalid status data', 400);
    }
    
    // The orderId here actually refers to the order item ID (supplier order record ID)
    // We need to update the orderItemSupplierStatus table
    const supplierStatusData = {
      supplierStatus: validation.data.status,
      adminNotes: validation.data.notes,
      supplierOrderDate: validation.data.status === 'ordered' ? new Date().toISOString() : undefined,
      supplierOrderPlaced: validation.data.status === 'ordered',
      updatedAt: new Date().toISOString()
    };
    
    const updatedStatus = await storage.updateOrderItemSupplierStatus(orderId, supplierStatusData);
    if (!updatedStatus) {
      return sendError(res, 'Supplier order not found', 404);
    }
    
    // Handle credit generation for unavailable items
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
    
    return sendSuccess(res, updatedStatus);
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