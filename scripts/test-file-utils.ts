/**
 * File Utilities Test Script
 * 
 * This script tests the utility functions from shared/utils/file-utils.ts
 * to ensure they properly handle special characters, spaces, and other formatting issues.
 */

import {
  sanitizeFilename,
  hasAllowedExtension,
  isImageFile,
  generateUniqueFilename,
  getContentTypeFromFilename,
  ensureValidImageUrl
} from '../shared/utils/file-utils';

/**
 * Test the sanitizeFilename function
 */
function testSanitizeFilename() {
  console.log('\n--- Testing sanitizeFilename ---');
  
  const testCases = [
    { input: 'normal-file.jpg', expected: 'normal-file.jpg', description: 'Already sanitized filename' },
    { input: 'file with spaces.jpg', expected: 'file-with-spaces.jpg', description: 'Filename with spaces' },
    { input: 'file@with#special$chars.jpg', expected: 'file-with-special-chars.jpg', description: 'Filename with special chars' },
    { input: 'Ümlaut Fïle.jpg', expected: 'umlaut-file.jpg', description: 'Filename with accents' },
    { input: '../../dangerous/path.jpg', expected: 'dangerous-path.jpg', description: 'Path traversal attempt' },
    { input: ' leading trailing spaces.jpg ', expected: 'leading-trailing-spaces.jpg', description: 'Leading/trailing spaces' },
  ];
  
  testCases.forEach(({ input, expected, description }) => {
    const result = sanitizeFilename(input);
    const passed = result === expected;
    console.log(`${passed ? '✅' : '❌'} ${description}:`);
    console.log(`   Input: "${input}"`);
    console.log(`   Output: "${result}"`);
    console.log(`   Expected: "${expected}"`);
    if (!passed) {
      console.log(`   ERROR: Output doesn't match expected result`);
    }
  });
}

/**
 * Test the hasAllowedExtension function
 */
function testHasAllowedExtension() {
  console.log('\n--- Testing hasAllowedExtension ---');
  
  const allowedImageExt = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  const allowedDocExt = ['pdf', 'doc', 'docx', 'xls', 'xlsx'];
  
  const testCases = [
    { input: 'image.jpg', allowed: allowedImageExt, expected: true, description: 'JPG image with allowed image extensions' },
    { input: 'image.pdf', allowed: allowedImageExt, expected: false, description: 'PDF with allowed image extensions' },
    { input: 'document.pdf', allowed: allowedDocExt, expected: true, description: 'PDF with allowed document extensions' },
    { input: 'document.jpg', allowed: allowedDocExt, expected: false, description: 'JPG with allowed document extensions' },
    { input: 'noextension', allowed: allowedImageExt, expected: false, description: 'File without extension' },
    { input: '.htaccess', allowed: allowedImageExt, expected: false, description: 'Dot file' },
    { input: 'IMAGE.JPG', allowed: allowedImageExt, expected: true, description: 'Uppercase extension' },
  ];
  
  testCases.forEach(({ input, allowed, expected, description }) => {
    const result = hasAllowedExtension(input, allowed);
    const passed = result === expected;
    console.log(`${passed ? '✅' : '❌'} ${description}:`);
    console.log(`   Input: "${input}" with allowed extensions: [${allowed.join(', ')}]`);
    console.log(`   Output: ${result}`);
    console.log(`   Expected: ${expected}`);
    if (!passed) {
      console.log(`   ERROR: Output doesn't match expected result`);
    }
  });
}

/**
 * Test the isImageFile function
 */
function testIsImageFile() {
  console.log('\n--- Testing isImageFile ---');
  
  const testCases = [
    { input: 'image.jpg', expected: true, description: 'JPG image' },
    { input: 'image.jpeg', expected: true, description: 'JPEG image' },
    { input: 'image.png', expected: true, description: 'PNG image' },
    { input: 'image.gif', expected: true, description: 'GIF image' },
    { input: 'image.webp', expected: true, description: 'WEBP image' },
    { input: 'document.pdf', expected: false, description: 'PDF document' },
    { input: 'image.JPG', expected: true, description: 'Uppercase JPG extension' },
    { input: 'image', expected: false, description: 'No extension' },
  ];
  
  testCases.forEach(({ input, expected, description }) => {
    const result = isImageFile(input);
    const passed = result === expected;
    console.log(`${passed ? '✅' : '❌'} ${description}:`);
    console.log(`   Input: "${input}"`);
    console.log(`   Output: ${result}`);
    console.log(`   Expected: ${expected}`);
    if (!passed) {
      console.log(`   ERROR: Output doesn't match expected result`);
    }
  });
}

/**
 * Test the generateUniqueFilename function
 */
