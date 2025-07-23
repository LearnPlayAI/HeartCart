import { Router } from 'express';
import { storage } from './storage';
import { sendError, sendSuccess } from './api-response';
import { isAdmin } from './auth-middleware';
import asyncHandler from 'express-async-handler';
import { logger } from './logger';
import * as z from 'zod';
import { 
  insertCorporateOrderSchema,
  insertCorporateOrderItemSchema,
  insertCorporateShipmentSchema,
  insertCorporateInvoiceLineItemSchema,
  type CorporateOrder,
  type CorporateOrderItem,
  type CorporateShipment,
  type CorporateInvoiceLineItem
} from '@shared/schema';

const router = Router();

// =============================================================================
// CORPORATE ORDER ROUTES
// =============================================================================

// Get all corporate orders (admin only)
router.get('/corporate-orders', isAdmin, asyncHandler(async (req, res) => {
  try {
    const orders = await storage.getAllCorporateOrders();
    sendSuccess(res, { orders });
  } catch (error) {
    logger.error('Error getting corporate orders', { error });
    sendError(res, 'Failed to retrieve corporate orders', 500);
  }
}));

// Get specific corporate order with details (admin only)
router.get('/corporate-orders/:id', isAdmin, asyncHandler(async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return sendError(res, 'Invalid order ID', 400);
    }

    const order = await storage.getCorporateOrderWithDetails(id);
    if (!order) {
      return sendError(res, 'Corporate order not found', 404);
    }

    sendSuccess(res, { order });
  } catch (error) {
    logger.error('Error getting corporate order details', { error, id: req.params.id });
    sendError(res, 'Failed to retrieve corporate order details', 500);
  }
}));

// Create new corporate order (admin only)
router.post('/corporate-orders', isAdmin, asyncHandler(async (req, res) => {
  try {
    const orderData = insertCorporateOrderSchema.parse({
      ...req.body,
      createdByAdminId: req.user?.id
    });

    const order = await storage.createCorporateOrder(orderData);
    logger.info('Corporate order created', { orderId: order.id, orderNumber: order.orderNumber });
    
    sendSuccess(res, { order });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 'Invalid order data', 400, 'VALIDATION_ERROR', error.errors);
    }
    logger.error('Error creating corporate order', { error, body: req.body });
    sendError(res, 'Failed to create corporate order', 500);
  }
}));

// =============================================================================
// CORPORATE ORDER ITEM ROUTES
// =============================================================================

// Add item to corporate order (admin only)
router.post('/corporate-orders/:id/items', isAdmin, asyncHandler(async (req, res) => {
  try {
    const corporateOrderId = parseInt(req.params.id);
    if (isNaN(corporateOrderId)) {
      return sendError(res, 'Invalid corporate order ID', 400);
    }

    // Verify order exists
    const order = await storage.getCorporateOrder(corporateOrderId);
    if (!order) {
      return sendError(res, 'Corporate order not found', 404);
    }

    const itemData = insertCorporateOrderItemSchema.parse({
      ...req.body,
      corporateOrderId
    });

    const item = await storage.addCorporateOrderItem(itemData);
    logger.info('Corporate order item added', { itemId: item.id, corporateOrderId });
    
    sendSuccess(res, { item });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 'Invalid item data', 400, 'VALIDATION_ERROR', error.errors);
    }
    logger.error('Error adding corporate order item', { error, body: req.body });
    sendError(res, 'Failed to add item to corporate order', 500);
  }
}));

// Get all items for a corporate order (admin only)
router.get('/corporate-orders/:id/items', isAdmin, asyncHandler(async (req, res) => {
  try {
    const corporateOrderId = parseInt(req.params.id);
    if (isNaN(corporateOrderId)) {
      return sendError(res, 'Invalid corporate order ID', 400);
    }

    const items = await storage.getCorporateOrderItems(corporateOrderId);
    sendSuccess(res, { items });
  } catch (error) {
    logger.error('Error getting corporate order items', { error, corporateOrderId: req.params.id });
    sendError(res, 'Failed to retrieve corporate order items', 500);
  }
}));

