/**
 * Test Email Delivery System
 * Direct test of the email service to verify order status emails are working
 */

// Import the database email service
const path = require('path');
const { databaseEmailService } = require('./server/database-email-service');

async function testEmailDelivery() {
  console.log('\n=== Testing Email Delivery System ===');
  
  try {
    // Test order status email data
    const testEmailData = {
      email: 'admin@teemeyou.shop', // Send to admin email for testing
      customerName: 'Test Customer',
      orderNumber: 'TMY-TEST-001',
      orderId: 999,
      status: 'shipped',
      trackingNumber: 'https://test-tracking-url.com/track/123456',
      estimatedDelivery: '3-5 business days',
      shippingMethod: 'pudo',
      selectedLockerName: 'Test PUDO Locker',
      selectedLockerAddress: 'Test Address, Test City, 1234'
    };
    
    console.log('Test email data:', testEmailData);
    console.log('\nSending order status email...');
    
    // Send the email
    await databaseEmailService.sendOrderStatusEmail(testEmailData);
    
    console.log('✅ Email sent successfully!');
    console.log('Check your inbox (and spam folder) for the email');
    
  } catch (error) {
    console.error('❌ Email test failed:', error);
    
    // Check if it's an authentication error
    if (error.message && error.message.includes('401')) {
      console.error('Authentication error - check MAILERSEND_API_KEY');
    }
    
    // Check if it's a rate limit error
    if (error.message && error.message.includes('429')) {
      console.error('Rate limit error - wait before retrying');
    }
    
    // Check if it's a validation error
    if (error.message && error.message.includes('422')) {
      console.error('Validation error - check email format and data');
    }
  }
}

// Run the test
testEmailDelivery();