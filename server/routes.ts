import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ZodError } from "zod";
import { 
  insertUserSchema, 
  insertCartItemSchema, 
  insertOrderSchema, 
  insertOrderItemSchema,
  insertProductSchema
} from "@shared/schema";
import session from "express-session";
import MemoryStore from "memorystore";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";

const SessionStore = MemoryStore(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "tee-me-you-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: process.env.NODE_ENV === "production", maxAge: 7 * 24 * 60 * 60 * 1000 }, // 7 days
      store: new SessionStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
    })
  );

  // Set up passport middleware
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !bcrypt.compareSync(password, user.password)) {
          return done(null, false, { message: "Invalid username or password" });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Authentication middleware
  const isAuthenticated = (req: Request, res: Response, next: any) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // Error handling middleware
  const handleErrors = (fn: Function) => async (req: Request, res: Response, next: any) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors,
        });
      }
      next(error);
    }
  };

  // API Routes
  // AUTH ROUTES
  app.post("/api/auth/register", handleErrors(async (req: Request, res: Response) => {
    const userData = insertUserSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await storage.getUserByUsername(userData.username);
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }
    
    const existingEmail = await storage.getUserByEmail(userData.email);
    if (existingEmail) {
      return res.status(400).json({ message: "Email already exists" });
    }
    
    // Hash password
    const hashedPassword = bcrypt.hashSync(userData.password, 10);
    
    // Create user
    const user = await storage.createUser({
      ...userData,
      password: hashedPassword,
    });
    
    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    
    res.status(201).json(userWithoutPassword);
  }));

  app.post("/api/auth/login", (req: Request, res: Response, next: any) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info.message || "Invalid credentials" });
      }
      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        const { password, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.logout(() => {
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/user", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { password, ...userWithoutPassword } = req.user as any;
    res.json(userWithoutPassword);
  });

  // CATEGORY ROUTES
  app.get("/api/categories", handleErrors(async (req: Request, res: Response) => {
    const categories = await storage.getAllCategories();
    res.json(categories);
  }));

  app.get("/api/categories/:slug", handleErrors(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const category = await storage.getCategoryBySlug(slug);
    
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
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
      return res.status(404).json({ message: "Product not found" });
    }
    
    res.json(product);
  }));

  app.get("/api/products/slug/:slug", handleErrors(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const product = await storage.getProductBySlug(slug);
    
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
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
      return res.status(400).json({ message: "Search query is required" });
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
    
    if (!recommendations) {
      return res.json([]);
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
