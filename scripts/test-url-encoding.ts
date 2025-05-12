/**
 * File URL Encoding Test Script
 * 
 * This script tests the file URL encoding functions to ensure
 * proper handling of special characters and spaces in filenames.
 */

import { 
  sanitizeFilename,
  formatObjectKeyPath,
  formatUrlPath
} from '../client/src/utils/file-manager';

// Test sanitizeFilename function
console.log('---------- FILENAME SANITIZATION TESTS ----------');
[
  'image.jpg',
  'product image.jpg',
  'product-image.jpg',
  'product image with spaces.jpg',
  'product_image_with_underscores.jpg',
  'image with (parentheses).jpg',
  'image with [brackets].jpg',
  'image with {braces}.jpg',
  'image with special chars: !@#$%.jpg',
  'image with accents éèêë.jpg',
  '1747060810539_7dahwpelukf_HEART FLEECE COMFORTER SET2.jpg',
  'HEART FLEECE COMFORTER SET3.jpg',
].forEach(filename => {
  const sanitized = sanitizeFilename(filename);
  console.log(`${filename} -> ${sanitized}`);
});

// Test formatObjectKeyPath function
console.log('\n---------- OBJECT KEY PATH TESTS ----------');
[
  'temp/pending/image.jpg',
  'temp/pending/image with spaces.jpg',
  'temp/pending/1747060810539_7dahwpelukf_HEART FLEECE COMFORTER SET2.jpg',
  'products/123/product image.jpg',
  'products/123/product-image.jpg',
].forEach(path => {
  const formatted = formatObjectKeyPath(path);
  console.log(`${path} -> ${formatted}`);
});

// Test formatUrlPath function
console.log('\n---------- URL PATH TESTS ----------');
[
  '/api/files/temp/pending/image.jpg',
  '/api/files/temp/pending/image with spaces.jpg',
  '/api/files/temp/pending/1747060810539_7dahwpelukf_HEART FLEECE COMFORTER SET2.jpg',
  '/api/files/products/123/product image.jpg',
  '/api/files/products/123/product-image.jpg',
].forEach(path => {
  const formatted = formatUrlPath(path);
  console.log(`${path} -> ${formatted}`);
});

console.log('\nTests completed!');