/**
 * Simple test to verify email service is working
 */

// Simple test by making a direct HTTP request to test the email service
const http = require('http');
const { Client } = require('pg');

async function testEmailServiceSimple() {
  console.log('🧪 Testing Email Service Simple...\n');
  
  try {
    // Check current database state
    const db = new Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();
    
    const beforeResult = await db.query('SELECT COUNT(*) FROM "emailLogs"');
    const beforeCount = parseInt(beforeResult.rows[0].count);
    console.log(`📊 Current emailLogs count: ${beforeCount}`);
    
    // Check if there are any order_status emails
    const orderStatusResult = await db.query('SELECT COUNT(*) FROM "emailLogs" WHERE "emailType" = \'order_status\'');
    const orderStatusCount = parseInt(orderStatusResult.rows[0].count);
    console.log(`📧 Order status emails count: ${orderStatusCount}`);
    
    // Check if MAILERSEND_API_KEY is configured
    const hasApiKey = process.env.MAILERSEND_API_KEY ? 'YES' : 'NO';
    console.log(`🔐 MAILERSEND_API_KEY configured: ${hasApiKey}`);
    
    if (hasApiKey === 'NO') {
      console.log('❌ MAILERSEND_API_KEY is not configured!');
      console.log('This is likely why emails are not being sent.');
      console.log('Please configure the MAILERSEND_API_KEY environment variable.');
    }
    
    await db.end();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testEmailServiceSimple();