// CRITICAL FIX: Configure HTTP-only connections BEFORE importing Neon
// This eliminates WebSocket connection errors and improves stability
import { neonConfig } from '@neondatabase/serverless';

// Configure fetch polyfill first
if (typeof fetch === 'undefined') {
  const nodeFetch = require('node-fetch');
  global.fetch = nodeFetch.default || nodeFetch;
  global.Headers = nodeFetch.Headers;
  global.Request = nodeFetch.Request;
  global.Response = nodeFetch.Response;
}

// Disable WebSocket entirely BEFORE importing Pool - use HTTP only for maximum stability
neonConfig.webSocketConstructor = undefined;
neonConfig.useSecureWebSocket = false;
neonConfig.pipelineConnect = false;
neonConfig.pipelineTLS = false;

// Now import Pool and other dependencies AFTER configuring neonConfig
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from "@shared/schema";
import { SAST_TIMEZONE } from '@shared/date-utils';
import { logger } from './logger';

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure database connection optimized for resource-constrained environment (0.5CPU/1GB)
// Using HTTP-based connections instead of WebSocket for improved stability
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  // Optimized pool settings for small server with HTTP connections
  max: 3, // Further reduced to 3 for HTTP connections (more stable than WebSocket)
  min: 1, // Minimum connections to maintain
  idleTimeoutMillis: 20000, // Slightly increased for HTTP connections (20s)
  connectionTimeoutMillis: 5000, // Increased timeout for HTTP connections
  maxUses: 500, // Reduced connection reuse to prevent memory leaks with HTTP
  acquireTimeoutMillis: 8000, // Increased timeout for HTTP connection acquisition
});

// Add comprehensive pool error handling for HTTP connections
pool.on('error', (err) => {
  logger.error('Database pool error (HTTP connection):', {
    error: err.message,
    code: (err as any).code,
    type: err.constructor.name,
    stack: err.stack
  });
  
  // Don't exit process, just log the error
  // The pool will handle reconnection automatically
});

// Enhanced connection pool monitoring for resource-constrained environment
if (process.env.NODE_ENV !== 'production') {
  pool.on('connect', (client) => {
    logger.info('Database client connected', {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    });
  });
  
  // Monitor pool health for debugging
  pool.on('acquire', (client) => {
    if (pool.totalCount > 4) { // Warn if approaching max connections
      logger.warn('High database connection usage detected', {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      });
    }
  });
}

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
