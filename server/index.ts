import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setSessionTimezone } from "./db";
import { SAST_TIMEZONE } from "@shared/date-utils";
import { errorHandlerMiddleware, notFoundMiddleware } from "./error-handler";
import { logger } from "./logger";
import crypto from "crypto";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Set database timezone to SAST at server startup
setSessionTimezone()
  .then(() => {
    logger.info(`Database timezone set to ${SAST_TIMEZONE}`);
  })
  .catch(error => {
    logger.error(`Failed to set database timezone`, error);
  });

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

  // Log request details
  if (path.startsWith("/api")) {
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('X-Request-ID', requestId);
    
    logger.debug(`API Request: ${req.method} ${path}`, {
      method: req.method,
      path,
      query: req.query,
      requestId,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
  }

  // Log response details when request completes
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Log to our structured logger
      const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
      
      const logContext = {
        method: req.method,
        path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        requestId: res.getHeader('X-Request-ID'),
      };
      
      if (res.statusCode >= 500) {
        logger.error(`API Error: ${req.method} ${path} ${res.statusCode} in ${duration}ms`, logContext);
      } else if (res.statusCode >= 400) {
        logger.warn(`API Warning: ${req.method} ${path} ${res.statusCode} in ${duration}ms`, logContext);
      } else {
        logger.debug(`API Success: ${req.method} ${path} ${res.statusCode} in ${duration}ms`, logContext);
      }
      
      // Keep the existing console log for compatibility
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Apply 404 handler for undefined routes
  app.use(notFoundMiddleware);
  
  // Apply global error handler middleware
  app.use(errorHandlerMiddleware);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    logger.info(`Server started successfully on port ${port}`);
    log(`serving on port ${port}`);
  });
})();
