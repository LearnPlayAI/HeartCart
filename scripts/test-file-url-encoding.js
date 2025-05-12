/**
 * File URL Encoding Test Script
 * 
 * This script tests the file URL encoding functions to ensure
 * proper handling of special characters and spaces in filenames.
 */

// Import the required functions from file-manager
import { 
  sanitizeFilename,
  formatObjectKeyPath,
  formatUrlPath,
  ensureValidImageUrl
} from '../client/src/utils/file-manager.js';

// Test Cases
const filenames = [
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
];

console.log('---------- FILENAME SANITIZATION TESTS ----------');
filenames.forEach(filename => {
  const sanitized = sanitizeFilename(filename);
  console.log(`${filename} -> ${sanitized}`);
});

console.log('\n---------- OBJECT KEY PATH TESTS ----------');
const objectKeyPaths = [
  'temp/pending/image.jpg',
  'temp/pending/image with spaces.jpg',
  'temp/pending/1747060810539_7dahwpelukf_HEART FLEECE COMFORTER SET2.jpg',
  'products/123/product image.jpg',
  'products/123/product-image.jpg',
];

objectKeyPaths.forEach(path => {
  const formatted = formatObjectKeyPath(path);
  console.log(`${path} -> ${formatted}`);
});

console.log('\n---------- URL PATH TESTS ----------');
const urlPaths = [
  '/api/files/temp/pending/image.jpg',
  '/api/files/temp/pending/image with spaces.jpg',
  '/api/files/temp/pending/1747060810539_7dahwpelukf_HEART FLEECE COMFORTER SET2.jpg',
  '/api/files/products/123/product image.jpg',
  '/api/files/products/123/product-image.jpg',
];

urlPaths.forEach(path => {
  const formatted = formatUrlPath(path);
  console.log(`${path} -> ${formatted}`);
});

console.log('\n---------- IMAGE OBJECT TESTS ----------');
const imageObjects = [
  { url: '/api/files/temp/pending/image.jpg', objectKey: 'temp/pending/image.jpg' },
  { url: '/api/files/temp/pending/image with spaces.jpg', objectKey: 'temp/pending/image with spaces.jpg' },
  { url: '/api/files/temp/pending/1747060810539_7dahwpelukf_HEART FLEECE COMFORTER SET2.jpg', 
    objectKey: 'temp/pending/1747060810539_7dahwpelukf_HEART FLEECE COMFORTER SET2.jpg' },
];

// Mock console.log to avoid too much output
const originalConsoleLog = console.log;
console.log = () => {};

imageObjects.forEach(image => {
  const url = ensureValidImageUrl(image);
  console.log = originalConsoleLog;
  console.log(`Image Object -> ${url}`);
  console.log = () => {};
});

console.log = originalConsoleLog;
console.log('\nTests completed!');