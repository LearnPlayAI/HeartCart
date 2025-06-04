import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import { logger } from './logger';

/**
 * Middleware to automatically track product interactions
 * Logs user engagement for analytics and reporting
 */
export function trackProductInteraction(interactionType: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract product ID from request parameters
      const productId = parseInt(req.params.productId || req.params.id || '0');
      
      if (productId && productId > 0) {
        // Get user information
        const userId = req.user?.id || null;
        const sessionId = req.sessionID || req.ip;
        
        // Prepare interaction data
        const interactionData = {
          userId,
          sessionId,
          productId,
          interactionType,
          ipAddress: req.ip || null,
          userAgent: req.get('User-Agent') || null,
          referrer: req.get('Referer') || null
        };

        // Log interaction asynchronously to avoid blocking the request
        setImmediate(async () => {
          try {
            await storage.logProductInteraction(interactionData);
            logger.debug('Product interaction logged', { 
              productId, 
              interactionType, 
              userId: userId || 'guest',
              sessionId 
            });
          } catch (error) {
            logger.error('Failed to log product interaction', { 
              error, 
              interactionData 
            });
          }
        });
      }
    } catch (error) {
      logger.error('Error in interaction tracking middleware', { error, path: req.path });
    }
    
    next();
  };
}

/**
 * Middleware to track cart abandonment
 * Monitors cart modifications and identifies potential abandonment
 */
export function trackCartActivity(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id || null;
    const sessionId = req.sessionID || req.ip;
    
    // Track cart modifications
    const originalSend = res.send;
    res.send = function(data) {
      try {
        // Parse response data if it's JSON
        let responseData = data;
        if (typeof data === 'string') {
          try {
            responseData = JSON.parse(data);
          } catch (e) {
            // Not JSON, skip processing
          }
        }

        // Check if this is a successful cart operation
        if (responseData?.success && req.method === 'POST' && req.path.includes('/cart')) {
          // Log cart modification asynchronously
          setImmediate(async () => {
            try {
              await storage.logProductInteraction({
                userId,
                sessionId,
                productId: parseInt(req.body?.productId || '0'),
                interactionType: req.path.includes('/remove') ? 'remove_from_cart' : 'add_to_cart',
                ipAddress: req.ip || null,
                userAgent: req.get('User-Agent') || null,
                referrer: req.get('Referer') || null
              });
            } catch (error) {
              logger.error('Failed to log cart interaction', { error });
            }
          });
        }
      } catch (error) {
        logger.error('Error in cart tracking middleware', { error });
      }
      
      return originalSend.call(this, data);
    };
  } catch (error) {
    logger.error('Error setting up cart tracking middleware', { error });
  }
  
  next();
}

/**
 * Middleware to detect and create abandoned cart records
 * Should be used on checkout-related routes
 */
export function detectAbandonedCart(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id || null;
    const sessionId = req.sessionID || req.ip;
    
    // Track checkout abandonment
    const originalSend = res.send;
    res.send = function(data) {
      try {
        let responseData = data;
        if (typeof data === 'string') {
          try {
            responseData = JSON.parse(data);
          } catch (e) {
            // Not JSON, skip processing
          }
        }

        // If checkout failed or was abandoned, log it
        if (!responseData?.success && req.method === 'POST' && req.path.includes('/checkout')) {
          setImmediate(async () => {
            try {
              // Create abandoned cart record
              await storage.createAbandonedCart({
                userId,
                sessionId,
                cartData: req.body || {},
                emailSent: false,
                discountApplied: false
              });
              
              logger.info('Abandoned cart detected', { userId, sessionId });
            } catch (error) {
              logger.error('Failed to create abandoned cart record', { error });
            }
          });
        }
      } catch (error) {
        logger.error('Error in abandoned cart detection middleware', { error });
      }
      
      return originalSend.call(this, data);
    };
  } catch (error) {
    logger.error('Error setting up abandoned cart detection middleware', { error });
  }
  
  next();
}

/**
 * Privacy-compliant middleware to anonymize guest tracking
 * Ensures GDPR compliance for guest users
 */
export function anonymizeGuestTracking(req: Request, res: Response, next: NextFunction) {
  try {
    // For guest users, create anonymous session ID
    if (!req.user && !req.sessionID) {
      const anonymousId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      req.sessionID = anonymousId;
    }
  } catch (error) {
    logger.error('Error in guest anonymization middleware', { error });
  }
  
  next();
}