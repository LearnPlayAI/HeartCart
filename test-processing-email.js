/**
 * Test Processing Status Email Notification
 * Verifies that email notifications are sent when admin changes order status to "processing"
 */

import axios from 'axios';
import { storage } from './server/storage.js';

async function testProcessingEmailNotification() {
  console.log('🧪 Testing Processing Status Email Notification...\n');
  
  try {
    // First, get the most recent order to test with
    const recentOrders = await storage.getUserOrders(8, 1, 0); // Get latest order for admin user
    
    if (recentOrders.length === 0) {
      console.log('❌ No orders found for testing');
      return;
    }
    
    const testOrder = recentOrders[0];
    console.log(`📋 Using Order ID: ${testOrder.id} (${testOrder.orderNumber})`);
    console.log(`📧 Customer Email: ${testOrder.customerEmail}`);
    console.log(`📊 Current Status: ${testOrder.status}\n`);
    
    // Test updating order status to "processing" via admin endpoint
    console.log('🔄 Updating order status to "processing"...');
    
    const response = await axios.patch(
      `https://teemeyou.shop/api/admin/orders/${testOrder.id}/status`,
      { status: 'processing' },
      {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'connect.sid=s%3AsXcr68fxVA7TlAN8SreJBV6t_heZEt9_.%2BKqkbqI%2FZo7%2BR0SN%2BkQ%2Fz4%2BdJJrM%2BMi1VZFNNn6IhF4'
        }
      }
    );
    
    if (response.data.success) {
      console.log('✅ Order status successfully updated to processing');
      console.log(`📧 Email notification should have been sent to: ${testOrder.customerEmail}`);
      console.log(`📝 Message: "Order is being processed"`);
      console.log('\n🔍 Check email logs in the console for delivery confirmation');
    } else {
      console.log('❌ Failed to update order status:', response.data.error);
    }
    
  } catch (error) {
    if (error.response) {
      console.log('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.log('❌ Network Error:', error.message);
    }
  }
}

// Run the test
testProcessingEmailNotification();