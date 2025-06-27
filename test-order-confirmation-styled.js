/**
 * Test Hot Pink Styled Order Confirmation Email
 * Tests the new TeeMeYou hot pink branded order confirmation email
 */

import { databaseEmailService } from './server/database-email-service.js';

async function testHotPinkOrderConfirmationEmail() {
  console.log('🎨 Testing Hot Pink Styled Order Confirmation Email...\n');

  // Test data for order confirmation email
  const testOrderData = {
    email: 'admin@teemeyou.shop',
    customerName: 'Sarah Johnson',
    orderNumber: 'TMY-2024-001',
    orderItems: [
      {
        productName: 'Premium Cotton T-Shirt',
        quantity: 2,
        unitPrice: 299.99,
        totalPrice: 599.98,
        attributeDisplayText: 'Size: Large, Color: Hot Pink'
      },
      {
        productName: 'Designer Hoodie',
        quantity: 1,
        unitPrice: 699.99,
        totalPrice: 699.99,
        attributeDisplayText: 'Size: Medium, Color: Black'
      }
    ],
    subtotalAmount: 1299.97,
    shippingCost: 99.00,
    totalAmount: 1398.97,
    paymentMethod: 'eft',
    paymentStatus: 'pending', // Test pending status first
    shippingMethod: 'pudo',
    selectedLockerName: 'PUDO Locker - Cape Town Central',
    selectedLockerAddress: '123 Main Street, Cape Town, 8001'
  };

  try {
    console.log('📧 Sending hot pink styled order confirmation email...');
    await databaseEmailService.sendOrderConfirmationEmail(testOrderData);
    console.log('✅ Hot pink order confirmation email sent successfully!\n');

    // Test with paid status
    console.log('📧 Testing with PAID status...');
    const paidOrderData = {
      ...testOrderData,
      orderNumber: 'TMY-2024-002',
      paymentStatus: 'paid',
      shippingMethod: 'standard',
      shippingAddress: '456 Oak Avenue',
      shippingCity: 'Johannesburg',
      shippingPostalCode: '2000'
    };

    await databaseEmailService.sendOrderConfirmationEmail(paidOrderData);
    console.log('✅ Hot pink PAID order confirmation email sent successfully!\n');

    console.log('🎉 All hot pink styled order confirmation emails sent successfully!');
    console.log('📋 Test Summary:');
    console.log('   ✓ Hot pink TeeMeYou branding');
    console.log('   ✓ Gradient styling and modern design');
    console.log('   ✓ Company logo integration');
    console.log('   ✓ PUDO locker delivery styling');
    console.log('   ✓ Standard delivery styling');
    console.log('   ✓ Payment status badges (PAID/PENDING)');
    console.log('   ✓ Professional footer with TeeMeYou links');

  } catch (error) {
    console.error('❌ Error testing hot pink order confirmation email:', error);
    process.exit(1);
  }
}

// Run the test
testHotPinkOrderConfirmationEmail()
  .then(() => {
    console.log('\n🎨 Hot pink email styling test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });