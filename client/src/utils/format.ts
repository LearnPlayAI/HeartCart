/**
 * Format Utilities Module
 * 
 * This module provides utility functions for formatting values
 * such as currency, dates, file sizes, etc.
 */

/**
 * Format a number as currency with the specified currency symbol
 * 
 * @param amount The amount to format
 * @param currencySymbol The currency symbol to use (default: R)
 * @param locale The locale to use for formatting (default: en-ZA)
 * @returns A formatted currency string
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currencySymbol: string = 'R',
  locale: string = 'en-ZA'
): string {
  if (amount === null || amount === undefined) return `${currencySymbol}0.00`;
  
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) return `${currencySymbol}0.00`;
  
  return `${currencySymbol}${numAmount.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

/**
 * Format a date with the specified format
 * 
 * @param date The date to format
 * @param format The format to use (default: dd/MM/yyyy)
 * @returns A formatted date string
 */
export function formatDate(
  date: Date | string | number | null | undefined,
  format: string = 'dd/MM/yyyy'
): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'object' ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) return '';
  
  // Simple format implementation
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear();
  const hours = dateObj.getHours().toString().padStart(2, '0');
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');
  const seconds = dateObj.getSeconds().toString().padStart(2, '0');
  
  return format
    .replace('dd', day)
    .replace('MM', month)
    .replace('yyyy', year.toString())
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * Format a file size in bytes to a human-readable string
 * 
 * @param bytes The file size in bytes
 * @param decimals The number of decimal places to show (default: 2)
 * @returns A formatted file size string
 */
export function formatFileSize(
  bytes: number,
  decimals: number = 2
): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format a number with commas as thousands separators
 * 
 * @param number The number to format
 * @param decimals The number of decimal places to show (default: 0)
 * @returns A formatted number string
 */
export function formatNumber(
  number: number | string | null | undefined,
  decimals: number = 0
): string {
  if (number === null || number === undefined) return '0';
  
  const numValue = typeof number === 'string' ? parseFloat(number) : number;
  
  if (isNaN(numValue)) return '0';
  
  return numValue.toLocaleString('en-ZA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Format a percentage value
 * 
 * @param value The percentage value (0-100)
 * @param decimals The number of decimal places to show (default: 0)
 * @returns A formatted percentage string
 */
export function formatPercentage(
  value: number | string | null | undefined,
  decimals: number = 0
): string {
  if (value === null || value === undefined) return '0%';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return '0%';
  
  return `${numValue.toFixed(decimals)}%`;
}

/**
 * Format a number as a price with the specified currency symbol
 * This is similar to formatCurrency but specifically for product prices
 * 
 * @param price The price to format
 * @param currencySymbol The currency symbol to use (default: R)
 * @returns A formatted price string
 */
export function formatPrice(
  price: number | string | null | undefined,
  currencySymbol: string = 'R'
): string {
  return formatCurrency(price, currencySymbol);
}

/**
 * Format a weight in grams to a readable format
 * 
 * @param weightInGrams The weight in grams
 * @returns A formatted weight string
 */
export function formatWeight(weightInGrams: number | null | undefined): string {
  if (weightInGrams === null || weightInGrams === undefined) return '0g';
  
  if (weightInGrams < 1000) {
    return `${weightInGrams}g`;
  } else {
    const kg = weightInGrams / 1000;
    return `${kg.toFixed(2)}kg`;
  }
}

/**
 * Format dimensions (length, width, height) to a readable format
 * 
 * @param length The length in cm
 * @param width The width in cm
 * @param height The height in cm
 * @returns A formatted dimensions string
 */
export function formatDimensions(
  length: number | null | undefined,
  width: number | null | undefined,
  height: number | null | undefined
): string {
  if (
    length === null || length === undefined ||
    width === null || width === undefined ||
    height === null || height === undefined
  ) {
    return 'N/A';
  }
  
  return `${length} × ${width} × ${height} cm`;
}