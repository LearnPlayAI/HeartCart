// Direct test of the useUserCredits method using Node.js with require() 
const { execSync } = require('child_process');

// Test the exact scenario that should work
console.log('🔍 TESTING CREDIT DEDUCTION DIRECTLY\n');

try {
  // Create a simple Node.js script to test credit deduction
  const testScript = `
    const { storage } = require('./server/storage');
    
    async function testCredit() {
      try {
        console.log('Testing credit deduction for user 34, amount 25, order 999');
        const result = await storage.useUserCredits(34, 25, 'Direct test', 999);
        console.log('✅ SUCCESS:', result);
      } catch (error) {
        console.log('❌ ERROR:', error.message);
      }
      process.exit(0);
    }
    
    testCredit();
  `;
  
  // Write the test script
  require('fs').writeFileSync('temp-credit-test.js', testScript);
  
  // Run the test
  const result = execSync('cd /home/runner/workspace && timeout 10 node temp-credit-test.js', { 
    encoding: 'utf8',
    timeout: 10000 
  });
  
  console.log('Test result:', result);
  
  // Cleanup
  require('fs').unlinkSync('temp-credit-test.js');
  
} catch (error) {
  console.error('Test failed:', error.message);
}

console.log('Test completed');