// Update corporate order item (admin only)
router.put('/corporate-orders/:orderId/items/:itemId', isAdmin, asyncHandler(async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    if (isNaN(itemId)) {
      return sendError(res, 'Invalid item ID', 400);
    }

    const updateData = insertCorporateOrderItemSchema.partial().parse(req.body);
    const item = await storage.updateCorporateOrderItem(itemId, updateData);
    
    if (!item) {
      return sendError(res, 'Corporate order item not found', 404);
    }

    logger.info('Corporate order item updated', { itemId });
    sendSuccess(res, { item });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 'Invalid item data', 400, 'VALIDATION_ERROR', error.errors);
    }
    logger.error('Error updating corporate order item', { error, itemId: req.params.itemId });
    sendError(res, 'Failed to update corporate order item', 500);
  }
}));

// Delete corporate order item (admin only)
router.delete('/corporate-orders/:orderId/items/:itemId', isAdmin, asyncHandler(async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    if (isNaN(itemId)) {
      return sendError(res, 'Invalid item ID', 400);
    }

    const success = await storage.deleteCorporateOrderItem(itemId);
    if (!success) {
      return sendError(res, 'Corporate order item not found', 404);
    }

    logger.info('Corporate order item deleted', { itemId });
    sendSuccess(res, { message: 'Item deleted successfully' });
  } catch (error) {
    logger.error('Error deleting corporate order item', { error, itemId: req.params.itemId });
    sendError(res, 'Failed to delete corporate order item', 500);
  }
}));

// Send payment options email to customer (admin only)
router.post('/corporate-orders/:id/send-payment-options', isAdmin, asyncHandler(async (req, res) => {
  try {
    const corporateOrderId = parseInt(req.params.id);
    if (isNaN(corporateOrderId)) {
      return sendError(res, 'Invalid corporate order ID', 400);
    }

    const order = await storage.getCorporateOrderWithDetails(corporateOrderId);
    if (!order) {
      return sendError(res, 'Corporate order not found', 404);
    }

    if (!order.items || order.items.length === 0) {
      return sendError(res, 'Cannot send payment options - no items in order', 400);
    }

    // Import unified email service
    const { UnifiedEmailService } = await import('./unified-email-service.js');
    const emailService = new UnifiedEmailService();

    // Send corporate payment options email
    await emailService.sendCorporatePaymentOptionsEmail(order);

    // Update order status to indicate email has been sent
    await storage.updateCorporateOrderStatus(corporateOrderId, 'invoice_sent');

    logger.info('Corporate payment options email sent', { corporateOrderId, customerEmail: order.contactEmail });
    sendSuccess(res, { message: 'Payment options email sent successfully' });
  } catch (error) {
    logger.error('Error sending payment options email', { error, corporateOrderId: req.params.id });
    sendError(res, 'Failed to send payment options email', 500);
  }
}));

// Update corporate order (admin only)
router.patch('/corporate-orders/:id', isAdmin, asyncHandler(async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return sendError(res, 'Invalid order ID', 400);
    }

    // Validate update data (partial update)
    const updateData = insertCorporateOrderSchema.partial().parse(req.body);
    
    const updatedOrder = await storage.updateCorporateOrder(id, updateData);
    if (!updatedOrder) {
      return sendError(res, 'Corporate order not found', 404);
    }

    sendSuccess(res, { order: updatedOrder });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 'Invalid update data', 400, 'VALIDATION_ERROR', error.errors);
    }
    logger.error('Error updating corporate order', { error, id: req.params.id, body: req.body });
    sendError(res, 'Failed to update corporate order', 500);
  }
}));

// Delete corporate order (admin only)
router.delete('/corporate-orders/:id', isAdmin, asyncHandler(async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return sendError(res, 'Invalid order ID', 400);
    }

    const deleted = await storage.deleteCorporateOrder(id);
    if (!deleted) {
      return sendError(res, 'Corporate order not found', 404);
    }

    sendSuccess(res, { deleted: true });
  } catch (error) {
    logger.error('Error deleting corporate order', { error, id: req.params.id });
    sendError(res, 'Failed to delete corporate order', 500);
  }
}));

// =============================================================================
// CORPORATE ORDER ITEMS ROUTES
// =============================================================================

// Add item to corporate order (admin only)
router.post('/corporate-orders/:id/items', isAdmin, asyncHandler(async (req, res) => {
  try {
    const corporateOrderId = parseInt(req.params.id);
    if (isNaN(corporateOrderId)) {
      return sendError(res, 'Invalid order ID', 400);
    }

    const itemData = insertCorporateOrderItemSchema.parse({
      ...req.body,
      corporateOrderId
    });

    const item = await storage.addCorporateOrderItem(itemData);
    
    // Recalculate order totals
    await storage.calculateCorporateOrderTotals(corporateOrderId);
    
    sendSuccess(res, { item });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 'Invalid item data', 400, 'VALIDATION_ERROR', error.errors);
    }
    logger.error('Error adding corporate order item', { error, orderId: req.params.id, body: req.body });
    sendError(res, 'Failed to add item to corporate order', 500);
  }
}));

