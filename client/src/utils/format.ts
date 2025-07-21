/**
 * Formatting Utility Functions for HeartCart
 * 
 * This module provides utility functions for formatting values like prices,
 * dates, and other display-oriented text transformations.
 */

/**
 * Format a number as currency (ZAR)
 * @param amount The amount to format
 * @param includeCurrency Whether to include the R symbol
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number | null | undefined, includeCurrency: boolean = true): string {
  if (amount === null || amount === undefined) return '-';
  
  const formatter = new Intl.NumberFormat('en-ZA', {
    style: includeCurrency ? 'currency' : 'decimal',
    currency: 'ZAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return formatter.format(amount);
}

/**
 * Format a number as a percentage
 * @param value The value to format as percentage
 * @param decimals Number of decimal places to show
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number | null | undefined, decimals: number = 0): string {
  if (value === null || value === undefined) return '-';
  
  const formatter = new Intl.NumberFormat('en-ZA', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  
  return formatter.format(value / 100);
}

/**
 * Format a date in localized format
 * @param date The date to format (string, Date object, or timestamp)
 * @param includeTime Whether to include the time in the formatted string
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string | number | null | undefined,
  includeTime: boolean = false
): string {
  if (!date) return '-';
  
  const dateObj = typeof date === 'object' ? date : new Date(date);
  
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  };
  
  return new Intl.DateTimeFormat('en-ZA', options).format(dateObj);
}

/**
 * Format a file size in human-readable format
 * @param bytes The file size in bytes
 * @param decimals Number of decimal places to show
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number | null | undefined, decimals: number = 2): string {
  if (bytes === null || bytes === undefined) return '-';
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format a phone number in South African format
 * @param phone The phone number to format
 * @returns Formatted phone number string
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '-';
  
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Check if it's a South African number
  if (digitsOnly.length === 10 && (digitsOnly.startsWith('0'))) {
    // Format as: 073 123 4567
    return digitsOnly.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
  }
  
  // International format
  if (digitsOnly.length > 10) {
    // Try to format international numbers
    const countryCode = digitsOnly.slice(0, digitsOnly.length - 9);
    const restOfNumber = digitsOnly.slice(-9);
    return `+${countryCode} ${restOfNumber.slice(0, 3)} ${restOfNumber.slice(3, 6)} ${restOfNumber.slice(6)}`;
  }
  
  // Return as is if we can't format it
  return phone;
}

/**
 * Format a number with thousand separators
 * @param number The number to format
 * @param decimals Number of decimal places
 * @returns Formatted number string
 */
export function formatNumber(number: number | null | undefined, decimals: number = 0): string {
  if (number === null || number === undefined) return '-';
  
  return new Intl.NumberFormat('en-ZA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(number);
}

/**
 * Format product dimensions in a human-readable format
 * @param length Product length in cm
 * @param width Product width in cm
 * @param height Product height in cm
 * @param unit The unit of measurement (default: 'cm')
 * @returns Formatted dimension string (e.g. "10 x 5 x 2 cm")
 */
export function formatDimensions(
  length: number | null | undefined, 
  width: number | null | undefined, 
  height: number | null | undefined,
  unit: string = 'cm'
): string {
  if (length === null || length === undefined || 
      width === null || width === undefined || 
      height === null || height === undefined) {
    return '-';
  }
  
  return `${length} × ${width} × ${height} ${unit}`;
}