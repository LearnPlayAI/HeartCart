/**
 * Direct Email Testing Script
 * Send test emails for all scenarios to admin@teemeyou.shop
 */

const { MailerSend, EmailParams, Sender, Recipient } = require("mailersend");

const MAILERSEND_API_KEY = process.env.MAILERSEND_API_KEY;
const BASE_URL = "https://teemeyou.shop";
const FROM_EMAIL = "sales@teemeyou.shop";
const TEST_EMAIL = "admin@teemeyou.shop";

if (!MAILERSEND_API_KEY) {
  console.error("MAILERSEND_API_KEY environment variable is required");
  process.exit(1);
}

const mailerSend = new MailerSend({
  apiKey: MAILERSEND_API_KEY,
});

// Email templates
const getAccountVerificationTemplate = (user, token) => ({
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to TeeMeYou - Verify Your Account</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa; line-height: 1.6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #ff1744 0%, #e91e63 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Welcome to TeeMeYou!</h1>
          <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">South Africa's Premier Online Shopping Destination</p>
        </div>
        
        <div style="padding: 40px 30px;">
          <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">Hi ${user.firstName || user.username}!</h2>
          
          <p style="color: #666; margin: 0 0 25px 0; font-size: 16px;">
            Thank you for joining TeeMeYou! We're excited to have you as part of our community. 
            To complete your registration and start shopping, please verify your email address.
          </p>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${BASE_URL}/verify-email?token=${token}" 
               style="display: inline-block; background: linear-gradient(135deg, #ff1744 0%, #e91e63 100%); 
                      color: white; text-decoration: none; padding: 15px 35px; border-radius: 8px; 
                      font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(255, 23, 68, 0.3);">
              Verify My Email Address
            </a>
          </div>
          
          <p style="color: #888; margin: 25px 0 0 0; font-size: 14px; text-align: center;">
            This verification link will expire in 1 hour for your security.
          </p>
          
          <p style="color: #888; margin: 20px 0 0 0; font-size: 14px; text-align: center;">
            If you didn't create this account, you can safely ignore this email.
          </p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 25px 30px; border-top: 1px solid #eee;">
          <p style="color: #888; margin: 0; font-size: 14px; text-align: center;">
            © 2025 TeeMeYou. Shop unique products from local South African suppliers.
          </p>
        </div>
      </div>
    </body>
    </html>
  `,
  text: `Welcome to TeeMeYou!

Hi ${user.firstName || user.username}!

Thank you for joining TeeMeYou! We're excited to have you as part of our community.

To complete your registration and start shopping, please verify your email address by clicking the link below:

${BASE_URL}/verify-email?token=${token}

This verification link will expire in 1 hour for your security.

If you didn't create this account, you can safely ignore this email.

© 2025 TeeMeYou - South Africa's Premier Online Shopping Destination`
});

const getPasswordResetTemplate = (user, token) => ({
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your TeeMeYou Password</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa; line-height: 1.6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #ff1744 0%, #e91e63 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Password Reset Request</h1>
        </div>
        
        <div style="padding: 40px 30px;">
          <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">Hi ${user.firstName || user.username}!</h2>
          
          <p style="color: #666; margin: 0 0 25px 0; font-size: 16px;">
            We received a request to reset your TeeMeYou account password. 
            Click the button below to create a new password.
          </p>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${BASE_URL}/reset-password?token=${token}" 
               style="display: inline-block; background: linear-gradient(135deg, #ff1744 0%, #e91e63 100%); 
                      color: white; text-decoration: none; padding: 15px 35px; border-radius: 8px; 
                      font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(255, 23, 68, 0.3);">
              Reset My Password
            </a>
          </div>
          
          <p style="color: #888; margin: 25px 0 0 0; font-size: 14px; text-align: center;">
            This password reset link will expire in 1 hour for your security.
          </p>
          
          <p style="color: #888; margin: 20px 0 0 0; font-size: 14px; text-align: center;">
            If you didn't request this password reset, you can safely ignore this email.
          </p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 25px 30px; border-top: 1px solid #eee;">
          <p style="color: #888; margin: 0; font-size: 14px; text-align: center;">
            © 2025 TeeMeYou. Shop unique products from local South African suppliers.
          </p>
        </div>
      </div>
    </body>
    </html>
  `,
  text: `Password Reset Request

Hi ${user.firstName || user.username}!

We received a request to reset your TeeMeYou account password.

To create a new password, click the link below:

${BASE_URL}/reset-password?token=${token}

This password reset link will expire in 1 hour for your security.

If you didn't request this password reset, you can safely ignore this email.

© 2025 TeeMeYou - South Africa's Premier Online Shopping Destination`
});

