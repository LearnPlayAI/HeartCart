// Debug script to test credit deduction functionality
const { db } = require('./server/db.js');
const { creditTransactions, customerCredits } = require('./shared/schema.js');
const { eq } = require('drizzle-orm');

async function testCreditDeduction() {
  console.log('🔍 Testing Credit Deduction System...\n');

  try {
    // Test user ID 34 (Jackie Etter) who should have R79 available
    const userId = 34;
    const testAmount = 25; // Test deducting R25
    const description = 'Test credit deduction';
    const orderId = 999; // Test order ID
    
    console.log(`📊 Testing credit deduction for user ${userId}`);
    console.log(`💰 Amount to deduct: R${testAmount}`);
    console.log(`📝 Description: ${description}`);
    console.log(`🛒 Order ID: ${orderId}\n`);
    
    // Get user's current credit balance from database
    const creditRecord = await db.query.customerCredits.findFirst({
      where: eq(customerCredits.userId, userId)
    });
    console.log('Current balance before deduction:', creditRecord);
    
    // Test the exact logic that should happen in useUserCredits
    console.log('Testing database transaction logic...');
    
    // Get current balance by calculating from transactions
    const transactions = await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId));

    console.log(`Found ${transactions.length} existing transactions for user ${userId}`);
    
    let totalEarned = 0;
    let totalUsed = 0;

    for (const transaction of transactions) {
      const transactionAmount = parseFloat(transaction.amount);
      console.log(`Transaction: ${transaction.transactionType}, Amount: R${transactionAmount}`);
      if (transaction.transactionType === 'earned') {
        totalEarned += transactionAmount;
      } else if (transaction.transactionType === 'used') {
        totalUsed += transactionAmount;
      }
    }

    const availableCredits = totalEarned - totalUsed;
    console.log(`Calculated balance - Earned: R${totalEarned}, Used: R${totalUsed}, Available: R${availableCredits}`);

    if (availableCredits < testAmount) {
      console.log(`❌ Insufficient credits: Available R${availableCredits}, Needed R${testAmount}`);
    } else {
      console.log(`✅ Sufficient credits available: R${availableCredits} >= R${testAmount}`);
    }
    
  } catch (error) {
    console.error('❌ Credit deduction failed:');
    console.error('Error message:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testCreditDeduction().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test script failed:', error);
  process.exit(1);
});