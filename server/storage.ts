import { 
  users, type User, type InsertUser,
  categories, type Category, type InsertCategory,
  products, type Product, type InsertProduct,
  cartItems, type CartItem, type InsertCartItem,
  orders, type Order, type InsertOrder,
  orderItems, type OrderItem, type InsertOrderItem,
  productImages, type ProductImage, type InsertProductImage,
  aiRecommendations, type AiRecommendation, type InsertAiRecommendation,
  pricing, type Pricing, type InsertPricing
} from "@shared/schema";
import { db } from "./db";
import { eq, like, and, desc, asc, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined>;
  
  // Category operations
  getAllCategories(): Promise<Category[]>;
  getCategoryBySlug(slug: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Product operations
  getAllProducts(limit?: number, offset?: number): Promise<Product[]>;
  getProductById(id: number): Promise<Product | undefined>;
  getProductBySlug(slug: string): Promise<Product | undefined>;
  getProductsByCategory(categoryId: number, limit?: number, offset?: number): Promise<Product[]>;
  getFeaturedProducts(limit?: number): Promise<Product[]>;
  getFlashDeals(limit?: number): Promise<Product[]>;
  searchProducts(query: string, limit?: number, offset?: number): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, productData: Partial<InsertProduct>): Promise<Product | undefined>;
  
  // Product Image operations
  getProductImages(productId: number): Promise<ProductImage[]>;
  getProductImagesWithBgRemoved(productId: number): Promise<ProductImage[]>;
  createProductImage(image: InsertProductImage): Promise<ProductImage>;
  updateProductImage(id: number, imageData: Partial<InsertProductImage>): Promise<ProductImage | undefined>;
  setMainProductImage(productId: number, imageId: number): Promise<boolean>;
  deleteProductImage(id: number): Promise<boolean>;
  
  // Cart operations
  getCartItems(userId: number): Promise<CartItem[]>;
  getCartItemsWithProducts(userId: number): Promise<(CartItem & { product: Product })[]>;
  addToCart(cartItem: InsertCartItem): Promise<CartItem>;
  updateCartItemQuantity(id: number, quantity: number): Promise<CartItem | undefined>;
  removeFromCart(id: number): Promise<boolean>;
  clearCart(userId: number): Promise<boolean>;
  
  // Order operations
  createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order>;
  getOrdersByUser(userId: number | null): Promise<Order[]>; // null means get all orders (admin only)
  getOrderById(id: number): Promise<(Order & { items: (OrderItem & { product: Product })[] }) | undefined>;
  updateOrderStatus(id: number, status: string): Promise<Order | undefined>;
  
  // AI Recommendation operations
  saveRecommendation(recommendation: InsertAiRecommendation): Promise<AiRecommendation>;
  getRecommendationsForUser(userId: number): Promise<AiRecommendation | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Category operations
  async getAllCategories(): Promise<Category[]> {
    return await db.select().from(categories).where(eq(categories.isActive, true));
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    const [category] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.slug, slug), eq(categories.isActive, true)));
    return category;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  // Product operations
  async getAllProducts(limit = 20, offset = 0): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(eq(products.isActive, true))
      .limit(limit)
      .offset(offset);
  }

  async getProductById(id: number): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.isActive, true)));
    return product;
  }

  async getProductBySlug(slug: string): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.slug, slug), eq(products.isActive, true)));
    return product;
  }

  async getProductsByCategory(categoryId: number, limit = 20, offset = 0): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(and(eq(products.categoryId, categoryId), eq(products.isActive, true)))
      .limit(limit)
      .offset(offset);
  }

  async getFeaturedProducts(limit = 10): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(and(eq(products.isFeatured, true), eq(products.isActive, true)))
      .limit(limit);
  }

  async getFlashDeals(limit = 6): Promise<Product[]> {
    const now = new Date();
    return await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.isFlashDeal, true),
          eq(products.isActive, true),
          sql`${products.flashDealEnd} > ${now}`
        )
      )
      .limit(limit);
  }

  async searchProducts(query: string, limit = 20, offset = 0): Promise<Product[]> {
    const searchTerm = `%${query}%`;
    return await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.isActive, true),
          like(products.name, searchTerm)
        )
      )
      .limit(limit)
      .offset(offset);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: number, productData: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updatedProduct] = await db
      .update(products)
      .set(productData)
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  }

  // Cart operations
  async getCartItems(userId: number): Promise<CartItem[]> {
    return await db
      .select()
      .from(cartItems)
      .where(eq(cartItems.userId, userId));
  }

  async getCartItemsWithProducts(userId: number): Promise<(CartItem & { product: Product })[]> {
    const items = await db
      .select()
      .from(cartItems)
      .where(eq(cartItems.userId, userId));
    
    const result: (CartItem & { product: Product })[] = [];
    
    for (const item of items) {
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, item.productId));
        
      if (product) {
        result.push({
          ...item,
          product
        });
      }
    }
    
    return result;
  }

  async addToCart(cartItem: InsertCartItem): Promise<CartItem> {
    // Check if the item is already in the cart
    const [existingItem] = await db
      .select()
      .from(cartItems)
      .where(
        and(
          eq(cartItems.userId, cartItem.userId),
          eq(cartItems.productId, cartItem.productId)
        )
      );
    
    if (existingItem) {
      // Update quantity
      const [updatedItem] = await db
        .update(cartItems)
        .set({ quantity: existingItem.quantity + cartItem.quantity })
        .where(eq(cartItems.id, existingItem.id))
        .returning();
      return updatedItem;
    } else {
      // Insert new item
      const [newItem] = await db.insert(cartItems).values(cartItem).returning();
      return newItem;
    }
  }

  async updateCartItemQuantity(id: number, quantity: number): Promise<CartItem | undefined> {
    if (quantity <= 0) {
      await db.delete(cartItems).where(eq(cartItems.id, id));
      return undefined;
    }
    
    const [updatedItem] = await db
      .update(cartItems)
      .set({ quantity })
      .where(eq(cartItems.id, id))
      .returning();
    return updatedItem;
  }

  async removeFromCart(id: number): Promise<boolean> {
    const result = await db.delete(cartItems).where(eq(cartItems.id, id));
    return true;
  }

  async clearCart(userId: number): Promise<boolean> {
    const result = await db.delete(cartItems).where(eq(cartItems.userId, userId));
    return true;
  }

  // Order operations
  async createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order> {
    // Create the order
    const [newOrder] = await db.insert(orders).values(order).returning();
    
    // Add order items
    for (const item of items) {
      await db.insert(orderItems).values({
        ...item,
        orderId: newOrder.id
      });
    }
    
    // Clear the cart
    await this.clearCart(order.userId);
    
    return newOrder;
  }

  async getOrdersByUser(userId: number | null): Promise<Order[]> {
    // If userId is null, return all orders (admin function)
    if (userId === null) {
      return await db
        .select()
        .from(orders)
        .orderBy(desc(orders.createdAt));
    }
    
    // Return orders for specific user
    return await db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));
  }

  async getOrderById(id: number): Promise<(Order & { items: (OrderItem & { product: Product })[] }) | undefined> {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id));
    
    if (!order) return undefined;
    
    const orderItemsList = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, id));
    
    const items: (OrderItem & { product: Product })[] = [];
    
    for (const item of orderItemsList) {
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, item.productId));
      
      if (product) {
        items.push({
          ...item,
          product
        });
      }
    }
    
    return {
      ...order,
      items
    };
  }
  
  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    const now = new Date();
    
    // Update the order with the new status and updatedAt timestamp
    const [updatedOrder] = await db
      .update(orders)
      .set({ 
        status, 
        updatedAt: now 
      })
      .where(eq(orders.id, id))
      .returning();
    
    return updatedOrder;
  }
  
  // Product Image operations
  async getProductImages(productId: number): Promise<ProductImage[]> {
    return await db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, productId))
      .orderBy(asc(productImages.sortOrder));
  }

  async getProductImagesWithBgRemoved(productId: number): Promise<ProductImage[]> {
    return await db
      .select()
      .from(productImages)
      .where(
        and(
          eq(productImages.productId, productId),
          eq(productImages.hasBgRemoved, true)
        )
      )
      .orderBy(asc(productImages.sortOrder));
  }

  async createProductImage(image: InsertProductImage): Promise<ProductImage> {
    // If this is marked as main image, unset any existing main image
    if (image.isMain && image.productId) {
      await db
        .update(productImages)
        .set({ isMain: false })
        .where(
          and(
            eq(productImages.productId, image.productId),
            eq(productImages.isMain, true)
          )
        );
    }
    
    const [newImage] = await db.insert(productImages).values(image).returning();
    return newImage;
  }

  async updateProductImage(id: number, imageData: Partial<InsertProductImage>): Promise<ProductImage | undefined> {
    // If this is marked as main image, unset any existing main images
    if (imageData.isMain && imageData.productId) {
      await db
        .update(productImages)
        .set({ isMain: false })
        .where(
          and(
            eq(productImages.productId, imageData.productId),
            eq(productImages.isMain, true),
            sql`${productImages.id} != ${id}`
          )
        );
    }
    
    const [updatedImage] = await db
      .update(productImages)
      .set(imageData)
      .where(eq(productImages.id, id))
      .returning();
    
    return updatedImage;
  }

  async setMainProductImage(productId: number, imageId: number): Promise<boolean> {
    // Unset existing main image
    await db
      .update(productImages)
      .set({ isMain: false })
      .where(
        and(
          eq(productImages.productId, productId),
          eq(productImages.isMain, true)
        )
      );
    
    // Set new main image
    const [updatedImage] = await db
      .update(productImages)
      .set({ isMain: true })
      .where(eq(productImages.id, imageId))
      .returning();
    
    return !!updatedImage;
  }

  async deleteProductImage(id: number): Promise<boolean> {
    const result = await db.delete(productImages).where(eq(productImages.id, id));
    return true;
  }

  // AI Recommendation operations
  async saveRecommendation(recommendation: InsertAiRecommendation): Promise<AiRecommendation> {
    const [newRecommendation] = await db
      .insert(aiRecommendations)
      .values(recommendation)
      .returning();
    return newRecommendation;
  }

  async getRecommendationsForUser(userId: number): Promise<AiRecommendation | undefined> {
    const [recommendation] = await db
      .select()
      .from(aiRecommendations)
      .where(eq(aiRecommendations.userId, userId))
      .orderBy(desc(aiRecommendations.createdAt))
      .limit(1);
    
    return recommendation;
  }
}

export const storage = new DatabaseStorage();
