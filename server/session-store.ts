/**
 * Custom PostgreSQL Session Store
 * 
 * This store extends the connect-pg-simple session store to handle
 * text-based date formats in the database.
 */
import connectPg from 'connect-pg-simple';
import session from 'express-session';
import { Pool } from '@neondatabase/serverless';
import { logger } from './logger';

// Create the custom store class
export function createCustomPgSessionStore(pool: Pool): session.Store {
  // Get the base PostgreSQL session store
  const PostgresSessionStore = connectPg(session);
  
  // Create a store instance
  const store = new PostgresSessionStore({
    pool,
    tableName: 'session',
    createTableIfMissing: true,
    pruneSessionInterval: false, // Disable automatic pruning, we'll handle it manually
  });

  // Override the pruneSessions method to handle text-based dates
  const originalPruneSessions = store.pruneSessions;
  store.pruneSessions = function customPruneSessions(fn?: (err?: Error) => void) {
    // Use a custom query to prune sessions with text-based expire field
    this.query(
      'DELETE FROM ' + this.quotedTable() + ' WHERE expire < $1',
      [new Date().toISOString()],
      (err) => {
        if (fn && typeof fn === 'function') {
          return fn(err);
        }
        
        if (err) {
          logger.error('Error pruning sessions', { error: err });
        }
      }
    );
  };

  // Set up manual pruning interval
  const pruneInterval = setInterval(() => {
    try {
      store.pruneSessions();
    } catch (error) {
      logger.error('Error in manual session pruning', { error });
    }
  }, 60 * 1000); // Run every 60 seconds

  // Add cleanup to prevent memory leaks
  const originalClose = store.close;
  store.close = function customClose() {
    clearInterval(pruneInterval);
    if (originalClose) {
      return originalClose.call(this);
    }
  };

  return store;
}