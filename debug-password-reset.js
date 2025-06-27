import { unifiedEmailService } from './server/unified-email-service.ts';
import { db } from './server/db.ts';
import { users, mailTokens } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

async function debugPasswordReset() {
  console.log('🔍 Debugging Password Reset Flow...\n');
  
  try {
    // Step 1: Find a test user
    const testUsers = await db.select().from(users).limit(1);
    if (testUsers.length === 0) {
      console.log('❌ No users found in database');
      return;
    }
    
    const testUser = testUsers[0];
    console.log(`✅ Using test user: ${testUser.email} (ID: ${testUser.id})\n`);
    
    // Step 2: Create a password reset token
    console.log('🔑 Creating password reset token...');
    const { token, expires } = await unifiedEmailService.createPasswordResetToken(testUser.id, testUser.email);
    console.log(`   Token: ${token.substring(0, 16)}...`);
    console.log(`   Expires: ${expires}\n`);
    
    // Step 3: Check token in database
    console.log('🗃️ Checking token in database...');
    const dbTokens = await db.select()
      .from(mailTokens)
      .where(eq(mailTokens.token, token));
    
    if (dbTokens.length > 0) {
      const dbToken = dbTokens[0];
      console.log(`   ✅ Token found in DB`);
      console.log(`   User ID: ${dbToken.userId}`);
      console.log(`   Email: ${dbToken.email}`);
      console.log(`   Type: ${dbToken.tokenType}`);
      console.log(`   Active: ${dbToken.isActive}`);
      console.log(`   Expires: ${dbToken.expiresAt}`);
      console.log(`   Used At: ${dbToken.usedAt}\n`);
    } else {
      console.log('   ❌ Token not found in database\n');
      return;
    }
    
    // Step 4: Validate the token immediately
    console.log('✅ Validating token immediately...');
    const validation1 = await unifiedEmailService.validatePasswordResetToken(token);
    console.log(`   Result: ${JSON.stringify(validation1, null, 2)}\n`);
    
    // Step 5: Wait a moment and validate again
    console.log('⏱️ Waiting 2 seconds and validating again...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    const validation2 = await unifiedEmailService.validatePasswordResetToken(token);
    console.log(`   Result: ${JSON.stringify(validation2, null, 2)}\n`);
    
    // Step 6: Check if token is still in database and active
    console.log('🔍 Checking token status after validation attempts...');
    const dbTokensAfter = await db.select()
      .from(mailTokens)
      .where(eq(mailTokens.token, token));
    
    if (dbTokensAfter.length > 0) {
      const dbToken = dbTokensAfter[0];
      console.log(`   Token still exists: true`);
      console.log(`   Active: ${dbToken.isActive}`);
      console.log(`   Used At: ${dbToken.usedAt}\n`);
    }
    
    // Step 7: Check timezone handling
    console.log('🌍 Checking timezone handling...');
    const now = new Date();
    const tokenExpiry = new Date(dbTokens[0].expiresAt);
    console.log(`   Current time (UTC): ${now.toISOString()}`);
    console.log(`   Token expires (UTC): ${tokenExpiry.toISOString()}`);
    console.log(`   Time until expiry: ${Math.round((tokenExpiry.getTime() - now.getTime()) / 1000 / 60)} minutes\n`);
    
    // Cleanup
    console.log('🧹 Cleaning up test token...');
    await db.delete(mailTokens).where(eq(mailTokens.token, token));
    console.log('✅ Test complete\n');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugPasswordReset().catch(console.error);