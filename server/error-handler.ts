/**
 * Centralized Error Handling Module for TeeMeYou API
 * 
 * This module provides standardized error handling for all API endpoints, 
 * including consistent error response formats, proper logging, and 
 * user-friendly error messages with appropriate HTTP status codes.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { createSASTDate } from '@shared/date-utils';
import { logger } from './logger';
import { StandardApiResponse, sendError } from './api-response';

// Define a PostgresError interface to handle database errors
interface PostgresError extends Error {
  code: string;
  detail?: string;
  hint?: string;
  position?: string;
  internalQuery?: string;
  table?: string;
  column?: string;
  dataType?: string;
  constraint?: string;
  schema?: string;
  severity?: string;
}

/**
 * Standard API error response structure
 */
export interface ApiErrorResponse {
  status: 'error';
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
  path?: string;
  requestId?: string;
}

/**
 * Error codes for consistent error handling
 */
export enum ErrorCode {
  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  BAD_REQUEST = 'BAD_REQUEST',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  
  // Database related errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  UNIQUE_VIOLATION = 'UNIQUE_VIOLATION',
  FOREIGN_KEY_VIOLATION = 'FOREIGN_KEY_VIOLATION',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',
  
  // Authentication/Authorization errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Resource errors
  RESOURCE_EXISTS = 'RESOURCE_EXISTS',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  
  // File/Upload errors
  FILE_UPLOAD_ERROR = 'FILE_UPLOAD_ERROR',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  
  // Business logic errors
  INVALID_OPERATION = 'INVALID_OPERATION',
  DEPENDENT_RESOURCES_EXIST = 'DEPENDENT_RESOURCES_EXIST',
  
  // External service errors
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly isOperational: boolean;
  
  constructor(
    message: string, 
    code: string = ErrorCode.UNKNOWN_ERROR, 
    statusCode: number = 500, 
    details?: unknown,
    isOperational: boolean = true
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error class for request validation failures
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, details, true);
  }
}

/**
 * Not found error class for missing resources
 */
export class NotFoundError extends AppError {
  constructor(message: string, resourceType?: string) {
    super(
      message || `The requested ${resourceType || 'resource'} was not found`, 
      ErrorCode.NOT_FOUND, 
      404, 
      { resourceType }, 
      true
    );
  }
}

/**
 * Unauthorized error class for authentication failures
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required to access this resource') {
    super(message, ErrorCode.UNAUTHORIZED, 401, undefined, true);
  }
}

/**
 * Forbidden error class for authorization failures
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'You do not have permission to access this resource') {
    super(message, ErrorCode.FORBIDDEN, 403, undefined, true);
  }
}

/**
 * Bad Request error class for invalid input data
 */
export class BadRequestError extends AppError {
  constructor(message: string = 'Invalid request data provided') {
    super(message, ErrorCode.BAD_REQUEST, 400, undefined, true);
  }
}

/**
 * Database error class for database operation failures
 */
export class DatabaseError extends AppError {
  constructor(message: string, pgError?: PostgresError, details?: unknown) {
    // Handle specific Postgres error codes
    let errorCode = ErrorCode.DATABASE_ERROR;
    let statusCode = 500;
    
    if (pgError) {
      // Map Postgres error codes to app error codes
      switch (pgError.code) {
        case '23505': // unique_violation
          errorCode = ErrorCode.UNIQUE_VIOLATION;
          statusCode = 409; // Conflict
          break;
        case '23503': // foreign_key_violation
          errorCode = ErrorCode.FOREIGN_KEY_VIOLATION;
          statusCode = 400; // Bad Request
          break;
        case '23514': // check_violation
        case '23502': // not_null_violation
          errorCode = ErrorCode.CONSTRAINT_VIOLATION;
          statusCode = 400; // Bad Request
          break;
      }
    }
    
    super(message, errorCode, statusCode, details, true);
  }
}

/**
 * Helper to format Zod errors for better readability
 */
