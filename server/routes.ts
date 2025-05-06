import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ZodError } from "zod";
import { 
  insertCartItemSchema, 
  insertOrderSchema, 
  insertOrderItemSchema
} from "@shared/schema";
import { setupAuth } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication with our new auth module
  setupAuth(app);
  
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

  // CART ROUTES
  app.get("/api/cart", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
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
    
    // Check if the order belongs to the authenticated user
    const user = req.user as any;
    if (order.userId !== user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    res.json(order);
  }));

  // AI RECOMMENDATION ROUTES
  app.get("/api/recommendations", isAuthenticated, handleErrors(async (req: Request, res: Response) => {
    const user = req.user as any;
    const recommendations = await storage.getRecommendationsForUser(user.id);
    
    if (!recommendations || !recommendations.productIds) {
      return res.json({ products: [], reason: null, timestamp: new Date() });
    }
    
    // Get product details for recommended products
    const products = [];
    for (const productId of recommendations.productIds) {
      const product = await storage.getProductById(productId);
      if (product) {
        products.push(product);
      }
    }
    
    res.json({
      products,
      reason: recommendations.reason,
      timestamp: recommendations.createdAt
    });
  }));

  const httpServer = createServer(app);
  return httpServer;
}