// Quick diagnostic script to check mail-related code alignment
const { db } = require('./server/db.ts');
const { emailLogs, mailTokens } = require('./shared/schema.ts');

async function checkMailAlignment() {
  try {
    console.log('Checking mail-related table structures...');
    
    // Test emailLogs table structure
    const testEmailLog = {
      recipientEmail: 'test@example.com',
      emailType: 'test',
      subject: 'Test Subject',
      deliveryStatus: 'sent'
    };
    
    console.log('Testing emailLogs insert with:', testEmailLog);
    const result = await db.insert(emailLogs).values(testEmailLog).returning();
    console.log('EmailLogs insert successful:', result);
    
    // Clean up test record
    await db.delete(emailLogs).where(eq(emailLogs.id, result[0].id));
    
    console.log('Mail alignment check complete - schema appears correct');
  } catch (error) {
    console.error('Mail alignment error:', error.message);
  }
}

checkMailAlignment().catch(console.error);