/**
 * Email Testing Routes
 * For testing all email scenarios
 */

import express, { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { unifiedEmailService } from "./unified-email-service";
import { sendSuccess, sendError } from "./api-response";
import { logger } from "./logger";

const router = express.Router();

/**
 * Send test emails for all scenarios to admin@heartcart.shop
 */
router.post("/send-test-emails", asyncHandler(async (req: Request, res: Response) => {
  const testEmail = "admin@heartcart.shop";
  const results = [];

  try {
    // 1. Account Verification Email
    logger.info("Sending test account verification email");
    const verificationResult = await unifiedEmailService.sendAccountVerificationEmail(
      {
        id: 1,
        username: "admin",
        email: testEmail,
        firstName: "Admin"
      },
      "test-verification-token-12345"
    );
    results.push({ type: "Account Verification", success: verificationResult });

    // 2. Password Reset Email
    logger.info("Sending test password reset email");
    const passwordResetResult = await unifiedEmailService.sendPasswordResetEmail(
      {
        id: 1,
        username: "admin",
        email: testEmail,
        firstName: "Admin"
      },
      "test-reset-token-67890"
    );
    results.push({ type: "Password Reset", success: passwordResetResult });

    // 3. Payment Received Email
    logger.info("Sending test payment received email");
    const paymentResult = await unifiedEmailService.sendPaymentReceivedEmail(
      {
        id: 1001,
        orderNumber: "HTC-TEST-001",
        status: "paid",
        customerName: "Test Customer",
        customerEmail: testEmail,
        customerPhone: "+27 82 123 4567",
        shippingAddress: "123 Test Street",
        shippingCity: "Cape Town",
        shippingPostalCode: "8001",
        shippingMethod: "pudo",
        shippingCost: 85,
        paymentMethod: "eft",
        paymentStatus: "paid",
        subtotalAmount: 299.99,
        totalAmount: 384.99,
        createdAt: new Date().toISOString(),
        orderItems: [
          {
            productName: "Test T-Shirt - Medium",
            quantity: 2,
            unitPrice: 149.99,
            totalPrice: 299.98
          }
        ]
      },
      {
        orderNumber: "HTC-TEST-001",
        amount: 384.99,
        paymentMethod: "eft",
        transactionReference: "TEST-TXN-12345",
        paymentDate: new Date().toISOString()
      }
    );
    results.push({ type: "Payment Received", success: paymentResult });

    // 4. Order Status Update Email (Shipped)
    logger.info("Sending test order status update email");
    const statusUpdateResult = await unifiedEmailService.sendOrderStatusUpdateEmail(
      {
        id: 1001,
        orderNumber: "HTC-TEST-001",
        status: "shipped",
        customerName: "Test Customer",
        customerEmail: testEmail,
        customerPhone: "+27 82 123 4567",
        shippingAddress: "123 Test Street",
        shippingCity: "Cape Town",
        shippingPostalCode: "8001",
        shippingMethod: "pudo",
        shippingCost: 85,
        paymentMethod: "eft",
        paymentStatus: "paid",
        subtotalAmount: 299.99,
        totalAmount: 384.99,
        createdAt: new Date().toISOString(),
        trackingNumber: "PUD123456789",
        orderItems: [
          {
            productName: "Test T-Shirt - Medium",
            quantity: 2,
            unitPrice: 149.99,
            totalPrice: 299.98
          }
        ]
      },
      "paid"
    );
    results.push({ type: "Order Status Update (Shipped)", success: statusUpdateResult });

    // 5. Invoice Email
    logger.info("Sending test invoice email");
    const invoiceResult = await unifiedEmailService.sendInvoiceEmail(
      {
        id: 1001,
        orderNumber: "HTC-TEST-001",
        status: "delivered",
        customerName: "Test Customer",
        customerEmail: testEmail,
        customerPhone: "+27 82 123 4567",
        shippingAddress: "123 Test Street",
        shippingCity: "Cape Town",
        shippingPostalCode: "8001",
        shippingMethod: "pudo",
        shippingCost: 85,
        paymentMethod: "eft",
        paymentStatus: "paid",
        subtotalAmount: 299.99,
        totalAmount: 384.99,
        createdAt: new Date().toISOString(),
        orderItems: [
          {
            productName: "Test T-Shirt - Medium",
            quantity: 1,
            unitPrice: 149.99,
            totalPrice: 149.99
          },
          {
            productName: "Test Hoodie - Large",
            quantity: 1,
            unitPrice: 149.99,
            totalPrice: 149.99
          }
        ]
      }
    );
    results.push({ type: "Invoice", success: invoiceResult });

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    logger.info(`Test emails completed: ${successCount}/${totalCount} successful`, { results });

    return res.status(200).json({
      success: true,
      data: {
        totalSent: totalCount,
        successful: successCount,
        results: results,
        recipient: testEmail,
        mailServiceReady: unifiedEmailService.isReady()
      },
      message: `Test emails sent: ${successCount}/${totalCount} successful`
    });

  } catch (error) {
    logger.error('Error sending test emails', { error });
    return sendError(res, "Failed to send test emails. Please check the logs.", 500);
  }
}));

/**
 * Check email service status
 */
router.get("/status", asyncHandler(async (req: Request, res: Response) => {
  const isReady = unifiedEmailService.isReady();
  
  return sendSuccess(res, {
    emailServiceReady: isReady,
    fromEmail: "sales@heartcart.shop",
    baseUrl: "https://heartcart.shop"
  }, isReady ? "Email service is ready" : "Email service not configured");
}));

export { router as emailTestRoutes };