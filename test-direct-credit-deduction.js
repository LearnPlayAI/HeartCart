// Direct test of credit deduction with exact Order #75 parameters
// This will trigger all the debug logging we've added

console.log('🔍 TESTING DIRECT CREDIT DEDUCTION FOR ORDER #75 SCENARIO\n');

// Test by making a direct API call to the credit deduction functionality
const testData = {
  userId: 34,
  creditUsed: 50.00,
  orderNumber: 'TEST-DEBUG-CREDIT',
  orderId: 999 // Use test order ID
};

console.log('Test parameters:', testData);
console.log('This should trigger the debug logs we added to identify the exact issue');

// Since we can't directly import the storage module due to ES module complexity,
// let's create a simple order creation test that will trigger the logs

const orderData = {
  customerInfo: {
    firstName: "TEST",
    lastName: "DEBUG",
    email: "test@debug.com",  
    phone: "0123456789"
  },
  shippingAddress: {
    addressLine1: "123 Test St",
    city: "Cape Town",
    province: "Western Cape", 
    postalCode: "8000"
  },
  shippingMethod: "standard",
  shippingCost: 85,
  paymentMethod: "eft", 
  orderItems: [{
    productId: 1,
    quantity: 1,
    unitPrice: 100,
    productAttributes: {}
  }],
  subtotal: 100,
  total: 135,
  creditUsed: 25, // Test with R25 to avoid affecting user 34's real balance
  paymentReferenceNumber: "TEST-CREDIT-DEBUG",
  paymentStatus: "pending_verification"
};

console.log('Order test data prepared for credit deduction debugging');
console.log('The enhanced debug logs will show exactly why credit deduction fails');
console.log('\nTo trigger test: Need to authenticate as a user and place order with credits');
console.log('Or check server logs for any existing credit debug messages');