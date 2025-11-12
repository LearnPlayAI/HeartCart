import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { sendError, sendSuccess } from "./api-response";
import { storage } from "./storage";
import { objectStoreAdapter } from "./object-store-adapter";
import { ZodError } from "zod";
import { logger } from "./logger";
import { db } from "./db";
import { desc, eq, sql } from "drizzle-orm";
import { databaseEmailService } from "./database-email-service";
import crypto from "crypto";
import { cleanupOrphanedDraftImages, cleanupAllOrphanedDraftImages } from "./clean-orphaned-images";
// Import AI routes separately
import aiRouter from "./ai-routes";
import debugRoutes from "./debug-routes";
import { imageService, THUMBNAIL_SIZES } from "./image-service";
import { 
  insertCartItemSchema, 
  insertOrderSchema, 
  insertOrderItemSchema,
  insertCategorySchema,
  insertProductSchema,
  orders,
  products,
  suppliers,
  insertProductImageSchema,
  insertPricingSchema,
  insertSupplierSchema,
  insertCatalogSchema,
  insertPromotionSchema,
  insertProductPromotionSchema,
  insertLogisticsCompanySchema,
  insertShippingMethodSchema
} from "@shared/schema";
import { setupAuth } from "./auth";
import { isAuthenticated, isAdmin } from "./auth-middleware";
import multer from "multer";
import path from "path";
import fs from "fs";
import fileRoutes from "./file-routes";
import uploadHandlers from "./upload-handlers";
import bannerRoutes from "./banner-routes";
import fileBrowserRoutes from "./file-browser-routes";
import registerAttributeRoutes from "./attribute-routes";
import registerProductAttributeRoutes from "./attribute-routes-product";
import registerProductDraftRoutes from "./product-draft-routes";
// Removed attributeDiscountRoutes import as part of centralized attribute system
import pricingRoutes from "./pricing-routes";
import batchUploadRoutes from "./batch-upload-routes";
import aiApiRoutes from "./routes/ai-api";
import { calculatePromotionalPricing } from "./pricing-routes";
import { orderRoutes } from "./order-routes";
import { adminRoutes } from "./admin-routes";
import paymentRoutes from "./payment-routes";
import webhookRoutes from "./yoco-webhook-routes";
import { registerAuthTestRoutes } from "./auth-test-routes";
import { registerDatabaseTestRoutes } from "./database-test-routes";
import { unifiedEmailService } from "./unified-email-service";
import { emailIntegrationRoutes } from "./email-integration-routes";
import { emailTestRoutes } from "./email-test-routes";
import { emailVerificationRoutes } from "./email-verification-endpoint";
import { registerApiTestRoutes } from "./api-test-routes";
import analyticsRoutes from "./analytics-routes";
import favouritesRoutes from "./favourites-routes";
import creditRoutes from "./credit-routes";
import supplierOrderRoutes from "./supplier-order-routes-simple";
import { registerStorageTestRoutes } from "./storage-test-routes";
import { registerFileManagerTestRoutes } from "./file-manager-test-routes";
import authEmailRoutes from "./auth-email-routes";
import simpleAuthRoutes from "./simple-auth-routes";
import seoRoutes from "./seo-routes";
import qrCodeRoutes from "./qr-code-routes";
import { validateRequest, idSchema } from './validation-middleware';
import { trackProductInteraction, trackCartActivity } from './interaction-middleware';
import { 
  productsQuerySchema,
  productSlugParamSchema,
  categoryIdParamSchema,
  idParamSchema,
  productIdParamSchema,
  createCategorySchema, 
  updateCategorySchema,
  createProductSchema,
  updateProductSchema,
  createProductImageSchema,
  updateProductImageSchema,
  productWizardCompleteSchema
} from '@shared/validation-schemas';
import { 
  asyncHandler, 
  BadRequestError, 
  ForbiddenError, 
  NotFoundError, 
  ValidationError,
  AppError,
  ErrorCode
} from "./error-handler";
import { responseWrapperMiddleware, withStandardResponse, createPaginatedResponse } from './response-wrapper';
import * as z from "zod"; // For schema validation

