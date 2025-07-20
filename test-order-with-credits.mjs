// Test script to create order with credits and trigger debug logging
const orderData = {
  customerInfo: {
    firstName: "Jackie",
    lastName: "Etter", 
    email: "jackie.etter@gmail.com",
    phone: "0123456789"
  },
  shippingAddress: {
    addressLine1: "123 Test Street",
    city: "Cape Town", 
    province: "Western Cape",
    postalCode: "8000"
  },
  shippingMethod: "standard",
  shippingCost: 85,
  paymentMethod: "eft",
  orderItems: [
    {
      productId: 1,
      quantity: 1,
      unitPrice: 100,
      productAttributes: {}
    }
  ],
  subtotal: 100,
  total: 135, // 100 + 85 - 50 (credit)
  creditUsed: 50,  // This should trigger credit deduction
  paymentReferenceNumber: "TEST-CREDIT-DEBUG",
  paymentStatus: "pending_verification"
};

const response = await fetch('http://localhost:5000/api/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': 'connect.sid=test-session-id' // This would normally be set by login
  },
  body: JSON.stringify(orderData)
});

const result = await response.json();
console.log('Order creation result:', result);