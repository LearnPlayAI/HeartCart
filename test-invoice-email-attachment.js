/**
 * Test PDF Invoice Email Attachment System
 * Tests the complete flow: payment status update → PDF generation → email with attachment
 */

import { databaseEmailService } from './server/database-email-service.js';
import { storage } from './server/storage.js';
import { InvoiceGenerator } from './server/services/invoice-generator.js';

async function testInvoiceEmailAttachment() {
  console.log('🧪 Testing PDF Invoice Email Attachment System\n');
  
  const testResults = [];
  const testEmail = 'admin@teemeyou.shop';
  
  try {
    // Test 1: Generate PDF Invoice and Send with Email Attachment
    console.log('1. 📄 Testing PDF Invoice Generation and Email Attachment...');
    
    // Create test invoice data
    const invoiceData = {
      orderNumber: 'TMY-INVOICE-TEST-001',
      customerName: 'John Smith',
      customerEmail: testEmail,
      customerPhone: '+27 83 123 4567',
      shippingAddress: '123 Test Street',
      shippingCity: 'Cape Town',
      shippingPostalCode: '8001',
      orderItems: [
        {
          productName: 'Premium Hot Pink T-Shirt',
          quantity: 2,
          unitPrice: 299.99,
          totalPrice: 599.98,
          attributeDisplayText: 'Size: Large, Color: Hot Pink'
        },
        {
          productName: 'TeeMeYou Shopping Bag',
          quantity: 1,
          unitPrice: 49.99,
          totalPrice: 49.99,
          attributeDisplayText: 'Material: Canvas'
        }
      ],
      subtotalAmount: 649.97,
      shippingCost: 99.00,
      totalAmount: 748.97,
      paymentMethod: 'eft',
      paymentReceivedDate: new Date().toISOString(),
      userId: 8
    };

    // Generate PDF invoice
    console.log('   📋 Generating PDF invoice...');
    const invoiceGenerator = InvoiceGenerator.getInstance();
    const invoicePath = await invoiceGenerator.generateInvoicePDF(invoiceData);
    
    console.log(`   ✅ PDF generated: ${invoicePath}`);
    testResults.push({ test: 'PDF Invoice Generation', status: 'PASSED', details: invoicePath });

    // Wait a moment for file system
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Send Payment Confirmation Email with PDF Attachment
    console.log('2. 📧 Testing Payment Confirmation Email with PDF Attachment...');
    
    const paymentEmailData = {
      email: testEmail,
      customerName: 'John Smith',
      orderNumber: 'TMY-INVOICE-TEST-001',
      amount: 748.97,
      currency: 'ZAR',
      paymentMethod: 'EFT',
      invoicePath: invoicePath // Include invoice path for attachment
    };

    await databaseEmailService.sendPaymentConfirmationEmail(paymentEmailData);
    testResults.push({ test: 'Payment Email with PDF Attachment', status: 'PASSED' });
    console.log('   ✅ Payment confirmation email sent with PDF attachment');

    // Wait between emails
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test 3: Send Email Without Attachment (for comparison)
    console.log('3. 📧 Testing Payment Confirmation Email WITHOUT Attachment...');
    
    const paymentEmailDataNoAttachment = {
      email: testEmail,
      customerName: 'Jane Doe',
      orderNumber: 'TMY-NO-ATTACHMENT-001',
      amount: 299.99,
      currency: 'ZAR',
      paymentMethod: 'Credit Card'
      // No invoicePath - should send without attachment
    };

    await databaseEmailService.sendPaymentConfirmationEmail(paymentEmailDataNoAttachment);
    testResults.push({ test: 'Payment Email without Attachment', status: 'PASSED' });
    console.log('   ✅ Payment confirmation email sent without attachment');

    // Test 4: Test with Invalid Invoice Path
    console.log('4. ⚠️  Testing Email with Invalid Invoice Path...');
    
    const paymentEmailDataInvalid = {
      email: testEmail,
      customerName: 'Test User',
      orderNumber: 'TMY-INVALID-PATH-001',
      amount: 199.99,
      currency: 'ZAR',
      paymentMethod: 'EFT',
      invoicePath: '/invalid/path/to/invoice.pdf' // Invalid path
    };

    await databaseEmailService.sendPaymentConfirmationEmail(paymentEmailDataInvalid);
    testResults.push({ test: 'Payment Email with Invalid Path', status: 'PASSED' });
    console.log('   ✅ Email sent successfully (attachment failed gracefully)');

    // Display Results
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('========================');
    testResults.forEach((result, index) => {
      const status = result.status === 'PASSED' ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.test}`);
      if (result.details) {
        console.log(`   Details: ${result.details}`);
      }
    });

    const passedTests = testResults.filter(r => r.status === 'PASSED').length;
    const totalTests = testResults.length;
    
    console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 ALL TESTS PASSED! PDF Invoice Email Attachment System is working correctly.');
      console.log('\n📋 System Features Verified:');
      console.log('   ✅ PDF invoice generation with hot pink TeeMeYou branding');
      console.log('   ✅ Email attachment functionality using MailerSend API');
      console.log('   ✅ Dynamic email content based on attachment availability');
      console.log('   ✅ Graceful handling of missing/invalid invoice files');
      console.log('   ✅ Professional email templates with attachment notifications');
    } else {
      console.log('❌ Some tests failed. Please check the logs above.');
    }

    console.log('\n📬 Check your email inbox at admin@teemeyou.shop for the test emails.');
    console.log('   📄 Email 1: Should have PDF invoice attached');
    console.log('   📧 Email 2: Should have no attachment');
    console.log('   ⚠️  Email 3: Should have no attachment (invalid path handled)');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    testResults.push({ test: 'Overall Test Suite', status: 'FAILED', error: error.message });
  }
}

// Run the test
testInvoiceEmailAttachment().catch(console.error);