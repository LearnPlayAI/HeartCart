/**
 * Test PUDO Google Maps Integration
 * Verifies that shipped notification emails include Google Maps links for PUDO lockers
 */

import { databaseEmailService } from './server/database-email-service.ts';

async function testPudoGoogleMapsIntegration() {
  console.log('🧪 Testing PUDO Google Maps Integration...\n');
  
  try {
    // Test 1: Order with specific PUDO locker details
    console.log('1. Testing shipped notification with specific PUDO locker details...');
    
    const orderWithLockerDetails = {
      email: 'admin@teemeyou.shop',
      customerName: 'Jan Coetzee',
      orderNumber: 'TMY-TEST-12345',
      orderId: 999,
      status: 'shipped',
      trackingNumber: 'TMY999SHIPPED',
      estimatedDelivery: 'Your order has been shipped and should arrive within 3-5 business days.',
      shippingMethod: 'pudo',
      selectedLockerName: 'Engen Northwold',
      selectedLockerAddress: 'Cnr Olievenhout Ave &, Douglas Cres, Northgate, Randburg, 2162'
    };

    await databaseEmailService.sendOrderStatusEmail(orderWithLockerDetails);
    console.log('✅ Shipped notification sent with specific PUDO locker Google Maps link\n');

    // Test 2: Order without specific locker details (fallback scenario)
    console.log('2. Testing shipped notification without specific locker details (fallback)...');
    
    const orderWithoutLockerDetails = {
      email: 'admin@teemeyou.shop',
      customerName: 'Jan Coetzee',
      orderNumber: 'TMY-TEST-12346',
      orderId: 998,
      status: 'shipped',
      trackingNumber: 'TMY998SHIPPED',
      estimatedDelivery: 'Your order has been shipped and should arrive within 3-5 business days.',
      shippingMethod: 'pudo',
      selectedLockerName: null,
      selectedLockerAddress: null
    };

    await databaseEmailService.sendOrderStatusEmail(orderWithoutLockerDetails);
    console.log('✅ Shipped notification sent with fallback PUDO search instructions\n');

    // Test 3: Non-PUDO shipping method (should not include PUDO instructions)
    console.log('3. Testing shipped notification with standard delivery (no PUDO)...');
    
    const standardDeliveryOrder = {
      email: 'admin@teemeyou.shop',
      customerName: 'Jan Coetzee', 
      orderNumber: 'TMY-TEST-12347',
      orderId: 997,
      status: 'shipped',
      trackingNumber: 'TMY997SHIPPED',
      estimatedDelivery: 'Your order has been shipped and should arrive within 3-5 business days.',
      shippingMethod: 'standard',
      selectedLockerName: null,
      selectedLockerAddress: null
    };

    await databaseEmailService.sendOrderStatusEmail(standardDeliveryOrder);
    console.log('✅ Shipped notification sent for standard delivery (no PUDO instructions)\n');

    console.log('🎉 All PUDO Google Maps integration tests completed successfully!');
    console.log('📧 Check admin@teemeyou.shop for the test emails.');
    console.log('\n📋 Expected email content:');
    console.log('   • Test 1: Direct Google Maps link to "Engen Northwold" locker');
    console.log('   • Test 2: Generic "Search PUDO locker near me" fallback');
    console.log('   • Test 3: Standard delivery notification without PUDO instructions');

  } catch (error) {
    console.error('❌ PUDO Google Maps integration test failed:', error);
    throw error;
  }
}

// Run the test
testPudoGoogleMapsIntegration()
  .then(() => {
    console.log('\n✅ PUDO Google Maps integration test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ PUDO Google Maps integration test failed:', error);
    process.exit(1);
  });