/**
 * Direct Email Testing Script - All 5 Scenarios
 * Tests all email types by calling email service functions directly
 */

import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';

// Email service configuration
const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY,
});

const senderEmail = 'sales@heartcart.shop';
const recipientEmail = 'admin@heartcart.shop';

// Sample data for testing
const testData = {
  user: {
    email: recipientEmail,
    username: 'TestUser'
  },
  verificationToken: 'test-token-12345',
  resetToken: 'reset-token-67890',
  order: {
    id: 1,
    orderNumber: 'HTC-2025-001234',
    customerName: 'John Smith',
    customerEmail: recipientEmail,
    totalAmount: 299.99,
    paymentMethod: 'EFT Bank Transfer',
    status: 'shipped',
    trackingNumber: 'HTC-TRACK-789456123',
    shippingMethod: 'PUDO Locker',
    selectedLockerName: 'Sandton City Shopping Centre',
    selectedLockerAddress: '83 Rivonia Rd, Sandhurst, Sandton, 2196',
    estimatedDelivery: '2025-06-30',
    orderItems: [
      {
        productName: 'Trendy Graphic T-Shirt',
        quantity: 2,
        unitPrice: 149.99,
        totalPrice: 299.98,
        selectedAttributes: { size: 'L', color: 'Blue' }
      }
    ],
    subtotalAmount: 299.98,
    shippingCost: 0.00,
    createdAt: new Date().toISOString()
  }
};

