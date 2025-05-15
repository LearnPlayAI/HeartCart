/**
 * Logger Module for TeeMeYou
 * 
 * Provides standardized logging functionality across the application.
 * Designed to be configurable for different environments and easily extendable.
 */

import { createSASTDate } from '@shared/date-utils';

// Log levels in order of severity
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

// Default log level based on environment
const DEFAULT_LOG_LEVEL = process.env.NODE_ENV === 'production' 
  ? LogLevel.INFO 
  : LogLevel.DEBUG;

// Current log level (can be configured at runtime)
let currentLogLevel = Number(process.env.LOG_LEVEL ?? DEFAULT_LOG_LEVEL);

/**
 * Log entry format
 */
interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: Record<string, any>;
}

/**
 * Format a log entry as a JSON string
 */
function formatLogEntry(level: LogLevel, message: string, context?: Record<string, any>): string {
  const levelLabels = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
  
  const entry: LogEntry = {
    timestamp: createSASTDate().toISOString(),
    level: levelLabels[level],
    message,
    ...(context && { context }),
  };
  
  return JSON.stringify(entry);
}

/**
 * Write log entry to the appropriate output
 */
function writeLog(level: LogLevel, message: string, context?: Record<string, any>): void {
  // Skip logging if below current log level
  if (level < currentLogLevel) return;
  
  const formattedLog = formatLogEntry(level, message, context);
  
  switch (level) {
    case LogLevel.DEBUG:
    case LogLevel.INFO:
      console.log(formattedLog);
      break;
    case LogLevel.WARN:
      console.warn(formattedLog);
      break;
    case LogLevel.ERROR:
    case LogLevel.FATAL:
      console.error(formattedLog);
      break;
  }
}

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, context?: Record<string, any>): void;
  info(message: string, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  error(message: string, context?: Record<string, any> | Error): void;
  fatal(message: string, context?: Record<string, any> | Error): void;
  setLogLevel(level: LogLevel): void;
  getLogLevel(): LogLevel;
}

/**
 * Create a logger instance
 */
function createLogger(): Logger {
  return {
    debug(message: string, context?: Record<string, any>): void {
      writeLog(LogLevel.DEBUG, message, context);
    },
    
    info(message: string, context?: Record<string, any>): void {
      writeLog(LogLevel.INFO, message, context);
    },
    
    warn(message: string, context?: Record<string, any>): void {
      writeLog(LogLevel.WARN, message, context);
    },
    
    error(message: string, contextOrError?: Record<string, any> | Error): void {
      let context: Record<string, any> | undefined;
      
      // Handle Error objects
      if (contextOrError instanceof Error) {
        context = {
          errorName: contextOrError.name,
          errorMessage: contextOrError.message,
          stack: contextOrError.stack,
        };
      } else {
        context = contextOrError;
      }
      
      writeLog(LogLevel.ERROR, message, context);
    },
    
    fatal(message: string, contextOrError?: Record<string, any> | Error): void {
      let context: Record<string, any> | undefined;
      
      // Handle Error objects
      if (contextOrError instanceof Error) {
        context = {
          errorName: contextOrError.name,
          errorMessage: contextOrError.message,
          stack: contextOrError.stack,
        };
      } else {
        context = contextOrError;
      }
      
      writeLog(LogLevel.FATAL, message, context);
    },
    
    setLogLevel(level: LogLevel): void {
      currentLogLevel = level;
    },
    
    getLogLevel(): LogLevel {
      return currentLogLevel;
    },
  };
}

// Create and export the default logger instance
export const logger = createLogger();

// Export a factory function for creating additional loggers if needed
export function createNamedLogger(name: string): Logger {
  const baseLogger = createLogger();
  
  // Wrap methods to include the logger name in the context
  return {
    debug(message: string, context?: Record<string, any>): void {
      baseLogger.debug(message, { ...context, logger: name });
    },
    info(message: string, context?: Record<string, any>): void {
      baseLogger.info(message, { ...context, logger: name });
    },
    warn(message: string, context?: Record<string, any>): void {
      baseLogger.warn(message, { ...context, logger: name });
    },
    error(message: string, contextOrError?: Record<string, any> | Error): void {
      if (contextOrError instanceof Error) {
        baseLogger.error(message, { errorObj: contextOrError, logger: name });
      } else {
        baseLogger.error(message, { ...contextOrError, logger: name });
      }
    },
    fatal(message: string, contextOrError?: Record<string, any> | Error): void {
      if (contextOrError instanceof Error) {
        baseLogger.fatal(message, { errorObj: contextOrError, logger: name });
      } else {
        baseLogger.fatal(message, { ...contextOrError, logger: name });
      }
    },
    setLogLevel: baseLogger.setLogLevel,
    getLogLevel: baseLogger.getLogLevel,
  };
}