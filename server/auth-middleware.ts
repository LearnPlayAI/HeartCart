import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';
import { sendError } from './api-response';
import { ErrorCode, AppError, ForbiddenError, UnauthorizedError } from './error-handler';

/**
 * Authentication status check with detailed context logging
 * @param req - Express request object
 * @returns Authentication status of current request
 */
export function checkAuthentication(req: Request): { 
  isAuthenticated: boolean; 
  user: Express.User | null;
  userId: number | null;
  userRole: string | null;
} {
  const isAuthenticated = req.isAuthenticated?.() || false;
  const user = isAuthenticated ? req.user as Express.User : null;
  
  return {
    isAuthenticated,
    user,
    userId: user?.id || null,
    userRole: user?.role || null
  };
}

/**
 * Standardized permission check for role authorization
 * @param req - Express request object
 * @param allowedRoles - Array of roles allowed to access the resource
 * @returns Whether user has necessary role permissions
 */
export function checkPermission(req: Request, allowedRoles: string[]): boolean {
  const { isAuthenticated, userRole } = checkAuthentication(req);
  
  if (!isAuthenticated || !userRole) {
    return false;
  }
  
  return allowedRoles.includes(userRole);
}

/**
 * Enhanced middleware to check if a user is authenticated
 * Includes detailed logging and standardized error responses
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction): void {
  const auth = checkAuthentication(req);
  
  if (auth.isAuthenticated) {
    // Log successful authentication
    logger.debug('Authentication check passed', { 
      userId: auth.userId,
      path: req.path,
      method: req.method
    });
    return next();
  }
  
  // Log failed authentication attempt for debugging
  logger.warn('Authentication check failed', {
    path: req.path,
    method: req.method,
    ip: req.ip
  });
  
  // Return standardized error response
  sendError(res, "Authentication required", 401);
}

/**
 * Enhanced middleware to check if a user is an admin
 * Includes detailed logging and standardized error responses
 */
export function isAdmin(req: Request, res: Response, next: NextFunction): void {
  const auth = checkAuthentication(req);
  
  if (auth.isAuthenticated && auth.userRole === 'admin') {
    // Log successful admin authorization
    logger.debug('Admin authorization check passed', { 
      userId: auth.userId,
      path: req.path,
      method: req.method
    });
    return next();
  }
  
  // If not authenticated at all
  if (!auth.isAuthenticated) {
    logger.warn('Admin authentication failed - not authenticated', {
      path: req.path,
      method: req.method,
      ip: req.ip
    });
    return sendError(res, "Authentication required", 401);
  }
  
  // If authenticated but not admin
  logger.warn('Admin authorization failed - insufficient permissions', {
    userId: auth.userId,
    userRole: auth.userRole,
    path: req.path,
    method: req.method
  });
  
  // Return standardized error response
  sendError(res, "Admin access required", 403);
}

/**
 * Enhanced middleware to check if an API request is authenticated and access permitted
 * This handles OPTIONS requests for CORS and checks for application/json content-type
 * Includes detailed logging and standardized error responses
 */
export function apiAuthCheck(req: Request, res: Response, next: NextFunction): void {
  // Allow OPTIONS requests to pass through for CORS
  if (req.method === 'OPTIONS') {
    return next();
  }
  
  // For POST/PUT/PATCH requests, ensure content type is application/json
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && 
      !req.headers['content-type']?.includes('application/json') &&
      !req.headers['content-type']?.includes('multipart/form-data')) {
    
    logger.warn('API content type check failed', {
      contentType: req.headers['content-type'],
      path: req.path,
      method: req.method
    });
    
    return sendError(res, 
      'Unsupported Media Type. Content-Type must be application/json or multipart/form-data',
      415
    );
  }
  
  // Check authentication using standardized utility
  const auth = checkAuthentication(req);
  
  if (!auth.isAuthenticated) {
    logger.warn('API authentication check failed', {
      path: req.path,
      method: req.method,
      ip: req.ip
    });
    
    return sendError(res, "Authentication required", 401);
  }
  
  // All checks passed
  logger.debug('API auth check passed', {
    userId: auth.userId,
    userRole: auth.userRole,
    path: req.path,
    method: req.method
  });
  
  next();
}

/**
 * Enhanced middleware to handle common CORS settings for API routes
 */
export function corsHandler(req: Request, res: Response, next: NextFunction): void {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
}