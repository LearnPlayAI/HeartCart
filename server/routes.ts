import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { sendError } from "./api-response";
import { storage } from "./storage";
import { ZodError } from "zod";
import { logger } from "./logger";
import { db } from "./db";
import { desc, eq } from "drizzle-orm";
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
  insertProductImageSchema,
  insertPricingSchema,
  insertSupplierSchema,
  insertCatalogSchema
} from "@shared/schema";
import { objectStore, STORAGE_FOLDERS } from "./object-store";
import { setupAuth } from "./auth";
import { isAuthenticated, isAdmin } from "./auth-middleware";
import multer from "multer";
import path from "path";
import fs from "fs";
import fileRoutes from "./file-routes";
import uploadHandlers from "./upload-handlers";
import fileBrowserRoutes from "./file-browser-routes";
import registerAttributeRoutes from "./attribute-routes";
import registerProductAttributeRoutes from "./attribute-routes-product";
import registerProductDraftRoutes from "./product-draft-routes";
// Removed attributeDiscountRoutes import as part of centralized attribute system
import pricingRoutes from "./pricing-routes";
import batchUploadRoutes from "./batch-upload-routes";
import aiApiRoutes from "./routes/ai-api";
import { orderRoutes } from "./order-routes";
import { registerAuthTestRoutes } from "./auth-test-routes";
import { registerDatabaseTestRoutes } from "./database-test-routes";
import { registerApiTestRoutes } from "./api-test-routes";
import { registerStorageTestRoutes } from "./storage-test-routes";
import { registerFileManagerTestRoutes } from "./file-manager-test-routes";
import { validateRequest, idSchema } from './validation-middleware';
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
import { sendSuccess, sendError } from './api-response';
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
        console.log('Multer file accepted:', file.fieldname, file.originalname);
        cb(null, true);
      } else {
        console.log('Multer file rejected (not an image):', file.fieldname, file.originalname);
        cb(null, false);
      }
    }
  });
  
  // Set up authentication with our new auth module
  setupAuth(app);
  
  // Apply response wrapper middleware to standardize API responses
  app.use(responseWrapperMiddleware);
  
  // Register order routes (after middleware for proper error handling)
  app.use("/api/orders", orderRoutes);
  
  // Register authentication testing routes
  registerAuthTestRoutes(app);
  
  // Register database testing routes
  registerDatabaseTestRoutes(app);
  
  // Register API testing routes
  registerApiTestRoutes(app);
  
  // Register Storage testing routes
  registerStorageTestRoutes(app);
  
  // Register File Manager testing routes
  registerFileManagerTestRoutes(app);
  
  // Mount file routes for serving files from Object Storage
  app.use('/api/files', fileRoutes);
  
  // Mount upload handler routes
  app.use('/api/upload', uploadHandlers);
  
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
        
        logger.debug(`Getting attributes for category ${categoryId}`);
        
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
        
        logger.debug(`Getting required attributes for products in category ${categoryId}`);
        
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
    asyncHandler(async (req: Request, res: Response) => {
      const categoryId = Number(req.params.id);
      const { displayOrder } = req.body;
      
      // Update the category display order
      const category = await storage.updateCategoryDisplayOrder(categoryId, displayOrder);
      
      if (!category) {
        throw new NotFoundError(`Category with ID ${categoryId} not found`, 'category');
      }
      
      res.json(category);
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

  app.get("/api/products", 
    validateRequest({ query: productsQuerySchema }),
    withStandardResponse(async (req: Request, res: Response) => {
      const { limit, offset, category: categoryId, search } = req.query;
      
      const user = req.user as any;
      const isAdmin = user && user.role === 'admin';
      
      const options = { 
        includeInactive: isAdmin, 
        includeCategoryInactive: isAdmin 
      };
      
      // Get both products and total count
      const [products, totalCount] = await Promise.all([
        storage.getAllProducts(
          Number(limit), 
          Number(offset), 
          categoryId ? Number(categoryId) : undefined, 
          search as string | undefined, 
          options
        ),
        storage.getProductCount(
          categoryId ? Number(categoryId) : undefined, 
          search as string | undefined, 
          options
        )
      ]);
      
      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / Number(limit));
      
      return {
        data: products,
        meta: {
          total: totalCount,
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
        
        // Return standardized response format
        res.json({
          success: true,
          data: product
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
        
        // Return standardized response format
        res.json({
          success: true,
          data: product
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
        // Delete the product and all associated data
        const success = await storage.deleteProduct(productId);
        
        res.json({ 
          success, 
          message: `Product "${existingProduct.name}" was successfully deleted along with all associated images and data.` 
        });
      } catch (error) {
        // Since we're using asyncHandler, this will be caught and handled properly
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
    limit: z.coerce.number().int().nonnegative().default(10)
  });

  app.get(
    "/api/featured-products",
    validateRequest({
      query: featuredProductsQuerySchema
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
        const products = await storage.getFeaturedProducts(Number(limit), options);
        
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
        logger.error('Error fetching featured products', { 
          error,
          limit: Number(limit)
        });
        
        throw new AppError(
          "Failed to fetch featured products. Please try again later.",
          ErrorCode.INTERNAL_SERVER_ERROR,
          500
        );
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
    offset: z.coerce.number().int().nonnegative().default(0)
  }).passthrough(); // Allow additional parameters

  app.get(
    "/api/search",
    validateRequest({
      query: searchQuerySchema
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const { q: query, limit, offset } = req.query;
      
      const user = req.user as any;
      const isAdmin = user && user.role === 'admin';
      
      const options = { 
        includeInactive: isAdmin, 
        includeCategoryInactive: isAdmin 
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
    console.log('Temp image upload - Request headers:', req.headers);
    console.log('Temp image upload - Content-Type:', req.headers['content-type']);
    
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
      
      console.log('Received files:', req.files);
      
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
          const { url, objectKey } = await objectStore.uploadTempFile(
            optimizedBuffer,
            expectedFileName.replace(fileExt, '.webp'), // Use WebP extension
            productId, // Pass product ID to create correct folder structure
            contentType
          );
          
          // Add a delay after upload to ensure Replit Object Storage has propagated the file
          // This is crucial for preventing issues with file not being available immediately
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Verify the file exists in Object Storage before proceeding
          const exists = await objectStore.exists(objectKey);
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
      const sourceExists = await objectStore.exists(sourceKey);
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
        const { data: imageBuffer } = await objectStore.getFileAsBuffer(sourceKey);
        
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
            
            await objectStore.uploadFromBuffer(newOptimizedKey, processedBuffer, { contentType: 'image/webp' });
            
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
      const result = await objectStore.moveFromTemp(optimizedKey, parseInt(productId));
      
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
          await objectStore.uploadFromBuffer(objectKey, buffer, { contentType });
          
          // Generate public URL
          const publicUrl = objectStore.getPublicUrl(objectKey);
          
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
        await objectStore.uploadFromBuffer(objectKey, buffer, { contentType });
        
        // Generate public URL
        const publicUrl = objectStore.getPublicUrl(objectKey);
        
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
        const models = getAvailableAiModels();
        
        // Get current model
        const currentModel = await getCurrentAiModelSetting();
        
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
        const availableModels = getAvailableAiModels();
        if (!availableModels.includes(modelName)) {
          throw new BadRequestError(
            `Model '${modelName}' is not available. Available models: ${availableModels.join(', ')}`,
            'modelName'
          );
        }
        
        // Update AI model
        const success = await updateAiModel(modelName);
        
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

  app.post(
    "/api/cart", 
    isAuthenticated, 
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
        // Check if product exists with comprehensive error handling
        const product = await storage.getProductById(productId);
        if (!product) {
          logger.warn(`Attempted to add non-existent product to cart`, {
            productId,
            userId: user.id,
            requestedQuantity: quantity
          });
          throw new NotFoundError(`Product with ID ${productId} not found`, "product");
        }
        
        // Check if product is active with detailed error context
        if (!product.isActive) {
          logger.warn(`Attempted to add inactive product to cart`, {
            productId,
            userId: user.id,
            productName: product.name,
            requestedQuantity: quantity
          });
          throw new BadRequestError(`Cannot add inactive product "${product.name}" to cart`);
        }
        
        // Verify product availability - TeeMeYou doesn't track stock levels, but in future:
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
        
        // Verify stock availability - TeeMeYou doesn't track stock levels, but log for future implementation
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
        
        // Handle both array and single value attributes
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
        } else {
          // Single value attribute
          if (currentSelections[attributeName] !== attributeValue) {
            throw new BadRequestError(`Attribute value "${attributeValue}" does not match current value`);
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
    asyncHandler(async (req: Request, res: Response) => {
      const orderId = Number(req.params.id);
      const { status } = req.body;
      
      // Validate status
      const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: { message: "Invalid status. Must be one of: " + validStatuses.join(', ') }
        });
      }
      
      try {
        // Update the order status directly using Drizzle
        const [updatedOrder] = await db
          .update(orders)
          .set({ 
            status, 
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
        
        logger.info('Order status updated', { 
          orderId, 
          newStatus: status 
        });
        
        return res.json({
          success: true,
          data: updatedOrder,
          message: `Order status updated to ${status}`
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
      
      // Check if supplier has associated catalogs
      const supplierCatalogs = await storage.getCatalogsBySupplierId(id, false); // Get all catalogs, including inactive
      
      if (supplierCatalogs.length > 0) {
        // Check if any products exist in any of the catalogs
        let totalProducts = 0;
        for (const catalog of supplierCatalogs) {
          const productCount = await storage.getProductCountByCatalogId(catalog.id);
          totalProducts += productCount;
        }
        
        if (totalProducts > 0) {
          throw new AppError(
            `Cannot delete supplier "${supplier.name}" because it has ${supplierCatalogs.length} catalogs with ${totalProducts} products. Delete all products and catalogs first, or deactivate the supplier instead.`,
            ErrorCode.DEPENDENT_ENTITIES_EXIST,
            409
          );
        }
        
        throw new AppError(
          `Cannot delete supplier "${supplier.name}" because it has ${supplierCatalogs.length} catalogs associated with it. Delete all catalogs first, or deactivate the supplier instead.`,
          ErrorCode.DEPENDENT_ENTITIES_EXIST,
          409
        );
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
        message: `Supplier "${supplier.name}" deleted successfully`
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
      
      console.log('DEBUG: Request body received:', req.body);
      console.log('DEBUG: About to parse with insertCatalogSchema');
      
      const catalogData = insertCatalogSchema.parse(req.body);
      console.log('DEBUG: Parsed catalog data:', catalogData);
      
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
      logger.debug(`Serving file from object storage: ${objectKey}`);
      
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
      const fileExists = await objectStore.exists(objectKey);
      if (!fileExists) {
        throw new NotFoundError(`File not found: ${objectKey}`, "file");
      }
      
      const MAX_RETRIES = 3;
      let lastError: any = null;
      
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          // Use our buffer-based method for reliable file handling
          logger.debug(`Retrieving file ${objectKey} using buffer-based approach (attempt ${attempt}/${MAX_RETRIES})`);
          
          // Apply a small delay if this is a temp file to prevent race conditions
          if (objectKey.includes('/temp/')) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          // Get the file data and content type in one operation
          const { data, contentType } = await objectStore.getFileAsBuffer(objectKey);
          
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
          
          logger.debug(`Successfully retrieved file ${objectKey}: ${data.length} bytes, type: ${contentType || 'unknown'}`);
          
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
            logger.debug(`Retrying file retrieval after ${delay}ms...`);
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
  // Product Drafts API Routes
  // ------------------------------------------------
  
  // Get all product drafts for the current user
  app.get("/api/product-drafts", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const catalogId = req.query.catalogId ? parseInt(req.query.catalogId as string) : undefined;
    
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
      handleApiError(error, res);
    }
  }));
  
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
  app.use('/api/ai', aiRouter);
  
  // Mount legacy AI API routes if they exist
  if (aiApiRoutes) {
    app.use('/api/ai-legacy', aiApiRoutes);
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

  const httpServer = createServer(app);
  return httpServer;
}