const getPaymentReceivedTemplate = (order, paymentDetails) => ({
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Received - Order ${order.orderNumber}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa; line-height: 1.6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Payment Received!</h1>
          <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Order ${order.orderNumber}</p>
        </div>
        
        <div style="padding: 40px 30px;">
          <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">Hi ${order.customerName}!</h2>
          
          <p style="color: #666; margin: 0 0 25px 0; font-size: 16px;">
            Great news! We've successfully received your payment for order <strong>${order.orderNumber}</strong>. 
            Your order is now being processed and will be shipped soon.
          </p>
          
          <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0;">
            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Payment Details</h3>
            <p style="color: #666; margin: 5px 0; font-size: 14px;"><strong>Transaction Reference:</strong> ${paymentDetails.transactionReference}</p>
            <p style="color: #666; margin: 5px 0; font-size: 14px;"><strong>Amount Paid:</strong> R${paymentDetails.amount.toFixed(2)}</p>
            <p style="color: #666; margin: 5px 0; font-size: 14px;"><strong>Payment Method:</strong> ${paymentDetails.paymentMethod.toUpperCase()}</p>
            <p style="color: #666; margin: 5px 0; font-size: 14px;"><strong>Payment Date:</strong> ${new Date(paymentDetails.paymentDate).toLocaleDateString()}</p>
          </div>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${BASE_URL}/orders/${order.id}" 
               style="display: inline-block; background: linear-gradient(135deg, #ff1744 0%, #e91e63 100%); 
                      color: white; text-decoration: none; padding: 15px 35px; border-radius: 8px; 
                      font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(255, 23, 68, 0.3);">
              Track Your Order
            </a>
          </div>
          
          <p style="color: #888; margin: 25px 0 0 0; font-size: 14px;">
            You'll receive another email with tracking information once your order ships.
          </p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 25px 30px; border-top: 1px solid #eee;">
          <p style="color: #888; margin: 0; font-size: 14px; text-align: center;">
            © 2025 TeeMeYou. Shop unique products from local South African suppliers.
          </p>
        </div>
      </div>
    </body>
    </html>
  `,
  text: `Payment Received! - Order ${order.orderNumber}

Hi ${order.customerName}!

Great news! We've successfully received your payment for order ${order.orderNumber}. Your order is now being processed and will be shipped soon.

Payment Details:
- Transaction Reference: ${paymentDetails.transactionReference}
- Amount Paid: R${paymentDetails.amount.toFixed(2)}
- Payment Method: ${paymentDetails.paymentMethod.toUpperCase()}
- Payment Date: ${new Date(paymentDetails.paymentDate).toLocaleDateString()}

Track your order: ${BASE_URL}/orders/${order.id}

You'll receive another email with tracking information once your order ships.

© 2025 TeeMeYou - South Africa's Premier Online Shopping Destination`
});

