/**
 * Product Wizard Redirects
 * 
 * This module handles redirects from legacy product management routes to the new wizard.
 * Part of the phased deployment plan for the new product wizard.
 */

import { Express, Request, Response, NextFunction } from 'express';

// Feature flag for controlling redirects
const REDIRECT_ENABLED = process.env.ENABLE_PRODUCT_WIZARD_REDIRECTS === 'true';

/**
 * Checks if redirects should be applied based on feature flags and user preferences
 * 
 * @param req Express request object
 * @returns boolean indicating if redirect should be applied
 */
function shouldApplyRedirect(req: Request): boolean {
  // Check master feature flag
  if (!REDIRECT_ENABLED) {
    return false;
  }
  
  // Check for opt-out cookie
  const optOut = req.cookies['legacy_product_management'];
  if (optOut === 'true') {
    return false;
  }
  
  // Could add more sophisticated logic here based on user preferences,
  // A/B testing groups, or account-level settings
  
  return true;
}

/**
 * Registers all product wizard redirects with the Express app
 * 
 * @param app Express application instance
 */
export function registerProductWizardRedirects(app: Express): void {
  // Redirect from legacy product creation page to new wizard
  app.get('/admin/products/create', (req: Request, res: Response, next: NextFunction) => {
    if (shouldApplyRedirect(req)) {
      // Get any query parameters to preserve
      const queryString = Object.entries(req.query)
        .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
        .join('&');
      
      const redirectUrl = `/admin/product-wizard-new${queryString ? `?${queryString}` : ''}`;
      
      return res.redirect(302, redirectUrl);
    }
    
    // If redirect shouldn't be applied, continue to legacy route
    next();
  });
  
  // Redirect from legacy product edit page to new wizard edit
  app.get('/admin/products/edit/:id', (req: Request, res: Response, next: NextFunction) => {
    if (shouldApplyRedirect(req)) {
      const productId = req.params.id;
      return res.redirect(302, `/admin/product-edit/${productId}`);
    }
    
    next();
  });
  
  // Add button to legacy UI to try new experience
  app.use('/admin/products*', (req: Request, res: Response, next: NextFunction) => {
    // Inject flag for template to show "Try new experience" button
    // This assumes you have res.locals available for template rendering
    res.locals = res.locals || {};
    res.locals.showNewExperienceBanner = true;
    next();
  });
}

/**
 * Middleware to allow users to opt out of redirects and use legacy pages
 * Sets a cookie that will be checked by shouldApplyRedirect
 */
export function legacyOptOutMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.query.useLegacy === 'true') {
    // Set cookie to opt out of redirects
    res.cookie('legacy_product_management', 'true', {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
      httpOnly: true,
      sameSite: 'strict'
    });
  } else if (req.query.useLegacy === 'false') {
    // Clear opt-out cookie
    res.clearCookie('legacy_product_management');
  }
  
  next();
}