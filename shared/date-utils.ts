/**
 * TeeMeYou Date Utilities
 * 
 * This module provides standardized date/time handling for the application
 * with consistent SAST (UTC+2) timezone support.
 */

// The standard timezone for the application is South African Standard Time (SAST)
export const SAST_TIMEZONE = 'Africa/Johannesburg';
export const SAST_LOCALE = 'en-ZA';

/**
 * Create a new date in SAST timezone
 */
export function createSASTDate(date?: Date): Date {
  const now = date || new Date();
  return new Date(now.toLocaleString('en-US', { timeZone: SAST_TIMEZONE }));
}

/**
 * Convert any date to SAST timezone
 */
export function toSASTTimezone(date: Date): Date {
  return new Date(date.toLocaleString('en-US', { timeZone: SAST_TIMEZONE }));
}

/**
 * Format date for display with SAST timezone
 * 
 * @param date The date to format
 * @param options Optional formatting options
 * @returns Formatted date string
 */
export function formatSASTDateTime(
  date: Date, 
  options: Intl.DateTimeFormatOptions = { 
    dateStyle: 'medium', 
    timeStyle: 'short' 
  }
): string {
  return date.toLocaleString(SAST_LOCALE, { 
    timeZone: SAST_TIMEZONE,
    ...options
  });
}

/**
 * Safe formatter for any date format
 * 
 * @param date Date to format (can be Date object, string, null or undefined)
 * @param options Optional formatting options
 * @returns Formatted date string or 'N/A' if date is invalid
 */
export function formatDateSafe(
  date: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return 'N/A';
  
  try {
    const parsedDate = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(parsedDate.getTime())) return 'N/A';
    return formatSASTDateTime(parsedDate, options);
  } catch (error) {
    console.error("Date formatting error:", error);
    return 'N/A';
  }
}

/**
 * Check if a date is valid
 */
export function isValidDate(date: any): boolean {
  if (!date) return false;
  const d = new Date(date);
  return !isNaN(d.getTime());
}

/**
 * Format a date as ISO string in SAST timezone
 * This is useful for API responses and database operations
 */
export function toSASTISOString(date: Date): string {
  return toSASTTimezone(date).toISOString();
}

/**
 * Parse an ISO string date with SAST timezone consideration
 */
export function parseSASTISOString(isoString: string): Date {
  const date = new Date(isoString);
  return toSASTTimezone(date);
}

/**
 * Get current date in SAST timezone
 */
export function getCurrentSASTDate(): Date {
  return createSASTDate();
}

/**
 * Format a date for database storage
 * This ensures consistent timezone handling when storing dates
 */
export function formatForDatabaseStorage(date: Date): string {
  return toSASTTimezone(date).toISOString();
}

/**
 * Parse a date from database storage format
 */
export function parseFromDatabaseStorage(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Format date for display in short format
 */
export function formatShortDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  return formatDateSafe(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format date and time for display
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  return formatDateSafe(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format time only for display
 */
export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  return formatDateSafe(date, {
    hour: '2-digit',
    minute: '2-digit'
  });
}