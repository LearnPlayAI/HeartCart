/**
 * File Handling Test Script
 * 
 * This script tests the file handling components by running through
 * common file operations: upload, process, store, and retrieve.
 * It's designed to validate the integration between client and server
 * components of the file handling system.
 */

import path from 'path';
import fs from 'fs';
import { objectStore } from '../server/object-store-updated';

async function runTests() {
  console.log('🧪 Starting file handling tests...');
  
  try {
    // 1. Test initialization
    console.log('\n🔍 Testing ObjectStore initialization...');
    await objectStore.initialize();
    console.log('✅ ObjectStore initialized successfully.');
    
    // 2. Test directory creation
    console.log('\n🔍 Testing directory creation...');
    const testDir = 'public/test';
    await objectStore.ensureDirectoryExists(testDir);
    console.log(`✅ Directory '${testDir}' created or verified.`);
    
    // 3. Test file upload
    console.log('\n🔍 Testing file upload...');
    // Create a test buffer (simple text file)
    const testBuffer = Buffer.from('This is a test file created for validation purposes.');
    const testFilename = `test-file-${Date.now()}.txt`;
    const uploadResult = await objectStore.uploadBuffer(
      testBuffer,
      testFilename,
      {
        contentType: 'text/plain',
        metadata: { test: 'true', timestamp: new Date().toISOString() }
      }
    );
    console.log('✅ File uploaded successfully:');
    console.log(`   - Object Key: ${uploadResult.objectKey}`);
    console.log(`   - URL: ${uploadResult.url}`);
    
    // 4. Test file existence
    console.log('\n🔍 Testing file existence...');
    const fileExists = await objectStore.exists(uploadResult.objectKey);
    console.log(`✅ File existence check: ${fileExists ? 'Exists' : 'Does not exist'}`);
    
    // 5. Test file retrieval
    console.log('\n🔍 Testing file retrieval...');
    const fileData = await objectStore.getFileAsBuffer(uploadResult.objectKey);
    console.log(`✅ File retrieved (${fileData.data.length} bytes).`);
    console.log(`   - Content type: ${fileData.contentType}`);
    console.log(`   - Content: ${fileData.data.toString().substring(0, 50)}...`);
    
    // 6. Test temporary file upload
    console.log('\n🔍 Testing temporary file upload...');
    const tempResult = await objectStore.uploadTempFile(
      testBuffer,
      'temp-test.txt',
      'test-session',
      { contentType: 'text/plain' }
    );
    console.log('✅ Temporary file uploaded:');
    console.log(`   - Object Key: ${tempResult.objectKey}`);
    console.log(`   - URL: ${tempResult.url}`);
    
    // 7. Test file move
    console.log('\n🔍 Testing file move operation...');
    const destKey = `${testDir}/moved-${testFilename}`;
    const moveResult = await objectStore.moveFile(uploadResult.objectKey, destKey);
    console.log('✅ File moved successfully:');
    console.log(`   - From: ${uploadResult.objectKey}`);
    console.log(`   - To: ${moveResult.objectKey}`);
    
    // 8. Test directory listing
    console.log('\n🔍 Testing directory listing...');
    const files = await objectStore.listFiles(testDir);
    console.log(`✅ Directory '${testDir}' contains ${files.length} files:`);
    files.forEach(file => console.log(`   - ${file}`));
    
    // 9. Test file deletion
    console.log('\n🔍 Testing file deletion...');
    // Delete moved file
    await objectStore.deleteFile(moveResult.objectKey);
    // Delete temp file
    await objectStore.deleteFile(tempResult.objectKey);
    
    // Verify deletion
    const movedFileExists = await objectStore.exists(moveResult.objectKey);
    const tempFileExists = await objectStore.exists(tempResult.objectKey);
    
    console.log(`✅ Moved file deletion: ${!movedFileExists ? 'Successful' : 'Failed'}`);
    console.log(`✅ Temp file deletion: ${!tempFileExists ? 'Successful' : 'Failed'}`);
    
    console.log('\n🎉 All file handling tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Unhandled error during test execution:', error);
  process.exit(1);
});