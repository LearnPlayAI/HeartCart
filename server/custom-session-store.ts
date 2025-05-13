/**
 * Custom PostgreSQL Session Store
 * 
 * This module provides a custom session store that works with text-based date fields
 * in the PostgreSQL database.
 */
import connectPg from 'connect-pg-simple';
import session from 'express-session';
import { Pool } from '@neondatabase/serverless';
import { logger } from './logger';

// Create the custom store function
export function createCustomPgSessionStore(pool: Pool): session.Store {
  // Get the base PostgreSQL session store
  const PostgresSessionStore = connectPg(session);
  
  // Create a store instance
  const store = new PostgresSessionStore({
    pool,
    tableName: 'session',
    createTableIfMissing: true,
    // Disable automatic pruning, we'll handle it manually
    pruneSessionInterval: false,
  });

  // Start a manual pruning interval
  const pruneInterval = setInterval(() => {
    try {
      // Custom implementation to handle text dates
      pool.query('DELETE FROM session WHERE expire < $1', [new Date().toISOString()])
        .catch(error => {
          logger.error('Error pruning sessions with custom query', { error });
        });
    } catch (error) {
      logger.error('Error in manual session pruning', { error });
    }
  }, 60 * 1000); // Run every 60 seconds

  // Add cleanup to prevent memory leaks
  const originalClose = store.close;
  // @ts-ignore - Method signature differences
  store.close = function() {
    clearInterval(pruneInterval);
    if (originalClose) {
      return originalClose.call(this);
    }
  };

  return store;
}