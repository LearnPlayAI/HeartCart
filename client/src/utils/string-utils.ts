/**
 * String Utility Functions
 * 
 * Provides utility functions for string manipulation and formatting.
 */

/**
 * Convert a string to a slug format
 * (lowercase, replace spaces with hyphens, remove special characters)
 */
export const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Replace spaces with hyphens
    .replace(/[^\w\-]+/g, '')    // Remove all non-word chars
    .replace(/\-\-+/g, '-')      // Replace multiple hyphens with single hyphen
    .replace(/^-+/, '')          // Trim hyphens from start
    .replace(/-+$/, '');         // Trim hyphens from end
};

/**
 * Truncate a string to a specified length with an ellipsis
 */
export const truncate = (text: string, length: number = 100): string => {
  if (!text) return '';
  if (text.length <= length) return text;
  
  return text.slice(0, length) + '...';
};

/**
 * Convert a string to title case (capitalize first letter of each word)
 */
export const toTitleCase = (text: string): string => {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Generate a random string of specified length
 */
export const randomString = (length: number = 8): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
};

/**
 * Format a number as a price string (e.g. $29.99)
 */
export const formatPrice = (
  price: number,
  options: {
    currency?: string;
    locale?: string;
    decimals?: number;
  } = {}
): string => {
  const {
    currency = 'USD',
    locale = 'en-US',
    decimals = 2
  } = options;
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(price);
};

/**
 * Format a number as a file size string (e.g. 1.5 MB)
 */
export const formatFileSize = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
};