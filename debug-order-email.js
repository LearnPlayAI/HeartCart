/**
 * Debug Order Email Data
 * Direct test to see what data structure is being passed to email service
 */

import { storage } from './server/storage.js';
import { databaseEmailService } from './server/database-email-service.js';

async function debugOrderEmailData() {
  console.log('🔍 Debugging Order Email Data Structure...\n');
  
  try {
    // Get the most recent order to understand data structure
    const recentOrders = await storage.getUserOrders(8, 1, 0); // Get latest order for admin user
    
    if (recentOrders.length === 0) {
      console.log('❌ No orders found for debugging');
      return;
    }
    
    const latestOrder = recentOrders[0];
    console.log('📋 Latest Order Structure:');
    console.log(JSON.stringify(latestOrder, null, 2));
    
    console.log('\n🔑 Key Fields:');
    console.log(`ID: ${latestOrder.id} (type: ${typeof latestOrder.id})`);
    console.log(`Order Number: ${latestOrder.orderNumber} (type: ${typeof latestOrder.orderNumber})`);
    console.log(`User ID: ${latestOrder.userId} (type: ${typeof latestOrder.userId})`);
    
    // Test email data structure
    const testEmailData = {
      email: 'admin@teemeyou.shop',
      customerName: 'Debug Test',
      orderNumber: latestOrder.orderNumber,
      orderId: latestOrder.id,
      orderItems: [{
        productName: 'Test Product',
        quantity: 1,
        unitPrice: 100,
        totalPrice: 100,
        attributeDisplayText: ''
      }],
      subtotalAmount: 100,
      shippingCost: 85,
      totalAmount: 185,
      paymentMethod: 'eft',
      paymentStatus: 'pending',
      shippingMethod: 'pudo',
      selectedLockerName: 'Test Locker',
      selectedLockerAddress: 'Test Address',
      shippingAddress: 'Test Address',
      shippingCity: 'Test City',
      shippingPostalCode: '1234'
    };
    
    console.log('\n📧 Test Email Data Structure:');
    console.log(JSON.stringify(testEmailData, null, 2));
    
    console.log('\n🎯 URL Generation Test:');
    console.log(`Expected URL: https://teemeyou.shop/order/${testEmailData.orderId}`);
    console.log(`Template interpolation: ${'https://teemeyou.shop/order/' + testEmailData.orderId}`);
    
    // Test the actual email template interpolation
    const testHtmlSnippet = `<a href="https://teemeyou.shop/order/${testEmailData.orderId}">View Order</a>`;
    const testPlainSnippet = `Track your order: https://teemeyou.shop/order/${testEmailData.orderId}`;
    
    console.log('\n🌐 Template Output:');
    console.log(`HTML: ${testHtmlSnippet}`);
    console.log(`Plain: ${testPlainSnippet}`);
    
  } catch (error) {
    console.error('❌ Error debugging order email data:', error);
  }
}

// Run the debug
debugOrderEmailData();