// Custom error handling function since handleApiError is missing
function handleApiError(error: any, res: Response) {
  logger.error('API Error:', { error });
  
  if (error instanceof NotFoundError) {
    return sendError(res, error.message, 404, 'NOT_FOUND', { entity: error.details?.resourceType });
  }
  
  if (error instanceof ValidationError) {
    return sendError(res, error.message, 400, 'VALIDATION_ERROR', error.details);
  }
  
  if (error instanceof BadRequestError) {
    return sendError(res, error.message, 400, 'BAD_REQUEST');
  }

  // Default error handling
  return sendError(res, error.message || "An unexpected error occurred", 500, 'INTERNAL_SERVER_ERROR');
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Use memory storage for file uploads to avoid local filesystem
  // Files will go directly to Replit Object Storage
  const upload = multer({ 
    storage: multer.memoryStorage(), // Use memory storage instead of disk storage
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      // Accept only images
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(null, false);
      }
    }
  });
  
  // Set up authentication with our new auth module
  setupAuth(app);
  
  // Register SEO routes VERY EARLY to prevent frontend routing from intercepting
  app.use('/', seoRoutes);
  
  // Register QR code routes
  app.use("/api", qrCodeRoutes);
  
  // Register simple auth routes early
  app.use("/api/auth", simpleAuthRoutes);
  
  // Register PDF proof endpoint BEFORE response wrapper to serve raw PDF data
  app.get('/api/orders/:id/proof', async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      logger.info(`PDF route: Looking up order ${orderId}`);
      
      const order = await storage.getOrderById(orderId);
      logger.info(`PDF route: Order found`, { order: order ? { id: order.id, eftPop: order.eftPop } : null });
      
      if (!order) {
        return res.status(404).json({ success: false, error: "Order not found" });
      }
      
      if (!order.eftPop) {
        return res.status(404).json({ success: false, error: "No proof of payment found for this order" });
      }
      
      // Get the PDF from object store
      logger.info(`PDF route: Retrieving PDF from object store`, { objectKey: order.eftPop });
      const { data: fileData } = await objectStoreAdapter.getFileAsBuffer(order.eftPop);
      logger.info(`PDF route: PDF retrieved successfully`, { size: fileData.length });
      
      // Set appropriate headers for PDF viewing
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="proof-of-payment-${order.orderNumber}.pdf"`);
      res.setHeader('Content-Length', fileData.length.toString());
      
      // Send raw PDF data directly
      res.end(fileData);
    } catch (error) {
      logger.error('PDF route error:', error);
      res.status(500).json({ success: false, error: "Failed to retrieve proof of payment" });
    }
  });
  
  // Apply response wrapper middleware to standardize API responses
  app.use(responseWrapperMiddleware);
  
  // Register payment routes for payment-first order creation
  app.use("/api/payment", paymentRoutes);
  app.use("/api/payments", paymentRoutes);
  
  // Register YoCo webhook routes
  app.use("/api/webhooks", webhookRoutes);
  
  // PUBLIC SETTINGS ENDPOINTS (no authentication required)
  // These endpoints allow all users to access certain settings for sharing functionality
  // while keeping admin-only access for editing
  
  // Get product sharing message template (PUBLIC - for all users)
  app.get("/api/settings/product_sharing_message", asyncHandler(async (req: Request, res: Response) => {
    try {
      const setting = await storage.getSystemSetting('product_sharing_message');
      
      // Default fallback template if setting doesn't exist
      const defaultTemplate = `🎯 *[PRODUCT_NAME]* 🎯

💰 *Price: R[PRICE]*

🛍️ Shop on HeartCart - South Africa's trusted online marketplace
🚚 Fast delivery across SA
💳 Secure payment options
⭐ Quality guaranteed

🇿🇦 Connect with South Africa's community

🤝 Bringing people together 🎯 Trusted community 📍 Local connections

👆 Tap to view full details and photos

[PRODUCT_URL]`;
      
      const responseData = {
        settingKey: 'product_sharing_message',
        settingValue: setting?.settingValue || defaultTemplate,
        isDefault: !setting // indicates if this is the default template
      };
      
      logger.info("Public product sharing message accessed successfully");
      return sendSuccess(res, responseData);
    } catch (error) {
      logger.error("Error fetching public product sharing message", { error });
      return sendError(res, "Failed to fetch product sharing message", 500);
    }
  }));
  
  // Add route for getting order by checkout ID (for card payments)
  app.get("/api/orders/by-checkout/:checkoutId", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    try {
      const checkoutId = req.params.checkoutId;
      
      if (!checkoutId) {
        return res.status(400).json({ success: false, error: "Checkout ID is required" });
      }

      const order = await storage.getOrderByYocoCheckoutId(checkoutId);
      if (!order) {
        return res.status(404).json({ success: false, error: "Order not found" });
      }

      // Verify order belongs to the current user (unless admin)
      if (req.user?.role !== 'admin' && order.userId !== req.user?.id) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      res.json({ success: true, data: order });
    } catch (error) {
      logger.error('Error fetching order by checkout ID:', error);
      res.status(500).json({ success: false, error: "Failed to retrieve order" });
    }
  }));

  // Register order routes (after middleware for proper error handling)
  app.use("/api/orders", orderRoutes);
  
  // Register admin routes for order management
  app.use("/api/admin", adminRoutes);
  
  // Register authentication testing routes
  registerAuthTestRoutes(app);
  
  // Register database testing routes
  registerDatabaseTestRoutes(app);
  
  // Register API testing routes
  registerApiTestRoutes(app);
  
  // Register email integration routes for authentication emails
  app.use("/api/auth", emailIntegrationRoutes);
  
  // Register auth email routes for forgot password functionality
  app.use("/api/auth", authEmailRoutes);
  
  // Register email testing routes
  app.use("/api/email-test", emailTestRoutes);
  
  // Register email verification endpoint for comprehensive testing
  app.use("/api/email-verification", emailVerificationRoutes);
  
  // Register Storage testing routes
  registerStorageTestRoutes(app);
  
  // Register File Manager testing routes
  registerFileManagerTestRoutes(app);
  
  // Credit deduction system fully operational after foreign key constraint fix
  
  // Register favourites and analytics routes
  app.use('/api', favouritesRoutes);
  
  // Mount file routes for serving files from Object Storage
  app.use('/api/files', fileRoutes);
  
  // Mount upload handler routes
  app.use('/api/upload', uploadHandlers);
  
  // Mount banner routes for marketing banner image uploads
  app.use('/api/banners', bannerRoutes);
  
  // Health check endpoint with build version for cache busting
  app.get('/api/health', asyncHandler(async (req: Request, res: Response) => {
    const buildVersion = `${Date.now()}-${process.pid}-${Math.random().toString(36).substr(2, 9)}`;
    sendSuccess(res, {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      buildVersion,
      deploymentTime: new Date().toISOString(),
      nodeVersion: process.version
    });
  }));

  // Legacy route redirects to new file serving endpoint
  app.get('/object-storage/:folder/:subfolder/:filename', async (req: Request, res: Response) => {
    const { folder, subfolder, filename } = req.params;
    const objectKey = `${folder}/${subfolder}/${filename}`;
    res.redirect(`/api/files/${objectKey}`);
  });
  
  // Error handling middleware - uses the centralized error handling from error-handler.ts
  const handleErrors = (fn: Function) => async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      // Forward all errors to the centralized error handler
      next(error);
    }
  };

  // NOTE: Authentication middleware is imported from auth-middleware.ts
  // The proper isAuthenticated and isAdmin functions should be used throughout the application
  // DO NOT override these functions locally as it breaks authentication across the system

  // CATEGORY ROUTES
  app.get("/api/categories", withStandardResponse(async (req: Request, res: Response) => {
    const { parentId, level, orderBy } = req.query;
    const user = req.user as any;
    const isAdmin = user && user.role === 'admin';
    
    const options: { parentId?: number | null; level?: number; orderBy?: 'name' | 'displayOrder'; includeInactive?: boolean } = {};
    
    // Include inactive (hidden) categories only for admins
    options.includeInactive = isAdmin;
    
    if (parentId !== undefined) {
      if (parentId === 'null') {
        options.parentId = null;
      } else {
        options.parentId = parseInt(parentId as string);
      }
    }
    
    if (level !== undefined) {
      options.level = parseInt(level as string);
    }
    
    if (orderBy === 'name' || orderBy === 'displayOrder') {
      options.orderBy = orderBy;
    }
    
    const categories = await storage.getAllCategories(options);
    return categories;
  }));
  
  // Get category attributes
  app.get("/api/categories/:categoryId/attributes", 
    validateRequest({
      params: z.object({
        categoryId: z.string().refine(val => !isNaN(parseInt(val)), { 
          message: "Category ID must be a number"
        })
      })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const categoryId = parseInt(req.params.categoryId);
        
        // Get the category to make sure it exists
        const category = await storage.getCategoryById(categoryId);
        
        if (!category) {
          throw new NotFoundError(`Category with ID ${categoryId} not found`, 'category');
        }
        
        // Debug logs removed for production - these were causing noise in production logs
        
        // Add cache control headers to ensure clients always get fresh data
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        // In a real implementation, this would query the database
        // for now we'll return mockup data for bedding category (ID 7)
        if (categoryId === 7) {
          return res.json({
            success: true,
            data: {
              1: [
                { id: 1, value: 'S', displayValue: 'Small' },
                { id: 2, value: 'M', displayValue: 'Medium' },
                { id: 3, value: 'L', displayValue: 'Large' },
                { id: 4, value: 'XL', displayValue: 'Extra Large' }
              ],
              2: [
                { id: 5, value: 'PINK', displayValue: 'Pink' },
                { id: 6, value: 'BLUE', displayValue: 'Blue' },
                { id: 7, value: 'WHITE', displayValue: 'White' }
              ]
            }
          });
        } else {
          // For other categories, return empty data
          return res.json({
            success: true,
            data: {}
          });
        }
      } catch (error) {
        logger.error("Error fetching category attributes", { 
          error, 
          categoryId: req.params.categoryId 
        });
        
        throw error;
      }
    }));
    
  // Get required attributes for a category (product-centric approach)
  app.get("/api/categories/:categoryId/required-attributes", 
    validateRequest({
      params: z.object({
        categoryId: z.string().refine(val => !isNaN(parseInt(val)), { 
          message: "Category ID must be a number"
        })
      })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const categoryId = parseInt(req.params.categoryId);
        
        // Get the category to make sure it exists
        const category = await storage.getCategoryById(categoryId);
        
        if (!category) {
          throw new NotFoundError(`Category with ID ${categoryId} not found`, 'category');
        }
        
        // Debug logs removed for production - these were causing noise in production logs
        
        // Add cache control headers to ensure clients always get fresh data
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        // For category ID 7 (Bedding), return example required attributes
        // In a real implementation, this would come from a database query
        // based on product requirements, not just category association
        if (categoryId === 7) {
          return res.json({
            success: true,
            data: [
              { 
                attributeId: 1, 
                attributeName: "Size",
                displayName: "Size", 
                attributeType: "select",
                isRequired: true
              },
              { 
                attributeId: 2, 
                attributeName: "Color",
                displayName: "Color", 
                attributeType: "select",
                isRequired: true
              },
              { 
                attributeId: 3, 
                attributeName: "Material",
                displayName: "Material", 
                attributeType: "text",
                isRequired: true
              }
            ]
          });
        } else {
          // For other categories, return empty required attributes
          return res.json({
            success: true,
            data: []
          });
        }
      } catch (error) {
        logger.error("Error fetching required product attributes", { 
          error, 
          categoryId: req.params.categoryId 
        });
        
        throw error;
      }
    }));

  // IMPORTANT: All specific named routes must come before parameterized routes
  // to prevent Express from matching parameters incorrectly
  
  app.get("/api/categories/main/with-children", withStandardResponse(async (req: Request, res: Response) => {
    const user = req.user as any;
    const isAdmin = user && user.role === 'admin';
    
    // Only include inactive categories if explicitly requested by admin for admin pages
    const forAdminPage = req.query.forAdminPage === 'true';
    const includeInactive = isAdmin && forAdminPage;
    
    const options = { includeInactive };
    const mainCategoriesWithChildren = await storage.getMainCategoriesWithChildren(options);
    return mainCategoriesWithChildren;
  }));

  // Batch update display orders for multiple categories (must come before parameterized routes)
  const batchDisplayOrderSchema = z.object({
    updates: z.array(z.object({
      id: z.number().int(),
      displayOrder: z.number().int()
    }))
  });

  app.put(
    "/api/categories/batch-display-order", 
    isAuthenticated, 
    isAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      // Validate the request body manually since we don't need params validation
      const result = batchDisplayOrderSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request data",
            details: result.error.flatten()
          }
        });
      }
      
      const { updates } = result.data;
      
      // Update all categories in batch
      const updatedCategories = await storage.batchUpdateCategoryDisplayOrder(updates);
      
      res.json({
        success: true,
        data: { updated: updatedCategories.length, categories: updatedCategories }
      });
    })
  );

  // Reorder categories endpoint - resequences all category display orders
  app.post(
    "/api/categories/reorder", 
    isAuthenticated, 
    isAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      // Reorder all categories to have sequential display order numbers
      const result = await storage.reorderAllCategories();
      
      res.json({
        success: true,
        data: result
      });
    })
  );
  
  // Parameterized routes come after specific named routes
  app.get("/api/categories/:slug", withStandardResponse(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const user = req.user as any;
    const isAdmin = user && user.role === 'admin';
    
    const options = { includeInactive: isAdmin };
    const category = await storage.getCategoryBySlug(slug, options);
    
    if (!category) {
      throw new NotFoundError(`Category with slug '${slug}' not found`, 'category');
    }
    
    return category;
  }));
  
  app.get("/api/categories/:id/with-children", withStandardResponse(async (req: Request, res: Response) => {
    const categoryId = parseInt(req.params.id);
    const user = req.user as any;
    const isAdmin = user && user.role === 'admin';
    
    // Validate categoryId is a number
    if (isNaN(categoryId)) {
      throw new BadRequestError("Invalid category ID");
    }
    
    const options = { includeInactive: isAdmin };
    const categoryWithChildren = await storage.getCategoryWithChildren(categoryId, options);
    
    if (!categoryWithChildren) {
      throw new NotFoundError(`Category with ID ${categoryId} not found`, 'category');
    }
    
    return categoryWithChildren;
  }));

  // Use validation middleware to validate requests

  app.post(
    "/api/categories", 
    isAuthenticated, 
    isAdmin, // Use the isAdmin middleware directly
    validateRequest({ body: createCategorySchema }), 
    asyncHandler(async (req: Request, res: Response) => {
      // With validation middleware, the request body is already validated and typed
      const category = await storage.createCategory(req.body);
      
      res.status(201).json(category);
    })
  );

  app.put(
    "/api/categories/:id", 
    isAuthenticated, 
    isAdmin,
    validateRequest({
      params: idSchema,
      body: updateCategorySchema
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const categoryId = Number(req.params.id);
      
      // Update the category
      const category = await storage.updateCategory(categoryId, req.body);
      
      if (!category) {
        throw new NotFoundError(`Category with ID ${categoryId} not found`, 'category');
      }
      
      res.json(category);
    })
  );
  


  // Create display order schema
  const displayOrderSchema = z.object({
    displayOrder: z.number().int()
  });

  app.put(
    "/api/categories/:id/display-order", 
    isAuthenticated, 
    isAdmin,
    validateRequest({
      params: idSchema,
      body: displayOrderSchema
    }),
    withStandardResponse(async (req: Request, res: Response) => {
      const categoryId = Number(req.params.id);
      const { displayOrder } = req.body;
      
      // Update the category display order
      const category = await storage.updateCategoryDisplayOrder(categoryId, displayOrder);
      
      if (!category) {
        throw new NotFoundError(`Category with ID ${categoryId} not found`, 'category');
      }
      
      return category;
    })
  );

  // Create visibility update schema
  const visibilitySchema = z.object({
    isActive: z.boolean(),
    cascade: z.boolean().default(true)
  });

  app.put(
    "/api/categories/:id/visibility", 
    isAuthenticated, 
    isAdmin,
    validateRequest({
      params: idSchema,
      body: visibilitySchema
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const categoryId = Number(req.params.id);
      const { isActive, cascade } = req.body;
      
      // Update the category's visibility
      const category = await storage.updateCategory(categoryId, { isActive });
      
      if (!category) {
        throw new NotFoundError(`Category with ID ${categoryId} not found`, 'category');
      }
      
      // Initialize counters for response
      let updatedProductCount = 0;
      let updatedSubcategoryCount = 0;
      
      try {
        // If cascade is true and this is a parent category, update all its subcategories
        if (cascade && category.level === 0) {
          // Get all subcategories for this parent
          const subcategories = await storage.getAllCategories({
            parentId: categoryId,
            includeInactive: true // Include all subcategories regardless of their current status
          });
          
          // Update each subcategory's visibility
          for (const subcategory of subcategories) {
            await storage.updateCategory(subcategory.id, { isActive });
            updatedSubcategoryCount++;
            
            // Get and update products in this subcategory
            const subcategoryProducts = await storage.getProductsByCategory(subcategory.id, undefined, undefined, {
              includeInactive: true,
              includeCategoryInactive: true
            });
            
            // Update each product's isActive status
            for (const product of subcategoryProducts) {
              await storage.updateProduct(product.id, {
                isActive: isActive
              });
              updatedProductCount++;
            }
          }
          
          logger.info(`Cascaded visibility status to ${updatedSubcategoryCount} subcategories of category ${categoryId}`);
        }
        
        // Update products directly in this category
        const categoryProducts = await storage.getProductsByCategory(categoryId, undefined, undefined, {
          includeInactive: true,
          includeCategoryInactive: true
        });
        
        // Update each product's isActive status to match category's visibility
        for (const product of categoryProducts) {
          await storage.updateProduct(product.id, {
            isActive: isActive
          });
          updatedProductCount++;
        }
        
        logger.info(`Updated visibility status for ${updatedProductCount} products in category ${categoryId} to: ${isActive}`);
        
        res.json({
          ...category,
          productsUpdated: updatedProductCount,
          subcategoriesUpdated: updatedSubcategoryCount,
          cascaded: cascade
        });
      } catch (error) {
        logger.error('Error updating category visibility:', { error, categoryId, isActive });
        throw new AppError(
          "An error occurred while updating category visibility. Please try again.",
          ErrorCode.INTERNAL_SERVER_ERROR,
          500
        );
      }
    })
  );

  // Delete category route
  app.delete(
    "/api/categories/:id", 
    isAuthenticated, 
    isAdmin,
    validateRequest({ params: idSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const categoryId = Number(req.params.id);
      
      // Check if category has subcategories
      const subcategories = await storage.getCategoriesByParent(categoryId);
      if (subcategories && subcategories.length > 0) {
        throw new AppError(
          "Cannot delete category that has subcategories. Please delete subcategories first.",
          ErrorCode.VALIDATION_ERROR,
          400
        );
      }
      
      // Check if category has products
      const products = await storage.getProductsByCategory(categoryId, undefined, undefined, {
        includeInactive: true,
        includeCategoryInactive: true
      });
      if (products && products.length > 0) {
        throw new AppError(
          "Cannot delete category that has products. Please move or delete products first.",
          ErrorCode.VALIDATION_ERROR,
          400
        );
      }
      
      // Delete the category
      const success = await storage.deleteCategory(categoryId);
      
      if (!success) {
        throw new NotFoundError(`Category with ID ${categoryId} not found`, 'category');
      }
      
      res.json({ 
        success: true, 
        message: "Category deleted successfully",
        data: { id: categoryId }
      });
    })
  );

  // CATEGORY ATTRIBUTE ROUTES - Removed as part of attribute system redesign

  // Category attribute routes - removed as part of attribute system redesign

  // CATEGORY ATTRIBUTE OPTIONS ROUTES - Removed as part of attribute system redesign

  // PRODUCT ROUTES
  
  // CRITICAL: Specific routes MUST be defined before parameterized routes
  app.get('/api/products/filterable-attributes', asyncHandler(async (req: Request, res: Response) => {
    try {
      // Add cache control headers to ensure clients always get fresh data
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Get all attributes that can be used for filtering products
      const allAttributes = await storage.getAllAttributes();
      
      const filterableAttributes = await Promise.all(
        allAttributes.map(async (attr) => {
          const options = await storage.getAttributeOptions(attr.id);
          return {
            ...attr,
            options: options || []
          };
        })
      );
      
      res.json({
        success: true,
        data: filterableAttributes
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve filterable attributes'
        }
      });
    }
  }));

  // Bulk fetch products by IDs for Fulvic carousel
  app.get("/api/products/by-ids",
    asyncHandler(async (req: Request, res: Response) => {
      const idsParam = req.query.ids as string;
      
      if (!idsParam) {
        return sendError(res, 'Product IDs are required', 400);
      }
      
      const ids = idsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      
      if (ids.length === 0) {
        return sendError(res, 'Valid product IDs are required', 400);
      }
      
      const products = await storage.getProductsByIds(ids);
      
      return sendSuccess(res, products);
    }));

  app.get("/api/products", 
    validateRequest({ query: productsQuerySchema }),
    withStandardResponse(async (req: Request, res: Response) => {
      const { limit, offset, categoryId, parentCategoryId, search, minTmyPercent, status, sortField, sortOrder, onPromotion, featuredProducts, newArrivals } = req.query;
      
      // Debug logs removed for production - these were causing noise in production logs
      
      const user = req.user as any;
      const isAdmin = user && user.role === 'admin';
      
      const options = { 
        includeInactive: isAdmin, 
        includeCategoryInactive: isAdmin,
        minTmyPercent: minTmyPercent ? Number(minTmyPercent) : undefined,
        statusFilter: status as string | undefined,
        sortField: sortField as string | undefined,
        sortOrder: sortOrder as 'asc' | 'desc' | undefined,
        // New filter options
        onPromotion: onPromotion === 'true',
        featuredProducts: featuredProducts === 'true',
        newArrivals: newArrivals === 'true'
      };
      
      // Get products with pagination data
      // Handle categoryId: if it's "all" or undefined, don't filter by category
      const categoryFilter = (categoryId && categoryId !== "all") ? Number(categoryId) : undefined;
      const parentCategoryFilter = parentCategoryId ? Number(parentCategoryId) : undefined;
      
      const result = await storage.getAllProducts(
        Number(limit), 
        Number(offset), 
        categoryFilter, 
        search as string | undefined, 
        { ...options, parentCategoryId: parentCategoryFilter }
      );
      
      // Calculate pagination metadata
      const totalPages = Math.ceil(result.total / Number(limit));
      
      return {
        data: result.products,
        meta: {
          total: result.total,
          totalPages,
          limit: Number(limit),
          offset: Number(offset)
        }
      };
    }));
  
  // Create bulk update status schema
  const bulkUpdateStatusSchema = z.object({
    productIds: z.array(z.number().int().positive()).nonempty({
      message: "At least one product ID is required"
    }),
    isActive: z.boolean()
  });

  app.post(
    "/api/products/bulk-update-status", 
    isAuthenticated, 
    isAdmin,
    validateRequest({
      body: bulkUpdateStatusSchema
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const { productIds, isActive } = req.body;
      
      try {
        const updatedCount = await storage.bulkUpdateProductStatus(productIds, isActive);
        res.json({ 
          success: true, 
          count: updatedCount,
          message: `${updatedCount} products ${isActive ? 'activated' : 'deactivated'} successfully` 
        });
      } catch (error) {
        logger.error('Error updating product status:', { error, productIds, isActive });
        throw new AppError(
          "An error occurred while updating product status. Please try again.",
          ErrorCode.INTERNAL_SERVER_ERROR,
          500
        );
      }
    })
  );

  // Specific route patterns must be defined before generic patterns with path parameters
  app.get(
    "/api/products/slug/:slug", 
    validateRequest({ params: productSlugParamSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { slug } = req.params;
      
      const user = req.user as any;
      const isAdmin = user && user.role === 'admin';
      
      const options = { 
        includeInactive: isAdmin, 
        includeCategoryInactive: isAdmin 
      };
      
      try {
        const product = await storage.getProductBySlug(slug, options);
        
        if (!product) {
          throw new NotFoundError(`Product with slug '${slug}' not found`, 'product');
        }
        
        // Calculate promotional pricing server-side
        const activePromotions = await storage.getActivePromotionsWithProducts();
        const productPromotion = activePromotions
          .flatMap((promo: any) => promo.products?.map((pp: any) => ({ ...pp, promotion: promo })) || [])
          .find((pp: any) => pp.productId === product.id);

        const promotionInfo = productPromotion ? {
          promotionName: productPromotion.promotion.promotionName,
          promotionDiscount: productPromotion.discountOverride || productPromotion.promotion.discountValue,
          promotionDiscountType: productPromotion.promotion.discountType,
          promotionEndDate: productPromotion.promotion.endDate,
          promotionalPrice: productPromotion.promotionalPrice ? Number(productPromotion.promotionalPrice) : null
        } : null;

        // Enhanced product with server-side promotional pricing
        const enhancedProduct = {
          ...product,
          promotionInfo,
          // Add server-calculated pricing for immediate use
          serverPricing: promotionInfo ? {
            displayPrice: Number(promotionInfo.promotionalPrice),
            originalPrice: Number(product.price),
            salePrice: product.salePrice ? Number(product.salePrice) : null,
            hasPromotion: true,
            promotionDiscount: promotionInfo.promotionDiscount
          } : {
            displayPrice: product.salePrice ? Number(product.salePrice) : Number(product.price),
            originalPrice: Number(product.price),
            salePrice: product.salePrice ? Number(product.salePrice) : null,
            hasPromotion: false,
            promotionDiscount: null
          }
        };
        
        // Return standardized response format
        res.json({
          success: true,
          data: enhancedProduct
        });
      } catch (error) {
        // Log detailed error for debugging
        logger.error('Error fetching product by slug', { 
          error, 
          slug,
          isAdminRequest: isAdmin
        });
        
        // If it's a NotFoundError, propagate it
        if (error instanceof NotFoundError) {
          throw error;
        }
        
        throw new AppError(
          "Failed to fetch product details. Please try again later.",
          ErrorCode.INTERNAL_SERVER_ERROR,
          500
        );
      }
    })
  );

  app.get(
    "/api/products/category/:categoryId", 
    validateRequest({
      params: categoryIdParamSchema,
      query: productsQuerySchema
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const categoryId = Number(req.params.categoryId);
      const { limit, offset } = req.query;
      
      const user = req.user as any;
      const isAdmin = user && user.role === 'admin';
      
      const options = { 
        includeInactive: isAdmin, 
        includeCategoryInactive: isAdmin 
      };
      
      try {
        // Check if category exists first
        const category = await storage.getCategoryById(categoryId);
        if (!category) {
          throw new NotFoundError(`Category with ID ${categoryId} not found`, 'category');
        }
        
        // Fetch products for this category
        const products = await storage.getProductsByCategory(
          categoryId, 
          Number(limit), 
          Number(offset), 
          options
        );
        
        // Return standardized response format
        res.json({
          success: true,
          data: products,
          meta: {
            categoryId,
            categoryName: category.name,
            totalItems: products.length,
            limit: Number(limit),
            offset: Number(offset)
          }
        });
      } catch (error) {
        // If it's already a known error type (like NotFoundError), rethrow
        if (error instanceof NotFoundError) {
          throw error;
        }
        
        // Log detailed error information for debugging
        logger.error('Error fetching products by category', { 
          error, 
          categoryId,
          limit: Number(limit),
          offset: Number(offset)
        });
        
        // Throw standardized error
        throw new AppError(
          "Failed to fetch products for the specified category. Please try again.",
          ErrorCode.INTERNAL_SERVER_ERROR,
          500
        );
      }
    })
  );
  
  // Product attributes-for-category route - removed as part of attribute system redesign
  
  // Generic route for product by ID must come after more specific routes
  app.get(
    "/api/products/:id", 
    trackProductInteraction('view'),
    validateRequest({ params: idParamSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const id = Number(req.params.id);
      
      const user = req.user as any;
      const isAdmin = user && user.role === 'admin';
      
      const options = { 
        includeInactive: isAdmin, 
        includeCategoryInactive: isAdmin 
      };
      
      try {
        const product = await storage.getProductById(id, options);
        
        if (!product) {
          throw new NotFoundError(`Product with ID ${id} not found`, 'product');
        }
        
        // Calculate promotional pricing using the shared pricing function
        const { pricing, promotionInfo } = await calculatePromotionalPricing(product);

        // Enhanced product with server-side promotional pricing
        const enhancedProduct = {
          ...product,
          promotionInfo,
          pricing
        };
        
        // Return standardized response format
        res.json({
          success: true,
          data: enhancedProduct
        });
      } catch (error) {
        // If it's already a known error type (like NotFoundError), rethrow
        if (error instanceof NotFoundError) {
          throw error;
        }
        
        // Log detailed error information for debugging
        logger.error('Error fetching product by ID', { 
          error, 
          productId: id
        });
        
        // Throw standardized error
        throw new AppError(
          "Failed to fetch product details. Please try again.",
          ErrorCode.INTERNAL_SERVER_ERROR,
          500
        );
      }
    })
  );
  
  // Full update of a product
  app.put(
    "/api/products/:id", 
    isAuthenticated, 
    validateRequest({
      params: idParamSchema,
      body: updateProductSchema
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      // Check if user is admin
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can update products");
      }
      
      const productId = Number(req.params.id);
      
      // Get the existing product to check if it exists
      const existingProduct = await storage.getProductById(productId);
      
      if (!existingProduct) {
        throw new NotFoundError(`Product with ID ${productId} not found`, 'product');
      }
      
      try {
        // Remove properties that shouldn't be updated directly
        const updateData = { ...req.body };
        delete updateData.id;
        delete updateData.createdAt;
        delete updateData.updatedAt;
        
        // Update the product
        const updatedProduct = await storage.updateProduct(productId, updateData);
        
        if (!updatedProduct) {
          throw new AppError(
            `Failed to update product "${existingProduct.name}"`,
            ErrorCode.INTERNAL_SERVER_ERROR,
            500
          );
        }
        
        res.json({
          success: true,
          data: updatedProduct,
          message: `Product "${updatedProduct.name}" updated successfully`
        });
      } catch (error) {
        // Log the detailed error
        logger.error('Error updating product:', { 
          error, 
          productId,
          productName: existingProduct.name
        });
        
        throw new AppError(
          "An error occurred while updating the product. Please try again.",
          ErrorCode.INTERNAL_SERVER_ERROR,
          500
        );
      }
    })
  );
  
  // Delete a product endpoint
  app.delete(
    "/api/products/:id", 
    isAuthenticated, 
    validateRequest({ params: idParamSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      // Check if user is admin
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can delete products");
      }
      
      const productId = Number(req.params.id);
      
      // Get the existing product to check if it exists
      const existingProduct = await storage.getProductById(productId, { includeInactive: true });
      
      if (!existingProduct) {
        throw new NotFoundError(`Product with ID ${productId} not found`, 'product');
      }
      
      try {
        // Use the comprehensive database function to delete everything
        const result = await db.execute(
          sql`SELECT delete_product_completely(${productId}) as result`
        );
        
        const deletionResult = result.rows[0]?.result;
        
        // Handle both boolean true and string 't' (PostgreSQL boolean representation)
        if (deletionResult === true || deletionResult === 't' || deletionResult === 'true') {
          res.json({ 
            success: true, 
            message: `Product "${existingProduct.name}" was successfully deleted along with all associated data including any related drafts.`
          });
        } else {
          logger.error('Product deletion failed:', { 
            productId, 
            deletionResult, 
            resultType: typeof deletionResult 
          });
          throw new AppError(
            "Failed to delete product completely",
            ErrorCode.INTERNAL_SERVER_ERROR,
            500
          );
        }
      } catch (error) {
        logger.error('Error deleting product:', { error, productId });
        throw new AppError(
          "An error occurred while deleting the product. Please try again.",
          ErrorCode.INTERNAL_SERVER_ERROR,
          500
        );
      }
    })
  );

  // Create featured products query schema
  const featuredProductsQuerySchema = z.object({
    limit: z.coerce.number().int().nonnegative().default(10),
    offset: z.coerce.number().int().nonnegative().default(0)
  });

  app.get(
    "/api/featured-products",
    validateRequest({
      query: featuredProductsQuerySchema
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const { limit, offset } = req.query;
      
      const user = req.user as any;
      const isAdmin = user && user.role === 'admin';
      
      const options = { 
        includeInactive: isAdmin, 
        includeCategoryInactive: isAdmin 
      };
      
      try {
        const products = await storage.getFeaturedProducts(Number(limit), options, Number(offset));
        
        // Add cache-busting headers to ensure randomization works
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        // Return standardized response format
        res.json({
          success: true,
          data: products || [], // Ensure we always return an array
          meta: {
            total: products ? products.length : 0,
            limit: Number(limit),
            offset: Number(offset)
          }
        });
      } catch (error) {
        // Log detailed error for debugging
        logger.error('Error fetching featured products', { 
          error,
          limit: Number(limit),
          offset: Number(offset)
        });
        
        // Return empty array instead of throwing error to prevent site crash
        res.json({
          success: true,
          data: [],
          meta: {
            total: 0,
            limit: Number(limit),
            offset: Number(offset)
          }
        });
      }
    })
  );

  // Get ALL featured products without pagination (for featured page)
  app.get(
    "/api/featured-products/all",
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user as any;
      const isAdmin = user && user.role === 'admin';
      
      const options = { 
        includeInactive: isAdmin, 
        includeCategoryInactive: isAdmin 
      };
      
      try {
        // Get all featured products by setting a very high limit
        const products = await storage.getFeaturedProducts(1000, options, 0);
        
        // Add cache-busting headers to ensure randomization works
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        // Return standardized response format
        res.json({
          success: true,
          data: products || [], // Ensure we always return an array
        });
      } catch (error) {
        // Log detailed error for debugging
        logger.error('Error fetching all featured products', { 
          error
        });
        
        // Return empty array instead of throwing error to prevent site crash
        res.json({
          success: true,
          data: [],
        });
      }
    })
  );

  // Create flash deals query schema
  const flashDealsQuerySchema = z.object({
    limit: z.coerce.number().int().nonnegative().default(6)
  });

  app.get(
    "/api/flash-deals",
    validateRequest({
      query: flashDealsQuerySchema
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const { limit } = req.query;
      
      const user = req.user as any;
      const isAdmin = user && user.role === 'admin';
      
      const options = { 
        includeInactive: isAdmin, 
        includeCategoryInactive: isAdmin 
      };
      
      try {
        const products = await storage.getFlashDeals(Number(limit), options);
        
        // Return standardized response format
        res.json({
          success: true,
          data: products,
          meta: {
            total: products.length,
            limit: Number(limit)
          }
        });
      } catch (error) {
        // Log detailed error for debugging
        logger.error('Error fetching flash deals', { 
          error,
          limit: Number(limit)
        });
        
        throw new AppError(
          "Failed to fetch flash deals. Please try again later.",
          ErrorCode.INTERNAL_SERVER_ERROR,
          500
        );
      }
    })
  );

  // Create search query schema
  const searchQuerySchema = z.object({
    q: z.string().min(1, { message: "Search query is required" }),
    limit: z.coerce.number().int().nonnegative().default(20),
    offset: z.coerce.number().int().nonnegative().default(0),
    categoryId: z.coerce.number().int().positive().optional(),
    parentCategoryId: z.coerce.number().int().positive().optional()
  }).passthrough(); // Allow additional parameters

  app.get(
    "/api/search",
    validateRequest({
      query: searchQuerySchema
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const { q: query, limit, offset, categoryId, parentCategoryId } = req.query;
      
      const user = req.user as any;
      const isAdmin = user && user.role === 'admin';
      
      const options = { 
        includeInactive: isAdmin, 
        includeCategoryInactive: isAdmin,
        categoryId: categoryId ? Number(categoryId) : undefined,
        parentCategoryId: parentCategoryId ? Number(parentCategoryId) : undefined
      };
      
      try {
        const products = await storage.searchProducts(query as string, Number(limit), Number(offset), options);
        
        res.json({
          success: true,
          data: products,
          meta: {
            query: query as string,
            total: products.length,
            totalPages: Math.ceil(products.length / Number(limit)),
            limit: Number(limit),
            offset: Number(offset)
          }
        });
      } catch (error) {
        // Log the error with context
        logger.error('Error searching products:', { 
          error, 
          searchQuery: query,
          limit: Number(limit),
          offset: Number(offset)
        });
        
        throw new AppError(
          "An error occurred while searching for products. Please try again.",
          ErrorCode.INTERNAL_SERVER_ERROR,
          500
        );
      }
    })
  );
  
  app.post(
    "/api/products", 
    isAuthenticated, 
    validateRequest({ body: createProductSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      // Check if user is admin
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can create products");
      }
      
      try {
        // Create the product with validated data
        const product = await storage.createProduct(req.body);
        
        res.status(201).json({
          success: true,
          data: product,
          message: `Product "${product.name}" created successfully`
        });
      } catch (error) {
        // Log the detailed error
        logger.error('Error creating product:', { error, productData: req.body });
      }
    })
  );
  
  // New route for creating products with the enhanced wizard
  app.post(
    "/api/products/wizard", 
    isAuthenticated, 
    validateRequest({ body: productWizardCompleteSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      // Check if user is admin
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can create products");
      }
      
      try {
        // Create the product with the enhanced wizard functionality
        const product = await storage.createProductWithWizard(req.body);
        
        res.status(201).json({
          success: true,
          data: product,
          message: `Product "${product.name}" created successfully with wizard`
        });
      } catch (error) {
        // Log the detailed error
        logger.error('Error creating product with wizard:', { error, productData: req.body });
        
        throw new AppError(
          "An error occurred while creating the product. Please try again.",
          ErrorCode.INTERNAL_SERVER_ERROR,
          500
        );
      }
    })
  );
  
  // PRODUCT WIZARD DRAFT ROUTES
  
  // Save a product draft (creates or updates)
  app.post(
    "/api/products/wizard/drafts",
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      // Check if user is admin
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can save product drafts");
      }
      
      const { draftId, data, step, catalogId } = req.body;
      
      try {
        const draft = await storage.saveProductDraft(
          user.id,
          data,
          step,
          draftId,
          catalogId
        );
        
        res.status(201).json({
          success: true,
          data: draft,
          message: "Draft saved successfully"
        });
      } catch (error) {
        logger.error('Error saving product draft:', { error, userId: user.id, draftId });
        
        throw new AppError(
          "An error occurred while saving the draft. Please try again.",
          ErrorCode.INTERNAL_SERVER_ERROR,
          500
        );
      }
    })
  );
  
  // Get a specific product draft
  app.get(
    "/api/products/wizard/drafts/:draftId",
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user as any;
      const { draftId } = req.params;
      
      // Check if user is admin
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can retrieve product drafts");
      }
      
      try {
        const draft = await storage.getProductDraft(user.id, draftId);
        
        if (!draft) {
          throw new NotFoundError(`Draft with ID ${draftId} not found`, 'draft');
        }
        
        res.json({
          success: true,
          data: draft
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw error;
        }
        
        logger.error('Error retrieving product draft:', { error, userId: user.id, draftId });
        
        throw new AppError(
          "An error occurred while retrieving the draft. Please try again.",
          ErrorCode.INTERNAL_SERVER_ERROR,
          500
        );
      }
    })
  );
  
  // Get all drafts for the current user
  app.get(
    "/api/products/wizard/drafts",
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user as any;
      const catalogId = req.query.catalogId ? Number(req.query.catalogId) : undefined;
      
      // Check if user is admin
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can list product drafts");
      }
      
      try {
        const drafts = await storage.getUserProductDrafts(user.id, catalogId);
        
        res.json({
          success: true,
          data: drafts,
          meta: {
            count: drafts.length
          }
        });
      } catch (error) {
        logger.error('Error listing product drafts:', { error, userId: user.id, catalogId });
        
        throw new AppError(
          "An error occurred while listing drafts. Please try again.",
          ErrorCode.INTERNAL_SERVER_ERROR,
          500
        );
      }
    })
  );
  
  // Delete a draft route is now handled by product-draft-routes.ts

  // PRODUCT ATTRIBUTE ROUTES - Removed as part of attribute system redesign

  // PRODUCT ATTRIBUTE COMBINATIONS ROUTES - Removed as part of attribute system redesign
  
  // PRODUCT IMAGE ROUTES
  
  // Validate image before upload
  app.post(
    "/api/images/validate", 
    isAuthenticated, 
    upload.single('image'), 
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can validate images");
      }
      
      // Check if file exists
      if (!req.file || !req.file.buffer) {
        throw new ValidationError("No image file provided");
      }
      
      // Validate the image
      const validationResult = await imageService.validateImage(
        req.file.buffer,
        req.file.originalname
      );
      
      // Return validation result
      return {
        success: validationResult.valid,
        validation: validationResult,
        recommendations: validationResult.valid 
          ? [] 
          : [
              "Ensure image dimensions are at least 200x200 pixels",
              "Use JPG, PNG or WebP format only",
              "Keep file size under 5MB",
              "Recommended dimensions are 1200x1200 pixels"
            ]
      };
    })
  );
  
  // Temporary image upload endpoint for product creation
  app.post('/api/products/images/temp', isAuthenticated, (req: Request, res: Response, next: NextFunction) => {
    // Continue to multer middleware
    upload.array('images')(req, res, async (err) => {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({ 
          message: 'File upload error', 
          error: err.message,
          code: err.code
        });
      }
      
      const user = req.user as any;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ 
          success: false,
          error: {
            message: "Only administrators can upload images",
            code: "FORBIDDEN"
          } 
        });
      }
      
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ 
          success: false,
          error: {
            message: 'No files uploaded',
            code: "VALIDATION_ERROR"
          } 
        });
      }
      
      // Perform validation on each file
      const validationResults = [];
      const validFiles = [];
      
      for (const file of req.files as Express.Multer.File[]) {
        if (!file.buffer || file.buffer.length === 0) {
          validationResults.push({
            filename: file.originalname,
            valid: false,
            errors: ["Empty file received"]
          });
          continue;
        }
        
        try {
          // Validate the image
          const validationResult = await imageService.validateImage(file.buffer, file.originalname);
          validationResults.push({
            filename: file.originalname,
            ...validationResult
          });
          
          // If valid, add to the list of files to process
          if (validationResult.valid) {
            validFiles.push(file);
          }
        } catch (error) {
          console.error(`Error validating file ${file.originalname}:`, error);
          validationResults.push({
            filename: file.originalname,
            valid: false,
            errors: [`Error validating file: ${error.message || 'Unknown error'}`],
            warnings: [],
            details: {}
          });
        }
      }
      
      // If no valid files, return validation errors
      if (validFiles.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'No valid files to upload',
            code: "VALIDATION_ERROR",
            details: validationResults
          }
        });
      }
      
      // Get productId if provided, otherwise use 'pending'
      let productId = 'pending';
      if (req.body.productId) {
        productId = req.body.productId;
      } else if (req.query.productId) {
        productId = req.query.productId as string;
      } else if (req.query.catalogId) {
        // If no product ID but we have a catalog ID, use that as part of the temp path
        productId = `catalog_${req.query.catalogId}`;
      }
      
      console.log(`Using product ID for temp storage: ${productId}`);
    
      // Process files and upload directly to Object Storage
      const processedFiles = [];
      
      try {
        for (const file of validFiles) {
          // With multer memory storage, file is already in memory as a buffer
          const fileBuffer = file.buffer;
          
          if (!fileBuffer || fileBuffer.length === 0) {
            console.error(`Empty file buffer received for ${file.originalname}`);
            continue;
          }
          
          console.log(`Processing file ${file.originalname}, size: ${fileBuffer.length} bytes`);
          
          // Generate consistent filename for object storage
          const timestamp = Date.now();
          const fileExt = path.extname(file.originalname);
          const baseName = path.basename(file.originalname, fileExt);
          const expectedFileName = `${baseName}_${timestamp}${fileExt}`;
          
          // Optimize the image before storing (if it's a supported format)
          let optimizedBuffer = fileBuffer;
          let contentType = file.mimetype;
          
          // Only optimize images (not other file types that might be uploaded)
          if (file.mimetype.startsWith('image/')) {
            try {
              // Process the image with Sharp to optimize it
              const { data: processedBuffer } = await imageService.processImage(fileBuffer, {
                format: 'webp', // Convert to WebP for better compression
                quality: 85     // Good quality but smaller size
              });
              
              optimizedBuffer = processedBuffer;
              contentType = 'image/webp';
              console.log(`Optimized image: ${file.originalname} (saved ${Math.round((1 - processedBuffer.length / fileBuffer.length) * 100)}% in size)`);
            } catch (optimizeError) {
              console.error(`Failed to optimize image ${file.originalname}:`, optimizeError);
              // Continue with original buffer if optimization fails
            }
          }
          
          // Upload to Object Storage with product ID in the path
          const { url, objectKey } = await objectStoreAdapter.uploadTempFile(
            optimizedBuffer,
            expectedFileName.replace(fileExt, '.webp'), // Use WebP extension
            productId, // Pass product ID to create correct folder structure
            contentType
          );
          
          // Add a delay after upload to ensure Replit Object Storage has propagated the file
          // This is crucial for preventing issues with file not being available immediately
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Verify the file exists in Object Storage before proceeding
          const exists = await objectStoreAdapter.exists(objectKey);
          if (!exists) {
            console.error(`File ${objectKey} was not found in Object Storage after upload`);
            throw new Error('File upload to Object Storage failed - verification failed');
          }
          
          console.log(`Successfully uploaded temp file to object storage: ${objectKey}, size: ${fileBuffer.length} bytes`);
          
          processedFiles.push({
            filename: path.basename(objectKey),
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            path: url, // Use the URL from the uploadTempFile method
            objectKey
          });
        }
        
        // For a single file upload, provide the file data directly in the response
        // to be compatible with our frontend components
        if (processedFiles.length === 1) {
          const file = processedFiles[0];
          const absoluteUrl = `${req.protocol}://${req.get('host')}${file.path}`;
          
          return res.status(200).json({
            success: true,
            url: file.path,
            objectKey: file.objectKey,
            absoluteUrl: absoluteUrl,
            filename: file.filename,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            // Also include the files array for backwards compatibility
            files: processedFiles,
            validation: {
              totalFiles: req.files.length,
              validFiles: validFiles.length,
              invalidFiles: req.files.length - validFiles.length,
              results: validationResults
            }
          });
        } 
        // For multiple files, return the array
        else {
          return res.status(200).json({
            success: true,
            files: processedFiles.map(file => ({
              ...file,
              absoluteUrl: `${req.protocol}://${req.get('host')}${file.path}`
            })),
            validation: {
              totalFiles: req.files.length,
              validFiles: validFiles.length,
              invalidFiles: req.files.length - validFiles.length,
              results: validationResults
            }
          });
        }
      } catch (error: any) {
        console.error('Error processing uploaded files:', error);
        return res.status(500).json({
          success: false,
          error: {
            message: 'Error processing uploaded files',
            code: "SERVER_ERROR",
            details: {
              error: error.message || 'Unknown error',
              partialResults: processedFiles.length > 0 ? processedFiles : undefined,
              validation: validationResults.length > 0 ? validationResults : undefined
            }
          }
        });
      }
    });
  });
  
  // Redirect temp file requests to the main file serving endpoint for consistent handling
  app.get('/temp/:productId/:filename', async (req: Request, res: Response) => {
    const { productId, filename } = req.params;
    const objectKey = `${STORAGE_FOLDERS.TEMP}/${productId}/${filename}`;
    
    // Redirect to our universal file serving endpoint
    res.redirect(`/api/files/${objectKey}`);
  });
  
  // Legacy route for backward compatibility
  app.get('/temp/:filename', async (req: Request, res: Response) => {
    const filename = req.params.filename;
    // Default to 'pending' folder for legacy files
    const objectKey = `${STORAGE_FOLDERS.TEMP}/pending/${filename}`;
    
    // Redirect to our universal file serving endpoint
    res.redirect(`/api/files/${objectKey}`);
  });
  
  // Handle moving images from temporary to permanent storage
  app.post('/api/products/images/move', isAuthenticated, async (req: Request, res: Response) => {
    const user = req.user as any;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        error: {
          message: "Only administrators can manage product images",
          code: "FORBIDDEN"
        }
      });
    }
    
    const { sourceKey, productId } = req.body;
    
    if (!sourceKey || !productId) {
      return res.status(400).json({ 
        success: false,
        error: {
          message: 'Source key and product ID are required',
          code: "VALIDATION_ERROR"
        }
      });
    }
    
    try {
      console.log(`Moving file from temporary storage: ${sourceKey} to product ${productId}`);
      
      // Verify that the source file exists first
      const sourceExists = await objectStoreAdapter.exists(sourceKey);
      if (!sourceExists) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Source file not found in temporary storage',
            code: "NOT_FOUND"
          }
        });
      }
      
      // Process the image before moving it (optimize and validate)
      try {
        // Get file buffer for processing
        const { data: imageBuffer } = await objectStoreAdapter.getFileAsBuffer(sourceKey);
        
        // Validate the image
        const validationResult = await imageService.validateImage(imageBuffer, path.basename(sourceKey));
        if (!validationResult.valid) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'Image validation failed',
              code: "VALIDATION_ERROR",
              details: validationResult
            }
          });
        }
        
        // Try to optimize the image if it's a supported format
        let optimizedKey = sourceKey; // Default to original
        if (validationResult.details.format) {
          try {
            const { data: processedBuffer } = await imageService.processImage(imageBuffer, {
              format: 'webp', // Convert to WebP for better compression
              quality: 85     // Good quality but smaller size
            });
            
            // Upload optimized version
            const ext = path.extname(sourceKey);
            const baseName = path.basename(sourceKey, ext);
            const newOptimizedKey = `${path.dirname(sourceKey)}/${baseName}.webp`;
            
            await objectStoreAdapter.uploadFromBuffer(newOptimizedKey, processedBuffer, { contentType: 'image/webp' });
            
            console.log(`Created optimized version at ${newOptimizedKey}`);
            
            // If the optimized version was created successfully, use it as the source for moving
            optimizedKey = newOptimizedKey;
          } catch (optimizeError) {
            console.error(`Failed to optimize image before moving:`, optimizeError);
            // Continue with original file if optimization fails
          }
        }
      } catch (processError) {
        console.error(`Error processing image before moving:`, processError);
        // Continue with the move if processing fails
      }
      
      // Move file from temp to product folder
      const result = await objectStoreAdapter.moveFromTemp(optimizedKey, parseInt(productId));
      
      console.log(`Successfully moved file to ${result.objectKey}`);
      
      return res.json({
        success: true,
        data: {
          url: result.url,
          objectKey: result.objectKey,
          productId: parseInt(productId)
        }
      });
    } catch (error: any) {
      console.error(`Error moving file ${optimizedKey} to product ${productId}:`, error);
      return res.status(500).json({
        success: false,
        error: {
          message: error.message || 'Failed to move file from temporary storage',
          code: "SERVER_ERROR"
        }
      });
    }
  });
  
  app.get(
    "/api/products/:productId/images",
    validateRequest({ params: productIdParamSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const productId = Number(req.params.productId);
      
      try {
        const images = await storage.getProductImages(productId);
        
        // Return standardized response format
        res.json({
          success: true,
          data: images,
          meta: {
            total: images.length,
            productId
          }
        });
      } catch (error) {
        // Log detailed error for debugging
        logger.error('Error fetching product images', { 
          error, 
          productId
        });
        
        throw new AppError(
          "Failed to fetch product images. Please try again later.",
          ErrorCode.INTERNAL_SERVER_ERROR,
          500
        );
      }
    })
  );
  
  app.post(
    "/api/products/:productId/images", 
    isAuthenticated,
    validateRequest({
      params: productIdParamSchema,
      body: createProductImageSchema
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can manage product images");
      }
      
      const productId = Number(req.params.productId);
    
      try {
        let image;
        
        // If object key is already provided, just create the image record
        if (req.body.objectKey && req.body.url) {
          // Create product image record directly from provided URL and objectKey
          const imageData = {
            productId,
            url: req.body.url,
            objectKey: req.body.objectKey,
            isMain: req.body.isMain || false,
            sortOrder: req.body.sortOrder || 0,
            hasBgRemoved: req.body.hasBgRemoved || false,
            bgRemovedUrl: req.body.bgRemovedUrl || null,
            bgRemovedObjectKey: req.body.bgRemovedObjectKey || null
          };
          
          image = await storage.createProductImage(imageData);
        }
        // If the image has a base64 data URL, store it in object storage
        else if (req.body.url && req.body.url.startsWith('data:')) {
          // Extract the base64 data and content type
          const matches = req.body.url.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (!matches || matches.length !== 3) {
            throw new BadRequestError("Invalid base64 image format");
          }
          
          const contentType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');
          
          // Generate a unique filename
          const timestamp = Date.now();
          const extension = contentType.split('/')[1] || 'jpg';
          const filename = `${timestamp}_${productId}.${extension}`;
          const objectKey = `products/${productId}/${filename}`;
          
          // Upload to object storage
          await objectStoreAdapter.uploadFromBuffer(objectKey, buffer, { contentType });
          
          // Generate public URL
          const publicUrl = objectStoreAdapter.getPublicUrl(objectKey);
          
          // Prepare the image data
          const imageData = {
            productId,
            url: publicUrl,
            objectKey: objectKey,
            isMain: req.body.isMain || false,
            sortOrder: req.body.sortOrder || 0,
            hasBgRemoved: false,
            bgRemovedUrl: null,
            bgRemovedObjectKey: null
          };
          
          // Create the product image record
          image = await storage.createProductImage(imageData);
        }
        else {
          // Handle case where we didn't get a base64 image URL or object key
          throw new BadRequestError(
            "Invalid image data. Please provide either a base64 data URL or an object key and URL."
          );
        }
        
        // Return standardized response format with 201 status code
        res.status(201).json({
          success: true,
          data: image,
          message: "Product image created successfully"
        });
      } catch (error) {
        // Log detailed error for debugging
        logger.error('Error creating product image', { 
          error, 
          productId,
          hasObjectKey: !!req.body.objectKey,
          hasUrl: !!req.body.url,
          isBase64: req.body.url?.startsWith('data:')
        });
        
        // If it's already a known error type, rethrow it
        if (error instanceof BadRequestError || 
            error instanceof ForbiddenError || 
            error instanceof NotFoundError) {
          throw error;
        }
        
        throw new AppError(
          "Failed to create product image. Please try again later.",
          ErrorCode.INTERNAL_SERVER_ERROR,
          500
        );
      }
    }));
  
  app.put(
    "/api/products/images/:imageId", 
    isAuthenticated, 
    validateRequest({
      params: idParamSchema,
      body: updateProductImageSchema
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can manage product images");
      }
      
      const imageId = Number(req.params.imageId);
      
      try {
        const updatedImage = await storage.updateProductImage(imageId, req.body);
        
        if (!updatedImage) {
          throw new NotFoundError("Image not found", "productImage");
        }
        
        // Return standardized response format
        res.json({
          success: true,
          data: updatedImage,
          message: "Product image updated successfully"
        });
      } catch (error) {
        // Log detailed error for debugging
        logger.error('Error updating product image', { 
          error, 
          imageId,
          updateData: req.body
        });
        
        // If it's a NotFoundError, propagate it
        if (error instanceof NotFoundError) {
          throw error;
        }
        
        throw new AppError(
          "Failed to update product image. Please try again later.",
          ErrorCode.INTERNAL_SERVER_ERROR,
          500
        );
      }
    })
  );
  
  app.delete(
    "/api/products/images/:imageId", 
    isAuthenticated, 
    validateRequest({
      params: idParamSchema
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can manage product images");
      }
      
      const imageId = Number(req.params.imageId);
      
      try {
        // Get the image data before deleting it for better error reporting
        const image = await storage.getProductImageById(imageId);
        
        if (!image) {
          throw new NotFoundError("Image not found", "productImage");
        }
        
        const result = await storage.deleteProductImage(imageId);
        
        if (!result) {
          throw new AppError(
            `Failed to delete product image with ID ${imageId}`,
            ErrorCode.INTERNAL_SERVER_ERROR,
            500
          );
        }
        
        // Return standardized response format
        res.json({
          success: true,
          message: "Product image deleted successfully",
          meta: {
            imageId,
            productId: image.productId
          }
        });
      } catch (error) {
        // Log detailed error for debugging
        logger.error('Error deleting product image', { 
          error, 
          imageId
        });
        
        // If it's a NotFoundError, propagate it
        if (error instanceof NotFoundError) {
          throw error;
        }
        
        throw new AppError(
          "Failed to delete product image. Please try again later.",
          ErrorCode.INTERNAL_SERVER_ERROR,
          500
        );
      }
    })
  );
  
  app.put(
    "/api/products/:productId/images/:imageId/main", 
    isAuthenticated, 
    validateRequest({
      params: z.object({
        productId: z.string().refine(val => !isNaN(Number(val)), {
          message: "Product ID must be a valid number"
        }),
        imageId: z.string().refine(val => !isNaN(Number(val)), {
          message: "Image ID must be a valid number"
        })
      })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can manage product images");
      }
      
      const productId = Number(req.params.productId);
      const imageId = Number(req.params.imageId);
      
      try {
        // Verify product exists
        const product = await storage.getProductById(productId);
        if (!product) {
          throw new NotFoundError(`Product with ID ${productId} not found`, 'product');
        }
        
        // Verify image exists
        const image = await storage.getProductImageById(imageId);
        if (!image) {
          throw new NotFoundError(`Image with ID ${imageId} not found`, 'productImage');
        }
        
        // Verify image belongs to the product
        if (image.productId !== productId) {
          throw new BadRequestError(`Image with ID ${imageId} does not belong to product with ID ${productId}`);
        }
        
        const result = await storage.setMainProductImage(productId, imageId);
        
        if (!result) {
          throw new AppError(
            `Failed to set image ${imageId} as main for product ${productId}`,
            ErrorCode.INTERNAL_SERVER_ERROR,
            500
          );
        }
        
        // Return standardized response format
        res.json({
          success: true,
          message: "Main product image set successfully",
          meta: {
            imageId,
            productId,
            productName: product.name
          }
        });
      } catch (error) {
        // Log detailed error for debugging
        logger.error('Error setting main product image', { 
          error, 
          productId,
          imageId
        });
        
        // If it's already a known error type, rethrow it
        if (error instanceof NotFoundError || error instanceof BadRequestError) {
          throw error;
        }
        
        throw new AppError(
          "Failed to set main product image. Please try again later.",
          ErrorCode.INTERNAL_SERVER_ERROR,
          500
        );
      }
    })
  );
  
  // IMAGE PROCESSING ROUTES
  
  // Validate an image before upload
  app.post(
    "/api/images/validate",
    isAuthenticated,
    (req: Request, res: Response, next: NextFunction) => {
      // Use multer to handle the file upload
      upload.single('image')(req, res, (err) => {
        if (err) {
          logger.error('Multer file upload error', { error: err });
          throw new BadRequestError(
            `File upload error: ${err.message}`,
            'file',
            { originalError: err }
          );
        }
        
        next();
      });
    },
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can validate images");
      }
      
      // Check if file was received
      if (!req.file) {
        throw new BadRequestError(
          'No image file provided', 
          'file', 
          { fieldName: 'image' }
        );
      }
      
      try {
        // Get the file buffer and validate it
        const fileBuffer = req.file.buffer;
        
        if (!fileBuffer || fileBuffer.length === 0) {
          throw new BadRequestError(
            'Empty file received', 
            'file',
            { fileName: req.file.originalname, fileSize: req.file.size }
          );
        }
        
        // Perform validation
        const validationResult = await imageService.validateImage(
          fileBuffer, 
          req.file.originalname
        );
        
        // Return validation result with standardized response format
        res.json({
          success: true,
          message: "Image validation successful",
          data: {
            filename: req.file.originalname,
            validation: validationResult
          }
        });
      } catch (error) {
        // Log detailed error information
        logger.error('Error validating image', { 
          error, 
          fileName: req.file?.originalname,
          fileSize: req.file?.size
        });
        
        // Throw properly formatted error
        throw new AppError(
          "Failed to validate image. Please check the image format and try again.",
          ErrorCode.INTERNAL_SERVER_ERROR,
          500,
          { originalError: error }
        );
      }
    })
  );
  
  // Optimize an image for web display
  app.post(
    "/api/images/optimize", 
    isAuthenticated, 
    validateRequest({
      body: z.object({
        objectKey: z.string().min(1, "Object key is required"),
        quality: z.string().or(z.number()).optional().transform(val => 
          val ? Number(val) : undefined
        ),
        format: z.enum(['jpeg', 'png', 'webp', 'avif']).optional()
      })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can use image optimization");
      }
      
      const { objectKey, quality, format } = req.body;
      
      // Check if the image exists
      const exists = await objectStore.exists(objectKey);
      if (!exists) {
        throw new NotFoundError("Image not found", "image");
      }
      
      // Optimize the image
      const result = await imageService.optimizeImage(
        objectKey,
        { 
          quality,
          format
        }
      );
      
      // Get size of original image for comparison
      const originalSize = await objectStore.getSize(objectKey);
      const sizeReduction = originalSize ? Math.round((1 - result.size / originalSize) * 100) : 0;
      
      res.json({
        success: true,
        ...result,
        originalKey: objectKey,
        optimizedKey: result.objectKey,
        sizeReduction: `${sizeReduction}%`
      });
    })
  );
  
  // Generate thumbnails for an image
  app.post(
    "/api/images/thumbnails", 
    isAuthenticated, 
    validateRequest({
      body: z.object({
        objectKey: z.string().min(1, "Object key is required"),
        sizes: z.array(z.number().positive()).optional()
      })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can generate thumbnails");
      }
      
      const { objectKey, sizes } = req.body;
      
      // Check if the image exists
      const exists = await objectStore.exists(objectKey);
      if (!exists) {
        throw new NotFoundError("Image not found", "image");
      }
      
      // Generate thumbnails
      const thumbnails = await imageService.generateThumbnails(
        objectKey,
        sizes
      );
      
      res.json({
        success: true,
        thumbnails,
        originalKey: objectKey,
        count: Object.keys(thumbnails).length
      });
    })
  );
  
  // Resize an image with custom dimensions
  app.post(
    "/api/images/resize", 
    isAuthenticated, 
    validateRequest({
      body: z.object({
        objectKey: z.string().min(1, "Object key is required"),
        width: z.coerce.number().positive().optional(),
        height: z.coerce.number().positive().optional(),
        fit: z.enum(['cover', 'contain', 'fill', 'inside', 'outside']).optional(),
        format: z.enum(['jpeg', 'png', 'webp', 'avif']).optional(),
        quality: z.coerce.number().min(1).max(100).optional()
      }).refine(data => data.width !== undefined || data.height !== undefined, {
        message: "At least one dimension (width or height) is required",
        path: ["dimensions"]
      })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can resize images");
      }
      
      const { objectKey, width, height, fit, format, quality } = req.body;
      
      // Check if the image exists
      const exists = await objectStore.exists(objectKey);
      if (!exists) {
        throw new NotFoundError("Image not found", "image");
      }
      
      // Resize the image
      const result = await imageService.resizeImage(
        objectKey,
        {
          width,
          height,
          fit,
          format,
          quality
        }
      );
      
      res.json({
        success: true,
        ...result,
        originalKey: objectKey
      });
    })
  );
  
  // AI SERVICE ROUTES
  
  // Remove image background using Gemini AI
  app.post(
    "/api/ai/remove-background", 
    isAuthenticated, 
    validateRequest({
      body: z.object({
        imageUrl: z.string().min(1, "Image URL is required"),
        productImageId: z.coerce.number().positive().optional()
      })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can use AI features");
      }
      
      const { imageUrl, productImageId } = req.body;
      
      const resultImageBase64 = await removeImageBackground(imageUrl);
      
      // If this is for a specific product image, update it
      if (productImageId) {
        // Extract the base64 data and content type
        const matches = resultImageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          throw new BadRequestError("Invalid base64 image format from AI service");
        }
        
        const contentType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Generate a unique filename
        const timestamp = Date.now();
        const extension = contentType.split('/')[1] || 'png';
        const filename = `${timestamp}_${productImageId}_bg_removed.${extension}`;
        const objectKey = `products/bg_removed/${filename}`;
        
        // Upload to object storage
        await objectStoreAdapter.uploadFromBuffer(objectKey, buffer, { contentType });
        
        // Generate public URL
        const publicUrl = objectStoreAdapter.getPublicUrl(objectKey);
        
        // Check if the product image exists
        const imageExists = await storage.getProductImageById(productImageId);
        if (!imageExists) {
          throw new NotFoundError("Product image not found", "productImage");
        }
        
        // Update the product image with background removed URL
        await storage.updateProductImage(productImageId, {
          bgRemovedUrl: publicUrl,
          bgRemovedObjectKey: objectKey,
          hasBgRemoved: true
        });
        
        return res.json({ 
          success: true, 
          imageUrl: resultImageBase64,
          publicUrl
        });
      }
      
      // If not for a specific image, just return the processed image
      res.json({ 
        success: true, 
        imageUrl: resultImageBase64 
      });
    })
  );
  
  // AI Image Downloader - Extract images from supplier URL for preview
  app.post(
    "/api/ai/extract-images",
    validateRequest({
      body: z.object({
        supplierUrl: z.string().url("Valid supplier URL is required")
      })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const { supplierUrl } = req.body;
      
      try {
        // Import the AI image downloader
        const { AIImageDownloader } = await import('./ai-image-downloader');
        
        // Extract image URLs from the supplier page
        let imageUrls;
        try {
          imageUrls = await AIImageDownloader.extractImagesFromUrl(supplierUrl);
        } catch (extractError: any) {
          // Handle specific extraction errors with detailed messages
          return res.json({
            success: false,
            message: extractError.message || "Failed to extract images from supplier page",
            images: [],
            errors: [extractError.message || "Failed to access the supplier website"]
          });
        }
        
        if (imageUrls.length === 0) {
          return res.json({
            success: false,
            message: "No product images found on the supplier page",
            images: [],
            errors: ["No suitable product images were detected on the provided URL"]
          });
        }
        
        // Return the extracted URLs for preview
        return res.json({
          success: true,
          message: `Found ${imageUrls.length} images for preview`,
          images: imageUrls.map((url, index) => ({
            url,
            index,
            selected: false
          })),
          meta: {
            foundUrls: imageUrls.length
          }
        });
        
      } catch (error: any) {
        console.error('AI Image Extract Error:', error);
        return res.status(500).json({
          success: false,
          message: "Failed to extract images from supplier URL",
          images: [],
          errors: [error instanceof Error ? error.message : "Unknown error occurred"]
        });
      }
    })
  );

  // AI Image Downloader - Download selected images from supplier URL
  app.post(
    "/api/ai/download-selected-images",
    validateRequest({
      body: z.object({
        imageUrls: z.array(z.string().url()),
        productId: z.number().optional()
      })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const { imageUrls, productId } = req.body;
      
      try {
        // Import the AI image downloader
        const { AIImageDownloader } = await import('./ai-image-downloader');
        
        // Download and process the selected images
        let result;
        try {
          result = await AIImageDownloader.downloadImages(imageUrls, productId);
        } catch (error) {
          logger.error('Error in AI image download process:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to process image downloads',
            errors: [error instanceof Error ? error.message : 'Unknown error']
          });
        }
        
        // Check if we have any successful downloads
        const finalSuccess = result.images.length > 0;
        const message = finalSuccess 
          ? `Successfully downloaded ${result.images.length} images from supplier page`
          : "No images could be downloaded from the supplier page";
        
        // If we have a productId, update the product draft with the new images
        if (productId && result.images.length > 0) {
          try {
            // Get current product draft
            const currentDraft = await storage.getProductDraft(productId);
            if (!currentDraft) {
              throw new Error(`Product draft ${productId} not found`);
            }
            
            // Add new images to existing ones
            const currentImageUrls = currentDraft.imageUrls || [];
            const currentObjectKeys = currentDraft.imageObjectKeys || [];
            
            const newImageUrls = [...currentImageUrls, ...result.images.map(img => img.url)];
            const newObjectKeys = [...currentObjectKeys, ...result.images.map(img => img.objectKey)];
            
            // Set main image index if no main image exists
            const newMainImageIndex = currentImageUrls.length === 0 ? 0 : currentDraft.mainImageIndex;
            
            // Update the product draft
            await storage.updateProductDraft(productId, {
              imageUrls: newImageUrls,
              imageObjectKeys: newObjectKeys,
              mainImageIndex: newMainImageIndex
            });
            
            logger.info(`Successfully updated product draft ${productId} with ${result.images.length} new images`);
          } catch (error) {
            logger.error(`Error updating product draft ${productId} with AI images:`, error);
            // Don't fail the entire request if draft update fails
          }
        }
        
        return res.json({
          success: finalSuccess,
          message,
          images: result.images,
          errors: result.errors,
          meta: {
            selectedCount: imageUrls.length,
            downloadedCount: result.images.length,
            errorCount: result.errors.length
          }
        });
        
      } catch (error) {
        console.error('AI Image Download Error:', error);
        return res.status(500).json({
          success: false,
          message: "Failed to download images from supplier URL",
          images: [],
          errors: [error instanceof Error ? error.message : "Unknown error occurred"]
        });
      }
    })
  );

  // AI Image Downloader - Download images from supplier URL (legacy endpoint)
  app.post(
    "/api/ai/download-images",
    validateRequest({
      body: z.object({
        supplierUrl: z.string().url("Valid supplier URL is required"),
        productId: z.number().optional()
      })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      
      const { supplierUrl, productId } = req.body;
      
      try {
        // Import the AI image downloader
        const { AIImageDownloader } = await import('./ai-image-downloader');
        
        // Extract image URLs from the supplier page
        const imageUrls = await AIImageDownloader.extractImagesFromUrl(supplierUrl);
        
        if (imageUrls.length === 0) {
          return res.json({
            success: false,
            message: "No product images found on the supplier page",
            images: [],
            errors: ["No suitable product images were detected on the provided URL"]
          });
        }
        
        // Download and process the images
        let result;
        try {
          result = await AIImageDownloader.downloadImages(imageUrls, productId);
        } catch (error) {
          logger.error('Error in AI image download process:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to process image downloads',
            errors: [error instanceof Error ? error.message : 'Unknown error']
          });
        }
        
        // Always try to update database if we have any successful images, even if there were some errors
        if (result.images.length > 0) {
          try {
            // Update the product draft with the new images
            const draft = await storage.getProductDraft(productId);
            if (draft) {
              const currentImageUrls = draft.imageUrls || [];
              const currentObjectKeys = draft.imageObjectKeys || [];
              
              const newImageUrls = [...currentImageUrls, ...result.images.map(img => img.url)];
              const newObjectKeys = [...currentObjectKeys, ...result.images.map(img => img.objectKey)];
              
              // Set main image index to 0 if no images existed before, otherwise keep current
              const mainImageIndex = currentImageUrls.length === 0 ? 0 : (draft.mainImageIndex || 0);
              
              // Update the draft with new images
              await storage.updateProductDraftImages(
                productId,
                newImageUrls,
                newObjectKeys,
                mainImageIndex
              );
              
              logger.info(`Successfully updated product draft ${productId} with ${result.images.length} new images`);
            }
          } catch (dbError) {
            logger.error('Error updating database with downloaded images:', dbError);
            return res.status(500).json({
              success: false,
              message: 'Images downloaded but failed to save to database',
              errors: [dbError instanceof Error ? dbError.message : 'Database update failed']
            });
          }
        }
        
        const finalSuccess = result.images.length > 0;
        const message = finalSuccess 
          ? `Successfully downloaded ${result.images.length} images`
          : result.errors.length > 0 
            ? "Failed to download images" 
            : "No suitable product images were found";

        const responseData = {
          success: finalSuccess,
          message,
          images: result.images,
          errors: result.errors || [],
          meta: {
            foundUrls: imageUrls.length,
            downloadedCount: result.images.length,
            errorCount: result.errors?.length || 0
          }
        };

        logger.info('Sending AI download response:', responseData);
        return res.json(responseData);
        
      } catch (error) {
        console.error('AI Image Download Error:', error);
        return res.status(500).json({
          success: false,
          message: "Failed to download images from supplier URL",
          images: [],
          errors: [error instanceof Error ? error.message : "Unknown error occurred"]
        });
      }
    })
  );

  // Generate product tags using AI
  app.post(
    "/api/ai/generate-tags", 
    isAuthenticated, 
    validateRequest({
      body: z.object({
        imageUrl: z.string().min(1, "Image URL is required"),
        productName: z.string().min(1, "Product name is required"),
        productDescription: z.string().optional().default('')
      })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can use AI features");
      }
      
      const { imageUrl, productName, productDescription } = req.body;
      
      try {
        // Check if the image URL is valid
        const isValidUrl = await validateImageUrl(imageUrl);
        if (!isValidUrl) {
          throw new BadRequestError(
            "Invalid image URL. Please provide a valid and accessible image URL.", 
            "imageUrl"
          );
        }
        
        // Generate tags using AI service
        const tags = await generateProductTags(
          imageUrl, 
          productName, 
          productDescription
        );
        
        if (!tags || tags.length === 0) {
          throw new AppError(
            "Failed to generate tags. AI service returned no results.",
            ErrorCode.EXTERNAL_SERVICE_ERROR,
            500
          );
        }
        
        // Return standardized response format
        res.json({
          success: true,
          message: "Product tags generated successfully", 
          data: { tags },
          meta: {
            productName,
            tagCount: tags.length
          }
        });
      } catch (error) {
        // Log the error in detail for debugging
        logger.error('Error generating product tags with AI', { 
          error, 
          productName, 
          imageUrl
        });
        
        // Handle specific error cases
        if (error instanceof BadRequestError) {
          throw error;
        }
        
        // Check if it's a Gemini API-specific error and provide better error messages
        if (error instanceof Error && error.message.includes('GEMINI_API_KEY')) {
          throw new AppError(
            "AI service configuration error. Please contact an administrator.",
            ErrorCode.EXTERNAL_SERVICE_ERROR,
            500
          );
        }
        
        // Generic error fallback
        throw new AppError(
          "Failed to generate product tags. The AI service is currently unavailable.",
          ErrorCode.EXTERNAL_SERVICE_ERROR,
          500,
          { originalError: error }
        );
      }
    })
  );
  
  // Analyze product image for auto-fill suggestions
  app.post(
    "/api/ai/analyze-product", 
    isAuthenticated, 
    validateRequest({
      body: z.object({
        imageUrl: z.string().min(1, "Image URL is required"),
        productName: z.string().min(1, "Product name is required")
      })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can use AI features");
      }
      
      const { imageUrl, productName } = req.body;
      
      try {
        // Validate image URL format
        const isValidUrl = await validateImageUrl(imageUrl);
        if (!isValidUrl) {
          throw new BadRequestError(
            "Invalid image URL. Please provide a valid and accessible image URL.", 
            "imageUrl"
          );
        }
        
        // Analyze the product image using AI
        const analysis = await analyzeProductImage(imageUrl, productName);
        
        if (!analysis) {
          throw new AppError(
            "Failed to analyze product image. AI service returned no results.",
            ErrorCode.EXTERNAL_SERVICE_ERROR,
            500
          );
        }
        
        // Return standardized response format
        res.json({
          success: true,
          message: "Product image analyzed successfully", 
          data: analysis,
          meta: {
            productName,
            imageUrl: imageUrl.substring(0, 100) + (imageUrl.length > 100 ? '...' : '') // Trim URL for logging
          }
        });
      } catch (error) {
        // Log the error in detail for debugging
        logger.error('Error analyzing product image with AI', { 
          error, 
          productName, 
          imageUrlLength: imageUrl.length
        });
        
        // Handle specific error cases
        if (error instanceof BadRequestError) {
          throw error;
        }
        
        // Check if it's a Gemini API-specific error and provide better error messages
        if (error instanceof Error && error.message.includes('GEMINI_API_KEY')) {
          throw new AppError(
            "AI service configuration error. Please contact an administrator.",
            ErrorCode.EXTERNAL_SERVICE_ERROR,
            500
          );
        }
        
        // Generic error fallback
        throw new AppError(
          "Failed to analyze product image. The AI service is currently unavailable.",
          ErrorCode.EXTERNAL_SERVICE_ERROR,
          500,
          { originalError: error }
        );
      }
    })
  );

  // AI price suggestion endpoint
  app.post(
    "/api/ai/suggest-price", 
    isAuthenticated, 
    validateRequest({
      body: z.object({
        costPrice: z.coerce.number().positive("Cost price must be a positive number"),
        productName: z.string().min(1, "Product name is required"),
        categoryName: z.string().optional(),
        categoryId: z.coerce.number().positive().optional()
      })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can use AI features");
      }
      
      const { costPrice, productName, categoryName, categoryId } = req.body;
      
      try {
        // If categoryId is provided, check if it exists
        let categoryData = null;
        if (categoryId) {
          categoryData = await storage.getCategoryById(categoryId);
          if (!categoryData) {
            throw new NotFoundError("Category not found", "category");
          }
        }
        
        // Get price suggestion from AI service
        const suggestion = await suggestPrice(costPrice, productName, categoryName, categoryId);
        
        if (!suggestion || !suggestion.suggestedPrice) {
          throw new AppError(
            "Failed to generate price suggestion. AI service returned invalid data.",
            ErrorCode.EXTERNAL_SERVICE_ERROR,
            500
          );
        }
        
        // Return standardized response format
        res.json({
          success: true,
          message: "Price suggestion generated successfully", 
          data: suggestion,
          meta: {
            productName,
            costPrice,
            categoryName: categoryName || (categoryData ? categoryData.name : undefined),
            margin: suggestion.margin || (((suggestion.suggestedPrice - costPrice) / costPrice) * 100).toFixed(2) + '%'
          }
        });
      } catch (error) {
        // Log detailed error information for debugging
        logger.error('Error generating price suggestion with AI', { 
          error, 
          productName, 
          costPrice,
          categoryId
        });
        
        // Handle known error types explicitly
        if (error instanceof NotFoundError) {
          throw error;
        }
        
        // Check if it's a Gemini API-specific error and provide better error messages
        if (error instanceof Error && error.message.includes('GEMINI_API_KEY')) {
          throw new AppError(
            "AI service configuration error. Please contact an administrator.",
            ErrorCode.EXTERNAL_SERVICE_ERROR,
            500
          );
        }
        
        // Generic error fallback
        throw new AppError(
          "Failed to generate price suggestion. The AI service is currently unavailable.",
          ErrorCode.EXTERNAL_SERVICE_ERROR,
          500,
          { originalError: error }
        );
      }
    })
  );
  
  // AI MODEL SETTINGS ROUTES
  
  // Get all available AI models
  app.get(
    "/api/admin/ai/models", 
    isAuthenticated, 
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      // Check if user is admin
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can manage AI settings");
      }
      
      try {
        // Get all available models
        const models = (await import('./ai-service')).getAvailableAiModels();
        
        // Get current model
        const currentModel = await (await import('./ai-service')).getCurrentAiModelSetting();
        
        // Return standardized response format
        res.json({
          success: true,
          data: {
            available: models,
            current: currentModel.modelName,
            isDefault: currentModel.isDefault
          }
        });
      } catch (error) {
        // Log detailed error information
        logger.error('Error retrieving AI model settings', { error });
        
        // Return generic error
        throw new AppError(
          "Failed to retrieve AI model settings.",
          ErrorCode.INTERNAL_SERVER_ERROR,
          500,
          { originalError: error }
        );
      }
    })
  );
  
  // Update current AI model
  app.post(
    "/api/admin/ai/models", 
    isAuthenticated, 
    validateRequest({
      body: z.object({
        modelName: z.string().min(1, "Model name is required")
      })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      // Check if user is admin
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can manage AI settings");
      }
      
      const { modelName } = req.body;
      
      try {
        // Validate that the model name is in the available models list
        const availableModels = (await import('./ai-service')).getAvailableAiModels();
        if (!availableModels.includes(modelName)) {
          throw new BadRequestError(
            `Model '${modelName}' is not available. Available models: ${availableModels.join(', ')}`,
            'modelName'
          );
        }
        
        // Update AI model
        const success = await (await import('./ai-service')).updateAiModel(modelName);
        
        // Return standardized response format
        res.json({
          success: true,
          message: success 
            ? `Successfully updated AI model to: ${modelName}` 
            : `Model ${modelName} was saved but could not be initialized. Will try again on next server restart.`,
          data: { 
            modelName,
            initialized: success
          }
        });
      } catch (error) {
        // Log detailed error information
        logger.error('Error updating AI model', { 
          error, 
          requestedModel: modelName 
        });
        
        // Handle different error types
        if (error instanceof BadRequestError) {
          throw error;
        }
        
        // Check for API key issues
        if (error instanceof Error && error.message.includes('GEMINI_API_KEY')) {
          throw new AppError(
            "AI service configuration error. Missing API key.",
            ErrorCode.EXTERNAL_SERVICE_ERROR,
            500
          );
        }
        
        // Generic error fallback
        throw new AppError(
          "Failed to update AI model settings.",
          ErrorCode.INTERNAL_SERVER_ERROR,
          500,
          { originalError: error }
        );
      }
    })
  );
  
  // Get all AI settings
  app.get(
    "/api/admin/ai/settings", 
    isAuthenticated, 
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      // Check if user is admin
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can manage AI settings");
      }
      
      try {
        // Get all AI settings
        const settings = await storage.getAllAiSettings();
        
        // Return standardized response format
        res.json({
          success: true,
          data: settings,
          meta: {
            count: settings.length
          }
        });
      } catch (error) {
        // Log detailed error information
        logger.error('Error retrieving AI settings', { error });
        
        // Return generic error
        throw new AppError(
          "Failed to retrieve AI settings.",
          ErrorCode.INTERNAL_SERVER_ERROR,
          500,
          { originalError: error }
        );
      }
    })
  );

  // ===== PROMOTIONS API ROUTES =====
  
  // Get all promotions with their associated products
  app.get("/api/promotions", withStandardResponse(async (req: Request, res: Response) => {
    // SECURITY FIX: Check user role for admin filtering
    const user = req.user as any;
    const isAdmin = user && user.role === 'admin';
    
    // Apply admin filtering options
    const filterOptions = {
      includeInactive: isAdmin,
      includeCategoryInactive: isAdmin
    };
    
    const promotions = await storage.getPromotions();
    const promotionsWithProducts = [];
    
    for (const promotion of promotions) {
      const products = await storage.getPromotionProducts(promotion.id, filterOptions);
      promotionsWithProducts.push({
        ...promotion,
        promotionProducts: products
      });
    }
    
    return createPaginatedResponse(promotionsWithProducts, promotionsWithProducts.length, 1, 50);
  }));

  // Get active promotions only
  app.get("/api/promotions/active", withStandardResponse(async (req: Request, res: Response) => {
    const activePromotions = await storage.getActivePromotions();
    return createPaginatedResponse(activePromotions, activePromotions.length, 1, 50);
  }));

  // Get active promotions with their products (for flash deals display)
  app.get("/api/promotions/active-with-products", 
    withStandardResponse(async (req: Request, res: Response) => {
      // Set cache-busting headers to prevent stale cached responses
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      // SECURITY FIX: Check user role for admin filtering
      const user = req.user as any;
      const isAdmin = user && user.role === 'admin';
      
      // Apply admin filtering options
      const filterOptions = {
        includeInactive: isAdmin,
        includeCategoryInactive: isAdmin
      };
      
      const activePromotions = await storage.getActivePromotions();
      const promotionsWithProducts = [];
      
      // First, collect all promotional products from all active promotions
      const allPromotionalProducts = [];
      
      for (const promotion of activePromotions) {
        const products = await storage.getPromotionProducts(promotion.id, filterOptions);
        
        // Enhance products with calculated promotional pricing information
        const enhancedProducts = products.map(productPromotion => {
          const product = productPromotion.product;
          let calculatedPromotionalPrice = productPromotion.promotionalPrice;
          let extraDiscountPercentage = 0;
          
          // If promotional price is set, calculate extra discount from sale price
          if (calculatedPromotionalPrice && product.salePrice) {
            const salePrice = parseFloat(product.salePrice.toString());
            const promotionalPrice = parseFloat(calculatedPromotionalPrice.toString());
            
            if (salePrice > promotionalPrice) {
              extraDiscountPercentage = Math.round(((salePrice - promotionalPrice) / salePrice) * 100);
            }
          }
          // If no promotional price is set but there's a promotion discount, calculate it
          else if (!calculatedPromotionalPrice && promotion.discountValue && product.salePrice) {
            const discountPercentage = parseFloat(promotion.discountValue.toString());
            const salePrice = parseFloat(product.salePrice.toString());
            calculatedPromotionalPrice = Math.round(salePrice * (1 - discountPercentage / 100));
            extraDiscountPercentage = discountPercentage;
          }
          
          return {
            ...productPromotion,
            promotionalPrice: calculatedPromotionalPrice,
            extraDiscountPercentage: extraDiscountPercentage,
            promotion: promotion // Add promotion details to each product
          };
        });
        
        // Add products to the combined list
        allPromotionalProducts.push(...enhancedProducts);
      }
      
      // Apply randomization to the combined list using PostgreSQL RANDOM()
      const randomizedProducts = await storage.getRandomizedPromotionalProducts(allPromotionalProducts);
      
      // Group the randomized products back by promotion for display
      for (const promotion of activePromotions) {
        const promotionProducts = randomizedProducts.filter(
          product => product.promotion.id === promotion.id
        );
        
        promotionsWithProducts.push({
          ...promotion,
          products: promotionProducts
        });
      }
      
      return promotionsWithProducts;
    })
  );

  // Validate cart items against promotion requirements
  app.post("/api/promotions/validate-cart", withStandardResponse(async (req: Request, res: Response) => {
    const cartValidationSchema = z.object({
      items: z.array(z.object({
        productId: z.number(),
        quantity: z.number().min(1),
        product: z.object({
          id: z.number(),
          name: z.string(),
          price: z.number(),
          salePrice: z.number().optional()
        }).optional()
      }))
    });

    const { items } = cartValidationSchema.parse(req.body);
    
    // Import the validation service dynamically
    const { PromotionValidationService } = await import('./promotion-validation-service');
    
    const validationResult = await PromotionValidationService.validateCartForCheckout(items);
    
    return {
      isValid: validationResult.isValid,
      canProceedToCheckout: validationResult.canProceedToCheckout,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      blockedPromotions: validationResult.blockedPromotions
    };
  }));

  // Get promotion by ID
  app.get("/api/promotions/:id", withStandardResponse(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new BadRequestError("Invalid promotion ID");
    }
    
    const promotion = await storage.getPromotionById(id);
    if (!promotion) {
      throw new NotFoundError("Promotion not found");
    }
    
    return promotion;
  }));

  // Create new promotion (admin only)
  app.post("/api/promotions", 
    isAuthenticated, 
    isAdmin,
    validateRequest({
      body: insertPromotionSchema
    }),
    withStandardResponse(async (req: Request, res: Response) => {
      const user = req.user as any;
      const promotionData = { ...req.body, createdBy: user.id };
      const promotion = await storage.createPromotion(promotionData);
      return promotion;
    })
  );

  // Update promotion (admin only)
  app.patch("/api/promotions/:id",
    isAuthenticated,
    isAdmin,
    validateRequest({
      body: insertPromotionSchema.partial()
    }),
    withStandardResponse(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new BadRequestError("Invalid promotion ID");
      }
      
      const promotion = await storage.updatePromotion(id, req.body);
      if (!promotion) {
        throw new NotFoundError("Promotion not found");
      }
      
      return promotion;
    })
  );

  // Delete promotion (admin only)
  app.delete("/api/promotions/:id",
    isAuthenticated,
    isAdmin,
    withStandardResponse(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new BadRequestError("Invalid promotion ID");
      }
      
      const success = await storage.deletePromotion(id);
      if (!success) {
        throw new NotFoundError("Promotion not found");
      }
      
      return { message: "Promotion deleted successfully" };
    })
  );

  // Get products in a promotion
  app.get("/api/promotions/:id/products", withStandardResponse(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new BadRequestError("Invalid promotion ID");
    }
    
    const products = await storage.getPromotionProducts(id);
    return createPaginatedResponse(products, products.length, 1, 50);
  }));

  // Add product to promotion (admin only)
  app.post("/api/promotions/:id/products",
    isAuthenticated,
    isAdmin,
    validateRequest({
      body: z.object({
        productId: z.number().int().positive(),
        discountOverride: z.number().optional()
      })
    }),
    withStandardResponse(async (req: Request, res: Response) => {
      const promotionId = parseInt(req.params.id);
      if (isNaN(promotionId)) {
        throw new BadRequestError("Invalid promotion ID");
      }
      
      const { productId, discountOverride } = req.body;
      const productPromotion = await storage.addProductToPromotion(promotionId, productId, discountOverride);
      return productPromotion;
    })
  );

  // Remove product from promotion (admin only)
  app.delete("/api/promotions/:id/products/:productId",
    isAuthenticated,
    isAdmin,
    withStandardResponse(async (req: Request, res: Response) => {
      const promotionId = parseInt(req.params.id);
      const productId = parseInt(req.params.productId);
      
      if (isNaN(promotionId) || isNaN(productId)) {
        throw new BadRequestError("Invalid promotion ID or product ID");
      }
      
      const success = await storage.removeProductFromPromotion(promotionId, productId);
      if (!success) {
        throw new NotFoundError("Product not found in promotion");
      }
      
      return { message: "Product removed from promotion successfully" };
    })
  );

  // Update promotional price for a specific product in promotion (admin only)
  app.patch("/api/promotions/:id/products/:productId/price",
    isAuthenticated,
    isAdmin,
    validateRequest({
      body: z.object({
        promotionalPrice: z.number().positive()
      })
    }),
    withStandardResponse(async (req: Request, res: Response) => {
      const promotionId = parseInt(req.params.id);
      const productId = parseInt(req.params.productId);
      
      if (isNaN(promotionId) || isNaN(productId)) {
        throw new BadRequestError("Invalid promotion ID or product ID");
      }
      
      const { promotionalPrice } = req.body;
      const updated = await storage.updatePromotionalPrice(promotionId, productId, promotionalPrice);
      
      if (!updated) {
        throw new NotFoundError("Product not found in promotion");
      }
      
      return { message: "Promotional price updated successfully" };
    })
  );

  // Mass publish all products in a promotion (admin only)
  app.post("/api/promotions/:id/products/mass-publish",
    isAuthenticated,
    isAdmin,
    withStandardResponse(async (req: Request, res: Response) => {
      const promotionId = parseInt(req.params.id);
      
      if (isNaN(promotionId)) {
        throw new BadRequestError("Invalid promotion ID");
      }
      
      const result = await storage.massPublishPromotionProducts(promotionId);
      
      return { 
        message: `${result.publishedCount} products published successfully`,
        publishedCount: result.publishedCount,
        skippedCount: result.skippedCount,
        errors: result.errors
      };
    })
  );

  // Bulk add products to promotion (admin only)
  app.post("/api/promotions/:id/products/bulk",
    isAuthenticated,
    isAdmin,
    validateRequest({
      body: z.object({
        type: z.enum(["category", "supplier", "catalog"]),
        id: z.string(),
        includeSubcategories: z.boolean().optional()
      })
    }),
    withStandardResponse(async (req: Request, res: Response) => {
      const promotionId = parseInt(req.params.id);
      if (isNaN(promotionId)) {
        throw new BadRequestError("Invalid promotion ID");
      }
      
      const { type, id: targetId, includeSubcategories } = req.body;
      let productIds: number[] = [];
      
      switch (type) {
        case "category":
          productIds = await storage.getProductIdsByCategory(parseInt(targetId), includeSubcategories);
          break;
        case "supplier":
          productIds = await storage.getProductIdsBySupplier(parseInt(targetId));
          break;
        case "catalog":
          productIds = await storage.getProductIdsByCatalog(parseInt(targetId));
          break;
        default:
          throw new BadRequestError("Invalid bulk operation type");
      }
      
      if (productIds.length === 0) {
        return { count: 0, message: "No products found for the specified criteria" };
      }
      
      const productPromotions = await storage.bulkAddProductsToPromotion(promotionId, productIds);
      return { 
        count: productPromotions.length,
        message: `${productPromotions.length} products added to promotion successfully`,
        productPromotions 
      };
    })
  );

  // Bulk remove products from promotion (admin only)
  app.delete("/api/promotions/:id/products/bulk",
    isAuthenticated,
    isAdmin,
    validateRequest({
      body: z.object({
        productIds: z.array(z.number().int().positive()).min(1)
      })
    }),
    withStandardResponse(async (req: Request, res: Response) => {
      const promotionId = parseInt(req.params.id);
      if (isNaN(promotionId)) {
        throw new BadRequestError("Invalid promotion ID");
      }
      
      const { productIds } = req.body;
      const success = await storage.bulkRemoveProductsFromPromotion(promotionId, productIds);
      if (!success) {
        throw new NotFoundError("Failed to remove products from promotion");
      }
      
      return { 
        message: `${productIds.length} products removed from promotion successfully`
      };
    })
  );

  // Get promotions for a specific product
  app.get("/api/products/:id/promotions", withStandardResponse(async (req: Request, res: Response) => {
    const productId = parseInt(req.params.id);
    if (isNaN(productId)) {
      throw new BadRequestError("Invalid product ID");
    }
    
    const promotions = await storage.getProductPromotions(productId);
    return createPaginatedResponse(promotions, promotions.length, 1, 50);
  }));

  // CSV Import endpoint for promotion products (admin only)
  app.post("/api/promotions/:id/import-csv",
    isAuthenticated,
    isAdmin,
    validateRequest({
      body: z.object({
        csvContent: z.string().min(1),
        type: z.enum(["sku", "category", "supplier", "catalog"]).default("sku"),
        hasHeaders: z.boolean().default(true),
        delimiter: z.string().default(","),
        includeSubcategories: z.boolean().optional()
      })
    }),
    withStandardResponse(async (req: Request, res: Response) => {
      const promotionId = parseInt(req.params.id);
      if (isNaN(promotionId)) {
        throw new BadRequestError("Invalid promotion ID");
      }
      
      const { csvContent, type, hasHeaders, delimiter, includeSubcategories } = req.body;
      
      // Import CSV using the promotion CSV importer
      const { PromotionCsvImporter } = await import('./promotion-csv-importer');
      
      let result;
      switch (type) {
        case "sku":
          result = await PromotionCsvImporter.importFromCsv(promotionId, csvContent, { hasHeaders, delimiter });
          break;
        case "category":
          result = await PromotionCsvImporter.importByCategoryFromCsv(promotionId, csvContent, { hasHeaders, delimiter, includeSubcategories });
          break;
        case "supplier":
          result = await PromotionCsvImporter.importBySupplierFromCsv(promotionId, csvContent, { hasHeaders, delimiter });
          break;
        default:
          throw new BadRequestError("Invalid import type");
      }
      
      return result;
    })
  );

  // Get CSV template for promotion imports (admin only)
  app.get("/api/promotions/csv-template/:type",
    isAuthenticated,
    isAdmin,
    withStandardResponse(async (req: Request, res: Response) => {
      const type = req.params.type as 'sku' | 'category' | 'supplier' | 'catalog';
      
      if (!['sku', 'category', 'supplier', 'catalog'].includes(type)) {
        throw new BadRequestError("Invalid template type");
      }
      
      const { PromotionCsvImporter } = await import('./promotion-csv-importer');
      const template = PromotionCsvImporter.generateCsvTemplate(type);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="promotion-${type}-template.csv"`);
      return template;
    })
  );

  // Get promotion scheduler status (admin only)
  app.get("/api/promotions/scheduler/status",
    isAuthenticated,
    isAdmin,
    withStandardResponse(async (req: Request, res: Response) => {
      const { promotionScheduler } = await import('./promotion-scheduler');
      return promotionScheduler.getStatus();
    })
  );

  // Refresh promotion scheduler tasks (admin only)
  app.post("/api/promotions/scheduler/refresh",
    isAuthenticated,
    isAdmin,
    withStandardResponse(async (req: Request, res: Response) => {
      const { promotionScheduler } = await import('./promotion-scheduler');
      await promotionScheduler.refreshTasks();
      return { message: "Scheduler tasks refreshed successfully" };
    })
  );

  // Get promotion analytics data (admin only)
  app.get("/api/promotions/analytics",
    isAuthenticated,
    isAdmin,
    withStandardResponse(async (req: Request, res: Response) => {
      const { from, to, promotionId, compareFrom, compareTo } = req.query as {
        from: string;
        to: string;
        promotionId?: string;
        compareFrom?: string;
        compareTo?: string;
      };

      if (!from || !to) {
        throw new BadRequestError("Date range parameters 'from' and 'to' are required");
      }

      const analytics = await storage.getPromotionAnalytics(
        promotionId ? parseInt(promotionId) : undefined,
        {
          from: new Date(from),
          to: new Date(to)
        },
        compareFrom && compareTo ? {
          from: new Date(compareFrom),
          to: new Date(compareTo)
        } : undefined
      );

      return analytics;
    })
  );

  // Get promotion performance metrics (admin only)
  app.get("/api/promotions/:id/performance",
    isAuthenticated,
    isAdmin,
    withStandardResponse(async (req: Request, res: Response) => {
      const promotionId = parseInt(req.params.id);
      if (isNaN(promotionId)) {
        throw new BadRequestError("Invalid promotion ID");
      }

      const performance = await storage.getPromotionPerformanceMetrics(promotionId);
      return performance;
    })
  );

  // Get promotion top products (admin only)
  app.get("/api/promotions/:id/top-products",
    isAuthenticated,
    isAdmin,
    withStandardResponse(async (req: Request, res: Response) => {
      const promotionId = parseInt(req.params.id);
      if (isNaN(promotionId)) {
        throw new BadRequestError("Invalid promotion ID");
      }

      const { limit = '10' } = req.query as { limit?: string };
      const topProducts = await storage.getPromotionTopProducts(promotionId, parseInt(limit));
      return topProducts;
    })
  );

  // USER PROFILE UPDATE ENDPOINT
  app.patch(
    "/api/user/profile",
    isAuthenticated,
    validateRequest({
      body: z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        phone: z.string().optional(),
        addressLine1: z.string().optional(),
        addressLine2: z.string().optional(),
        city: z.string().optional(),
        province: z.string().optional(),
        postalCode: z.string().optional()
      })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user as any;
      const profileData = req.body;
      
      try {
        // Map the request fields to database fields 
        const updateData: any = {};
        
        if (profileData.firstName || profileData.lastName) {
          updateData.fullName = `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim();
        }
        if (profileData.phone) updateData.phoneNumber = profileData.phone;
        if (profileData.addressLine1) updateData.address = profileData.addressLine1;
        if (profileData.city) updateData.city = profileData.city;
        if (profileData.province) updateData.province = profileData.province;
        if (profileData.postalCode) updateData.postalCode = profileData.postalCode;
        
        // Update the user profile
        const updatedUser = await storage.updateUser(user.id, updateData);
        
        if (!updatedUser) {
          throw new NotFoundError("User not found", "user");
        }
        
        return res.json({
          success: true,
          data: updatedUser,
          message: "Profile updated successfully"
        });
      } catch (error) {
        logger.error('Error updating user profile', { 
          error, 
          userId: user.id,
          profileData 
        });
        
        throw new AppError(
          "Failed to update profile. Please try again.",
          ErrorCode.INTERNAL_SERVER_ERROR,
          500,
          { originalError: error }
        );
      }
    })
  );

  // CART ROUTES
  app.get(
    "/api/cart",
    asyncHandler(async (req: Request, res: Response) => {
      try {
        if (!req.isAuthenticated()) {
          // For non-authenticated users, return empty cart
          return res.json({
            success: true,
            data: []
          });
        }
        
        const user = req.user as any;
        const cartItems = await storage.getCartItemsWithProducts(user.id);
        
        return res.json({
          success: true,
          data: cartItems,
          meta: {
            count: cartItems.length,
            totalItems: cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0)
          }
        });
      } catch (error) {
        // Log detailed error information
        logger.error('Error retrieving cart items', { 
          error, 
          userId: req.user ? (req.user as any).id : 'unauthenticated' 
        });
        
        // Return generic error
        throw new AppError(
          "Failed to retrieve cart items.",
          ErrorCode.INTERNAL_SERVER_ERROR,
          500,
          { originalError: error }
        );
      }
    })
  );

  // CART TOTALS WITH VAT - Server-side calculation endpoint
  app.get(
    "/api/cart/totals",
    asyncHandler(async (req: Request, res: Response) => {
      try {
        if (!req.isAuthenticated()) {
          // For non-authenticated users, return empty totals (no shipping in cart)
          return res.json({
            success: true,
            data: {
              subtotal: 0,
              shippingCost: 0, // Shipping calculated at checkout
              vatRate: 0,
              vatAmount: 0,
              totalAmount: 0,
              itemCount: 0,
              vatBreakdown: {
                vatableAmount: 0,
                vatRegistered: false,
                vatRegistrationNumber: ""
              }
            }
          });
        }
        
        const user = req.user as any;
        const cartItems = await storage.getCartItemsWithProducts(user.id);
        
        // Get VAT settings from systemSettings
        const vatRateSettings = await storage.getSystemSetting('vatRate');
        const vatRegisteredSettings = await storage.getSystemSetting('vatRegistered');
        const vatRegistrationNumberSettings = await storage.getSystemSetting('vatRegistrationNumber');
        
        // Check if VAT settings are active and properly configured
        const vatRateValue = parseFloat(vatRateSettings?.settingValue || '0');
        const vatRegistered = vatRegisteredSettings?.settingValue === 'true';
        const vatRegistrationNumber = vatRegistrationNumberSettings?.settingValue || '';
        const vatRateActive = vatRateSettings?.isActive === true;
        const vatRegisteredActive = vatRegisteredSettings?.isActive === true;
        
        // Calculate subtotal using stored cart item prices
        const subtotal = cartItems.reduce((sum: number, item: any) => {
          const currentPrice = parseFloat(item.itemPrice || '0');
          const quantity = item.quantity || 0;
          return sum + (currentPrice * quantity);
        }, 0);
        
        const shippingCost = 0; // Shipping calculated at checkout, not in cart
        
        // VAT calculation logic: Apply VAT only if settings are active AND company is VAT registered
        // VAT applies only to product subtotal, shipping VAT is handled at checkout
        const shouldApplyVAT = vatRateActive && vatRegisteredActive && vatRegistered;
        const effectiveVATRate = shouldApplyVAT ? vatRateValue : 0;
        
        const vatableAmount = subtotal; // Only product subtotal for cart VAT
        const vatAmount = vatableAmount * (effectiveVATRate / 100);
        const totalAmount = vatableAmount + vatAmount;
        
        const totals = {
          subtotal: Math.round(subtotal * 100) / 100,
          shippingCost,
          vatRate: effectiveVATRate,
          vatAmount: Math.round(vatAmount * 100) / 100,
          totalAmount: Math.round(totalAmount * 100) / 100,
          itemCount: cartItems.length,
          totalItemQuantity: cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0),
          vatBreakdown: {
            vatableAmount: Math.round(vatableAmount * 100) / 100,
            vatRegistered,
            vatRegistrationNumber,
            vatActive: shouldApplyVAT,
            configuredVATRate: vatRateValue
          }
        };
        
        logger.info('Cart totals calculated server-side', { 
          userId: user.id, 
          totals,
          cartItemCount: cartItems.length,
          vatSettings: {
            vatRateValue,
            vatRegistered,
            vatRateActive,
            vatRegisteredActive,
            shouldApplyVAT,
            effectiveVATRate
          }
        });
        
        return res.json({
          success: true,
          data: totals
        });
        
      } catch (error) {
        logger.error('Error calculating cart totals', { 
          error, 
          userId: req.user ? (req.user as any).id : 'unauthenticated' 
        });
        
        throw new AppError(
          "Failed to calculate cart totals.",
          ErrorCode.INTERNAL_SERVER_ERROR,
          500,
          { originalError: error }
        );
      }
    })
  );

  app.post(
    "/api/cart", 
    isAuthenticated,
    trackCartActivity,
    validateRequest({
      body: z.object({
        productId: z.coerce.number().positive("Product ID is required"),
        quantity: z.coerce.number().int().positive("Quantity must be a positive integer"),
        itemPrice: z.coerce.number().positive("Item price is required"),
        attributeSelections: z.record(z.string()).optional()
      })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user as any;
      const { productId, quantity, itemPrice, attributeSelections } = req.body;
      
      // Debug: Log the incoming request data with explicit output
      console.error(`=== CART DEBUG START ===`);
      console.error(`Request body:`, JSON.stringify(req.body, null, 2));
      console.error(`itemPrice extracted:`, itemPrice, typeof itemPrice);
      console.error(`=== CART DEBUG END ===`);
      
      try {
        // Check if product exists and is active - only allow active products for customers
        const product = await storage.getProductById(productId, { includeInactive: false });
        if (!product) {
          logger.warn(`Attempted to add non-existent or inactive product to cart`, {
            productId,
            userId: user.id,
            requestedQuantity: quantity
          });
          throw new NotFoundError(`Product with ID ${productId} not found`, "product");
        }
        
        // Verify product availability - HeartCart doesn't track stock levels, but in future:
        // This block could check if the requested quantity exceeds available stock
        // For now, log the request for potential future implementation
        logger.debug(`Checking availability for product addition to cart`, {
          productId,
          userId: user.id,
          productName: product.name,
          catalogId: product.catalogId,
          requestedQuantity: quantity
        });
        
        // Create simplified cart item data without deprecated combination logic
        const cartItemData = {
          productId,
          quantity,
          userId: user.id,
          itemPrice,
          attributeSelections: attributeSelections || {},
          createdAt: new Date().toISOString(),
        };
        
        const cartItem = await storage.addToCart(cartItemData);
        
        // Set status code to 201 Created
        res.status(201).json({
          success: true,
          data: cartItem,
          message: `Added ${quantity} of product "${product.name}" to your cart.`
        });
      } catch (error) {
        // Log detailed error information with context
        logger.error('Error adding item to cart', { 
          error, 
          userId: user.id,
          productId: req.body.productId
        });
        
        // Check for specific error types
        if (error instanceof NotFoundError || error instanceof BadRequestError) {
          throw error;
        }
        
        // Return generic error for unexpected issues
        throw new AppError(
          "Failed to add item to cart. Please try again.",
          ErrorCode.INTERNAL_SERVER_ERROR,
          500,
          { originalError: error }
        );
      }
    })
  );

  app.put(
    "/api/cart/:id", 
    isAuthenticated, 
    validateRequest({
      params: z.object({
        id: z.coerce.number().positive("Cart item ID is required")
      }),
      body: z.object({
        quantity: z.coerce.number().int().min(0, "Quantity must be a non-negative integer")
      })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const { quantity } = req.body;
      const cartItemId = Number(id);
      const user = req.user as any;
      
      try {
        // Check if cart item exists with comprehensive error handling
        const cartItem = await storage.getCartItemById(cartItemId);
        
        if (!cartItem) {
          logger.warn(`Attempted to update non-existent cart item`, {
            cartItemId,
            userId: user.id,
            requestedQuantity: quantity
          });
          throw new NotFoundError(`Cart item with ID ${cartItemId} not found`, "cartItem");
        }
        
        // Verify ownership with detailed error context
        if (cartItem.userId !== user.id) {
          logger.warn(`Unauthorized cart item update attempt`, {
            cartItemId,
            itemOwnerId: cartItem.userId,
            requesterId: user.id,
            requestedQuantity: quantity
          });
          throw new ForbiddenError(`Cannot update cart item ${cartItemId} that doesn't belong to you`);
        }
        
        // Handle quantity of 0 by removing the item
        if (quantity === 0) {
          logger.info(`Removing cart item due to zero quantity update`, {
            cartItemId,
            userId: user.id,
            productId: cartItem.productId,
            previousQuantity: cartItem.quantity
          });
          
          await storage.removeFromCart(cartItemId);
          
          return res.json({
            success: true,
            data: { removed: true },
            message: "Item removed from cart"
          });
        }
        
        // Check if product still exists and is active before updating quantity
        const product = await storage.getProductById(cartItem.productId);
        if (!product) {
          logger.warn(`Cart contains non-existent product`, {
            cartItemId,
            userId: user.id,
            productId: cartItem.productId
          });
          throw new NotFoundError(`Product in cart (ID: ${cartItem.productId}) no longer exists`, "product");
        }
        
        if (!product.isActive) {
          logger.warn(`Attempted to update quantity for inactive product in cart`, {
            cartItemId,
            userId: user.id,
            productId: cartItem.productId,
            productName: product.name,
            requestedQuantity: quantity
          });
          throw new BadRequestError(`Cannot update quantity for inactive product "${product.name}"`);
        }
        
        // Verify stock availability - HeartCart doesn't track stock levels, but log for future implementation
        logger.debug(`Checking availability for cart item update`, {
          cartItemId,
          userId: user.id,
          productId: cartItem.productId,
          productName: product.name,
          catalogId: product.catalogId,
          currentQuantity: cartItem.quantity,
          requestedQuantity: quantity
        });
        
        // Update the quantity with enhanced context
        const updatedItem = await storage.updateCartItemQuantity(cartItemId, quantity);
        
        // We already have the product details from our earlier check
        const productName = product.name;
        
        return res.json({
          success: true,
          data: { item: updatedItem },
          message: `Updated quantity of "${productName}" to ${quantity}`
        });
      } catch (error) {
        // Log detailed error information with context
        logger.error('Error updating cart item', { 
          error, 
          userId: user.id,
          cartItemId
        });
        
        // Check for specific error types
        if (error instanceof NotFoundError || error instanceof ForbiddenError) {
          throw error;
        }
        
        // Return generic error for unexpected issues
        throw new AppError(
          "Failed to update cart item. Please try again.",
          ErrorCode.INTERNAL_SERVER_ERROR,
          500,
          { originalError: error }
        );
      }
    })
  );

  app.delete(
    "/api/cart/:id", 
    isAuthenticated, 
    validateRequest({
      params: z.object({
        id: z.coerce.number().positive("Cart item ID is required")
      })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const cartItemId = Number(id);
      const user = req.user as any;
      
      try {
        // Check if cart item exists with comprehensive error handling (but remain idempotent)
        const cartItem = await storage.getCartItemById(cartItemId);
        
        // If cart item doesn't exist, return success (idempotent delete)
        if (!cartItem) {
          logger.info(`Attempted to remove non-existent cart item (idempotent operation)`, {
            cartItemId,
            userId: user.id
          });
          
          return res.json({
            success: true,
            data: { removed: true },
            message: "Cart item already removed"
          });
        }
        
        // Validate ownership with detailed error context
        if (cartItem.userId !== user.id) {
          logger.warn(`Unauthorized cart item deletion attempt`, {
            cartItemId,
            itemOwnerId: cartItem.userId,
            requesterId: user.id
          });
          throw new ForbiddenError(`Cannot delete cart item ${cartItemId} that doesn't belong to you`);
        }
        
        // Get product details for meaningful response message and logging
        try {
          const product = await storage.getProductById(cartItem.productId);
          
          logger.info(`Removing cart item`, {
            cartItemId,
            userId: user.id,
            productId: cartItem.productId,
            productName: product ? product.name : null,
            quantity: cartItem.quantity
          });
          
          // Remove the item
          await storage.removeFromCart(cartItemId);
          
          const productName = product ? product.name : `Product #${cartItem.productId}`;
          return res.json({
            success: true,
            data: { removed: true },
            message: `Removed "${productName}" from your cart`
          });
        } catch (productError) {
          // If we can't get the product info, still remove the cart item but with generic message
          logger.warn(`Failed to retrieve product info during cart item removal`, {
            error: productError,
            cartItemId,
            userId: user.id,
            productId: cartItem.productId
          });
          
          // Remove the item anyway
          await storage.removeFromCart(cartItemId);
        
          return res.json({
            success: true,
            data: { removed: true },
            message: `Item removed from your cart`
          });
        }
      } catch (error) {
        // Log detailed error information with context
        logger.error('Error removing cart item', { 
          error, 
          userId: user.id,
          cartItemId
        });
        
        // Check for specific error types
        if (error instanceof ForbiddenError) {
          throw error;
        }
        
        // Return generic error for unexpected issues
        throw new AppError(
          "Failed to remove item from cart. Please try again.",
          ErrorCode.INTERNAL_SERVER_ERROR,
          500,
          { originalError: error }
        );
      }
    })
  );

  app.delete(
    "/api/cart", 
    isAuthenticated, 
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      try {
        // Get cart items count before clearing for meaningful response and logging
        try {
          const cartItems = await storage.getCartItemsWithProducts(user.id);
          const itemCount = cartItems.length;
          
          // Log the cart clear operation with detailed context
          logger.info(`Clearing entire cart`, {
            userId: user.id,
            itemCount,
            cartItemIds: cartItems.map(item => item.id),
            productIds: cartItems.map(item => item.productId)
          });
          
          // Clear the cart
          await storage.clearCart(user.id);
          
          return res.json({
            success: true,
            data: { cleared: true },
            message: itemCount > 0 
              ? `Successfully cleared ${itemCount} items from your cart` 
              : "Cart was already empty"
          });
        } catch (itemsError) {
          // Log the error but still attempt to clear the cart
          logger.warn(`Failed to retrieve cart items before clearing`, {
            error: itemsError,
            userId: user.id
          });
          
          // Still attempt to clear the cart even if we couldn't get the items
          await storage.clearCart(user.id);
          
          return res.json({
            success: true,
            data: { cleared: true },
            message: "Your cart has been cleared"
          });
        }
      } catch (error) {
        // Log detailed error information with context
        logger.error('Error clearing cart', { 
          error, 
          userId: user.id
        });
        
        // Return generic error for unexpected issues
        throw new AppError(
          "Failed to clear your cart. Please try again.",
          ErrorCode.INTERNAL_SERVER_ERROR,
          500,
          { originalError: error }
        );
      }
    })
  );

  // Remove attribute option from cart item
  app.patch(
    "/api/cart/:id/remove-attribute", 
    isAuthenticated, 
    validateRequest({
      params: z.object({
        id: z.coerce.number().positive("Cart item ID is required")
      }),
      body: z.object({
        attributeName: z.string().min(1, "Attribute name is required"),
        attributeValue: z.string().min(1, "Attribute value is required")
      })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const { attributeName, attributeValue } = req.body;
      const cartItemId = Number(id);
      const user = req.user as any;
      
      try {
        // Check if cart item exists
        const cartItem = await storage.getCartItemById(cartItemId);
        
        if (!cartItem) {
          throw new NotFoundError(`Cart item with ID ${cartItemId} not found`, "cartItem");
        }
        
        // Verify ownership
        if (cartItem.userId !== user.id) {
          throw new ForbiddenError(`Cannot modify cart item ${cartItemId} that doesn't belong to you`);
        }
        
        // Parse current attribute selections
        const currentSelections = cartItem.attributeSelections || {};
        
        if (!currentSelections[attributeName]) {
          throw new BadRequestError(`Attribute "${attributeName}" not found in cart item`);
        }
        
        // Handle different attribute selection formats
        let updatedSelections = { ...currentSelections };
        let shouldDecreaseQuantity = false;
        
        if (Array.isArray(currentSelections[attributeName])) {
          // Remove specific value from array
          const valueArray = currentSelections[attributeName] as string[];
          const filteredArray = valueArray.filter(val => val !== attributeValue);
          
          if (filteredArray.length === valueArray.length) {
            throw new BadRequestError(`Attribute value "${attributeValue}" not found in "${attributeName}"`);
          }
          
          // Removing any attribute option should decrease quantity by 1
          shouldDecreaseQuantity = true;
          
          if (filteredArray.length === 0) {
            // If no values left, remove the attribute entirely
            delete updatedSelections[attributeName];
          } else {
            updatedSelections[attributeName] = filteredArray;
          }
        } else if (typeof currentSelections[attributeName] === 'object' && currentSelections[attributeName] !== null) {
          // Handle object-based attribute selections with counts (e.g., {"Boy": 1, "Girl": 1})
          const attributeObject = currentSelections[attributeName] as Record<string, number>;
          
          if (!(attributeValue in attributeObject)) {
            throw new BadRequestError(`Attribute value "${attributeValue}" not found in "${attributeName}"`);
          }
          
          // Decrease the count for this specific attribute value
          const updatedAttributeObject = { ...attributeObject };
          
          if (updatedAttributeObject[attributeValue] > 1) {
            // Decrease count by 1
            updatedAttributeObject[attributeValue] -= 1;
          } else {
            // Remove the attribute value entirely if count would become 0
            delete updatedAttributeObject[attributeValue];
          }
          
          // Check if any attribute values remain
          if (Object.keys(updatedAttributeObject).length === 0) {
            // Remove the entire attribute if no values left
            delete updatedSelections[attributeName];
          } else {
            updatedSelections[attributeName] = updatedAttributeObject;
          }
          
          shouldDecreaseQuantity = true;
        } else {
          // Single value attribute (string)
          if (currentSelections[attributeName] !== attributeValue) {
            throw new BadRequestError(`Attribute value "${attributeValue}" does not match current value "${currentSelections[attributeName]}"`);
          }
          
          // Remove the entire attribute
          delete updatedSelections[attributeName];
          shouldDecreaseQuantity = true;
        }
        
        // Always decrease quantity when removing attribute options
        if (shouldDecreaseQuantity) {
          if (cartItem.quantity === 1) {
            // Remove entire cart item if quantity would become 0
            await storage.removeFromCart(cartItemId);
            
            return res.json({
              success: true,
              data: { removed: true },
              message: "Item removed from cart"
            });
          } else {
            // Decrease quantity by 1 and update attributes
            const newQuantity = cartItem.quantity - 1;
            
            // Update both quantity and attributes
            await storage.updateCartItemQuantity(cartItemId, newQuantity);
            const updatedItem = await storage.updateCartItemAttributes(cartItemId, updatedSelections);
            
            return res.json({
              success: true,
              data: { ...updatedItem, quantity: newQuantity },
              message: `Removed ${attributeName}: ${attributeValue}, quantity decreased to ${newQuantity}`
            });
          }
        } else {
          // This case shouldn't happen with current logic, but keeping for safety
          const updatedItem = await storage.updateCartItemAttributes(cartItemId, updatedSelections);
          
          return res.json({
            success: true,
            data: updatedItem,
            message: `Removed ${attributeName}: ${attributeValue} from cart item`
          });
        }
      } catch (error) {
        logger.error('Error removing attribute option from cart item', { 
          error, 
          userId: user.id,
          cartItemId,
          attributeName,
          attributeValue
        });
        
        if (error instanceof NotFoundError || error instanceof ForbiddenError || error instanceof BadRequestError) {
          throw error;
        }
        
        throw new AppError(
          "Failed to remove attribute option. Please try again.",
          ErrorCode.INTERNAL_SERVER_ERROR,
          500,
          { originalError: error }
        );
      }
    })
  );

  // ORDER ROUTES
  app.post(
    "/api/orders", 
    isAuthenticated, 
    validateRequest({
      body: z.object({
        order: z.object({
          shippingAddress: z.string().min(1, "Shipping address is required"),
          billingAddress: z.string().min(1, "Billing address is required"),
          paymentMethod: z.enum(["credit_card", "paypal", "bank_transfer", "cash_on_delivery"], {
            errorMap: () => ({ message: "Invalid payment method" })
          }),
          shippingMethod: z.enum(["standard", "express", "overnight"], {
            errorMap: () => ({ message: "Invalid shipping method" })
          }),
          notes: z.string().optional(),
          total: z.coerce.number().min(0, "Total must be a non-negative number"),
          discountCode: z.string().optional(),
          discountAmount: z.coerce.number().min(0, "Discount amount must be a non-negative number").optional(),
          shippingCost: z.coerce.number().min(0, "Shipping cost must be a non-negative number")
        }),
        items: z.array(
          z.object({
            productId: z.coerce.number().positive("Product ID is required"),
            quantity: z.coerce.number().int().positive("Quantity must be a positive integer"),
            priceAtPurchase: z.coerce.number().min(0, "Price must be a non-negative number"),
            attributeValues: z.array(z.any()).optional()
          })
        ).min(1, "At least one item is required")
      })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user as any;
      const { order, items } = req.body;
      
      try {
        // Validate that the cart is not empty
        const userCart = await storage.getCartItemsWithProducts(user.id);
        if (!userCart || userCart.length === 0) {
          throw new BadRequestError("Cannot create an order with an empty cart");
        }
        
        // Validate that all products in the order exist and are active
        const unavailableProducts = [];
        
        for (const item of items) {
          const product = await storage.getProductById(item.productId);
          if (!product) {
            throw new NotFoundError(`Product with ID ${item.productId} not found`, "product");
          }
          
          if (!product.isActive) {
            unavailableProducts.push(product.name);
          }
        }
        
        if (unavailableProducts.length > 0) {
          throw new BadRequestError(
            `The following products are no longer available: ${unavailableProducts.join(', ')}`
          );
        }
        
        // Create the order with the user ID
        const orderData = {
          ...order,
          userId: user.id,
          status: "pending" // Default status for new orders
        };
        
        // Create the order (storage layer wraps this in a transaction)
        const newOrder = await storage.createOrder(orderData, items);
        
        try {
          // Clear the user's cart after successful order creation
          await storage.clearCart(user.id);
        } catch (cartError) {
          // Log but don't fail the order if cart clearing fails
          logger.error('Failed to clear cart after order creation', { 
            error: cartError, 
            userId: user.id,
            orderId: newOrder.id
          });
        }
        
        // Set status code to 201 Created and return response
        return res.status(201).json({
          success: true,
          data: newOrder,
          message: `Order #${newOrder.id} created successfully. Thank you for your purchase!`
        });
      } catch (error) {
        // Log detailed error information with context
        logger.error('Error creating order', { 
          error, 
          userId: user.id,
          orderDetails: {
            total: order.total,
            itemCount: items.length
          }
        });
        
        // Check for specific error types
        if (error instanceof NotFoundError || error instanceof BadRequestError) {
          throw error;
        }
        
        // Handle possible payment processing errors
        if (error instanceof Error && error.message.includes('payment')) {
          throw new AppError(
            "Payment processing failed. Please try again or use a different payment method.",
            ErrorCode.PAYMENT_PROCESSING_ERROR,
            400,
            { originalError: error }
          );
        }
        
        // Return generic error for unexpected issues
        throw new AppError(
          "Failed to create your order. Please try again.",
          ErrorCode.INTERNAL_SERVER_ERROR,
          500,
          { originalError: error }
        );
      }
    })
  );

  app.get(
    "/api/orders", 
    isAuthenticated, 
    validateRequest({
      query: z.object({
        status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).optional(),
        limit: z.coerce.number().int().positive().optional().default(20),
        offset: z.coerce.number().int().min(0).optional().default(0)
      }).optional()
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user as any;
      const { status, limit = 20, offset = 0 } = req.query;
      
      // Debug logging for authentication
      logger.info('Orders API called', { 
        userExists: !!user, 
        userId: user?.id, 
        userRole: user?.role,
        sessionId: req.sessionID 
      });
      
      if (!user || !user.id) {
        logger.warn('Orders API called without authenticated user', { 
          hasUser: !!user, 
          sessionId: req.sessionID 
        });
        throw new AppError("Authentication required", ErrorCode.UNAUTHORIZED, 401);
      }
      
      try {
        logger.info('Fetching orders for user', { userId: user.id });
        
        // Get orders for the authenticated user with items included
        const basicOrders = await storage.getOrdersByUser(user.id);
        
        logger.info('Retrieved basic orders', { 
          userId: user.id, 
          orderCount: basicOrders.length,
          orderIds: basicOrders.map(o => o.id)
        });
        
        // Enhance each order with its items
        const ordersWithItems = await Promise.all(
          basicOrders.map(async (order) => {
            try {
              const orderWithItems = await storage.getOrderById(order.id);
              return orderWithItems || order;
            } catch (error) {
              logger.warn('Failed to fetch items for order', { orderId: order.id, error });
              return { ...order, items: [] };
            }
          })
        );
        
        // Apply status filter if provided
        const filteredOrders = status 
          ? ordersWithItems.filter(order => order.status === status)
          : ordersWithItems;
        
        logger.info('Returning filtered orders', { 
          userId: user.id,
          totalOrders: basicOrders.length,
          filteredCount: filteredOrders.length,
          statusFilter: status || 'all'
        });
        
        return res.json({
          success: true,
          data: filteredOrders,
          meta: {
            count: filteredOrders.length,
            total: basicOrders.length,
            status: status || 'all'
          }
        });
      } catch (error) {
        // Log detailed error information with context
        logger.error('Error retrieving user orders', { 
          error, 
          userId: user?.id, 
          filters: { status, limit, offset }
        });
        
        // Return generic error
        throw new AppError(
          "Failed to retrieve your orders. Please try again.",
          ErrorCode.INTERNAL_SERVER_ERROR,
          500,
          { originalError: error }
        );
      }
    })
  );

  // Clean admin orders API - get all orders with proper relations
  app.get(
    "/api/admin/orders", 
    asyncHandler(async (req: Request, res: Response) => {
      
      try {
        // Get all orders with their items using Drizzle relations
        const ordersData = await db.query.orders.findMany({
          orderBy: [desc(orders.createdAt)],
          with: {
            orderItems: {
              with: {
                product: true
              }
            },
            user: {
              columns: {
                id: true,
                username: true,
                email: true
              }
            }
          }
        });
        
        logger.info('Admin orders fetched successfully', { 
          orderCount: ordersData.length 
        });
        
        return res.json({
          success: true,
          data: ordersData
        });
      } catch (error) {
        logger.error('Error fetching admin orders', { 
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack
          } : error
        });
        
        return res.status(500).json({
          success: false,
          error: { 
            message: "Failed to fetch orders",
            details: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }
    })
  );

  app.get(
    "/api/orders/:id", 
    isAuthenticated, 
    validateRequest({
      params: z.object({
        id: z.coerce.number().positive("Order ID is required")
      })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const orderId = Number(id);
      const user = req.user as any;
      
      try {
        // Get the order
        const order = await storage.getOrderById(orderId);
        
        if (!order) {
          throw new NotFoundError(`Order with ID ${orderId} not found`, "order");
        }
        
        // Check if the order belongs to the authenticated user or user is admin
        if (order.userId !== user.id && user.role !== 'admin') {
          throw new ForbiddenError("You are not authorized to view this order");
        }
        
        // For simplicity in the error handling implementation, 
        // return an empty items array as the actual getOrderItems method doesn't exist yet
        const orderItems = [];
        
        return res.json({
          success: true,
          data: {
            ...order,
            items: orderItems
          }
        });
      } catch (error) {
        // Log detailed error information with context
        logger.error('Error retrieving order by ID', { 
          error, 
          userId: user.id,
          orderId
        });
        
        // Check for specific error types
        if (error instanceof NotFoundError || error instanceof ForbiddenError) {
          throw error;
        }
        
        // Return generic error for unexpected issues
        throw new AppError(
          "Failed to retrieve order details. Please try again.",
          ErrorCode.INTERNAL_SERVER_ERROR,
          500,
          { originalError: error }
        );
      }
    })
  );
  
  // Clean admin order status update API
  app.patch(
    "/api/admin/orders/:id/status", 
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user as any;
      const orderId = Number(req.params.id);
      const { status } = req.body;
      
      // Check if user is admin
      if (user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: { message: "Admin access required" }
        });
      }
      
      // Validate status - added "payment_received" as valid status
      const validStatuses = ['pending', 'confirmed', 'processing', 'payment_received', 'shipped', 'delivered', 'cancelled'];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: { message: "Invalid status. Must be one of: " + validStatuses.join(', ') }
        });
      }
      
      try {
        let updatedOrder;
        
        // If status is "payment_received", only update payment status (not order status)
        if (status === 'payment_received') {
          logger.info('Processing payment_received status update - updating payment status only', { orderId, adminUserId: req.user?.id });
          
          // Only update payment status to "payment_received" - do NOT change order status
          updatedOrder = await storage.updateOrderPaymentStatus(orderId, "payment_received");
          
          if (!updatedOrder) {
            logger.error('Failed to update payment status to payment_received', { orderId });
            return res.status(404).json({
              success: false,
              error: { message: "Order not found or payment status update failed" }
            });
          }
          
          logger.info('Payment status updated to payment_received', { orderId });
          
          // Add status history entry for payment received
          try {
            await storage.addOrderStatusHistory(
              orderId,
              updatedOrder.status, // Keep current order status
              "payment_received",  // Update payment status
              'Admin',
              null,
              'payment_received',
              'Payment marked as received by admin'
            );
            logger.info('Status history entry added for payment_received', { orderId });
          } catch (historyError) {
            logger.error('Failed to add status history entry', { orderId, error: historyError });
            // Don't fail the request for history entry failure
          }
          
          logger.info('Payment marked as received by admin', { 
            orderId, 
            paymentStatus: "payment_received",
            orderStatus: updatedOrder.status, // Keep existing order status
            adminUserId: req.user?.id
          });
        } else {
          // Use storage method to update order status (includes automatic status history tracking)
          updatedOrder = await storage.updateOrderStatus(orderId, status);
          
          if (!updatedOrder) {
            return res.status(404).json({
              success: false,
              error: { message: "Order not found" }
            });
          }
          
          logger.info('Order status updated by admin', { 
            orderId, 
            newStatus: status,
            adminUserId: req.user?.id
          });

          // Send order status update email for all status changes except payment_received
          try {
            logger.info('Attempting to send order status update email', { orderId, status });
            
            // Get full order details with items for email
            const orderWithItems = await storage.getOrderById(orderId);
            
            logger.info('Retrieved order details for email', { 
              orderId, 
              hasOrder: !!orderWithItems, 
              hasItems: orderWithItems?.orderItems?.length > 0 
            });
            
            if (orderWithItems && orderWithItems.orderItems && orderWithItems.orderItems.length > 0) {
              // Generate estimated delivery text based on new status
              const getEstimatedDeliveryText = (status: string): string => {
                switch (status) {
                  case 'pending':
                    return 'Processing your order';
                  case 'confirmed':
                    return 'Order confirmed, preparing for shipment';
                  case 'processing':
                    return 'Order is being processed';
                  case 'shipped':
                    return '3-5 business days';
                  case 'delivered':
                    return 'Delivered';
                  case 'cancelled':
                    return 'Order cancelled';
                  default:
                    return 'Status updated';
                }
              };

              const emailData = {
                email: orderWithItems.customerEmail,
                customerName: orderWithItems.customerName,
                orderNumber: orderWithItems.orderNumber,
                orderId: orderWithItems.id,
                status: status,
                trackingNumber: orderWithItems.trackingNumber,
                estimatedDelivery: getEstimatedDeliveryText(status),
                shippingMethod: orderWithItems.shippingMethod,
                selectedLockerName: orderWithItems.selectedLockerName,
                selectedLockerAddress: orderWithItems.selectedLockerAddress
              };

              await databaseEmailService.sendOrderStatusEmail(emailData);

              logger.info('Order status update email sent successfully', {
                orderId,
                status,
                customerEmail: orderWithItems.customerEmail
              });
            }
          } catch (emailError) {
            logger.error('Failed to send order status update email', {
              orderId,
              status,
              error: emailError
            });
            // Don't fail the status update if email fails
          }
        }
        
        const message = status === 'payment_received' 
          ? "Payment status updated to received" 
          : `Order status updated to ${status}`;
        
        return res.json({
          success: true,
          data: updatedOrder,
          message
        });
      } catch (error) {
        logger.error('Error updating order status', { 
          error, 
          orderId 
        });
        
        return res.status(500).json({
          success: false,
          error: { message: "Failed to update order status" }
        });
      }
    })
  );

  // Clean admin tracking number update API
  app.patch(
    "/api/admin/orders/:id/tracking", 
    isAuthenticated, 
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user as any;
      const orderId = Number(req.params.id);
      const { trackingNumber } = req.body;
      
      // Check if user is admin
      if (user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: { message: "Admin access required" }
        });
      }
      
      if (!trackingNumber || trackingNumber.trim() === '') {
        return res.status(400).json({
          success: false,
          error: { message: "Tracking number is required" }
        });
      }
      
      try {
        // Update the tracking number directly using Drizzle
        const [updatedOrder] = await db
          .update(orders)
          .set({ 
            trackingNumber: trackingNumber.trim(),
            updatedAt: new Date().toISOString() 
          })
          .where(eq(orders.id, orderId))
          .returning();
        
        if (!updatedOrder) {
          return res.status(404).json({
            success: false,
            error: { message: "Order not found" }
          });
        }
        
        logger.info('Order tracking number updated', { 
          adminId: user.id, 
          orderId, 
          trackingNumber 
        });
        
        return res.json({
          success: true,
          data: updatedOrder,
          message: "Tracking number updated successfully"
        });
      } catch (error) {
        logger.error('Error updating tracking number', { 
          error, 
          adminId: user.id, 
          orderId 
        });
        
        return res.status(500).json({
          success: false,
          error: { message: "Failed to update tracking number" }
        });
      }
    })
  );

  // Delete order endpoint (Admin only)
  app.delete(
    "/api/admin/orders/:id",
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user as any;
      const orderId = Number(req.params.id);
      
      // Check if user is admin
      if (user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: { message: "Admin access required" }
        });
      }
      
      // Validate order ID
      if (!orderId || isNaN(orderId)) {
        return res.status(400).json({
          success: false,
          error: { message: "Valid order ID is required" }
        });
      }
      
      try {
        // Check if order exists first
        const existingOrder = await storage.getOrderById(orderId);
        if (!existingOrder) {
          return res.status(404).json({
            success: false,
            error: { message: "Order not found" }
          });
        }
        
        // Delete the order (this will cascade to delete related records)
        const success = await storage.deleteOrder(orderId);
        
        if (!success) {
          return res.status(500).json({
            success: false,
            error: { message: "Failed to delete order" }
          });
        }
        
        logger.info('Order deleted by admin', { 
          adminId: user.id, 
          orderId, 
          orderNumber: existingOrder.orderNumber,
          customerEmail: existingOrder.customerEmail
        });
        
        return res.json({
          success: true,
          message: `Order #${existingOrder.orderNumber} deleted successfully`
        });
        
      } catch (error) {
        logger.error('Error deleting order', { 
          error, 
          adminId: user.id, 
          orderId 
        });
        
        return res.status(500).json({
          success: false,
          error: { message: "Failed to delete order" }
        });
      }
    })
  );

  // PRICING MANAGEMENT ROUTES - For admin use only
  
  // Get all pricing settings
  app.get(
    "/api/admin/pricing", 
    isAuthenticated, 
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      try {
        // Check if user is admin
        if (user.role !== 'admin') {
          throw new ForbiddenError("Only administrators can access pricing settings");
        }
        
        const pricingSettings = await storage.getAllPricingSettings();
        
        return res.json({
          success: true,
          data: pricingSettings
        });
      } catch (error) {
        // Log detailed error information with context
        logger.error('Error retrieving pricing settings', { 
          error, 
          userId: user.id
        });
        
        // Check for specific error types
        if (error instanceof ForbiddenError) {
          throw error;
        }
        
        // Return generic error for unexpected issues
        throw new AppError(
          "Failed to retrieve pricing settings. Please try again.",
          ErrorCode.INTERNAL_SERVER_ERROR,
          500,
          { originalError: error }
        );
      }
    })
  );
  
  // Get default markup percentage
  app.get(
    "/api/pricing/default-markup", 
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const defaultMarkup = await storage.getDefaultMarkupPercentage();
        
        return res.json({
          success: true,
          data: { 
            markupPercentage: defaultMarkup, 
            isSet: defaultMarkup !== null 
          }
        });
      } catch (error) {
        // Log detailed error information
        logger.error('Error retrieving default markup', { error });
        
        // Return generic error
        throw new AppError(
          "Failed to retrieve default pricing information.",
          ErrorCode.INTERNAL_SERVER_ERROR,
          500,
          { originalError: error }
        );
      }
    })
  );
  
  // Get pricing for a specific category
  app.get(
    "/api/pricing/category/:categoryId", 
    validateRequest({
      params: z.object({
        categoryId: z.coerce.number().positive("Category ID is required")
      })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const { categoryId } = req.params;
      const categoryIdNum = Number(categoryId);
      
      try {
        // Validate that the category exists
        const category = await storage.getCategoryById(categoryIdNum);
        if (!category) {
          throw new NotFoundError(`Category with ID ${categoryIdNum} not found`, "category");
        }
        
        const pricing = await storage.getPricingByCategoryId(categoryIdNum);
        
        let result = pricing;
        
        // If category-specific pricing not found, return default markup
        if (!pricing) {
          const defaultMarkup = await storage.getDefaultMarkupPercentage();
          result = { 
            categoryId: categoryIdNum,
            markupPercentage: defaultMarkup ?? 0,
            description: defaultMarkup === null 
              ? "No pricing rule set for this category or globally" 
              : "Default pricing (category-specific pricing not set)",
            id: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          };
        }
        
        return res.json({
          success: true,
          data: result
        });
      } catch (error) {
        // Log detailed error information with context
        logger.error('Error retrieving category pricing', { 
          error, 
          categoryId: categoryIdNum
        });
        
        // Check for specific error types
        if (error instanceof NotFoundError) {
          throw error;
        }
        
        // Return generic error for unexpected issues
        throw new AppError(
          "Failed to retrieve pricing information for this category.",
          ErrorCode.INTERNAL_SERVER_ERROR,
          500,
          { originalError: error }
        );
      }
    })
  );
  
  // Create or update pricing for a category
  app.post(
    "/api/admin/pricing", 
    isAuthenticated, 
    validateRequest({
      body: z.object({
        categoryId: z.coerce.number().positive("Category ID is required"),
        markupPercentage: z.coerce.number().min(0, "Markup percentage must be a non-negative number"),
        description: z.string().optional()
      })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      try {
        // Check if user is admin
        if (user.role !== 'admin') {
          throw new ForbiddenError("Only administrators can manage pricing settings");
        }
        
        // Check if the category exists
        if (req.body.categoryId !== 0) { // 0 is allowed for default/global pricing
          const category = await storage.getCategoryById(req.body.categoryId);
          if (!category) {
            throw new NotFoundError(`Category with ID ${req.body.categoryId} not found`, "category");
          }
        }
        
        const result = await storage.createOrUpdatePricing(req.body);
        
        return res.status(201).json({
          success: true,
          data: result,
          message: req.body.categoryId === 0 
            ? "Default pricing updated successfully" 
            : `Pricing for category ID ${req.body.categoryId} updated successfully`
        });
      } catch (error) {
        // Log detailed error information with context
        logger.error('Error creating/updating pricing', { 
          error, 
          userId: user.id,
          pricingData: req.body
        });
        
        // Check for specific error types
        if (error instanceof NotFoundError || error instanceof ForbiddenError) {
          throw error;
        }
        
        // Return generic error for unexpected issues
        throw new AppError(
          "Failed to update pricing settings. Please try again.",
          ErrorCode.INTERNAL_SERVER_ERROR,
          500,
          { originalError: error }
        );
      }
    })
  );
  
  // Delete pricing setting
  app.delete(
    "/api/admin/pricing/:id", 
    isAuthenticated, 
    validateRequest({
      params: z.object({
        id: z.coerce.number().positive("Pricing ID is required")
      })
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user as any;
      const { id } = req.params;
      const pricingId = Number(id);
      
      try {
        // Check if user is admin
        if (user.role !== 'admin') {
          throw new ForbiddenError("Only administrators can delete pricing settings");
        }
        
        // Check if the pricing setting exists
        const pricing = await storage.getPricingById(pricingId);
        if (!pricing) {
          throw new NotFoundError(`Pricing setting with ID ${pricingId} not found`, "pricing");
        }
        
        // Prevent deletion of global pricing (categoryId = 0)
        if (pricing.categoryId === 0) {
          throw new AppError(
            "Global default pricing cannot be deleted. Use the update endpoint to modify it instead.",
            ErrorCode.INVALID_OPERATION,
            400
          );
        }
        
        await storage.deletePricing(pricingId);
        
        return res.json({
          success: true,
          message: `Pricing setting for category ID ${pricing.categoryId} deleted successfully`
        });
      } catch (error) {
        // Log detailed error information with context
        logger.error('Error deleting pricing setting', { 
          error, 
          userId: user.id,
          pricingId
        });
        
        // Check for specific error types
        if (error instanceof NotFoundError || error instanceof ForbiddenError || error instanceof AppError) {
          throw error;
        }
        
        // Return generic error for unexpected issues
        throw new AppError(
          "Failed to delete pricing setting. Please try again.",
          ErrorCode.INTERNAL_SERVER_ERROR,
          500,
          { originalError: error }
        );
      }
    })
  );

  // SUPPLIER ROUTES
  app.get("/api/suppliers", asyncHandler(async (req: Request, res: Response) => {
    try {
      // For admin users, show all suppliers regardless of active status
      // For regular users, only show active suppliers
      const user = req.user as any;
      const isAdmin = user && user.role === 'admin';
      const activeOnly = isAdmin ? false : req.query.activeOnly !== 'false';
      
      const suppliers = await storage.getAllSuppliers(activeOnly);
      
      return res.json({
        success: true,
        data: suppliers
      });
    } catch (error) {
      // Log detailed error information
      logger.error('Error retrieving suppliers', { 
        error,
        query: req.query
      });
      
      // Return generic error
      throw new AppError(
        "Failed to retrieve suppliers. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  app.get("/api/suppliers/:id", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    
    try {
      const supplier = await storage.getSupplierById(id);
      
      if (!supplier) {
        throw new NotFoundError(`Supplier with ID ${id} not found`, "supplier");
      }
      
      return res.json({
        success: true,
        data: supplier
      });
    } catch (error) {
      // Log detailed error information with context
      logger.error('Error retrieving supplier by ID', { 
        error,
        supplierId: id
      });
      
      // Check for specific error types
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      // Return generic error for unexpected issues
      throw new AppError(
        "Failed to retrieve supplier details. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  app.post("/api/suppliers", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    try {
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can manage suppliers");
      }
      
      // Log the incoming request body for debugging
      console.log('🔍 SUPPLIER ROUTE DEBUG - Request body:', req.body);
      
      const supplierData = insertSupplierSchema.parse(req.body);
      console.log('🔍 SUPPLIER ROUTE DEBUG - Parsed supplier data:', supplierData);
      
      // Check if supplier with same name already exists
      const existingSupplier = await storage.getSupplierByName(supplierData.name);
      if (existingSupplier) {
        throw new AppError(
          `A supplier with the name "${supplierData.name}" already exists`,
          ErrorCode.DUPLICATE_ENTITY,
          409
        );
      }
      
      console.log('🔍 SUPPLIER ROUTE DEBUG - About to call storage.createSupplier');
      const supplier = await storage.createSupplier(supplierData);
      console.log('🔍 SUPPLIER ROUTE DEBUG - Successfully created supplier:', supplier);
      
      return res.status(201).json({
        success: true,
        data: supplier,
        message: `Supplier "${supplier.name}" created successfully`
      });
    } catch (error) {
      // Log detailed error information with context
      console.log('🔍 SUPPLIER ROUTE DEBUG - Caught error:', {
        error,
        errorType: error?.constructor?.name,
        message: error?.message,
        stack: error?.stack,
        isZodError: error instanceof z.ZodError,
        zodIssues: error instanceof z.ZodError ? error.issues : undefined
      });
      
      logger.error('Error creating supplier', { 
        error,
        userId: user.id,
        supplierData: req.body
      });
      
      // Check for specific error types
      if (error instanceof ForbiddenError || error instanceof AppError || error instanceof z.ZodError) {
        throw error;
      }
      
      // Return generic error for unexpected issues
      throw new AppError(
        "Failed to create supplier. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  app.put("/api/suppliers/:id", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const id = parseInt(req.params.id);
    
    try {
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can manage suppliers");
      }
      
      // Validate request body
      const supplierData = insertSupplierSchema.partial().parse(req.body);
      
      // Check if supplier exists
      const existingSupplier = await storage.getSupplierById(id);
      if (!existingSupplier) {
        throw new NotFoundError(`Supplier with ID ${id} not found`, "supplier");
      }
      
      // If changing the name, check for duplicates
      if (supplierData.name && supplierData.name !== existingSupplier.name) {
        const duplicateSupplier = await storage.getSupplierByName(supplierData.name);
        if (duplicateSupplier && duplicateSupplier.id !== id) {
          throw new AppError(
            `A supplier with the name "${supplierData.name}" already exists`,
            ErrorCode.DUPLICATE_ENTITY,
            409
          );
        }
      }
      
      // Update the supplier
      const supplier = await storage.updateSupplier(id, supplierData);
      
      // If 'isActive' property was changed to inactive, cascade to catalogs and products
      if (supplierData.isActive === false) {
        try {
          // First get all catalogs for this supplier
          const supplierCatalogs = await storage.getCatalogsBySupplierId(id, false); // Get all catalogs, not just active ones
          
          // Update each catalog to inactive
          let totalProductsUpdated = 0;
          for (const catalog of supplierCatalogs) {
            // Update catalog to inactive
            await storage.updateCatalog(catalog.id, { isActive: false });
            
            // Update all products in this catalog to inactive
            const productsUpdated = await storage.bulkUpdateCatalogProducts(catalog.id, { isActive: false });
            totalProductsUpdated += productsUpdated;
          }
          
          logger.info(`Supplier ${id} marked inactive: cascaded updates`, { 
            catalogs: supplierCatalogs.length, 
            products: totalProductsUpdated 
          });
        } catch (cascadeError) {
          // Log cascade error but don't fail the main operation
          logger.warn('Error during cascade deactivation of supplier assets', { 
            error: cascadeError, 
            supplierId: id
          });
        }
      }
      
      return res.json({
        success: true,
        data: supplier,
        message: `Supplier "${supplier.name}" updated successfully`
      });
    } catch (error) {
      // Log detailed error information with context
      logger.error('Error updating supplier', { 
        error,
        userId: user.id,
        supplierId: id,
        supplierData: req.body
      });
      
      // Check for specific error types
      if (error instanceof NotFoundError || error instanceof ForbiddenError || error instanceof AppError || error instanceof z.ZodError) {
        throw error;
      }
      
      // Return generic error for unexpected issues
      throw new AppError(
        "Failed to update supplier. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  // Deactivate supplier (soft delete with cascade)
  app.patch("/api/suppliers/:id/deactivate", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const id = parseInt(req.params.id);
    
    try {
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can manage suppliers");
      }
      
      // Check if supplier exists
      const supplier = await storage.getSupplierById(id);
      if (!supplier) {
        throw new NotFoundError(`Supplier with ID ${id} not found`, "supplier");
      }
      
      if (!supplier.isActive) {
        throw new AppError(
          `Supplier "${supplier.name}" is already inactive`,
          ErrorCode.INVALID_STATE,
          400
        );
      }
      
      // Deactivate the supplier
      const updatedSupplier = await storage.updateSupplier(id, { isActive: false });
      
      if (!updatedSupplier) {
        throw new AppError(
          "Failed to deactivate supplier due to a database error.",
          ErrorCode.DATABASE_ERROR,
          500
        );
      }
      
      // Cascade deactivation to catalogs and products
      try {
        const supplierCatalogs = await storage.getCatalogsBySupplierId(id, false); // Get all catalogs
        
        let totalProductsUpdated = 0;
        for (const catalog of supplierCatalogs) {
          // Update catalog to inactive
          await storage.updateCatalog(catalog.id, { isActive: false });
          
          // Update all products in this catalog to inactive
          const productsUpdated = await storage.bulkUpdateCatalogProducts(catalog.id, { isActive: false });
          totalProductsUpdated += productsUpdated;
        }
        
        logger.info(`Supplier ${id} deactivated: cascaded updates`, { 
          catalogs: supplierCatalogs.length, 
          products: totalProductsUpdated 
        });
        
        return res.json({
          success: true,
          data: updatedSupplier,
          message: `Supplier "${updatedSupplier.name}" deactivated successfully. ${supplierCatalogs.length} catalogs and ${totalProductsUpdated} products were also deactivated.`
        });
      } catch (cascadeError) {
        // Log cascade error but don't fail the main operation
        logger.warn('Error during cascade deactivation of supplier assets', { 
          error: cascadeError, 
          supplierId: id
        });
        
        return res.json({
          success: true,
          data: updatedSupplier,
          message: `Supplier "${updatedSupplier.name}" deactivated successfully, but some catalogs or products may not have been deactivated.`
        });
      }
    } catch (error) {
      // Log detailed error information with context
      logger.error('Error deactivating supplier', { 
        error,
        userId: user.id,
        supplierId: id
      });
      
      // Check for specific error types
      if (error instanceof ForbiddenError || error instanceof NotFoundError || error instanceof AppError) {
        throw error;
      }
      
      // Return generic error for unexpected issues
      throw new AppError(
        "Failed to deactivate supplier. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  app.delete("/api/suppliers/:id", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const id = parseInt(req.params.id);
    
    try {
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can manage suppliers");
      }
      
      // Check if supplier exists
      const supplier = await storage.getSupplierById(id);
      if (!supplier) {
        throw new NotFoundError(`Supplier with ID ${id} not found`, "supplier");
      }
      
      // Check for products directly linked to this supplier via supplierId
      const linkedProductsCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(products)
        .where(eq(products.supplierId, id));
      
      const productCount = Number(linkedProductsCount[0]?.count || 0);
      
      // If there are linked products, return information (success: true, but canDelete: false)
      if (productCount > 0) {
        return res.json({
          success: true,
          message: `Supplier "${supplier.name}" has ${productCount} associated product${productCount !== 1 ? 's' : ''}. Choose an action to proceed.`,
          data: {
            canDelete: false,
            hasProducts: true,
            productCount,
            supplier: {
              id: supplier.id,
              name: supplier.name
            }
          }
        });
      }
      
      // Check if supplier has associated catalogs
      const supplierCatalogs = await storage.getCatalogsBySupplierId(id, false);
      
      if (supplierCatalogs.length > 0) {
        return res.status(409).json({
          success: false,
          code: 'SUPPLIER_HAS_CATALOGS',
          message: `Cannot delete supplier "${supplier.name}" because it has ${supplierCatalogs.length} catalogs associated with it.`,
          data: {
            supplierId: id,
            supplierName: supplier.name,
            catalogCount: supplierCatalogs.length
          }
        });
      }
      
      const success = await storage.hardDeleteSupplier(id);
      
      if (!success) {
        throw new AppError(
          "Failed to delete supplier due to a database error.",
          ErrorCode.DATABASE_ERROR,
          500
        );
      }
      
      return res.json({
        success: true,
        message: `Supplier "${supplier.name}" deleted successfully`,
        data: {
          canDelete: true,
          hasProducts: false,
          productCount: 0
        }
      });
    } catch (error) {
      // Log detailed error information with context
      logger.error('Error deleting supplier', { 
        error,
        userId: user.id,
        supplierId: id
      });
      
      // Check for specific error types
      if (error instanceof NotFoundError || error instanceof ForbiddenError || error instanceof AppError) {
        throw error;
      }
      
      // Return generic error for unexpected issues
      throw new AppError(
        "Failed to delete supplier. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  // Reassign all products from one supplier to another
  app.post("/api/suppliers/:id/reassign-products", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const oldSupplierId = parseInt(req.params.id);
    const { newSupplierId } = req.body;
    
    try {
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can manage suppliers");
      }
      
      if (!newSupplierId || typeof newSupplierId !== 'number') {
        throw new AppError("New supplier ID is required", ErrorCode.VALIDATION_ERROR, 400);
      }
      
      // Check if both suppliers exist
      const oldSupplier = await storage.getSupplierById(oldSupplierId);
      if (!oldSupplier) {
        throw new NotFoundError(`Supplier with ID ${oldSupplierId} not found`, "supplier");
      }
      
      const newSupplier = await storage.getSupplierById(newSupplierId);
      if (!newSupplier) {
        throw new NotFoundError(`Target supplier with ID ${newSupplierId} not found`, "supplier");
      }
      
      if (oldSupplierId === newSupplierId) {
        throw new AppError("Cannot reassign products to the same supplier", ErrorCode.VALIDATION_ERROR, 400);
      }
      
      // Count products to be reassigned
      const productCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(products)
        .where(eq(products.supplierId, oldSupplierId));
      
      const productCount = Number(productCountResult[0]?.count || 0);
      
      if (productCount === 0) {
        return res.json({
          success: true,
          message: `No products to reassign from "${oldSupplier.name}"`,
          data: { reassignedCount: 0 }
        });
      }
      
      // Reassign products in a transaction
      const result = await db
        .update(products)
        .set({ supplierId: newSupplierId })
        .where(eq(products.supplierId, oldSupplierId));
      
      logger.info(`Reassigned ${productCount} products`, {
        from: oldSupplier.name,
        to: newSupplier.name,
        userId: user.id,
        productCount
      });
      
      return res.json({
        success: true,
        message: `Successfully reassigned ${productCount} products from "${oldSupplier.name}" to "${newSupplier.name}"`,
        data: {
          reassignedCount: productCount,
          oldSupplier: { id: oldSupplierId, name: oldSupplier.name },
          newSupplier: { id: newSupplierId, name: newSupplier.name }
        }
      });
    } catch (error) {
      logger.error('Error reassigning products', { 
        error,
        userId: user.id,
        oldSupplierId,
        newSupplierId
      });
      
      if (error instanceof NotFoundError || error instanceof ForbiddenError || error instanceof AppError) {
        throw error;
      }
      
      throw new AppError(
        "Failed to reassign products. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  // Delete supplier along with all its products
  app.post("/api/suppliers/:id/delete-with-products", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const supplierId = parseInt(req.params.id);
    
    try {
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can manage suppliers");
      }
      
      // Check if supplier exists
      const supplier = await storage.getSupplierById(supplierId);
      if (!supplier) {
        throw new NotFoundError(`Supplier with ID ${supplierId} not found`, "supplier");
      }
      
      // Count products to be deleted
      const productCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(products)
        .where(eq(products.supplierId, supplierId));
      
      const productCount = Number(productCountResult[0]?.count || 0);
      
      // Delete products and supplier in a transaction
      await db.transaction(async (tx) => {
        // First delete all products
        if (productCount > 0) {
          await tx
            .delete(products)
            .where(eq(products.supplierId, supplierId));
        }
        
        // Then delete the supplier
        await tx
          .delete(suppliers)
          .where(eq(suppliers.id, supplierId));
      });
      
      logger.info(`Deleted supplier with products`, {
        supplierName: supplier.name,
        supplierId,
        productCount,
        userId: user.id
      });
      
      return res.json({
        success: true,
        message: `Successfully deleted supplier "${supplier.name}" and ${productCount} associated products`,
        data: {
          deletedProductCount: productCount,
          supplier: { id: supplierId, name: supplier.name }
        }
      });
    } catch (error) {
      logger.error('Error deleting supplier with products', { 
        error,
        userId: user.id,
        supplierId
      });
      
      if (error instanceof NotFoundError || error instanceof ForbiddenError || error instanceof AppError) {
        throw error;
      }
      
      throw new AppError(
        "Failed to delete supplier and products. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  // ============================================================================
  // SHIPPING MANAGEMENT ROUTES
  // ============================================================================

  // Logistics Company Routes (Admin Only)
  app.get("/api/logistics-companies", isAuthenticated, isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const companies = await storage.getAllLogisticsCompanies(includeInactive);
      
      return res.json({
        success: true,
        data: companies
      });
    } catch (error) {
      logger.error('Error retrieving logistics companies', { error });
      throw new AppError(
        "Failed to retrieve logistics companies. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  app.get("/api/logistics-companies/:id", isAuthenticated, isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const company = await storage.getLogisticsCompanyWithMethods(id);
      
      if (!company) {
        throw new NotFoundError(`Logistics company with ID ${id} not found`, "logisticsCompany");
      }
      
      return res.json({
        success: true,
        data: company
      });
    } catch (error) {
      logger.error('Error retrieving logistics company', { error, id: req.params.id });
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new AppError(
        "Failed to retrieve logistics company details. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  app.post("/api/logistics-companies", isAuthenticated, isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      const companyData = insertLogisticsCompanySchema.parse(req.body);
      const company = await storage.createLogisticsCompany(companyData);
      
      return res.status(201).json({
        success: true,
        data: company,
        message: `Logistics company "${company.name}" created successfully`
      });
    } catch (error) {
      logger.error('Error creating logistics company', { error, body: req.body });
      throw new AppError(
        "Failed to create logistics company. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  app.put("/api/logistics-companies/:id", isAuthenticated, isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      const company = await storage.updateLogisticsCompany(id, updateData);
      
      if (!company) {
        throw new NotFoundError(`Logistics company with ID ${id} not found`, "logisticsCompany");
      }
      
      return res.json({
        success: true,
        data: company,
        message: `Logistics company "${company.name}" updated successfully`
      });
    } catch (error) {
      logger.error('Error updating logistics company', { error, id: req.params.id });
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new AppError(
        "Failed to update logistics company. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  app.patch("/api/logistics-companies/:id", isAuthenticated, isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      const company = await storage.updateLogisticsCompany(id, updateData);
      
      if (!company) {
        throw new NotFoundError(`Logistics company with ID ${id} not found`, "logisticsCompany");
      }
      
      return res.json({
        success: true,
        data: company,
        message: `Logistics company "${company.name}" updated successfully`
      });
    } catch (error) {
      logger.error('Error updating logistics company', { error, id: req.params.id });
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new AppError(
        "Failed to update logistics company. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  app.delete("/api/logistics-companies/:id", isAuthenticated, isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const company = await storage.getLogisticsCompany(id);
      
      if (!company) {
        throw new NotFoundError(`Logistics company with ID ${id} not found`, "logisticsCompany");
      }
      
      const success = await storage.deleteLogisticsCompany(id);
      
      if (!success) {
        throw new AppError(
          "Failed to delete logistics company due to a database error.",
          ErrorCode.DATABASE_ERROR,
          500
        );
      }
      
      return res.json({
        success: true,
        message: `Logistics company "${company.name}" deactivated successfully`
      });
    } catch (error) {
      logger.error('Error deleting logistics company', { error, id: req.params.id });
      if (error instanceof NotFoundError || error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        "Failed to delete logistics company. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  // Helper function to deserialize frontend DTO to database format (for POST/PATCH)
  const deserializeShippingMethodInput = (frontendData: any) => {
    const dbData: any = { ...frontendData };
    
    // Map frontend fields to database fields (only if present)
    if ('logisticsCompanyId' in frontendData && frontendData.logisticsCompanyId !== undefined) {
      dbData.companyId = frontendData.logisticsCompanyId;
      delete dbData.logisticsCompanyId;
    }
    if ('baseCost' in frontendData && frontendData.baseCost !== undefined) {
      dbData.basePrice = typeof frontendData.baseCost === 'number' 
        ? frontendData.baseCost.toString() 
        : frontendData.baseCost;
      delete dbData.baseCost;
    }
    if ('estimatedDeliveryDays' in frontendData && frontendData.estimatedDeliveryDays !== undefined) {
      dbData.estimatedDays = typeof frontendData.estimatedDeliveryDays === 'number'
        ? frontendData.estimatedDeliveryDays.toString()
        : frontendData.estimatedDeliveryDays;
      delete dbData.estimatedDeliveryDays;
    }
    
    // Remove frontend-only fields that should not be in DB
    delete dbData.logisticsCompanyName;
    delete dbData.code; // code is stored in DB but auto-generated, don't allow updates
    
    return dbData;
  };

  // Helper function to serialize shipping methods with logistics company info (for GET)
  const serializeShippingMethod = (method: any, companyName: string) => {
    const estimatedDays = method.estimatedDays ? method.estimatedDays.split('-')[0].trim() : '3';
    const parsedDays = parseInt(estimatedDays);
    
    return {
      id: method.id,
      name: method.name,
      code: method.code || `METHOD_${method.id}`,
      description: method.description,
      logisticsCompanyId: method.companyId,
      logisticsCompanyName: companyName,
      estimatedDeliveryDays: isNaN(parsedDays) ? 3 : parsedDays,
      baseCost: parseFloat(method.basePrice) || 0,
      isActive: method.isActive,
      createdAt: method.createdAt,
      updatedAt: method.updatedAt,
    };
  };

  // Shipping Method Routes (Admin Only)
  app.get("/api/shipping-methods", isAuthenticated, isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const methods = await storage.getAllShippingMethods(includeInactive);
      
      // Fetch all logistics companies for enrichment
      const companies = await storage.getAllLogisticsCompanies(true);
      const companyMap = new Map(companies.map(c => [c.id, c.name]));
      
      // Serialize methods with company names
      const serializedMethods = methods.map(method => 
        serializeShippingMethod(method, companyMap.get(method.companyId) || 'Unknown')
      );
      
      return res.json({
        success: true,
        data: serializedMethods
      });
    } catch (error) {
      logger.error('Error retrieving shipping methods', { error });
      throw new AppError(
        "Failed to retrieve shipping methods. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  app.get("/api/logistics-companies/:companyId/methods", isAuthenticated, isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      const companyId = parseInt(req.params.companyId);
      const includeInactive = req.query.includeInactive === 'true';
      const methods = await storage.getShippingMethodsByCompany(companyId, includeInactive);
      
      // Fetch company name for enrichment
      const company = await storage.getLogisticsCompany(companyId);
      const companyName = company?.name || 'Unknown';
      
      // Serialize methods with company name
      const serializedMethods = methods.map(method => 
        serializeShippingMethod(method, companyName)
      );
      
      return res.json({
        success: true,
        data: serializedMethods
      });
    } catch (error) {
      logger.error('Error retrieving shipping methods for company', { error, companyId: req.params.companyId });
      throw new AppError(
        "Failed to retrieve shipping methods for company. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  app.get("/api/shipping-methods/:id", isAuthenticated, isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const method = await storage.getShippingMethod(id);
      
      if (!method) {
        throw new NotFoundError(`Shipping method with ID ${id} not found`, "shippingMethod");
      }
      
      // Fetch company name for enrichment
      const company = await storage.getLogisticsCompany(method.companyId);
      const serializedMethod = serializeShippingMethod(method, company?.name || 'Unknown');
      
      return res.json({
        success: true,
        data: serializedMethod
      });
    } catch (error) {
      logger.error('Error retrieving shipping method', { error, id: req.params.id });
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new AppError(
        "Failed to retrieve shipping method details. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  app.post("/api/shipping-methods", isAuthenticated, isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      // Deserialize frontend DTO to database format
      const dbData = deserializeShippingMethodInput(req.body);
      const methodData = insertShippingMethodSchema.parse(dbData);
      const method = await storage.createShippingMethod(methodData);
      
      // Fetch company name for enrichment
      const company = await storage.getLogisticsCompany(method.companyId);
      const serializedMethod = serializeShippingMethod(method, company?.name || 'Unknown');
      
      return res.status(201).json({
        success: true,
        data: serializedMethod,
        message: `Shipping method "${method.name}" created successfully`
      });
    } catch (error) {
      logger.error('Error creating shipping method', { error, body: req.body });
      throw new AppError(
        "Failed to create shipping method. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  app.put("/api/shipping-methods/:id", isAuthenticated, isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Deserialize frontend DTO to database format
      const dbData = deserializeShippingMethodInput(req.body);
      
      const method = await storage.updateShippingMethod(id, dbData);
      
      if (!method) {
        throw new NotFoundError(`Shipping method with ID ${id} not found`, "shippingMethod");
      }
      
      // Fetch company name for enrichment
      const company = await storage.getLogisticsCompany(method.companyId);
      const serializedMethod = serializeShippingMethod(method, company?.name || 'Unknown');
      
      return res.json({
        success: true,
        data: serializedMethod,
        message: `Shipping method "${method.name}" updated successfully`
      });
    } catch (error) {
      logger.error('Error updating shipping method', { error, id: req.params.id });
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new AppError(
        "Failed to update shipping method. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  app.patch("/api/shipping-methods/:id", isAuthenticated, isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Deserialize frontend DTO to database format
      const dbData = deserializeShippingMethodInput(req.body);
      
      const method = await storage.updateShippingMethod(id, dbData);
      
      if (!method) {
        throw new NotFoundError(`Shipping method with ID ${id} not found`, "shippingMethod");
      }
      
      // Fetch company name for enrichment
      const company = await storage.getLogisticsCompany(method.companyId);
      const serializedMethod = serializeShippingMethod(method, company?.name || 'Unknown');
      
      return res.json({
        success: true,
        data: serializedMethod,
        message: `Shipping method "${method.name}" updated successfully`
      });
    } catch (error) {
      logger.error('Error updating shipping method', { error, id: req.params.id });
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new AppError(
        "Failed to update shipping method. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  app.delete("/api/shipping-methods/:id", isAuthenticated, isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const method = await storage.getShippingMethod(id);
      
      if (!method) {
        throw new NotFoundError(`Shipping method with ID ${id} not found`, "shippingMethod");
      }
      
      const inUse = !(await storage.validateShippingMethodNotInUse(id));
      if (inUse) {
        throw new AppError(
          "Cannot delete shipping method as it is currently in use by suppliers or orders",
          ErrorCode.VALIDATION_ERROR,
          400
        );
      }
      
      const success = await storage.deleteShippingMethod(id);
      
      if (!success) {
        throw new AppError(
          "Failed to delete shipping method due to a database error.",
          ErrorCode.DATABASE_ERROR,
          500
        );
      }
      
      return res.json({
        success: true,
        message: `Shipping method "${method.name}" deactivated successfully`
      });
    } catch (error) {
      logger.error('Error deleting shipping method', { error, id: req.params.id });
      if (error instanceof NotFoundError || error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        "Failed to delete shipping method. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  // Supplier Shipping Configuration Routes (Admin Only)
  app.get("/api/suppliers/:id/shipping-methods", isAuthenticated, isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      const supplierId = parseInt(req.params.id);
      const methods = await storage.getSupplierShippingMethods(supplierId);
      
      // Fetch all logistics companies for enrichment
      const companies = await storage.getAllLogisticsCompanies(true);
      const companyMap = new Map(companies.map(c => [c.id, c.name]));
      
      // Serialize nested shipping methods with company names
      const serializedMethods = methods.map(item => ({
        ...item,
        method: serializeShippingMethod(item.method, companyMap.get(item.method.companyId) || 'Unknown')
      }));
      
      return res.json({
        success: true,
        data: serializedMethods
      });
    } catch (error) {
      logger.error('Error retrieving supplier shipping methods', { error, supplierId: req.params.id });
      throw new AppError(
        "Failed to retrieve supplier shipping methods. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  app.post("/api/suppliers/:supplierId/shipping-methods/:methodId", isAuthenticated, isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      const supplierId = parseInt(req.params.supplierId);
      const methodId = parseInt(req.params.methodId);
      const { customPrice, isDefault, isEnabled } = req.body;
      
      const assignment = await storage.assignShippingMethodToSupplier(supplierId, methodId, {
        customPrice: customPrice || null,
        isDefault: isDefault || false,
        isEnabled: isEnabled !== false
      });
      
      return res.status(201).json({
        success: true,
        data: assignment,
        message: 'Shipping method assigned to supplier successfully'
      });
    } catch (error) {
      logger.error('Error assigning shipping method to supplier', { 
        error, 
        supplierId: req.params.supplierId,
        methodId: req.params.methodId
      });
      throw new AppError(
        "Failed to assign shipping method to supplier. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  app.put("/api/suppliers/:supplierId/shipping-methods/:methodId", isAuthenticated, isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      const supplierId = parseInt(req.params.supplierId);
      const methodId = parseInt(req.params.methodId);
      const updateData = req.body;
      
      const assignment = await storage.updateSupplierShippingMethod(supplierId, methodId, updateData);
      
      if (!assignment) {
        throw new NotFoundError(
          `Shipping method ${methodId} is not assigned to supplier ${supplierId}`,
          "supplierShippingMethod"
        );
      }
      
      return res.json({
        success: true,
        data: assignment,
        message: 'Supplier shipping method configuration updated successfully'
      });
    } catch (error) {
      logger.error('Error updating supplier shipping method', { 
        error, 
        supplierId: req.params.supplierId,
        methodId: req.params.methodId
      });
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new AppError(
        "Failed to update supplier shipping method configuration. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  app.delete("/api/suppliers/:supplierId/shipping-methods/:methodId", isAuthenticated, isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      const supplierId = parseInt(req.params.supplierId);
      const methodId = parseInt(req.params.methodId);
      
      const success = await storage.removeShippingMethodFromSupplier(supplierId, methodId);
      
      if (!success) {
        throw new NotFoundError(
          `Shipping method ${methodId} is not assigned to supplier ${supplierId}`,
          "supplierShippingMethod"
        );
      }
      
      return res.json({
        success: true,
        message: 'Shipping method removed from supplier successfully'
      });
    } catch (error) {
      logger.error('Error removing shipping method from supplier', { 
        error, 
        supplierId: req.params.supplierId,
        methodId: req.params.methodId
      });
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new AppError(
        "Failed to remove shipping method from supplier. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  // Wrapper routes for frontend compatibility - these delegate to the existing composite-key routes
  app.get("/api/supplier-shipping-methods", isAuthenticated, isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      const supplierId = parseInt(req.query.supplierId as string);
      
      if (!supplierId || isNaN(supplierId)) {
        throw new AppError(
          "Supplier ID is required",
          ErrorCode.VALIDATION_ERROR,
          400
        );
      }
      
      const methods = await storage.getSupplierShippingMethods(supplierId);
      
      // Fetch all logistics companies for enrichment
      const companies = await storage.getAllLogisticsCompanies(true);
      const companyMap = new Map(companies.map(c => [c.id, c.name]));
      
      // Serialize both the supplier shipping method fields AND the nested shipping method
      const serializedMethods = methods.map(item => {
        const serializedMethod = serializeShippingMethod(item.method, companyMap.get(item.method.companyId) || 'Unknown');
        return {
          id: item.id,
          supplierId: item.supplierId,
          shippingMethodId: item.methodId,
          shippingMethodName: item.method.name,
          customerPrice: item.customPrice != null ? parseFloat(item.customPrice.toString()) : serializedMethod.baseCost,
          supplierCost: item.supplierCost != null ? parseFloat(item.supplierCost.toString()) : serializedMethod.baseCost,
          isActive: item.isActive,
          isDefault: item.isDefault,
          logisticsCompanyName: serializedMethod.logisticsCompanyName
        };
      });
      
      return res.json({
        success: true,
        data: serializedMethods
      });
    } catch (error) {
      logger.error('Error retrieving supplier shipping methods', { error, supplierId: req.query.supplierId });
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        "Failed to retrieve supplier shipping methods. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  app.post("/api/supplier-shipping-methods", isAuthenticated, isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      const { supplierId, shippingMethodId, customerPrice, supplierCost, isActive, isDefault } = req.body;
      
      if (!supplierId || !shippingMethodId) {
        throw new AppError(
          "Supplier ID and Shipping Method ID are required",
          ErrorCode.VALIDATION_ERROR,
          400
        );
      }
      
      const assignment = await storage.assignShippingMethodToSupplier(supplierId, shippingMethodId, {
        customPrice: customerPrice || null,
        isDefault: isDefault || false,
        isEnabled: isActive !== false
      });
      
      return res.status(201).json({
        success: true,
        data: assignment,
        message: 'Shipping method assigned to supplier successfully'
      });
    } catch (error) {
      logger.error('Error assigning shipping method to supplier', { error, body: req.body });
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        "Failed to assign shipping method to supplier. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  app.patch("/api/supplier-shipping-methods/:id", isAuthenticated, isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { customerPrice, supplierCost, isActive, isDefault, supplierId, shippingMethodId } = req.body;
      
      // First, get the existing assignment to find supplierId and methodId
      const existing = await storage.getSupplierShippingMethodById(id);
      
      if (!existing) {
        throw new NotFoundError(`Supplier shipping method with ID ${id} not found`, "supplierShippingMethod");
      }
      
      const updateData: any = {};
      if (customerPrice !== undefined) updateData.customPrice = customerPrice;
      if (isActive !== undefined) updateData.isEnabled = isActive;
      if (isDefault !== undefined) updateData.isDefault = isDefault;
      
      const assignment = await storage.updateSupplierShippingMethod(existing.supplierId, existing.shippingMethodId, updateData);
      
      if (!assignment) {
        throw new NotFoundError(`Supplier shipping method with ID ${id} not found`, "supplierShippingMethod");
      }
      
      return res.json({
        success: true,
        data: assignment,
        message: 'Supplier shipping method configuration updated successfully'
      });
    } catch (error) {
      logger.error('Error updating supplier shipping method', { error, id: req.params.id });
      if (error instanceof NotFoundError || error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        "Failed to update supplier shipping method configuration. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  app.delete("/api/supplier-shipping-methods/:id", isAuthenticated, isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // First, get the existing assignment to find supplierId and methodId
      const existing = await storage.getSupplierShippingMethodById(id);
      
      if (!existing) {
        throw new NotFoundError(`Supplier shipping method with ID ${id} not found`, "supplierShippingMethod");
      }
      
      const success = await storage.removeShippingMethodFromSupplier(existing.supplierId, existing.shippingMethodId);
      
      if (!success) {
        throw new NotFoundError(`Supplier shipping method with ID ${id} not found`, "supplierShippingMethod");
      }
      
      return res.json({
        success: true,
        message: 'Shipping method removed from supplier successfully'
      });
    } catch (error) {
      logger.error('Error removing shipping method from supplier', { error, id: req.params.id });
      if (error instanceof NotFoundError || error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        "Failed to remove shipping method from supplier. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  app.put("/api/suppliers/:supplierId/shipping-methods/:methodId/default", isAuthenticated, isAdmin, asyncHandler(async (req: Request, res: Response) => {
    try {
      const supplierId = parseInt(req.params.supplierId);
      const methodId = parseInt(req.params.methodId);
      
      const success = await storage.setDefaultShippingMethod(supplierId, methodId);
      
      if (!success) {
        throw new AppError(
          "Failed to set default shipping method.",
          ErrorCode.DATABASE_ERROR,
          500
        );
      }
      
      return res.json({
        success: true,
        message: 'Default shipping method updated successfully'
      });
    } catch (error) {
      logger.error('Error setting default shipping method', { 
        error, 
        supplierId: req.params.supplierId,
        methodId: req.params.methodId
      });
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        "Failed to set default shipping method. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  // Cart Shipping Analysis Routes (Public/Customer)
  // GET endpoint for current user's cart
  app.get("/api/cart/analyze-shipping", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        throw new AppError(
          "User not authenticated",
          ErrorCode.UNAUTHORIZED,
          401
        );
      }
      
      // Get user's cart items with product information
      const cartItems = await storage.getCartItemsWithProducts(userId);
      
      if (!cartItems || cartItems.length === 0) {
        return res.json({
          success: true,
          data: {
            supplierGroups: [],
            groupedBySupplier: [],
            totalShippingCost: 0,
            validationErrors: []
          }
        });
      }
      
      // Convert cart items to analysis format
      const items = cartItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity
      }));
      
      // Create a map of product info from cart items for enrichment
      const productInfoMap = new Map(cartItems.map(item => [
        item.productId,
        {
          name: item.product?.name || '',
          price: item.itemPrice ? parseFloat(item.itemPrice.toString()) : (item.product?.salePrice || item.product?.price || 0)
        }
      ]));
      
      const analysis = await storage.analyzeCartShipping(items);
      
      // Fetch all logistics companies for enrichment
      const companies = await storage.getAllLogisticsCompanies(true);
      const companyMap = new Map(companies.map(c => [c.id, c.name]));
      
      // Serialize supplier groups with shipping method data transformation
      const supplierGroups = analysis.groupedBySupplier.map(group => ({
        supplierId: group.supplierId,
        supplierName: group.supplier.name,
        items: group.items.map(item => {
          const productInfo = productInfoMap.get(item.productId);
          return {
            productId: item.productId,
            productName: productInfo?.name || '',
            quantity: item.quantity,
            price: parseFloat((productInfo?.price || 0).toString())
          };
        }),
        availableMethods: group.availableMethods.map(method => {
          const serializedMethod = serializeShippingMethod(method, companyMap.get(method.companyId) || 'Unknown');
          // Find the supplier-specific configuration
          const supplierMethod = group.supplier.supplierShippingMethods?.find(sm => sm.methodId === method.id);
          return {
            id: method.id,
            name: method.name,
            code: serializedMethod.code,
            customerPrice: supplierMethod?.customPrice != null ? parseFloat(supplierMethod.customPrice.toString()) : serializedMethod.baseCost,
            estimatedDeliveryDays: serializedMethod.estimatedDeliveryDays,
            isDefault: supplierMethod?.isDefault || false,
            logisticsCompanyName: serializedMethod.logisticsCompanyName
          };
        }),
        defaultMethodId: group.defaultMethod?.id || (group.availableMethods[0]?.id || 0)
      }));
      
      const serializedData = {
        supplierGroups,
        totalShippingCost: analysis.totalShippingCost,
        validationErrors: analysis.validationErrors
      };
      
      return res.json({
        success: true,
        data: serializedData
      });
    } catch (error) {
      logger.error('Error analyzing user cart shipping', { error, userId: (req.user as any)?.id });
      throw new AppError(
        "Failed to analyze cart shipping options. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  // POST endpoint for custom cart analysis
  app.post("/api/cart/analyze-shipping", asyncHandler(async (req: Request, res: Response) => {
    try {
      const cartAnalysisSchema = z.object({
        items: z.array(z.object({
          productId: z.number(),
          quantity: z.number().min(1)
        }))
      });
      
      const { items } = cartAnalysisSchema.parse(req.body);
      
      const analysis = await storage.analyzeCartShipping(items);
      
      // Fetch all logistics companies for enrichment
      const companies = await storage.getAllLogisticsCompanies(true);
      const companyMap = new Map(companies.map(c => [c.id, c.name]));
      
      // Serialize supplier groups with shipping method data transformation
      const supplierGroups = analysis.groupedBySupplier.map(group => ({
        supplierId: group.supplierId,
        supplierName: group.supplier.name,
        items: group.items.map(item => ({
          productId: item.productId,
          productName: item.productName || '',
          quantity: item.quantity,
          price: parseFloat(item.price?.toString() || '0')
        })),
        availableMethods: group.availableMethods.map(method => {
          const serializedMethod = serializeShippingMethod(method, companyMap.get(method.companyId) || 'Unknown');
          // Find the supplier-specific configuration
          const supplierMethod = group.supplier.supplierShippingMethods?.find(sm => sm.methodId === method.id);
          return {
            id: method.id,
            name: method.name,
            code: serializedMethod.code,
            customerPrice: supplierMethod?.customPrice != null ? parseFloat(supplierMethod.customPrice.toString()) : serializedMethod.baseCost,
            estimatedDeliveryDays: serializedMethod.estimatedDeliveryDays,
            isDefault: supplierMethod?.isDefault || false,
            logisticsCompanyName: serializedMethod.logisticsCompanyName
          };
        }),
        defaultMethodId: group.defaultMethod?.id || (group.availableMethods[0]?.id || 0)
      }));
      
      const serializedData = {
        supplierGroups,
        totalShippingCost: analysis.totalShippingCost,
        validationErrors: analysis.validationErrors
      };
      
      return res.json({
        success: true,
        data: serializedData
      });
    } catch (error) {
      logger.error('Error analyzing cart shipping', { error, body: req.body });
      throw new AppError(
        "Failed to analyze cart shipping options. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  app.post("/api/cart/calculate-shipping", asyncHandler(async (req: Request, res: Response) => {
    try {
      const shippingCalculationSchema = z.object({
        items: z.array(z.object({
          productId: z.number(),
          quantity: z.number().min(1)
        })),
        methodSelections: z.record(z.number())
      });
      
      const { items, methodSelections } = shippingCalculationSchema.parse(req.body);
      
      const calculation = await storage.calculateShippingForSelection(items, methodSelections);
      
      return res.json({
        success: true,
        data: calculation
      });
    } catch (error) {
      logger.error('Error calculating shipping cost', { error, body: req.body });
      throw new AppError(
        "Failed to calculate shipping cost. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  // CATALOG ROUTES
  app.get("/api/catalogs", asyncHandler(async (req: Request, res: Response) => {
    try {
      // For admin users, show all catalogs regardless of active status
      // For regular users, only show active catalogs
      const user = req.user as any;
      const isAdmin = user && user.role === 'admin';
      const activeOnly = isAdmin ? false : req.query.activeOnly !== 'false';
      
      const catalogs = await storage.getAllCatalogs(activeOnly);
      
      return res.json({
        success: true,
        data: catalogs,
        meta: {
          count: catalogs.length,
          activeOnly
        }
      });
    } catch (error) {
      // Log detailed error information
      logger.error('Error retrieving catalogs', { 
        error,
        query: req.query
      });
      
      // Return generic error
      throw new AppError(
        "Failed to retrieve catalogs. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  app.get("/api/catalogs/:id", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    
    try {
      const catalog = await storage.getCatalogById(id);
      
      if (!catalog) {
        throw new NotFoundError(`Catalog with ID ${id} not found`, "catalog");
      }
      
      // Get supplier information
      const supplier = await storage.getSupplierById(catalog.supplierId);
      
      return res.json({
        success: true,
        data: {
          ...catalog,
          supplier: supplier ? {
            id: supplier.id,
            name: supplier.name,
            isActive: supplier.isActive
          } : null
        }
      });
    } catch (error) {
      // Log detailed error information with context
      logger.error('Error retrieving catalog by ID', { 
        error,
        catalogId: id
      });
      
      // Check for specific error types
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      // Return generic error for unexpected issues
      throw new AppError(
        "Failed to retrieve catalog details. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  app.get("/api/suppliers/:supplierId/catalogs", asyncHandler(async (req: Request, res: Response) => {
    const supplierId = parseInt(req.params.supplierId);
    
    try {
      // Verify the supplier exists
      const supplier = await storage.getSupplierById(supplierId);
      if (!supplier) {
        throw new NotFoundError(`Supplier with ID ${supplierId} not found`, "supplier");
      }
      
      // For admin users, show all catalogs regardless of active status
      // For regular users, only show active catalogs
      const user = req.user as any;
      const isAdmin = user && user.role === 'admin';
      const activeOnly = isAdmin ? false : req.query.activeOnly !== 'false';
      
      const catalogs = await storage.getCatalogsBySupplierId(supplierId, activeOnly);
      
      return res.json({
        success: true,
        data: catalogs,
        meta: {
          count: catalogs.length,
          supplier: {
            id: supplier.id,
            name: supplier.name,
            isActive: supplier.isActive
          },
          activeOnly
        }
      });
    } catch (error) {
      // Log detailed error information with context
      logger.error('Error retrieving catalogs by supplier ID', { 
        error,
        supplierId,
        query: req.query
      });
      
      // Check for specific error types
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      // Return generic error for unexpected issues
      throw new AppError(
        "Failed to retrieve supplier catalogs. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  app.post("/api/catalogs", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    try {
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can manage catalogs");
      }
      
      const catalogData = insertCatalogSchema.parse(req.body);
      
      // Verify the supplier exists
      const supplier = await storage.getSupplierById(catalogData.supplierId);
      if (!supplier) {
        throw new NotFoundError(`Supplier with ID ${catalogData.supplierId} not found`, "supplier");
      }
      
      // Check if a catalog with the same name already exists for this supplier
      const existingCatalog = await storage.getCatalogByNameAndSupplierId(
        catalogData.name, 
        catalogData.supplierId
      );
      
      if (existingCatalog) {
        throw new AppError(
          `A catalog named "${catalogData.name}" already exists for this supplier`,
          ErrorCode.DUPLICATE_ENTITY,
          409
        );
      }
      
      const catalog = await storage.createCatalog(catalogData);
      
      return res.status(201).json({
        success: true,
        data: catalog,
        message: `Catalog "${catalog.name}" created successfully`
      });
    } catch (error) {
      // Log detailed error information with context
      logger.error('Error creating catalog', { 
        error,
        userId: user.id,
        catalogData: req.body
      });
      
      // Check for specific error types
      if (error instanceof ForbiddenError || error instanceof NotFoundError || error instanceof AppError || error instanceof z.ZodError) {
        throw error;
      }
      
      // Return generic error for unexpected issues
      throw new AppError(
        "Failed to create catalog. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  app.put("/api/catalogs/:id", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const id = parseInt(req.params.id);
    
    try {
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can manage catalogs");
      }
      
      // Validate request body
      const catalogData = insertCatalogSchema.partial().parse(req.body);
      
      // Check if catalog exists
      const existingCatalog = await storage.getCatalogById(id);
      if (!existingCatalog) {
        throw new NotFoundError(`Catalog with ID ${id} not found`, "catalog");
      }
      
      // If changing the supplier, check if it exists
      if (catalogData.supplierId && catalogData.supplierId !== existingCatalog.supplierId) {
        const supplier = await storage.getSupplierById(catalogData.supplierId);
        if (!supplier) {
          throw new NotFoundError(`Supplier with ID ${catalogData.supplierId} not found`, "supplier");
        }
      }
      
      // If changing the name, check for duplicates within the same supplier
      if (catalogData.name && catalogData.name !== existingCatalog.name) {
        const supplierId = catalogData.supplierId || existingCatalog.supplierId;
        const duplicateCatalog = await storage.getCatalogByNameAndSupplierId(
          catalogData.name, 
          supplierId
        );
        
        if (duplicateCatalog && duplicateCatalog.id !== id) {
          throw new AppError(
            `A catalog named "${catalogData.name}" already exists for this supplier`,
            ErrorCode.DUPLICATE_ENTITY,
            409
          );
        }
      }
      
      // Update the catalog
      const catalog = await storage.updateCatalog(id, catalogData);
      
      // If 'isActive' property was changed, update all products in this catalog
      if (catalogData.isActive !== undefined) {
        try {
          const updateResult = await storage.bulkUpdateCatalogProducts(id, { isActive: catalogData.isActive });
          logger.info(`Updated isActive status for products in catalog ${id}`, {
            catalogId: id, 
            isActive: catalogData.isActive,
            productsUpdated: updateResult
          });
        } catch (cascadeError) {
          // Log cascade error but don't fail the main operation
          logger.warn('Error during cascade update of product status', { 
            error: cascadeError, 
            catalogId: id,
            isActive: catalogData.isActive
          });
        }
      }
      
      return res.json({
        success: true,
        data: catalog,
        message: `Catalog "${catalog.name}" updated successfully`
      });
    } catch (error) {
      // Log detailed error information with context
      logger.error('Error updating catalog', { 
        error,
        userId: user.id,
        catalogId: id,
        catalogData: req.body
      });
      
      // Check for specific error types
      if (error instanceof NotFoundError || error instanceof ForbiddenError || error instanceof AppError || error instanceof z.ZodError) {
        throw error;
      }
      
      // Return generic error for unexpected issues
      throw new AppError(
        "Failed to update catalog. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  // Shared catalog deletion handler
  const handleCatalogDeletion = async (req: Request, res: Response) => {
    const user = req.user as any;
    const id = parseInt(req.params.id);
    
    try {
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can manage catalogs");
      }
      
      // Check if catalog exists
      const catalog = await storage.getCatalogById(id);
      if (!catalog) {
        throw new NotFoundError(`Catalog with ID ${id} not found`, "catalog");
      }
      
      // Check if catalog has products
      const catalogProducts = await storage.getProductsByCatalogId(id, true);
      
      // Delete all products in the catalog if there are any
      if (catalogProducts.length > 0) {
        logger.info(`Deleting ${catalogProducts.length} products from catalog "${catalog.name}" (ID: ${id})`);
        
        // Delete all product images from object storage first
        for (const product of catalogProducts) {
          try {
            // Get all images for this product
            const productImages = await storage.getProductImages(product.id);
            
            // Delete each image from object storage
            for (const image of productImages) {
              try {
                if (image.objectKey) {
                  await objectStore.deleteFile(image.objectKey);
                  logger.debug(`Deleted product image from object storage: ${image.objectKey}`);
                }
              } catch (imageError) {
                logger.warn(`Failed to delete image ${image.objectKey} from object storage:`, imageError);
              }
            }
            
            // Delete the product images from database
            await storage.deleteProductImages(product.id);
            
            // Delete the product itself
            await storage.deleteProduct(product.id);
            logger.debug(`Deleted product "${product.name}" (ID: ${product.id})`);
          } catch (productError) {
            logger.error(`Failed to delete product ${product.id}:`, productError);
            throw productError;
          }
        }
      }
      
      // Finally, delete the catalog itself
      const success = await storage.deleteCatalog(id);
      
      if (!success) {
        throw new AppError("Failed to delete catalog", ErrorCode.OPERATION_FAILED, 500);
      }
      
      logger.info(`Successfully deleted catalog "${catalog.name}" (ID: ${id}) and ${catalogProducts.length} associated products`);
      
      return res.json({
        success: true,
        message: `Catalog "${catalog.name}" and ${catalogProducts.length} associated products have been deleted successfully.`
      });
      
    } catch (error) {
      logger.error("Error deleting catalog:", error);
      throw error;
    }
  };

  // Handle catalog deletion via POST with _method override (for compatibility)
  app.post("/api/catalogs/:id", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    if (req.body._method === 'DELETE') {
      return handleCatalogDeletion(req, res);
    }
    
    // If not a delete operation, return method not allowed
    return res.status(405).json({
      success: false,
      error: { message: "Method not allowed for this endpoint" }
    });
  }));

  app.delete("/api/catalogs/:id", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const id = parseInt(req.params.id);
    
    try {
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can manage catalogs");
      }
      
      // Check if catalog exists
      const catalog = await storage.getCatalogById(id);
      if (!catalog) {
        throw new NotFoundError(`Catalog with ID ${id} not found`, "catalog");
      }
      
      // Check if catalog has products
      const catalogProducts = await storage.getProductsByCatalogId(id, true);
      
      // Delete all products in the catalog if there are any
      if (catalogProducts.length > 0) {
        logger.info(`Deleting ${catalogProducts.length} products from catalog "${catalog.name}" (ID: ${id})`);
        
        // Delete all product images from object storage first
        for (const product of catalogProducts) {
          try {
            // Get all images for this product
            const productImages = await storage.getProductImages(product.id);
            
            // Delete each image from object storage
            for (const image of productImages) {
              try {
                if (image.objectKey) {
                  await objectStore.deleteFile(image.objectKey);
                  logger.debug(`Deleted product image from object storage: ${image.objectKey}`);
                }
                
                // Also delete background-removed image if it exists
                if (image.hasBgRemoved && image.bgRemovedObjectKey) {
                  await objectStore.deleteFile(image.bgRemovedObjectKey);
                  logger.debug(`Deleted background-removed image from object storage: ${image.bgRemovedObjectKey}`);
                }
              } catch (imageDeleteError) {
                logger.error(`Error deleting product image from object storage`, {
                  error: imageDeleteError,
                  productId: product.id,
                  imageId: image.id,
                  objectKey: image.objectKey
                });
                // Continue with other images even if one fails
              }
            }
            
            // Now delete the product itself
            await storage.deleteProduct(product.id);
            logger.debug(`Deleted product ID ${product.id} from catalog ${id}`);
          } catch (productDeleteError) {
            logger.error(`Error deleting product ${product.id} from catalog ${id}`, {
              error: productDeleteError
            });
            // Continue with other products even if one fails
          }
        }
      }
      
      // Finally delete the catalog
      const success = await storage.deleteCatalog(id);
      
      if (!success) {
        throw new AppError(
          "Failed to delete catalog due to a database error.",
          ErrorCode.DATABASE_ERROR,
          500
        );
      }
      
      return res.json({
        success: true,
        message: `Catalog "${catalog.name}" and all its products deleted successfully`
      });
    } catch (error) {
      // Log detailed error information with context
      logger.error('Error deleting catalog', { 
        error,
        userId: user.id,
        catalogId: id
      });
      
      // Check for specific error types
      if (error instanceof NotFoundError || error instanceof ForbiddenError || error instanceof AppError) {
        throw error;
      }
      
      // Return generic error for unexpected issues
      throw new AppError(
        "Failed to delete catalog. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  // Endpoint to toggle catalog active status and update all its products
  app.patch("/api/catalogs/:id/toggle-status", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const id = parseInt(req.params.id);
    
    try {
      // Check admin permissions
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can manage catalogs");
      }
      
      // Validate request body
      const { isActive } = req.body;
      
      if (typeof isActive !== 'boolean') {
        throw new ValidationError("isActive must be a boolean value");
      }
      
      // Verify the catalog exists
      const catalog = await storage.getCatalogById(id);
      if (!catalog) {
        throw new NotFoundError(`Catalog with ID ${id} not found`, "catalog");
      }
      
      // If the status is already what was requested, no need to change
      if (catalog.isActive === isActive) {
        return res.json({
          success: true,
          data: {
            catalog,
            productsUpdated: 0
          },
          message: `Catalog "${catalog.name}" is already ${isActive ? 'active' : 'inactive'}`
        });
      }
      
      // Update catalog status
      const updatedCatalog = await storage.updateCatalog(id, { isActive });
      
      if (!updatedCatalog) {
        throw new AppError(
          "Failed to update catalog status.",
          ErrorCode.DATABASE_ERROR,
          500
        );
      }
      
      // Get all products in this catalog
      const products = await storage.getProductsByCatalogId(id, true);
      let updatedCount = 0;
      
      // Update status of all products
      if (products.length > 0) {
        const productIds = products.map(product => product.id);
        updatedCount = await storage.bulkUpdateProductStatus(productIds, isActive);
        
        logger.info(`Updated ${updatedCount} products in catalog ${id} to ${isActive ? 'active' : 'inactive'} status`);
      }
      
      return res.json({
        success: true,
        data: {
          catalog: updatedCatalog,
          productsUpdated: updatedCount
        },
        message: `Catalog "${catalog.name}" ${isActive ? 'activated' : 'deactivated'} successfully with ${updatedCount} products updated`
      });
    } catch (error) {
      // Log detailed error information with context
      logger.error('Error toggling catalog status', { 
        error,
        userId: user?.id,
        catalogId: id
      });
      
      // Check for specific error types
      if (error instanceof NotFoundError || 
          error instanceof ForbiddenError || 
          error instanceof ValidationError ||
          error instanceof AppError) {
        throw error;
      }
      
      // Return generic error for unexpected issues
      throw new AppError(
        "Failed to update catalog status. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  app.get("/api/catalogs/:catalogId/products", asyncHandler(async (req: Request, res: Response) => {
    const catalogId = parseInt(req.params.catalogId);
    
    try {
      console.log(`API: Getting products for catalog ID ${catalogId}, query:`, req.query);
      
      // First check if the catalog exists
      const catalog = await storage.getCatalogById(catalogId);
      if (!catalog) {
        throw new NotFoundError(`Catalog with ID ${catalogId} not found`, "catalog");
      }
      
      // For admin users, show all products regardless of active status
      // For regular users, only show active products
      const user = req.user as any;
      const isAdmin = user && user.role === 'admin';
      const activeOnly = isAdmin ? false : req.query.activeOnly !== 'false';
      
      console.log(`User is admin: ${isAdmin}, activeOnly: ${activeOnly}`);
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      
      if (isNaN(limit) || isNaN(offset) || limit < 0 || offset < 0) {
        throw new ValidationError("Invalid pagination parameters");
      }
      
      console.log(`Calling getProductsByCatalogId with: catalogId=${catalogId}, activeOnly=${!activeOnly}, limit=${limit}, offset=${offset}`);
      const products = await storage.getProductsByCatalogId(catalogId, !activeOnly, limit, offset);
      
      // Get total count for pagination
      console.log(`Calling getProductCountByCatalogId with: catalogId=${catalogId}, includeInactive=${!activeOnly}`);
      const totalCount = await storage.getProductCountByCatalogId(catalogId, !activeOnly);
      
      console.log(`Successfully retrieved ${products.length} products with total count ${totalCount}`);
      
      return res.json({
        success: true,
        data: products,
        meta: {
          count: products.length,
          total: totalCount,
          limit,
          offset,
          catalog: {
            id: catalog.id,
            name: catalog.name,
            isActive: catalog.isActive
          },
          includeInactive: !activeOnly
        }
      });
    } catch (error) {
      // Log detailed error information with context
      console.error(`API Error: Failed to retrieve products for catalog ID ${catalogId}:`, error);
      logger.error('Error retrieving catalog products', { 
        error,
        catalogId,
        query: req.query
      });
      
      // Check for specific error types
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      
      // Return generic error for unexpected issues
      throw new AppError(
        "Failed to retrieve catalog products. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));
  
  // AI-assisted attribute suggestion for the product wizard
  app.post(
    "/api/products/wizard/suggest-attributes",
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      // Check if user is admin
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can use AI attribute suggestions");
      }
      
      const { categoryId, productName, productDescription, existingAttributes } = req.body;
      
      if (!categoryId || !productName) {
        throw new BadRequestError("Category ID and product name are required");
      }
      
      try {
        const suggestions = await suggestProductAttributes(
          categoryId,
          productName,
          productDescription,
          existingAttributes
        );
        
        res.json({
          success: true,
          data: suggestions
        });
      } catch (error) {
        logger.error('Error generating attribute suggestions:', { 
          error, 
          userId: user.id, 
          categoryId, 
          productName 
        });
        
        throw new AppError(
          "Failed to generate attribute suggestions. Please try again or fill in attributes manually.",
          ErrorCode.AI_SERVICE_ERROR,
          500
        );
      }
    })
  );

  // Get catalog context data for product wizard
  app.get("/api/catalogs/:catalogId/context", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const catalogId = parseInt(req.params.catalogId);
    
    try {
      // Ensure user has permission to access this catalog
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can access catalog context data");
      }
      
      // First check if the catalog exists
      const catalog = await storage.getCatalogById(catalogId);
      
      if (!catalog) {
        throw new NotFoundError(`Catalog with ID ${catalogId} not found`, "catalog");
      }
      
      // Get categories for this catalog's context
      const categories = await storage.getCategories();
      
      // Get the default attribute requirements for new products
      let requiredAttributes = [];
      try {
        // Only fetch if we have the getRequiredAttributes method
        if (typeof storage.getRequiredAttributes === 'function') {
          requiredAttributes = await storage.getRequiredAttributes();
        }
      } catch (attrError) {
        console.error("Error fetching required attributes:", attrError);
      }
      
      // For the catalog's custom fields and defaults
      const supplierName = catalog.supplierName || null;
      const defaultMarkupPercentage = catalog.defaultMarkupPercentage || 0;
      
      return res.json({
        success: true,
        data: {
          catalog: {
            id: catalog.id,
            name: catalog.name,
            supplierName,
            defaultMarkupPercentage,
            isActive: catalog.isActive
          },
          categories: categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            parentId: cat.parentId || null,
            isActive: cat.isActive
          })),
          requiredAttributes,
          defaults: {
            // Default values for new products in this catalog
            minimumOrder: 1,
            freeShipping: false
          }
        }
      });
    } catch (error) {
      // Log detailed error information with context
      logger.error('Error retrieving catalog context', { 
        error,
        catalogId
      });
      
      // Check for specific error types
      if (error instanceof NotFoundError || 
          error instanceof ValidationError || 
          error instanceof ForbiddenError) {
        throw error;
      }
      
      // Return generic error for unexpected issues
      throw new AppError(
        "Failed to retrieve catalog context data. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  app.put("/api/catalogs/:catalogId/products/bulk", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const catalogId = parseInt(req.params.catalogId);
    
    try {
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can manage catalog products");
      }
      
      // First check if the catalog exists
      const catalog = await storage.getCatalogById(catalogId);
      if (!catalog) {
        throw new NotFoundError(`Catalog with ID ${catalogId} not found`, "catalog");
      }
      
      // Validate update data
      const updateData = insertProductSchema.partial().parse(req.body);
      
      // Check if there are any products in this catalog
      const productCount = await storage.getProductCountByCatalogId(catalogId, true);
      if (productCount === 0) {
        return res.json({
          success: true,
          data: {
            count: 0,
            message: "No products found in catalog to update"
          }
        });
      }
      
      // Perform the bulk update
      const count = await storage.bulkUpdateCatalogProducts(catalogId, updateData);
      
      return res.json({
        success: true,
        data: {
          count,
          message: `Updated ${count} products in catalog "${catalog.name}"`,
          catalog: {
            id: catalog.id,
            name: catalog.name
          },
          updateFields: Object.keys(updateData)
        }
      });
    } catch (error) {
      // Log detailed error information with context
      logger.error('Error bulk updating catalog products', { 
        error,
        userId: user.id,
        catalogId,
        updateData: req.body
      });
      
      // Check for specific error types
      if (error instanceof NotFoundError || error instanceof ForbiddenError || error instanceof z.ZodError) {
        throw error;
      }
      
      // Return generic error for unexpected issues
      throw new AppError(
        "Failed to bulk update catalog products. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  // Quick edit product endpoint
  app.patch("/api/products/:id/quick-edit", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const productId = parseInt(req.params.id);
    
    try {
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can update products");
      }
      
      if (isNaN(productId)) {
        throw new BadRequestError("Invalid product ID");
      }
      
      const { name, price, listPrice, sku, stockQuantity, isActive } = req.body;
      
      // Create validation schema for quick edit
      const quickEditSchema = z.object({
        name: z.string().min(3, "Product name must be at least 3 characters"),
        price: z.number().positive("Price must be a positive number"),
        listPrice: z.number().nonnegative("List price must be a non-negative number").optional(),
        sku: z.string().min(1, "SKU is required"),
        stockQuantity: z.number().int().nonnegative("Stock quantity must be a non-negative integer"),
        isActive: z.boolean()
      });
      
      // Validate input using zod
      try {
        quickEditSchema.parse({
          name,
          price,
          listPrice,
          sku,
          stockQuantity,
          isActive
        });
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          const errorMessages = validationError.errors.map(err => err.message).join(', ');
          throw new ValidationError(`Validation failed: ${errorMessages}`);
        }
        throw validationError;
      }
      
      // Get the existing product to check if it exists
      const existingProduct = await storage.getProductById(productId);
      
      if (!existingProduct) {
        throw new NotFoundError(`Product with ID ${productId} not found`, "product");
      }
      
      // Check if the SKU is unique (if it's changed)
      if (sku !== existingProduct.sku) {
        const existingProductWithSku = await storage.getProductBySku(sku);
        if (existingProductWithSku && existingProductWithSku.id !== productId) {
          throw new AppError(
            `A product with SKU "${sku}" already exists`,
            ErrorCode.VALIDATION_ERROR,
            400
          );
        }
      }
      
      // Update the product
      const updateData = {
        name,
        price,
        sku,
        stockQuantity,
        isActive
      };
      
      // Only add listPrice if it's provided
      if (listPrice !== undefined) {
        // @ts-ignore - We know this is valid from our validation
        updateData.listPrice = listPrice;
      }
      
      const updatedProduct = await storage.updateProduct(productId, updateData);
      
      if (!updatedProduct) {
        throw new AppError(
          "Failed to update product due to a database error",
          ErrorCode.DATABASE_ERROR,
          500
        );
      }
      
      return res.json({
        success: true,
        data: {
          message: "Product updated successfully",
          product: updatedProduct
        }
      });
    } catch (error) {
      // Log detailed error information with context
      logger.error('Error updating product', { 
        error,
        userId: user.id,
        productId,
        requestBody: req.body
      });
      
      // Check for specific error types
      if (error instanceof NotFoundError || 
          error instanceof ForbiddenError || 
          error instanceof ValidationError ||
          error instanceof BadRequestError ||
          error instanceof AppError) {
        throw error;
      }
      
      // Return generic error for unexpected issues
      throw new AppError(
        "Failed to update product. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  // PATCH endpoint to reorder products in a catalog
  app.patch("/api/catalogs/:id/products/reorder", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const catalogId = parseInt(req.params.id);
    
    try {
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can reorder catalog products");
      }
      
      if (isNaN(catalogId)) {
        throw new BadRequestError("Invalid catalog ID");
      }
      
      // Validate productIds is an array of integers
      const { productIds } = req.body;
      
      if (!Array.isArray(productIds)) {
        throw new ValidationError("productIds must be an array of product IDs");
      }
      
      if (productIds.length === 0) {
        throw new ValidationError("productIds array cannot be empty");
      }
      
      // Check if all items are valid integers
      for (const id of productIds) {
        if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
          throw new ValidationError(`Invalid product ID: ${id}. All IDs must be positive integers.`);
        }
      }
      
      // Check for duplicate IDs
      const uniqueIds = new Set(productIds);
      if (uniqueIds.size !== productIds.length) {
        throw new ValidationError("productIds contains duplicate values");
      }
      
      // Check if catalog exists
      const catalog = await storage.getCatalogById(catalogId);
      if (!catalog) {
        throw new NotFoundError(`Catalog with ID ${catalogId} not found`, "catalog");
      }
      
      // Check if all products exist and belong to this catalog
      const existingProducts = await storage.getProductsByCatalogId(catalogId, true);
      const existingProductIds = new Set(existingProducts.map(p => p.id));
      
      const invalidIds = productIds.filter(id => !existingProductIds.has(id));
      if (invalidIds.length > 0) {
        throw new ValidationError(
          `The following product IDs do not exist in catalog ${catalogId}: ${invalidIds.join(', ')}`
        );
      }
      
      // If not all products are included, we should validate that we're not missing any
      if (productIds.length !== existingProducts.length) {
        // Get the missing IDs for better error message
        const missingIds = [...existingProductIds].filter(id => !productIds.includes(id));
        throw new ValidationError(
          `Not all products in catalog are included in the reordering. Missing product IDs: ${missingIds.join(', ')}`
        );
      }
      
      // Update the display order for each product
      const result = await storage.updateProductDisplayOrder(catalogId, productIds);
      
      return res.json({
        success: true,
        data: { 
          message: `Updated display order for ${result.count} products in catalog "${catalog.name}"`,
          count: result.count,
          catalog: {
            id: catalog.id,
            name: catalog.name
          }
        }
      });
    } catch (error) {
      // Log detailed error information with context
      logger.error('Error reordering catalog products', { 
        error,
        userId: user.id,
        catalogId,
        productIds: req.body.productIds
      });
      
      // Check for specific error types
      if (error instanceof NotFoundError || 
          error instanceof ForbiddenError || 
          error instanceof ValidationError ||
          error instanceof BadRequestError ||
          error instanceof AppError) {
        throw error;
      }
      
      // Return generic error for unexpected issues
      throw new AppError(
        "Failed to reorder catalog products. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));
  
  // Object storage file access endpoint - using reliable buffer-based approach
  app.get('/api/files/:path(*)', asyncHandler(async (req: Request, res: Response) => {
    const objectKey = req.params.path;
    
    try {
      if (!objectKey || objectKey.trim() === '') {
        throw new BadRequestError("Invalid file path");
      }
      
      // Validate allowed file paths for security
      if (objectKey.includes('..') || objectKey.startsWith('/') || objectKey.includes('\\')) {
        throw new ForbiddenError("Invalid file path pattern");
      }
      
      // Check allowed object directories
      const allowedPrefixes = [
        // Standard system folders
        'products/', 'categories/', 'temp/', 'suppliers/', 'catalog/', 'catalogs/',
        // Proof of payment files
        'POPS/',
        // New folder structure for supplier/catalog-based paths
        // Any path that starts with a supplier name is allowed
      ];
      
      // Check if the path starts with any of the explicit allowed prefixes
      let isAllowedPrefix = allowedPrefixes.some(prefix => objectKey.startsWith(prefix));
      
      // If not allowed by explicit prefix, check if it follows the supplier/catalog pattern
      // Format: {supplierName}/{catalogName}/{category}/{productName}_{productId}/filename
      if (!isAllowedPrefix) {
        // The pattern will be a path that starts with a name, then has catalog, then other parts
        // We don't check for specific supplier names to allow any supplier directory
        const supplierCatalogPattern = /^[a-z0-9-_]+\/[a-z0-9-_]+\//i;
        isAllowedPrefix = supplierCatalogPattern.test(objectKey);
      }
      
      if (!isAllowedPrefix) {
        logger.warn(`Attempted access to unauthorized path: ${objectKey}`);
        throw new ForbiddenError("Access to this file path is not allowed");
      }
      
      // First check if the file exists
      const fileExists = await objectStoreAdapter.exists(objectKey);
      if (!fileExists) {
        throw new NotFoundError(`File not found: ${objectKey}`, "file");
      }
      
      const MAX_RETRIES = 3;
      let lastError: any = null;
      
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          // Use our buffer-based method for reliable file handling
          // Apply a small delay if this is a temp file to prevent race conditions
          if (objectKey.includes('/temp/')) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          // Get the file data and content type in one operation
          const { data, contentType } = await objectStoreAdapter.getFileAsBuffer(objectKey);
          
          // Validate the buffer has actual content
          if (!data || data.length === 0) {
            throw new AppError(
              `Retrieved empty buffer for ${objectKey}`,
              ErrorCode.STORAGE_ERROR,
              500
            );
          }
          
          // Set appropriate headers
          if (contentType) {
            res.setHeader('Content-Type', contentType);
          }
          res.setHeader('Content-Length', data.length);
          res.setHeader('Cache-Control', 
            contentType && contentType.startsWith('image/') 
              ? 'public, max-age=86400' 
              : 'no-cache'
          );
          
          // Send the buffer directly (more reliable than streaming)
          return res.end(data);
        } catch (downloadError: any) {
          lastError = downloadError;
          logger.error(`Error retrieving file ${objectKey} (attempt ${attempt}/${MAX_RETRIES}):`, { 
            error: downloadError,
            attempt,
            objectKey
          });
          
          if (attempt < MAX_RETRIES) {
            // Exponential backoff
            const delay = Math.pow(2, attempt) * 200;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // If we get here, all retries failed
      throw new AppError(
        `Failed to retrieve file after ${MAX_RETRIES} attempts`,
        ErrorCode.STORAGE_ERROR,
        500,
        { originalError: lastError, objectKey }
      );
      
    } catch (error) {
      // Log detailed error information with context
      logger.error('Error serving file', { 
        error,
        objectKey,
        requestPath: req.path,
        requestOrigin: req.headers.origin || 'unknown'
      });
      
      // Check for specific error types
      if (error instanceof NotFoundError || 
          error instanceof ForbiddenError || 
          error instanceof BadRequestError ||
          error instanceof AppError) {
        throw error;
      }
      
      // Return generic error for unexpected issues
      throw new AppError(
        "Failed to retrieve file from storage. Please try again.",
        ErrorCode.STORAGE_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  // ------------------------------------------------
  // Product Drafts API Routes - moved to product-draft-routes.ts
  // ------------------------------------------------
  
  // Get a specific product draft by ID
  app.get("/api/product-drafts/:draftId", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const draftId = req.params.draftId;
    
    try {
      const draft = await storage.getProductDraft(parseInt(draftId));
      
      if (!draft) {
        return res.status(404).json({
          success: false,
          error: {
            message: "Product draft not found",
            code: "NOT_FOUND",
            entity: "draft"
          }
        });
      }
      
      res.json({
        success: true,
        data: draft
      });
    } catch (error: any) {
      // Simplified error handling
      logger.error('Error fetching product draft:', { error, userId: user.id, draftId });
      res.status(500).json({
        success: false,
        error: {
          message: error.message || "An unexpected error occurred",
          code: "INTERNAL_SERVER_ERROR"
        }
      });
    }
  }));
  
  // POST /api/product-drafts endpoint is now handled by product-draft-routes.ts
  // The conflict between implementations has been resolved by removing this duplicate endpoint
  
  // Delete a product draft route is now handled by product-draft-routes.ts

  // Register new attribute system routes
  registerAttributeRoutes(app);
  registerProductAttributeRoutes(app);
  registerProductDraftRoutes(app);
  
  // Register AI API routes for product generation features
  app.use('/api/ai', aiApiRoutes);
  
  // Mount legacy AI routes if they exist
  if (aiRouter) {
    app.use('/api/ai-legacy', aiRouter);
  }
  
  // Register attribute discount rules routes
  // Removed attribute discount routes as part of centralized attribute system
  
  // Register pricing routes
  app.use('/api', pricingRoutes);
  
  // Register batch upload routes for mass product upload
  app.use('/api/batch-upload', batchUploadRoutes);
  
  // Register file browser routes for object storage management
  app.use('/api/file-browser', fileBrowserRoutes);
  
  // Register debug routes for direct testing
  app.use('/debug', debugRoutes);
  
  // Cleanup utilities for orphaned images - TEMPORARY ROUTES FOR TESTING
  app.get('/api/admin/cleanup/draft-images/:draftId', asyncHandler(async (req: Request, res: Response) => {
    const draftId = parseInt(req.params.draftId);
    if (isNaN(draftId)) {
      return res.status(400).json({ success: false, error: 'Invalid draft ID' });
    }
    
    logger.info(`Admin requested cleanup of orphaned images for draft ${draftId}`);
    const result = await cleanupOrphanedDraftImages(draftId);
    return res.json({ 
      success: true, 
      data: result
    });
  }));
  
  app.get('/api/admin/cleanup/all-drafts', asyncHandler(async (req: Request, res: Response) => {
    logger.info('Admin requested cleanup of all orphaned draft images');
    const result = await cleanupAllOrphanedDraftImages();
    return res.json({ 
      success: true, 
      data: result
    });
  }));
  
  // DIRECT TEST ENDPOINTS - FOR DEVELOPMENT TESTING ONLY
  // These endpoints bypass authentication for direct testing of image operations
  
  // Test endpoint to list files in a draft folder
  app.get('/test/list/:draftId', asyncHandler(async (req: Request, res: Response) => {
    const draftId = parseInt(req.params.draftId);
    if (isNaN(draftId)) {
      return res.status(400).json({ success: false, error: 'Invalid draft ID' });
    }
    
    logger.info(`TEST: Listing files for draft ${draftId}`);
    const draftPrefix = `drafts/${draftId}/`;
    
    try {
      // First try listing with our original approach
      const files = await objectStore.listFiles(draftPrefix);
      
      // If that fails, try a direct client access approach
      let directListFiles: string[] = [];
      if (files.length === 0) {
        logger.info(`TEST: Attempting direct list for draft ${draftId}`);
        try {
          const client = objectStore.getClient();
          if (client) {
            const result = await client.list(draftPrefix);
            console.log("Direct list result:", JSON.stringify(result));
            if (result && result.value && Array.isArray(result.value)) {
              directListFiles = result.value
                .filter(obj => obj !== null && typeof obj === 'object')
                .map(obj => {
                  console.log("Object entry:", JSON.stringify(obj));
                  return obj.key || null;
                })
                .filter(key => key !== null);
              logger.info(`TEST: Direct list found ${directListFiles.length} files`);
            }
          }
        } catch (innerError) {
          logger.error(`TEST: Error in direct list for draft ${draftId}`, { innerError });
        }
      }
      
      // Final approach - try parent prefix
      let parentListFiles: string[] = [];
      if (files.length === 0 && directListFiles.length === 0) {
        logger.info(`TEST: Attempting parent folder list for draft ${draftId}`);
        try {
          const client = objectStore.getClient();
          if (client) {
            const result = await client.list('drafts/');
            console.log("Parent list result:", JSON.stringify(result));
            if (result && result.value && Array.isArray(result.value)) {
              parentListFiles = result.value
                .filter(obj => obj !== null && typeof obj === 'object')
                .map(obj => {
                  // Try both name and key fields
                  let objectKey = null;
                  if (obj.key && typeof obj.key === 'string') {
                    objectKey = obj.key;
                    console.log('Parent using key field:', objectKey);
                  } else if (obj.name && typeof obj.name === 'string') {
                    objectKey = obj.name;
                    console.log('Parent using name field:', objectKey);
                  }
                  return objectKey;
                })
                .filter(key => key !== null && key.includes(`/drafts/${draftId}/`));
              logger.info(`TEST: Parent list found ${parentListFiles.length} matching files`);
            }
          }
        } catch (innerError) {
          logger.error(`TEST: Error in parent list for draft ${draftId}`, { innerError });
        }
      }
      
      return res.json({
        success: true,
        draftId,
        count: files.length,
        files,
        directListCount: directListFiles.length,
        directListFiles,
        parentListCount: parentListFiles.length,
        parentListFiles
      });
    } catch (error) {
      logger.error(`TEST: Error listing files for draft ${draftId}`, { error });
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }));
  
  // Test endpoint to delete a specific file
  app.get('/test/delete/:objectKey(*)', asyncHandler(async (req: Request, res: Response) => {
    const objectKey = req.params.objectKey;
    
    logger.info(`TEST: Direct delete attempt for ${objectKey}`);
    
    try {
      // First check if the file exists
      const existsBefore = await objectStore.exists(objectKey);
      
      if (!existsBefore) {
        return res.json({
          success: true,
          message: `File does not exist: ${objectKey}`,
          existed: false
        });
      }
      
      // Attempt to delete the file
      await objectStore.deleteFile(objectKey);
      
      // Verify deletion
      const existsAfter = await objectStore.exists(objectKey);
      
      return res.json({
        success: !existsAfter,
        objectKey,
        existedBefore: existsBefore,
        existsAfter: existsAfter,
        message: existsAfter ? 'Failed to delete file' : 'File successfully deleted'
      });
    } catch (error) {
      logger.error(`TEST: Error deleting file ${objectKey}`, { error });
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }));
  
  // Test endpoint to cleanup orphaned draft images
  app.get('/test/cleanup/:draftId', asyncHandler(async (req: Request, res: Response) => {
    const draftId = parseInt(req.params.draftId);
    if (isNaN(draftId)) {
      return res.status(400).json({ success: false, error: 'Invalid draft ID' });
    }
    
    logger.info(`TEST: Cleaning up orphaned images for draft ${draftId}`);
    
    try {
      const result = await cleanupOrphanedDraftImages(draftId);
      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error(`TEST: Error cleaning up draft ${draftId}`, { error });
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }));
  
  // Test endpoint to get detailed draft info
  app.get('/test/draft/:draftId', asyncHandler(async (req: Request, res: Response) => {
    const draftId = parseInt(req.params.draftId);
    if (isNaN(draftId)) {
      return res.status(400).json({ success: false, error: 'Invalid draft ID' });
    }
    
    logger.info(`TEST: Getting details for draft ${draftId}`);
    
    try {
      const draft = await storage.getProductDraft(draftId);
      
      if (!draft) {
        return res.status(404).json({
          success: false,
          error: `Draft ${draftId} not found`
        });
      }
      
      // Get detailed draft info
      return res.json({
        success: true,
        draftId,
        draft: {
          ...draft,
          imageCount: draft.imageUrls?.length || 0,
          imageObjectKeyCount: draft.imageObjectKeys?.length || 0,
          images: draft.imageUrls?.map((url, index) => ({
            url,
            objectKey: draft.imageObjectKeys?.[index] || null,
            isMain: draft.mainImageIndex === index
          }))
        }
      });
    } catch (error) {
      logger.error(`TEST: Error getting draft ${draftId}`, { error });
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }));
  
  // Special direct object store access for debugging
  app.get('/test/raw-list/:path(*)', asyncHandler(async (req: Request, res: Response) => {
    const path = req.params.path;
    logger.info(`TEST: Raw object store list for path ${path}`);
    
    try {
      // Get raw client
      const client = objectStore.getClient();
      if (!client) {
        return res.status(500).json({
          success: false,
          error: 'Object store client not available'
        });
      }
      
      // Direct raw result from object store
      const result = await client.list(path);
      
      // Also get raw keys
      const rawKeys: string[] = [];
      if (result && result.value && Array.isArray(result.value)) {
        for (const item of result.value) {
          if (item && typeof item === 'object') {
            console.log('Raw item:', JSON.stringify(item));
            // Try both name and key fields
            let objectKey = null;
            if (item.key && typeof item.key === 'string') {
              objectKey = item.key;
              console.log('Using key field:', objectKey);
            } else if (item.name && typeof item.name === 'string') {
              objectKey = item.name;
              console.log('Using name field:', objectKey);
            }
            
            if (objectKey) {
              rawKeys.push(objectKey);
            }
          }
        }
      }
      
      return res.json({
        success: true,
        path,
        rawResult: result,
        rawKeys
      });
    } catch (error) {
      logger.error(`TEST: Error in raw object store list: ${error instanceof Error ? error.message : String(error)}`);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }));

  // Register analytics routes
  app.use('/api/analytics', analyticsRoutes);
  
  // Register credit system routes
  app.use('/api/credits', creditRoutes);
  
  // Register supplier order management routes
  app.use('/api/admin/supplier-orders', supplierOrderRoutes);

  // ============================================================================
  // PUDO LOCKER ROUTES
  // ============================================================================

  // Get all PUDO lockers
  app.get("/api/pudo-lockers", withStandardResponse(async (req: Request, res: Response) => {
    const lockers = await storage.getAllPudoLockers();
    return lockers;
  }));

  // Search PUDO lockers with filters
  app.get("/api/pudo-lockers/search", withStandardResponse(async (req: Request, res: Response) => {
    const { q: query, province, city } = req.query as { q?: string; province?: string; city?: string };
    
    if (!query && !province && !city) {
      throw new BadRequestError("At least one search parameter (q, province, or city) is required");
    }
    
    const lockers = await storage.searchPudoLockers(query || "", province, city);
    return lockers;
  }));

  // Get PUDO lockers by location (province/city)
  app.get("/api/pudo-lockers/location", withStandardResponse(async (req: Request, res: Response) => {
    const { province, city } = req.query as { province?: string; city?: string };
    
    if (!province) {
      throw new BadRequestError("Province parameter is required");
    }
    
    const lockers = await storage.getPudoLockersByLocation(province, city);
    return lockers;
  }));

  // Get specific PUDO locker by code
  app.get("/api/pudo-lockers/code/:code", withStandardResponse(async (req: Request, res: Response) => {
    const { code } = req.params;
    const locker = await storage.getPudoLockerByCode(code);
    
    if (!locker) {
      throw new NotFoundError("PUDO locker not found");
    }
    
    return locker;
  }));

  // Get specific PUDO locker by ID
  app.get("/api/pudo-lockers/:id", withStandardResponse(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new BadRequestError("Invalid locker ID");
    }
    
    const locker = await storage.getPudoLockerById(id);
    
    if (!locker) {
      throw new NotFoundError("PUDO locker not found");
    }
    
    return locker;
  }));

  // Update user's preferred locker (authenticated users only)
  app.post("/api/user/preferred-locker", 
    isAuthenticated,
    validateRequest({
      body: z.object({
        lockerId: z.number().int().positive(),
        lockerCode: z.string().min(1)
      })
    }),
    withStandardResponse(async (req: Request, res: Response) => {
      const userId = req.user!.id;
      const { lockerId, lockerCode } = req.body;
      
      // Verify the locker exists
      const locker = await storage.getPudoLockerById(lockerId);
      if (!locker) {
        throw new NotFoundError("PUDO locker not found");
      }
      
      const success = await storage.updateUserPreferredLocker(userId, lockerId, lockerCode);
      
      if (!success) {
        throw new Error("Failed to update preferred locker");
      }
      
      return { message: "Preferred locker updated successfully", locker };
    })
  );

  // Get user's preferred locker (authenticated users only)
  app.get("/api/user/preferred-locker", 
    isAuthenticated,
    withStandardResponse(async (req: Request, res: Response) => {
      const userId = req.user!.id;
      const locker = await storage.getUserPreferredLocker(userId);
      return locker || null;
    })
  );

  // Download invoice (customer access)
  app.get("/api/order/:orderNumber/invoice", 
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const orderNumber = req.params.orderNumber;
        const userId = req.user!.id;

        // Extract order ID from order number format (HTC-{id}-{date})
        const orderIdMatch = orderNumber.match(/^HTC-(\d+)-/);
        if (!orderIdMatch) {
          return sendError(res, "Invalid order number format", 400);
        }

        const orderId = parseInt(orderIdMatch[1], 10);
        
        // Get order by ID with items (same method as admin endpoint)
        const order = await storage.getOrderById(orderId, userId);
        
        if (!order) {
          return sendError(res, "Order not found", 404);
        }

        // Verify the order belongs to the current user (double check)
        if (order.userId !== userId) {
          return sendError(res, "Access denied", 403);
        }

        if (!order.invoicePath) {
          return sendError(res, "No invoice available for this order", 404);
        }

        try {
          // Get the PDF file from object storage using the correct method
          const { data: fileData, contentType } = await objectStoreAdapter.getFileAsBuffer(order.invoicePath);
          
          if (!fileData) {
            return sendError(res, "Invoice file not found", 404);
          }

          // Set proper headers for PDF download
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="Invoice-${order.orderNumber}.pdf"`);
          res.setHeader('Cache-Control', 'private, max-age=3600');
          res.setHeader('Content-Length', fileData.length.toString());
          
          // Send the PDF buffer
          res.send(fileData);
          
          logger.info("Customer downloaded invoice", {
            orderId: order.id,
            orderNumber: order.orderNumber,
            invoicePath: order.invoicePath,
            userId
          });
        } catch (fileError) {
          logger.error("Error retrieving customer invoice file", {
            error: fileError,
            orderNumber,
            invoicePath: order.invoicePath,
            userId
          });
          return sendError(res, "Failed to retrieve invoice file", 500);
        }
      } catch (error) {
        logger.error("Error downloading customer invoice", { 
          error, 
          orderNumber: req.params.orderNumber,
          userId: req.user?.id 
        });
        return sendError(res, "Failed to download invoice", 500);
      }
    })
  );

  // Add SEO API routes directly here to avoid frontend routing conflicts
  app.get('/api/seo/debug-urls', async (req: Request, res: Response) => {
    try {
      console.log('[DEBUG] Starting URL debugging...');
      
      // Direct database query
      const rawResults = await db.select({
        id: products.id,
        name: products.name,
        image_url: sql`${products.imageUrl}`.as('image_url')
      })
      .from(products)
      .where(and(
        eq(products.isActive, true),
        eq(products.supplierAvailable, true)
      ))
      .limit(3);
      
      console.log('[DEBUG] Raw DB results:', JSON.stringify(rawResults, null, 2));
      
      // Drizzle query
      const drizzleResults = await db
        .select({
          id: products.id,
          name: products.name,
          imageUrl: products.imageUrl
        })
        .from(products)
        .where(and(
          eq(products.isActive, true),
          eq(products.supplierAvailable, true)
        ))
        .limit(3);
      
      console.log('[DEBUG] Drizzle results:', JSON.stringify(drizzleResults, null, 2));
      
      res.json({
        success: true,
        data: {
          rawQuery: rawResults,
          drizzleQuery: drizzleResults,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error debugging URLs:', error);
      res.status(500).json({ success: false, error: 'Failed to debug URLs' });
    }
  });

  // Sales Rep Commission System Routes
  app.get('/api/sales-reps', asyncHandler(async (req, res) => {
    try {
      const reps = await storage.getAllSalesReps();
      return sendSuccess(res, reps);
    } catch (error) {
      return sendError(res, error instanceof Error ? error.message : 'Failed to get sales reps', 500);
    }
  }));

  app.post('/api/sales-reps', asyncHandler(async (req, res) => {
    try {
      const repData = req.body;
      const newRep = await storage.createSalesRep(repData);
      return sendSuccess(res, newRep, 201);
    } catch (error) {
      return sendError(res, error instanceof Error ? error.message : 'Failed to create sales rep', 500);
    }
  }));

  app.put('/api/sales-reps/:id', asyncHandler(async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const repData = req.body;
      const updatedRep = await storage.updateSalesRep(id, repData);
      
      if (!updatedRep) {
        return sendError(res, 'Sales rep not found', 404);
      }
      
      return sendSuccess(res, updatedRep);
    } catch (error) {
      return sendError(res, error instanceof Error ? error.message : 'Failed to update sales rep', 500);
    }
  }));

  app.get('/api/sales-reps/:id/commissions', asyncHandler(async (req, res) => {
    try {
      const repId = parseInt(req.params.id);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;
      
      const commissions = await storage.getSalesRepCommissions(repId, limit, offset);
      return sendSuccess(res, commissions);
    } catch (error) {
      return sendError(res, error instanceof Error ? error.message : 'Failed to get rep commissions', 500);
    }
  }));

  app.get('/api/sales-reps/:id/earnings', asyncHandler(async (req, res) => {
    try {
      const repId = parseInt(req.params.id);
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      const earnings = await storage.calculateRepEarnings(repId, startDate, endDate);
      return sendSuccess(res, earnings);
    } catch (error) {
      return sendError(res, error instanceof Error ? error.message : 'Failed to calculate rep earnings', 500);
    }
  }));

  app.get('/api/sales-reps/:id/payments', asyncHandler(async (req, res) => {
    try {
      const repId = parseInt(req.params.id);
      const payments = await storage.getRepPayments(repId);
      return sendSuccess(res, payments);
    } catch (error) {
      return sendError(res, error instanceof Error ? error.message : 'Failed to get rep payments', 500);
    }
  }));

  app.post('/api/sales-reps/:id/payments', asyncHandler(async (req, res) => {
    try {
      const repId = parseInt(req.params.id);
      const paymentData = { ...req.body, repId };
      const newPayment = await storage.createRepPayment(paymentData);
      return sendSuccess(res, newPayment, 201);
    } catch (error) {
      return sendError(res, error instanceof Error ? error.message : 'Failed to create rep payment', 500);
    }
  }));

  // Admin system settings endpoints - protected routes
  app.get('/api/admin/settings/:key', isAdmin, asyncHandler(async (req, res) => {
    try {
      const { key } = req.params;
      
      let setting = await storage.getSystemSetting(key);
      
      // If setting doesn't exist, create it with default value
      if (!setting) {
        const defaultValue = key === 'marketingBannerConfig' 
          ? JSON.stringify({ enabled: false, title: '', subtitle: '', ctaText: '', ctaLink: '' })
          : JSON.stringify({ enabled: false, products: [] });
        
        setting = await storage.setSystemSetting(key, defaultValue);
      }
      
      return sendSuccess(res, setting);
    } catch (error) {
      logger.error('Error fetching admin system setting:', error);
      return sendError(res, 'Failed to fetch system setting', 500);
    }
  }));

  app.put('/api/admin/settings/:key', isAdmin, asyncHandler(async (req, res) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      
      if (!value) {
        return sendError(res, 'Setting value is required', 400);
      }
      
      const setting = await storage.setSystemSetting(key, value);
      return sendSuccess(res, setting);
    } catch (error) {
      logger.error('Error updating admin system setting:', error);
      return sendError(res, 'Failed to update system setting', 500);
    }
  }));

  // Public system settings endpoint for customer-facing features
  const publicSettings = ['marketingBannerConfig', 'featuredCarouselProducts'];
  app.get('/api/settings/:key', asyncHandler(async (req, res) => {
    try {
      const { key } = req.params;
      
      // Only allow access to public settings
      if (!publicSettings.includes(key)) {
        return sendError(res, 'Setting not found or not publicly accessible', 404);
      }
      
      let setting = await storage.getSystemSetting(key);
      
      // If setting doesn't exist, create it with default value
      if (!setting) {
        const defaultValue = key === 'marketingBannerConfig' 
          ? JSON.stringify({ enabled: false, title: '', subtitle: '', ctaText: '', ctaLink: '' })
          : JSON.stringify({ enabled: false, products: [] });
        
        setting = await storage.setSystemSetting(key, defaultValue);
      }
      
      return sendSuccess(res, setting);
    } catch (error) {
      logger.error('Error fetching public system setting:', error);
      return sendError(res, 'Failed to fetch system setting', 500);
    }
  }));

  // Validate rep code during registration
  app.get('/api/validate-rep-code/:code', asyncHandler(async (req, res) => {
    try {
      const repCode = req.params.code;
      const rep = await storage.getSalesRepByCode(repCode);
      
      if (rep) {
        return sendSuccess(res, { valid: true, repName: `${rep.firstName} ${rep.lastName}` });
      } else {
        return sendSuccess(res, { valid: false });
      }
    } catch (error) {
      return sendError(res, error instanceof Error ? error.message : 'Failed to validate rep code', 500);
    }
  }));

  const httpServer = createServer(app);
  return httpServer;
}
