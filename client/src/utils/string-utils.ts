/**
 * String Utility Functions for TeeMeYou
 * 
 * This module provides utility functions for string manipulation, 
 * particularly focused on generating slugs, SKUs, and other product-related identifiers.
 */

/**
 * Generate a URL-friendly slug from a string
 * @param text The input string to convert to a slug
 * @returns A lowercase slug with spaces and special characters replaced with hyphens
 */
export function generateSlug(text: string): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate a SKU (Stock Keeping Unit) from a product name
 * @param productName The product name to convert to a SKU
 * @returns An uppercase SKU code based on the product name with a random suffix
 */
export function generateSku(productName: string): string {
  if (!productName) return '';
  
  // Extract first 3 characters from each word, uppercase
  const prefix = productName
    .split(' ')
    .map(word => word.substring(0, 3).toUpperCase())
    .join('');
  
  // Add random suffix for uniqueness
  const randomSuffix = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  
  return `${prefix}-${randomSuffix}`;
}

/**
 * Truncate a string to a maximum length with ellipsis if needed
 * @param text The input string to truncate
 * @param maxLength The maximum allowed length
 * @returns The truncated string with ellipsis if truncated
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text || '';
  
  return text.substring(0, maxLength) + '...';
}

/**
 * Generate a hashtag-friendly version of a string
 * @param text The input string to convert to hashtag format
 * @returns A hashtag-formatted string
 */
export function toHashtag(text: string): string {
  if (!text) return '';
  
  return '#' + text
    .replace(/\s+/g, '') // Remove spaces
    .replace(/[^\w\s]/g, ''); // Remove special characters
}

/**
 * Capitalize the first letter of each word in a string
 * @param text The input string to capitalize
 * @returns The string with the first letter of each word capitalized
 */
export function toTitleCase(text: string): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}