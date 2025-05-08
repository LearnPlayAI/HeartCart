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
import { validateRequest, idSchema } from './validation-middleware';
import { createCategorySchema, updateCategorySchema } from '@shared/validation-schemas';
import { 
  asyncHandler, 
  BadRequestError, 
  ForbiddenError, 
  NotFoundError, 
  ValidationError,
  AppError,
  ErrorCode
} from "./error-handler";
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
  app.get("/api/categories", handleErrors(async (req: Request, res: Response) => {
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
    res.json(categories);
  }));

  app.get("/api/categories/:slug", asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const user = req.user as any;
    const isAdmin = user && user.role === 'admin';
    
    const options = { includeInactive: isAdmin };
    const category = await storage.getCategoryBySlug(slug, options);
    
    if (!category) {
      throw new NotFoundError(`Category with slug '${slug}' not found`, 'category');
    }
    
    res.json(category);
  }));
  
  app.get("/api/categories/main/with-children", handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    const isAdmin = user && user.role === 'admin';
    
    const options = { includeInactive: isAdmin };
    const mainCategoriesWithChildren = await storage.getMainCategoriesWithChildren(options);
    res.json(mainCategoriesWithChildren);
  }));
  
  app.get("/api/categories/:id/with-children", asyncHandler(async (req: Request, res: Response) => {
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
    
    res.json(categoryWithChildren);
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
  app.get("/api/products", asyncHandler(async (req: Request, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    const categoryId = req.query.category ? parseInt(req.query.category as string) : undefined;
    const search = req.query.search as string | undefined;
    
    // Validate numeric parameters
    if (limit < 0 || isNaN(limit)) {
      throw new ValidationError("Limit must be a non-negative number");
    }
    
    if (offset < 0 || isNaN(offset)) {
      throw new ValidationError("Offset must be a non-negative number");
    }
    
    if (categoryId !== undefined && isNaN(categoryId)) {
      throw new BadRequestError("Category ID must be a number");
    }
    
    const user = req.user as any;
    const isAdmin = user && user.role === 'admin';
    
    const options = { 
      includeInactive: isAdmin, 
      includeCategoryInactive: isAdmin 
    };
    
    const products = await storage.getAllProducts(limit, offset, categoryId, search, options);
    res.json(products);
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
  app.get("/api/products/slug/:slug", asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;
    
    if (!slug || typeof slug !== 'string') {
      throw new BadRequestError("Valid product slug is required");
    }
    
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
    
    res.json(product);
  }));

  app.get("/api/products/category/:categoryId", asyncHandler(async (req: Request, res: Response) => {
    const categoryId = parseInt(req.params.categoryId);
    
    // Validate categoryId is a number
    if (isNaN(categoryId)) {
      throw new BadRequestError("Invalid category ID");
    }
    
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    
    // Validate numeric parameters
    if (limit < 0 || isNaN(limit)) {
      throw new ValidationError("Limit must be a non-negative number");
    }
    
    if (offset < 0 || isNaN(offset)) {
      throw new ValidationError("Offset must be a non-negative number");
    }
    
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
      
      const products = await storage.getProductsByCategory(categoryId, limit, offset, options);
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
  }));
  
  // Product attributes-for-category route - removed as part of attribute system redesign
  
  // Generic route for product by ID must come after more specific routes
  app.get("/api/products/:id", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    
    // Validate id is a number
    if (isNaN(id)) {
      throw new BadRequestError("Invalid product ID");
    }
    
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
    
    res.json(product);
  }));
  
  // Full update of a product
  app.put("/api/products/:id", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    // Check if user is admin
    if (user.role !== 'admin') {
      throw new ForbiddenError("Only administrators can update products");
    }
    
    const productId = parseInt(req.params.id);
    
    if (isNaN(productId)) {
      throw new BadRequestError("Invalid product ID");
    }
    
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
  }));
  
  // Delete a product endpoint
  app.delete("/api/products/:id", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    // Check if user is admin
    if (user.role !== 'admin') {
      throw new ForbiddenError("Only administrators can delete products");
    }
    
    const productId = parseInt(req.params.id);
    
    if (isNaN(productId)) {
      throw new BadRequestError("Invalid product ID");
    }
    
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
  }));

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
        const products = await storage.getFeaturedProducts(limit as number, options);
        res.json(products);
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
    asyncHandler(async (req: Request, res: Response) => {
      const { limit } = req.query;
      
      const user = req.user as any;
      const isAdmin = user && user.role === 'admin';
      
      const options = { 
        includeInactive: isAdmin, 
        includeCategoryInactive: isAdmin 
      };
      
      try {
        const products = await storage.getFlashDeals(limit as number, options);
        res.json(products);
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
    asyncHandler(async (req: Request, res: Response) => {
      const { q: query, limit, offset } = req.query;
      
      const user = req.user as any;
      const isAdmin = user && user.role === 'admin';
      
      const options = { 
        includeInactive: isAdmin, 
        includeCategoryInactive: isAdmin 
      };
      
      const products = await storage.searchProducts(query as string, limit as number, offset as number, options);
      res.json(products);
    })
  );
  
  app.post("/api/products", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    // Check if user is admin
    if (user.role !== 'admin') {
      throw new ForbiddenError("Only administrators can create products");
    }
    
    // Validate the product data
    try {
      const productData = insertProductSchema.parse(req.body);
      
      // Create the product
      const product = await storage.createProduct(productData);
      
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError("Invalid product data", error.flatten());
      }
      throw error;
    }
  }));

  // PRODUCT ATTRIBUTE ROUTES - Removed as part of attribute system redesign

  // PRODUCT ATTRIBUTE COMBINATIONS ROUTES - Removed as part of attribute system redesign
  
  // PRODUCT IMAGE ROUTES
  
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
        return res.status(403).json({ message: "Only administrators can upload images" });
      }
      
      console.log('Received files:', req.files);
      
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
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
        for (const file of req.files as Express.Multer.File[]) {
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
          
          // Upload to Object Storage with product ID in the path
          const { url, objectKey } = await objectStore.uploadTempFile(
            fileBuffer,
            expectedFileName,
            productId, // Pass product ID to create correct folder structure
            file.mimetype
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
        
        return res.status(200).json({
          success: true,
          files: processedFiles
        });
      } catch (error: any) {
        console.error('Error processing uploaded files:', error);
        return res.status(500).json({
          success: false,
          message: 'Error processing uploaded files',
          error: error.message || 'Unknown error'
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
  app.post('/api/products/images/move', isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can manage product images" });
    }
    
    const { sourceKey, productId } = req.body;
    
    if (!sourceKey || !productId) {
      return res.status(400).json({ 
        message: 'Source key and product ID are required',
        success: false
      });
    }
    
    try {
      console.log(`Moving file from temporary storage: ${sourceKey} to product ${productId}`);
      
      // Move file from temp to product folder
      const result = await objectStore.moveFromTemp(sourceKey, parseInt(productId));
      
      console.log(`Successfully moved file to ${result.objectKey}`);
      
      return res.json({
        success: true,
        url: result.url,
        objectKey: result.objectKey
      });
    } catch (error: any) {
      console.error(`Error moving file ${sourceKey} to product ${productId}:`, error);
      return res.status(500).json({
        message: error.message || 'Failed to move file from temporary storage',
        success: false
      });
    }
  }));
  
  app.get("/api/products/:productId/images", handleErrors(async (req: Request, res: Response) => {
    const productId = parseInt(req.params.productId);
    const images = await storage.getProductImages(productId);
    res.json(images);
  }));
  
  app.post("/api/products/:productId/images", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can manage product images" });
    }
    
    const productId = parseInt(req.params.productId);
    
    // If object key is already provided, just create the image record
    if (req.body.objectKey && req.body.url) {
      try {
        // Create product image record directly from provided URL and objectKey
        const imageData = {
          productId,
          url: req.body.url,
          objectKey: req.body.objectKey,
          isMain: req.body.isMain || false,
          alt: req.body.alt || '',
        };
        
        const image = await storage.createProductImage(imageData);
        return res.status(201).json(image);
      } catch (error: any) {
        console.error('Error creating image record:', error);
        return res.status(500).json({ 
          message: "Failed to create image record",
          error: error.message || 'Unknown error'
        });
      }
    }
    
    // If the image has a base64 data URL, store it in object storage
    if (req.body.url && req.body.url.startsWith('data:')) {
      try {
        // Extract the base64 data and content type
        const matches = req.body.url.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          return res.status(400).json({ message: "Invalid base64 image format" });
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
          alt: req.body.alt || '',
          bgRemovedUrl: publicUrl,
          bgRemovedObjectKey: objectKey
        };
        
        // Create the product image record
        const image = await storage.createProductImage(imageData);
        return res.status(201).json(image);
      } catch (error: any) {
        console.error('Error uploading image to object storage:', error);
        return res.status(500).json({ 
          message: "Failed to upload image",
          error: error.message || 'Unknown error'
        });
      }
    }
    
    // Handle case where we didn't get a base64 image URL
    return res.status(400).json({ 
      message: "Invalid image data", 
      details: "Please provide an image as a base64 data URL"
    });
  }));
  
  app.put("/api/products/images/:imageId", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can manage product images" });
    }
    
    const imageId = parseInt(req.params.imageId);
    const updatedImage = await storage.updateProductImage(imageId, req.body);
    
    if (!updatedImage) {
      return res.status(404).json({ message: "Image not found" });
    }
    
    res.json(updatedImage);
  }));
  
  app.delete("/api/products/images/:imageId", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can manage product images" });
    }
    
    const imageId = parseInt(req.params.imageId);
    const result = await storage.deleteProductImage(imageId);
    
    res.json({ success: result });
  }));
  
  app.put("/api/products/:productId/images/:imageId/main", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can manage product images" });
    }
    
    const productId = parseInt(req.params.productId);
    const imageId = parseInt(req.params.imageId);
    
    const result = await storage.setMainProductImage(productId, imageId);
    
    if (!result) {
      return res.status(404).json({ message: "Failed to set main image" });
    }
    
    res.json({ success: true });
  }));
  
  // IMAGE PROCESSING ROUTES
  
  // Optimize an image for web display
  app.post("/api/images/optimize", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can use image optimization" });
    }
    
    const { objectKey, quality, format } = req.body;
    
    if (!objectKey || typeof objectKey !== 'string') {
      return res.status(400).json({ message: "Object key is required" });
    }
    
    try {
      // Check if the image exists
      const exists = await objectStore.exists(objectKey);
      if (!exists) {
        return res.status(404).json({ message: "Image not found" });
      }
      
      // Optimize the image
      const result = await imageService.optimizeImage(
        objectKey,
        { 
          quality: quality ? parseInt(quality) : undefined,
          format: format as 'jpeg' | 'png' | 'webp' | 'avif' | undefined
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
    } catch (error: any) {
      console.error('Image optimization error:', error);
      res.status(500).json({ 
        message: "Failed to optimize image", 
        error: error.message || 'Unknown error'
      });
    }
  }));
  
  // Generate thumbnails for an image
  app.post("/api/images/thumbnails", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can generate thumbnails" });
    }
    
    const { objectKey, sizes } = req.body;
    
    if (!objectKey || typeof objectKey !== 'string') {
      return res.status(400).json({ message: "Object key is required" });
    }
    
    try {
      // Check if the image exists
      const exists = await objectStore.exists(objectKey);
      if (!exists) {
        return res.status(404).json({ message: "Image not found" });
      }
      
      // Generate thumbnails
      const thumbnails = await imageService.generateThumbnails(
        objectKey,
        sizes || undefined
      );
      
      res.json({
        success: true,
        thumbnails,
        originalKey: objectKey,
        count: Object.keys(thumbnails).length
      });
    } catch (error: any) {
      console.error('Thumbnail generation error:', error);
      res.status(500).json({ 
        message: "Failed to generate thumbnails", 
        error: error.message || 'Unknown error'
      });
    }
  }));
  
  // Resize an image with custom dimensions
  app.post("/api/images/resize", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can resize images" });
    }
    
    const { objectKey, width, height, fit, format, quality } = req.body;
    
    if (!objectKey || typeof objectKey !== 'string') {
      return res.status(400).json({ message: "Object key is required" });
    }
    
    if (!width && !height) {
      return res.status(400).json({ message: "At least one dimension (width or height) is required" });
    }
    
    try {
      // Check if the image exists
      const exists = await objectStore.exists(objectKey);
      if (!exists) {
        return res.status(404).json({ message: "Image not found" });
      }
      
      // Resize the image
      const result = await imageService.resizeImage(
        objectKey,
        {
          width: width ? parseInt(width) : undefined,
          height: height ? parseInt(height) : undefined,
          fit: fit as 'cover' | 'contain' | 'fill' | 'inside' | 'outside' | undefined,
          format: format as 'jpeg' | 'png' | 'webp' | 'avif' | undefined,
          quality: quality ? parseInt(quality) : undefined
        }
      );
      
      res.json({
        success: true,
        ...result,
        originalKey: objectKey
      });
    } catch (error: any) {
      console.error('Image resize error:', error);
      res.status(500).json({ 
        message: "Failed to resize image", 
        error: error.message || 'Unknown error'
      });
    }
  }));
  
  // AI SERVICE ROUTES
  
  // Remove image background using Gemini AI
  app.post("/api/ai/remove-background", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can use AI features" });
    }
    
    const { imageUrl } = req.body;
    
    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ message: "Image URL is required" });
    }
    
    try {
      const resultImageBase64 = await removeImageBackground(imageUrl);
      
      // If this is for a specific product image, update it
      if (req.body.productImageId) {
        const imageId = parseInt(req.body.productImageId);
        
        // Extract the base64 data and content type
        const matches = resultImageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          return res.status(400).json({ message: "Invalid base64 image format from AI service" });
        }
        
        const contentType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Generate a unique filename
        const timestamp = Date.now();
        const extension = contentType.split('/')[1] || 'png';
        const filename = `${timestamp}_${imageId}_bg_removed.${extension}`;
        const objectKey = `products/bg_removed/${filename}`;
        
        // Upload to object storage
        await objectStore.uploadFromBuffer(objectKey, buffer, { contentType });
        
        // Generate public URL
        const publicUrl = objectStore.getPublicUrl(objectKey);
        
        // Update the product image with background removed URL
        await storage.updateProductImage(imageId, {
          bgRemovedUrl: publicUrl,
          bgRemovedObjectKey: objectKey
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
    } catch (error: any) {
      console.error('Background removal error:', error);
      res.status(500).json({ 
        message: "Failed to remove background", 
        error: error.message || 'Unknown error'
      });
    }
  }));
  
  // Generate product tags using AI
  app.post("/api/ai/generate-tags", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can use AI features" });
    }
    
    const { imageUrl, productName, productDescription } = req.body;
    
    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ message: "Image URL is required" });
    }
    
    if (!productName || typeof productName !== 'string') {
      return res.status(400).json({ message: "Product name is required" });
    }
    
    try {
      const tags = await generateProductTags(
        imageUrl, 
        productName, 
        productDescription || ''
      );
      
      res.json({ success: true, tags });
    } catch (error: any) {
      console.error('Tag generation error:', error);
      res.status(500).json({ 
        message: "Failed to generate tags", 
        error: error.message || 'Unknown error'
      });
    }
  }));
  
  // Analyze product image for auto-fill suggestions
  app.post("/api/ai/analyze-product", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can use AI features" });
    }
    
    const { imageUrl, productName } = req.body;
    
    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ message: "Image URL is required" });
    }

    if (!productName || typeof productName !== 'string') {
      return res.status(400).json({ message: "Product name is required" });
    }
    
    try {
      const analysis = await analyzeProductImage(imageUrl, productName);
      res.json({ success: true, ...analysis });
    } catch (error: any) {
      console.error('Product analysis error:', error);
      res.status(500).json({ 
        message: "Failed to analyze product", 
        error: error.message || 'Unknown error'
      });
    }
  }));

  // AI price suggestion endpoint
  app.post("/api/ai/suggest-price", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can use AI features" });
    }
    
    const { costPrice, productName, categoryName, categoryId } = req.body;
    
    if (!costPrice || !productName) {
      return res.status(400).json({ message: "Cost price and product name are required" });
    }
    
    // Validate cost price is a number
    const costPriceNum = Number(costPrice);
    if (isNaN(costPriceNum)) {
      return res.status(400).json({ message: "Cost price must be a valid number" });
    }
    
    // Validate categoryId if provided
    let categoryIdNum: number | undefined = undefined;
    if (categoryId) {
      categoryIdNum = Number(categoryId);
      if (isNaN(categoryIdNum)) {
        return res.status(400).json({ message: "Category ID must be a valid number" });
      }
    }
    
    try {
      const suggestion = await suggestPrice(costPriceNum, productName, categoryName, categoryIdNum);
      res.json({ success: true, ...suggestion });
    } catch (error: any) {
      console.error('Price suggestion error:', error);
      res.status(500).json({ 
        message: "Failed to suggest price", 
        error: error.message || 'Unknown error'
      });
    }
  }));
  
  // AI MODEL SETTINGS ROUTES
  
  // Get all available AI models
  app.get("/api/admin/ai/models", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can manage AI settings" });
    }
    
    // Get all available models
    const models = getAvailableAiModels();
    
    // Get current model
    const currentModel = await getCurrentAiModelSetting();
    
    res.json({
      available: models,
      current: currentModel.modelName,
      isDefault: currentModel.isDefault
    });
  }));
  
  // Update current AI model
  app.post("/api/admin/ai/models", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can manage AI settings" });
    }
    
    const { modelName } = req.body;
    
    if (!modelName || typeof modelName !== 'string') {
      return res.status(400).json({ message: "Model name is required" });
    }
    
    try {
      const success = await updateAiModel(modelName);
      
      if (success) {
        res.json({ 
          success: true, 
          message: `Successfully updated AI model to: ${modelName}`
        });
      } else {
        res.status(200).json({ 
          success: false, 
          message: `Model ${modelName} was saved but could not be initialized. Will try again on next server restart.`
        });
      }
    } catch (error: any) {
      console.error('Error updating AI model:', error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to update AI model",
        error: error.message || 'Unknown error'
      });
    }
  }));
  
  // Get all AI settings
  app.get("/api/admin/ai/settings", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can manage AI settings" });
    }
    
    const settings = await storage.getAllAiSettings();
    res.json(settings);
  }));

  // CART ROUTES
  app.get("/api/cart", handleErrors(async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      // For non-authenticated users, return empty cart
      return res.json([]);
    }
    const user = req.user as any;
    const cartItems = await storage.getCartItemsWithProducts(user.id);
    res.json(cartItems);
  }));

  app.post("/api/cart", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    const cartItemData = insertCartItemSchema.parse({
      ...req.body,
      userId: user.id,
    });
    
    const cartItem = await storage.addToCart(cartItemData);
    res.status(201).json(cartItem);
  }));

  app.put("/api/cart/:id", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const { quantity } = req.body;
    
    if (quantity === undefined) {
      return res.status(400).json({ message: "Quantity is required" });
    }
    
    const updatedItem = await storage.updateCartItemQuantity(id, quantity);
    
    if (!updatedItem && quantity > 0) {
      return res.status(404).json({ message: "Cart item not found" });
    }
    
    res.json({ success: true, item: updatedItem });
  }));

  app.delete("/api/cart/:id", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    await storage.removeFromCart(id);
    res.json({ success: true });
  }));

  app.delete("/api/cart", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    await storage.clearCart(user.id);
    res.json({ success: true });
  }));

  // ORDER ROUTES
  app.post("/api/orders", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    const { order, items } = req.body;
    
    const orderData = insertOrderSchema.parse({
      ...order,
      userId: user.id,
    });
    
    // Validate order items
    const orderItems = items.map((item: any) => insertOrderItemSchema.parse(item));
    
    const newOrder = await storage.createOrder(orderData, orderItems);
    res.status(201).json(newOrder);
  }));

  app.get("/api/orders", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    const orders = await storage.getOrdersByUser(user.id);
    res.json(orders);
  }));

  app.get("/api/orders/:id", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const order = await storage.getOrderById(id);
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    // Check if the order belongs to the authenticated user or user is admin
    const user = req.user as any;
    if (order.userId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    res.json(order);
  }));
  
  // Update order status (admin-only)
  app.patch("/api/orders/:id/status", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }
    
    // Check if user is admin
    const user = req.user as any;
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only admins can update order status" });
    }
    
    // Get the order
    const order = await storage.getOrderById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    // Update the status
    const updatedOrder = await storage.updateOrderStatus(id, status);
    if (!updatedOrder) {
      return res.status(500).json({ message: "Failed to update order status" });
    }
    
    res.json(updatedOrder);
  }));
  
  // Admin-only route to get all orders (must be above the /api/orders/:id route due to route matching order)
  app.get("/api/admin/orders", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Access denied" });
    }
    
    // Get all orders
    const orders = await storage.getOrdersByUser(null); // Simplified approach using existing method
    
    res.json(orders);
  }));

  // AI RECOMMENDATION ROUTES - Available to all users (logged in or not)
  app.get("/api/recommendations", handleErrors(async (req: Request, res: Response) => {
    // Check if user is authenticated
    const user = req.isAuthenticated() ? req.user as any : null;
    
    if (user) {
      // Get personalized recommendations for authenticated users
      const recommendations = await storage.getRecommendationsForUser(user.id);
      
      if (recommendations && recommendations.productIds) {
        // Get product details for recommended products
        const products = [];
        for (const productId of recommendations.productIds) {
          const product = await storage.getProductById(productId);
          if (product) {
            products.push(product);
          }
        }
        
        return res.json({
          products,
          reason: recommendations.reason,
          timestamp: recommendations.createdAt
        });
      }
    }
    
    // For non-authenticated users or users without recommendations
    // Return popular/featured products as a fallback
    const products = await storage.getFeaturedProducts(10);
    
    return res.json({
      products,
      reason: "Popular products you might like",
      timestamp: new Date()
    });
  }));

  // PRICING MANAGEMENT ROUTES - For admin use only
  
  // Get all pricing settings
  app.get("/api/admin/pricing", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Access denied" });
    }
    
    const pricingSettings = await storage.getAllPricingSettings();
    res.json(pricingSettings);
  }));
  
  // Get default markup percentage
  app.get("/api/pricing/default-markup", handleErrors(async (req: Request, res: Response) => {
    const defaultMarkup = await storage.getDefaultMarkupPercentage();
    res.json({ markupPercentage: defaultMarkup, isSet: defaultMarkup !== null });
  }));
  
  // Get pricing for a specific category
  app.get("/api/pricing/category/:categoryId", handleErrors(async (req: Request, res: Response) => {
    const categoryId = parseInt(req.params.categoryId);
    const pricing = await storage.getPricingByCategoryId(categoryId);
    
    if (!pricing) {
      const defaultMarkup = await storage.getDefaultMarkupPercentage();
      return res.json({ 
        categoryId,
        markupPercentage: defaultMarkup,
        description: defaultMarkup === null 
          ? "No pricing rule set for this category or globally" 
          : "Default pricing (category-specific pricing not set)"
      });
    }
    
    res.json(pricing);
  }));
  
  // Create or update pricing for a category
  app.post("/api/admin/pricing", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Access denied" });
    }
    
    const pricingData = insertPricingSchema.parse(req.body);
    const result = await storage.createOrUpdatePricing(pricingData);
    res.status(201).json(result);
  }));
  
  // Delete pricing setting
  app.delete("/api/admin/pricing/:id", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Access denied" });
    }
    
    const id = parseInt(req.params.id);
    await storage.deletePricing(id);
    res.json({ success: true });
  }));

  // SUPPLIER ROUTES
  app.get("/api/suppliers", handleErrors(async (req: Request, res: Response) => {
    // For admin users, show all suppliers regardless of active status
    // For regular users, only show active suppliers
    const user = req.user as any;
    const isAdmin = user && user.role === 'admin';
    const activeOnly = isAdmin ? false : req.query.activeOnly !== 'false';
    
    const suppliers = await storage.getAllSuppliers(activeOnly);
    res.json(suppliers);
  }));

  app.get("/api/suppliers/:id", handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const supplier = await storage.getSupplierById(id);
    
    if (!supplier) {
      res.status(404).json({ message: "Supplier not found" });
      return;
    }
    
    res.json(supplier);
  }));

  app.post("/api/suppliers", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can manage suppliers" });
    }
    
    const supplierData = insertSupplierSchema.parse(req.body);
    const supplier = await storage.createSupplier(supplierData);
    
    res.status(201).json(supplier);
  }));

  app.put("/api/suppliers/:id", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can manage suppliers" });
    }
    
    const id = parseInt(req.params.id);
    const supplierData = insertSupplierSchema.partial().parse(req.body);
    const supplier = await storage.updateSupplier(id, supplierData);
    
    if (!supplier) {
      res.status(404).json({ message: "Supplier not found" });
      return;
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
    
    res.json(supplier);
  }));

  app.delete("/api/suppliers/:id", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can manage suppliers" });
    }
    
    const id = parseInt(req.params.id);
    const success = await storage.deleteSupplier(id);
    
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ message: "Supplier not found" });
    }
  }));

  // CATALOG ROUTES
  app.get("/api/catalogs", handleErrors(async (req: Request, res: Response) => {
    // For admin users, show all catalogs regardless of active status
    // For regular users, only show active catalogs
    const user = req.user as any;
    const isAdmin = user && user.role === 'admin';
    const activeOnly = isAdmin ? false : req.query.activeOnly !== 'false';
    
    const catalogs = await storage.getAllCatalogs(activeOnly);
    res.json(catalogs);
  }));

  app.get("/api/catalogs/:id", handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const catalog = await storage.getCatalogById(id);
    
    if (!catalog) {
      res.status(404).json({ message: "Catalog not found" });
      return;
    }
    
    res.json(catalog);
  }));

  app.get("/api/suppliers/:supplierId/catalogs", handleErrors(async (req: Request, res: Response) => {
    const supplierId = parseInt(req.params.supplierId);
    // For admin users, show all catalogs regardless of active status
    // For regular users, only show active catalogs
    const user = req.user as any;
    const isAdmin = user && user.role === 'admin';
    const activeOnly = isAdmin ? false : req.query.activeOnly !== 'false';
    
    const catalogs = await storage.getCatalogsBySupplierId(supplierId, activeOnly);
    res.json(catalogs);
  }));

  app.post("/api/catalogs", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can manage catalogs" });
    }
    
    const catalogData = insertCatalogSchema.parse(req.body);
    const catalog = await storage.createCatalog(catalogData);
    
    res.status(201).json(catalog);
  }));

  app.put("/api/catalogs/:id", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can manage catalogs" });
    }
    
    const id = parseInt(req.params.id);
    const catalogData = insertCatalogSchema.partial().parse(req.body);
    const catalog = await storage.updateCatalog(id, catalogData);
    
    if (!catalog) {
      res.status(404).json({ message: "Catalog not found" });
      return;
    }
    
    // If 'isActive' property was changed, update all products in this catalog
    if (catalogData.isActive !== undefined) {
      const updateResult = await storage.bulkUpdateCatalogProducts(id, { isActive: catalogData.isActive });
      console.log(`Updated isActive status for ${updateResult} products in catalog ${id} to ${catalogData.isActive}`);
    }
    
    res.json(catalog);
  }));

  app.delete("/api/catalogs/:id", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can manage catalogs" });
    }
    
    const id = parseInt(req.params.id);
    const success = await storage.deleteCatalog(id);
    
    if (success) {
      // When a catalog is deleted (marked inactive), also mark all its products as inactive
      const productsUpdated = await storage.bulkUpdateCatalogProducts(id, { isActive: false });
      console.log(`Catalog ${id} deleted: marked ${productsUpdated} products as inactive`);
      
      res.json({ success: true });
    } else {
      res.status(404).json({ message: "Catalog not found" });
    }
  }));

  app.get("/api/catalogs/:catalogId/products", handleErrors(async (req: Request, res: Response) => {
    const catalogId = parseInt(req.params.catalogId);
    // For admin users, show all products regardless of active status
    // For regular users, only show active products
    const user = req.user as any;
    const isAdmin = user && user.role === 'admin';
    const activeOnly = isAdmin ? false : req.query.activeOnly !== 'false';
    
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    
    const products = await storage.getProductsByCatalogId(catalogId, activeOnly, limit, offset);
    res.json(products);
  }));

  app.put("/api/catalogs/:catalogId/products/bulk", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can manage catalog products" });
    }
    
    const catalogId = parseInt(req.params.catalogId);
    const updateData = insertProductSchema.partial().parse(req.body);
    
    const count = await storage.bulkUpdateCatalogProducts(catalogId, updateData);
    res.json({ 
      success: true, 
      message: `Updated ${count} products in catalog`,
      count 
    });
  }));

  // Quick edit product endpoint
  app.patch("/api/products/:id/quick-edit", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can update products" });
    }
    
    const productId = parseInt(req.params.id);
    
    if (isNaN(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }
    
    const { name, price, listPrice, sku, stockQuantity, isActive } = req.body;
    
    // Validate required fields
    if (!name || name.trim().length < 3) {
      return res.status(400).json({ message: "Product name must be at least 3 characters" });
    }
    
    if (typeof price !== 'number' || price <= 0) {
      return res.status(400).json({ message: "Price must be a positive number" });
    }
    
    if (listPrice !== undefined && (typeof listPrice !== 'number' || listPrice < 0)) {
      return res.status(400).json({ message: "List price must be a non-negative number" });
    }
    
    if (!sku || sku.trim() === '') {
      return res.status(400).json({ message: "SKU is required" });
    }
    
    if (typeof stockQuantity !== 'number' || stockQuantity < 0 || !Number.isInteger(stockQuantity)) {
      return res.status(400).json({ message: "Stock quantity must be a non-negative integer" });
    }
    
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: "Active status must be a boolean" });
    }
    
    // Get the existing product to check if it exists
    const existingProduct = await storage.getProductById(productId);
    
    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
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
    
    res.json({ 
      success: true, 
      message: "Product updated successfully",
      product: updatedProduct
    });
  }));

  // PATCH endpoint to reorder products in a catalog
  app.patch("/api/catalogs/:id/products/reorder", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can reorder catalog products" });
    }
    
    const catalogId = parseInt(req.params.id);
    const { productIds } = req.body;
    
    if (!Array.isArray(productIds)) {
      return res.status(400).json({ message: "productIds must be an array of product IDs" });
    }
    
    // Update the display order for each product
    const result = await storage.updateProductDisplayOrder(catalogId, productIds);
    
    res.json({ 
      success: true, 
      message: `Updated display order for ${result.count} products`,
      count: result.count
    });
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

  const httpServer = createServer(app);
  return httpServer;
}