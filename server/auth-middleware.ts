import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to check if a user is authenticated
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated?.()) {
    return next();
  }
  
  res.status(401).json({ message: 'Authentication required' });
}

/**
 * Middleware to check if a user is an admin
 */
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated?.() && req.user && (req.user as any).isAdmin) {
    return next();
  }
  
  res.status(403).json({ message: 'Admin access required' });
}

/**
 * Middleware to check if an API request is authenticated and access permitted
 * This handles OPTIONS requests for CORS and checks for application/json content-type
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
  
  // Check authentication
  if (!req.isAuthenticated?.()) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  next();
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