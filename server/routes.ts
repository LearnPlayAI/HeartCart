import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ZodError } from "zod";
import { logger } from "./logger";
import { removeImageBackground, generateProductTags, analyzeProductImage, suggestPrice, getAvailableAiModels, getCurrentAiModelSetting, updateAiModel } from "./ai-service";
import { imageService, THUMBNAIL_SIZES } from "./image-service";
import { 
  insertCartItemSchema, 
  insertOrderSchema, 
  insertOrderItemSchema,
  insertCategorySchema,
  insertProductSchema,
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
import registerAttributeRoutes from "./attribute-routes";
import registerProductAttributeRoutes from "./attribute-routes-product";
import attributeDiscountRoutes from "./attribute-discount-routes";
import pricingRoutes from "./pricing-routes";
import batchUploadRoutes from "./batch-upload-routes";
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
  updateProductImageSchema
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

  // Authentication middleware (disabled)
  // This middleware has been disabled to allow open access
  const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    // Always proceed to the next middleware regardless of authentication status
    next();
  };

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
    
    const options = { includeInactive: isAdmin };
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

  // CATEGORY ATTRIBUTE ROUTES - Removed as part of attribute system redesign

  // Category attribute routes - removed as part of attribute system redesign

  // CATEGORY ATTRIBUTE OPTIONS ROUTES - Removed as part of attribute system redesign

  // PRODUCT ROUTES
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
      
      const products = await storage.getAllProducts(
        Number(limit), 
        Number(offset), 
        categoryId ? Number(categoryId) : undefined, 
        search as string | undefined, 
        options
      );
      return products;
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
    withStandardResponse(async (req: Request, res: Response) => {
      const { slug } = req.params;
      
      const user = req.user as any;
      const isAdmin = user && user.role === 'admin';
      
      const options = { 
        includeInactive: isAdmin, 
        includeCategoryInactive: isAdmin 
      };
      
      const product = await storage.getProductBySlug(slug, options);
      
      if (!product) {
        throw new NotFoundError(`Product with slug '${slug}' not found`, 'product');
      }
      
      return product;
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
        // Check if category exists
        const category = await storage.getCategoryById(categoryId);
        if (!category) {
          throw new NotFoundError(`Category with ID ${categoryId} not found`, 'category');
        }
        
        const products = await storage.getProductsByCategory(
          categoryId, 
          Number(limit), 
          Number(offset), 
          options
        );
        res.json(products);
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw error;
        }
        logger.error('Error fetching products by category', { error, categoryId });
        throw new AppError(
          "Failed to fetch products for the specified category",
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
    withStandardResponse(async (req: Request, res: Response) => {
      const id = Number(req.params.id);
      
      const user = req.user as any;
      const isAdmin = user && user.role === 'admin';
      
      const options = { 
        includeInactive: isAdmin, 
        includeCategoryInactive: isAdmin 
      };
      
      const product = await storage.getProductById(id, options);
      
      if (!product) {
        throw new NotFoundError(`Product with ID ${id} not found`, 'product');
      }
      
      return product;
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
      
      // Remove properties that shouldn't be updated directly
      const updateData = { ...req.body };
      delete updateData.id;
      delete updateData.createdAt;
      delete updateData.updatedAt;
      
      // Update the product
      const updatedProduct = await storage.updateProduct(productId, updateData);
      
      res.json(updatedProduct);
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
      const existingProduct = await storage.getProductById(productId);
      
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
    withStandardResponse(async (req: Request, res: Response) => {
      const { limit } = req.query;
      
      const user = req.user as any;
      const isAdmin = user && user.role === 'admin';
      
      const options = { 
        includeInactive: isAdmin, 
        includeCategoryInactive: isAdmin 
      };
      
      try {
        const products = await storage.getFeaturedProducts(Number(limit), options);
        return products;
      } catch (error) {
        logger.error('Error fetching featured products', { error });
        throw new AppError(
          "Failed to fetch featured products",
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
    withStandardResponse(async (req: Request, res: Response) => {
      const { limit } = req.query;
      
      const user = req.user as any;
      const isAdmin = user && user.role === 'admin';
      
      const options = { 
        includeInactive: isAdmin, 
        includeCategoryInactive: isAdmin 
      };
      
      try {
        const products = await storage.getFlashDeals(Number(limit), options);
        return products;
      } catch (error) {
        logger.error('Error fetching flash deals', { error });
        throw new AppError(
          "Failed to fetch flash deals",
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
  });

  app.get(
    "/api/search",
    validateRequest({
      query: searchQuerySchema
    }),
    withStandardResponse(async (req: Request, res: Response) => {
      const { q: query, limit, offset } = req.query;
      
      const user = req.user as any;
      const isAdmin = user && user.role === 'admin';
      
      const options = { 
        includeInactive: isAdmin, 
        includeCategoryInactive: isAdmin 
      };
      
      const products = await storage.searchProducts(query as string, Number(limit), Number(offset), options);
      return products;
    })
  );
  
  app.post(
    "/api/products", 
    isAuthenticated, 
    validateRequest({ body: createProductSchema }),
    withStandardResponse(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      // Check if user is admin
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can create products");
      }
      
      // Create the product with validated data
      const product = await storage.createProduct(req.body);
      
      res.status(201);
      return product;
    })
  );

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
        
        // Return success response with validation results and processed files
        return res.status(200).json({
          success: true,
          files: processedFiles,
          validation: {
            totalFiles: req.files.length,
            validFiles: validFiles.length,
            invalidFiles: req.files.length - validFiles.length,
            results: validationResults
          }
        });
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
            sourceKey = newOptimizedKey;
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
      const result = await objectStore.moveFromTemp(sourceKey, parseInt(productId));
      
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
      console.error(`Error moving file ${sourceKey} to product ${productId}:`, error);
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
    withStandardResponse(async (req: Request, res: Response) => {
      const productId = Number(req.params.productId);
      const images = await storage.getProductImages(productId);
      return images;
    })
  );
  
  app.post(
    "/api/products/:productId/images", 
    isAuthenticated,
    validateRequest({
      params: productIdParamSchema,
      body: createProductImageSchema
    }),
    withStandardResponse(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can manage product images");
      }
      
      const productId = Number(req.params.productId);
    
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
        
        const image = await storage.createProductImage(imageData);
        res.status(201);
        return image;
      }
      
      // If the image has a base64 data URL, store it in object storage
      if (req.body.url && req.body.url.startsWith('data:')) {
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
        const image = await storage.createProductImage(imageData);
        res.status(201);
        return image;
      }
      
      // Handle case where we didn't get a base64 image URL or object key
      throw new BadRequestError(
        "Invalid image data. Please provide either a base64 data URL or an object key and URL."
      );
    }));
  
  app.put(
    "/api/products/images/:imageId", 
    isAuthenticated, 
    validateRequest({
      params: idParamSchema,
      body: updateProductImageSchema
    }),
    withStandardResponse(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can manage product images");
      }
      
      const imageId = Number(req.params.imageId);
      const updatedImage = await storage.updateProductImage(imageId, req.body);
      
      if (!updatedImage) {
        throw new NotFoundError("Image not found", "productImage");
      }
      
      return updatedImage;
    })
  );
  
  app.delete(
    "/api/products/images/:imageId", 
    isAuthenticated, 
    validateRequest({
      params: idParamSchema
    }),
    withStandardResponse(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can manage product images");
      }
      
      const imageId = Number(req.params.imageId);
      const result = await storage.deleteProductImage(imageId);
      
      if (!result) {
        throw new NotFoundError("Image not found", "productImage");
      }
      
      return { success: true };
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
    withStandardResponse(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can manage product images");
      }
      
      const productId = Number(req.params.productId);
      const imageId = Number(req.params.imageId);
      
      const result = await storage.setMainProductImage(productId, imageId);
      
      if (!result) {
        throw new NotFoundError("Failed to set main image. Image or product not found.", "productImage");
      }
      
      return { success: true };
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
          console.error('Multer error:', err);
          return res.status(400).json({
            success: false,
            error: {
              message: 'File upload error',
              code: 'UPLOAD_ERROR',
              details: err.message
            }
          });
        }
        
        next();
      });
    },
    async (req: Request, res: Response) => {
      const user = req.user as any;
      
      if (user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: {
            message: "Only administrators can validate images",
            code: "FORBIDDEN"
          }
        });
      }
      
      // Check if file was received
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'No image file provided',
            code: "VALIDATION_ERROR"
          }
        });
      }
      
      try {
        // Get the file buffer and validate it
        const fileBuffer = req.file.buffer;
        
        if (!fileBuffer || fileBuffer.length === 0) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'Empty file received',
              code: "VALIDATION_ERROR"
            }
          });
        }
        
        // Perform validation
        const validationResult = await imageService.validateImage(
          fileBuffer, 
          req.file.originalname
        );
        
        // Return validation result
        return res.status(200).json({
          success: true,
          filename: req.file.originalname,
          validation: validationResult
        });
      } catch (error: any) {
        console.error('Error validating image:', error);
        return res.status(500).json({
          success: false,
          error: {
            message: 'Error validating image',
            code: "SERVER_ERROR",
            details: error.message || 'Unknown error'
          }
        });
      }
    }
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
    withStandardResponse(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can use AI features");
      }
      
      const { imageUrl, productName, productDescription } = req.body;
      
      const tags = await generateProductTags(
        imageUrl, 
        productName, 
        productDescription
      );
      
      return { tags };
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
    withStandardResponse(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can use AI features");
      }
      
      const { imageUrl, productName } = req.body;
      
      const analysis = await analyzeProductImage(imageUrl, productName);
      return analysis;
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
    withStandardResponse(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can use AI features");
      }
      
      const { costPrice, productName, categoryName, categoryId } = req.body;
      
      // If categoryId is provided, check if it exists
      if (categoryId) {
        const category = await storage.getCategoryById(categoryId);
        if (!category) {
          throw new NotFoundError("Category not found", "category");
        }
      }
      
      const suggestion = await suggestPrice(costPrice, productName, categoryName, categoryId);
      return suggestion;
    })
  );
  
  // AI MODEL SETTINGS ROUTES
  
  // Get all available AI models
  app.get(
    "/api/admin/ai/models", 
    isAuthenticated, 
    withStandardResponse(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      // Check if user is admin
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can manage AI settings");
      }
      
      // Get all available models
      const models = getAvailableAiModels();
      
      // Get current model
      const currentModel = await getCurrentAiModelSetting();
      
      return {
        available: models,
        current: currentModel.modelName,
        isDefault: currentModel.isDefault
      };
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
    withStandardResponse(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      // Check if user is admin
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can manage AI settings");
      }
      
      const { modelName } = req.body;
      
      // Validate that the model name is in the available models list
      const availableModels = getAvailableAiModels();
      if (!availableModels.includes(modelName)) {
        throw new BadRequestError(`Model '${modelName}' is not available. Available models: ${availableModels.join(', ')}`);
      }
      
      const success = await updateAiModel(modelName);
      
      if (success) {
        return { 
          message: `Successfully updated AI model to: ${modelName}`
        };
      } else {
        // Still return a 200 but indicate that initialization failed in the response
        // The standard response wrapper will set success: true, but we include additional info
        return { 
          initialized: false,
          message: `Model ${modelName} was saved but could not be initialized. Will try again on next server restart.`
        };
      }
    })
  );
  
  // Get all AI settings
  app.get(
    "/api/admin/ai/settings", 
    isAuthenticated, 
    withStandardResponse(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      // Check if user is admin
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can manage AI settings");
      }
      
      const settings = await storage.getAllAiSettings();
      return settings;
    })
  );

  // CART ROUTES
  app.get(
    "/api/cart",
    withStandardResponse(async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        // For non-authenticated users, return empty cart
        return [];
      }
      const user = req.user as any;
      const cartItems = await storage.getCartItemsWithProducts(user.id);
      return cartItems;
    })
  );

  app.post(
    "/api/cart", 
    isAuthenticated, 
    validateRequest({
      body: z.object({
        productId: z.coerce.number().positive("Product ID is required"),
        quantity: z.coerce.number().int().positive("Quantity must be a positive integer"),
        attributeValues: z.array(z.object({
          attributeId: z.coerce.number().positive(),
          optionId: z.coerce.number().positive().optional(),
          textValue: z.string().optional(),
          numericValue: z.coerce.number().optional(),
          dateValue: z.coerce.date().optional()
        })).optional().default([])
      })
    }),
    withStandardResponse(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      // Check if product exists
      const product = await storage.getProductById(req.body.productId);
      if (!product) {
        throw new NotFoundError("Product not found", "product");
      }
      
      // Check if product is active
      if (!product.isActive) {
        throw new BadRequestError("Cannot add inactive product to cart");
      }
      
      // Add user ID to the cart item data
      const cartItemData = {
        ...req.body,
        userId: user.id,
      };
      
      const cartItem = await storage.addToCart(cartItemData);
      // Set status code to 201 Created
      res.status(201);
      return cartItem;
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
    withStandardResponse(async (req: Request, res: Response) => {
      const { id } = req.params;
      const { quantity } = req.body;
      
      // Check if cart item exists and belongs to the user
      const user = req.user as any;
      const cartItem = await storage.getCartItemById(Number(id));
      
      if (!cartItem) {
        throw new NotFoundError("Cart item not found", "cartItem");
      }
      
      if (cartItem.userId !== user.id) {
        throw new ForbiddenError("Cannot update cart item that doesn't belong to you");
      }
      
      // If quantity is 0, remove the item
      if (quantity === 0) {
        await storage.removeFromCart(Number(id));
        return { removed: true };
      }
      
      // Update the quantity
      const updatedItem = await storage.updateCartItemQuantity(Number(id), quantity);
      return { item: updatedItem };
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
    withStandardResponse(async (req: Request, res: Response) => {
      const { id } = req.params;
      
      // Check if cart item exists and belongs to the user
      const user = req.user as any;
      const cartItem = await storage.getCartItemById(Number(id));
      
      if (cartItem && cartItem.userId !== user.id) {
        throw new ForbiddenError("Cannot delete cart item that doesn't belong to you");
      }
      
      await storage.removeFromCart(Number(id));
      return { removed: true };
    })
  );

  app.delete(
    "/api/cart", 
    isAuthenticated, 
    withStandardResponse(async (req: Request, res: Response) => {
      const user = req.user as any;
      await storage.clearCart(user.id);
      return { cleared: true };
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
    withStandardResponse(async (req: Request, res: Response) => {
      const user = req.user as any;
      const { order, items } = req.body;
      
      // Validate that the cart is not empty
      const userCart = await storage.getCartItemsWithProducts(user.id);
      if (!userCart || userCart.length === 0) {
        throw new BadRequestError("Cannot create an order with an empty cart");
      }
      
      // Validate that all products in the order exist and are active
      for (const item of items) {
        const product = await storage.getProductById(item.productId);
        if (!product) {
          throw new NotFoundError(`Product with ID ${item.productId} not found`, "product");
        }
        
        if (!product.isActive) {
          throw new BadRequestError(`Product "${product.name}" is no longer available`);
        }
      }
      
      // Create the order with the user ID
      const orderData = {
        ...order,
        userId: user.id,
        status: "pending" // Default status for new orders
      };
      
      const newOrder = await storage.createOrder(orderData, items);
      
      // Clear the user's cart after successful order creation
      await storage.clearCart(user.id);
      
      // Set status code to 201 Created
      res.status(201);
      return newOrder;
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
    withStandardResponse(async (req: Request, res: Response) => {
      const user = req.user as any;
      const { status, limit = 20, offset = 0 } = req.query;
      
      const orders = await storage.getOrdersByUser(user.id, status as string | undefined);
      return orders;
    })
  );

  // Admin-only route to get all orders (must be above the /api/orders/:id route due to route matching order)
  app.get(
    "/api/admin/orders", 
    isAuthenticated, 
    validateRequest({
      query: z.object({
        status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).optional(),
        userId: z.coerce.number().positive().optional(),
        limit: z.coerce.number().int().positive().optional().default(20),
        offset: z.coerce.number().int().min(0).optional().default(0)
      }).optional()
    }),
    withStandardResponse(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      // Check if user is admin
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can access all orders");
      }
      
      const { status, userId, limit = 20, offset = 0 } = req.query;
      
      // Get all orders with optional filtering
      const orders = await storage.getOrdersByUser(
        userId ? Number(userId) : null, 
        status as string | undefined
      );
      
      return orders;
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
    withStandardResponse(async (req: Request, res: Response) => {
      const { id } = req.params;
      const order = await storage.getOrderById(Number(id));
      
      if (!order) {
        throw new NotFoundError("Order not found", "order");
      }
      
      // Check if the order belongs to the authenticated user or user is admin
      const user = req.user as any;
      if (order.userId !== user.id && user.role !== 'admin') {
        throw new ForbiddenError("You are not authorized to view this order");
      }
      
      return order;
    })
  );
  
  // Update order status (admin-only)
  app.patch(
    "/api/orders/:id/status", 
    isAuthenticated, 
    validateRequest({
      params: z.object({
        id: z.coerce.number().positive("Order ID is required")
      }),
      body: z.object({
        status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled'], {
          errorMap: () => ({ message: "Invalid status value. Must be one of: pending, processing, shipped, delivered, cancelled" })
        })
      })
    }),
    withStandardResponse(async (req: Request, res: Response) => {
      const { id } = req.params;
      const { status } = req.body;
      
      // Check if user is admin
      const user = req.user as any;
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can update order status");
      }
      
      // Get the order
      const order = await storage.getOrderById(Number(id));
      if (!order) {
        throw new NotFoundError("Order not found", "order");
      }
      
      // Update the status
      const updatedOrder = await storage.updateOrderStatus(Number(id), status);
      if (!updatedOrder) {
        throw new Error("Failed to update order status");
      }
      
      return updatedOrder;
    })
  );

  // AI RECOMMENDATION ROUTES - Available to all users (logged in or not)
  app.get(
    "/api/recommendations",
    validateRequest({
      query: z.object({
        limit: z.coerce.number().int().positive().optional().default(10),
        categoryId: z.coerce.number().positive().optional()
      }).optional()
    }),
    withStandardResponse(async (req: Request, res: Response) => {
      const { limit = 10, categoryId } = req.query;
      
      // Check if user is authenticated
      const user = req.isAuthenticated() ? req.user as any : null;
      
      if (user) {
        // Get personalized recommendations for authenticated users
        const recommendations = await storage.getRecommendationsForUser(user.id);
        
        if (recommendations && recommendations.productIds && recommendations.productIds.length > 0) {
          // Get product details for recommended products
          const products = [];
          for (const productId of recommendations.productIds) {
            const product = await storage.getProductById(productId);
            if (product && product.isActive) {
              products.push(product);
              
              // Limit the number of products returned
              if (products.length >= limit) {
                break;
              }
            }
          }
          
          // If we have recommendations, return them
          if (products.length > 0) {
            return {
              products,
              reason: recommendations.reason,
              timestamp: recommendations.createdAt
            };
          }
        }
      }
      
      // For non-authenticated users, users without recommendations,
      // or if filtering by category
      // Return popular/featured products as a fallback
      const products = await storage.getFeaturedProducts(
        limit as number, 
        categoryId ? (categoryId as number) : undefined
      );
      
      return {
        products,
        reason: categoryId 
          ? `Popular products in this category`
          : "Popular products you might like",
        timestamp: new Date()
      };
    })
  );

  // PRICING MANAGEMENT ROUTES - For admin use only
  
  // Get all pricing settings
  app.get(
    "/api/admin/pricing", 
    isAuthenticated, 
    withStandardResponse(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      // Check if user is admin
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can access pricing settings");
      }
      
      const pricingSettings = await storage.getAllPricingSettings();
      return pricingSettings;
    })
  );
  
  // Get default markup percentage
  app.get(
    "/api/pricing/default-markup", 
    withStandardResponse(async (req: Request, res: Response) => {
      const defaultMarkup = await storage.getDefaultMarkupPercentage();
      return { markupPercentage: defaultMarkup, isSet: defaultMarkup !== null };
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
    withStandardResponse(async (req: Request, res: Response) => {
      const { categoryId } = req.params;
      
      // Validate that the category exists
      const category = await storage.getCategoryById(Number(categoryId));
      if (!category) {
        throw new NotFoundError("Category not found", "category");
      }
      
      const pricing = await storage.getPricingByCategoryId(Number(categoryId));
      
      if (!pricing) {
        const defaultMarkup = await storage.getDefaultMarkupPercentage();
        return { 
          categoryId,
          markupPercentage: defaultMarkup,
          description: defaultMarkup === null 
            ? "No pricing rule set for this category or globally" 
            : "Default pricing (category-specific pricing not set)"
        };
      }
      
      return pricing;
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
    withStandardResponse(async (req: Request, res: Response) => {
      const user = req.user as any;
      
      // Check if user is admin
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can manage pricing settings");
      }
      
      // Check if the category exists
      if (req.body.categoryId !== 0) { // 0 is allowed for default/global pricing
        const category = await storage.getCategoryById(req.body.categoryId);
        if (!category) {
          throw new NotFoundError("Category not found", "category");
        }
      }
      
      const result = await storage.createOrUpdatePricing(req.body);
      return result;
    }, 201)
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
    withStandardResponse(async (req: Request, res: Response) => {
      const user = req.user as any;
      const { id } = req.params;
      
      // Check if user is admin
      if (user.role !== 'admin') {
        throw new ForbiddenError("Only administrators can delete pricing settings");
      }
      
      // Check if the pricing setting exists
      const pricing = await storage.getPricingById(Number(id));
      if (!pricing) {
        throw new NotFoundError("Pricing setting not found", "pricing");
      }
      
      await storage.deletePricing(Number(id));
      return { success: true };
    })
  );

  // SUPPLIER ROUTES
  app.get("/api/suppliers", withStandardResponse(async (req: Request, res: Response) => {
    // For admin users, show all suppliers regardless of active status
    // For regular users, only show active suppliers
    const user = req.user as any;
    const isAdmin = user && user.role === 'admin';
    const activeOnly = isAdmin ? false : req.query.activeOnly !== 'false';
    
    const suppliers = await storage.getAllSuppliers(activeOnly);
    return suppliers;
  }));

  app.get("/api/suppliers/:id", withStandardResponse(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const supplier = await storage.getSupplierById(id);
    
    if (!supplier) {
      throw new NotFoundError("Supplier not found", "supplier");
    }
    
    return supplier;
  }));

  app.post("/api/suppliers", isAuthenticated, withStandardResponse(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    if (user.role !== 'admin') {
      throw new ForbiddenError("Only administrators can manage suppliers");
    }
    
    const supplierData = insertSupplierSchema.parse(req.body);
    const supplier = await storage.createSupplier(supplierData);
    
    return supplier;
  }, 201));

  app.put("/api/suppliers/:id", isAuthenticated, withStandardResponse(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    if (user.role !== 'admin') {
      throw new ForbiddenError("Only administrators can manage suppliers");
    }
    
    const id = parseInt(req.params.id);
    const supplierData = insertSupplierSchema.partial().parse(req.body);
    const supplier = await storage.updateSupplier(id, supplierData);
    
    if (!supplier) {
      throw new NotFoundError("Supplier not found", "supplier");
    }
    
    // If 'isActive' property was changed to inactive, cascade to catalogs and products
    if (supplierData.isActive === false) {
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
      
      console.log(`Supplier ${id} marked inactive: updated ${supplierCatalogs.length} catalogs and ${totalProductsUpdated} products to inactive`);
    }
    
    return supplier;
  }));

  app.delete("/api/suppliers/:id", isAuthenticated, withStandardResponse(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    if (user.role !== 'admin') {
      throw new ForbiddenError("Only administrators can manage suppliers");
    }
    
    const id = parseInt(req.params.id);
    const success = await storage.deleteSupplier(id);
    
    if (!success) {
      throw new NotFoundError("Supplier not found", "supplier");
    }
    
    return { message: "Supplier deleted successfully" };
  }));

  // CATALOG ROUTES
  app.get("/api/catalogs", withStandardResponse(async (req: Request, res: Response) => {
    // For admin users, show all catalogs regardless of active status
    // For regular users, only show active catalogs
    const user = req.user as any;
    const isAdmin = user && user.role === 'admin';
    const activeOnly = isAdmin ? false : req.query.activeOnly !== 'false';
    
    const catalogs = await storage.getAllCatalogs(activeOnly);
    return catalogs;
  }));

  app.get("/api/catalogs/:id", withStandardResponse(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const catalog = await storage.getCatalogById(id);
    
    if (!catalog) {
      throw new NotFoundError("Catalog not found", "catalog");
    }
    
    return catalog;
  }));

  app.get("/api/suppliers/:supplierId/catalogs", withStandardResponse(async (req: Request, res: Response) => {
    const supplierId = parseInt(req.params.supplierId);
    // For admin users, show all catalogs regardless of active status
    // For regular users, only show active catalogs
    const user = req.user as any;
    const isAdmin = user && user.role === 'admin';
    const activeOnly = isAdmin ? false : req.query.activeOnly !== 'false';
    
    const catalogs = await storage.getCatalogsBySupplierId(supplierId, activeOnly);
    return catalogs;
  }));

  app.post("/api/catalogs", isAuthenticated, withStandardResponse(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    if (user.role !== 'admin') {
      throw new ForbiddenError("Only administrators can manage catalogs");
    }
    
    const catalogData = insertCatalogSchema.parse(req.body);
    const catalog = await storage.createCatalog(catalogData);
    
    return catalog;
  }, 201));

  app.put("/api/catalogs/:id", isAuthenticated, withStandardResponse(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    if (user.role !== 'admin') {
      throw new ForbiddenError("Only administrators can manage catalogs");
    }
    
    const id = parseInt(req.params.id);
    const catalogData = insertCatalogSchema.partial().parse(req.body);
    const catalog = await storage.updateCatalog(id, catalogData);
    
    if (!catalog) {
      throw new NotFoundError("Catalog not found");
    }
    
    // If 'isActive' property was changed, update all products in this catalog
    if (catalogData.isActive !== undefined) {
      const updateResult = await storage.bulkUpdateCatalogProducts(id, { isActive: catalogData.isActive });
      console.log(`Updated isActive status for ${updateResult} products in catalog ${id} to ${catalogData.isActive}`);
    }
    
    return catalog;
  }));

  app.delete("/api/catalogs/:id", isAuthenticated, withStandardResponse(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    if (user.role !== 'admin') {
      throw new ForbiddenError("Only administrators can manage catalogs");
    }
    
    const id = parseInt(req.params.id);
    const success = await storage.deleteCatalog(id);
    
    if (!success) {
      throw new NotFoundError("Catalog not found");
    }
    
    // When a catalog is deleted (marked inactive), also mark all its products as inactive
    const productsUpdated = await storage.bulkUpdateCatalogProducts(id, { isActive: false });
    console.log(`Catalog ${id} deleted: marked ${productsUpdated} products as inactive`);
    
    return { success: true, message: "Catalog successfully deleted" };
  }));

  app.get("/api/catalogs/:catalogId/products", withStandardResponse(async (req: Request, res: Response) => {
    const catalogId = parseInt(req.params.catalogId);
    // For admin users, show all products regardless of active status
    // For regular users, only show active products
    const user = req.user as any;
    const isAdmin = user && user.role === 'admin';
    const activeOnly = isAdmin ? false : req.query.activeOnly !== 'false';
    
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    
    const products = await storage.getProductsByCatalogId(catalogId, activeOnly, limit, offset);
    return products;
  }));

  app.put("/api/catalogs/:catalogId/products/bulk", isAuthenticated, withStandardResponse(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    if (user.role !== 'admin') {
      throw new ForbiddenError("Only administrators can manage catalog products");
    }
    
    const catalogId = parseInt(req.params.catalogId);
    const updateData = insertProductSchema.partial().parse(req.body);
    
    const count = await storage.bulkUpdateCatalogProducts(catalogId, updateData);
    return { 
      message: `Updated ${count} products in catalog`,
      count 
    };
  }));

  // Quick edit product endpoint
  app.patch("/api/products/:id/quick-edit", isAuthenticated, withStandardResponse(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    if (user.role !== 'admin') {
      throw new ForbiddenError("Only administrators can update products");
    }
    
    const productId = parseInt(req.params.id);
    
    if (isNaN(productId)) {
      throw new BadRequestError("Invalid product ID");
    }
    
    const { name, price, listPrice, sku, stockQuantity, isActive } = req.body;
    
    // Validate required fields
    if (!name || name.trim().length < 3) {
      throw new ValidationError("Product name must be at least 3 characters");
    }
    
    if (typeof price !== 'number' || price <= 0) {
      throw new ValidationError("Price must be a positive number");
    }
    
    if (listPrice !== undefined && (typeof listPrice !== 'number' || listPrice < 0)) {
      throw new ValidationError("List price must be a non-negative number");
    }
    
    if (!sku || sku.trim() === '') {
      throw new ValidationError("SKU is required");
    }
    
    if (typeof stockQuantity !== 'number' || stockQuantity < 0 || !Number.isInteger(stockQuantity)) {
      throw new ValidationError("Stock quantity must be a non-negative integer");
    }
    
    if (typeof isActive !== 'boolean') {
      throw new ValidationError("Active status must be a boolean");
    }
    
    // Get the existing product to check if it exists
    const existingProduct = await storage.getProductById(productId);
    
    if (!existingProduct) {
      throw new NotFoundError("Product not found");
    }
    
    // Update the product
    const updatedProduct = await storage.updateProduct(productId, {
      name,
      price,
      listPrice: listPrice === undefined ? undefined : listPrice,
      sku,
      stockQuantity,
      isActive
    });
    
    return { 
      message: "Product updated successfully",
      product: updatedProduct
    };
  }));

  // PATCH endpoint to reorder products in a catalog
  app.patch("/api/catalogs/:id/products/reorder", isAuthenticated, withStandardResponse(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    if (user.role !== 'admin') {
      throw new ForbiddenError("Only administrators can reorder catalog products");
    }
    
    const catalogId = parseInt(req.params.id);
    const { productIds } = req.body;
    
    if (!Array.isArray(productIds)) {
      throw new ValidationError("productIds must be an array of product IDs");
    }
    
    // Update the display order for each product
    const result = await storage.updateProductDisplayOrder(catalogId, productIds);
    
    return { 
      message: `Updated display order for ${result.count} products`,
      count: result.count
    };
  }));
  
  // Object storage file access endpoint - using reliable buffer-based approach
  app.get('/api/files/:path(*)', async (req: Request, res: Response) => {
    try {
      const objectKey = req.params.path;
      console.log(`Serving file from object storage: ${objectKey}`);
      
      const MAX_RETRIES = 3;
      let lastError: any = null;
      
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          // First check if the file exists
          if (!(await objectStore.exists(objectKey))) {
            console.error(`File not found in object storage: ${objectKey}`);
            return res.status(404).send('File not found');
          }
          
          // Use our new buffer-based method for reliable file handling
          console.log(`Retrieving file ${objectKey} using buffer-based approach (attempt ${attempt}/${MAX_RETRIES})`);
          
          // Apply a small delay if this is a temp file to prevent race conditions
          if (objectKey.includes('/temp/')) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          // Get the file data and content type in one operation
          const { data, contentType } = await objectStore.getFileAsBuffer(objectKey);
          
          // Validate the buffer has actual content
          if (!data || data.length === 0) {
            throw new Error(`Retrieved empty buffer for ${objectKey}`);
          }
          
          // Set appropriate headers
          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Length', data.length);
          res.setHeader('Cache-Control', contentType.startsWith('image/') ? 'public, max-age=86400' : 'no-cache');
          
          console.log(`Successfully retrieved file ${objectKey}: ${data.length} bytes, type: ${contentType}`);
          
          // Send the buffer directly (more reliable than streaming)
          return res.end(data);
        } catch (downloadError: any) {
          lastError = downloadError;
          console.error(`Error retrieving file ${objectKey} (attempt ${attempt}/${MAX_RETRIES}):`, downloadError);
          
          if (attempt < MAX_RETRIES) {
            // Exponential backoff
            const delay = Math.pow(2, attempt) * 200;
            console.log(`Retrying file retrieval after ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            return res.status(500).send(`Error reading file: ${downloadError.message}`);
          }
        }
      }
      
      // If we get here, all retries failed
      return res.status(500).send(`Failed to retrieve file after ${MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`);
      
    } catch (error: any) {
      console.error('Error serving file:', error);
      return res.status(500).send(`Error serving file: ${error.message}`);
    }
  });

  // Register new attribute system routes
  registerAttributeRoutes(app);
  registerProductAttributeRoutes(app);
  
  // Register attribute discount rules routes
  app.use('/api', attributeDiscountRoutes);
  
  // Register pricing routes
  app.use('/api', pricingRoutes);
  
  // Register batch upload routes for mass product upload
  app.use('/api/batch-upload', batchUploadRoutes);

  const httpServer = createServer(app);
  return httpServer;
}