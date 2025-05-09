/**
 * Validation Middleware for API Requests
 * 
 * This middleware provides Zod schema validation for API request components
 * (body, query, params) to ensure consistent data validation throughout the application.
 */

import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { logger } from '../logger';

/**
 * Interface for specifying which parts of the request to validate
 */
interface ValidateOptions {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}

/**
 * Middleware that validates request components against Zod schemas
 * @param schemas - Object containing schemas for body, query, and/or params
 * @returns Express middleware function
 */
export const validateRequest = (schemas: ValidateOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body if schema provided
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      
      // Validate request query parameters if schema provided
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      
      // Validate request URL parameters if schema provided
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format ZodError messages for better readability
        const formattedErrors = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message
        }));
        
        logger.warn('Request validation failed', { 
          path: req.path, 
          errors: formattedErrors 
        });
        
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: formattedErrors
          }
        });
      }
      
      // For non-validation errors, pass to the next error handler
      next(error);
    }
  };
};

/**
 * Higher-order middleware to validate specifically for authentication routes
 * Adds additional authentication-specific logging and error handling
 * @param schema - Zod schema for validating the request body
 * @returns Express middleware function
 */
export const validateAuthRequest = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract credentials for validation
      const { email } = req.body;
      
      // Log authentication attempt (without sensitive data)
      logger.debug('Authentication request validation', { 
        path: req.path,
        email: email || '<not provided>'
      });
      
      // Validate the request body
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format ZodError messages for better readability
        const formattedErrors = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message
        }));
        
        // Special handling for authentication validation errors
        logger.warn('Authentication validation failed', { 
          path: req.path, 
          errors: formattedErrors 
        });
        
        // Use generic error message for auth failures for security
        return res.status(400).json({
          success: false,
          error: {
            message: 'Please provide valid credentials',
            code: 'AUTH_VALIDATION_ERROR',
            details: formattedErrors
          }
        });
      }
      
      // For non-validation errors, pass to the next error handler
      next(error);
    }
  };
};