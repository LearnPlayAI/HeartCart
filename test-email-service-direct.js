/**
 * Test Email Service Direct Call
 * Test the email service directly without going through the admin route
 */

const { databaseEmailService } = require('./dist/server/database-email-service.js');

async function testEmailServiceDirect() {
  console.log('🧪 Testing Email Service Direct Call...\n');
  
  try {
    // Test data similar to what the admin route would send
    const testEmailData = {
      email: 'customer@example.com',
      customerName: 'Test Customer',
      orderNumber: 'TMY-TEST-123',
      orderId: 999,
      status: 'shipped',
      trackingNumber: 'TRK123456',
      estimatedDelivery: '3-5 business days',
      shippingMethod: 'standard',
      selectedLockerName: null,
      selectedLockerAddress: null
    };
    
    console.log('📧 Sending test email with data:', JSON.stringify(testEmailData, null, 2));
    
    await databaseEmailService.sendOrderStatusEmail(testEmailData);
    
    console.log('✅ Email sent successfully!');
    console.log('📧 Check the database for the new email log entry.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testEmailServiceDirect();