function testGenerateUniqueFilename() {
  console.log('\n--- Testing generateUniqueFilename ---');
  
  const testCases = [
    { input: 'test.jpg', description: 'JPG image' },
    { input: 'file with spaces.png', description: 'PNG with spaces' },
    { input: 'document.pdf', description: 'PDF document' },
    { input: 'noextension', description: 'No extension' },
  ];
  
  testCases.forEach(({ input, description }) => {
    const result = generateUniqueFilename(input);
    const originalExt = input.includes('.') ? input.split('.').pop() : '';
    const resultExt = result.includes('.') ? result.split('.').pop() : '';
    
    const preservesExtension = originalExt === resultExt;
    const isUnique = result !== input;
    const hasTimestamp = /\d{13}/.test(result); // Should contain a timestamp (milliseconds)
    
    console.log(`${isUnique && preservesExtension ? '✅' : '❌'} ${description}:`);
    console.log(`   Input: "${input}"`);
    console.log(`   Output: "${result}"`);
    console.log(`   Preserves extension: ${preservesExtension ? 'Yes' : 'No'}`);
    console.log(`   Is unique: ${isUnique ? 'Yes' : 'No'}`);
    console.log(`   Has timestamp: ${hasTimestamp ? 'Yes' : 'No'}`);
    
    if (!preservesExtension || !isUnique || !hasTimestamp) {
      console.log(`   ERROR: Doesn't meet uniqueness requirements`);
    }
  });
}

/**
 * Test the getContentTypeFromFilename function
 */
function testGetContentTypeFromFilename() {
  console.log('\n--- Testing getContentTypeFromFilename ---');
  
  const testCases = [
    { input: 'image.jpg', expected: 'image/jpeg', description: 'JPG image' },
    { input: 'image.jpeg', expected: 'image/jpeg', description: 'JPEG image' },
    { input: 'image.png', expected: 'image/png', description: 'PNG image' },
    { input: 'image.gif', expected: 'image/gif', description: 'GIF image' },
    { input: 'document.pdf', expected: 'application/pdf', description: 'PDF document' },
    { input: 'document.txt', expected: 'text/plain', description: 'Text file' },
    { input: 'document.html', expected: 'text/html', description: 'HTML file' },
    { input: 'unknown.xyz', expected: null, description: 'Unknown extension' },
    { input: 'noextension', expected: null, description: 'No extension' },
  ];
  
  testCases.forEach(({ input, expected, description }) => {
    const result = getContentTypeFromFilename(input);
    const passed = result === expected;
    console.log(`${passed ? '✅' : '❌'} ${description}:`);
    console.log(`   Input: "${input}"`);
    console.log(`   Output: ${result}`);
    console.log(`   Expected: ${expected}`);
    if (!passed) {
      console.log(`   ERROR: Output doesn't match expected result`);
    }
  });
}

/**
 * Test the ensureValidImageUrl function
 */
function testEnsureValidImageUrl() {
  console.log('\n--- Testing ensureValidImageUrl ---');
  
  const testCases = [
    { input: '/api/file-browser/files/products/image.jpg', expected: '/api/file-browser/files/products/image.jpg', description: 'Already valid URL' },
    { input: '/api/file-browser/files/products/image with spaces.jpg', expected: '/api/file-browser/files/products/image%20with%20spaces.jpg', description: 'URL with spaces' },
    { input: '/api/file-browser/files/products/image+with+plus.jpg', expected: '/api/file-browser/files/products/image%2Bwith%2Bplus.jpg', description: 'URL with plus signs' },
    { input: '/api/file-browser/files/products/image%20already%20encoded.jpg', expected: '/api/file-browser/files/products/image%20already%20encoded.jpg', description: 'Already encoded URL' },
    { input: '/api/file-browser/files/products/image with [special] chars?.jpg', expected: '/api/file-browser/files/products/image%20with%20%5Bspecial%5D%20chars%3F.jpg', description: 'URL with special chars' },
  ];
  
  testCases.forEach(({ input, expected, description }) => {
    const result = ensureValidImageUrl(input);
    const passed = result === expected;
    console.log(`${passed ? '✅' : '❌'} ${description}:`);
    console.log(`   Input: "${input}"`);
    console.log(`   Output: "${result}"`);
    console.log(`   Expected: "${expected}"`);
    if (!passed) {
      console.log(`   ERROR: Output doesn't match expected result`);
    }
  });
}

/**
 * Run all tests
 */
function runAllTests() {
  console.log('='.repeat(80));
  console.log('RUNNING FILE UTILITY TESTS');
  console.log('='.repeat(80));
  
  testSanitizeFilename();
  testHasAllowedExtension();
  testIsImageFile();
  testGenerateUniqueFilename();
  testGetContentTypeFromFilename();
  testEnsureValidImageUrl();
  
  console.log('\n' + '='.repeat(80));
  console.log('FILE UTILITY TESTS COMPLETED');
  console.log('='.repeat(80));
}

// Execute tests
runAllTests();