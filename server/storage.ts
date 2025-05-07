import { 
  users, type User, type InsertUser,
  categories, type Category, type InsertCategory,
  products, type Product, type InsertProduct,
  cartItems, type CartItem, type InsertCartItem,
  orders, type Order, type InsertOrder,
  orderItems, type OrderItem, type InsertOrderItem,
  productImages, type ProductImage, type InsertProductImage,
  aiRecommendations, type AiRecommendation, type InsertAiRecommendation,
  pricing, type Pricing, type InsertPricing,
  aiSettings, type AiSetting, type InsertAiSetting,
  suppliers, type Supplier, type InsertSupplier,
  catalogs, type Catalog, type InsertCatalog,
  categoryAttributes, type CategoryAttribute, type InsertCategoryAttribute,
  categoryAttributeOptions, type CategoryAttributeOption, type InsertCategoryAttributeOption,
  productAttributeValues, type ProductAttributeValue, type InsertProductAttributeValue,
  productAttributeCombinations, type ProductAttributeCombination, type InsertProductAttributeCombination
} from "@shared/schema";
import { db } from "./db";
import { eq, like, and, desc, asc, sql, inArray, isNull, not, or, SQL } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined>;
  
  // Category operations
  getAllCategories(options?: { includeInactive?: boolean, parentId?: number | null, level?: number, orderBy?: 'name' | 'displayOrder' }): Promise<Category[]>;
  getCategoryBySlug(slug: string): Promise<Category | undefined>;
  getCategoryWithChildren(categoryId: number): Promise<{ category: Category, children: Category[] } | undefined>;
  getMainCategoriesWithChildren(): Promise<Array<{ category: Category, children: Category[] }>>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Product operations
  getAllProducts(limit?: number, offset?: number, categoryId?: number, search?: string): Promise<Product[]>;
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

  // Pricing operations
  getPricingByCategoryId(categoryId: number): Promise<Pricing | undefined>;
  getAllPricingSettings(): Promise<Pricing[]>;
  createOrUpdatePricing(pricing: InsertPricing): Promise<Pricing>;
  deletePricing(id: number): Promise<boolean>;
  getDefaultMarkupPercentage(): Promise<number | null>; // Returns default markup or null if not set
  
  // AI Settings operations
  getAiSetting(settingName: string): Promise<AiSetting | undefined>;
  getAllAiSettings(): Promise<AiSetting[]>;
  saveAiSetting(setting: InsertAiSetting): Promise<AiSetting>;
  
  // Supplier operations
  getAllSuppliers(activeOnly?: boolean): Promise<Supplier[]>;
  getSupplierById(id: number): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: number, supplierData: Partial<InsertSupplier>): Promise<Supplier | undefined>;
  deleteSupplier(id: number): Promise<boolean>;
  
  // Catalog operations
  getAllCatalogs(activeOnly?: boolean): Promise<Catalog[]>;
  getCatalogsBySupplierId(supplierId: number, activeOnly?: boolean): Promise<Catalog[]>;
  getCatalogById(id: number): Promise<Catalog | undefined>;
  createCatalog(catalog: InsertCatalog): Promise<Catalog>;
  updateCatalog(id: number, catalogData: Partial<InsertCatalog>): Promise<Catalog | undefined>;
  deleteCatalog(id: number): Promise<boolean>;
  getProductsByCatalogId(catalogId: number, activeOnly?: boolean, limit?: number, offset?: number): Promise<Product[]>;
  bulkUpdateCatalogProducts(catalogId: number, updateData: Partial<InsertProduct>): Promise<number>;
  
  // Category Attribute operations
  getCategoryAttributes(categoryId: number): Promise<CategoryAttribute[]>;
  getCategoryAttributeById(id: number): Promise<CategoryAttribute | undefined>;
  createCategoryAttribute(attribute: InsertCategoryAttribute): Promise<CategoryAttribute>;
  updateCategoryAttribute(id: number, attributeData: Partial<InsertCategoryAttribute>): Promise<CategoryAttribute | undefined>;
  deleteCategoryAttribute(id: number): Promise<boolean>;
  
  // Category Attribute Option operations
  getCategoryAttributeOptions(attributeId: number): Promise<CategoryAttributeOption[]>;
  createCategoryAttributeOption(option: InsertCategoryAttributeOption): Promise<CategoryAttributeOption>;
  updateCategoryAttributeOption(id: number, optionData: Partial<InsertCategoryAttributeOption>): Promise<CategoryAttributeOption | undefined>;
  deleteCategoryAttributeOption(id: number): Promise<boolean>;
  
  // Product Attribute Value operations
  getProductAttributeValues(productId: number): Promise<ProductAttributeValue[]>;
  getProductAttributeValuesByAttributeId(productId: number, attributeId: number): Promise<ProductAttributeValue | undefined>;
  createProductAttributeValue(attributeValue: InsertProductAttributeValue): Promise<ProductAttributeValue>;
  updateProductAttributeValue(id: number, valueData: Partial<InsertProductAttributeValue>): Promise<ProductAttributeValue | undefined>;
  deleteProductAttributeValue(id: number): Promise<boolean>;
  
  // Product Attribute Combination operations
  getProductAttributeCombinations(productId: number): Promise<ProductAttributeCombination[]>;
  getProductAttributeCombinationByHash(productId: number, combinationHash: string): Promise<ProductAttributeCombination | undefined>;
  createProductAttributeCombination(combination: InsertProductAttributeCombination): Promise<ProductAttributeCombination>;
  updateProductAttributeCombination(id: number, combinationData: Partial<InsertProductAttributeCombination>): Promise<ProductAttributeCombination | undefined>;
  deleteProductAttributeCombination(id: number): Promise<boolean>;
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
  async getAllCategories(options?: { includeInactive?: boolean, parentId?: number | null, level?: number, orderBy?: 'name' | 'displayOrder' }): Promise<Category[]> {
    let query = db.select().from(categories);
    
    // Apply filters
    const conditions: SQL<unknown>[] = [];
    
    if (!options?.includeInactive) {
      conditions.push(eq(categories.isActive, true));
    }
    
    if (options?.parentId !== undefined) {
      if (options.parentId === null) {
        conditions.push(isNull(categories.parentId));
      } else {
        conditions.push(eq(categories.parentId, options.parentId));
      }
    }
    
    if (options?.level !== undefined) {
      conditions.push(eq(categories.level, options.level));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    // Apply ordering
    if (options?.orderBy === 'name') {
      query = query.orderBy(asc(categories.name));
    } else {
      // Default to displayOrder if not specified or if displayOrder is specified
      query = query.orderBy(asc(categories.displayOrder), asc(categories.name));
    }
    
    return await query;
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    const [category] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.slug, slug), eq(categories.isActive, true)));
    return category;
  }
  
  async getCategoryWithChildren(categoryId: number): Promise<{ category: Category, children: Category[] } | undefined> {
    // Get the category
    const [category] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.isActive, true)));
    
    if (!category) {
      return undefined;
    }
    
    // Get the children
    const children = await db
      .select()
      .from(categories)
      .where(and(
        eq(categories.parentId, categoryId),
        eq(categories.isActive, true)
      ))
      .orderBy(asc(categories.displayOrder), asc(categories.name));
    
    return { category, children };
  }
  
  async getMainCategoriesWithChildren(): Promise<Array<{ category: Category, children: Category[] }>> {
    // Get all main categories (level 0)
    const mainCategories = await this.getAllCategories({ level: 0 });
    
    // For each main category, get its children
    const result = await Promise.all(
      mainCategories.map(async (category) => {
        const children = await db
          .select()
          .from(categories)
          .where(and(
            eq(categories.parentId, category.id),
            eq(categories.isActive, true)
          ))
          .orderBy(asc(categories.displayOrder), asc(categories.name));
        
        return { category, children };
      })
    );
    
    return result;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  // Product operations
  async getAllProducts(
    limit = 20, 
    offset = 0, 
    categoryId?: number, 
    search?: string
  ): Promise<Product[]> {
    // Create base query
    let baseCondition = eq(products.isActive, true);
    
    // Add category filter if provided
    if (categoryId) {
      baseCondition = and(baseCondition, eq(products.categoryId, categoryId));
    }
    
    // Apply base conditions
    let query = db
      .select()
      .from(products)
      .where(baseCondition);
    
    // Add search condition if provided
    if (search) {
      const searchTerm = `%${search}%`;
      query = query.where(
        or(
          like(products.name, searchTerm),
          like(products.description || '', searchTerm)
        )
      );
    }
    
    return await query.limit(limit).offset(offset);
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
    // Check if the item with same combination is already in the cart
    const query = and(
      eq(cartItems.userId, cartItem.userId),
      eq(cartItems.productId, cartItem.productId)
    );
    
    // Add combination check if a combination is selected
    const fullQuery = cartItem.combinationHash 
      ? and(query, eq(cartItems.combinationHash, cartItem.combinationHash))
      : query;
    
    const [existingItem] = await db
      .select()
      .from(cartItems)
      .where(fullQuery);
    
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
    
    // Add order items with attribute combination data
    for (const item of items) {
      await db.insert(orderItems).values({
        ...item,
        orderId: newOrder.id
      });
      
      // If this item has a combination, update the product's sold count
      if (item.productId) {
        await db
          .update(products)
          .set({
            soldCount: sql`${products.soldCount} + ${item.quantity}`
          })
          .where(eq(products.id, item.productId));
      }
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

  async getOrderById(id: number): Promise<(Order & { items: (OrderItem & { product: Product; attributeDetails?: any })[] }) | undefined> {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id));
    
    if (!order) return undefined;
    
    const orderItemsList = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, id));
    
    const items: (OrderItem & { product: Product; attributeDetails?: any })[] = [];
    
    for (const item of orderItemsList) {
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, item.productId));
      
      if (product) {
        let attributeDetails = undefined;
        
        // If there's a combination, get more details
        if (item.combinationId) {
          const [combination] = await db
            .select()
            .from(productAttributeCombinations)
            .where(eq(productAttributeCombinations.id, item.combinationId));
            
          if (combination) {
            // Get category attributes
            const categoryAttributes = await this.getCategoryAttributes(product.categoryId);
            
            attributeDetails = {
              combination,
              attributes: item.selectedAttributes,
              categoryAttributes
            };
          }
        }
        
        items.push({
          ...item,
          product,
          attributeDetails
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

  // Pricing operations
  async getPricingByCategoryId(categoryId: number): Promise<Pricing | undefined> {
    const [pricingSetting] = await db
      .select()
      .from(pricing)
      .where(eq(pricing.categoryId, categoryId));
    
    return pricingSetting;
  }
  
  async getAllPricingSettings(): Promise<Pricing[]> {
    return await db.select().from(pricing);
  }
  
  async createOrUpdatePricing(pricingData: InsertPricing): Promise<Pricing> {
    // Check if pricing for this category already exists
    const existing = await this.getPricingByCategoryId(pricingData.categoryId);
    
    if (existing) {
      // Update existing pricing
      const [updated] = await db
        .update(pricing)
        .set({
          markupPercentage: pricingData.markupPercentage,
          description: pricingData.description,
          updatedAt: new Date()
        })
        .where(eq(pricing.id, existing.id))
        .returning();
      
      return updated;
    } else {
      // Create new pricing
      const [newPricing] = await db.insert(pricing).values(pricingData).returning();
      return newPricing;
    }
  }
  
  async deletePricing(id: number): Promise<boolean> {
    await db.delete(pricing).where(eq(pricing.id, id));
    return true;
  }
  
  async getDefaultMarkupPercentage(): Promise<number | null> {
    // Look for a special "global default" setting (categoryId = 0 or null)
    const [defaultSetting] = await db
      .select()
      .from(pricing)
      .where(eq(pricing.categoryId, 0));
    
    // Return the markup percentage if found, or null if not found
    return defaultSetting?.markupPercentage || null;
  }

  // AI Settings operations
  async getAiSetting(settingName: string): Promise<AiSetting | undefined> {
    const [setting] = await db
      .select()
      .from(aiSettings)
      .where(eq(aiSettings.settingName, settingName));
    
    return setting;
  }
  
  async getAllAiSettings(): Promise<AiSetting[]> {
    return await db
      .select()
      .from(aiSettings)
      .orderBy(asc(aiSettings.settingName));
  }
  
  async saveAiSetting(setting: InsertAiSetting): Promise<AiSetting> {
    // Check if the setting already exists
    const existingSetting = await this.getAiSetting(setting.settingName);
    
    if (existingSetting) {
      // Update existing setting
      const [updatedSetting] = await db
        .update(aiSettings)
        .set({
          ...setting,
          updatedAt: new Date()
        })
        .where(eq(aiSettings.settingName, setting.settingName))
        .returning();
      
      return updatedSetting;
    } else {
      // Create new setting
      const [newSetting] = await db
        .insert(aiSettings)
        .values(setting)
        .returning();
      
      return newSetting;
    }
  }

  // Supplier operations
  async getAllSuppliers(activeOnly = true): Promise<Supplier[]> {
    if (activeOnly) {
      return await db
        .select()
        .from(suppliers)
        .where(eq(suppliers.isActive, true))
        .orderBy(asc(suppliers.name));
    } else {
      return await db
        .select()
        .from(suppliers)
        .orderBy(asc(suppliers.name));
    }
  }

  async getSupplierById(id: number): Promise<Supplier | undefined> {
    const [supplier] = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, id));
    return supplier;
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const now = new Date();
    const [newSupplier] = await db
      .insert(suppliers)
      .values({
        ...supplier,
        createdAt: now,
        updatedAt: now
      })
      .returning();
    return newSupplier;
  }

  async updateSupplier(id: number, supplierData: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const [updatedSupplier] = await db
      .update(suppliers)
      .set({
        ...supplierData,
        updatedAt: new Date()
      })
      .where(eq(suppliers.id, id))
      .returning();
    return updatedSupplier;
  }

  async deleteSupplier(id: number): Promise<boolean> {
    // We use soft deletion by setting isActive to false
    const [updatedSupplier] = await db
      .update(suppliers)
      .set({ 
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(suppliers.id, id))
      .returning();
    return !!updatedSupplier;
  }

  // Catalog operations
  async getAllCatalogs(activeOnly = true): Promise<any[]> {
    // Get catalogs with supplier information
    const query = activeOnly
      ? db
          .select({
            id: catalogs.id,
            name: catalogs.name,
            description: catalogs.description,
            supplierId: catalogs.supplierId,
            supplierName: suppliers.name,
            isActive: catalogs.isActive,
            defaultMarkupPercentage: catalogs.defaultMarkupPercentage,
            startDate: catalogs.startDate,
            endDate: catalogs.endDate,
            createdAt: catalogs.createdAt
          })
          .from(catalogs)
          .leftJoin(suppliers, eq(catalogs.supplierId, suppliers.id))
          .where(eq(catalogs.isActive, true))
          .orderBy(asc(catalogs.name))
      : db
          .select({
            id: catalogs.id,
            name: catalogs.name,
            description: catalogs.description,
            supplierId: catalogs.supplierId,
            supplierName: suppliers.name,
            isActive: catalogs.isActive,
            defaultMarkupPercentage: catalogs.defaultMarkupPercentage,
            startDate: catalogs.startDate,
            endDate: catalogs.endDate,
            createdAt: catalogs.createdAt
          })
          .from(catalogs)
          .leftJoin(suppliers, eq(catalogs.supplierId, suppliers.id))
          .orderBy(asc(catalogs.name));
    
    const catalogData = await query;
    
    // Add product count and format dates properly
    return catalogData.map(catalog => {
      // Format all dates as ISO strings
      const formattedCatalog = {
        ...catalog,
        startDate: catalog.startDate ? new Date(catalog.startDate).toISOString() : null,
        endDate: catalog.endDate ? new Date(catalog.endDate).toISOString() : null,
        createdAt: catalog.createdAt ? new Date(catalog.createdAt).toISOString() : null,
        productsCount: 0 // Default to 0 until we implement product count functionality
      };
      
      return formattedCatalog;
    });
  }

  async getCatalogsBySupplierId(supplierId: number, activeOnly = true): Promise<any[]> {
    // Get catalogs with supplier information
    const query = activeOnly
      ? db
          .select({
            id: catalogs.id,
            name: catalogs.name,
            description: catalogs.description,
            supplierId: catalogs.supplierId,
            supplierName: suppliers.name,
            isActive: catalogs.isActive,
            defaultMarkupPercentage: catalogs.defaultMarkupPercentage,
            startDate: catalogs.startDate,
            endDate: catalogs.endDate,
            createdAt: catalogs.createdAt
          })
          .from(catalogs)
          .leftJoin(suppliers, eq(catalogs.supplierId, suppliers.id))
          .where(
            and(
              eq(catalogs.supplierId, supplierId),
              eq(catalogs.isActive, true)
            )
          )
          .orderBy(asc(catalogs.name))
      : db
          .select({
            id: catalogs.id,
            name: catalogs.name,
            description: catalogs.description,
            supplierId: catalogs.supplierId,
            supplierName: suppliers.name,
            isActive: catalogs.isActive,
            defaultMarkupPercentage: catalogs.defaultMarkupPercentage,
            startDate: catalogs.startDate,
            endDate: catalogs.endDate,
            createdAt: catalogs.createdAt
          })
          .from(catalogs)
          .leftJoin(suppliers, eq(catalogs.supplierId, suppliers.id))
          .where(eq(catalogs.supplierId, supplierId))
          .orderBy(asc(catalogs.name));
    
    const catalogData = await query;
    
    // Add product count and format dates properly
    return catalogData.map(catalog => {
      // Format all dates as ISO strings
      const formattedCatalog = {
        ...catalog,
        startDate: catalog.startDate ? new Date(catalog.startDate).toISOString() : null,
        endDate: catalog.endDate ? new Date(catalog.endDate).toISOString() : null,
        createdAt: catalog.createdAt ? new Date(catalog.createdAt).toISOString() : null,
        productsCount: 0 // Default to 0 until we implement product count functionality
      };
      
      return formattedCatalog;
    });
  }

  async getCatalogById(id: number): Promise<any | undefined> {
    // Get catalog with supplier information
    const [catalogData] = await db
      .select({
        id: catalogs.id,
        name: catalogs.name,
        description: catalogs.description,
        supplierId: catalogs.supplierId,
        supplierName: suppliers.name,
        isActive: catalogs.isActive,
        defaultMarkupPercentage: catalogs.defaultMarkupPercentage,
        startDate: catalogs.startDate,
        endDate: catalogs.endDate,
        createdAt: catalogs.createdAt,
        updatedAt: catalogs.updatedAt
      })
      .from(catalogs)
      .leftJoin(suppliers, eq(catalogs.supplierId, suppliers.id))
      .where(eq(catalogs.id, id));

    if (!catalogData) return undefined;
    
    // For edit form compatibility, add placeholders and format dates properly
    const catalog = {
      ...catalogData,
      startDate: catalogData.startDate ? new Date(catalogData.startDate).toISOString() : null,
      endDate: catalogData.endDate ? new Date(catalogData.endDate).toISOString() : null,
      freeShipping: false, // Placeholder for freeShipping
      productsCount: 0, // Default product count
      createdAt: catalogData.createdAt ? new Date(catalogData.createdAt).toISOString() : null,
      updatedAt: catalogData.updatedAt ? new Date(catalogData.updatedAt).toISOString() : null
    };
    
    return catalog;
  }

  async createCatalog(catalog: InsertCatalog): Promise<Catalog> {
    const now = new Date();
    
    // Convert startDate and endDate strings to Date objects if provided
    const catalogValues = {
      ...catalog,
      startDate: catalog.startDate ? new Date(catalog.startDate) : null,
      endDate: catalog.endDate ? new Date(catalog.endDate) : null
    };
    
    // Remove createdAt and updatedAt from the payload since these are handled by Drizzle
    delete catalogValues['createdAt'];
    delete catalogValues['updatedAt'];
    
    const [newCatalog] = await db
      .insert(catalogs)
      .values(catalogValues)
      .returning();
    
    return newCatalog;
  }

  async updateCatalog(id: number, catalogData: Partial<InsertCatalog>): Promise<Catalog | undefined> {
    // Convert startDate and endDate strings to Date objects if provided
    const updateValues = {
      ...catalogData,
      startDate: catalogData.startDate ? new Date(catalogData.startDate) : undefined,
      // Handle null explicitly to allow clearing the endDate
      endDate: catalogData.endDate === null 
        ? null 
        : (catalogData.endDate ? new Date(catalogData.endDate) : undefined)
    };
    
    // Remove createdAt and updatedAt from the payload since these are handled by Drizzle
    delete updateValues['createdAt'];
    delete updateValues['updatedAt'];
    
    const [updatedCatalog] = await db
      .update(catalogs)
      .set({
        ...updateValues,
        updatedAt: new Date()
      })
      .where(eq(catalogs.id, id))
      .returning();
    
    return updatedCatalog;
  }

  async deleteCatalog(id: number): Promise<boolean> {
    // We use soft deletion by setting isActive to false
    const [updatedCatalog] = await db
      .update(catalogs)
      .set({ 
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(catalogs.id, id))
      .returning();
    return !!updatedCatalog;
  }

  async getProductsByCatalogId(catalogId: number, activeOnly = true, limit = 20, offset = 0): Promise<Product[]> {
    if (activeOnly) {
      return await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.catalogId, catalogId),
            eq(products.isActive, true)
          )
        )
        .limit(limit)
        .offset(offset);
    } else {
      return await db
        .select()
        .from(products)
        .where(eq(products.catalogId, catalogId))
        .limit(limit)
        .offset(offset);
    }
  }

  async bulkUpdateCatalogProducts(catalogId: number, updateData: Partial<InsertProduct>): Promise<number> {
    // Update all products in a catalog with the provided data
    // Returns number of products updated
    const result = await db
      .update(products)
      .set(updateData)
      .where(eq(products.catalogId, catalogId))
      .returning({ id: products.id });
    
    return result.length;
  }

  // Category Attribute operations
  async getCategoryAttributes(categoryId: number): Promise<CategoryAttribute[]> {
    return await db
      .select()
      .from(categoryAttributes)
      .where(eq(categoryAttributes.categoryId, categoryId))
      .orderBy(asc(categoryAttributes.sortOrder));
  }

  async getCategoryAttributeById(id: number): Promise<CategoryAttribute | undefined> {
    const [attribute] = await db
      .select()
      .from(categoryAttributes)
      .where(eq(categoryAttributes.id, id));
    return attribute;
  }

  async createCategoryAttribute(attribute: InsertCategoryAttribute): Promise<CategoryAttribute> {
    const [newAttribute] = await db
      .insert(categoryAttributes)
      .values(attribute)
      .returning();
    return newAttribute;
  }

  async updateCategoryAttribute(id: number, attributeData: Partial<InsertCategoryAttribute>): Promise<CategoryAttribute | undefined> {
    const [updatedAttribute] = await db
      .update(categoryAttributes)
      .set(attributeData)
      .where(eq(categoryAttributes.id, id))
      .returning();
    return updatedAttribute;
  }

  async deleteCategoryAttribute(id: number): Promise<boolean> {
    // First delete all options for this attribute
    await db
      .delete(categoryAttributeOptions)
      .where(eq(categoryAttributeOptions.attributeId, id));
    
    // Then delete all product attribute values for this attribute
    await db
      .delete(productAttributeValues)
      .where(eq(productAttributeValues.attributeId, id));
    
    // Finally delete the attribute itself
    await db
      .delete(categoryAttributes)
      .where(eq(categoryAttributes.id, id));
    
    return true;
  }

  // Category Attribute Option operations
  async getCategoryAttributeOptions(attributeId: number): Promise<CategoryAttributeOption[]> {
    return await db
      .select()
      .from(categoryAttributeOptions)
      .where(eq(categoryAttributeOptions.attributeId, attributeId))
      .orderBy(asc(categoryAttributeOptions.sortOrder));
  }

  async createCategoryAttributeOption(option: InsertCategoryAttributeOption): Promise<CategoryAttributeOption> {
    const [newOption] = await db
      .insert(categoryAttributeOptions)
      .values(option)
      .returning();
    return newOption;
  }

  async updateCategoryAttributeOption(id: number, optionData: Partial<InsertCategoryAttributeOption>): Promise<CategoryAttributeOption | undefined> {
    const [updatedOption] = await db
      .update(categoryAttributeOptions)
      .set(optionData)
      .where(eq(categoryAttributeOptions.id, id))
      .returning();
    return updatedOption;
  }

  async deleteCategoryAttributeOption(id: number): Promise<boolean> {
    await db
      .delete(categoryAttributeOptions)
      .where(eq(categoryAttributeOptions.id, id));
    return true;
  }

  // Product Attribute Value operations
  async getProductAttributeValues(productId: number): Promise<ProductAttributeValue[]> {
    return await db
      .select()
      .from(productAttributeValues)
      .where(eq(productAttributeValues.productId, productId));
  }

  async getProductAttributeValuesByAttributeId(productId: number, attributeId: number): Promise<ProductAttributeValue | undefined> {
    const [attributeValue] = await db
      .select()
      .from(productAttributeValues)
      .where(
        and(
          eq(productAttributeValues.productId, productId),
          eq(productAttributeValues.attributeId, attributeId)
        )
      );
    return attributeValue;
  }

  async createProductAttributeValue(attributeValue: InsertProductAttributeValue): Promise<ProductAttributeValue> {
    const [newAttributeValue] = await db
      .insert(productAttributeValues)
      .values(attributeValue)
      .returning();
    return newAttributeValue;
  }

  async updateProductAttributeValue(id: number, valueData: Partial<InsertProductAttributeValue>): Promise<ProductAttributeValue | undefined> {
    const [updatedValue] = await db
      .update(productAttributeValues)
      .set(valueData)
      .where(eq(productAttributeValues.id, id))
      .returning();
    return updatedValue;
  }

  async deleteProductAttributeValue(id: number): Promise<boolean> {
    await db
      .delete(productAttributeValues)
      .where(eq(productAttributeValues.id, id));
    return true;
  }

  // Product Attribute Combination operations
  async getProductAttributeCombinations(productId: number): Promise<ProductAttributeCombination[]> {
    return await db
      .select()
      .from(productAttributeCombinations)
      .where(eq(productAttributeCombinations.productId, productId));
  }

  async getProductAttributeCombinationByHash(productId: number, combinationHash: string): Promise<ProductAttributeCombination | undefined> {
    const [combination] = await db
      .select()
      .from(productAttributeCombinations)
      .where(
        and(
          eq(productAttributeCombinations.productId, productId),
          eq(productAttributeCombinations.combinationHash, combinationHash)
        )
      );
    return combination;
  }

  async createProductAttributeCombination(combination: InsertProductAttributeCombination): Promise<ProductAttributeCombination> {
    const [newCombination] = await db
      .insert(productAttributeCombinations)
      .values(combination)
      .returning();
    return newCombination;
  }

  async updateProductAttributeCombination(id: number, combinationData: Partial<InsertProductAttributeCombination>): Promise<ProductAttributeCombination | undefined> {
    const [updatedCombination] = await db
      .update(productAttributeCombinations)
      .set(combinationData)
      .where(eq(productAttributeCombinations.id, id))
      .returning();
    return updatedCombination;
  }

  async deleteProductAttributeCombination(id: number): Promise<boolean> {
    await db
      .delete(productAttributeCombinations)
      .where(eq(productAttributeCombinations.id, id));
    return true;
  }
}

export const storage = new DatabaseStorage();
