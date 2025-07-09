/**
 * Test Admin Order Status Email Logging
 * Tests the complete flow: admin changes order status → email sent → database logging
 */

const axios = require('axios');
const { Client } = require('pg');

const API_BASE = 'http://localhost:5000';

async function testAdminOrderStatusEmailFlow() {
  console.log('🧪 Testing Admin Order Status Email Flow...\n');
  
  try {
    // First, let's check the current emailLogs count
    const db = new Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();
    
    const beforeResult = await db.query('SELECT COUNT(*) FROM "emailLogs"');
    const beforeCount = parseInt(beforeResult.rows[0].count);
    console.log(`📊 Current emailLogs count: ${beforeCount}`);
    
    // Get the first order to test with
    const ordersResponse = await axios.get(`${API_BASE}/api/admin/orders`);
    if (!ordersResponse.data.success || ordersResponse.data.data.length === 0) {
      console.log('❌ No orders found to test with');
      return;
    }
    
    const testOrder = ordersResponse.data.data[0];
    console.log(`📦 Testing with order: ${testOrder.orderNumber} (ID: ${testOrder.id})`);
    console.log(`📧 Customer email: ${testOrder.customerEmail}`);
    
    // Change order status to "shipped" to trigger email
    console.log('\n🔄 Changing order status to "shipped"...');
    const statusResponse = await axios.patch(`${API_BASE}/api/admin/orders/${testOrder.id}/status`, {
      status: 'shipped'
    });
    
    if (statusResponse.data.success) {
      console.log('✅ Order status updated successfully');
      
      // Wait a moment for the email to be sent and logged
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if email was logged
      const afterResult = await db.query('SELECT COUNT(*) FROM "emailLogs"');
      const afterCount = parseInt(afterResult.rows[0].count);
      console.log(`📊 New emailLogs count: ${afterCount}`);
      
      if (afterCount > beforeCount) {
        console.log('✅ Email was logged to database!');
        
        // Get the latest email log entry
        const latestLog = await db.query(`
          SELECT * FROM "emailLogs" 
          WHERE "recipientEmail" = $1 
          AND "emailType" = 'order_status'
          ORDER BY "sentAt" DESC 
          LIMIT 1
        `, [testOrder.customerEmail]);
        
        if (latestLog.rows.length > 0) {
          console.log('📧 Latest email log entry:');
          console.log(JSON.stringify(latestLog.rows[0], null, 2));
        }
      } else {
        console.log('❌ No new email log entries found');
      }
      
    } else {
      console.log('❌ Failed to update order status');
    }
    
    await db.end();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testAdminOrderStatusEmailFlow();