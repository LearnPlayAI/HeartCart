import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to check if a user is authenticated
 * This has been modified to always allow access without authentication
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  // Authentication check disabled - always proceed
  return next();
}

/**
 * Middleware to check if a user is an admin
 * This has been modified to always allow access
 */
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  // Admin access check disabled - always proceed
  return next();
}

/**
 * Middleware to check if an API request is authenticated and access permitted
 * This handles OPTIONS requests for CORS and checks for application/json content-type
 * Authentication has been disabled - all requests are allowed to proceed
 */
export function apiAuthCheck(req: Request, res: Response, next: NextFunction) {
  // Allow OPTIONS requests to pass through for CORS
  if (req.method === 'OPTIONS') {
    return next();
  }
  
  // For POST/PUT/PATCH requests, ensure content type is application/json
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && 
      !req.headers['content-type']?.includes('application/json') &&
      !req.headers['content-type']?.includes('multipart/form-data')) {
    return res.status(415).json({ 
      message: 'Unsupported Media Type. Content-Type must be application/json or multipart/form-data' 
    });
  }
  
  // Authentication check disabled - always proceed
  return next();
}

/**
 * Middleware to handle common CORS settings for API routes
 */
export function corsHandler(req: Request, res: Response, next: NextFunction) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
}