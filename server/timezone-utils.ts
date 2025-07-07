/**
 * SAST (South African Standard Time) Timezone Utilities
 * Ensures consistent timezone handling throughout the application
 * SAST is UTC+2 year-round (no daylight saving time)
 */

export class SASTTimezone {
  // SAST offset is UTC+2 (2 hours ahead of UTC)
  private static readonly SAST_OFFSET_HOURS = 2;
  private static readonly SAST_OFFSET_MS = SASTTimezone.SAST_OFFSET_HOURS * 60 * 60 * 1000;

  /**
   * Get current time in SAST
   */
  static now(): Date {
    const utcNow = new Date();
    return new Date(utcNow.getTime() + SASTTimezone.SAST_OFFSET_MS);
  }

  /**
   * Convert UTC date to SAST
   */
  static fromUTC(utcDate: Date): Date {
    return new Date(utcDate.getTime() + SASTTimezone.SAST_OFFSET_MS);
  }

  /**
   * Convert SAST date to UTC (for database storage)
   */
  static toUTC(sastDate: Date): Date {
    return new Date(sastDate.getTime() - SASTTimezone.SAST_OFFSET_MS);
  }

  /**
   * Add duration to current SAST time
   */
  static addToNow(durationMs: number): Date {
    const sastNow = SASTTimezone.now();
    return new Date(sastNow.getTime() + durationMs);
  }

  /**
   * Check if a UTC timestamp is expired compared to current SAST time
   */
  static isExpired(utcExpiresAt: Date): boolean {
    const sastNow = SASTTimezone.now();
    const sastExpiresAt = SASTTimezone.fromUTC(utcExpiresAt);
    return sastNow > sastExpiresAt;
  }

  /**
   * Get SAST timestamp string for logging
   */
  static formatForLog(date?: Date): string {
    const sastDate = date ? SASTTimezone.fromUTC(date) : SASTTimezone.now();
    return sastDate.toISOString().replace('Z', '+02:00 (SAST)');
  }

  /**
   * Create duration constants for common periods
   */
  static readonly DURATION = {
    MINUTES_1: 1 * 60 * 1000,
    MINUTES_3: 3 * 60 * 1000,
    MINUTES_15: 15 * 60 * 1000,
    HOUR_1: 60 * 60 * 1000,
    HOURS_3: 3 * 60 * 60 * 1000,
    HOURS_24: 24 * 60 * 60 * 1000,
  };
}

/**
 * Helper functions for common use cases
 */
export const sastNow = () => SASTTimezone.now();
export const sastAddHours = (hours: number) => SASTTimezone.addToNow(hours * 60 * 60 * 1000);
export const sastAddMinutes = (minutes: number) => SASTTimezone.addToNow(minutes * 60 * 1000);
export const isExpiredSAST = (utcTimestamp: Date) => SASTTimezone.isExpired(utcTimestamp);
export const formatSASTLog = (date?: Date) => SASTTimezone.formatForLog(date);