/**
 * Date formatting hook for client-side components
 * 
 * This hook provides consistent date formatting using the shared SAST timezone utilities
 */
import { useMemo } from 'react';
import {
  formatSASTDateTime,
  formatShortDate,
  formatDateTime,
  formatTime,
  formatDateSafe,
  createSASTDate,
  toSASTTimezone,
  isValidDate
} from '@shared/date-utils';

export function useDateFormat() {
  return useMemo(() => ({
    /**
     * Format a date for display in standard format
     */
    formatDate: (date: Date | string | null | undefined): string => {
      return formatDateSafe(date);
    },

    /**
     * Format a date in short format (just the date)
     */
    formatShortDate: (date: Date | string | null | undefined): string => {
      return formatShortDate(date);
    },

    /**
     * Format a date with time
     */
    formatDateTime: (date: Date | string | null | undefined): string => {
      return formatDateTime(date);
    },

    /**
     * Format just the time portion
     */
    formatTime: (date: Date | string | null | undefined): string => {
      return formatTime(date);
    },

    /**
     * Create a new date in SAST timezone
     */
    createDate: (date?: Date): Date => {
      return createSASTDate(date);
    },

    /**
     * Convert a date to SAST timezone
     */
    toSASTTimezone: (date: Date): Date => {
      return toSASTTimezone(date);
    },

    /**
     * Check if a date is valid
     */
    isValidDate: (date: any): boolean => {
      return isValidDate(date);
    },

    /**
     * Format a date for form submission (SAST text format)
     * This ensures dates are stored consistently as text strings
     */
    formatForSubmission: (date: Date | null | undefined): string | null => {
      if (!date) return null;
      
      // Import the dateToSASTString function from shared/utils/date-utils
      const sastDate = toSASTTimezone(date);
      const year = sastDate.getFullYear();
      const month = String(sastDate.getMonth() + 1).padStart(2, '0');
      const day = String(sastDate.getDate()).padStart(2, '0');
      const hours = String(sastDate.getHours()).padStart(2, '0');
      const minutes = String(sastDate.getMinutes()).padStart(2, '0');
      const seconds = String(sastDate.getSeconds()).padStart(2, '0');
      
      // Format as YYYY-MM-DD HH:MM:SS+02:00 for SAST
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}+02:00`;
    },

    /**
     * Parse a date for form usage
     * Handles our text-based SAST date format and converts to Date object for UI
     */
    parseForForm: (dateString: string | null | undefined): Date | null => {
      if (!dateString) return null;
      try {
        return new Date(dateString);
      } catch (e) {
        console.error('Error parsing date:', e);
        return null;
      }
    }
  }), []);
}