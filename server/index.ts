import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setSessionTimezone } from "./db";
import { SAST_TIMEZONE } from "@shared/date-utils";
import { errorHandlerMiddleware, notFoundMiddleware } from "./error-handler";
import { logger } from "./logger";
import { handleProductSocialPreview, handleProductSocialImage } from "./social-preview-service";
import { injectProductMetaTags } from "./product-meta-injection";
import crypto from "crypto";

// YoCo environment is now controlled via admin settings page
// No longer dependent on NODE_ENV - see /admin/settings for YoCo environment toggle

// Add global error handling to prevent server crashes
process.on('uncaughtException', (error) => {
  // Enhanced error handling for database connection issues
  const isDatabaseError = error.stack?.includes('@neondatabase/serverless') || 
                         error.stack?.includes('WebSocket') ||
                         error.message?.includes('Cannot set property message') ||
                         error.message?.includes('which has only a getter');
  
  if (isDatabaseError) {
    logger.warn('Database connection error caught - server will continue operating', {
      error: error.message,
      type: error.constructor.name,
      source: 'database_connection',
      timestamp: new Date().toISOString()
    });
    
    // For database connection errors, we don't want to log the full stack trace
    // as it contains sensitive connection information
    console.error('DATABASE CONNECTION ERROR (handled):', error.message);
  } else {
    logger.error('Uncaught Exception - Server will attempt to continue', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Log the error but don't exit the process
    console.error('UNCAUGHT EXCEPTION:', error);
  }
});

// Add single comprehensive unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  // Safely extract error information without modifying readonly properties
  const errorMessage = reason instanceof Error ? reason.message : String(reason);
  const errorStack = reason instanceof Error ? reason.stack : undefined;
  const errorType = reason instanceof Error ? reason.constructor.name : typeof reason;
  
  // Check for database/WebSocket related rejections
  const isDatabaseRejection = errorStack?.includes('@neondatabase/serverless') || 
                             errorStack?.includes('WebSocket') ||
                             errorMessage?.includes('Cannot set property message') ||
                             errorMessage?.includes('which has only a getter');
  
  if (isDatabaseRejection) {
    // Handle database connection errors gracefully without modifying error objects
    logger.warn('Database connection error caught - server will continue operating', {
      message: errorMessage,
      type: errorType,
      source: 'database_connection',
      timestamp: new Date().toISOString()
    });
    
    console.error('DATABASE CONNECTION ERROR (handled):', errorMessage);
  } else {
    // Handle other promise rejections
    logger.error('Unhandled Promise Rejection - Server will attempt to continue', {
      message: errorMessage,
      type: errorType,
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      timestamp: new Date().toISOString()
    });
    
    console.error('UNHANDLED REJECTION:', errorMessage);
  }
});

// Add process exit handlers for graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Content Security Policy middleware
app.use((req, res, next) => {
  const nonce = crypto.randomBytes(16).toString('base64');
  res.locals.nonce = nonce;
  
  // More permissive CSP for development environment with Vite HMR
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  const cspDirectives = [
    `default-src 'self'`,
    isDevelopment 
      ? `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com blob:` 
      : `script-src 'self' 'nonce-${nonce}' https://js.stripe.com https://checkout.stripe.com`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com data:`,
    `img-src 'self' data: blob: https: http:`,
    isDevelopment 
      ? `connect-src 'self' https://api.stripe.com https://checkout.stripe.com wss: ws: http: https:` 
      : `connect-src 'self' https://api.stripe.com https://checkout.stripe.com wss: ws:`,
    `frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com`,
    `form-action 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    isDevelopment ? '' : `upgrade-insecure-requests`
  ].filter(Boolean).join('; ');

  res.setHeader('Content-Security-Policy', cspDirectives);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN'); // Allow embedding for development
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
});

// Wait for database to be ready before starting server
async function waitForDatabase() {
  const maxAttempts = 10;
  const delayMs = 1000;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Try to set timezone - this will test if database is accessible
      await setSessionTimezone();
      logger.info("Database timezone set to Africa/Johannesburg");
      return true;
    } catch (error) {
      logger.warn(`Database connection attempt ${attempt}/${maxAttempts} failed`, {
        error: error instanceof Error ? error.message : String(error),
        attempt,
        retryingIn: attempt < maxAttempts ? `${delayMs}ms` : 'giving up'
      });
      
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  logger.error("Failed to establish database connection after maximum attempts");
  return false;
}

// API request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Capture response body for logging
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  // Minimal request logging for resource efficiency
  if (path.startsWith("/api")) {
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('X-Request-ID', requestId);
    
    // No request logging in production to save resources
    // Only log in development for debugging
    if (process.env.NODE_ENV === 'development') {
      // Only log essential info - no query params or user agent to reduce memory usage
      logger.debug(`API Request: ${req.method} ${path}`, {
        method: req.method,
        path,
        requestId
      });
    }
  }

  // Minimal response logging for resource efficiency - only log failures and errors
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Check if response indicates failure
      const isHttpError = res.statusCode >= 400;
      const isSlowRequest = duration > 5000;
      const isApiFailure = capturedJsonResponse && capturedJsonResponse.success === false;
      
      // Only log if there's an actual problem: HTTP errors, slow requests, or API failures
      const shouldLog = isHttpError || isSlowRequest || isApiFailure;
      
      if (shouldLog) {
        const logLevel = isHttpError ? 'warn' : 'info';
        
        logger[logLevel](`API ${logLevel.toUpperCase()}: ${req.method} ${path} ${res.statusCode} in ${duration}ms`, {
          method: req.method,
          path,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          isHttpError,
          isSlowRequest,
          isApiFailure
        });
      }
      
      // Keep the existing console log for compatibility (development only) - only for failures
      if (process.env.NODE_ENV === 'development' && shouldLog) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + "…";
        }

        console.log(logLine);
      }
    }
  });

  next();
});

// Add health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Add social preview routes early in the middleware chain
app.get('/api/social-preview/product/:id', handleProductSocialPreview);
app.get('/api/social-preview/product-image/:id', handleProductSocialImage);

(async () => {
  // Wait for database to be ready before starting server
  logger.info("Checking database connection...");
  const isDatabaseReady = await waitForDatabase();
  
  if (!isDatabaseReady) {
    logger.error("Cannot start server - database connection failed");
    process.exit(1);
  }
  
  // Add product meta tag injection middleware for Facebook sharing BEFORE other routes
  app.use(injectProductMetaTags);
  
  const server = await registerRoutes(app);

  // importantly only setup vite in development and after
  // setting up all the other API routes so the catch-all route
  // doesn't interfere with the API routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  
  // Apply 404 handler for any undefined routes that weren't caught by API or Vite
  app.use(notFoundMiddleware);
  
  // Apply global error handler middleware
  app.use(errorHandlerMiddleware);

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    // Only log server startup in development to reduce production noise
  if (process.env.NODE_ENV !== 'production') {
    logger.info(`Server started successfully on port ${port}`);
  }
    log(`serving on port ${port}`);
  });
})();
