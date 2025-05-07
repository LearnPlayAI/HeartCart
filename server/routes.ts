import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ZodError } from "zod";
import { removeImageBackground, generateProductTags, analyzeProductImage, suggestPrice, getAvailableAiModels, getCurrentAiModelSetting, updateAiModel } from "./ai-service";
import { ImageService, THUMBNAIL_SIZES } from "./image-service";
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
import { objectStorageService, STORAGE_FOLDERS } from "./objectstore";
import { setupAuth } from "./auth";
import multer from "multer";
import path from "path";
import fs from "fs";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize ImageService with the objectStorageService
  const imageService = new ImageService(objectStorageService);
  
  // Set up multer storage for temporary file uploads
  const tempStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      console.log('Multer file received:', file.fieldname, file.originalname);
      cb(null, path.join(process.cwd(), 'temp'));
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      // Use a consistent field name for the filename prefix
      cb(null, 'product-image-' + uniqueSuffix + ext);
    }
  });
  
  const upload = multer({ 
    storage: tempStorage,
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
  
  // Setup a route to serve files from Object Storage
  app.get('/object-storage/:folder/:subfolder/:filename', async (req: Request, res: Response) => {
    try {
      const { folder, subfolder, filename } = req.params;
      const objectKey = `${folder}/${subfolder}/${filename}`;
      
      // Check if the file exists
      const exists = await objectStorageService.exists(objectKey);
      if (!exists) {
        return res.status(404).send('File not found');
      }
      
      // Attempt to get metadata for the file
      try {
        const metadata = await objectStorageService.getMetadata(objectKey);
        
        // Set content type from metadata if available
        if (metadata.contentType) {
          res.setHeader('Content-Type', metadata.contentType);
        } else {
          // Fall back to detection based on filename
          res.setHeader('Content-Type', objectStorageService.detectContentType(filename));
        }
        
        // Set cache control if available in metadata
        if (metadata.cacheControl) {
          res.setHeader('Cache-Control', metadata.cacheControl);
        } else {
          // Default cache control
          res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
        }
        
        // Set content disposition if available
        if (metadata.contentDisposition) {
          res.setHeader('Content-Disposition', metadata.contentDisposition);
        }
      } catch (metadataError) {
        // If metadata retrieval fails, use the basic approach
        console.warn(`Metadata retrieval failed for ${objectKey}, using basic detection`, metadataError);
        res.setHeader('Content-Type', objectStorageService.detectContentType(filename));
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
      
      // Stream the file to the response
      const fileStream = await objectStorageService.downloadAsStream(objectKey);
      fileStream.pipe(res);
    } catch (error) {
      console.error('Error serving file from Object Storage:', error);
      res.status(500).send('Error serving file');
    }
  });
  
  // Error handling middleware
  const handleErrors = (fn: Function) => async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          message: "Validation error",
          errors: error.errors,
        });
        return;
      }
      next(error);
    }
  };

  // Authentication middleware
  const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
      next();
      return;
    }
    res.status(401).json({ message: "Unauthorized" });
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

  app.get("/api/categories/:slug", handleErrors(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const user = req.user as any;
    const isAdmin = user && user.role === 'admin';
    
    const options = { includeInactive: isAdmin };
    const category = await storage.getCategoryBySlug(slug, options);
    
    if (!category) {
      res.status(404).json({ message: "Category not found" });
      return;
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
  
  app.get("/api/categories/:id/with-children", handleErrors(async (req: Request, res: Response) => {
    const categoryId = parseInt(req.params.id);
    const user = req.user as any;
    const isAdmin = user && user.role === 'admin';
    
    // Validate categoryId is a number
    if (isNaN(categoryId)) {
      res.status(400).json({ message: "Invalid category ID" });
      return;
    }
    
    const options = { includeInactive: isAdmin };
    const categoryWithChildren = await storage.getCategoryWithChildren(categoryId, options);
    
    if (!categoryWithChildren) {
      res.status(404).json({ message: "Category not found" });
      return;
    }
    
    res.json(categoryWithChildren);
  }));

  app.post("/api/categories", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can create categories" });
    }
    
    const categoryData = insertCategorySchema.parse(req.body);
    const category = await storage.createCategory(categoryData);
    
    res.status(201).json(category);
  }));

  app.put("/api/categories/:id", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can update categories" });
    }
    
    const { id } = req.params;
    const categoryId = parseInt(id);
    
    // Validate the data
    const categoryData = insertCategorySchema.partial().parse(req.body);
    
    // Update the category
    const category = await storage.updateCategory(categoryId, categoryData);
    
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    
    res.json(category);
  }));
  
  app.put("/api/categories/:id/display-order", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can update category order" });
    }
    
    const { id } = req.params;
    const categoryId = parseInt(id);
    const { displayOrder } = req.body;
    
    if (typeof displayOrder !== 'number') {
      return res.status(400).json({ message: "Display order must be a number" });
    }
    
    // Update the category display order
    const category = await storage.updateCategoryDisplayOrder(categoryId, displayOrder);
    
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    
    res.json(category);
  }));

  app.put("/api/categories/:id/visibility", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can update category visibility" });
    }
    
    const { id } = req.params;
    const categoryId = parseInt(id);
    const { isActive, cascade = true } = req.body;
    
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: "isActive must be a boolean value" });
    }
    
    // Update the category's visibility
    const category = await storage.updateCategory(categoryId, { isActive });
    
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    
    // Initialize counters for response
    let updatedProductCount = 0;
    let updatedSubcategoryCount = 0;
    
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
      
      console.log(`Cascaded visibility status to ${updatedSubcategoryCount} subcategories of category ${categoryId}`);
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
    
    console.log(`Updated visibility status for ${updatedProductCount} products in category ${categoryId} to: ${isActive}`);
    
    res.json({
      ...category,
      productsUpdated: updatedProductCount,
      subcategoriesUpdated: updatedSubcategoryCount,
      cascaded: cascade
    });
  }));

  // CATEGORY ATTRIBUTE ROUTES
  app.get("/api/categories/:categoryId/attributes", handleErrors(async (req: Request, res: Response) => {
    const categoryId = parseInt(req.params.categoryId);
    const attributes = await storage.getCategoryAttributes(categoryId);
    res.json(attributes);
  }));

  app.get("/api/category-attributes/:id", handleErrors(async (req: Request, res: Response) => {
    const attributeId = parseInt(req.params.id);
    const attribute = await storage.getCategoryAttributeById(attributeId);
    if (!attribute) {
      return res.status(404).json({ message: "Attribute not found" });
    }
    res.json(attribute);
  }));

  app.post("/api/category-attributes", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can create category attributes" });
    }
    
    const attribute = await storage.createCategoryAttribute(req.body);
    res.status(201).json(attribute);
  }));

  app.put("/api/category-attributes/:id", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can update category attributes" });
    }
    
    const attributeId = parseInt(req.params.id);
    const attribute = await storage.updateCategoryAttribute(attributeId, req.body);
    if (!attribute) {
      return res.status(404).json({ message: "Attribute not found" });
    }
    res.json(attribute);
  }));

  app.delete("/api/category-attributes/:id", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can delete category attributes" });
    }
    
    const attributeId = parseInt(req.params.id);
    const success = await storage.deleteCategoryAttribute(attributeId);
    res.json({ success });
  }));

  // CATEGORY ATTRIBUTE OPTIONS ROUTES
  app.get("/api/category-attributes/:attributeId/options", handleErrors(async (req: Request, res: Response) => {
    const attributeId = parseInt(req.params.attributeId);
    const options = await storage.getCategoryAttributeOptions(attributeId);
    res.json(options);
  }));
  
  // Debug route for testing camelCase naming standardization
  app.get("/api/debug/attribute-naming", handleErrors(async (req: Request, res: Response) => {
    const attributes = await storage.getCategoryAttributes(1);
      
    const options = attributes.length > 0 ? 
      await storage.getCategoryAttributeOptions(attributes[0].id) : [];
    
    res.json({
      attributeExample: attributes[0] || null,
      optionsExample: options.slice(0, 3) || []
    });
  }));

  app.post("/api/category-attribute-options", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can create attribute options" });
    }
    
    const option = await storage.createCategoryAttributeOption(req.body);
    res.status(201).json(option);
  }));

  app.put("/api/category-attribute-options/:id", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can update attribute options" });
    }
    
    const optionId = parseInt(req.params.id);
    const option = await storage.updateCategoryAttributeOption(optionId, req.body);
    if (!option) {
      return res.status(404).json({ message: "Option not found" });
    }
    res.json(option);
  }));

  app.delete("/api/category-attribute-options/:id", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can delete attribute options" });
    }
    
    const optionId = parseInt(req.params.id);
    const success = await storage.deleteCategoryAttributeOption(optionId);
    res.json({ success });
  }));

  // PRODUCT ROUTES
  app.get("/api/products", handleErrors(async (req: Request, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    const categoryId = req.query.category ? parseInt(req.query.category as string) : undefined;
    const search = req.query.search as string | undefined;
    
    const user = req.user as any;
    const isAdmin = user && user.role === 'admin';
    
    const options = { 
      includeInactive: isAdmin, 
      includeCategoryInactive: isAdmin 
    };
    
    const products = await storage.getAllProducts(limit, offset, categoryId, search, options);
    res.json(products);
  }));

  // Specific route patterns must be defined before generic patterns with path parameters
  app.get("/api/products/slug/:slug", handleErrors(async (req: Request, res: Response) => {
    const { slug } = req.params;
    
    const user = req.user as any;
    const isAdmin = user && user.role === 'admin';
    
    const options = { 
      includeInactive: isAdmin, 
      includeCategoryInactive: isAdmin 
    };
    
    const product = await storage.getProductBySlug(slug, options);
    
    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }
    
    res.json(product);
  }));

  app.get("/api/products/category/:categoryId", handleErrors(async (req: Request, res: Response) => {
    const categoryId = parseInt(req.params.categoryId);
    
    // Validate categoryId is a number
    if (isNaN(categoryId)) {
      res.status(400).json({ message: "Invalid category ID" });
      return;
    }
    
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    
    const user = req.user as any;
    const isAdmin = user && user.role === 'admin';
    
    const options = { 
      includeInactive: isAdmin, 
      includeCategoryInactive: isAdmin 
    };
    
    const products = await storage.getProductsByCategory(categoryId, limit, offset, options);
    res.json(products);
  }));
  
  app.get("/api/products/attributes-for-category/:categoryId", handleErrors(async (req: Request, res: Response) => {
    const categoryId = parseInt(req.params.categoryId);
    
    // Validate categoryId is a number
    if (isNaN(categoryId)) {
      res.status(400).json({ message: "Invalid category ID" });
      return;
    }
    
    const user = req.user as any;
    const isAdmin = user && user.role === 'admin';
    
    const options = { 
      includeInactive: isAdmin, 
      includeCategoryInactive: isAdmin 
    };
    
    // Get all products in this category
    const products = await storage.getProductsByCategory(categoryId, undefined, undefined, options);
    
    // Get all attributes for this category
    const categoryAttributes = await storage.getCategoryAttributes(categoryId);
    
    // Create a lookup map for attribute names by ID
    const attributeNamesById: Record<number, string> = {};
    for (const attr of categoryAttributes) {
      attributeNamesById[attr.id] = attr.name;
    }
    
    // Get all attributes for these products
    const result = [];
    
    for (const product of products) {
      // Get product attribute values
      const attributeValues = await storage.getProductAttributeValues(product.id);
      
      // Format attribute values by attribute name
      const attributesByName: Record<string, string[]> = {};
      
      for (const attrValue of attributeValues) {
        const attributeName = attributeNamesById[attrValue.attributeId];
        if (attributeName) {
          if (!attributesByName[attributeName]) {
            attributesByName[attributeName] = [];
          }
          attributesByName[attributeName].push(attrValue.value);
        }
      }
      
      result.push({
        productId: product.id,
        attributes: attributesByName
      });
    }
    
    res.json(result);
  }));
  
  // Generic route for product by ID must come after more specific routes
  app.get("/api/products/:id", handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    
    // Validate id is a number
    if (isNaN(id)) {
      res.status(400).json({ message: "Invalid product ID" });
      return;
    }
    
    const user = req.user as any;
    const isAdmin = user && user.role === 'admin';
    
    const options = { 
      includeInactive: isAdmin, 
      includeCategoryInactive: isAdmin 
    };
    
    const product = await storage.getProductById(id, options);
    
    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }
    
    res.json(product);
  }));

  app.get("/api/featured-products", handleErrors(async (req: Request, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    
    const user = req.user as any;
    const isAdmin = user && user.role === 'admin';
    
    const options = { 
      includeInactive: isAdmin, 
      includeCategoryInactive: isAdmin 
    };
    
    const products = await storage.getFeaturedProducts(limit, options);
    res.json(products);
  }));

  app.get("/api/flash-deals", handleErrors(async (req: Request, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 6;
    
    const user = req.user as any;
    const isAdmin = user && user.role === 'admin';
    
    const options = { 
      includeInactive: isAdmin, 
      includeCategoryInactive: isAdmin 
    };
    
    const products = await storage.getFlashDeals(limit, options);
    res.json(products);
  }));

  app.get("/api/search", handleErrors(async (req: Request, res: Response) => {
    const query = req.query.q as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    
    if (!query) {
      res.status(400).json({ message: "Search query is required" });
      return;
    }
    
    const user = req.user as any;
    const isAdmin = user && user.role === 'admin';
    
    const options = { 
      includeInactive: isAdmin, 
      includeCategoryInactive: isAdmin 
    };
    
    const products = await storage.searchProducts(query, limit, offset, options);
    res.json(products);
  }));
  
  app.post("/api/products", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can create products" });
    }
    
    const productData = insertProductSchema.parse(req.body);
    
    // Create the product
    const product = await storage.createProduct(productData);
    
    res.status(201).json(product);
  }));

  // PRODUCT ATTRIBUTE ROUTES
  app.get("/api/products/:productId/attributes", handleErrors(async (req: Request, res: Response) => {
    const productId = parseInt(req.params.productId);
    
    // Validate productId is a number
    if (isNaN(productId)) {
      res.status(400).json({ message: "Invalid product ID" });
      return;
    }
    
    const attributes = await storage.getProductAttributeValues(productId);
    res.json(attributes);
  }));

  app.post("/api/product-attribute-values", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can create product attributes" });
    }
    
    const attributeValue = await storage.createProductAttributeValue(req.body);
    res.status(201).json(attributeValue);
  }));

  app.put("/api/product-attribute-values/:id", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can update product attributes" });
    }
    
    const attributeValueId = parseInt(req.params.id);
    const attributeValue = await storage.updateProductAttributeValue(attributeValueId, req.body);
    if (!attributeValue) {
      return res.status(404).json({ message: "Attribute value not found" });
    }
    res.json(attributeValue);
  }));

  app.delete("/api/product-attribute-values/:id", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can delete product attributes" });
    }
    
    const attributeValueId = parseInt(req.params.id);
    const success = await storage.deleteProductAttributeValue(attributeValueId);
    res.json({ success });
  }));

  // PRODUCT ATTRIBUTE COMBINATIONS ROUTES
  app.get("/api/products/:productId/combinations", handleErrors(async (req: Request, res: Response) => {
    const productId = parseInt(req.params.productId);
    const combinations = await storage.getProductAttributeCombinations(productId);
    res.json(combinations);
  }));

  app.post("/api/product-attribute-combinations", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can create attribute combinations" });
    }
    
    const combination = await storage.createProductAttributeCombination(req.body);
    res.status(201).json(combination);
  }));

  app.put("/api/product-attribute-combinations/:id", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can update attribute combinations" });
    }
    
    const combinationId = parseInt(req.params.id);
    const combination = await storage.updateProductAttributeCombination(combinationId, req.body);
    if (!combination) {
      return res.status(404).json({ message: "Attribute combination not found" });
    }
    res.json(combination);
  }));

  app.delete("/api/product-attribute-combinations/:id", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can delete attribute combinations" });
    }
    
    const combinationId = parseInt(req.params.id);
    const success = await storage.deleteProductAttributeCombination(combinationId);
    res.json({ success });
  }));
  
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
    
      // Process files and upload to Object Storage
      const processedFiles = [];
      
      try {
        for (const file of req.files) {
          // Read the file from disk
          const fileBuffer = await fs.promises.readFile(file.path);
          
          // Upload to Object Storage
          const { url, objectKey } = await objectStorageService.uploadTempFile(
            fileBuffer,
            file.originalname,
            file.mimetype
          );
          
          processedFiles.push({
            filename: path.basename(objectKey),
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            path: url, // Use the Object Storage URL
            objectKey
          });
          
          // Remove the temporary file from disk
          await fs.promises.unlink(file.path).catch(err => {
            console.warn(`Could not delete temporary file ${file.path}:`, err);
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
  
  // Serve temporary files
  app.get('/temp/:filename', async (req: Request, res: Response) => {
    try {
      const filename = req.params.filename;
      const objectKey = `${STORAGE_FOLDERS.TEMP}/${filename}`;
      
      // Check if the file exists in Object Storage
      const exists = await objectStorageService.exists(objectKey);
      
      if (exists) {
        // Get metadata
        const metadata = await objectStorageService.getMetadata(objectKey);
        
        // Set content type from metadata if available
        if (metadata.contentType) {
          res.setHeader('Content-Type', metadata.contentType);
        } else {
          // Fall back to detection based on filename
          res.setHeader('Content-Type', objectStorageService.detectContentType(filename));
        }
        
        // Set cache control for temp files
        res.setHeader('Cache-Control', 'no-cache, max-age=0');
        
        // Stream the file from Object Storage
        const fileStream = await objectStorageService.downloadAsStream(objectKey);
        fileStream.pipe(res);
        return;
      }
      
      // If not in Object Storage, try the local file system (for backward compatibility)
      const filePath = path.join(process.cwd(), 'temp', filename);
      
      if (fs.existsSync(filePath)) {
        // Send the file from the local file system
        res.sendFile(filePath, (err) => {
          if (err) {
            console.error('Error serving temp file:', err);
            res.status(404).send('File not found');
          }
        });
        return;
      }
      
      // File not found in either location
      res.status(404).send('File not found');
    } catch (error: any) {
      console.error('Error serving temporary file:', error);
      res.status(500).send(`Server error: ${error.message || 'Unknown error'}`);
    }
  });
  
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
        await objectStorageService.uploadFromBuffer(objectKey, buffer, { contentType });
        
        // Generate public URL
        const publicUrl = objectStorageService.getPublicUrl(objectKey);
        
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
        await objectStorageService.uploadFromBuffer(objectKey, buffer, { contentType });
        
        // Generate public URL
        const publicUrl = objectStorageService.getPublicUrl(objectKey);
        
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

  const httpServer = createServer(app);
  return httpServer;
}