export function formatZodError(error: ZodError): Record<string, string> {
  return error.errors.reduce((acc, err) => {
    const path = err.path.join('.');
    acc[path] = err.message;
    return acc;
  }, {} as Record<string, string>);
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: Error | AppError,
  req: Request,
  includeDetails: boolean = process.env.NODE_ENV !== 'production'
): ApiErrorResponse {
  // Default values
  let code = ErrorCode.UNKNOWN_ERROR;
  let statusCode = 500;
  let message = 'An unexpected error occurred';
  let details: unknown = undefined;
  
  // Handle known error types
  if (error instanceof AppError) {
    code = error.code;
    statusCode = error.statusCode;
    message = error.message;
    details = includeDetails ? error.details : undefined;
  } else if (error instanceof ZodError) {
    code = ErrorCode.VALIDATION_ERROR;
    statusCode = 400;
    message = 'Validation error: Invalid request data';
    details = includeDetails ? formatZodError(error) : undefined;
  } else if (error instanceof Error && 'code' in error && typeof (error as any).code === 'string') {
    // Handle PostgresError using duck typing since it's an interface
    const pgError = error as PostgresError;
    const dbError = new DatabaseError('Database error', pgError);
    code = dbError.code;
    statusCode = dbError.statusCode;
    message = 'A database error occurred';
    details = includeDetails ? { pgError: pgError.code, pgMessage: pgError.message } : undefined;
  } else {
    // Unhandled error - log full details but return generic message
    logger.error('Unhandled error:', error);
    message = 'An unexpected error occurred';
  }
  
  return {
    status: 'error',
    code,
    message,
    details: includeDetails ? details : undefined,
    timestamp: createSASTDate().toISOString(),
    path: req.path,
    requestId: req.headers['x-request-id'] as string,
  };
}

/**
 * Global error handling middleware
 */
export function errorHandlerMiddleware(
  error: Error | AppError, 
  req: Request, 
  res: Response, 
  next: NextFunction
): void {
  // Log the error
  const isOperationalError = error instanceof AppError && error.isOperational;
  if (!isOperationalError) {
    logger.error('[UNHANDLED ERROR]', error);
  } else {
    logger.warn(`[${error instanceof AppError ? error.code : 'ERROR'}] ${error.message}`, {
      path: req.path,
      method: req.method,
      error: error instanceof AppError ? error : undefined,
    });
  }
  
  // Determine error details
  let code = ErrorCode.UNKNOWN_ERROR;
  let statusCode = 500;
  let message = 'An unexpected error occurred';
  let details: unknown = undefined;
  
  const includeDetails = process.env.NODE_ENV !== 'production';
  
  // Handle known error types
  if (error instanceof AppError) {
    code = error.code;
    statusCode = error.statusCode;
    message = error.message;
    details = includeDetails ? error.details : undefined;
  } else if (error instanceof ZodError) {
    code = ErrorCode.VALIDATION_ERROR;
    statusCode = 400;
    message = 'Validation error: Invalid request data';
    details = includeDetails ? formatZodError(error) : undefined;
  } else if (error instanceof Error && 'code' in error && typeof (error as any).code === 'string') {
    // Handle PostgresError using duck typing since it's an interface
    const pgError = error as PostgresError;
    const dbError = new DatabaseError('Database error', pgError);
    code = dbError.code;
    statusCode = dbError.statusCode;
    message = 'A database error occurred';
    details = includeDetails ? { pgError: pgError.code, pgMessage: pgError.message } : undefined;
  }
  
  // Use the standardized API response format
  sendError(res, message, statusCode, code, details);
}

/**
 * Handle 404 (Not Found) errors for undefined routes
 */
export function notFoundMiddleware(req: Request, res: Response, next: NextFunction): void {
  const message = `Route not found: ${req.method} ${req.path}`;
  sendError(res, message, 404, ErrorCode.NOT_FOUND);
}

/**
 * Async error handler to catch errors in async route handlers
 * @param fn Async route handler function
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}