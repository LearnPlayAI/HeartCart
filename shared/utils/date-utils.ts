/**
 * Date Utilities for handling SAST (South African Standard Time) dates
 * All dates in the application should be stored as text strings in SAST format
 */

/**
 * Format current date in SAST (UTC+2) format as string
 * @returns The current date and time as a string in SAST timezone
 * Format: YYYY-MM-DD HH:MM:SS+02:00
 */
export function formatCurrentDateSAST(): string {
  const now = new Date();
  
  // Add 2 hours to account for SAST (UTC+2)
  const sastDate = new Date(now.getTime() + (2 * 60 * 60 * 1000));
  
  // Format as YYYY-MM-DD HH:MM:SS+02:00
  const year = sastDate.getFullYear();
  const month = String(sastDate.getMonth() + 1).padStart(2, '0');
  const day = String(sastDate.getDate()).padStart(2, '0');
  const hours = String(sastDate.getHours()).padStart(2, '0');
  const minutes = String(sastDate.getMinutes()).padStart(2, '0');
  const seconds = String(sastDate.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}+02:00`;
}

/**
 * Convert a Date object to SAST string format
 * @param date The Date object to convert
 * @returns The date as a string in SAST timezone format (YYYY-MM-DD HH:MM:SS+02:00)
 */
export function dateToSASTString(date: Date | null): string | null {
  if (!date) return null;
  
  // Add 2 hours to account for SAST (UTC+2)
  const sastDate = new Date(date.getTime() + (2 * 60 * 60 * 1000));
  
  // Format as YYYY-MM-DD HH:MM:SS+02:00
  const year = sastDate.getFullYear();
  const month = String(sastDate.getMonth() + 1).padStart(2, '0');
  const day = String(sastDate.getDate()).padStart(2, '0');
  const hours = String(sastDate.getHours()).padStart(2, '0');
  const minutes = String(sastDate.getMinutes()).padStart(2, '0');
  const seconds = String(sastDate.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}+02:00`;
}

/**
 * Convert a SAST string to Date object
 * This is useful when you need to perform date operations
 * @param sastString The SAST formatted date string
 * @returns A JavaScript Date object (in local time)
 */
export function sastStringToDate(sastString: string | null): Date | null {
  if (!sastString) return null;
  
  // Parse the SAST string (which has +02:00 timezone indicator)
  return new Date(sastString);
}