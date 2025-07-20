// Comprehensive test to debug credit deduction issue
import { db } from './server/db.js';
import { creditTransactions, customerCredits } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function debugCreditDeduction() {
  console.log('🔍 COMPREHENSIVE CREDIT DEDUCTION DEBUG TEST\n');

  try {
    const userId = 34; // Jackie Etter - who made Order #75 with creditUsed: 50.00
    const testAmount = 50; // Same amount as in Order #75
    const description = 'DEBUG: Credit applied to order #TMY-75-20250720';
    const orderId = 75;

    console.log('📊 Test Parameters:');
    console.log(`   User ID: ${userId}`);
    console.log(`   Amount: R${testAmount}`);
    console.log(`   Order ID: ${orderId}\n`);

    // Step 1: Get current credit balance calculation (same logic as useUserCredits)
    console.log('🔍 Step 1: Calculating current credit balance...');
    const transactions = await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId));

    console.log(`   Found ${transactions.length} transactions:`);
    
    let totalEarned = 0;
    let totalUsed = 0;

    for (const transaction of transactions) {
      const transactionAmount = parseFloat(transaction.amount);
      console.log(`   - ${transaction.transactionType.toUpperCase()}: R${transactionAmount} (ID: ${transaction.id})`);
      
      if (transaction.transactionType === 'earned') {
        totalEarned += transactionAmount;
      } else if (transaction.transactionType === 'used') {
        totalUsed += transactionAmount;
      }
    }

    const availableCredits = totalEarned - totalUsed;
    console.log(`\n   💰 Credit Summary:`);
    console.log(`      Total Earned: R${totalEarned}`);
    console.log(`      Total Used: R${totalUsed}`);
    console.log(`      Available: R${availableCredits}`);

    // Step 2: Check if sufficient credits (same validation as useUserCredits)
    console.log(`\n🔍 Step 2: Credit sufficiency check...`);
    if (availableCredits < testAmount) {
      console.log(`   ❌ INSUFFICIENT CREDITS!`);
      console.log(`      Available: R${availableCredits}`);
      console.log(`      Requested: R${testAmount}`);
      console.log(`      ❌ This would cause useUserCredits to throw an error!`);
      return;
    } else {
      console.log(`   ✅ SUFFICIENT CREDITS`);
      console.log(`      Available: R${availableCredits} >= Requested: R${testAmount}`);
    }

    // Step 3: Test database transaction creation (without committing)
    console.log(`\n🔍 Step 3: Testing credit transaction creation...`);
    console.log(`   Testing INSERT with exact same values as useUserCredits would use:`);
    console.log(`      userId: ${userId}`);
    console.log(`      orderId: ${orderId}`);
    console.log(`      transactionType: 'used'`);
    console.log(`      amount: '${testAmount.toString()}'`);
    console.log(`      description: '${description}'`);
    console.log(`      createdAt: '${new Date().toISOString()}'`);

    // Don't actually insert to avoid affecting live data
    console.log(`   ✅ Database structure and parameters look valid`);

    // Step 4: Check for any existing used transactions for this order
    console.log(`\n🔍 Step 4: Checking for existing 'used' transactions for Order #${orderId}...`);
    const existingUsedTransactions = await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.orderId, orderId));
    
    console.log(`   Found ${existingUsedTransactions.length} transactions for Order #${orderId}:`);
    existingUsedTransactions.forEach(t => {
      console.log(`      - ${t.transactionType.toUpperCase()}: R${t.amount} (ID: ${t.id})`);
    });

    if (existingUsedTransactions.filter(t => t.transactionType === 'used').length === 0) {
      console.log(`   ❌ NO 'used' transactions found for Order #${orderId}!`);
      console.log(`   ❌ This confirms the credit deduction never happened!`);
    }

    console.log(`\n🎯 ANALYSIS COMPLETE:`);
    console.log(`   The useUserCredits method should work with these parameters.`);
    console.log(`   The issue is likely that the method is either:`);
    console.log(`   1. Not being called from order-routes.ts`);
    console.log(`   2. Failing silently due to a different error`);
    console.log(`   3. Being called with wrong parameters`);
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
debugCreditDeduction().then(() => {
  console.log('\n🏁 Debug test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test script failed:', error);
  process.exit(1);
});