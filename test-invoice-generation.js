const fetch = require('node-fetch');

async function testInvoiceGeneration() {
  try {
    // Test invoice generation for order 34
    console.log('Testing invoice generation for order 34...');
    
    const response = await fetch('http://localhost:5000/api/admin/orders/34/payment-status', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=s%3A123'  // Mock session for testing
      },
      body: JSON.stringify({ paymentStatus: 'payment_received' })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('Invoice generation triggered successfully:', result);
    } else {
      console.log('Response status:', response.status);
      const errorText = await response.text();
      console.log('Error response:', errorText);
    }

  } catch (error) {
    console.error('Error testing invoice generation:', error.message);
  }
}

testInvoiceGeneration();