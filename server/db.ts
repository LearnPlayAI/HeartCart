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

// Configure database connection pool with optimized settings for connection reuse
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  // Optimized pool settings to minimize connection creation
  max: 20, // Reduced from 50 - force connection reuse instead of creating new ones
  min: 2, // Keep 2 connections warm for faster response times
  idleTimeoutMillis: 30000, // Keep idle connections for 30 seconds to enable reuse during bursts
  connectionTimeoutMillis: 5000, // Allow more time to acquire connections
  maxUses: 7500, // Connections can be reused many times before refresh
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
