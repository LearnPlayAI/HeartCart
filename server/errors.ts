/**
 * Custom error classes for the application
 */

/**
 * Base application error class
 */
export class AppError extends Error {
  code: string;
  statusCode: number;
  details?: unknown;

  constructor(message: string, code: string = 'INTERNAL_ERROR', statusCode: number = 500, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    
    // This is required for correct working with instanceof in TypeScript
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', resourceType: string = 'resource') {
    super(message, `NOT_FOUND_${resourceType.toUpperCase()}`, 404);
    
    // This is required for correct working with instanceof in TypeScript
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
    
    // This is required for correct working with instanceof in TypeScript
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401);
    
    // This is required for correct working with instanceof in TypeScript
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Authorization error (403)
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden') {
    super(message, 'FORBIDDEN_ERROR', 403);
    
    // This is required for correct working with instanceof in TypeScript
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * Conflict error (409)
 */
export class ConflictError extends AppError {
  constructor(message: string, resourceType: string = 'resource') {
    super(message, `CONFLICT_${resourceType.toUpperCase()}`, 409);
    
    // This is required for correct working with instanceof in TypeScript
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 'RATE_LIMIT_ERROR', 429);
    
    // This is required for correct working with instanceof in TypeScript
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Service unavailable error (503)
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, 'SERVICE_UNAVAILABLE', 503);
    
    // This is required for correct working with instanceof in TypeScript
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }
}