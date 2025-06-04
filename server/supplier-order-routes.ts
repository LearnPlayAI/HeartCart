import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import { z } from 'zod';
import { storage } from './storage';
import { requireAuth, requireAdmin } from './auth-middleware';
import { sendError, sendSuccess } from './utils';

const router = Router();

// Validation schemas
const updateStatusSchema = z.object({
  status: z.enum(['pending', 'ordered', 'unavailable', 'received']),
  notes: z.string().optional(),
  supplierOrderNumber: z.string().optional(),
  expectedDelivery: z.string().optional(),
});

// GET /api/admin/supplier-orders - Get all supplier orders with filtering
router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { status = 'all', validation = 'all', search = '' } = req.query;
  
  try {
    const supplierOrders = await storage.getSupplierOrders({
      status: status === 'all' ? undefined : status as string,
      validation: validation === 'all' ? undefined : validation as string,
      search: search as string,
    });
    
    return sendSuccess(res, supplierOrders);
  } catch (error) {
    console.error('Error fetching supplier orders:', error);
    return sendError(res, 'Failed to fetch supplier orders', 500);
  }
}));

// POST /api/admin/supplier-orders/:id/validate-url - Validate supplier URL
router.post('/:id/validate-url', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const orderId = parseInt(req.params.id);
  
  if (isNaN(orderId)) {
    return sendError(res, 'Invalid order ID', 400);
  }
  
  try {
    const supplierOrder = await storage.getSupplierOrderById(orderId);
    if (!supplierOrder) {
      return sendError(res, 'Supplier order not found', 404);
    }
    
    // Validate the supplier URL by making a HEAD request
    let validationStatus = 'invalid';
    try {
      const response = await fetch(supplierOrder.supplierUrl, { 
        method: 'HEAD',
        timeout: 10000 // 10 second timeout
      });
      validationStatus = response.ok ? 'valid' : 'invalid';
    } catch (error) {
      console.error('URL validation failed:', error);
      validationStatus = 'invalid';
    }
    
    // Update the validation status
    await storage.updateSupplierOrderValidation(orderId, {
      urlValidationStatus: validationStatus,
      urlLastChecked: new Date().toISOString(),
    });
    
    return sendSuccess(res, { 
      orderId,
      validationStatus,
      validatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error validating supplier URL:', error);
    return sendError(res, 'Failed to validate supplier URL', 500);
  }
}));

// PATCH /api/admin/supplier-orders/:id/status - Update supplier order status
router.patch('/:id/status', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const orderId = parseInt(req.params.id);
  
  if (isNaN(orderId)) {
    return sendError(res, 'Invalid order ID', 400);
  }
  
  const validation = updateStatusSchema.safeParse(req.body);
  if (!validation.success) {
    return sendError(res, 'Invalid request data', 400, validation.error.errors);
  }
  
  const { status, notes, supplierOrderNumber, expectedDelivery } = validation.data;
  
  try {
    const supplierOrder = await storage.getSupplierOrderById(orderId);
    if (!supplierOrder) {
      return sendError(res, 'Supplier order not found', 404);
    }
    
    // Update the supplier order status
    await storage.updateSupplierOrderStatus(orderId, {
      status,
      notes,
      supplierOrderNumber,
      expectedDelivery,
      updatedAt: new Date().toISOString(),
    });
    
    // If status is changed to 'unavailable', automatically create a credit transaction
    if (status === 'unavailable') {
      const customerOrder = await storage.getOrderById(supplierOrder.orderId);
      if (customerOrder) {
        // Calculate credit amount (unit cost * quantity)
        const creditAmount = supplierOrder.unitCost * supplierOrder.quantity;
        
        // Create credit transaction
        await storage.createCreditTransaction({
          userId: customerOrder.userId,
          amount: creditAmount.toString(),
          transactionType: 'earned',
          description: `Credit for unavailable item: ${supplierOrder.productName}`,
          orderId: supplierOrder.orderId,
          supplierOrderId: orderId,
        });
        
        // Update user's credit balance
        await storage.updateUserCreditBalance(customerOrder.userId, creditAmount);
      }
    }
    
    return sendSuccess(res, { 
      orderId,
      status,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating supplier order status:', error);
    return sendError(res, 'Failed to update supplier order status', 500);
  }
}));

// POST /api/admin/supplier-orders/:id/generate-credit - Generate customer credit for unavailable item
router.post('/:id/generate-credit', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const orderId = parseInt(req.params.id);
  
  if (isNaN(orderId)) {
    return sendError(res, 'Invalid order ID', 400);
  }
  
  try {
    const supplierOrder = await storage.getSupplierOrderById(orderId);
    if (!supplierOrder) {
      return sendError(res, 'Supplier order not found', 404);
    }
    
    if (supplierOrder.status !== 'unavailable') {
      return sendError(res, 'Can only generate credit for unavailable items', 400);
    }
    
    const customerOrder = await storage.getOrderById(supplierOrder.orderId);
    if (!customerOrder) {
      return sendError(res, 'Customer order not found', 404);
    }
    
    // Check if credit has already been generated for this supplier order
    const existingCredit = await storage.getCreditTransactionBySupplierOrder(orderId);
    if (existingCredit) {
      return sendError(res, 'Credit has already been generated for this item', 400);
    }
    
    // Calculate credit amount (unit cost * quantity)
    const creditAmount = supplierOrder.unitCost * supplierOrder.quantity;
    
    // Create credit transaction
    const creditTransaction = await storage.createCreditTransaction({
      userId: customerOrder.userId,
      amount: creditAmount.toString(),
      transactionType: 'earned',
      description: `Credit for unavailable item: ${supplierOrder.productName}`,
      orderId: supplierOrder.orderId,
      supplierOrderId: orderId,
    });
    
    // Update user's credit balance
    await storage.updateUserCreditBalance(customerOrder.userId, creditAmount);
    
    return sendSuccess(res, {
      creditTransaction,
      creditAmount,
      customerEmail: customerOrder.customerEmail,
      customerName: customerOrder.customerName,
    });
  } catch (error) {
    console.error('Error generating customer credit:', error);
    return sendError(res, 'Failed to generate customer credit', 500);
  }
}));

// GET /api/admin/supplier-orders/:id - Get supplier order by ID
router.get('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
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