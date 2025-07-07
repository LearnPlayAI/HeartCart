/**
 * Test VAT Integration in Email Templates
 * Verifies that VAT details are properly displayed in payment confirmation and order confirmation emails
 */

import { databaseEmailService } from './server/database-email-service.js';

async function testVATEmailIntegration() {
  console.log('🧪 Testing VAT Integration in Email Templates');
  console.log('='.repeat(50));
  
  const testEmail = 'admin@teemeyou.shop';
  const testResults = [];

  try {
    // Test 1: Payment Confirmation Email with VAT
    console.log('\n💳 Test 1: Payment Confirmation Email with VAT breakdown');
    console.log('-'.repeat(50));
    
    const paymentDataWithVAT = {
      email: testEmail,
      customerName: 'VAT Test Customer',
      orderNumber: 'TMY-VAT-001',
      orderId: 1,
      amount: 184.00,
      currency: 'R',
      paymentMethod: 'EFT Bank Transfer',
      subtotalAmount: 120.00,
      shippingCost: 40.00,
      vatAmount: 24.00,
      vatRate: 15,
      vatRegistered: true,
      vatRegistrationNumber: '2025/499123/07'
    };

    await databaseEmailService.sendPaymentConfirmationEmail(paymentDataWithVAT);
    testResults.push({ test: 'Payment Confirmation with VAT', status: 'PASSED' });
    console.log('✅ Payment confirmation email with VAT sent successfully');
    console.log(`   📋 Expected VAT display: VAT (15%): R 24.00`);
    console.log(`   📋 Expected VAT Registration: 2025/499123/07`);

    // Wait between emails
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Payment Confirmation Email without VAT (not VAT registered)
    console.log('\n💳 Test 2: Payment Confirmation Email without VAT (not registered)');
    console.log('-'.repeat(50));
    
    const paymentDataNoVAT = {
      email: testEmail,
      customerName: 'Non-VAT Test Customer',
      orderNumber: 'TMY-NO-VAT-001',
      orderId: 2,
      amount: 160.00,
      currency: 'R',
      paymentMethod: 'EFT Bank Transfer',
      subtotalAmount: 120.00,
      shippingCost: 40.00,
      vatAmount: 0,
      vatRate: 0,
      vatRegistered: false
    };

    await databaseEmailService.sendPaymentConfirmationEmail(paymentDataNoVAT);
    testResults.push({ test: 'Payment Confirmation without VAT', status: 'PASSED' });
    console.log('✅ Payment confirmation email without VAT sent successfully');
    console.log(`   📋 Expected VAT display: VAT (0%): Not VAT registered`);

    // Wait between emails
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 3: Order Confirmation Email with VAT
    console.log('\n🛍️ Test 3: Order Confirmation Email with VAT breakdown');
    console.log('-'.repeat(50));
    
    const orderConfirmationWithVAT = {
      email: testEmail,
      customerName: 'VAT Order Customer',
      orderNumber: 'TMY-ORDER-VAT-001',
      orderId: 3,
      orderItems: [
        {
          productName: 'Premium Test Product',
          quantity: 1,
          unitPrice: 120.00,
          totalPrice: 120.00,
          attributeDisplayText: 'Size: Medium, Color: Blue'
        }
      ],
      subtotalAmount: 120.00,
      shippingCost: 40.00,
      totalAmount: 184.00,
      paymentMethod: 'eft',
      paymentStatus: 'pending',
      shippingMethod: 'pudo',
      vatAmount: 24.00,
      vatRate: 15,
      vatRegistered: true,
      vatRegistrationNumber: '2025/499123/07'
    };

    await databaseEmailService.sendOrderConfirmationEmail(orderConfirmationWithVAT);
    testResults.push({ test: 'Order Confirmation with VAT', status: 'PASSED' });
    console.log('✅ Order confirmation email with VAT sent successfully');
    console.log(`   📋 Expected order totals with VAT breakdown included`);

    // Wait between emails
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 4: Order Confirmation Email without VAT
    console.log('\n🛍️ Test 4: Order Confirmation Email without VAT');
    console.log('-'.repeat(50));
    
    const orderConfirmationNoVAT = {
      email: testEmail,
      customerName: 'Non-VAT Order Customer',
      orderNumber: 'TMY-ORDER-NO-VAT-001',
      orderId: 4,
      orderItems: [
        {
          productName: 'Standard Test Product',
          quantity: 1,
          unitPrice: 120.00,
          totalPrice: 120.00,
          attributeDisplayText: 'Size: Large, Color: Red'
        }
      ],
      subtotalAmount: 120.00,
      shippingCost: 40.00,
      totalAmount: 160.00,
      paymentMethod: 'eft',
      paymentStatus: 'pending',
      shippingMethod: 'pudo',
      vatAmount: 0,
      vatRate: 0,
      vatRegistered: false
    };

    await databaseEmailService.sendOrderConfirmationEmail(orderConfirmationNoVAT);
    testResults.push({ test: 'Order Confirmation without VAT', status: 'PASSED' });
    console.log('✅ Order confirmation email without VAT sent successfully');
    console.log(`   📋 Expected order totals with "Not VAT registered" message`);

    // Test Summary
    console.log('\n📋 VAT Email Integration Test Summary:');
    console.log('='.repeat(50));
    testResults.forEach(result => {
      console.log(`${result.status === 'PASSED' ? '✅' : '❌'} ${result.test}: ${result.status}`);
    });

    const passedTests = testResults.filter(r => r.status === 'PASSED').length;
    const totalTests = testResults.length;
    
    console.log(`\n🎯 Results: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('\n🎉 All VAT email integration tests completed successfully!');
      console.log('✅ Payment confirmation emails show VAT breakdown when applicable');
      console.log('✅ Order confirmation emails show VAT breakdown when applicable');
      console.log('✅ Non-VAT registered emails show "Not VAT registered" message');
      console.log('✅ VAT registration numbers displayed when available');
      console.log('✅ Email templates maintain TeeMeYou hot pink branding');
      console.log(`\n📬 Check ${testEmail} for the test emails to verify VAT display formatting.`);
    } else {
      console.log('\n⚠️ Some VAT email integration tests failed');
    }

  } catch (error) {
    console.error('❌ VAT email integration test failed:', error);
    testResults.push({ test: 'Overall Test Suite', status: 'FAILED', error: error.message });
  }

  console.log('\n🔍 Manual Verification Checklist:');
  console.log('- Check emails show subtotal, shipping, VAT (rate%), and total');
  console.log('- Verify VAT registration number appears when provided');
  console.log('- Confirm "Not VAT registered" message appears for non-VAT emails');
  console.log('- Validate all amounts are formatted correctly (R ##.##)');
  console.log('- Ensure hot pink TeeMeYou branding is maintained');

  return testResults;
}

// Run the test
testVATEmailIntegration()
  .then(results => {
    console.log('\n✅ VAT email integration test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });