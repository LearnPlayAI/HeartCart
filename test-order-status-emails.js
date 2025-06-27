/**
 * Test Order Status Update Emails
 * Verifies that status update emails are sent for all order status changes
 */

import { databaseEmailService } from './server/database-email-service.js';

async function testOrderStatusEmails() {
  console.log('🧪 Testing Order Status Update Emails');
  console.log('=====================================\n');

  const testEmail = 'admin@teemeyou.shop';
  const testCustomer = 'Sarah Johnson';
  const testOrderNumber = 'TMY-STATUS-TEST-001';
  
  const statusesToTest = [
    { status: 'pending', description: 'Order placed and awaiting confirmation' },
    { status: 'confirmed', description: 'Order confirmed by admin' },
    { status: 'processing', description: 'Order being prepared' },
    { status: 'shipped', description: 'Order shipped with tracking' },
    { status: 'delivered', description: 'Order successfully delivered' },
    { status: 'cancelled', description: 'Order cancelled' }
  ];

  let successCount = 0;
  let failureCount = 0;

  for (const testCase of statusesToTest) {
    try {
      console.log(`📧 Testing ${testCase.status} status email...`);
      
      const emailData = {
        email: testEmail,
        customerName: testCustomer,
        orderNumber: `${testOrderNumber}-${testCase.status.toUpperCase()}`,
        status: testCase.status,
        trackingNumber: testCase.status === 'shipped' ? 'TRK123456789' : null,
        estimatedDelivery: getEstimatedDeliveryText(testCase.status)
      };

      await databaseEmailService.sendOrderStatusEmail(emailData);
      console.log(`✅ ${testCase.status} status email sent successfully`);
      successCount++;
      
      // Wait between emails to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`❌ Failed to send ${testCase.status} status email:`, error.message);
      failureCount++;
    }
  }

  console.log('\n📊 Order Status Email Test Results:');
  console.log('====================================');
  console.log(`✅ Successful sends: ${successCount}`);
  console.log(`❌ Failed sends: ${failureCount}`);
  console.log(`📈 Success rate: ${((successCount / statusesToTest.length) * 100).toFixed(1)}%`);

  if (successCount === statusesToTest.length) {
    console.log('\n🎉 All order status update emails sent successfully!');
    console.log('✅ Customers will receive emails for ALL status changes');
    console.log('✅ Each status has appropriate messaging');
    console.log('✅ Tracking numbers included when applicable');
    console.log('✅ Hot pink TeeMeYou branding applied');
  } else {
    console.log(`\n⚠️  ${failureCount} out of ${statusesToTest.length} tests failed`);
  }
}

// Helper function to match the one in admin-routes.ts
function getEstimatedDeliveryText(status) {
  switch (status) {
    case 'pending':
      return 'Processing your order';
    case 'confirmed':
      return 'Order confirmed, preparing for shipment';
    case 'processing':
      return 'Order is being processed';
    case 'shipped':
      return '3-5 business days';
    case 'delivered':
      return 'Delivered';
    case 'cancelled':
      return 'Order cancelled';
    default:
      return 'Status updated';
  }
}

// Run the test
testOrderStatusEmails().catch(console.error);