// Get items for corporate order (admin only)
router.get('/corporate-orders/:id/items', isAdmin, asyncHandler(async (req, res) => {
  try {
    const corporateOrderId = parseInt(req.params.id);
    if (isNaN(corporateOrderId)) {
      return sendError(res, 'Invalid order ID', 400);
    }

    const items = await storage.getCorporateOrderItems(corporateOrderId);
    sendSuccess(res, { items });
  } catch (error) {
    logger.error('Error getting corporate order items', { error, orderId: req.params.id });
    sendError(res, 'Failed to retrieve corporate order items', 500);
  }
}));

// Update corporate order item (admin only)
router.patch('/corporate-orders/:orderId/items/:itemId', isAdmin, asyncHandler(async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    const corporateOrderId = parseInt(req.params.orderId);
    
    if (isNaN(itemId) || isNaN(corporateOrderId)) {
      return sendError(res, 'Invalid item or order ID', 400);
    }

    const updateData = insertCorporateOrderItemSchema.partial().parse(req.body);
    
    const updatedItem = await storage.updateCorporateOrderItem(itemId, updateData);
    if (!updatedItem) {
      return sendError(res, 'Corporate order item not found', 404);
    }

    // Recalculate order totals
    await storage.calculateCorporateOrderTotals(corporateOrderId);

    sendSuccess(res, { item: updatedItem });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 'Invalid update data', 400, 'VALIDATION_ERROR', error.errors);
    }
    logger.error('Error updating corporate order item', { error, itemId: req.params.itemId, body: req.body });
    sendError(res, 'Failed to update corporate order item', 500);
  }
}));

// Delete corporate order item (admin only)
router.delete('/corporate-orders/:orderId/items/:itemId', isAdmin, asyncHandler(async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    const corporateOrderId = parseInt(req.params.orderId);
    
    if (isNaN(itemId) || isNaN(corporateOrderId)) {
      return sendError(res, 'Invalid item or order ID', 400);
    }

    const deleted = await storage.deleteCorporateOrderItem(itemId);
    if (!deleted) {
      return sendError(res, 'Corporate order item not found', 404);
    }

    // Recalculate order totals
    await storage.calculateCorporateOrderTotals(corporateOrderId);

    sendSuccess(res, { deleted: true });
  } catch (error) {
    logger.error('Error deleting corporate order item', { error, itemId: req.params.itemId });
    sendError(res, 'Failed to delete corporate order item', 500);
  }
}));

// =============================================================================
// CORPORATE SHIPMENTS ROUTES
// =============================================================================

// Create shipment for corporate order (admin only)
router.post('/corporate-orders/:id/shipments', isAdmin, asyncHandler(async (req, res) => {
  try {
    const corporateOrderId = parseInt(req.params.id);
    if (isNaN(corporateOrderId)) {
      return sendError(res, 'Invalid order ID', 400);
    }

    const shipmentData = insertCorporateShipmentSchema.parse({
      ...req.body,
      corporateOrderId
    });

    const shipment = await storage.createCorporateShipment(shipmentData);
    sendSuccess(res, { shipment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 'Invalid shipment data', 400, 'VALIDATION_ERROR', error.errors);
    }
    logger.error('Error creating corporate shipment', { error, orderId: req.params.id, body: req.body });
    sendError(res, 'Failed to create shipment', 500);
  }
}));

// Get shipments for corporate order (admin only)
router.get('/corporate-orders/:id/shipments', isAdmin, asyncHandler(async (req, res) => {
  try {
    const corporateOrderId = parseInt(req.params.id);
    if (isNaN(corporateOrderId)) {
      return sendError(res, 'Invalid order ID', 400);
    }

    const shipments = await storage.getCorporateShipments(corporateOrderId);
    sendSuccess(res, { shipments });
  } catch (error) {
    logger.error('Error getting corporate shipments', { error, orderId: req.params.id });
    sendError(res, 'Failed to retrieve shipments', 500);
  }
}));