async function sendTestEmails() {
  console.log("🚀 Starting email tests to admin@teemeyou.shop...\n");
  
  const results = [];
  
  // Test data
  const testUser = {
    id: 1,
    username: "admin",
    email: TEST_EMAIL,
    firstName: "Admin"
  };
  
  const testOrder = {
    id: 1001,
    orderNumber: "TMY-TEST-001",
    customerName: "Test Customer",
    customerEmail: TEST_EMAIL,
    totalAmount: 384.99
  };
  
  const testPayment = {
    transactionReference: "TEST-TXN-12345",
    amount: 384.99,
    paymentMethod: "eft",
    paymentDate: new Date().toISOString()
  };

  try {
    // 1. Account Verification Email
    console.log("📧 Sending Account Verification email...");
    const verificationTemplate = getAccountVerificationTemplate(testUser, "test-verification-token-12345");
    
    const verificationEmail = new EmailParams()
      .setFrom(new Sender(FROM_EMAIL, "TeeMeYou"))
      .setTo([new Recipient(TEST_EMAIL, "Admin")])
      .setSubject("Welcome to TeeMeYou - Verify Your Account")
      .setHtml(verificationTemplate.html)
      .setText(verificationTemplate.text);

    const verificationResult = await mailerSend.email.send(verificationEmail);
    results.push({ type: "Account Verification", success: true, messageId: verificationResult.body?.message_id });
    console.log("✅ Account Verification email sent");

    // 2. Password Reset Email
    console.log("📧 Sending Password Reset email...");
    const resetTemplate = getPasswordResetTemplate(testUser, "test-reset-token-67890");
    
    const resetEmail = new EmailParams()
      .setFrom(new Sender(FROM_EMAIL, "TeeMeYou"))
      .setTo([new Recipient(TEST_EMAIL, "Admin")])
      .setSubject("Reset Your TeeMeYou Password")
      .setHtml(resetTemplate.html)
      .setText(resetTemplate.text);

    const resetResult = await mailerSend.email.send(resetEmail);
    results.push({ type: "Password Reset", success: true, messageId: resetResult.body?.message_id });
    console.log("✅ Password Reset email sent");

    // 3. Payment Received Email
    console.log("📧 Sending Payment Received email...");
    const paymentTemplate = getPaymentReceivedTemplate(testOrder, testPayment);
    
    const paymentEmail = new EmailParams()
      .setFrom(new Sender(FROM_EMAIL, "TeeMeYou"))
      .setTo([new Recipient(TEST_EMAIL, "Admin")])
      .setSubject(`Payment Received - Order ${testOrder.orderNumber}`)
      .setHtml(paymentTemplate.html)
      .setText(paymentTemplate.text);

    const paymentResult = await mailerSend.email.send(paymentEmail);
    results.push({ type: "Payment Received", success: true, messageId: paymentResult.body?.message_id });
    console.log("✅ Payment Received email sent");

    // 4. Order Status Update Email (Shipped)
    console.log("📧 Sending Order Status Update email...");
    const statusTemplate = {
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Order Has Shipped - ${testOrder.orderNumber}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa; line-height: 1.6;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Your Order Has Shipped!</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Order ${testOrder.orderNumber}</p>
            </div>
            
            <div style="padding: 40px 30px;">
              <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">Hi ${testOrder.customerName}!</h2>
              
              <p style="color: #666; margin: 0 0 25px 0; font-size: 16px;">
                Great news! Your order <strong>${testOrder.orderNumber}</strong> has been shipped and is on its way to you.
              </p>
              
              <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0;">
                <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Tracking Information</h3>
                <p style="color: #666; margin: 5px 0; font-size: 14px;"><strong>Tracking Number:</strong> PUD123456789</p>
                <p style="color: #666; margin: 5px 0; font-size: 14px;"><strong>Shipping Method:</strong> PUDO Locker</p>
                <p style="color: #666; margin: 5px 0; font-size: 14px;"><strong>Estimated Delivery:</strong> 3-5 business days</p>
              </div>
              
              <div style="text-align: center; margin: 35px 0;">
                <a href="${BASE_URL}/orders/${testOrder.id}" 
                   style="display: inline-block; background: linear-gradient(135deg, #ff1744 0%, #e91e63 100%); 
                          color: white; text-decoration: none; padding: 15px 35px; border-radius: 8px; 
                          font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(255, 23, 68, 0.3);">
                  Track Your Package
                </a>
              </div>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 25px 30px; border-top: 1px solid #eee;">
              <p style="color: #888; margin: 0; font-size: 14px; text-align: center;">
                © 2025 TeeMeYou. Shop unique products from local South African suppliers.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Your Order Has Shipped! - Order ${testOrder.orderNumber}

Hi ${testOrder.customerName}!

Great news! Your order ${testOrder.orderNumber} has been shipped and is on its way to you.

Tracking Information:
- Tracking Number: PUD123456789
- Shipping Method: PUDO Locker
- Estimated Delivery: 3-5 business days

Track your package: ${BASE_URL}/orders/${testOrder.id}

© 2025 TeeMeYou - South Africa's Premier Online Shopping Destination`
    };
    
    const statusEmail = new EmailParams()
      .setFrom(new Sender(FROM_EMAIL, "TeeMeYou"))
      .setTo([new Recipient(TEST_EMAIL, "Admin")])
      .setSubject(`Your Order Has Shipped - ${testOrder.orderNumber}`)
      .setHtml(statusTemplate.html)
      .setText(statusTemplate.text);

    const statusResult = await mailerSend.email.send(statusEmail);
    results.push({ type: "Order Status Update (Shipped)", success: true, messageId: statusResult.body?.message_id });
    console.log("✅ Order Status Update email sent");

    // 5. Invoice Email
    console.log("📧 Sending Invoice email...");
    const invoiceTemplate = {
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invoice for Order ${testOrder.orderNumber}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa; line-height: 1.6;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #ff1744 0%, #e91e63 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Invoice</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Order ${testOrder.orderNumber}</p>
            </div>
            
            <div style="padding: 40px 30px;">
              <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">Hi ${testOrder.customerName}!</h2>
              
              <p style="color: #666; margin: 0 0 25px 0; font-size: 16px;">
                Thank you for your purchase! Please find your invoice for order <strong>${testOrder.orderNumber}</strong> below.
              </p>
              
              <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0;">
                <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Order Summary</h3>
                <p style="color: #666; margin: 5px 0; font-size: 14px;"><strong>Order Number:</strong> ${testOrder.orderNumber}</p>
                <p style="color: #666; margin: 5px 0; font-size: 14px;"><strong>Order Date:</strong> ${new Date().toLocaleDateString()}</p>
                <p style="color: #666; margin: 5px 0; font-size: 14px;"><strong>Total Amount:</strong> R${testOrder.totalAmount.toFixed(2)}</p>
                <p style="color: #666; margin: 5px 0; font-size: 14px;"><strong>Status:</strong> Delivered</p>
              </div>
              
              <div style="text-align: center; margin: 35px 0;">
                <a href="${BASE_URL}/orders/${testOrder.id}" 
                   style="display: inline-block; background: linear-gradient(135deg, #ff1744 0%, #e91e63 100%); 
                          color: white; text-decoration: none; padding: 15px 35px; border-radius: 8px; 
                          font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(255, 23, 68, 0.3);">
                  View Full Invoice
                </a>
              </div>
              
              <p style="color: #888; margin: 25px 0 0 0; font-size: 14px;">
                Thank you for shopping with TeeMeYou! We hope you love your purchase.
              </p>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 25px 30px; border-top: 1px solid #eee;">
              <p style="color: #888; margin: 0; font-size: 14px; text-align: center;">
                © 2025 TeeMeYou. Shop unique products from local South African suppliers.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Invoice for Order ${testOrder.orderNumber}

Hi ${testOrder.customerName}!

Thank you for your purchase! Please find your invoice for order ${testOrder.orderNumber} below.

Order Summary:
- Order Number: ${testOrder.orderNumber}
- Order Date: ${new Date().toLocaleDateString()}
- Total Amount: R${testOrder.totalAmount.toFixed(2)}
- Status: Delivered

View full invoice: ${BASE_URL}/orders/${testOrder.id}

Thank you for shopping with TeeMeYou! We hope you love your purchase.

© 2025 TeeMeYou - South Africa's Premier Online Shopping Destination`
    };
    
    const invoiceEmail = new EmailParams()
      .setFrom(new Sender(FROM_EMAIL, "TeeMeYou"))
      .setTo([new Recipient(TEST_EMAIL, "Admin")])
      .setSubject(`Invoice for Order ${testOrder.orderNumber}`)
      .setHtml(invoiceTemplate.html)
      .setText(invoiceTemplate.text);

    const invoiceResult = await mailerSend.email.send(invoiceEmail);
    results.push({ type: "Invoice", success: true, messageId: invoiceResult.body?.message_id });
    console.log("✅ Invoice email sent");

  } catch (error) {
    console.error("❌ Error sending emails:", error);
    results.push({ type: "Error", success: false, error: error.message });
  }

  // Summary
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log(`\n📊 Email Test Summary:`);
  console.log(`✅ Successful: ${successCount}/${totalCount}`);
  console.log(`📧 Recipient: ${TEST_EMAIL}`);
  console.log(`📤 From: ${FROM_EMAIL}`);
  
  results.forEach(result => {
    if (result.success) {
      console.log(`✅ ${result.type} - Message ID: ${result.messageId}`);
    } else {
      console.log(`❌ ${result.type} - Error: ${result.error}`);
    }
  });
  
  console.log(`\n🎉 All test emails have been sent to admin@teemeyou.shop!`);
}

sendTestEmails().catch(console.error);