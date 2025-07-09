/**
 * Debug email service to identify the issue
 */

const { Client } = require('pg');

async function debugEmailService() {
  console.log('🔍 Debugging Email Service...\n');
  
  try {
    const db = new Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();
    
    // Check if there are any recent logs that might indicate email sending attempts
    console.log('📋 Checking recent server logs...');
    
    // Check if there are any error logs in the database
    const errorLogsResult = await db.query('SELECT * FROM "emailLogs" WHERE "deliveryStatus" = \'failed\' ORDER BY "sentAt" DESC LIMIT 5');
    console.log(`❌ Failed emails count: ${errorLogsResult.rows.length}`);
    
    if (errorLogsResult.rows.length > 0) {
      console.log('Failed emails:');
      errorLogsResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.emailType} to ${row.recipientEmail} - Error: ${row.errorMessage}`);
      });
    }
    
    // Check if there are any successful emails
    const successLogsResult = await db.query('SELECT * FROM "emailLogs" WHERE "deliveryStatus" = \'sent\' ORDER BY "sentAt" DESC LIMIT 5');
    console.log(`✅ Successful emails count: ${successLogsResult.rows.length}`);
    
    if (successLogsResult.rows.length > 0) {
      console.log('Recent successful emails:');
      successLogsResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.emailType} to ${row.recipientEmail} at ${row.sentAt}`);
      });
    }
    
    // Check if there are any orders that have been updated to shipped or delivered
    const shippedOrdersResult = await db.query('SELECT id, "orderNumber", "customerEmail", status FROM orders WHERE status IN (\'shipped\', \'delivered\') ORDER BY "updatedAt" DESC LIMIT 3');
    console.log(`📦 Orders with shipped/delivered status: ${shippedOrdersResult.rows.length}`);
    
    if (shippedOrdersResult.rows.length > 0) {
      console.log('Orders that should have triggered emails:');
      shippedOrdersResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. Order ${row.orderNumber} (${row.customerEmail}) - Status: ${row.status}`);
      });
    }
    
    // Check for any order status history that might indicate recent status changes
    const statusHistoryResult = await db.query('SELECT * FROM "orderStatusHistory" WHERE status IN (\'shipped\', \'delivered\') ORDER BY "createdAt" DESC LIMIT 5');
    console.log(`📊 Recent status changes to shipped/delivered: ${statusHistoryResult.rows.length}`);
    
    await db.end();
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

// Run the debug
debugEmailService();