// Email template functions
function createAccountVerificationEmail(user, token) {
  const verificationUrl = `https://heartcart.shop/verify-email?token=${token}`;
  
  return {
    subject: 'Welcome to HeartCart - Verify Your Email',
    html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to HeartCart</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #FF69B4, #9b59b6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #ddd; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }
        .button { background: linear-gradient(135deg, #FF69B4, #9b59b6); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; margin: 20px 0; font-weight: bold; }
        .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        ul { padding-left: 20px; }
        li { margin: 8px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">HeartCart</div>
            <h1>Welcome to HeartCart! 🎉</h1>
        </div>
        <div class="content">
            <p>Hi there,</p>
            <p>Thank you for joining HeartCart! We're excited to have you as part of our community.</p>
            <p>To complete your account setup and start shopping, please verify your email address by clicking the button below:</p>
            
            <center>
                <a href="${verificationUrl}" class="button">Verify My Email</a>
            </center>
            
            <p>This verification link will expire in 24 hours for security reasons.</p>
            
            <p><strong>What's next?</strong></p>
            <ul>
                <li>Browse our latest collection of trendy apparel</li>
                <li>Enjoy free shipping on orders over R500</li>
                <li>Get exclusive access to member-only deals</li>
            </ul>
            
            <p>If you didn't create this account, please ignore this email.</p>
            
            <p>Welcome aboard!<br>
            The HeartCart Team</p>
        </div>
        <div class="footer">
            <p>HeartCart | Johannesburg, South Africa | <a href="https://heartcart.shop">heartcart.shop</a></p>
            <p>Questions? Reply to this email or contact us at sales@heartcart.shop</p>
        </div>
    </div>
</body>
</html>`,
    text: `Welcome to HeartCart!

Hi there,

Thank you for joining HeartCart! Please verify your email address by visiting:
${verificationUrl}

This link expires in 24 hours.

Welcome aboard!
The HeartCart Team

HeartCart | https://heartcart.shop | sales@heartcart.shop`
  };
}

function createPasswordResetEmail(user, token) {
  const resetUrl = `https://heartcart.shop/reset-password?token=${token}`;
  
  return {
    subject: 'Reset Your HeartCart Password',
    html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #FF69B4, #9b59b6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #ddd; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }
        .button { background: linear-gradient(135deg, #FF69B4, #9b59b6); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; margin: 20px 0; font-weight: bold; }
        .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">HeartCart</div>
            <h1>Reset Your Password</h1>
        </div>
        <div class="content">
            <p>Hi there,</p>
            <p>We received a request to reset your password for your HeartCart account.</p>
            <p>Click the button below to create a new password:</p>
            
            <center>
                <a href="${resetUrl}" class="button">Reset Password</a>
            </center>
            
            <div class="warning">
                <strong>Important:</strong> This link will expire in 1 hour for security reasons.
            </div>
            
            <p>If you didn't request this password reset, please ignore this email. Your account remains secure.</p>
            
            <p>For security tips and account protection, visit our <a href="https://heartcart.shop/help">Help Center</a>.</p>
            
            <p>Stay safe,<br>
            The HeartCart Team</p>
        </div>
        <div class="footer">
            <p>HeartCart | Johannesburg, South Africa | <a href="https://heartcart.shop">heartcart.shop</a></p>
            <p>Questions? Reply to this email or contact us at sales@heartcart.shop</p>
        </div>
    </div>
</body>
</html>`,
    text: `Reset Your HeartCart Password

Hi there,

We received a request to reset your password. Visit this link to create a new password:
${resetUrl}

This link expires in 1 hour.

If you didn't request this, please ignore this email.

Stay safe,
The HeartCart Team

HeartCart | https://heartcart.shop | sales@heartcart.shop`
  };
}

function createPaymentConfirmationEmail(order) {
  return {
    subject: `Payment Received - Order ${order.orderNumber}`,
    html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Received</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #FF69B4, #9b59b6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #ddd; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }
        .button { background: linear-gradient(135deg, #FF69B4, #9b59b6); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; margin: 20px 0; font-weight: bold; }
        .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .order-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .success { color: #28a745; font-weight: bold; }
        ul { padding-left: 20px; }
        li { margin: 8px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">HeartCart</div>
            <h1>Payment Received! 💳</h1>
        </div>
        <div class="content">
            <p>Hi ${order.customerName},</p>
            <p>Great news! We've received your payment for order <strong>${order.orderNumber}</strong>.</p>
            
            <div class="order-details">
                <h3>Payment Details</h3>
                <p><strong>Amount:</strong> R ${order.totalAmount}</p>
                <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
                <p><strong>Transaction Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-ZA')}</p>
                <p class="success"><strong>Status:</strong> Confirmed ✅</p>
            </div>
            
            <p>Your order is now being prepared for shipping. You'll receive another email with tracking details once your items are dispatched.</p>
            
            <center>
                <a href="https://heartcart.shop/orders/${order.orderNumber}" class="button">View Order Details</a>
            </center>
            
            <p><strong>What happens next?</strong></p>
            <ul>
                <li>We'll prepare your order within 1-2 business days</li>
                <li>Your items will be shipped to your selected PUDO locker</li>
                <li>You'll receive tracking information via email and SMS</li>
            </ul>
            
            <p>Thank you for choosing HeartCart!</p>
            
            <p>Best regards,<br>
            The HeartCart Team</p>
        </div>
        <div class="footer">
            <p>HeartCart | Johannesburg, South Africa | <a href="https://heartcart.shop">heartcart.shop</a></p>
            <p>Questions? Reply to this email or contact us at sales@heartcart.shop</p>
        </div>
    </div>
</body>
</html>`,
    text: `Payment Received - Order ${order.orderNumber}

Hi ${order.customerName},

Great news! We've received your payment for order ${order.orderNumber}.

Payment Details:
- Amount: R ${order.totalAmount}
- Payment Method: ${order.paymentMethod}
- Status: Confirmed

Your order is being prepared for shipping. You'll receive tracking details soon.

Thank you for choosing HeartCart!

Best regards,
The HeartCart Team

HeartCart | https://heartcart.shop | sales@heartcart.shop`
  };
}

function createOrderStatusEmail(order) {
  return {
    subject: `Your Order Has Been Shipped - ${order.orderNumber}`,
    html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Shipped</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #FF69B4, #9b59b6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #ddd; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }
        .button { background: linear-gradient(135deg, #FF69B4, #9b59b6); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; margin: 20px 0; font-weight: bold; }
        .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .shipping-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        ul { padding-left: 20px; }
        li { margin: 8px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">HeartCart</div>
            <h1>Your Order Has Been Shipped! 📦</h1>
        </div>
        <div class="content">
            <p>Hi ${order.customerName},</p>
            <p>Exciting news! Your order <strong>${order.orderNumber}</strong> is on its way to you.</p>
            
            <div class="shipping-details">
                <h3>Shipping Details</h3>
                <p><strong>Tracking Number:</strong> ${order.trackingNumber}</p>
                <p><strong>Delivery Method:</strong> ${order.shippingMethod}</p>
                <p><strong>Estimated Delivery:</strong> ${order.estimatedDelivery}</p>
                <p><strong>Locker Location:</strong> ${order.selectedLockerName}</p>
                <p><strong>Locker Address:</strong> ${order.selectedLockerAddress}</p>
            </div>
            
            <p>You'll receive an SMS with your unique pickup code once your package arrives at the locker.</p>
            
            <center>
                <a href="https://heartcart.shop/track/${order.trackingNumber}" class="button">Track Your Package</a>
            </center>
            
            <p><strong>PUDO Locker Instructions:</strong></p>
            <ul>
                <li>Wait for the SMS with your pickup code</li>
                <li>Visit the locker within 5 days of arrival</li>
                <li>Enter your code on the locker keypad</li>
                <li>Collect your package</li>
            </ul>
            
            <p>Thank you for shopping with HeartCart!</p>
            
            <p>Best regards,<br>
            The HeartCart Team</p>
        </div>
        <div class="footer">
            <p>HeartCart | Johannesburg, South Africa | <a href="https://heartcart.shop">heartcart.shop</a></p>
            <p>Questions? Reply to this email or contact us at sales@heartcart.shop</p>
        </div>
    </div>
</body>
</html>`,
    text: `Your Order Has Been Shipped - ${order.orderNumber}

Hi ${order.customerName},

Your order ${order.orderNumber} is on its way!

Shipping Details:
- Tracking Number: ${order.trackingNumber}
- Delivery Method: ${order.shippingMethod}
- Estimated Delivery: ${order.estimatedDelivery}
- Locker Location: ${order.selectedLockerName}
- Locker Address: ${order.selectedLockerAddress}

You'll receive an SMS with your pickup code when it arrives.

Track your package: https://heartcart.shop/track/${order.trackingNumber}

Thank you for shopping with HeartCart!

Best regards,
The HeartCart Team

HeartCart | https://heartcart.shop | sales@heartcart.shop`
  };
}

function createInvoiceEmail(order) {
  return {
    subject: `Your HeartCart Invoice - ${order.orderNumber}`,
    html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Invoice</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #FF69B4, #9b59b6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #ddd; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }
        .button { background: linear-gradient(135deg, #FF69B4, #9b59b6); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; margin: 20px 0; font-weight: bold; }
        .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .order-summary { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .product-item { border-bottom: 1px solid #eee; padding: 10px 0; }
        .product-item:last-child { border-bottom: none; }
        .total { font-weight: bold; font-size: 18px; color: #FF69B4; }
        .attachment { background: #e3f2fd; border: 1px solid #2196F3; padding: 15px; border-radius: 5px; margin: 15px 0; }
        ul { padding-left: 20px; }
        li { margin: 8px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">HeartCart</div>
            <h1>Your HeartCart Invoice 📄</h1>
        </div>
        <div class="content">
            <p>Hi ${order.customerName},</p>
            <p>Thank you for your purchase! Please find your invoice attached for order <strong>${order.orderNumber}</strong>.</p>
            
            <div class="order-summary">
                <h3>Order Summary</h3>
                ${order.orderItems.map(item => `
                <div class="product-item">
                    <strong>${item.productName} - Size ${item.selectedAttributes.size}</strong><br>
                    Quantity: ${item.quantity} × R ${item.unitPrice} = R ${item.totalPrice}
                </div>
                `).join('')}
                <div class="product-item">
                    <strong>Shipping (${order.shippingMethod})</strong><br>
                    R ${order.shippingCost.toFixed(2)} ${order.shippingCost === 0 ? '(Free shipping over R500)' : ''}
                </div>
                <div class="product-item total">
                    <strong>Total: R ${order.totalAmount}</strong>
                </div>
            </div>
            
            <div class="attachment">
                <strong>📎 Invoice Attached:</strong> HeartCart-Invoice-${order.orderNumber}.pdf
            </div>
            
            <p>This invoice serves as your proof of purchase and can be used for returns, exchanges, or warranty claims.</p>
            
            <center>
                <a href="https://heartcart.shop/orders/${order.orderNumber}" class="button">View Full Order</a>
            </center>
            
            <p><strong>Need help?</strong></p>
            <ul>
                <li>Returns & Exchanges: Available within 30 days</li>
                <li>Warranty Support: 12 months manufacturer warranty</li>
                <li>Customer Service: sales@heartcart.shop</li>
            </ul>
            
            <p>Thank you for choosing HeartCart!</p>
            
            <p>Best regards,<br>
            The HeartCart Team</p>
        </div>
        <div class="footer">
            <p>HeartCart | Johannesburg, South Africa | <a href="https://heartcart.shop">heartcart.shop</a></p>
            <p>Questions? Reply to this email or contact us at sales@heartcart.shop</p>
            <p>Keep this email for your records. Invoice PDF attached.</p>
        </div>
    </div>
</body>
</html>`,
    text: `Your HeartCart Invoice - ${order.orderNumber}

Hi ${order.customerName},

Thank you for your purchase! Your invoice is attached for order ${order.orderNumber}.

Order Summary:
${order.orderItems.map(item => `- ${item.productName} (${item.quantity}x) = R ${item.totalPrice}`).join('\n')}
- Shipping: R ${order.shippingCost.toFixed(2)}
Total: R ${order.totalAmount}

Invoice PDF: HeartCart-Invoice-${order.orderNumber}.pdf

This serves as proof of purchase for returns and warranty claims.

View order: https://heartcart.shop/orders/${order.orderNumber}

Thank you for choosing HeartCart!

Best regards,
The HeartCart Team

HeartCart | https://heartcart.shop | sales@heartcart.shop`
  };
}

// Test function for each email type
async function sendTestEmail(emailData, type) {
  try {
    const emailParams = new EmailParams()
      .setFrom(new Sender(senderEmail, 'HeartCart'))
      .setTo([new Recipient(recipientEmail, 'Admin')])
      .setSubject(emailData.subject)
      .setHtml(emailData.html)
      .setText(emailData.text);

    console.log(`\n📧 Sending ${type} email...`);
    console.log(`📋 Subject: ${emailData.subject}`);
    console.log(`📤 From: ${senderEmail}`);
    console.log(`📥 To: ${recipientEmail}`);
    
    const response = await mailerSend.email.send(emailParams);
    
    if (response.statusCode === 202) {
      console.log(`✅ ${type} email sent successfully!`);
      return true;
    } else {
      console.log(`❌ ${type} email failed with status: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error sending ${type} email:`, {
      message: error.message,
      status: error.statusCode,
      body: error.body
    });
    return false;
  }
}

// Main test function
async function testAllEmails() {
  console.log('🚀 Testing all 5 HeartCart email scenarios...\n');
  
  if (!process.env.MAILERSEND_API_KEY) {
    console.log('❌ MAILERSEND_API_KEY environment variable not found');
    return;
  }

  const emailTests = [
    {
      type: '1. Account Verification',
      data: createAccountVerificationEmail(testData.user, testData.verificationToken)
    },
    {
      type: '2. Password Reset',
      data: createPasswordResetEmail(testData.user, testData.resetToken)
    },
    {
      type: '3. Payment Confirmation',
      data: createPaymentConfirmationEmail(testData.order)
    },
    {
      type: '4. Order Status Update (Shipped)',
      data: createOrderStatusEmail(testData.order)
    },
    {
      type: '5. Invoice Email',
      data: createInvoiceEmail(testData.order)
    }
  ];

  let successCount = 0;
  
  for (const test of emailTests) {
    const success = await sendTestEmail(test.data, test.type);
    if (success) successCount++;
    
    // Wait 1 second between emails to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n📊 Email Test Summary:`);
  console.log(`✅ Successful: ${successCount}/${emailTests.length}`);
  console.log(`📧 Recipient: ${recipientEmail}`);
  console.log(`📤 From: ${senderEmail}`);
  
  if (successCount === emailTests.length) {
    console.log(`\n🎉 All test emails sent successfully to ${recipientEmail}!`);
  } else {
    console.log(`\n⚠️  Some emails failed. Check MailerSend domain verification.`);
  }
}

// Run the test
testAllEmails().catch(console.error);