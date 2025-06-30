/**
 * Shared date utility functions for the TeeMeYou application
 * All date functions standardized to SAST (South African Standard Time, UTC+2)
 */

// South Africa is in UTC+2 (South African Standard Time / SAST)
export const SAST_TIMEZONE = 'Africa/Johannesburg';
export const SAST_UTC_OFFSET = '+02:00';

/**
 * Create a new date in SAST timezone
 */
export function createSASTDate(date?: Date): Date {
  if (!date) {
    date = new Date();
  }
  return toSASTTimezone(date);
}

/**
 * Format a date to a standardized string format with custom options
 */
export function formatSASTDateTime(
  date: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
): string {
  if (!date) return 'Not available';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-ZA', options);
  } catch (e) {
    console.error('Error formatting date:', e);
    return 'Invalid date';
  }
}

/**
 * Format a date safely, handling various input types and formats
 */
export function formatDateSafe(date: Date | string | null | undefined): string {
  return formatSASTDateTime(date, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format a date in short format (just the date)
 */
export function formatShortDate(date: Date | string | null | undefined): string {
  return formatSASTDateTime(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date with time
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  return formatSASTDateTime(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format just the time portion
 */
export function formatTime(date: Date | string | null | undefined): string {
  return formatSASTDateTime(date, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Convert a date to SAST timezone
 */
export function toSASTTimezone(date: Date): Date {
  try {
    // Create a string representation in the SAST timezone
    const saTimeString = date.toLocaleString('en-US', { timeZone: SAST_TIMEZONE });
    // Parse this back to a new Date object
    const saTzDate = new Date(saTimeString);
    return saTzDate;
  } catch (e) {
    console.error('Error converting to SAST timezone:', e);
    return date; // Return original date if conversion fails
  }
}

/**
 * Check if a date is valid
 */
export function isValidDate(date: any): boolean {
  if (!date) return false;
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return !isNaN(dateObj.getTime());
  } catch (e) {
    return false;
  }
}