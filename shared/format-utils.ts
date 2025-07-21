/**
 * Shared formatting utility functions for the HeartCart application
 * Standardized string and number formatting utilities
 */

/**
 * Format a number as South African currency (ZAR)
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return 'R0.00';
  
  try {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numericAmount);
  } catch (e) {
    console.error('Error formatting currency:', e);
    return 'R0.00';
  }
}

/**
 * Format a number as a percentage
 */
export function formatPercentage(value: number | string | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined) return '0%';
  
  try {
    const numericValue = typeof value === 'string' ? parseFloat(value) : value;
    
    return new Intl.NumberFormat('en-ZA', {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(numericValue / 100);
  } catch (e) {
    console.error('Error formatting percentage:', e);
    return '0%';
  }
}

/**
 * Format a number with thousand separators
 */
export function formatNumber(value: number | string | null | undefined, decimals: number = 0): string {
  if (value === null || value === undefined) return '0';
  
  try {
    const numericValue = typeof value === 'string' ? parseFloat(value) : value;
    
    return new Intl.NumberFormat('en-ZA', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(numericValue);
  } catch (e) {
    console.error('Error formatting number:', e);
    return '0';
  }
}

/**
 * Format a file size in bytes to a human-readable format
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || bytes === 0) return '0 Bytes';
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Truncate a string to a maximum length with ellipsis
 */
export function truncateString(str: string | null | undefined, maxLength: number): string {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  
  return str.substring(0, maxLength) + '...';
}

/**
 * Convert a string to title case
 */
export function toTitleCase(str: string | null | undefined): string {
  if (!str) return '';
  
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Slugify a string (convert to URL-friendly format)
 */
export function slugify(str: string | null | undefined): string {
  if (!str) return '';
  
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')      // Replace multiple hyphens with single hyphen
    .trim();
}

/**
 * Format a phone number in South African format
 */
export function formatPhoneNumber(phoneNumber: string | null | undefined): string {
  if (!phoneNumber) return '';
  
  // Remove all non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Check if it's a South African number
  if (cleaned.startsWith('27') && cleaned.length === 11) {
    return `+${cleaned.substring(0, 2)} ${cleaned.substring(2, 5)} ${cleaned.substring(5, 8)} ${cleaned.substring(8)}`;
  } else if (cleaned.startsWith('0') && cleaned.length === 10) {
    return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6)}`;
  }
  
  // Return as is if it doesn't match expected formats
  return phoneNumber;
}

/**
 * Format an email address to hide part of it for privacy
 */
export function obfuscateEmail(email: string | null | undefined): string {
  if (!email || !email.includes('@')) return '';
  
  const [username, domain] = email.split('@');
  const hiddenUsername = username.charAt(0) + '*'.repeat(username.length - 2) + username.charAt(username.length - 1);
  
  return `${hiddenUsername}@${domain}`;
}