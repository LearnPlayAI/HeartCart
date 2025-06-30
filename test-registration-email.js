/**
 * Test Registration Email Verification
 * Tests that verification emails are sent during user registration
 */

import { unifiedEmailService } from './server/unified-email-service.js';

async function testRegistrationEmailFlow() {
  console.log('🧪 Testing Registration Email Verification Flow');
  console.log('='.repeat(50));

  try {
    // Test 1: Direct email service functionality
    console.log('\n1. Testing direct email service...');
    const testUserId = 999;
    const testEmail = 'test@teemeyou.shop';
    const testUsername = 'TestUser';

    const emailResult = await unifiedEmailService.sendVerificationEmail(testUserId, testEmail, testUsername);
    
    console.log('Email send result:', emailResult);
    
    if (emailResult.success) {
      console.log('✅ Direct email verification service working correctly');
    } else {
      console.log('❌ Direct email verification failed:', emailResult.error);
    }

    // Test 2: Check MailerSend API key configuration
    console.log('\n2. Checking MailerSend configuration...');
    const apiKey = process.env.MAILERSEND_API_KEY;
    console.log('MailerSend API Key configured:', !!apiKey);
    
    if (apiKey) {
      console.log('✅ MailerSend API key is configured');
    } else {
      console.log('❌ MailerSend API key is missing');
    }

    console.log('\n✅ Registration email verification test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testRegistrationEmailFlow();