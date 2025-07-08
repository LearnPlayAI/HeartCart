/**
 * Specific Test: Invoice Attachment Fix for YoCo Webhooks
 * Tests the exact sendPaymentConfirmationEmail pattern that works in EFT admin flow
 */

import { databaseEmailService } from './server/database-email-service.js';

async function testInvoiceAttachmentFix() {
  console.log('🔧 Testing YoCo Invoice Attachment Fix');
  console.log('=====================================');
  console.log('');

  try {
    // Test the exact same email pattern as EFT admin payment_received flow
    console.log('📧 Sending payment confirmation email with invoice attachment...');
    
    const emailData = {
      email: 'admin@teemeyou.shop',
      customerName: 'YoCo Test Customer',
      orderNumber: 'TMY-YOCO-INVOICE-001',
      orderId: 999,
      amount: 499.99,
      currency: 'R',
      paymentMethod: 'card',
      invoicePath: '/Invoices/2025/999/TMY-YOCO-INVOICE-001.pdf' // Mock invoice path
    };

    console.log('   Email Data (EFT Admin Pattern):');
    console.log(`   • Email: ${emailData.email}`);
    console.log(`   • Customer: ${emailData.customerName}`);
    console.log(`   • Order Number: ${emailData.orderNumber}`);
    console.log(`   • Order ID: ${emailData.orderId}`);
    console.log(`   • Amount: ${emailData.currency}${emailData.amount}`);
    console.log(`   • Payment Method: ${emailData.paymentMethod}`);
    console.log(`   • Invoice Path: ${emailData.invoicePath}`);
    console.log('');

    await databaseEmailService.sendPaymentConfirmationEmail(emailData);
    
    console.log('✅ SUCCESS: Payment confirmation email sent using EFT admin pattern');
    console.log('');
    console.log('💡 Key Fix Applied:');
    console.log('   • YoCo webhook now uses sendPaymentConfirmationEmail (same as EFT admin)');
    console.log('   • Email data structure matches working EFT payment_received flow');
    console.log('   • Invoice attachment should work correctly for card payments');
    console.log('');
    console.log('🔍 Check email for:');
    console.log('   • PDF invoice attachment (if invoicePath exists)');
    console.log('   • Hot pink TeeMeYou branding');
    console.log('   • Payment confirmation details');
    console.log('   • Working order detail links');

  } catch (error) {
    console.error('❌ FAILED: Invoice attachment test failed');
    console.error('   Error:', error.message);
    console.log('');
    console.log('🔧 Fix may be needed in:');
    console.log('   • server/yoco-webhook-routes.ts email pattern');
    console.log('   • server/database-email-service.ts sendPaymentConfirmationEmail method');
    console.log('   • Invoice path generation or object storage');
  }
}

testInvoiceAttachmentFix();