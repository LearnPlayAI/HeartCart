import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple class names into a single string, 
 * merging Tailwind classes appropriately.
 * 
 * @param inputs The class names to combine
 * @returns A merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Debounces a function call to limit how often it's executed.
 * 
 * @param fn The function to debounce
 * @param delay The delay in milliseconds
 * @returns A debounced version of the function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>) {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Formats a price value to a currency string
 * 
 * @param price The price to format
 * @param currency The currency code (default: ZAR)
 * @returns A formatted price string
 */
export function formatPrice(price: number | null | undefined, currency: string = 'ZAR'): string {
  if (price === null || price === undefined) {
    return 'N/A';
  }
  
  // Format price with the appropriate currency
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(price);
}

/**
 * Truncates a string to a specified length and adds an ellipsis
 * 
 * @param str The string to truncate
 * @param maxLength The maximum length of the string (default: 100)
 * @returns The truncated string
 */
export function truncateString(str: string, maxLength: number = 100): string {
  if (!str) return '';
  
  if (str.length <= maxLength) {
    return str;
  }
  
  return str.slice(0, maxLength) + '...';
}

/**
 * Generates a slug from a string
 * 
 * @param str The string to convert to a slug
 * @returns A URL-friendly slug
 */
export function generateSlug(str: string): string {
  if (!str) return '';
  
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')      // Replace multiple hyphens with single hyphen
    .trim();
}

/**
 * Calculates a discount percentage
 * 
 * @param originalPrice The original price
 * @param discountedPrice The discounted price
 * @returns The discount percentage or null if inputs are invalid
 */
export function calculateDiscountPercentage(
  originalPrice: number | null | undefined,
  discountedPrice: number | null | undefined
): number | null {
  if (
    originalPrice === null ||
    originalPrice === undefined ||
    discountedPrice === null ||
    discountedPrice === undefined ||
    originalPrice <= 0 ||
    discountedPrice >= originalPrice
  ) {
    return null;
  }
  
  const discountPercentage = ((originalPrice - discountedPrice) / originalPrice) * 100;
  
  // Round to nearest integer
  return Math.round(discountPercentage);
}