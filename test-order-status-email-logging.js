/**
 * Test Order Status Email Logging
 * Verifies that order status emails are properly logged to the database
 */

import { databaseEmailService } from './server/database-email-service.js';
import { createPostgresClient } from './server/db.js';

async function testOrderStatusEmailLogging() {
  console.log('🧪 Testing Order Status Email Logging...\n');
  
  try {
    // Test order status email data
    const testEmailData = {
      email: 'customer@example.com',
      customerName: 'Test Customer',
      orderNumber: 'TMY-TEST-123',
      orderId: 999,
      status: 'shipped',
      trackingNumber: 'TRK123456',
      estimatedDelivery: '2-3 business days',
      shippingMethod: 'standard',
      selectedLockerName: null,
      selectedLockerAddress: null
    };
    
    console.log('📧 Sending test order status email...');
    console.log('Email data:', JSON.stringify(testEmailData, null, 2));
    
    // Send the email
    await databaseEmailService.sendOrderStatusEmail(testEmailData);
    console.log('✅ Email sent successfully!');
    
    // Check database for the logged email
    console.log('\n🔍 Checking database for logged email...');
    const db = createPostgresClient();
    
    const result = await db.query(`
      SELECT * FROM "emailLogs" 
      WHERE "recipientEmail" = $1 
      AND "emailType" = 'order_status'
      ORDER BY "sentAt" DESC 
      LIMIT 1
    `, [testEmailData.email]);
    
    if (result.rows.length > 0) {
      console.log('✅ Email logged successfully in database!');
      console.log('Database entry:', JSON.stringify(result.rows[0], null, 2));
    } else {
      console.log('❌ No email log found in database');
    }
    
    // Close database connection
    await db.end();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testOrderStatusEmailLogging();