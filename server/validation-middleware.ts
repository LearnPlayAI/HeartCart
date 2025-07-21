/**
 * Request Validation Middleware for HeartCart API
 * 
 * This module provides standardized request validation for all API endpoints,
 * using Zod schemas to ensure consistent validation across the application.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodType, ZodError } from 'zod';
import { ValidationError } from './error-handler';

type RequestPart = 'body' | 'query' | 'params';

/**
 * Validate request parts (body, query, params) against Zod schemas
 * 
 * @param schemas Object containing Zod schemas for different parts of the request
 * @returns Middleware function for Express
 */
export function validateRequest(schemas: {
  body?: ZodType<any>;
  query?: ZodType<any>;
  params?: ZodType<any>;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationErrors: Record<RequestPart, Record<string, string>> = {
        body: {},
        query: {},
        params: {}
      };
      
      let hasErrors = false;
      
      // Validate request body if schema provided
      if (schemas.body) {
        try {
          req.body = schemas.body.parse(req.body);
        } catch (error) {
          if (error instanceof ZodError) {
            validationErrors.body = formatZodErrors(error);
            hasErrors = true;
          } else {
            throw error;
          }
        }
      }
      
      // Validate query parameters if schema provided
      if (schemas.query) {
        try {
          req.query = schemas.query.parse(req.query);
        } catch (error) {
          if (error instanceof ZodError) {
            validationErrors.query = formatZodErrors(error);
            hasErrors = true;
          } else {
            throw error;
          }
        }
      }
      
      // Validate route parameters if schema provided
      if (schemas.params) {
        try {
          req.params = schemas.params.parse(req.params);
        } catch (error) {
          if (error instanceof ZodError) {
            validationErrors.params = formatZodErrors(error);
            hasErrors = true;
          } else {
            throw error;
          }
        }
      }
      
      if (hasErrors) {
        // Create validation error with all collected error messages
        throw new ValidationError('Request validation failed', validationErrors);
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Format Zod errors into a more readable object format
 * 
 * @param error ZodError to format
 * @returns Object with error messages keyed by path
 */
function formatZodErrors(error: ZodError): Record<string, string> {
  return error.errors.reduce((acc, err) => {
    const path = err.path.join('.');
    acc[path] = err.message;
    return acc;
  }, {} as Record<string, string>);
}

/**
 * Common validation schemas for reuse across endpoints
 */
import { z } from 'zod';

export const idSchema = z.object({
  id: z.coerce.number().int().positive()
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const slugSchema = z.object({
  slug: z.string().min(1)
});

/**
 * Create parameter validation schema with required ID
 * 
 * @param paramName Name of the parameter (default: 'id')
 * @returns Zod schema for validating ID parameter
 */
export function createIdParamSchema(paramName: string = 'id') {
  return z.object({
    [paramName]: z.coerce.number().int().positive()
  });
}

/**
 * Create parameter validation schema with required slug
 * 
 * @param paramName Name of the parameter (default: 'slug') 
 * @returns Zod schema for validating slug parameter
 */
export function createSlugParamSchema(paramName: string = 'slug') {
  return z.object({
    [paramName]: z.string().min(1)
  });
}

/**
 * Common query parameter validation schemas
 */
export const searchQuerySchema = z.object({
  query: z.string().min(1).max(100),
  ...paginationSchema.shape
});

export const filterQuerySchema = z.object({
  category: z.coerce.number().int().positive().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sortBy: z.enum(['price', 'name', 'newest', 'popularity']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  ...paginationSchema.shape
});