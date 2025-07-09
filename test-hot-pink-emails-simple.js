/**
 * Simple Hot Pink Email Template Test
 * Tests all email templates without database dependencies
 */

import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';
import { Client } from 'pg';

async function testHotPinkEmailsSimple() {
  console.log('🧪 Testing Hot Pink Email Templates...\n');
  
  try {
    // Check if MAILERSEND_API_KEY is available
    if (!process.env.MAILERSEND_API_KEY) {
      console.log('❌ MAILERSEND_API_KEY is not set');
      return;
    }
    
    const mailerSend = new MailerSend({
      apiKey: process.env.MAILERSEND_API_KEY,
    });
    
    const sender = new Sender('sales@teemeyou.shop', 'TeeMeYou Sales');
    
    // Test order status email (the one that's not working)
    console.log('📧 Testing order status email...');
    
    const orderStatusEmailParams = new EmailParams()
      .setFrom(sender)
      .setTo([new Recipient('admin@teemeyou.shop', 'Test Admin')])
      .setSubject('Order Update - TMY-TEST-12345')
      .setSettings({
        track_clicks: false,
        track_opens: true
      })
      .setHtml(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Update - TeeMeYou</title>
        </head>
        <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #F3F4F6 0%, #FFFFFF 100%); font-family: 'Segoe UI', Arial, sans-serif;">
          <div class="container" style="max-width: 600px; margin: 20px auto; background: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(255, 105, 180, 0.2);">
            <!-- Header -->
            <div class="header" style="background: linear-gradient(135deg, #FF69B4 0%, #E91E63 100%); padding: 40px; text-align: center; position: relative;">
              <div style="position: absolute; top: 0; left: 0; width: 100%; height: 6px; background: linear-gradient(90deg, #FF69B4 0%, #FF1493 50%, #E91E63 100%);"></div>
              <div style="display: inline-block; background: #FFFFFF; padding: 12px; border-radius: 50%; margin-bottom: 15px; box-shadow: 0 4px 12px rgba(255, 105, 180, 0.3);">
                <span style="font-size: 28px; color: #FF69B4;">📦</span>
              </div>
              <h1 style="color: #FFFFFF; margin: 0; font-size: 36px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.3); letter-spacing: 1px;">TeeMeYou</h1>
              <p style="color: #FFFFFF; margin: 8px 0 0 0; font-size: 18px; opacity: 0.9;">Order Update</p>
            </div>
            
            <div style="background: #FFFFFF; padding: 40px; border-radius: 0 0 12px 12px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="display: inline-block; background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); padding: 12px; border-radius: 50%; margin-bottom: 15px;">
                  <span style="font-size: 32px; color: #FFFFFF;">🚚</span>
                </div>
                <h2 style="color: #E91E63; margin: 0; font-size: 28px; font-weight: 600;">Hello Test Customer!</h2>
              </div>
              
              <div style="background: linear-gradient(135deg, #FFF0F6 0%, #FFFFFF 100%); padding: 25px; border-radius: 12px; border: 2px solid #FF69B4; margin: 25px 0; text-align: center; box-shadow: 0 4px 12px rgba(255, 105, 180, 0.1);">
                <p style="font-size: 16px; line-height: 1.6; color: #4A5568; margin-bottom: 15px;">
                  Your order <strong style="color: #E91E63;">TMY-TEST-12345</strong> status has been updated to:
                </p>
                <div style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #FFFFFF; padding: 12px 24px; border-radius: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                  SHIPPED
                </div>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://teemeyou.shop/order/123" 
                   style="background: linear-gradient(135deg, #FF69B4 0%, #E91E63 100%); 
                          color: white; 
                          padding: 16px 32px; 
                          text-decoration: none; 
                          border-radius: 8px; 
                          font-weight: 600; 
                          font-size: 16px; 
                          display: inline-block;
                          box-shadow: 0 4px 15px rgba(255, 105, 180, 0.4);
                          text-transform: uppercase;
                          letter-spacing: 0.5px;">
                  📋 View Order Details
                </a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `);
    
    await mailerSend.email.send(orderStatusEmailParams);
    console.log('✅ Order status email sent successfully!');
    
    // Now check if we can log this to the database
    console.log('\n📊 Now testing database logging...');
    
    const db = new Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();
    
    // Test database logging by inserting a test log entry
    const emailLogData = {
      userId: null,
      recipientEmail: 'admin@teemeyou.shop',
      emailType: 'order_status',
      templateId: null,
      subject: 'Order Update - TMY-TEST-12345',
      sentAt: new Date().toISOString(),
      deliveryStatus: 'sent',
      errorMessage: null,
      mailerSendId: null,
      metadata: null
    };
    
    const insertResult = await db.query(`
      INSERT INTO "emailLogs" ("userId", "recipientEmail", "emailType", "templateId", "subject", "sentAt", "deliveryStatus", "errorMessage", "mailerSendId", "metadata")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      emailLogData.userId,
      emailLogData.recipientEmail,
      emailLogData.emailType,
      emailLogData.templateId,
      emailLogData.subject,
      emailLogData.sentAt,
      emailLogData.deliveryStatus,
      emailLogData.errorMessage,
      emailLogData.mailerSendId,
      emailLogData.metadata
    ]);
    
    console.log('✅ Database logging successful! Log ID:', insertResult.rows[0].id);
    
    // Check the current count of order_status emails
    const countResult = await db.query('SELECT COUNT(*) FROM "emailLogs" WHERE "emailType" = \'order_status\'');
    console.log(`📧 Total order_status emails in database: ${countResult.rows[0].count}`);
    
    await db.end();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

// Run the test
testHotPinkEmailsSimple();