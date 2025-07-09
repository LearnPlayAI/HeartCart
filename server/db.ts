import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { SAST_TIMEZONE } from '@shared/date-utils';
import { logger } from './logger';

// Enhanced WebSocket constructor with better error handling
class EnhancedWebSocket extends ws {
  constructor(address: string, protocols?: string | string[], options?: ws.ClientOptions) {
    super(address, protocols, options);
    
    // Add comprehensive error handling
    this.on('error', (error) => {
      logger.error('WebSocket connection error:', {
        error: error.message,
        code: (error as any).code,
        type: error.constructor.name,
        address: address
      });
      
      // Prevent the error from bubbling up as uncaught
      // The Neon package will handle reconnection logic
    });
    
    this.on('close', (code, reason) => {
      if (code !== 1000) { // 1000 is normal closure
        logger.warn('WebSocket connection closed unexpectedly:', {
          code,
          reason: reason.toString(),
          address: address
        });
      }
    });
  }
}

// Configure websocket for Neon Serverless with enhanced error handling
neonConfig.webSocketConstructor = EnhancedWebSocket;

// Remove the malformed wsProxy configuration that was causing double wss:// URLs
// The webSocketConstructor setting is sufficient for Neon serverless

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure database connection with enhanced error handling
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  // Add connection pool settings for better stability
  max: 20, // Maximum number of connections
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 5000, // Increased timeout for establishing connections
});

// Add comprehensive pool error handling
pool.on('error', (err) => {
  logger.error('Database pool error:', {
    error: err.message,
    code: (err as any).code,
    type: err.constructor.name,
    stack: err.stack
  });
  
  // Don't exit process, just log the error
  // The pool will handle reconnection automatically
});

// Add connection event logging for debugging (with safe property access)
pool.on('connect', (client) => {
  logger.info('Database client connected', {
    processId: client && (client as any).processID ? (client as any).processID : 'unknown',
    connectionCount: pool.totalCount
  });
});

pool.on('acquire', (client) => {
  logger.debug('Database client acquired from pool', {
    processId: client && (client as any).processID ? (client as any).processID : 'unknown',
    idleCount: pool.idleCount,
    totalCount: pool.totalCount
  });
});

pool.on('release', (client) => {
  logger.debug('Database client released to pool', {
    processId: client && (client as any).processID ? (client as any).processID : 'unknown',
    idleCount: pool.idleCount,
    totalCount: pool.totalCount
  });
});

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
