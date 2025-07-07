/**
 * YoCo Webhook Registration Script
 * This script registers your webhook with YoCo and returns the webhook secret
 */

const YOCO_TEST_SECRET_KEY = process.env.YOCO_TEST_SECRET_KEY;
const WEBHOOK_URL = 'https://teemeyou.shop/api/webhooks/yoco';

async function registerYocoWebhook() {
  if (!YOCO_TEST_SECRET_KEY) {
    console.error('❌ YOCO_TEST_SECRET_KEY environment variable is required');
    process.exit(1);
  }

  try {
    console.log('🔄 Registering webhook with YoCo...');
    console.log('📍 Webhook URL:', WEBHOOK_URL);

    const response = await fetch('https://payments.yoco.com/api/webhooks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${YOCO_TEST_SECRET_KEY}`,
      },
      body: JSON.stringify({
        name: 'teemeyou-webhook',
        url: WEBHOOK_URL
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Webhook registration failed:', response.status, errorText);
      
      if (response.status === 409) {
        console.log('ℹ️  Webhook might already be registered. Checking existing webhooks...');
        await listExistingWebhooks();
      }
      return;
    }

    const result = await response.json();
    
    console.log('✅ Webhook registered successfully!');
    console.log('📋 Webhook Details:');
    console.log('   ID:', result.id);
    console.log('   Name:', result.name);
    console.log('   URL:', result.url);
    console.log('   Mode:', result.mode);
    console.log('🔐 WEBHOOK SECRET:', result.secret);
    console.log('');
    console.log('🎯 Next Steps:');
    console.log('1. Copy the webhook secret above');
    console.log('2. Add it to your project secrets as YOCO_WEBHOOK_SECRET');
    console.log('3. The webhook secret starts with "whsec_" and is used for security verification');

  } catch (error) {
    console.error('❌ Error registering webhook:', error.message);
  }
}

async function listExistingWebhooks() {
  try {
    const response = await fetch('https://payments.yoco.com/api/webhooks', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${YOCO_TEST_SECRET_KEY}`,
      },
    });

    if (response.ok) {
      const webhooks = await response.json();
      console.log('📋 Existing webhooks:');
      webhooks.forEach((webhook, index) => {
        console.log(`   ${index + 1}. ${webhook.name} - ${webhook.url} (${webhook.mode})`);
      });
      
      if (webhooks.length > 0) {
        console.log('ℹ️  If you see your webhook URL above, it\'s already registered.');
        console.log('   You may need to delete it first and re-register to get the secret.');
      }
    }
  } catch (error) {
    console.log('Could not list existing webhooks:', error.message);
  }
}

registerYocoWebhook();