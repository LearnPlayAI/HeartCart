import { Client } from '@replit/object-storage';

async function testInvoiceDownload() {
  try {
    console.log('Testing invoice file access...');
    
    // Initialize object storage client
    const objectStore = new Client();
    
    // Check if the invoice file exists
    const invoicePath = 'Invoices/2025/8/TMY-27-20250623.pdf';
    console.log(`Checking file at path: ${invoicePath}`);
    
    const file = await objectStore.getFile(invoicePath);
    
    if (file) {
      console.log('✅ Invoice file found in object storage');
      console.log(`File size: ${file.length} bytes`);
      console.log(`File type: ${typeof file}`);
      console.log(`Is Buffer: ${Buffer.isBuffer(file)}`);
    } else {
      console.log('❌ Invoice file not found in object storage');
    }
    
    // List files in the Invoices directory to see what's there
    console.log('\nListing files in Invoices directory...');
    const files = await objectStore.listFiles('Invoices/');
    console.log('Files found:', files);
    
  } catch (error) {
    console.error('Error testing invoice download:', error.message);
    console.error('Stack:', error.stack);
  }
}

testInvoiceDownload();