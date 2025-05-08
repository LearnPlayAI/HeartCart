/**
 * Standard API Response Utilities
 * 
 * This module provides standard response formatting functions for API endpoints
 * to ensure consistent response structure across the application.
 */

import { Response } from 'express';
import { logger } from './logger';

export interface StandardApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

/**
 * Send a successful response with standardized structure
 */
export function sendSuccess<T>(
  res: Response, 
  data: T, 
  statusCode: number = 200,
  meta?: StandardApiResponse<T>['meta']
): void {
  const response: StandardApiResponse<T> = {
    success: true,
    data,
    ...(meta && { meta })
  };
  
  res.status(statusCode).json(response);
}

/**
 * Send an error response with standardized structure
 */
export function sendError(
  res: Response,
  message: string,
  statusCode: number = 400,
  code?: string,
  details?: unknown
): void {
  const response: StandardApiResponse<never> = {
    success: false,
    error: {
      message,
      ...(code && { code }),
      ...(details && { details })
    }
  };

  logger.error(`API Error: ${message}`, { 
    statusCode, 
    errorCode: code,
    ...(details && { details })
  });
  
  res.status(statusCode).json(response);
}

/**
 * Format pagination metadata
 */
export function getPaginationMeta(page: number, limit: number, total: number): StandardApiResponse<unknown>['meta'] {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages
  };
}

/**
 * Parse pagination parameters from request query
 */
export function parsePaginationParams(query: any): { page: number; limit: number } {
  const page = parseInt(query.page as string) || 1;
  const limit = parseInt(query.limit as string) || 10;
  
  return {
    page: Math.max(1, page), // Ensure page is at least 1
    limit: Math.min(Math.max(1, limit), 100) // Ensure limit is between 1 and 100
  };
}