// Update shipment (admin only)
router.patch('/corporate-orders/:orderId/shipments/:shipmentId', isAdmin, asyncHandler(async (req, res) => {
  try {
    const shipmentId = parseInt(req.params.shipmentId);
    if (isNaN(shipmentId)) {
      return sendError(res, 'Invalid shipment ID', 400);
    }

    const updateData = insertCorporateShipmentSchema.partial().parse(req.body);
    
    const updatedShipment = await storage.updateCorporateShipment(shipmentId, updateData);
    if (!updatedShipment) {
      return sendError(res, 'Shipment not found', 404);
    }

    sendSuccess(res, { shipment: updatedShipment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 'Invalid update data', 400, 'VALIDATION_ERROR', error.errors);
    }
    logger.error('Error updating corporate shipment', { error, shipmentId: req.params.shipmentId, body: req.body });
    sendError(res, 'Failed to update shipment', 500);
  }
}));

// =============================================================================
// CORPORATE INVOICE LINE ITEMS ROUTES
// =============================================================================

// Add invoice line item to corporate order (admin only)
router.post('/corporate-orders/:id/invoice-line-items', isAdmin, asyncHandler(async (req, res) => {
  try {
    const corporateOrderId = parseInt(req.params.id);
    if (isNaN(corporateOrderId)) {
      return sendError(res, 'Invalid order ID', 400);
    }

    const lineItemData = insertCorporateInvoiceLineItemSchema.parse({
      ...req.body,
      corporateOrderId
    });

    const lineItem = await storage.addCorporateInvoiceLineItem(lineItemData);
    
    // Recalculate order totals
    await storage.calculateCorporateOrderTotals(corporateOrderId);
    
    sendSuccess(res, { lineItem });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 'Invalid line item data', 400, 'VALIDATION_ERROR', error.errors);
    }
    logger.error('Error adding corporate invoice line item', { error, orderId: req.params.id, body: req.body });
    sendError(res, 'Failed to add invoice line item', 500);
  }
}));

// Get invoice line items for corporate order (admin only)
router.get('/corporate-orders/:id/invoice-line-items', isAdmin, asyncHandler(async (req, res) => {
  try {
    const corporateOrderId = parseInt(req.params.id);
    if (isNaN(corporateOrderId)) {
      return sendError(res, 'Invalid order ID', 400);
    }

    const lineItems = await storage.getCorporateInvoiceLineItems(corporateOrderId);
    sendSuccess(res, { lineItems });
  } catch (error) {
    logger.error('Error getting corporate invoice line items', { error, orderId: req.params.id });
    sendError(res, 'Failed to retrieve invoice line items', 500);
  }
}));

// Update invoice line item (admin only)
router.patch('/corporate-orders/:orderId/invoice-line-items/:lineItemId', isAdmin, asyncHandler(async (req, res) => {
  try {
    const lineItemId = parseInt(req.params.lineItemId);
    const corporateOrderId = parseInt(req.params.orderId);
    
    if (isNaN(lineItemId) || isNaN(corporateOrderId)) {
      return sendError(res, 'Invalid line item or order ID', 400);
    }

    const updateData = insertCorporateInvoiceLineItemSchema.partial().parse(req.body);
    
    const updatedLineItem = await storage.updateCorporateInvoiceLineItem(lineItemId, updateData);
    if (!updatedLineItem) {
      return sendError(res, 'Invoice line item not found', 404);
    }

    // Recalculate order totals
    await storage.calculateCorporateOrderTotals(corporateOrderId);

    sendSuccess(res, { lineItem: updatedLineItem });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 'Invalid update data', 400, 'VALIDATION_ERROR', error.errors);
    }
    logger.error('Error updating corporate invoice line item', { error, lineItemId: req.params.lineItemId, body: req.body });
    sendError(res, 'Failed to update invoice line item', 500);
  }
}));

// Delete invoice line item (admin only)
router.delete('/corporate-orders/:orderId/invoice-line-items/:lineItemId', isAdmin, asyncHandler(async (req, res) => {
  try {
    const lineItemId = parseInt(req.params.lineItemId);
    const corporateOrderId = parseInt(req.params.orderId);
    
    if (isNaN(lineItemId) || isNaN(corporateOrderId)) {
      return sendError(res, 'Invalid line item or order ID', 400);
    }

    const deleted = await storage.deleteCorporateInvoiceLineItem(lineItemId);
    if (!deleted) {
      return sendError(res, 'Invoice line item not found', 404);
    }

    // Recalculate order totals
    await storage.calculateCorporateOrderTotals(corporateOrderId);

    sendSuccess(res, { deleted: true });
  } catch (error) {
    logger.error('Error deleting corporate invoice line item', { error, lineItemId: req.params.lineItemId });
    sendError(res, 'Failed to delete invoice line item', 500);
  }
}));

