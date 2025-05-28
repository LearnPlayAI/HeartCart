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

// Add formatCurrency as an alias for formatPrice for backward compatibility
export const formatCurrency = formatPrice;

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
 * Converts a string into a URL-friendly slug
 * 
 * @param text The string to slugify
 * @returns A URL-friendly slug
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/&/g, '-and-')   // Replace & with 'and'
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-')   // Replace multiple - with single -
    .replace(/^-+/, '')       // Trim - from start of text
    .replace(/-+$/, '');      // Trim - from end of text
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

/**
 * Calculates the discount percentage between original price and sale price
 * 
 * @param originalPrice The original price
 * @param salePrice The sale/discounted price
 * @returns The discount percentage (as an integer)
 */
export function calculateDiscount(originalPrice: number, salePrice: number): number {
  if (!originalPrice || !salePrice || originalPrice <= 0 || salePrice >= originalPrice) {
    return 0;
  }
  
  const discount = ((originalPrice - salePrice) / originalPrice) * 100;
  return Math.round(discount);
}

/**
 * Calculates time remaining until a target date
 * 
 * @param endDate The target date/time
 * @returns Object with time components remaining
 */
export function getTimeRemaining(endDate: Date | string) {
  const total = new Date(endDate).getTime() - Date.now();
  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  
  return {
    total,
    days,
    hours,
    minutes,
    seconds
  };
}

type TimeFormat = {
  hours: number;
  minutes: number;
  seconds: number;
};

/**
 * Formats time components into a readable string
 * 
 * @param time Object with time components
 * @returns Formatted time string (HH:MM:SS)
 */
export function formatTimeRemaining(time: TimeFormat): string {
  const padZero = (num: number): string => num.toString().padStart(2, '0');
  
  return `${padZero(time.hours)}:${padZero(time.minutes)}:${padZero(time.seconds)}`;
}

/**
 * Formats a date string into a readable format
 * 
 * @param dateString The date string to format
 * @returns A formatted date string
 */
export function formatDate(dateString: string | Date): string {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    return new Intl.DateTimeFormat('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch (error) {
    return 'Invalid Date';
  }
}

/**
 * Determines the display mode of the PWA
 * 
 * @returns The display mode as a string (e.g., 'browser', 'standalone', 'fullscreen', etc.)
 */
export function getPWADisplayMode(): string {
  if (typeof window === 'undefined') return 'browser';
  
  const isStandalone = 
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    // @ts-ignore - navigator.standalone is non-standard
    (window.navigator.standalone === true);
  
  if (document.referrer.startsWith('android-app://')) {
    return 'twa'; // Trusted Web Activity
  } else if (
    navigator.userAgent.includes('wv') || 
    navigator.userAgent.includes('Android') && navigator.userAgent.includes('Version/')
  ) {
    return 'webview';
  } else if (isStandalone) {
    return 'standalone';
  }
  
  return 'browser';
}