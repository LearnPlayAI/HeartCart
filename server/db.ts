import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { SAST_TIMEZONE } from '@shared/date-utils';

// Configure websocket for Neon Serverless with error handling
neonConfig.webSocketConstructor = ws;

// Add connection error handling for WebSocket
neonConfig.wsProxy = (host) => `wss://${host}`;

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
  connectionTimeoutMillis: 2000, // Timeout for establishing connections
});

// Add pool error handling
pool.on('error', (err) => {
  console.error('Database pool error:', err);
  // Don't exit process, just log the error
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
