import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { SAST_TIMEZONE } from '@shared/date-utils';
import { logger } from './logger';

// Enhanced WebSocket constructor with stable error handling
class EnhancedWebSocket extends ws {
  private retryCount = 0;
  private maxRetries = 3;
  private retryDelay = 1000;

  constructor(address: string, protocols?: string | string[], options?: ws.ClientOptions) {
    // Add connection timeout and retry options
    const enhancedOptions = {
      ...options,
      handshakeTimeout: 10000, // 10 second timeout
      perMessageDeflate: false, // Disable compression for stability
    };

    super(address, protocols, enhancedOptions);
    
    // Add comprehensive error handling without property modification
    this.on('error', (error) => {
      // Safe error logging without modifying readonly properties
      const errorInfo = {
        message: error.message || 'Unknown WebSocket error',
        code: (error as any).code || 'unknown',
        type: error.constructor.name || 'Error',
        address: address,
        retryCount: this.retryCount
      };
      
      logger.error('WebSocket connection error:', errorInfo);
      
      // Prevent the error from bubbling up as uncaught
      // The Neon package will handle reconnection logic
    });
    
    this.on('close', (code, reason) => {
      if (code !== 1000) { // 1000 is normal closure
        logger.warn('WebSocket connection closed unexpectedly:', {
          code,
          reason: reason ? reason.toString() : 'No reason provided',
          address: address,
          retryCount: this.retryCount
        });
      }
    });

    // Add connection established handler
    this.on('open', () => {
      this.retryCount = 0; // Reset retry count on successful connection
      logger.debug('WebSocket connection established successfully', { address });
    });

    // Add ping/pong handling for connection stability
    this.on('ping', () => {
      this.pong();
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

// Configure database connection with increased pool size for stability
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  // Increased pool settings for better connection availability
  max: 30, // Increased from 5 to 30 for improved connection availability
  min: 1, // Minimum connections to maintain
  idleTimeoutMillis: 15000, // Close idle connections after 15 seconds (reduced from 30s)
  connectionTimeoutMillis: 3000, // Reduced connection timeout for faster failure detection
  maxUses: 1000, // Connection refresh after 1000 uses to prevent memory leaks
  acquireTimeoutMillis: 5000, // Timeout for acquiring connection from pool
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
    if (pool.totalCount > 25) { // Warn if approaching max connections (25 out of 30)
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
