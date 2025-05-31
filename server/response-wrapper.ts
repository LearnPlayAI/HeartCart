/**
 * Response Wrapper Middleware for TeeMeYou
 * 
 * This module provides a middleware to consistently wrap API responses in our standard format.
 * It ensures that all HTTP responses follow the same structure, making the API more predictable.
 */

import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendError } from './api-response';

/**
 * Middleware to wrap all API responses in a standard format
 */
export function responseWrapperMiddleware(req: Request, res: Response, next: NextFunction) {
  // Save original res.json method
  const originalJson = res.json;
  const originalSend = res.send;
  
  // Override res.json method
  res.json = function(body) {
    // Skip if the response is already in our standard format
    if (body && (typeof body === 'object') && ('success' in body)) {
      return originalJson.call(this, body);
    }
    
    // Handle 204 No Content
    if (body === undefined || body === null || (typeof body === 'object' && Object.keys(body).length === 0)) {
      if (res.statusCode === 204) {
        return originalJson.call(this, { success: true });
      }
    }
    
    // Wrap response in standard format
    const standardResponse = {
      success: res.statusCode >= 200 && res.statusCode < 300,
      data: body
    };
    
    return originalJson.call(this, standardResponse);
  };
  
  // Override res.send to handle non-JSON responses
  res.send = function(body) {
    const contentType = res.get('Content-Type');
    // If not a JSON response, just use original send
    if (typeof body !== 'object' || 
        contentType?.includes('text/') || 
        contentType?.includes('application/pdf') ||
        contentType?.includes('image/') ||
        contentType?.includes('video/') ||
        contentType?.includes('audio/')) {
      return originalSend.call(this, body);
    }
    
    // Otherwise, use our wrapped json method
    return res.json(body);
  };
  
  next();
}

/**
 * Helper function to wrap a route handler with standardized response handling
 */
export function withStandardResponse<T>(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await handler(req, res, next);
      
      // If the handler has already sent a response, just return
      if (res.headersSent) {
        return;
      }
      
      // Handle pagination if meta was provided
      if (result && typeof result === 'object' && 'data' in result && 'meta' in result) {
        // @ts-ignore - we know it has the right shape
        sendSuccess(res, result.data, 200, result.meta);
        return;
      }
      
      // Otherwise, send standard success response
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Helper for creating a paginated response
 */
export function createPaginatedResponse<T>(
  data: T[], 
  page: number, 
  limit: number, 
  total: number
) {
  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}