import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { SAST_TIMEZONE } from '@shared/date-utils';
import { logger } from './logger';

// Configure websocket for Neon Serverless with default WebSocket handling
// Using native ws library without custom modifications for better stability
neonConfig.webSocketConstructor = ws;

// Using default Neon WebSocket configuration for optimal stability
// No custom WebSocket implementations to avoid connection issues

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure database connection with increased pool size for stability
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  // Increased pool settings for better connection availability
  max: 50, // Increased from 30 to 50 for improved connection availability
  min: 1, // Minimum connections to maintain
  idleTimeoutMillis: 5000, // Close idle connections after 5 seconds (reduced from 15s for faster release)
  connectionTimeoutMillis: 2000, // Reduced connection timeout for faster failure detection
  maxUses: 1000, // Connection refresh after 1000 uses to prevent memory leaks
  acquireTimeoutMillis: 3000, // Timeout for acquiring connection from pool (reduced from 5s)
});

// Add comprehensive pool error handling with connection recovery
pool.on('error', (err) => {
  // Safe error logging without modifying readonly properties
  const errorInfo = {
    message: err.message || 'Unknown database pool error',
    code: (err as any).code || 'unknown',
    type: err.constructor.name || 'Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  };
  
  logger.error('Database pool error:', errorInfo);
  
  // Don't exit process, just log the error
  // The pool will handle reconnection automatically
});

// Add connection event handling for better stability monitoring
pool.on('disconnect', (client) => {
  logger.debug('Database client disconnected', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
});

// Enhanced connection pool monitoring for resource-constrained environment
// Note: Connection event logging removed to reduce log noise
// The pool is properly managing connections - high totalCount is expected under load

// Remove acquire/release logging entirely as it's too frequent for resource-constrained environments

// Initialize Drizzle ORM with our schema
export const db = drizzle({ client: pool, schema });

// Export helpful database utility functions

/**
 * Utility function to format a date for PostgreSQL with SAST timezone
 * @param date The date to format
 * @returns SQL-formatted date string in SAST timezone
 */
export function formatDateForDb(date: Date): string {
  return date.toLocaleString('en-US', { timeZone: SAST_TIMEZONE });
}

/**
 * Set PostgreSQL session timezone to SAST
 * Call this function in the beginning of important database operations if needed
 */
export async function setSessionTimezone(): Promise<void> {
  let client;
  try {
    client = await pool.connect();
    await client.query(`SET timezone TO '${SAST_TIMEZONE}'`);
  } catch (error) {
    console.error('Failed to set database timezone:', error);
    // Don't throw the error, just log it to prevent server crashes
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack);
    }
  } finally {
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        console.error('Error releasing database connection:', releaseError);
      }
    }
  }
}
