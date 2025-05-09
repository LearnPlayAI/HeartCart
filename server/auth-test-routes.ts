/**
 * Authentication Testing Routes
 * 
 * This module adds routes for testing and validating the authentication system.
 * These routes are protected and only available in development mode for security reasons.
 */

import { Express, Request, Response } from 'express';
import { storage } from "./storage";
import { isAdmin } from "./auth-middleware";
import { sendSuccess, sendError } from "./api-response";
import { logger } from "./logger";
import { 
  validatePasswordFormat,
  validateCredentials,
  testSessionPersistence,
  testSessionTimeout,
  runAuthSystemTests,
  executeLocalTest
} from "./utils/auth-test-utils";

/**
 * Register all authentication testing routes
 * @param app - Express application instance
 */
export function registerAuthTestRoutes(app: Express): void {
  // Only register these routes in development mode
  if (process.env.NODE_ENV !== 'development') {
    logger.info('Auth test routes not registered in production mode');
    return;
  }
  
  logger.info('Registering authentication testing routes');
  
  // Test password validation
  app.post("/api/auth-test/validate-password", isAdmin, async (req: Request, res: Response) => {
    try {
      const { password } = req.body;
      
      if (!password) {
        return sendError(res, "Password is required", 400);
      }
      
      const result = validatePasswordFormat(password);
      return sendSuccess(res, result);
    } catch (error) {
      logger.error('Error testing password validation', { error });
      return sendError(res, "Internal server error", 500);
    }
  });
  
  // Test credential validation without login
  app.post("/api/auth-test/validate-credentials", isAdmin, async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return sendError(res, "Email and password are required", 400);
      }
      
      const result = await validateCredentials(email, password);
      return sendSuccess(res, result);
    } catch (error) {
      logger.error('Error testing credential validation', { error });
      return sendError(res, "Internal server error", 500);
    }
  });
  
  // Test session persistence
  app.get("/api/auth-test/session-persistence", isAdmin, async (req: Request, res: Response) => {
    try {
      const result = testSessionPersistence(req);
      return sendSuccess(res, result);
    } catch (error) {
      logger.error('Error testing session persistence', { error });
      return sendError(res, "Internal server error", 500);
    }
  });
  
  // Test session timeout
  app.get("/api/auth-test/session-timeout", isAdmin, async (req: Request, res: Response) => {
    try {
      if (!req.session) {
        return sendError(res, "No active session", 400);
      }
      
      const result = testSessionTimeout(req.session);
      return sendSuccess(res, result);
    } catch (error) {
      logger.error('Error testing session timeout', { error });
      return sendError(res, "Internal server error", 500);
    }
  });
  
  // Run comprehensive auth system tests
  app.get("/api/auth-test/system-tests", isAdmin, async (req: Request, res: Response) => {
    try {
      const result = await runAuthSystemTests();
      return sendSuccess(res, result);
    } catch (error) {
      logger.error('Error running auth system tests', { error });
      return sendError(res, "Internal server error", 500);
    }
  });
  
  // Get user count for testing user operations
  app.get("/api/auth-test/user-count", isAdmin, async (req: Request, res: Response) => {
    try {
      const count = await storage.getUserCount();
      return sendSuccess(res, { count });
    } catch (error) {
      logger.error('Error getting user count', { error });
      return sendError(res, "Internal server error", 500);
    }
  });
  
  // Local test endpoint - no authentication required
  // Only available in development mode for basic system testing
  app.get("/api/auth-test/local", async (req: Request, res: Response) => {
    try {
      const result = await executeLocalTest();
      return sendSuccess(res, result);
    } catch (error) {
      logger.error('Error running local authentication test', { error });
      return sendError(res, "Internal server error", 500);
    }
  });
}