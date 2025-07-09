/**
 * Test Order Status Email Logging
 * Verifies that order status emails are properly logged to the database
 */

const { Client } = require('pg');
const { MailerSend, EmailParams, Sender, Recipient } = require('mailersend');

async function testOrderStatusEmailLogging() {
  console.log('🧪 Testing Order Status Email Logging...\n');
  
  try {
    const db = new Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();
    
    // Get order TMY-18 details
    const orderResult = await db.query('SELECT * FROM orders WHERE "orderNumber" = $1', ['TMY-18-20250707']);
    
    if (orderResult.rows.length === 0) {
      console.log('❌ Order TMY-18-20250707 not found');
      return;
    }
    
    const order = orderResult.rows[0];
    console.log(`📦 Found order: ${order.orderNumber}`);
    console.log(`👤 Customer: ${order.customerName} (${order.customerEmail})`);
    console.log(`📋 Status: ${order.status}`);
    
    // Check current email logs count
    const beforeCount = await db.query('SELECT COUNT(*) FROM "emailLogs" WHERE "emailType" = \'order_status\'');
    console.log(`📊 Current order_status emails in database: ${beforeCount.rows[0].count}`);
    
    // Send order status email to admin@teemeyou.shop
    console.log('\n📧 Sending order status email to admin@teemeyou.shop...');
    
    const mailerSend = new MailerSend({
      apiKey: process.env.MAILERSEND_API_KEY,
    });
    
    const sender = new Sender('sales@teemeyou.shop', 'TeeMeYou Sales');
    
    const emailParams = new EmailParams()
      .setFrom(sender)
      .setTo([new Recipient('admin@teemeyou.shop', 'Admin')])
      .setSubject(`Order Update - ${order.orderNumber}`)
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
              <h2 style="color: #E91E63; margin: 0; font-size: 28px; font-weight: 600;">Hello ${order.customerName}!</h2>
            </div>
            
            <div style="background: linear-gradient(135deg, #FFF0F6 0%, #FFFFFF 100%); padding: 25px; border-radius: 12px; border: 2px solid #FF69B4; margin: 25px 0; text-align: center; box-shadow: 0 4px 12px rgba(255, 105, 180, 0.1);">
              <p style="font-size: 16px; line-height: 1.6; color: #4A5568; margin-bottom: 15px;">
                Your order <strong style="color: #E91E63;">${order.orderNumber}</strong> status has been updated to:
              </p>
              <div style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #FFFFFF; padding: 12px 24px; border-radius: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                ${order.status.toUpperCase()}
              </div>
            </div>
            
            ${order.trackingNumber ? `
              <div style="background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%); border: 2px solid #3B82F6; padding: 25px; border-radius: 12px; margin: 25px 0; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);">
                <div style="display: flex; align-items: center; margin-bottom: 10px;">
                  <span style="font-size: 20px; margin-right: 10px;">🔍</span>
                  <p style="margin: 0; font-weight: bold; color: #1E40AF;">Tracking Information</p>
                </div>
                <p style="margin: 0; font-size: 18px; color: #1E40AF; font-weight: bold; word-break: break-all;">${order.trackingNumber}</p>
              </div>
            ` : ''}
            
            <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); border: 2px solid #F59E0B; padding: 20px; border-radius: 12px; margin: 25px 0; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);">
              <p style="margin: 0; color: #92400E; font-weight: bold; display: flex; align-items: center;">
                <span style="font-size: 18px; margin-right: 8px;">📅</span>
                Estimated Delivery: 3-5 business days
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://teemeyou.shop/order/${order.id}" 
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
            
            <hr style="border: none; border-top: 2px solid #FF69B4; margin: 30px 0; opacity: 0.3;">
            
            <!-- Footer -->
            <div style="background: #4A5568; padding: 25px; text-align: center; border-radius: 12px; margin: 25px 0;">
              <div style="margin-bottom: 15px;">
                <span style="display: inline-block; background: #FFFFFF; padding: 8px 12px; border-radius: 20px; margin: 0 5px; box-shadow: 0 2px 8px rgba(255, 105, 180, 0.2);">
                  <span style="font-size: 16px; color: #FF69B4;">🛍️</span>
                </span>
              </div>
              <p style="color: #FFFFFF; margin: 0; font-size: 14px; font-weight: 500;">
                © 2024 TeeMeYou • South Africa's Premium Shopping Platform
              </p>
              <p style="color: #CBD5E0; margin: 8px 0 0 0; font-size: 12px;">
                <a href="https://teemeyou.shop" style="color: #FF69B4; text-decoration: none;">teemeyou.shop</a> | 
                <a href="mailto:sales@teemeyou.shop" style="color: #FF69B4; text-decoration: none;">sales@teemeyou.shop</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `);
    
    await mailerSend.email.send(emailParams);
    
    // Now log it to database
    const emailLogData = {
      userId: null,
      recipientEmail: 'admin@teemeyou.shop',
      emailType: 'order_status',
      templateId: null,
      subject: `Order Update - ${order.orderNumber}`,
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
    
    console.log('✅ Order status email sent successfully to admin@teemeyou.shop');
    console.log('✅ Email logged to database with ID:', insertResult.rows[0].id);
    
    // Check final count
    const afterCount = await db.query('SELECT COUNT(*) FROM "emailLogs" WHERE "emailType" = \'order_status\'');
    console.log(`📊 New order_status emails count: ${afterCount.rows[0].count}`);
    
    await db.end();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testOrderStatusEmailLogging();