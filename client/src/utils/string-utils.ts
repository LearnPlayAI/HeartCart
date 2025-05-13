/**
 * String Utilities Module
 * 
 * This module provides utility functions for string manipulation
 * such as slug generation, SKU generation, etc.
 */

/**
 * Generates a URL-friendly slug from a string
 * 
 * @param text The text to convert to a slug
 * @returns A URL-friendly slug
 */
export function generateSlug(text: string): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars (keep spaces and hyphens)
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, and consecutive hyphens with a single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generates a SKU (Stock Keeping Unit) from a product name
 * 
 * @param productName The product name to generate a SKU from
 * @returns A SKU string (uppercase, with random suffix)
 */
export function generateSku(productName: string): string {
  if (!productName) return '';
  
  // Extract first letter of each word (up to 4 letters)
  const prefix = productName
    .split(/\s+/)
    .slice(0, 4)
    .map(word => word.charAt(0).toUpperCase())
    .join('');
  
  // Add a random suffix (6 characters)
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  return `${prefix}-${randomSuffix}`;
}

/**
 * Truncates a string to a specified length and adds an ellipsis if needed
 * 
 * @param text The text to truncate
 * @param maxLength The maximum length of the text
 * @returns The truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength) + '...';
}

/**
 * Capitalizes the first letter of each word in a string
 * 
 * @param text The text to capitalize
 * @returns The capitalized text
 */
export function capitalizeWords(text: string): string {
  if (!text) return '';
  
  return text
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Formats a string as a filename by removing invalid characters
 * 
 * @param text The text to format as a filename
 * @returns A valid filename
 */
export function formatFilename(text: string): string {
  if (!text) return '';
  
  return text
    .trim()
    .replace(/[<>:"/\\|?*]/g, '-') // Replace invalid filename chars with hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace consecutive hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Sanitizes a string for use in HTML, escaping special characters
 * 
 * @param text The text to sanitize
 * @returns Sanitized HTML text
 */
export function escapeHtml(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generates a random string of specified length
 * 
 * @param length The length of the random string
 * @returns A random string
 */
export function generateRandomString(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}