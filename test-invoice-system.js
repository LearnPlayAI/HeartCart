// Simple test to demonstrate PDF invoice generation
const http = require('http');

async function testInvoiceDownload() {
  console.log('Testing PDF invoice system with existing order...');
  
  // Test admin invoice download endpoint
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/orders/34/invoice',
    method: 'GET',
    headers: {
      'Cookie': 'connect.sid=test'
    }
  };

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    
    if (res.statusCode === 200) {
      console.log('✅ Invoice download endpoint working - PDF available');
      console.log(`Content-Type: ${res.headers['content-type']}`);
      console.log(`Content-Length: ${res.headers['content-length']} bytes`);
    } else if (res.statusCode === 404) {
      console.log('📄 No invoice generated yet - testing generation...');
      testInvoiceGeneration();
    } else {
      console.log(`❌ Error: ${res.statusCode}`);
    }
  });

  req.on('error', (e) => {
    console.error(`Request error: ${e.message}`);
  });

  req.end();
}

function testInvoiceGeneration() {
  console.log('Testing invoice generation trigger...');
  
  // Simulate payment status update to trigger invoice generation
  const postData = JSON.stringify({
    paymentStatus: 'payment_received'
  });

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/orders/34/payment-status',
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'Cookie': 'connect.sid=test'
    }
  };

  const req = http.request(options, (res) => {
    console.log(`Payment status update: ${res.statusCode}`);
    
    if (res.statusCode === 200) {
      console.log('✅ Payment status updated - invoice should be generated');
      setTimeout(() => {
        console.log('Re-testing invoice download...');
        testInvoiceDownload();
      }, 2000);
    } else {
      console.log('❌ Payment status update failed');
    }
  });

  req.on('error', (e) => {
    console.error(`Request error: ${e.message}`);
  });

  req.write(postData);
  req.end();
}

// Start the test
testInvoiceDownload();