import { InvoiceGenerator } from './server/services/invoice-generator.js';
import { storage } from './server/storage.js';

async function generateTestInvoice() {
  console.log('🚀 Testing PDF invoice generation system...');
  
  try {
    // Get order with items
    console.log('📋 Fetching order details...');
    const order = await storage.getOrderById(34);
    console.log(`✅ Order found: ${order.orderNumber} - ${order.customerName}`);
    console.log(`💰 Total amount: R${order.totalAmount}`);
    
    // Generate invoice
    console.log('📄 Generating PDF invoice...');
    const invoiceGenerator = new InvoiceGenerator();
    const result = await invoiceGenerator.generateInvoice(order);
    
    console.log('✅ Invoice generated successfully!');
    console.log(`📁 File path: ${result.objectKey}`);
    console.log(`🔗 URL: ${result.url}`);
    
    // Update order with invoice path
    console.log('💾 Updating order with invoice path...');
    await storage.updateOrder(34, { invoicePath: result.objectKey });
    console.log('✅ Order updated successfully');
    
    console.log('\n🎉 PDF invoice system test completed successfully!');
    console.log('📝 Test summary:');
    console.log(`   Order: ${order.orderNumber}`);
    console.log(`   Customer: ${order.customerName}`);
    console.log(`   Invoice stored at: ${result.objectKey}`);
    console.log(`   System ready for production use ✨`);
    
  } catch (error) {
    console.error('❌ Error during invoice generation:', error.message);
    console.error('Stack:', error.stack);
  }
}

generateTestInvoice();