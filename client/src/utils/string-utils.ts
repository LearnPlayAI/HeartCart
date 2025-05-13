/**
 * String Utility functions for the application
 */

/**
 * Convert a string to a URL-friendly slug
 * @param text The text to convert to a slug
 * @returns A lowercase, hyphenated slug with no special characters
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    // Replace spaces with hyphens
    .replace(/\s+/g, '-')
    // Remove special characters
    .replace(/[^\w\-]+/g, '')
    // Replace multiple hyphens with a single hyphen
    .replace(/\-\-+/g, '-')
    // Remove leading and trailing hyphens
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Truncate a string to a specified length with ellipsis
 * @param text The text to truncate
 * @param maxLength The maximum length of the truncated text
 * @returns The truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength) + '...';
}

/**
 * Format a price as a currency string
 * @param price The price to format
 * @param currencyCode The currency code (default: ZAR for South African Rand)
 * @returns The formatted price string
 */
export function formatPrice(price: number, currencyCode: string = 'ZAR'): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: currencyCode,
  }).format(price);
}

/**
 * Convert a string to title case
 * @param text The text to convert
 * @returns The text in title case
 */
export function toTitleCase(text: string): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Check if a string contains another string (case insensitive)
 * @param haystack The string to search in
 * @param needle The string to search for
 * @returns True if the haystack contains the needle
 */
export function containsText(haystack: string, needle: string): boolean {
  if (!haystack || !needle) return false;
  
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/**
 * Generate a random string of specified length
 * @param length The length of the random string
 * @returns A random string
 */
export function generateRandomString(length: number = 8): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
}

/**
 * Generate a product SKU based on product name and optional category prefix
 * @param productName The name of the product
 * @param categoryPrefix Optional category prefix
 * @returns A formatted SKU
 */
export function generateProductSku(productName: string, categoryPrefix?: string): string {
  // Take the first 3 letters of the product name
  const productPart = productName
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 3)
    .toUpperCase();
  
  // Use category prefix if provided
  const prefix = categoryPrefix ? categoryPrefix.toUpperCase() : 'PRD';
  
  // Add a random 4-digit number
  const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `${prefix}-${productPart}${randomPart}`;
}