import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ZodError } from "zod";
import { 
  insertCartItemSchema, 
  insertOrderSchema, 
  insertOrderItemSchema,
  insertCategorySchema,
  insertProductSchema,
  insertProductImageSchema
} from "@shared/schema";
import { Client as ObjectStorageClient } from "@replit/object-storage";
import { setupAuth } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize object store for file uploads
  const objectStore = new ObjectStorageClient();
  
  // Set up authentication with our new auth module
  setupAuth(app);
  
  // Setup a route to serve files from Object Storage
  app.get('/object-storage/:folder/:subfolder/:filename', async (req: Request, res: Response) => {
    try {
      const { folder, subfolder, filename } = req.params;
      const objectKey = `${folder}/${subfolder}/${filename}`;
      
      // Check if the file exists
      const exists = await objectStore.exists(objectKey);
      if (!exists) {
        return res.status(404).send('File not found');
      }
      
      // Get the file mime type based on extension
      const extension = filename.split('.').pop()?.toLowerCase() || '';
      const mimeTypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
      };
      const contentType = mimeTypes[extension] || 'application/octet-stream';
      
      // Set the appropriate content type header
      res.setHeader('Content-Type', contentType);
      
      // Set caching headers
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
      
      // Stream the file to the response
      const fileStream = await objectStore.downloadAsStream(objectKey);
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
    const categories = await storage.getAllCategories();
    res.json(categories);
  }));

  app.get("/api/categories/:slug", handleErrors(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const category = await storage.getCategoryBySlug(slug);
    
    if (!category) {
      res.status(404).json({ message: "Category not found" });
      return;
    }
    
    res.json(category);
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

  // PRODUCT ROUTES
  app.get("/api/products", handleErrors(async (req: Request, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    
    const products = await storage.getAllProducts(limit, offset);
    res.json(products);
  }));

  app.get("/api/products/:id", handleErrors(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const product = await storage.getProductById(id);
    
    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }
    
    res.json(product);
  }));

  app.get("/api/products/slug/:slug", handleErrors(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const product = await storage.getProductBySlug(slug);
    
    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }
    
    res.json(product);
  }));

  app.get("/api/products/category/:categoryId", handleErrors(async (req: Request, res: Response) => {
    const categoryId = parseInt(req.params.categoryId);
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    
    const products = await storage.getProductsByCategory(categoryId, limit, offset);
    res.json(products);
  }));

  app.get("/api/featured-products", handleErrors(async (req: Request, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const products = await storage.getFeaturedProducts(limit);
    res.json(products);
  }));

  app.get("/api/flash-deals", handleErrors(async (req: Request, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 6;
    const products = await storage.getFlashDeals(limit);
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
    
    const products = await storage.searchProducts(query, limit, offset);
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
  
  // PRODUCT IMAGE ROUTES
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
    const imageData = {
      ...req.body,
      productId
    };
    
    // Validate image data
    const validatedImageData = insertProductImageSchema.parse(imageData);
    
    // If the image has a base64 data URL, store it in object storage
    if (validatedImageData.url && validatedImageData.url.startsWith('data:')) {
      try {
        // Extract the base64 data and content type
        const matches = validatedImageData.url.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
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
        await objectStore.uploadFromBytes(objectKey, buffer);
        
        // Generate public URL - since Replit Object Store has predictable URLs
        const publicUrl = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/object-storage/${objectKey}`;
        
        // Update the image data with the object store URL
        validatedImageData.url = publicUrl;
        validatedImageData.objectKey = objectKey;
        
        // If background removed URL is not set, use the original URL
        if (!validatedImageData.bgRemovedUrl) {
          validatedImageData.bgRemovedUrl = publicUrl;
          validatedImageData.bgRemovedObjectKey = objectKey;
        }
      } catch (error) {
        console.error('Error uploading image to object storage:', error);
        return res.status(500).json({ message: "Failed to upload image" });
      }
    }
    
    // Create the product image record
    const image = await storage.createProductImage(validatedImageData);
    res.status(201).json(image);
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

  const httpServer = createServer(app);
  return httpServer;
}