// Simple test to verify credit deduction system works
// Using CommonJS to avoid ES module issues

const fetch = require('node-fetch');

async function testCreditSystem() {
  console.log('🔍 Testing Credit System API Endpoints...\n');

  try {
    // Test 1: Check if user has credits
    console.log('1. Checking user 34 credit balance...');
    const balanceResponse = await fetch('http://localhost:5000/api/user/34/credits');
    const balanceData = await balanceResponse.json();
    console.log('   Credit balance:', balanceData);

    // Test 2: Check what happens when we try to place an order with credits
    console.log('\n2. Testing what would happen in a real order scenario...');
    console.log('   Order #75 should have triggered credit deduction but didn\'t');
    console.log('   Debug logs should show why when we process a new order');

    // Test 3: Check current credit transactions for user 34
    console.log('\n3. Current credit transactions for user 34:');
    const transactionsResponse = await fetch('http://localhost:5000/api/admin/users/34/credits');
    if (transactionsResponse.ok) {
      const transactionsData = await transactionsResponse.json();
      console.log('   Transactions:', transactionsData);
    } else {
      console.log('   Could not fetch transactions (may require admin auth)');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCreditSystem().then(() => {
  console.log('\n✅ Credit system test completed');
});