// =============================================================================
// CORPORATE ORDER MANAGEMENT ROUTES
// =============================================================================

// Update corporate order status (admin only)
router.patch('/corporate-orders/:id/status', isAdmin, asyncHandler(async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return sendError(res, 'Invalid order ID', 400);
    }

    const { status } = req.body;
    if (!status || typeof status !== 'string') {
      return sendError(res, 'Status is required', 400);
    }

    const updated = await storage.updateCorporateOrderStatus(id, status);
    if (!updated) {
      return sendError(res, 'Corporate order not found', 404);
    }

    sendSuccess(res, { updated: true });
  } catch (error) {
    logger.error('Error updating corporate order status', { error, id: req.params.id, body: req.body });
    sendError(res, 'Failed to update corporate order status', 500);
  }
}));

// Update corporate order payment status (admin only)
router.patch('/corporate-orders/:id/payment-status', isAdmin, asyncHandler(async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return sendError(res, 'Invalid order ID', 400);
    }

    const { paymentStatus, paymentMethod } = req.body;
    if (!paymentStatus || typeof paymentStatus !== 'string') {
      return sendError(res, 'Payment status is required', 400);
    }

    const updated = await storage.updateCorporateOrderPaymentStatus(id, paymentStatus, paymentMethod);
    if (!updated) {
      return sendError(res, 'Corporate order not found', 404);
    }

    sendSuccess(res, { updated: true });
  } catch (error) {
    logger.error('Error updating corporate order payment status', { error, id: req.params.id, body: req.body });
    sendError(res, 'Failed to update corporate order payment status', 500);
  }
}));

// Calculate corporate order totals (admin only)
router.post('/corporate-orders/:id/calculate-totals', isAdmin, asyncHandler(async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return sendError(res, 'Invalid order ID', 400);
    }

    const totals = await storage.calculateCorporateOrderTotals(id);
    sendSuccess(res, { totals });
  } catch (error) {
    logger.error('Error calculating corporate order totals', { error, id: req.params.id });
    sendError(res, 'Failed to calculate corporate order totals', 500);
  }
}));

// Create employee shipment (split items from corporate order)
router.post('/corporate-orders/:orderId/shipments', isAdmin, asyncHandler(async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const { packageId, employeeName, deliveryAddress, specialInstructions, estimatedDeliveryDate, itemIds } = req.body;

    // Validate required fields
    if (!packageId || !employeeName || !deliveryAddress || !itemIds || itemIds.length === 0) {
      return sendError(res, 'Missing required fields: packageId, employeeName, deliveryAddress, and itemIds', 400);
    }

    // Verify corporate order exists and is paid
    const corporateOrder = await storage.getCorporateOrder(orderId);
    if (!corporateOrder) {
      return sendError(res, 'Corporate order not found', 404);
    }
    
    if (corporateOrder.paymentStatus !== 'paid') {
      return sendError(res, 'Corporate order must be paid before creating shipments', 400);
    }

    // Create employee shipment
    const shipment = await storage.createCorporateShipment({
      corporateOrderId: orderId,
      packageId,
      employeeName,
      deliveryAddress,
      specialInstructions: specialInstructions || null,
      estimatedDeliveryDate: estimatedDeliveryDate || null,
      status: 'pending',
      shippingCost: '0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Update the selected items to be associated with this shipment
    for (const itemId of itemIds) {
      await storage.updateCorporateOrderItem(itemId, { 
        packageId: packageId 
      });
    }

    logger.info('Corporate employee shipment created', { 
      shipmentId: shipment.id, 
      orderId, 
      packageId,
      employeeName,
      itemCount: itemIds.length 
    });

    sendSuccess(res, { shipment });
  } catch (error) {
    logger.error('Error creating corporate employee shipment', { error, orderId: req.params.orderId });
    sendError(res, 'Failed to create employee shipment', 500);
  }
}));

// Get corporate order shipments
router.get('/corporate-orders/:orderId/shipments', isAdmin, asyncHandler(async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const shipments = await storage.getCorporateShipments(orderId);
    sendSuccess(res, { shipments });
  } catch (error) {
    logger.error('Error fetching corporate shipments', { error, orderId: req.params.orderId });
    sendError(res, 'Failed to fetch shipments', 500);
  }
}));

export default router;