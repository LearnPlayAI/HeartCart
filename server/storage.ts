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
  productDrafts, type ProductDraft, type InsertProductDraft,
  // Centralized attribute system imports - we've removed the hierarchy to simplify
  attributes, type Attribute, type InsertAttribute,
  attributeOptions, type AttributeOption, type InsertAttributeOption,
  productAttributes, type ProductAttribute, type InsertProductAttribute
} from "@shared/schema";
import { db } from "./db";
import { eq, like, and, desc, asc, sql, inArray, isNull, not, or, SQL, count } from "drizzle-orm";
import { objectStore, STORAGE_FOLDERS } from "./object-store";
import { logger } from "./logger";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined>;
  updateUserLastLogin(id: number): Promise<boolean>;
  getUserCount(): Promise<number>;
  hashPassword(password: string): Promise<string>;
  getAllUsers(): Promise<User[]>;
  
  // Product Wizard Draft operations
  saveProductDraft(userId: number, draftData: any, step: number, draftId?: string | number, catalogId?: number): Promise<any>;
  getProductDraft(userId: number, draftId: string | number): Promise<any | undefined>;
  getUserProductDrafts(userId: number, catalogId?: number): Promise<any[]>;
  deleteProductDraft(userId: number, draftId: string | number): Promise<boolean>;
  publishProductDraft(userId: number, draftId: string | number): Promise<any>;
  
  // API Testing support methods
  getProductWithSlug(): Promise<Product | undefined>;
  getAllOrders(): Promise<Order[]>;
  getAllCatalogs(): Promise<Catalog[]>;
  getAllAttributes(): Promise<Attribute[]>;
  
  // Session store for authentication testing
  sessionStore: any;
  
  // Category operations
  getAllCategories(options?: { includeInactive?: boolean, parentId?: number | null, level?: number, orderBy?: 'name' | 'displayOrder' }): Promise<Category[]>;
  getCategoryById(id: number, options?: { includeInactive?: boolean }): Promise<Category | undefined>;
  getCategoryBySlug(slug: string, options?: { includeInactive?: boolean }): Promise<Category | undefined>;
  getCategoryWithChildren(categoryId: number, options?: { includeInactive?: boolean }): Promise<{ category: Category, children: Category[] } | undefined>;
  getMainCategoriesWithChildren(options?: { includeInactive?: boolean }): Promise<Array<{ category: Category, children: Category[] }>>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, categoryData: Partial<InsertCategory>): Promise<Category | undefined>;
  updateCategoryDisplayOrder(id: number, displayOrder: number): Promise<Category | undefined>;
  
  // Product operations
  getAllProducts(limit?: number, offset?: number, categoryId?: number, search?: string, options?: { includeInactive?: boolean, includeCategoryInactive?: boolean }): Promise<Product[]>;
  getProductById(id: number, options?: { includeInactive?: boolean, includeCategoryInactive?: boolean }): Promise<Product | undefined>;
  getProductBySlug(slug: string, options?: { includeInactive?: boolean, includeCategoryInactive?: boolean }): Promise<Product | undefined>;
  getProductsByCategory(categoryId: number, limit?: number, offset?: number, options?: { includeInactive?: boolean, includeCategoryInactive?: boolean }): Promise<Product[]>;
  getFeaturedProducts(limit?: number, options?: { includeInactive?: boolean, includeCategoryInactive?: boolean }): Promise<Product[]>;
  getFlashDeals(limit?: number, options?: { includeInactive?: boolean, includeCategoryInactive?: boolean }): Promise<Product[]>;
  searchProducts(query: string, limit?: number, offset?: number, options?: { includeInactive?: boolean, includeCategoryInactive?: boolean }): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, productData: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;
  bulkUpdateProductStatus(productIds: number[], isActive: boolean): Promise<number>;
  
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
  getOrderItems(orderId: number): Promise<(OrderItem & { product: Product })[]>;
  updateOrderStatus(id: number, status: string): Promise<Order | undefined>;
  
  // AI Recommendation operations
  saveRecommendation(recommendation: InsertAiRecommendation): Promise<AiRecommendation>;
  getRecommendationsForUser(userId: number): Promise<AiRecommendation | undefined>;

  // Pricing operations
  getPricingByCategoryId(categoryId: number): Promise<Pricing | undefined>;
  getPricingById(id: number): Promise<Pricing | undefined>;
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
  getProductCountByCatalogId(catalogId: number, includeInactive?: boolean): Promise<number>;
  bulkUpdateCatalogProducts(catalogId: number, updateData: Partial<InsertProduct>): Promise<number>;
  updateProductDisplayOrder(catalogId: number, productIds: number[]): Promise<{ count: number }>;
  
  // Centralized attribute system operations
  // Core attribute operations
  getAllAttributes(): Promise<Attribute[]>;
  getAttributeById(id: number): Promise<Attribute | undefined>;
  getAttributeByName(name: string): Promise<Attribute | undefined>;
  createAttribute(attribute: InsertAttribute): Promise<Attribute>;
  updateAttribute(id: number, attributeData: Partial<InsertAttribute>): Promise<Attribute | undefined>;
  deleteAttribute(id: number): Promise<boolean>;
  
  // Attribute options operations
  getAttributeOptions(attributeId: number): Promise<AttributeOption[]>;
  getAttributeOptionById(id: number): Promise<AttributeOption | undefined>;
  createAttributeOption(option: InsertAttributeOption): Promise<AttributeOption>;
  updateAttributeOption(id: number, optionData: Partial<InsertAttributeOption>): Promise<AttributeOption | undefined>;
  deleteAttributeOption(id: number): Promise<boolean>;
  updateAttributeOptionsOrder(attributeId: number, optionIds: number[]): Promise<boolean>;
  
  // Product attribute operations
  getProductAttributes(productId: number): Promise<(ProductAttribute & { attribute: Attribute })[]>;
  getProductAttributeById(id: number): Promise<(ProductAttribute & { attribute: Attribute }) | undefined>;
  createProductAttribute(productAttribute: InsertProductAttribute): Promise<ProductAttribute>;
  updateProductAttribute(id: number, productAttributeData: Partial<InsertProductAttribute>): Promise<ProductAttribute | undefined>;
  deleteProductAttribute(id: number): Promise<boolean>;
  
  // Product draft operations for database-centric approach
  createProductDraft(draft: InsertProductDraft): Promise<ProductDraft>;
  getProductDraft(id: number): Promise<ProductDraft | undefined>;
  getProductDraftByOriginalId(originalProductId: number): Promise<ProductDraft | undefined>;
  getUserProductDrafts(userId: number): Promise<ProductDraft[]>;
  updateProductDraft(id: number, data: Partial<InsertProductDraft>): Promise<ProductDraft | undefined>;
  updateProductDraftWizardStep(id: number, step: string, data: any): Promise<ProductDraft | undefined>;
  updateProductDraftImages(id: number, imageUrls: string[], imageObjectKeys: string[], mainImageIndex?: number): Promise<ProductDraft | undefined>;
  deleteProductDraftImage(id: number, imageIndex: number): Promise<ProductDraft | undefined>;
  publishProductDraft(id: number): Promise<Product | undefined>;
  deleteProductDraft(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  /**
   * Helper method to enrich products with their main image URL and additional images
   * @param productList The list of products to enrich
   * @returns The enriched product list with imageUrl and additionalImages fields
   */
  private async enrichProductsWithMainImage(productList: Product[]): Promise<Product[]> {
    if (!productList.length) return productList;
    
    // For each product, find its images
    const enrichedProducts = await Promise.all(productList.map(async (product) => {
      // Get all images for this product
      const allImages = await db
        .select()
        .from(productImages)
        .where(eq(productImages.productId, product.id))
        .orderBy(asc(productImages.sortOrder));
        
      if (allImages.length === 0) {
        // No images at all, return product as is
        return product;
      }
      
      // Find the main image
      const mainImage = allImages.find(img => img.isMain);
      
      // Get additional (non-main) images
      const additionalImageUrls = allImages
        .filter(img => !img.isMain)
        .map(img => img.url);
      
      // Return enriched product
      return {
        ...product,
        imageUrl: mainImage ? mainImage.url : allImages[0].url,
        additionalImages: additionalImageUrls.length > 0 ? additionalImageUrls : null
      };
    }));
    
    return enrichedProducts;
  }
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error(`Error fetching user ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user;
    } catch (error) {
      console.error(`Error fetching user by username "${username}":`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user;
    } catch (error) {
      console.error(`Error fetching user by email "${email}":`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      const [newUser] = await db.insert(users).values(user).returning();
      return newUser;
    } catch (error) {
      console.error(`Error creating user with username "${user.username}":`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set(userData)
        .where(eq(users.id, id))
        .returning();
      return updatedUser;
    } catch (error) {
      console.error(`Error updating user ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }
  
  /**
   * Update the user's last login timestamp to the current date/time
   * Used for tracking user activity and session management
   * @param id - The user ID to update
   * @returns A boolean indicating success or failure
   */
  async updateUserLastLogin(id: number): Promise<boolean> {
    try {
      // Update lastLogin timestamp to current time
      const now = new Date();
      
      // Update the user record with new login timestamp
      const result = await db
        .update(users)
        .set({ 
          lastLogin: now,
          updatedAt: now // Also update the general updatedAt field
        })
        .where(eq(users.id, id));
      
      // Check if the update was successful
      // Note: rowCount might be null in some PostgreSQL drivers, so we use a safe check
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      logger.error(`Error updating last login time for user ${id}:`, { 
        error, 
        userId: id,
        timestamp: new Date().toISOString()
      });
      
      // We don't throw the error since this is a non-critical operation
      // Just return false to indicate failure
      return false;
    }
  }

  // Category operations
  async getAllCategories(options?: { includeInactive?: boolean, parentId?: number | null, level?: number, orderBy?: 'name' | 'displayOrder' }): Promise<Category[]> {
    try {
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
    } catch (error) {
      console.error(`Error fetching all categories:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async getCategoryById(id: number, options?: { includeInactive?: boolean }): Promise<Category | undefined> {
    try {
      // Build conditions
      const conditions: SQL<unknown>[] = [eq(categories.id, id)];
      
      // Only filter by isActive if we're not including inactive categories
      if (!options?.includeInactive) {
        conditions.push(eq(categories.isActive, true));
      }
      
      const [category] = await db
        .select()
        .from(categories)
        .where(and(...conditions));
        
      return category;
    } catch (error) {
      console.error(`Error fetching category ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async getCategoryBySlug(slug: string, options?: { includeInactive?: boolean }): Promise<Category | undefined> {
    try {
      // Build conditions
      const conditions: SQL<unknown>[] = [eq(categories.slug, slug)];
      
      // Only filter by isActive if we're not including inactive categories
      if (!options?.includeInactive) {
        conditions.push(eq(categories.isActive, true));
      }
      
      const [category] = await db
        .select()
        .from(categories)
        .where(and(...conditions));
        
      return category;
    } catch (error) {
      console.error(`Error fetching category by slug "${slug}":`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }
  
  async getCategoryWithChildren(categoryId: number, options?: { includeInactive?: boolean }): Promise<{ category: Category, children: Category[] } | undefined> {
    try {
      // Build conditions for parent category
      const categoryConditions: SQL<unknown>[] = [eq(categories.id, categoryId)];
      
      // Only filter by isActive if we're not including inactive categories
      if (!options?.includeInactive) {
        categoryConditions.push(eq(categories.isActive, true));
      }
      
      // Get the category
      const [category] = await db
        .select()
        .from(categories)
        .where(and(...categoryConditions));
      
      if (!category) {
        return undefined;
      }
      
      // Build conditions for children
      const childrenConditions: SQL<unknown>[] = [eq(categories.parentId, categoryId)];
      
      // Only filter by isActive if we're not including inactive categories
      if (!options?.includeInactive) {
        childrenConditions.push(eq(categories.isActive, true));
      }
      
      // Get the children
      const children = await db
        .select()
        .from(categories)
        .where(and(...childrenConditions))
        .orderBy(asc(categories.displayOrder), asc(categories.name));
      
      return { category, children };
    } catch (error) {
      console.error(`Error fetching category ${categoryId} with children:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }
  
  async getMainCategoriesWithChildren(options?: { includeInactive?: boolean }): Promise<Array<{ category: Category, children: Category[] }>> {
    try {
      // Get all main categories (level 0)
      const mainCategories = await this.getAllCategories({ 
        level: 0,
        includeInactive: options?.includeInactive 
      });
      
      // For each main category, get its children
      const result = await Promise.all(
        mainCategories.map(async (category) => {
          try {
            // Build conditions
            const conditions: SQL<unknown>[] = [eq(categories.parentId, category.id)];
            
            // Add visibility condition if not including inactive categories
            if (!options?.includeInactive) {
              conditions.push(eq(categories.isActive, true));
            }
            
            const children = await db
              .select()
              .from(categories)
              .where(and(...conditions))
              .orderBy(asc(categories.displayOrder), asc(categories.name));
            
            return { category, children };
          } catch (childError) {
            console.error(`Error fetching children for category ${category.id}:`, childError);
            // Return the category with an empty children array to avoid failing the entire request
            return { category, children: [] };
          }
        })
      );
      
      return result;
    } catch (error) {
      console.error(`Error fetching main categories with children:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    try {
      const [newCategory] = await db.insert(categories).values(category).returning();
      return newCategory;
    } catch (error) {
      console.error(`Error creating category with name "${category.name}":`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }
  
  async updateCategory(id: number, categoryData: Partial<InsertCategory>): Promise<Category | undefined> {
    try {
      const [updatedCategory] = await db
        .update(categories)
        .set(categoryData)
        .where(eq(categories.id, id))
        .returning();
      return updatedCategory;
    } catch (error) {
      console.error(`Error updating category ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }
  
  async updateCategoryDisplayOrder(id: number, displayOrder: number): Promise<Category | undefined> {
    try {
      return this.updateCategory(id, { displayOrder });
    } catch (error) {
      console.error(`Error updating display order for category ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  // Product operations
  async getAllProducts(
    limit = 20, 
    offset = 0, 
    categoryId?: number, 
    search?: string,
    options?: { includeInactive?: boolean, includeCategoryInactive?: boolean }
  ): Promise<Product[]> {
    try {
      // Create conditions array
      const conditions: SQL<unknown>[] = [];
      
      // Only filter active products if not explicitly including inactive ones
      if (!options?.includeInactive) {
        conditions.push(eq(products.isActive, true));
      }
      
      // Add category filter if provided
      if (categoryId) {
        conditions.push(eq(products.categoryId, categoryId));
        
        // If we're not including products with inactive categories,
        // add a join to check if the category is active
        if (!options?.includeCategoryInactive) {
          try {
            // First get the specified category to check if it's active
            const categoryQuery = db.select()
              .from(categories)
              .where(and(
                eq(categories.id, categoryId),
                eq(categories.isActive, true)
              ));
              
            const [category] = await categoryQuery;
            
            // If category doesn't exist or is inactive, return empty array
            if (!category) {
              return [];
            }
          } catch (categoryError) {
            console.error(`Error checking if category ${categoryId} is active:`, categoryError);
            throw categoryError; // Rethrow so the route handler can catch it and send a proper error response
          }
        }
      } else if (!options?.includeCategoryInactive) {
        try {
          // If we're not filtering by category but we need to exclude products
          // from inactive categories, we need to join with the categories table
          const query = db.select({
            product: products
          })
          .from(products)
          .innerJoin(categories, eq(products.categoryId, categories.id))
          .where(and(
            ...conditions,
            eq(categories.isActive, true)
          ));
          
          // Apply search filter if provided
          if (search) {
            const searchTerm = `%${search}%`;
            query.where(
              or(
                like(products.name, searchTerm),
                like(products.description || '', searchTerm)
              )
            );
          }
          
          const result = await query.limit(limit).offset(offset);
          const productList = result.map(row => row.product);
          
          // Enrich products with main image URLs
          return await this.enrichProductsWithMainImage(productList);
        } catch (joinError) {
          console.error('Error querying products with active categories:', joinError);
          throw joinError; // Rethrow so the route handler can catch it and send a proper error response
        }
      }
      
      // If we got here, we're either including products with inactive categories
      // or we filtered by a specific category that is active
      
      try {
        // Apply base conditions
        let query = db
          .select()
          .from(products);
          
        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }
        
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
        
        const productList = await query.limit(limit).offset(offset);
        
        // Enrich products with main image URLs
        return await this.enrichProductsWithMainImage(productList);
      } catch (queryError) {
        console.error('Error querying products:', queryError);
        throw queryError; // Rethrow so the route handler can catch it and send a proper error response
      }
    } catch (error) {
      console.error(`Error getting all products with filters:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async getProductById(id: number, options?: { includeInactive?: boolean, includeCategoryInactive?: boolean }): Promise<Product | undefined> {
    try {
      // Create conditions array
      const conditions: SQL<unknown>[] = [eq(products.id, id)];
      
      // Only filter active products if not explicitly including inactive ones
      if (!options?.includeInactive) {
        conditions.push(eq(products.isActive, true));
      }
      
      // Get the product
      const [product] = await db
        .select()
        .from(products)
        .where(and(...conditions));
        
      if (!product) {
        return undefined;
      }
      
      // Check category visibility if needed
      if (!options?.includeCategoryInactive) {
        try {
          const [category] = await db
            .select()
            .from(categories)
            .where(and(
              eq(categories.id, product.categoryId),
              eq(categories.isActive, true)
            ));
          
          // If category doesn't exist or is inactive, return undefined
          if (!category) {
            return options?.includeInactive ? product : undefined;
          }
        } catch (categoryError) {
          console.error(`Error checking if category ${product.categoryId} for product ${id} is active:`, categoryError);
          throw categoryError; // Rethrow so the route handler can catch it and send a proper error response
        }
      }
      
      // Enrich product with main image URL
      const enrichedProducts = await this.enrichProductsWithMainImage([product]);
      return enrichedProducts[0];
    } catch (error) {
      console.error(`Error getting product ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async getProductBySlug(slug: string, options?: { includeInactive?: boolean, includeCategoryInactive?: boolean }): Promise<Product | undefined> {
    try {
      // Create conditions array
      const conditions: SQL<unknown>[] = [eq(products.slug, slug)];
      
      // Only filter active products if not explicitly including inactive ones
      if (!options?.includeInactive) {
        conditions.push(eq(products.isActive, true));
      }
      
      // Get the product
      const [product] = await db
        .select()
        .from(products)
        .where(and(...conditions));
        
      if (!product) {
        return undefined;
      }
      
      // Check category visibility if needed
      if (!options?.includeCategoryInactive) {
        try {
          const [category] = await db
            .select()
            .from(categories)
            .where(and(
              eq(categories.id, product.categoryId),
              eq(categories.isActive, true)
            ));
          
          // If category doesn't exist or is inactive, return undefined
          if (!category) {
            return options?.includeInactive ? product : undefined;
          }
        } catch (categoryError) {
          console.error(`Error checking if category ${product.categoryId} for product with slug "${slug}" is active:`, categoryError);
          throw categoryError; // Rethrow so the route handler can catch it and send a proper error response
        }
      }
      
      // Enrich product with main image URL
      const enrichedProducts = await this.enrichProductsWithMainImage([product]);
      return enrichedProducts[0];
    } catch (error) {
      console.error(`Error getting product by slug "${slug}":`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async getProductsByCategory(categoryId: number, limit = 20, offset = 0, options?: { includeInactive?: boolean, includeCategoryInactive?: boolean }): Promise<Product[]> {
    try {
      // Check if the category exists and is active (if needed)
      if (!options?.includeCategoryInactive) {
        try {
          const [category] = await db
            .select()
            .from(categories)
            .where(and(
              eq(categories.id, categoryId),
              eq(categories.isActive, true)
            ));
          
          // If category is inactive or doesn't exist, return empty array
          if (!category) {
            return [];
          }
        } catch (categoryError) {
          console.error(`Error checking if category ${categoryId} is active:`, categoryError);
          throw categoryError; // Rethrow so the route handler can catch it and send a proper error response
        }
      }
      
      try {
        // Create conditions array
        const conditions: SQL<unknown>[] = [eq(products.categoryId, categoryId)];
        
        // Only filter active products if not explicitly including inactive ones
        if (!options?.includeInactive) {
          conditions.push(eq(products.isActive, true));
        }
        
        const productList = await db
          .select()
          .from(products)
          .where(and(...conditions))
          .limit(limit)
          .offset(offset);
          
        // Enrich products with main image URLs
        return await this.enrichProductsWithMainImage(productList);
      } catch (productsError) {
        console.error(`Error fetching products for category ${categoryId}:`, productsError);
        throw productsError; // Rethrow so the route handler can catch it and send a proper error response
      }
    } catch (error) {
      console.error(`Error in getProductsByCategory for category ${categoryId}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async getFeaturedProducts(limit = 10, options?: { includeInactive?: boolean, includeCategoryInactive?: boolean }): Promise<Product[]> {
    try {
      let productList: Product[] = [];
      
      if (!options?.includeCategoryInactive) {
        try {
          // For featured products, we need to join with categories to check if category is active
          const query = db.select({
            product: products
          })
          .from(products)
          .innerJoin(categories, eq(products.categoryId, categories.id))
          .where(and(
            eq(products.isFeatured, true),
            options?.includeInactive ? sql`1=1` : eq(products.isActive, true),
            eq(categories.isActive, true)
          ))
          .limit(limit);
          
          const result = await query;
          productList = result.map(row => row.product);
        } catch (joinError) {
          console.error('Error fetching featured products with active categories:', joinError);
          throw joinError; // Rethrow so the route handler can catch it and send a proper error response
        }
      } else {
        try {
          // If we don't need to check category visibility, use simpler query
          productList = await db
            .select()
            .from(products)
            .where(and(
              eq(products.isFeatured, true),
              options?.includeInactive ? sql`1=1` : eq(products.isActive, true)
            ))
            .limit(limit);
        } catch (queryError) {
          console.error('Error fetching featured products:', queryError);
          throw queryError; // Rethrow so the route handler can catch it and send a proper error response
        }
      }
      
      // Enrich products with main image URLs
      return await this.enrichProductsWithMainImage(productList);
    } catch (error) {
      console.error('Error in getFeaturedProducts:', error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async getFlashDeals(limit = 6, options?: { includeInactive?: boolean, includeCategoryInactive?: boolean }): Promise<Product[]> {
    try {
      const now = new Date();
      let productList: Product[] = [];
      
      if (!options?.includeCategoryInactive) {
        try {
          // For flash deals, we need to join with categories to check if category is active
          const query = db.select({
            product: products
          })
          .from(products)
          .innerJoin(categories, eq(products.categoryId, categories.id))
          .where(and(
            eq(products.isFlashDeal, true),
            options?.includeInactive ? sql`1=1` : eq(products.isActive, true),
            eq(categories.isActive, true),
            sql`${products.flashDealEnd} > ${now}`
          ))
          .limit(limit);
          
          const result = await query;
          productList = result.map(row => row.product);
        } catch (joinError) {
          console.error('Error fetching flash deals with active categories:', joinError);
          throw joinError; // Rethrow so the route handler can catch it and send a proper error response
        }
      } else {
        try {
          // If we don't need to check category visibility, use simpler query
          productList = await db
            .select()
            .from(products)
            .where(and(
              eq(products.isFlashDeal, true),
              options?.includeInactive ? sql`1=1` : eq(products.isActive, true),
              sql`${products.flashDealEnd} > ${now}`
            ))
            .limit(limit);
        } catch (queryError) {
          console.error('Error fetching flash deals:', queryError);
          throw queryError; // Rethrow so the route handler can catch it and send a proper error response
        }
      }
      
      // Enrich products with main image URLs
      return await this.enrichProductsWithMainImage(productList);
    } catch (error) {
      console.error('Error in getFlashDeals:', error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async searchProducts(query: string, limit = 20, offset = 0, options?: { includeInactive?: boolean, includeCategoryInactive?: boolean }): Promise<Product[]> {
    try {
      const searchTerm = `%${query}%`;
      let productList: Product[] = [];
      
      if (!options?.includeCategoryInactive) {
        try {
          // For search, we need to join with categories to check if category is active
          const searchQuery = db.select({
            product: products
          })
          .from(products)
          .innerJoin(categories, eq(products.categoryId, categories.id))
          .where(and(
            options?.includeInactive ? sql`1=1` : eq(products.isActive, true),
            eq(categories.isActive, true),
            like(products.name, searchTerm)
          ))
          .limit(limit)
          .offset(offset);
          
          const result = await searchQuery;
          productList = result.map(row => row.product);
        } catch (joinError) {
          console.error(`Error searching products with active categories for query "${query}":`, joinError);
          throw joinError; // Rethrow so the route handler can catch it and send a proper error response
        }
      } else {
        try {
          // If we don't need to check category visibility, use simpler query
          productList = await db
            .select()
            .from(products)
            .where(and(
              options?.includeInactive ? sql`1=1` : eq(products.isActive, true),
              like(products.name, searchTerm)
            ))
            .limit(limit)
            .offset(offset);
        } catch (queryError) {
          console.error(`Error searching products for query "${query}":`, queryError);
          throw queryError; // Rethrow so the route handler can catch it and send a proper error response
        }
      }
      
      // Enrich products with main image URLs
      return await this.enrichProductsWithMainImage(productList);
    } catch (error) {
      console.error(`Error in searchProducts for query "${query}":`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    try {
      const [newProduct] = await db.insert(products).values(product).returning();
      return newProduct;
    } catch (error) {
      console.error(`Error creating product "${product.name}":`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }
  
  /**
   * Creates a product using the enhanced wizard fields and functionality
   * This method handles all the additional fields introduced in the new product wizard
   */
  async createProductWithWizard(product: InsertProduct): Promise<Product> {
    try {
      // Use a transaction to ensure all operations succeed or fail together
      const createdProduct = await db.transaction(async (tx) => {
        // Add created_at timestamp if not specified
        if (!product.created_at) {
          product.created_at = new Date();
        }
        
        // Insert the product with all wizard fields
        const [createdProductRecord] = await tx.insert(products).values(product).returning();
        
        if (!createdProductRecord) {
          throw new Error('Failed to create product');
        }
        
        // Process images if they were provided via the wizard
        if (Array.isArray(product.imageObjectKeys) && product.imageObjectKeys.length > 0) {
          logger.debug(`Processing ${product.imageObjectKeys.length} product images`, {
            productId: createdProductRecord.id,
            imageCount: product.imageObjectKeys.length
          });
          
          // Extract main image index (defaulting to 0 if not specified)
          const mainImageIndex = typeof product.mainImageIndex === 'number' ? 
            product.mainImageIndex : 0;
          
          // Process each image
          for (let i = 0; i < product.imageObjectKeys.length; i++) {
            const objectKey = product.imageObjectKeys[i];
            const imageUrl = Array.isArray(product.imageUrls) && i < product.imageUrls.length ? 
              product.imageUrls[i] : null;
              
            // If this is the main image, use it for the product's main image URL
            const isMainImage = i === mainImageIndex;
            
            try {
              // Create product image record in database
              const imageRecord = await this.createProductImage({
                productId: createdProductRecord.id,
                url: imageUrl || `/api/files/${objectKey}`,
                objectKey: objectKey,
                isMain: isMainImage,
                sortOrder: i,
                hasBgRemoved: false,
                bgRemovedUrl: null,
                bgRemovedObjectKey: null,
                created_at: new Date()
              });
              
              // If this is the main image, update the product record
              if (isMainImage && imageRecord) {
                // Update product's main image URL
                await tx.update(products)
                  .set({ 
                    image_url: imageRecord.url,
                    original_image_object_key: imageRecord.objectKey
                  })
                  .where(eq(products.id, createdProductRecord.id));
                  
                // Also update our local copy of the record
                createdProductRecord.image_url = imageRecord.url;
                createdProductRecord.original_image_object_key = imageRecord.objectKey;
              }
              
              logger.debug(`Created product image record`, { 
                productId: createdProductRecord.id, 
                imageUrl: imageUrl, 
                isMain: isMainImage
              });
            } catch (imageError) {
              logger.error(`Error creating product image record`, {
                error: imageError,
                productId: createdProductRecord.id,
                objectKey: objectKey
              });
            }
          }
        }
        
        // Handle required attributes if specified
        if (product.requiredAttributeIds && product.requiredAttributeIds.length > 0) {
          logger.debug(`Setting required attributes for product ${createdProductRecord.id}:`, {
            attributes: product.requiredAttributeIds
          });
          
          // Update product attributes to mark them as required
          for (const attributeId of product.requiredAttributeIds) {
            const existingAttr = await tx.query.productAttributes.findFirst({
              where: eq(productAttributes.productId, createdProductRecord.id) && eq(productAttributes.attributeId, attributeId)
            });
            
            if (existingAttr) {
              // Update existing attribute to be required
              await tx.update(productAttributes)
                .set({ isRequired: true })
                .where(eq(productAttributes.id, existingAttr.id));
            }
          }
        }
        
        // Handle special sale configuration if specified
        if (product.specialSaleText && (product.specialSaleStart || product.specialSaleEnd)) {
          logger.debug(`Setting special sale for product ${createdProductRecord.id}:`, {
            text: product.specialSaleText,
            start: product.specialSaleStart,
            end: product.specialSaleEnd
          });
        }
        
        return createdProductRecord;
      });
      
      // Now that the product is created, handle image movement outside the transaction
      // (This is done outside the transaction to prevent long-running transactions for file operations)
      if (createdProduct) {
        // Get the category information for proper path construction
        const category = createdProduct.categoryId 
          ? await this.getCategoryById(createdProduct.categoryId) 
          : null;
        
        // Get catalog information if this product is part of a catalog
        const catalog = product.catalogId 
          ? await this.getCatalogById(product.catalogId) 
          : null;
        
        // Get supplier information if catalog exists
        const supplier = catalog?.supplierId 
          ? await this.getSupplierById(catalog.supplierId) 
          : null;
        
        // Only proceed with image relocation if we have image data in the request
        if (Array.isArray(product.imageObjectKeys) && product.imageObjectKeys.length > 0) {
          logger.info(`Moving ${product.imageObjectKeys.length} images for product ${createdProduct.id}`, {
            productId: createdProduct.id,
            imageCount: product.imageObjectKeys.length
          });
          
          // Process each image
          for (let i = 0; i < product.imageObjectKeys.length; i++) {
            const sourceKey = product.imageObjectKeys[i];
            const imageUrl = product.imageUrls[i];
            
            if (!sourceKey || !imageUrl) continue;
            
            try {
              // Determine if this is the main product image
              const isMainImage = product.mainImageIndex === i;
              
              // Move the file to its final location with the expected folder structure
              const result = await objectStore.moveToFinalLocation(
                sourceKey,
                supplier ? supplier.name : 'unsorted',
                catalog ? catalog.name : 'uncategorized',
                category ? category.name : 'uncategorized',
                createdProduct.name,
                createdProduct.id
              );
              
              // Store image information in the database
              await this.createProductImage({
                productId: createdProduct.id,
                url: result.url,
                objectKey: result.objectKey,
                isMain: isMainImage,
                sortOrder: i
              });
              
              logger.debug(`Moved product image to final location`, {
                productId: createdProduct.id,
                from: sourceKey,
                to: result.objectKey,
                isMain: isMainImage
              });
            } catch (imageError) {
              // Log error but continue with other images
              logger.error(`Error moving image for product ${createdProduct.id}:`, {
                sourceKey,
                productId: createdProduct.id,
                error: imageError
              });
            }
          }
        }
      }
      
      return createdProduct;
    } catch (error) {
      logger.error(`Error creating product with wizard "${product.name}":`, { error });
      throw error;
    }
  }
  
  /**
   * Saves a product draft for the wizard auto-save functionality
   * Creates a new draft if draftId is not provided, otherwise updates the existing draft
   */
  async saveProductDraft(userId: number, draftData: any, step: number, draftId?: string, catalogId?: number): Promise<any> {
    try {
      const randomDraftId = draftId || `draft_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      // Check if draft already exists
      const existingDraft = draftId 
        ? await db.query.productDrafts.findFirst({
            where: and(
              eq(productDrafts.userId, userId),
              eq(productDrafts.draftId, draftId)
            )
          })
        : null;
        
      if (existingDraft) {
        // Update existing draft
        const [updatedDraft] = await db
          .update(productDrafts)
          .set({
            data: draftData,
            step: step,
            catalogId: catalogId || existingDraft.catalogId,
            updatedAt: new Date()
          })
          .where(eq(productDrafts.id, existingDraft.id))
          .returning();
        
        return updatedDraft;
      } else {
        // Create new draft
        const [newDraft] = await db
          .insert(productDrafts)
          .values({
            userId: userId,
            draftId: randomDraftId,
            catalogId: catalogId,
            step: step,
            data: draftData
          })
          .returning();
        
        return newDraft;
      }
    } catch (error) {
      logger.error('Error saving product draft', { userId, draftId, error });
      throw new Error(`Failed to save product draft: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Gets a specific product draft by its draft ID
   */
  async getProductDraft(userId: number, draftId: string): Promise<any | undefined> {
    try {
      const draft = await db.query.productDrafts.findFirst({
        where: and(
          eq(productDrafts.userId, userId),
          eq(productDrafts.draftId, draftId)
        )
      });
      
      return draft;
    } catch (error) {
      logger.error('Error retrieving product draft', { userId, draftId, error });
      throw new Error(`Failed to retrieve product draft: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Gets all product drafts for a specific user, optionally filtered by catalog
   */
  /* Deprecated - use the implementation at line ~4834 instead */
  async getUserProductDraftsOld(userId: number, catalogId?: number): Promise<any[]> {
    logger.warn('Deprecated getUserProductDrafts function called - use newer implementation');
    try {
      return await storage.getUserProductDrafts(userId);
    } catch (error) {
      logger.error('Error retrieving user product drafts (old method)', { userId, catalogId, error });
      throw new Error(`Failed to retrieve user product drafts: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Deletes a product draft
   */
  async deleteProductDraft(userId: number, draftId: string): Promise<boolean> {
    try {
      await db
        .delete(productDrafts)
        .where(
          and(
            eq(productDrafts.userId, userId),
            eq(productDrafts.draftId, draftId)
          )
        );
      
      return true;
    } catch (error) {
      logger.error('Error deleting product draft', { userId, draftId, error });
      throw new Error(`Failed to delete product draft: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async updateProduct(id: number, productData: Partial<InsertProduct>): Promise<Product | undefined> {
    try {
      // Check if the product exists and get its current catalogId
      const [existingProduct] = await db
        .select()
        .from(products)
        .where(eq(products.id, id));
      
      if (!existingProduct) {
        return undefined;
      }
      
      // If catalogId is not provided in the update data but exists in the current product,
      // preserve it to ensure catalog assignments are not lost during updates
      if (productData.catalogId === undefined && existingProduct.catalogId !== null) {
        productData.catalogId = existingProduct.catalogId;
      }
      
      const [updatedProduct] = await db
        .update(products)
        .set(productData)
        .where(eq(products.id, id))
        .returning();
        
      return updatedProduct;
    } catch (error) {
      console.error(`Error updating product with ID ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  // Cart operations
  async getCartItemById(id: number): Promise<CartItem | undefined> {
    try {
      const [item] = await db
        .select()
        .from(cartItems)
        .where(eq(cartItems.id, id));
      
      logger.debug(`Retrieved cart item by ID`, {
        cartItemId: id,
        found: !!item
      });
      
      return item;
    } catch (error) {
      logger.error(`Error fetching cart item`, {
        error,
        cartItemId: id
      });
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }
  
  async getCartItems(userId: number): Promise<CartItem[]> {
    try {
      const items = await db
        .select()
        .from(cartItems)
        .where(eq(cartItems.userId, userId));
      
      logger.debug(`Retrieved cart items for user`, {
        userId,
        itemCount: items.length
      });
      
      return items;
    } catch (error) {
      logger.error(`Error fetching cart items for user`, {
        error,
        userId
      });
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async getCartItemsWithProducts(userId: number): Promise<(CartItem & { product: Product })[]> {
    try {
      const items = await db
        .select()
        .from(cartItems)
        .where(eq(cartItems.userId, userId));
      
      logger.debug(`Retrieved cart items for retrieval with products`, {
        userId,
        itemCount: items.length
      });
      
      const result: (CartItem & { product: Product })[] = [];
      
      for (const item of items) {
        try {
          const [product] = await db
            .select()
            .from(products)
            .where(eq(products.id, item.productId));
            
          if (product) {
            try {
              // Enrich product with main image URL
              const enrichedProducts = await this.enrichProductsWithMainImage([product]);
              
              result.push({
                ...item,
                product: enrichedProducts[0]
              });
              
              logger.debug(`Added product to cart results`, {
                cartItemId: item.id,
                productId: product.id,
                productName: product.name
              });
            } catch (enrichError) {
              logger.error(`Error enriching product with images for cart item`, {
                error: enrichError,
                productId: product.id,
                cartItemId: item.id
              });
              // Continue to next item but don't rethrow as we want to return whatever items we successfully retrieved
            }
          } else {
            logger.warn(`Product not found for cart item`, {
              cartItemId: item.id,
              productId: item.productId
            });
          }
        } catch (productError) {
          logger.error(`Error fetching product for cart item`, {
            error: productError,
            productId: item.productId,
            cartItemId: item.id
          });
          // Continue to next item but don't rethrow as we want to return whatever items we successfully retrieved
        }
      }
      
      logger.debug(`Completed cart items with products retrieval`, {
        userId,
        totalItems: result.length
      });
      
      return result;
    } catch (error) {
      logger.error(`Error retrieving cart items with products`, {
        error,
        userId
      });
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async addToCart(cartItem: InsertCartItem): Promise<CartItem> {
    try {
      // Check if the item with same combination is already in the cart
      const query = and(
        eq(cartItems.userId, cartItem.userId),
        eq(cartItems.productId, cartItem.productId)
      );
      
      // Add combination check if a combination is selected
      const fullQuery = cartItem.combinationHash 
        ? and(query, eq(cartItems.combinationHash, cartItem.combinationHash))
        : query;
      
      try {
        const [existingItem] = await db
          .select()
          .from(cartItems)
          .where(fullQuery);
        
        if (existingItem) {
          try {
            // Update quantity
            const newQuantity = existingItem.quantity + (cartItem.quantity || 1);
            
            const [updatedItem] = await db
              .update(cartItems)
              .set({ quantity: newQuantity })
              .where(eq(cartItems.id, existingItem.id))
              .returning();
              
            logger.info(`Updated quantity for existing cart item`, {
              cartItemId: existingItem.id,
              productId: cartItem.productId,
              userId: cartItem.userId,
              oldQuantity: existingItem.quantity,
              newQuantity: newQuantity
            });
              
            return updatedItem;
          } catch (updateError) {
            logger.error(`Error updating quantity for existing cart item`, {
              error: updateError,
              cartItemId: existingItem.id,
              productId: cartItem.productId,
              userId: cartItem.userId
            });
            throw updateError; // Rethrow so the route handler can catch it and send a proper error response
          }
        } else {
          try {
            // Set default quantity if not provided
            const itemToInsert = {
              ...cartItem,
              quantity: cartItem.quantity || 1
            };
            
            // Insert new item
            const [newItem] = await db.insert(cartItems).values(itemToInsert).returning();
            
            logger.info(`Added new item to cart`, {
              cartItemId: newItem.id,
              productId: cartItem.productId,
              userId: cartItem.userId,
              quantity: itemToInsert.quantity,
              hasCombination: !!cartItem.combinationHash
            });
            
            return newItem;
          } catch (insertError) {
            logger.error(`Error inserting new item into cart`, {
              error: insertError,
              productId: cartItem.productId,
              userId: cartItem.userId
            });
            throw insertError; // Rethrow so the route handler can catch it and send a proper error response
          }
        }
      } catch (queryError) {
        logger.error(`Error checking if item already exists in cart`, {
          error: queryError,
          userId: cartItem.userId,
          productId: cartItem.productId
        });
        throw queryError; // Rethrow so the route handler can catch it and send a proper error response
      }
    } catch (error) {
      logger.error(`Error adding item to cart`, {
        error,
        userId: cartItem.userId,
        productId: cartItem.productId
      });
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async updateCartItemQuantity(id: number, quantity: number): Promise<CartItem | undefined> {
    try {
      // First, retrieve the cart item to check if it exists and to log the original quantity
      try {
        const [cartItem] = await db
          .select()
          .from(cartItems)
          .where(eq(cartItems.id, id));
        
        if (!cartItem) {
          logger.warn(`Attempted to update non-existent cart item`, {
            cartItemId: id,
            requestedQuantity: quantity
          });
          return undefined;
        }
        
        if (quantity <= 0) {
          try {
            await db.delete(cartItems).where(eq(cartItems.id, id));
            
            logger.info(`Deleted cart item due to zero quantity`, {
              cartItemId: id,
              productId: cartItem.productId,
              userId: cartItem.userId,
              previousQuantity: cartItem.quantity
            });
            
            return undefined;
          } catch (deleteError) {
            logger.error(`Error deleting cart item with zero quantity`, {
              error: deleteError,
              cartItemId: id,
              quantity
            });
            throw deleteError; // Rethrow so the route handler can catch it and send a proper error response
          }
        }
        
        try {
          const [updatedItem] = await db
            .update(cartItems)
            .set({ quantity })
            .where(eq(cartItems.id, id))
            .returning();
          
          logger.info(`Updated cart item quantity`, {
            cartItemId: id,
            productId: cartItem.productId,
            userId: cartItem.userId,
            previousQuantity: cartItem.quantity,
            newQuantity: quantity
          });
          
          return updatedItem;
        } catch (updateError) {
          logger.error(`Error updating quantity for cart item`, {
            error: updateError,
            cartItemId: id,
            quantity,
            productId: cartItem.productId
          });
          throw updateError; // Rethrow so the route handler can catch it and send a proper error response
        }
      } catch (fetchError) {
        logger.error(`Error fetching cart item before quantity update`, {
          error: fetchError,
          cartItemId: id
        });
        throw fetchError;
      }
    } catch (error) {
      logger.error(`Error in cart item quantity update operation`, {
        error,
        cartItemId: id,
        requestedQuantity: quantity
      });
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async removeFromCart(id: number): Promise<boolean> {
    try {
      // First retrieve the cart item for logging purposes
      try {
        const [cartItem] = await db
          .select()
          .from(cartItems)
          .where(eq(cartItems.id, id));
        
        if (!cartItem) {
          logger.warn(`Attempted to remove non-existent cart item`, {
            cartItemId: id
          });
          return true; // Return success as idempotent operation (item already gone)
        }
        
        // Proceed with deletion
        await db.delete(cartItems).where(eq(cartItems.id, id));
        
        logger.info(`Removed item from cart`, {
          cartItemId: id,
          productId: cartItem.productId,
          userId: cartItem.userId,
          quantity: cartItem.quantity
        });
        
        return true;
      } catch (fetchError) {
        logger.error(`Error fetching cart item before removal`, {
          error: fetchError,
          cartItemId: id
        });
        throw fetchError;
      }
    } catch (error) {
      logger.error(`Error removing item from cart`, {
        error,
        cartItemId: id
      });
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async clearCart(userId: number): Promise<boolean> {
    try {
      // First check if user has any items in cart (for better logging)
      try {
        const items = await db
          .select()
          .from(cartItems)
          .where(eq(cartItems.userId, userId));
        
        const itemCount = items.length;
        
        // Delete all cart items for this user
        await db.delete(cartItems).where(eq(cartItems.userId, userId));
        
        logger.info(`Cleared user's cart`, {
          userId,
          itemCount,
          cartItemIds: items.map(item => item.id)
        });
        
        return true;
      } catch (deleteError) {
        logger.error(`Error deleting items during cart clear operation`, {
          error: deleteError,
          userId
        });
        throw deleteError;
      }
    } catch (error) {
      logger.error(`Error clearing cart`, {
        error,
        userId
      });
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  /**
   * Get all order items for a specific order with product details
   * @param orderId The ID of the order to get items for
   * @returns Array of order items with product details
   */
  async getOrderItems(orderId: number): Promise<(OrderItem & { product: Product })[]> {
    try {
      // Get order items with product details
      const items = await db
        .select({
          orderItem: orderItems,
          product: products
        })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(eq(orderItems.orderId, orderId));
      
      // Map the result to get the structure we want
      return items.map(row => ({
        ...row.orderItem,
        product: row.product
      }));
    } catch (error) {
      console.error(`Error fetching order items for order ${orderId}:`, error);
      throw error; // Rethrow for proper error handling in the route
    }
  }
  
  // Order operations
  async createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order> {
    try {
      // Create the order
      try {
        const [newOrder] = await db.insert(orders).values(order).returning();
        
        logger.info(`Created new order`, {
          orderId: newOrder.id,
          userId: order.userId,
          status: order.status,
          itemCount: items.length,
          totalAmount: order.totalAmount
        });
        
        // Add order items with attribute combination data
        let successfulItemInserts = 0;
        let failedItemInserts = 0;
        
        for (const item of items) {
          try {
            const [orderItem] = await db.insert(orderItems).values({
              ...item,
              orderId: newOrder.id
            }).returning();
            
            successfulItemInserts++;
            
            logger.debug(`Added item to order`, {
              orderId: newOrder.id,
              orderItemId: orderItem.id,
              productId: item.productId,
              quantity: item.quantity,
              price: item.price
            });
            
            // If this item has a productId, update the product's sold count
            if (item.productId) {
              try {
                await db
                  .update(products)
                  .set({
                    soldCount: sql`${products.soldCount} + ${item.quantity}`
                  })
                  .where(eq(products.id, item.productId));
                  
                logger.debug(`Updated product sold count`, {
                  orderId: newOrder.id,
                  productId: item.productId,
                  quantitySold: item.quantity
                });
              } catch (updateError) {
                logger.error(`Error updating sold count for product`, {
                  error: updateError,
                  orderId: newOrder.id,
                  productId: item.productId,
                  quantity: item.quantity
                });
                // Continue processing other items instead of halting the entire order process
              }
            }
          } catch (itemError) {
            failedItemInserts++;
            logger.error(`Error inserting order item`, {
              error: itemError,
              orderId: newOrder.id,
              productId: item.productId,
              itemIndex: successfulItemInserts + failedItemInserts - 1
            });
            // Continue processing other items instead of halting the entire order process
          }
        }
        
        if (failedItemInserts > 0) {
          logger.warn(`Some order items failed to insert`, {
            orderId: newOrder.id,
            successCount: successfulItemInserts,
            failCount: failedItemInserts,
            totalItems: items.length
          });
        }
        
        // Clear the cart
        try {
          if (order.userId) {
            await this.clearCart(order.userId);
            logger.info(`Cleared cart after order creation`, {
              orderId: newOrder.id,
              userId: order.userId
            });
          }
        } catch (cartError) {
          logger.error(`Error clearing cart after order creation`, {
            error: cartError,
            orderId: newOrder.id,
            userId: order.userId
          });
          // Don't throw here as the order is already created
        }
        
        return newOrder;
      } catch (orderInsertError) {
        logger.error(`Error creating new order`, {
          error: orderInsertError,
          userId: order.userId,
          totalAmount: order.totalAmount,
          itemCount: items.length
        });
        throw orderInsertError; // Rethrow so the route handler can catch it and send a proper error response
      }
    } catch (error) {
      logger.error(`Error in order creation process`, {
        error,
        userId: order.userId
      });
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async getOrdersByUser(userId: number | null): Promise<Order[]> {
    try {
      // If userId is null, return all orders (admin function)
      if (userId === null) {
        try {
          const results = await db
            .select()
            .from(orders)
            .orderBy(desc(orders.createdAt));
          
          logger.info(`Retrieved all orders for admin view`, {
            count: results.length
          });
          
          return results;
        } catch (adminOrdersError) {
          logger.error(`Error fetching all orders (admin function)`, {
            error: adminOrdersError
          });
          throw adminOrdersError; // Rethrow so the route handler can catch it and send a proper error response
        }
      }
      
      // Return orders for specific user
      try {
        const results = await db
          .select()
          .from(orders)
          .where(eq(orders.userId, userId))
          .orderBy(desc(orders.createdAt));
        
        logger.info(`Retrieved orders for user`, {
          userId,
          count: results.length
        });
        
        return results;
      } catch (userOrdersError) {
        logger.error(`Error fetching orders for user`, {
          error: userOrdersError,
          userId
        });
        throw userOrdersError; // Rethrow so the route handler can catch it and send a proper error response
      }
    } catch (error) {
      logger.error(`Error in order retrieval process`, {
        error,
        userType: userId === null ? 'admin' : 'user',
        userId
      });
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async getOrderById(id: number): Promise<(Order & { items: (OrderItem & { product: Product; attributeDetails?: any })[] }) | undefined> {
    try {
      // Get the order
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, id));
      
      if (!order) {
        logger.warn(`Order not found`, { orderId: id });
        return undefined;
      }
      
      logger.debug(`Retrieved order details`, {
        orderId: id,
        userId: order.userId,
        status: order.status,
        createdAt: order.createdAt
      });
      
      try {
        // Use the getOrderItems method to fetch items with products
        const itemsWithProducts = await this.getOrderItems(id);
        
        logger.debug(`Retrieved order items using getOrderItems method`, {
          orderId: id,
          itemCount: itemsWithProducts.length
        });
        
        const items: (OrderItem & { product: Product; attributeDetails?: any })[] = [];
        let successfulItemLoads = 0;
        let failedItemLoads = 0;
        
        // Process each item to add attribute details if needed
        for (const item of itemsWithProducts) {
          try {
            let attributeDetails = undefined;
            
            // If there are selected attributes, add them to attributeDetails
            if (item.selectedAttributes) {
              try {
                attributeDetails = {
                  attributes: item.selectedAttributes,
                  combinationHash: item.combinationHash
                };
                
                logger.debug(`Retrieved attribute details for order item`, {
                  orderId: id,
                  orderItemId: item.id,
                  productId: item.productId,
                  combinationHash: item.combinationHash
                });
              } catch (attributeError) {
                logger.error(`Error processing attribute details for order item`, {
                  error: attributeError,
                  orderId: id,
                  orderItemId: item.id
                });
                // Continue without attribute details
              }
            }
            
            // Add the item with attribute details
            items.push({
              ...item,
              attributeDetails
            });
            
            successfulItemLoads++;
            
          } catch (itemError) {
            failedItemLoads++;
            logger.error(`Error processing order item details`, {
              error: itemError,
              orderId: id,
              orderItemId: item.id
            });
            
            // Still add the basic item without additional processing
            items.push(item);
          }
        }
        
        if (failedItemLoads > 0) {
          logger.warn(`Some order items failed to load completely`, {
            orderId: id,
            successCount: successfulItemLoads,
            failCount: failedItemLoads,
            totalItems: itemsWithProducts.length
          });
        }
        
        logger.info(`Completed order details retrieval`, {
          orderId: id,
          itemCount: items.length
        });
        
        return {
          ...order,
          items
        };
      } catch (itemsError) {
        logger.error(`Error fetching order items`, {
          error: itemsError,
          orderId: id
        });
        
        // Return order without items
        logger.warn(`Returning order without items due to error`, {
          orderId: id
        });
        
        return {
          ...order,
          items: []
        };
      }
    } catch (error) {
      logger.error(`Error in order retrieval process`, {
        error,
        orderId: id
      });
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }
  
  /**
   * Update the status of an order
   * @param id The ID of the order to update
   * @param status The new status value
   * @returns The updated order or undefined if order not found
   */
  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    try {
      // First check if the order exists
      try {
        const [existingOrder] = await db
          .select()
          .from(orders)
          .where(eq(orders.id, id));
          
        if (!existingOrder) {
          logger.warn(`Attempted to update status of non-existent order`, {
            orderId: id,
            newStatus: status
          });
          return undefined;
        }
        
        const oldStatus = existingOrder.status;
        const now = new Date();
        
        try {
          // Update the order with the new status and updatedAt timestamp
          const [updatedOrder] = await db
            .update(orders)
            .set({ 
              status, 
              updatedAt: now 
            })
            .where(eq(orders.id, id))
            .returning();
          
          logger.info(`Updated order status`, {
            orderId: id,
            oldStatus,
            newStatus: status,
            userId: updatedOrder.userId
          });
          
          return updatedOrder;
        } catch (updateError) {
          logger.error(`Error updating order status`, {
            error: updateError,
            orderId: id,
            oldStatus,
            newStatus: status,
            userId: existingOrder.userId
          });
          throw updateError; // Rethrow for outer error handler to catch
        }
      } catch (queryError) {
        logger.error(`Error querying order before status update`, {
          error: queryError,
          orderId: id,
          newStatus: status
        });
        throw queryError; // Rethrow for outer error handler to catch
      }
    } catch (error) {
      logger.error(`Error in order status update process`, {
        error,
        orderId: id,
        newStatus: status
      });
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }
  
  // Product Image operations
  async getProductImages(productId: number): Promise<ProductImage[]> {
    try {
      // Select specific columns that exist in the database
      const result = await db
        .select({
          id: productImages.id,
          productId: productImages.productId,
          url: productImages.url,
          objectKey: productImages.objectKey,
          isMain: productImages.isMain,
          hasBgRemoved: productImages.hasBgRemoved,
          bgRemovedUrl: productImages.bgRemovedUrl,
          bgRemovedObjectKey: productImages.bgRemovedObjectKey,
          sortOrder: productImages.sortOrder,
          createdAt: productImages.createdAt
        })
        .from(productImages)
        .where(eq(productImages.productId, productId))
        .orderBy(asc(productImages.sortOrder));
      
      logger.debug(`Retrieved product images`, {
        productId,
        imageCount: result.length,
        hasMainImage: result.some(img => img.isMain)
      });
      
      return result;
    } catch (error) {
      logger.error(`Error retrieving product images`, {
        error,
        productId
      });
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async getProductImagesWithBgRemoved(productId: number): Promise<ProductImage[]> {
    try {
      // Select specific columns that exist in the database
      const result = await db
        .select({
          id: productImages.id,
          productId: productImages.productId,
          url: productImages.url,
          objectKey: productImages.objectKey,
          isMain: productImages.isMain,
          hasBgRemoved: productImages.hasBgRemoved,
          bgRemovedUrl: productImages.bgRemovedUrl,
          bgRemovedObjectKey: productImages.bgRemovedObjectKey,
          sortOrder: productImages.sortOrder,
          createdAt: productImages.createdAt
        })
        .from(productImages)
        .where(
          and(
            eq(productImages.productId, productId),
            eq(productImages.hasBgRemoved, true)
          )
        )
        .orderBy(asc(productImages.sortOrder));
        
      logger.debug(`Retrieved background-removed product images`, {
        productId,
        imageCount: result.length
      });
      
      return result;
    } catch (error) {
      logger.error(`Error retrieving background-removed product images`, {
        error,
        productId
      });
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async getProductImageById(id: number): Promise<ProductImage | undefined> {
    try {
      const [image] = await db
        .select()
        .from(productImages)
        .where(eq(productImages.id, id));
      
      if (!image) {
        logger.warn(`Product image not found`, { imageId: id });
        return undefined;
      }
      
      logger.debug(`Retrieved product image by ID`, {
        imageId: id,
        productId: image.productId,
        isMain: image.isMain,
        hasBgRemoved: image.hasBgRemoved
      });
      
      return image;
    } catch (error) {
      logger.error(`Error retrieving product image by ID`, {
        error,
        imageId: id
      });
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }
  
  async createProductImage(image: InsertProductImage): Promise<ProductImage> {
    try {
      // If this is marked as main image, unset any existing main image
      if (image.isMain && image.productId) {
        try {
          // Check if there's currently a main image
          const [currentMainImage] = await db
            .select()
            .from(productImages)
            .where(
              and(
                eq(productImages.productId, image.productId),
                eq(productImages.isMain, true)
              )
            );
          
          if (currentMainImage) {
            // Unset existing main image
            await db
              .update(productImages)
              .set({ isMain: false })
              .where(
                and(
                  eq(productImages.productId, image.productId),
                  eq(productImages.isMain, true)
                )
              );
            
            logger.debug(`Unset existing main image`, {
              productId: image.productId,
              previousMainImageId: currentMainImage.id
            });
          }
        } catch (updateError) {
          logger.error(`Error unsetting existing main image`, {
            error: updateError,
            productId: image.productId
          });
          throw updateError; // Rethrow so the route handler can catch it and send a proper error response
        }
      }
      
      try {
        // Insert the new image
        const [newImage] = await db.insert(productImages).values(image).returning();
        
        logger.info(`Created new product image`, {
          imageId: newImage.id,
          productId: newImage.productId,
          isMain: newImage.isMain,
          objectKey: newImage.objectKey
        });
        
        return newImage;
      } catch (insertError) {
        logger.error(`Error inserting new product image`, {
          error: insertError,
          productId: image.productId,
          isMain: image.isMain
        });
        throw insertError; // Rethrow so the route handler can catch it and send a proper error response
      }
    } catch (error) {
      logger.error(`Error in product image creation process`, {
        error,
        productId: image.productId
      });
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async updateProductImage(id: number, imageData: Partial<InsertProductImage>): Promise<ProductImage | undefined> {
    try {
      // First, verify that the image exists
      const existingImage = await this.getProductImageById(id);
      if (!existingImage) {
        logger.warn(`Cannot update product image that doesn't exist`, { imageId: id });
        return undefined;
      }
      
      // If this is marked as main image, unset any existing main images
      if (imageData.isMain && imageData.productId) {
        try {
          // Check if there are any other main images
          const [currentMainImage] = await db
            .select()
            .from(productImages)
            .where(
              and(
                eq(productImages.productId, imageData.productId),
                eq(productImages.isMain, true),
                sql`${productImages.id} != ${id}`
              )
            );
          
          if (currentMainImage) {
            // Unset existing main image
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
            
            logger.debug(`Unset existing main image during update`, {
              productId: imageData.productId,
              previousMainImageId: currentMainImage.id,
              newMainImageId: id
            });
          }
        } catch (updateError) {
          logger.error(`Error unsetting existing main image during image update`, {
            error: updateError,
            productId: imageData.productId,
            imageId: id
          });
          throw updateError; // Rethrow so the route handler can catch it and send a proper error response
        }
      }
      
      try {
        // Update the image data
        const [updatedImage] = await db
          .update(productImages)
          .set(imageData)
          .where(eq(productImages.id, id))
          .returning();
        
        if (!updatedImage) {
          logger.warn(`Product image update failed, no record returned`, { imageId: id });
          return undefined;
        }
        
        logger.info(`Updated product image`, {
          imageId: id,
          productId: updatedImage.productId,
          isMain: updatedImage.isMain,
          isBackgroundRemoved: updatedImage.hasBgRemoved
        });
        
        return updatedImage;
      } catch (updateError) {
        logger.error(`Error updating product image data`, {
          error: updateError,
          imageId: id,
          productId: imageData.productId
        });
        throw updateError; // Rethrow so the route handler can catch it and send a proper error response
      }
    } catch (error) {
      logger.error(`Error in product image update process`, {
        error,
        imageId: id
      });
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async setMainProductImage(productId: number, imageId: number): Promise<boolean> {
    try {
      // First, verify that the image exists and belongs to the product
      const image = await this.getProductImageById(imageId);
      if (!image) {
        logger.warn(`Cannot set main image - image not found`, { imageId, productId });
        return false;
      }
      
      if (image.productId !== productId) {
        logger.warn(`Cannot set main image - image belongs to different product`, { 
          imageId, 
          productId,
          actualProductId: image.productId 
        });
        return false;
      }
      
      // Check if already main
      if (image.isMain) {
        logger.info(`Image is already set as main`, { imageId, productId });
        return true;
      }
      
      // Unset existing main image
      try {
        const [currentMainImage] = await db
          .select()
          .from(productImages)
          .where(
            and(
              eq(productImages.productId, productId),
              eq(productImages.isMain, true)
            )
          );
        
        if (currentMainImage) {
          await db
            .update(productImages)
            .set({ isMain: false })
            .where(
              and(
                eq(productImages.productId, productId),
                eq(productImages.isMain, true)
              )
            );
          
          logger.debug(`Unset existing main image`, {
            productId,
            previousMainImageId: currentMainImage.id,
            newMainImageId: imageId
          });
        }
      } catch (unsetError) {
        logger.error(`Error unsetting existing main image`, {
          error: unsetError,
          productId
        });
        throw unsetError; // Rethrow so the route handler can catch it and send a proper error response
      }
      
      try {
        // Set new main image
        const [updatedImage] = await db
          .update(productImages)
          .set({ isMain: true })
          .where(eq(productImages.id, imageId))
          .returning();
        
        logger.info(`Set image as main`, {
          productId,
          imageId,
          success: !!updatedImage
        });
        
        return !!updatedImage;
      } catch (setError) {
        logger.error(`Error setting image as main`, {
          error: setError,
          productId,
          imageId
        });
        throw setError; // Rethrow so the route handler can catch it and send a proper error response
      }
    } catch (error) {
      logger.error(`Error in main product image setting process`, {
        error,
        productId,
        imageId
      });
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async deleteProductImage(id: number): Promise<boolean> {
    try {
      // First check if the image exists
      const image = await this.getProductImageById(id);
      
      if (!image) {
        // Image already doesn't exist, return success
        logger.warn(`Cannot delete product image - not found`, { imageId: id });
        return true; // Idempotent behavior - if it doesn't exist, that's still a successful deletion
      }
        
      // Gather info for logging
      const productId = image.productId;
      const wasMain = image.isMain;
      const hadBgRemoved = image.hasBgRemoved;
      const storageInfo = {
        originalObjectKey: image.objectKey,
        bgRemovedObjectKey: image.bgRemovedObjectKey,
        originalDeleted: false,
        bgRemovedDeleted: false,
      };
      
      // Delete the image file from object storage if it exists
      if (image.objectKey) {
        try {
          await objectStore.deleteFile(image.objectKey);
          storageInfo.originalDeleted = true;
          logger.debug(`Deleted original image from object storage`, {
            objectKey: image.objectKey,
            imageId: id,
            productId
          });
        } catch (storageError) {
          logger.error(`Error deleting original image from object storage`, {
            error: storageError,
            objectKey: image.objectKey,
            imageId: id,
            productId
          });
          // Continue with deletion even if file deletion fails
        }
      }
      
      // Delete the background-removed image if it exists
      if (image.bgRemovedObjectKey) {
        try {
          await objectStore.deleteFile(image.bgRemovedObjectKey);
          storageInfo.bgRemovedDeleted = true;
          logger.debug(`Deleted background-removed image from object storage`, {
            objectKey: image.bgRemovedObjectKey,
            imageId: id,
            productId
          });
        } catch (storageError) {
          logger.error(`Error deleting background-removed image from object storage`, {
            error: storageError,
            objectKey: image.bgRemovedObjectKey,
            imageId: id,
            productId
          });
          // Continue with deletion even if file deletion fails
        }
      }
      
      // Delete the database record
      try {
        await db.delete(productImages).where(eq(productImages.id, id));
        
        logger.info(`Deleted product image`, {
          imageId: id,
          productId,
          wasMain,
          hadBgRemoved,
          storageDeleted: {
            original: storageInfo.originalDeleted,
            bgRemoved: storageInfo.bgRemovedDeleted
          }
        });
        
        return true;
      } catch (dbError) {
        logger.error(`Error deleting product image from database`, {
          error: dbError,
          imageId: id,
          productId
        });
        throw dbError;
      }
    } catch (error) {
      logger.error(`Error in product image deletion process`, {
        error,
        imageId: id
      });
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }
  
  async deleteProduct(id: number): Promise<boolean> {
    try {
      // First verify that the product exists
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, id));
        
      if (!product) {
        logger.warn(`Cannot delete product - not found`, { productId: id });
        return true; // Idempotent behavior - if it doesn't exist, that's still a successful deletion
      }
      
      // Create tracking object to monitor deletion progress
      const deletionStats = {
        productName: product.name,
        productSlug: product.slug,
        catalogId: product.catalogId,
        imagesTotal: 0,
        imagesDeleted: 0,
        orphanedFilesTotal: 0,
        orphanedFilesDeleted: 0,
        attributeValuesDeleted: false,
        productDeleted: false
      };
      
      // First, get all product images to delete them from object storage
      try {
        const productImagesData = await this.getProductImages(id);
        deletionStats.imagesTotal = productImagesData.length;
        
        // Delete each image from database and object storage
        for (const image of productImagesData) {
          try {
            await this.deleteProductImage(image.id);
            deletionStats.imagesDeleted++;
          } catch (imageError) {
            logger.error(`Error deleting product image`, {
              error: imageError,
              imageId: image.id,
              productId: id
            });
            // Continue with deletion even if a specific image deletion fails
          }
        }
      } catch (imagesError) {
        logger.error(`Error retrieving product images for deletion`, {
          error: imagesError,
          productId: id
        });
        // Continue with deletion even if image retrieval fails
      }
      
      // Additionally, search for any files in the product's folder that might not be linked in the database
      try {
        const productFolderPrefix = `${STORAGE_FOLDERS.PRODUCTS}/${id}/`;
        const filesList = await objectStore.listFiles(productFolderPrefix, true);
        
        deletionStats.orphanedFilesTotal = filesList.length;
        logger.debug(`Found orphaned files in product folder to delete`, {
          productId: id,
          count: filesList.length,
          folderPath: productFolderPrefix
        });
        
        // Delete each file found in the folder
        for (const objectKey of filesList) {
          try {
            await objectStore.deleteFile(objectKey);
            deletionStats.orphanedFilesDeleted++;
            logger.debug(`Deleted orphaned file from object storage`, {
              objectKey,
              productId: id
            });
          } catch (fileError) {
            logger.error(`Error deleting orphaned file from object storage`, {
              error: fileError,
              objectKey,
              productId: id
            });
            // Continue with deletion even if file deletion fails
          }
        }
      } catch (folderError) {
        logger.error(`Error listing product files for cleanup`, {
          error: folderError,
          productId: id
        });
        // Continue with deletion even if listing fails
      }
      
      try {
        // Delete product attribute values
        await db.delete(productAttributeValues).where(eq(productAttributeValues.productId, id));
        deletionStats.attributeValuesDeleted = true;
        logger.debug(`Deleted product attribute values`, { productId: id });
      } catch (attrValuesError) {
        logger.error(`Error deleting product attribute values`, {
          error: attrValuesError,
          productId: id
        });
        // Continue with deletion
      }
      
      // Delete product attribute values
      try {
        await db.delete(productAttributeValues).where(eq(productAttributeValues.productId, id));
        logger.debug(`Deleted product attribute values`, { productId: id });
      } catch (valuesError) {
        logger.error(`Error deleting product attribute values`, {
          error: valuesError,
          productId: id
        });
        // Continue with deletion
      }
      
      try {
        // Finally delete the product itself
        await db.delete(products).where(eq(products.id, id));
        deletionStats.productDeleted = true;
        
        logger.info(`Product successfully deleted`, {
          productId: id,
          productName: deletionStats.productName,
          productSlug: deletionStats.slug,
          catalogId: deletionStats.catalogId,
          deletedImages: `${deletionStats.imagesDeleted}/${deletionStats.imagesTotal}`,
          deletedOrphanedFiles: `${deletionStats.orphanedFilesDeleted}/${deletionStats.orphanedFilesTotal}`,
          attributeValuesDeleted: deletionStats.attributeValuesDeleted
        });
        
        return true;
      } catch (deleteError) {
        logger.error(`Error deleting product record from database`, {
          error: deleteError,
          productId: id
        });
        throw deleteError;
      }
    } catch (error) {
      logger.error(`Error in product deletion process`, {
        error,
        productId: id
      });
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }
  
  async bulkUpdateProductStatus(productIds: number[], isActive: boolean): Promise<number> {
    try {
      if (productIds.length === 0) {
        logger.debug(`Bulk status update called with empty product ID list`, {
          isActive,
          count: 0
        });
        return 0;
      }
      
      // Check which products actually exist (for better error messages and accurate counts)
      const existingProducts = await db
        .select({
          id: products.id,
          name: products.name,
          isCurrentlyActive: products.isActive
        })
        .from(products)
        .where(inArray(products.id, productIds));
      
      const existingIds = existingProducts.map(p => p.id);
      const notFoundIds = productIds.filter(id => !existingIds.includes(id));
      
      // Log a warning if some products were not found
      if (notFoundIds.length > 0) {
        logger.warn(`Some products not found during bulk status update`, {
          notFoundCount: notFoundIds.length,
          notFoundIds,
          requestedCount: productIds.length
        });
      }
      
      // Early return if no products actually exist
      if (existingIds.length === 0) {
        logger.warn(`No products found to update status`, {
          requestedIds: productIds,
          isActive
        });
        return 0;
      }
      
      // Count products that already have the requested status
      const alreadyInStatusCount = existingProducts.filter(p => p.isCurrentlyActive === isActive).length;
      if (alreadyInStatusCount === existingIds.length) {
        logger.info(`All products already have the requested status`, {
          isActive,
          count: existingIds.length
        });
        return existingIds.length; // All products already have the requested status
      }
      
      try {
        // Update all existing products in the list to the new status
        await db
          .update(products)
          .set({ 
            isActive,
            updatedAt: new Date() 
          })
          .where(inArray(products.id, existingIds));
          
        logger.info(`Bulk updated product status`, {
          isActive,
          totalProductCount: existingIds.length,
          alreadyInStatusCount,
          actuallyUpdatedCount: existingIds.length - alreadyInStatusCount
        });
        
        // Return the number of affected rows (successfully processed)
        return existingIds.length;
      } catch (updateError) {
        logger.error(`Error updating product status in database`, {
          error: updateError,
          isActive,
          productCount: existingIds.length
        });
        throw updateError; // Rethrow so the route handler can catch it and send a proper error response
      }
    } catch (error) {
      logger.error(`Error in bulk product status update process`, {
        error,
        isActive,
        productIdCount: productIds.length
      });
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  // AI Recommendation operations
  async saveRecommendation(recommendation: InsertAiRecommendation): Promise<AiRecommendation> {
    try {
      const [newRecommendation] = await db
        .insert(aiRecommendations)
        .values(recommendation)
        .returning();
      return newRecommendation;
    } catch (error) {
      console.error('Error saving AI recommendation:', error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async getRecommendationsForUser(userId: number): Promise<AiRecommendation | undefined> {
    try {
      const [recommendation] = await db
        .select()
        .from(aiRecommendations)
        .where(eq(aiRecommendations.userId, userId))
        .orderBy(desc(aiRecommendations.createdAt))
        .limit(1);
      
      return recommendation;
    } catch (error) {
      console.error(`Error fetching AI recommendations for user ${userId}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  // Pricing operations
  async getPricingByCategoryId(categoryId: number): Promise<Pricing | undefined> {
    try {
      const [pricingSetting] = await db
        .select()
        .from(pricing)
        .where(eq(pricing.categoryId, categoryId));
      
      return pricingSetting;
    } catch (error) {
      console.error(`Error fetching pricing for category ${categoryId}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }
  
  async getPricingById(id: number): Promise<Pricing | undefined> {
    try {
      const [pricingSetting] = await db
        .select()
        .from(pricing)
        .where(eq(pricing.id, id));
      
      return pricingSetting;
    } catch (error) {
      console.error(`Error fetching pricing with ID ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }
  
  async getAllPricingSettings(): Promise<Pricing[]> {
    try {
      return await db.select().from(pricing);
    } catch (error) {
      console.error('Error fetching all pricing settings:', error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }
  
  async createOrUpdatePricing(pricingData: InsertPricing): Promise<Pricing> {
    try {
      // Check if pricing for this category already exists
      try {
        const existing = await this.getPricingByCategoryId(pricingData.categoryId);
        
        if (existing) {
          try {
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
          } catch (updateError) {
            console.error(`Error updating existing pricing for category ${pricingData.categoryId}:`, updateError);
            throw updateError; // Rethrow so the route handler can catch it and send a proper error response
          }
        } else {
          try {
            // Create new pricing
            const [newPricing] = await db.insert(pricing).values(pricingData).returning();
            return newPricing;
          } catch (insertError) {
            console.error(`Error creating new pricing for category ${pricingData.categoryId}:`, insertError);
            throw insertError; // Rethrow so the route handler can catch it and send a proper error response
          }
        }
      } catch (lookupError) {
        console.error(`Error checking if pricing exists for category ${pricingData.categoryId}:`, lookupError);
        throw lookupError; // Rethrow so the route handler can catch it and send a proper error response
      }
    } catch (error) {
      console.error(`Error in createOrUpdatePricing for category ${pricingData.categoryId}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }
  
  async deletePricing(id: number): Promise<boolean> {
    try {
      await db.delete(pricing).where(eq(pricing.id, id));
      return true;
    } catch (error) {
      console.error(`Error deleting pricing ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }
  
  async getDefaultMarkupPercentage(): Promise<number | null> {
    try {
      // Look for a special "global default" setting (categoryId = 0 or null)
      const [defaultSetting] = await db
        .select()
        .from(pricing)
        .where(eq(pricing.categoryId, 0));
      
      // Return the markup percentage if found, or null if not found
      return defaultSetting?.markupPercentage || null;
    } catch (error) {
      console.error('Error fetching default markup percentage:', error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  // AI Settings operations
  async getAiSetting(settingName: string): Promise<AiSetting | undefined> {
    try {
      const [setting] = await db
        .select()
        .from(aiSettings)
        .where(eq(aiSettings.settingName, settingName));
      
      return setting;
    } catch (error) {
      console.error(`Error fetching AI setting with name "${settingName}":`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }
  
  async getAllAiSettings(): Promise<AiSetting[]> {
    try {
      return await db
        .select()
        .from(aiSettings)
        .orderBy(asc(aiSettings.settingName));
    } catch (error) {
      console.error('Error fetching all AI settings:', error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }
  
  async saveAiSetting(setting: InsertAiSetting): Promise<AiSetting> {
    try {
      // Check if the setting already exists
      try {
        const existingSetting = await this.getAiSetting(setting.settingName);
        
        if (existingSetting) {
          try {
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
          } catch (updateError) {
            console.error(`Error updating existing AI setting "${setting.settingName}":`, updateError);
            throw updateError; // Rethrow so the route handler can catch it and send a proper error response
          }
        } else {
          try {
            // Create new setting
            const [newSetting] = await db
              .insert(aiSettings)
              .values(setting)
              .returning();
            
            return newSetting;
          } catch (insertError) {
            console.error(`Error creating new AI setting "${setting.settingName}":`, insertError);
            throw insertError; // Rethrow so the route handler can catch it and send a proper error response
          }
        }
      } catch (lookupError) {
        console.error(`Error checking if AI setting "${setting.settingName}" exists:`, lookupError);
        throw lookupError; // Rethrow so the route handler can catch it and send a proper error response
      }
    } catch (error) {
      console.error(`Error in saveAiSetting for "${setting.settingName}":`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  // Supplier operations
  async getAllSuppliers(activeOnly = true): Promise<Supplier[]> {
    try {
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
    } catch (error) {
      console.error(`Error fetching all suppliers (activeOnly=${activeOnly}):`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async getSupplierById(id: number): Promise<Supplier | undefined> {
    try {
      const [supplier] = await db
        .select()
        .from(suppliers)
        .where(eq(suppliers.id, id));
      return supplier;
    } catch (error) {
      console.error(`Error fetching supplier with ID ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    try {
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
    } catch (error) {
      console.error(`Error creating supplier "${supplier.name}":`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async updateSupplier(id: number, supplierData: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    try {
      const [updatedSupplier] = await db
        .update(suppliers)
        .set({
          ...supplierData,
          updatedAt: new Date()
        })
        .where(eq(suppliers.id, id))
        .returning();
      return updatedSupplier;
    } catch (error) {
      console.error(`Error updating supplier with ID ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async deleteSupplier(id: number): Promise<boolean> {
    try {
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
    } catch (error) {
      console.error(`Error soft-deleting supplier ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  // Catalog operations
  async getAllCatalogs(activeOnly = true): Promise<any[]> {
    try {
      // Get catalogs with supplier information
      try {
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
        
        // Add product count for each catalog
        try {
          const catalogsWithProductCount = await Promise.all(
            catalogData.map(async (catalog) => {
              try {
                // Count products in this catalog
                const productsQuery = activeOnly
                  ? db
                      .select({ count: sql<number>`count(*)` })
                      .from(products)
                      .where(and(
                        eq(products.catalogId, catalog.id),
                        eq(products.isActive, true)
                      ))
                  : db
                      .select({ count: sql<number>`count(*)` })
                      .from(products)
                      .where(eq(products.catalogId, catalog.id));
                      
                const [result] = await productsQuery;
                const count = result?.count || 0;
                
                // Format all dates as ISO strings
                return {
                  ...catalog,
                  startDate: catalog.startDate ? new Date(catalog.startDate).toISOString() : null,
                  endDate: catalog.endDate ? new Date(catalog.endDate).toISOString() : null,
                  createdAt: catalog.createdAt ? new Date(catalog.createdAt).toISOString() : null,
                  productsCount: Number(count)
                };
              } catch (productCountError) {
                console.error(`Error counting products for catalog ${catalog.id}:`, productCountError);
                // Return the catalog with a zero product count in case of an error
                return {
                  ...catalog,
                  startDate: catalog.startDate ? new Date(catalog.startDate).toISOString() : null,
                  endDate: catalog.endDate ? new Date(catalog.endDate).toISOString() : null,
                  createdAt: catalog.createdAt ? new Date(catalog.createdAt).toISOString() : null,
                  productsCount: 0
                };
              }
            })
          );
          
          return catalogsWithProductCount;
        } catch (productCountsError) {
          console.error('Error while getting product counts for catalogs:', productCountsError);
          throw productCountsError; // Rethrow so the route handler can catch it and send a proper error response
        }
      } catch (catalogsQueryError) {
        console.error(`Error fetching catalogs (activeOnly=${activeOnly}):`, catalogsQueryError);
        throw catalogsQueryError; // Rethrow so the route handler can catch it and send a proper error response
      }
    } catch (error) {
      console.error(`Error in getAllCatalogs (activeOnly=${activeOnly}):`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
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
    
    // Add product count for each catalog
    const catalogsWithProductCount = await Promise.all(
      catalogData.map(async (catalog) => {
        // Count products in this catalog
        const productsQuery = activeOnly
          ? db
              .select({ count: sql<number>`count(*)` })
              .from(products)
              .where(and(
                eq(products.catalogId, catalog.id),
                eq(products.isActive, true)
              ))
          : db
              .select({ count: sql<number>`count(*)` })
              .from(products)
              .where(eq(products.catalogId, catalog.id));
              
        const [result] = await productsQuery;
        const count = result?.count || 0;
        
        // Format all dates as ISO strings
        return {
          ...catalog,
          startDate: catalog.startDate ? new Date(catalog.startDate).toISOString() : null,
          endDate: catalog.endDate ? new Date(catalog.endDate).toISOString() : null,
          createdAt: catalog.createdAt ? new Date(catalog.createdAt).toISOString() : null,
          productsCount: Number(count)
        };
      })
    );
    
    return catalogsWithProductCount;
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
    
    // Count products in this catalog
    const [productCountResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.catalogId, id));
      
    const productCount = productCountResult?.count || 0;
    
    // For edit form compatibility, add placeholders and format dates properly
    const catalog = {
      ...catalogData,
      startDate: catalogData.startDate ? new Date(catalogData.startDate).toISOString() : null,
      endDate: catalogData.endDate ? new Date(catalogData.endDate).toISOString() : null,
      freeShipping: false, // Placeholder for freeShipping
      productsCount: Number(productCount),
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
    try {
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
    } catch (error) {
      console.error(`Error soft-deleting catalog ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async getProductsByCatalogId(catalogId: number, activeOnly = true, limit = 20, offset = 0): Promise<(Product & { categoryName?: string })[]> {
    try {
      console.log(`Getting products for catalog ID ${catalogId}, activeOnly: ${activeOnly}, limit: ${limit}, offset: ${offset}`);
      
      const query = db
        .select({
          ...products,
          categoryName: categories.name
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id));

      let result;
      if (activeOnly) {
        result = await query
          .where(
            and(
              eq(products.catalogId, catalogId),
              eq(products.isActive, true)
            )
          )
          .limit(limit)
          .offset(offset);
      } else {
        result = await query
          .where(eq(products.catalogId, catalogId))
          .limit(limit)
          .offset(offset);
      }
      
      console.log(`Found ${result.length} products for catalog ID ${catalogId}`);
      return result;
    } catch (error) {
      console.error(`Error getting products for catalog ID ${catalogId}:`, error);
      throw error;
    }
  }
  
  async getProductCountByCatalogId(catalogId: number, includeInactive = false): Promise<number> {
    // Count query to get total number of products in a catalog
    try {
      console.log(`Getting product count for catalog ID ${catalogId}, includeInactive: ${includeInactive}`);
      
      const query = db
        .select({ count: count() })
        .from(products);
      
      if (includeInactive) {
        // Include all products regardless of active status
        query.where(eq(products.catalogId, catalogId));
      } else {
        // Only include active products
        query.where(
          and(
            eq(products.catalogId, catalogId),
            eq(products.isActive, true)
          )
        );
      }
      
      const result = await query;
      console.log(`Query result:`, result);
      return result[0]?.count || 0;
    } catch (error) {
      console.error(`Error getting product count:`, error);
      throw error;
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
  
  async updateProductDisplayOrder(catalogId: number, productIds: number[]): Promise<{ count: number }> {
    // Update display order for each product based on its position in the provided array
    // This ensures products appear in the order specified by productIds
    
    // Validate that all products belong to the specified catalog
    const catalogProducts = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.catalogId, catalogId));
    
    const catalogProductIds = new Set(catalogProducts.map(p => p.id));
    const validProductIds = productIds.filter(id => catalogProductIds.has(id));
    
    // If no valid product IDs, return count 0
    if (validProductIds.length === 0) {
      return { count: 0 };
    }
    
    // Update each product's display order based on its position in the array
    // This is done in a transaction to ensure all updates succeed or fail together
    const updatedProducts = await db.transaction(async (tx) => {
      const updates = [];
      
      for (let i = 0; i < validProductIds.length; i++) {
        const productId = validProductIds[i];
        updates.push(
          tx
            .update(products)
            .set({ displayOrder: i })
            .where(and(
              eq(products.id, productId),
              eq(products.catalogId, catalogId)
            ))
            .returning({ id: products.id })
        );
      }
      
      return await Promise.all(updates);
    });
    
    // Count the number of products that were successfully updated
    const count = updatedProducts.flat().length;
    return { count };
  }

  // ===============================================================
  // ATTRIBUTES SYSTEM - COMMENTED OUT (PHASE 1 OF REDESIGN)
  // This entire section is temporarily commented out as part of the
  // attribute system redesign effort. These methods will be replaced
  // with a new implementation in a future phase.
  // ===============================================================
  /*
  // Category Attribute operations
  async getCategoryAttributes(categoryId: number): Promise<(CategoryAttribute & { categoryName?: string })[]> {
    // First get the category name
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, categoryId));
    
    const categoryName = category?.name;
      
    // Then get the attributes
    const attributes = await db
      .select()
      .from(categoryAttributes)
      .where(eq(categoryAttributes.categoryId, categoryId))
      .orderBy(asc(categoryAttributes.sortOrder));
      
    // Add the category name to each attribute
    return attributes.map(attribute => ({
      ...attribute,
      categoryName
    }));
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
    try {
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
    } catch (error) {
      console.error(`Error deleting category attribute ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  // Category Attribute Option operations
  // Removed first implementation of getCategoryAttributeOptions as part of centralized attribute system

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
    try {
      await db
        .delete(categoryAttributeOptions)
        .where(eq(categoryAttributeOptions.id, id));
      return true;
    } catch (error) {
      console.error(`Error deleting category attribute option ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
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
    try {
      await db
        .delete(productAttributeValues)
        .where(eq(productAttributeValues.id, id));
      return true;
    } catch (error) {
      console.error(`Error deleting product attribute value ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  // Product Attribute Value operations - replacement for the legacy combination system
  /**
   * Get all attribute values for a product
   * @param productId The ID of the product
   * @returns Array of attribute values
   */
  async getProductAttributeValues(productId: number): Promise<ProductAttributeValue[]> {
    try {
      const values = await db
        .select()
        .from(productAttributeValues)
        .where(eq(productAttributeValues.productId, productId));
        
      logger.debug(`Retrieved product attribute values`, {
        productId,
        valueCount: values.length
      });
      
      return values;
    } catch (error) {
      logger.error(`Error retrieving product attribute values`, {
        error,
        productId
      });
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }
  
  /**
   * Get attribute values for a specific product and attribute
   * @param productId The ID of the product
   * @param attributeId The ID of the attribute
   * @returns Array of attribute values
   */
  async getProductAttributeValuesByAttributeId(productId: number, attributeId: number): Promise<ProductAttributeValue[]> {
    try {
      const values = await db
        .select()
        .from(productAttributeValues)
        .where(
          and(
            eq(productAttributeValues.productId, productId),
            eq(productAttributeValues.attributeId, attributeId)
          )
        );
        
      logger.debug(`Retrieved product attribute values for specific attribute`, {
        productId,
        attributeId,
        valueCount: values.length
      });
      
      return values;
    } catch (error) {
      logger.error(`Error retrieving product attribute values for specific attribute`, {
        error,
        productId,
        attributeId
      });
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  /**
   * Create a new attribute value for a product
   * @param value The value data to insert
   * @returns The created attribute value
   */
  async createProductAttributeValue(value: InsertProductAttributeValue): Promise<ProductAttributeValue> {
    try {
      const [newValue] = await db
        .insert(productAttributeValues)
        .values(value)
        .returning();
        
      logger.info(`Created new product attribute value`, {
        valueId: newValue.id,
        productId: newValue.productId,
        attributeId: newValue.attributeId,
        optionId: newValue.optionId
      });
      
      return newValue;
    } catch (error) {
      logger.error(`Error creating product attribute value`, {
        error,
        productId: value.productId,
        attributeId: value.attributeId
      });
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  /**
   * Update an existing attribute value
   * @param id The ID of the attribute value to update
   * @param valueData The new data
   * @returns The updated attribute value or undefined if not found
   */
  async updateProductAttributeValue(id: number, valueData: Partial<InsertProductAttributeValue>): Promise<ProductAttributeValue | undefined> {
    try {
      const [updatedValue] = await db
        .update(productAttributeValues)
        .set(valueData)
        .where(eq(productAttributeValues.id, id))
        .returning();
        
      if (!updatedValue) {
        logger.warn(`Product attribute value not found for update`, { valueId: id });
        return undefined;
      }
      
      logger.info(`Updated product attribute value`, {
        valueId: id,
        productId: updatedValue.productId,
        attributeId: updatedValue.attributeId
      });
      
      return updatedValue;
    } catch (error) {
      logger.error(`Error updating product attribute value`, {
        error,
        valueId: id
      });
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  /**
   * Delete an attribute value
   * @param id The ID of the attribute value to delete
   * @returns True if successful, or throws error
   */
  async deleteProductAttributeValue(id: number): Promise<boolean> {
    try {
      await db
        .delete(productAttributeValues)
        .where(eq(productAttributeValues.id, id));
        
      logger.info(`Deleted product attribute value`, { valueId: id });
      return true;
    } catch (error) {
      logger.error(`Error deleting product attribute value`, {
        error,
        valueId: id
      });
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }
  
  // These methods are maintained for backward compatibility with existing code
  // but now use the new attribute value system
  
  /**
   * @deprecated Use getProductAttributeValues instead
   */
  async getProductAttributeCombinations(productId: number): Promise<any[]> {
    try {
      logger.warn(`Using deprecated method getProductAttributeCombinations`, { productId });
      const values = await this.getProductAttributeValues(productId);
      // Convert to the expected format to maintain compatibility
      return values.map(value => ({
        id: value.id,
        productId: value.productId,
        attributeValues: [value]
      }));
    } catch (error) {
      logger.error(`Error in deprecated getProductAttributeCombinations method`, {
        error,
        productId
      });
      throw error;
    }
  }

  /**
   * @deprecated Use getProductAttributeValues with filtering instead
   */
  async getProductAttributeCombinationByHash(productId: number, combinationHash: string): Promise<any | undefined> {
    try {
      logger.warn(`Using deprecated method getProductAttributeCombinationByHash`, { 
        productId,
        combinationHash
      });
      // Just return the first value as a fallback
      const values = await this.getProductAttributeValues(productId);
      if (values.length === 0) return undefined;
      
      return {
        id: values[0].id,
        productId,
        attributeValues: values
      };
    } catch (error) {
      logger.error(`Error in deprecated getProductAttributeCombinationByHash method`, {
        error,
        productId,
        combinationHash
      });
      throw error;
    }
  }

  /**
   * @deprecated Use createProductAttributeValue instead
   */
  async createProductAttributeCombination(combination: any): Promise<any> {
    try {
      logger.warn(`Using deprecated method createProductAttributeCombination`, { 
        productId: combination.productId
      });
      
      if (!combination.attributeValues || combination.attributeValues.length === 0) {
        logger.error(`Cannot create combination without attribute values`, {
          productId: combination.productId
        });
        throw new Error('Attribute values are required');
      }
      
      // Create the first attribute value and return a compatible object
      const value = await this.createProductAttributeValue({
        productId: combination.productId,
        attributeId: combination.attributeValues[0].attributeId,
        optionId: combination.attributeValues[0].optionId,
        textValue: combination.attributeValues[0].textValue
      });
      
      return {
        id: value.id,
        productId: value.productId,
        attributeValues: [value]
      };
    } catch (error) {
      logger.error(`Error in deprecated createProductAttributeCombination method`, {
        error,
        productId: combination.productId
      });
      throw error;
    }
  }

  /**
   * @deprecated Use updateProductAttributeValue instead
   */
  async updateProductAttributeCombination(id: number, combinationData: any): Promise<any | undefined> {
    try {
      logger.warn(`Using deprecated method updateProductAttributeCombination`, { id });
      
      // We'll just update the value with this ID as a fallback
      const value = await this.updateProductAttributeValue(id, {
        productId: combinationData.productId
      });
      
      if (!value) return undefined;
      
      return {
        id: value.id,
        productId: value.productId,
        attributeValues: [value]
      };
    } catch (error) {
      logger.error(`Error in deprecated updateProductAttributeCombination method`, {
        error,
        id
      });
      throw error;
    }
  }

  /**
   * @deprecated Use deleteProductAttributeValue instead
   */
  async deleteProductAttributeCombination(id: number): Promise<boolean> {
    try {
      logger.warn(`Using deprecated method deleteProductAttributeCombination`, { id });
      return await this.deleteProductAttributeValue(id);
    } catch (error) {
      logger.error(`Error in deprecated deleteProductAttributeCombination method`, {
        error,
        id
      });
      throw error;
    }
  }
  
  // Global Attribute operations
  async getAllGlobalAttributes(): Promise<GlobalAttribute[]> {
    const attributes = await db
      .select()
      .from(globalAttributes)
      .orderBy(asc(globalAttributes.name));
    
    return attributes;
  }
  
  async getGlobalAttributeById(id: number): Promise<GlobalAttribute | undefined> {
    const [attribute] = await db
      .select()
      .from(globalAttributes)
      .where(eq(globalAttributes.id, id));
      
    return attribute;
  }
  
  async createGlobalAttribute(attribute: InsertGlobalAttribute): Promise<GlobalAttribute> {
    const [newAttribute] = await db
      .insert(globalAttributes)
      .values(attribute)
      .returning();
      
    return newAttribute;
  }
  
  async updateGlobalAttribute(id: number, attributeData: Partial<InsertGlobalAttribute>): Promise<GlobalAttribute | undefined> {
    const [updatedAttribute] = await db
      .update(globalAttributes)
      .set(attributeData)
      .where(eq(globalAttributes.id, id))
      .returning();
      
    return updatedAttribute;
  }
  
  async deleteGlobalAttribute(id: number): Promise<boolean> {
    try {
      // First check if there are any options for this attribute
      const options = await this.getGlobalAttributeOptions(id);
      
      // Delete all options first if they exist
      for (const option of options) {
        await this.deleteGlobalAttributeOption(option.id);
      }
      
      // Now delete the attribute
      const [deletedAttribute] = await db
        .delete(globalAttributes)
        .where(eq(globalAttributes.id, id))
        .returning();
        
      return !!deletedAttribute;
    } catch (error) {
      console.error(`Error deleting global attribute ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }
  
  // Global Attribute Option operations
  async getGlobalAttributeOptions(attributeId: number): Promise<GlobalAttributeOption[]> {
    const options = await db
      .select()
      .from(globalAttributeOptions)
      .where(eq(globalAttributeOptions.attributeId, attributeId))
      .orderBy(asc(globalAttributeOptions.sortOrder), asc(globalAttributeOptions.value));
      
    return options;
  }
  
  async createGlobalAttributeOption(option: InsertGlobalAttributeOption): Promise<GlobalAttributeOption> {
    const [newOption] = await db
      .insert(globalAttributeOptions)
      .values(option)
      .returning();
      
    return newOption;
  }
  
  async updateGlobalAttributeOption(id: number, optionData: Partial<InsertGlobalAttributeOption>): Promise<GlobalAttributeOption | undefined> {
    const [updatedOption] = await db
      .update(globalAttributeOptions)
      .set(optionData)
      .where(eq(globalAttributeOptions.id, id))
      .returning();
      
    return updatedOption;
  }
  
  async deleteGlobalAttributeOption(id: number): Promise<boolean> {
    try {
      // Delete the option
      const [deletedOption] = await db
        .delete(globalAttributeOptions)
        .where(eq(globalAttributeOptions.id, id))
        .returning();
        
      return !!deletedOption;
    } catch (error) {
      console.error(`Error deleting global attribute option ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }
  
  // Product Global Attribute operations
  async getProductGlobalAttributes(productId: number): Promise<(ProductGlobalAttribute & { attribute: GlobalAttribute, options: GlobalAttributeOption[] })[]> {
    const result = await db
      .select({
        productAttr: productGlobalAttributes,
        attribute: globalAttributes
      })
      .from(productGlobalAttributes)
      .innerJoin(
        globalAttributes,
        eq(productGlobalAttributes.attributeId, globalAttributes.id)
      )
      .where(eq(productGlobalAttributes.productId, productId));
    
    // For each product-attribute relationship, get the selected options
    const enriched = await Promise.all(result.map(async (row) => {
      const options = await this.getProductGlobalAttributeOptions(row.productAttr.id);
      return {
        ...row.productAttr,
        attribute: row.attribute,
        options
      };
    }));
    
    return enriched;
  }
  
  async addGlobalAttributeToProduct(productId: number, attributeId: number): Promise<ProductGlobalAttribute> {
    // Check if this attribute is already assigned to this product
    const existing = await db
      .select()
      .from(productGlobalAttributes)
      .where(
        and(
          eq(productGlobalAttributes.productId, productId),
          eq(productGlobalAttributes.attributeId, attributeId)
        )
      );
    
    if (existing.length > 0) {
      return existing[0]; // Return the existing relationship
    }
    
    // Create new relationship
    const [newAttr] = await db
      .insert(productGlobalAttributes)
      .values({
        productId,
        attributeId
      })
      .returning();
    
    return newAttr;
  }
  
  async removeGlobalAttributeFromProduct(productId: number, attributeId: number): Promise<boolean> {
    // Find the product-attribute relationship
    const [relation] = await db
      .select()
      .from(productGlobalAttributes)
      .where(
        and(
          eq(productGlobalAttributes.productId, productId),
          eq(productGlobalAttributes.attributeId, attributeId)
        )
      );
    
    if (!relation) {
      return false; // Nothing to delete
    }
    
    // First delete all options associated with this product-attribute relationship
    await db
      .delete(productGlobalAttributeOptions)
      .where(eq(productGlobalAttributeOptions.productAttributeId, relation.id));
    
    // Then delete the relationship itself
    const result = await db
      .delete(productGlobalAttributes)
      .where(eq(productGlobalAttributes.id, relation.id));
    
    return result.count > 0;
  }
  
  // Product Global Attribute Option operations
  async getProductGlobalAttributeOptions(productAttributeId: number): Promise<GlobalAttributeOption[]> {
    const options = await db
      .select({
        option: globalAttributeOptions
      })
      .from(productGlobalAttributeOptions)
      .innerJoin(
        globalAttributeOptions,
        eq(productGlobalAttributeOptions.optionId, globalAttributeOptions.id)
      )
      .where(eq(productGlobalAttributeOptions.productAttributeId, productAttributeId));
    
    return options.map(row => row.option);
  }

  async getGlobalAttributeOptionsForProduct(productAttributeId: number): Promise<ProductGlobalAttributeOption[]> {
    const options = await db
      .select()
      .from(productGlobalAttributeOptions)
      .where(eq(productGlobalAttributeOptions.productAttributeId, productAttributeId));
    
    return options;
  }
  
  async addGlobalAttributeOptionToProduct(productAttributeId: number, optionId: number): Promise<ProductGlobalAttributeOption> {
    // Check if this option is already assigned
    const existing = await db
      .select()
      .from(productGlobalAttributeOptions)
      .where(
        and(
          eq(productGlobalAttributeOptions.productAttributeId, productAttributeId),
          eq(productGlobalAttributeOptions.optionId, optionId)
        )
      );
    
    if (existing.length > 0) {
      return existing[0]; // Return the existing relationship
    }
    
    // Create new relationship
    const [newOption] = await db
      .insert(productGlobalAttributeOptions)
      .values({
        productAttributeId,
        optionId
      })
      .returning();
    
    return newOption;
  }
  
  async removeGlobalAttributeOptionFromProduct(productAttributeId: number, optionId: number): Promise<boolean> {
    const result = await db
      .delete(productGlobalAttributeOptions)
      .where(
        and(
          eq(productGlobalAttributeOptions.productAttributeId, productAttributeId),
          eq(productGlobalAttributeOptions.optionId, optionId)
        )
      );
    
    return result.count > 0;
  }
  
  async getGlobalAttributesWithOptionsForProduct(productId: number): Promise<{ 
    attribute: GlobalAttribute; 
    productAttributeId: number;
    selectedOptions: GlobalAttributeOption[] 
  }[]> {
    // Get all global attributes assigned to this product
    const productGlobalAttrs = await this.getProductGlobalAttributes(productId);
    
    // Map to the required format
    return productGlobalAttrs.map(productAttr => ({
      attribute: productAttr.attribute,
      productAttributeId: productAttr.id,
      selectedOptions: productAttr.options
    }));
  }

  // ==================================================================================
  // ATTRIBUTE SYSTEM IMPLEMENTATION
  // ==================================================================================
  
  // Core attribute operations
  async getAllAttributes(): Promise<Attribute[]> {
    return await db
      .select()
      .from(attributes)
      .orderBy(asc(attributes.name));
  }
  
  async getAttributeById(id: number): Promise<Attribute | undefined> {
    const [attribute] = await db
      .select()
      .from(attributes)
      .where(eq(attributes.id, id));
    return attribute;
  }
  
  async getAttributeByName(name: string): Promise<Attribute | undefined> {
    const [attribute] = await db
      .select()
      .from(attributes)
      .where(eq(attributes.name, name));
    return attribute;
  }
  
  async createAttribute(attribute: InsertAttribute): Promise<Attribute> {
    const [newAttribute] = await db
      .insert(attributes)
      .values(attribute)
      .returning();
    return newAttribute;
  }
  
  async updateAttribute(id: number, attributeData: Partial<InsertAttribute>): Promise<Attribute | undefined> {
    const [updatedAttribute] = await db
      .update(attributes)
      .set(attributeData)
      .where(eq(attributes.id, id))
      .returning();
    return updatedAttribute;
  }
  
  async deleteAttribute(id: number): Promise<boolean> {
    try {
      await db
        .delete(attributes)
        .where(eq(attributes.id, id));
      return true;
    } catch (error) {
      console.error(`Error deleting attribute ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }
  
  // Attribute options operations
  async getAttributeOptions(attributeId: number): Promise<AttributeOption[]> {
    return await db
      .select()
      .from(attributeOptions)
      .where(eq(attributeOptions.attributeId, attributeId))
      .orderBy(asc(attributeOptions.sortOrder));
  }
  
  async getAttributeOptionById(id: number): Promise<AttributeOption | undefined> {
    const [option] = await db
      .select()
      .from(attributeOptions)
      .where(eq(attributeOptions.id, id));
    return option;
  }
  
  async createAttributeOption(option: InsertAttributeOption): Promise<AttributeOption> {
    const [newOption] = await db
      .insert(attributeOptions)
      .values(option)
      .returning();
    return newOption;
  }
  
  async updateAttributeOption(id: number, optionData: Partial<InsertAttributeOption>): Promise<AttributeOption | undefined> {
    const [updatedOption] = await db
      .update(attributeOptions)
      .set(optionData)
      .where(eq(attributeOptions.id, id))
      .returning();
    return updatedOption;
  }
  
  async deleteAttributeOption(id: number): Promise<boolean> {
    try {
      await db
        .delete(attributeOptions)
        .where(eq(attributeOptions.id, id));
      return true;
    } catch (error) {
      console.error(`Error deleting attribute option ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }
  
  async updateAttributeOptionsOrder(attributeId: number, optionIds: number[]): Promise<boolean> {
    try {
      // Start a transaction
      await db.transaction(async (tx) => {
        // Update the sort order for each option
        for (let i = 0; i < optionIds.length; i++) {
          await tx
            .update(attributeOptions)
            .set({ sortOrder: i })
            .where(and(
              eq(attributeOptions.id, optionIds[i]),
              eq(attributeOptions.attributeId, attributeId)
            ));
        }
      });
      return true;
    } catch (error) {
      console.error(`Error updating attribute options order for attribute ${attributeId}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }
  
  // Removed catalog attribute operations as part of centralized attribute system
  
  // Removed getCatalogAttributeById as part of centralized attribute system
  
  // Removed createCatalogAttribute as part of centralized attribute system
  
  // Removed updateCatalogAttribute as part of centralized attribute system
  
  // Removed deleteCatalogAttribute as part of centralized attribute system
  
  // Removed catalog attribute options operations as part of centralized attribute system
  
  // Removed getCatalogAttributeOptionById as part of centralized attribute system
  
  // Removed createCatalogAttributeOption as part of centralized attribute system
  
  // Removed updateCatalogAttributeOption as part of centralized attribute system
  
  // Removed deleteCatalogAttributeOption as part of centralized attribute system
  
  // Removed updateCatalogAttributeOptionsOrder as part of centralized attribute system
  
  // Removed category attribute operations as part of centralized attribute system
  
  // Removed getCategoryAttributeById as part of centralized attribute system
  
  // Removed createCategoryAttribute as part of centralized attribute system
  
  // Removed updateCategoryAttribute as part of centralized attribute system
  
  // Removed deleteCategoryAttribute as part of centralized attribute system
  
  // Category attribute options operations
  // Removed getCategoryAttributeOptions as part of centralized attribute system
  
  // Removed getCategoryAttributeOptionById as part of centralized attribute system
  
  // Removed createCategoryAttributeOption as part of centralized attribute system
  
  // Removed updateCategoryAttributeOption as part of centralized attribute system
  
  // Removed deleteCategoryAttributeOption as part of centralized attribute system
  
  // Removed updateCategoryAttributeOptionsOrder as part of centralized attribute system
  
  // Product attribute operations using the new centralized attribute system
  /**
   * Get all attributes for a product
   * @param productId ID of the product
   * @returns Array of product attributes with their base attribute information
   */
  async getProductAttributes(productId: number): Promise<(ProductAttribute & { attribute: Attribute })[]> {
    try {
      const result = await db
        .select({
          productAttr: productAttributes,
          attribute: attributes
        })
        .from(productAttributes)
        .innerJoin(attributes, eq(productAttributes.attributeId, attributes.id))
        .where(eq(productAttributes.productId, productId))
        .orderBy(asc(productAttributes.sortOrder));
      
      return result.map(row => ({
        ...row.productAttr,
        attribute: row.attribute
      }));
    } catch (error) {
      logger.error('Error getting product attributes', { error, productId });
      throw error;
    }
  }
  
  /**
   * Get a specific product attribute by ID
   * @param id ID of the product attribute
   * @returns The product attribute with its base attribute information
   */
  async getProductAttributeById(id: number): Promise<(ProductAttribute & { attribute: Attribute }) | undefined> {
    try {
      const [result] = await db
        .select({
          productAttr: productAttributes,
          attribute: attributes
        })
        .from(productAttributes)
        .innerJoin(attributes, eq(productAttributes.attributeId, attributes.id))
        .where(eq(productAttributes.id, id));
      
      if (!result) return undefined;
      
      return {
        ...result.productAttr,
        attribute: result.attribute
      };
    } catch (error) {
      logger.error('Error getting product attribute by ID', { error, id });
      throw error;
    }
  }
  
  /**
   * Create a new product attribute
   * @param productAttribute The product attribute to create
   * @returns The created product attribute
   */
  async createProductAttribute(productAttribute: InsertProductAttribute): Promise<ProductAttribute> {
    try {
      const [newAttribute] = await db
        .insert(productAttributes)
        .values(productAttribute)
        .returning();
      
      return newAttribute;
    } catch (error) {
      logger.error('Error creating product attribute', { error, productAttribute });
      throw error;
    }
  }
  
  /**
   * Update a product attribute
   * @param id ID of the product attribute to update
   * @param productAttributeData The updated product attribute data
   * @returns The updated product attribute
   */
  async updateProductAttribute(id: number, productAttributeData: Partial<InsertProductAttribute>): Promise<ProductAttribute | undefined> {
    try {
      const [updatedAttribute] = await db
        .update(productAttributes)
        .set(productAttributeData)
        .where(eq(productAttributes.id, id))
        .returning();
      
      return updatedAttribute;
    } catch (error) {
      logger.error('Error updating product attribute', { error, id });
      throw error;
    }
  }
  
  /**
   * Delete a product attribute
   * @param id ID of the product attribute to delete
   * @returns True if the deletion was successful
   */
  async deleteProductAttribute(id: number): Promise<boolean> {
    try {
      await db
        .delete(productAttributes)
        .where(eq(productAttributes.id, id));
      
      return true;
    } catch (error) {
      logger.error('Error deleting product attribute', { error, id });
      throw error;
    }
  }
  
  // Product attribute options operations
  // Removed getProductAttributeOptions as part of centralized attribute system
  
  // Removed getProductAttributeOptionById as part of centralized attribute system
  
  // Removed createProductAttributeOption as part of centralized attribute system
  
  // Removed updateProductAttributeOption as part of centralized attribute system
  
  // Removed deleteProductAttributeOption as part of centralized attribute system
  
  // Removed updateProductAttributeOptionsOrder as part of centralized attribute system
  
  // Product attribute values operations using the new centralized attribute system
  /**
   * Get all attribute values for a product
   * @param productId ID of the product to get attribute values for
   * @returns Array of attribute values
   */
  async getProductAttributeValues(productId: number): Promise<ProductAttributeValue[]> {
    try {
      const values = await db
        .select()
        .from(productAttributeValues)
        .where(eq(productAttributeValues.productId, productId));
      
      return values;
    } catch (error) {
      logger.error('Error getting product attribute values', { error, productId });
      throw error;
    }
  }
  
  /**
   * Get a specific attribute value by ID
   * @param id ID of the attribute value
   * @returns The attribute value
   */
  async getProductAttributeValueById(id: number): Promise<ProductAttributeValue | undefined> {
    try {
      const [value] = await db
        .select()
        .from(productAttributeValues)
        .where(eq(productAttributeValues.id, id));
      
      return value;
    } catch (error) {
      logger.error('Error getting product attribute value by ID', { error, id });
      throw error;
    }
  }
  
  /**
   * Create a new product attribute value
   * @param value The attribute value to create
   * @returns The created attribute value
   */
  async createProductAttributeValue(value: InsertProductAttributeValue): Promise<ProductAttributeValue> {
    try {
      const [newValue] = await db
        .insert(productAttributeValues)
        .values(value)
        .returning();
      
      return newValue;
    } catch (error) {
      logger.error('Error creating product attribute value', { error, value });
      throw error;
    }
  }
  
  /**
   * Update a product attribute value
   * @param id ID of the attribute value to update
   * @param data The updated attribute value data
   * @returns The updated attribute value
   */
  async updateProductAttributeValue(id: number, data: Partial<InsertProductAttributeValue>): Promise<ProductAttributeValue | undefined> {
    try {
      const [updatedValue] = await db
        .update(productAttributeValues)
        .set(data)
        .where(eq(productAttributeValues.id, id))
        .returning();
      
      return updatedValue;
    } catch (error) {
      logger.error('Error updating product attribute value', { error, id });
      throw error;
    }
  }
  
  /**
   * Delete a product attribute value
   * @param id ID of the attribute value to delete
   * @returns True if the deletion was successful
   */
  async deleteProductAttributeValue(id: number): Promise<boolean> {
    try {
      await db
        .delete(productAttributeValues)
        .where(eq(productAttributeValues.id, id));
      
      return true;
    } catch (error) {
      logger.error('Error deleting product attribute value', { error, id });
      throw error;
    }
  }

  // Attribute discount rules operations
  // Removed getAllAttributeDiscountRules as part of centralized attribute system
  
  // Removed getAttributeDiscountRulesByCategory as part of centralized attribute system
  
  // Removed getAttributeDiscountRulesByCatalog as part of centralized attribute system
  
  // Removed getAttributeDiscountRulesByAttribute as part of centralized attribute system

  // Removed createAttributeDiscountRule as part of centralized attribute system

  // Removed deleteAttributeDiscountRule as part of centralized attribute system

  // Removed calculateAttributeBasedPriceAdjustments as part of centralized attribute system
  // Authentication testing utilities
  
  /**
   * Count the total number of users in the system
   * @returns The count of users
   */
  async getUserCount(): Promise<number> {
    try {
      logger.info('Attempting to count users');
      const result = await db.select({ count: sql<number>`count(*)` }).from(users);
      const count = result[0]?.count;
      logger.info('User count retrieved successfully', { count });
      
      // Handle both number and string cases
      if (typeof count === 'number') {
        return count;
      } else if (typeof count === 'string') {
        // Parse string to number
        const parsedCount = parseInt(count, 10);
        if (!isNaN(parsedCount)) {
          logger.info('Successfully parsed string count to number', { 
            original: count,
            parsed: parsedCount 
          });
          return parsedCount;
        }
      }
      
      // Log if we couldn't handle the count properly
      logger.error('User count could not be parsed to a number', { 
        count, 
        type: typeof count, 
        resultObject: JSON.stringify(result) 
      });
      return 0;
    } catch (error) {
      logger.error('Error counting users', { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return 0;
    }
  }
  
  /**
   * Hash a password using the app's standard algorithm
   * This delegates to the auth module's hashPassword function
   * @param password - The password to hash
   * @returns The hashed password
   */
  async hashPassword(password: string): Promise<string> {
    // Import here to avoid circular dependency
    const { hashPassword } = await import('./auth');
    return hashPassword(password);
  }
  
  /**
   * Get all users in the system
   * Used for API testing to discover available user IDs
   * @returns Array of all users
   */
  async getAllUsers(): Promise<User[]> {
    try {
      const result = await db.query.users.findMany({
        orderBy: [asc(users.id)]
      });
      return result || [];
    } catch (error) {
      logger.error('Error fetching all users', { error });
      return [];
    }
  }
  
  /**
   * Get a product with a valid slug for API testing purposes
   * @returns A product with a valid slug or undefined if none exists
   */
  async getProductWithSlug(): Promise<Product | undefined> {
    try {
      const result = await db.query.products.findFirst({
        where: and(
          not(isNull(products.slug)),
          products.isActive.equals(true)
        )
      });
      return result;
    } catch (error) {
      logger.error('Error fetching product with slug', { error });
      return undefined;
    }
  }
  
  /**
   * Get all orders in the system
   * Used for API testing to discover available order IDs
   * @returns Array of all orders
   */
  async getAllOrders(): Promise<Order[]> {
    try {
      const result = await db.query.orders.findMany({
        orderBy: [desc(orders.createdAt)]
      });
      return result || [];
    } catch (error) {
      logger.error('Error fetching all orders', { error });
      return [];
    }
  }
  
  /**
   * Get all catalogs in the system
   * Used for API testing to discover available catalog IDs
   * @returns Array of all catalogs
   */
  async getAllCatalogs(): Promise<Catalog[]> {
    try {
      const result = await db.query.catalogs.findMany({
        orderBy: [asc(catalogs.id)]
      });
      return result || [];
    } catch (error) {
      logger.error('Error fetching all catalogs', { error });
      return [];
    }
  }
  
  /**
   * Session store for authentication - this is initialized in the constructor
   */
  readonly sessionStore: any;
  
  constructor() {
    // Initialize session store using dynamic imports to avoid ESM compatibility issues
    this.initSessionStore();
  }
  
  /**
   * Initialize the session store asynchronously
   * This approach avoids ESM/CommonJS compatibility issues
   */
  private async initSessionStore(): Promise<void> {
    try {
      // Dynamically import the required modules
      const { default: session } = await import('express-session');
      const { default: pgSimple } = await import('connect-pg-simple');
      
      const PostgresSessionStore = pgSimple(session);
      
      this.sessionStore = new PostgresSessionStore({
        pool,
        tableName: 'session',
        createTableIfMissing: true,
        pruneSessionInterval: 60 // Check for expired sessions every minute
      });
      
      logger.info('PostgreSQL session store initialized successfully');
    } catch (error) {
      // Fallback to memory store if PostgreSQL session store fails
      logger.error('Failed to initialize PostgreSQL session store, using memory store instead', { error });
      const { default: memorystore } = await import('memorystore');
      const { default: session } = await import('express-session');
      
      const MemoryStore = memorystore(session);
      this.sessionStore = new MemoryStore({
        checkPeriod: 86400000 // Prune expired entries every 24h
      });
    }
  }

  // Product Draft Methods for Database-Centric Approach
  async createProductDraft(draft: InsertProductDraft): Promise<ProductDraft> {
    try {
      // Set lastModified to current timestamp
      const draftWithTimestamp = {
        ...draft,
        lastModified: new Date()
      };
      
      // Debug log the data we're about to insert
      logger.debug('Creating product draft with data', { 
        draftData: {
          originalProductId: draftWithTimestamp.originalProductId,
          name: draftWithTimestamp.name,
          slug: draftWithTimestamp.slug,
          description: draftWithTimestamp.description,
          categoryId: draftWithTimestamp.categoryId,
          regularPrice: draftWithTimestamp.regularPrice,
          salePrice: draftWithTimestamp.salePrice 
        }
      });
      
      const [newDraft] = await db
        .insert(productDrafts)
        .values(draftWithTimestamp)
        .returning();
      
      return newDraft;
    } catch (error) {
      logger.error('Error creating product draft', { error });
      throw error;
    }
  }

  async getProductDraft(id: number): Promise<ProductDraft | undefined> {
    try {
      const [draft] = await db
        .select()
        .from(productDrafts)
        .where(eq(productDrafts.id, id));
      
      return draft;
    } catch (error) {
      logger.error('Error getting product draft', { error, id });
      throw error;
    }
  }

  async getProductDraftByOriginalId(originalProductId: number): Promise<ProductDraft | undefined> {
    try {
      const [draft] = await db
        .select()
        .from(productDrafts)
        .where(eq(productDrafts.originalProductId, originalProductId));
      
      return draft;
    } catch (error) {
      logger.error('Error getting product draft by original ID', { error, originalProductId });
      throw error;
    }
  }

  async getUserProductDrafts(userId: number): Promise<ProductDraft[]> {
    try {
      const drafts = await db
        .select()
        .from(productDrafts)
        .where(eq(productDrafts.createdBy, userId));
      
      return drafts;
    } catch (error) {
      logger.error('Error getting user product drafts', { error, userId });
      throw error;
    }
  }

  async updateProductDraft(id: number, data: Partial<InsertProductDraft>): Promise<ProductDraft | undefined> {
    try {
      // Always update the lastModified timestamp
      const updateData = {
        ...data,
        lastModified: new Date()
      };
      
      const [updatedDraft] = await db
        .update(productDrafts)
        .set(updateData)
        .where(eq(productDrafts.id, id))
        .returning();
      
      return updatedDraft;
    } catch (error) {
      logger.error('Error updating product draft', { error, id });
      throw error;
    }
  }

  async updateProductDraftWizardStep(id: number, step: string, data: any): Promise<ProductDraft | undefined> {
    try {
      // First get the current draft
      const existingDraft = await this.getProductDraft(id);
      if (!existingDraft) {
        return undefined;
      }
      
      // Update the appropriate fields based on the step
      let updateData: Partial<InsertProductDraft> = {
        lastModified: new Date()
      };
      
      // Update wizard progress to mark this step as completed
      const wizardProgress = existingDraft.wizardProgress ? { ...existingDraft.wizardProgress } : {};
      wizardProgress[step] = true;
      updateData.wizardProgress = wizardProgress;
      
      // Update completed steps array if not already included
      let completedSteps = existingDraft.completedSteps || [];
      if (!completedSteps.includes(step)) {
        completedSteps = [...completedSteps, step];
        updateData.completedSteps = completedSteps;
      }
      
      // Track changes for version history
      const changeHistory = existingDraft.changeHistory || [];
      const changeRecord = {
        timestamp: new Date(),
        userId: existingDraft.createdBy,
        step: step,
        fields: Object.keys(data),
        notes: `Updated ${step} step`
      };
      updateData.changeHistory = [...changeHistory, changeRecord];
      
      // Increment version
      updateData.version = (existingDraft.version || 1) + 1;
      
      // Update specific fields based on the step
      switch(step) {
        case 'basic-info':
          updateData = {
            ...updateData,
            name: data.name,
            slug: data.slug,
            sku: data.sku,
            description: data.description,
            brand: data.brand,
            categoryId: data.categoryId,
            isActive: data.isActive !== undefined ? data.isActive : existingDraft.isActive,
            isFeatured: data.isFeatured !== undefined ? data.isFeatured : existingDraft.isFeatured,
            taxable: data.taxable !== undefined ? data.taxable : existingDraft.taxable,
            taxClass: data.taxClass || existingDraft.taxClass,
            supplierId: data.supplierId,
            catalogId: data.catalogId
          };
          break;
          
        case 'images':
          // No field updates here as this is handled by updateProductDraftImages
          break;
          
        case 'additional-info':
          updateData = {
            ...updateData,
            weight: data.weight,
            dimensions: data.dimensions,
            attributes: data.attributes,
            stockLevel: data.stockLevel !== undefined ? data.stockLevel : existingDraft.stockLevel,
            lowStockThreshold: data.lowStockThreshold !== undefined ? data.lowStockThreshold : existingDraft.lowStockThreshold,
            backorderEnabled: data.backorderEnabled !== undefined ? data.backorderEnabled : existingDraft.backorderEnabled,
            freeShipping: data.freeShipping !== undefined ? data.freeShipping : existingDraft.freeShipping,
            shippingClass: data.shippingClass || existingDraft.shippingClass
          };
          break;
          
        case 'attributes':
          // For the new attributes step, specifically handling attributesData
          updateData = {
            ...updateData,
            attributes: data.attributes || existingDraft.attributes,
            attributesData: data.attributesData || existingDraft.attributesData
          };
          break;
          
        case 'seo':
          updateData = {
            ...updateData,
            metaTitle: data.metaTitle,
            metaDescription: data.metaDescription,
            metaKeywords: data.metaKeywords,
            canonicalUrl: data.canonicalUrl,
            hasAISeo: data.hasAISeo !== undefined ? data.hasAISeo : existingDraft.hasAISeo
          };
          break;
          
        case 'sales-promotions':
          updateData = {
            ...updateData,
            costPrice: data.costPrice !== undefined ? data.costPrice : existingDraft.costPrice,
            regularPrice: data.regularPrice !== undefined ? data.regularPrice : existingDraft.regularPrice,
            salePrice: data.salePrice !== undefined ? data.salePrice : existingDraft.salePrice,
            onSale: data.onSale !== undefined ? data.onSale : existingDraft.onSale,
            markupPercentage: data.markupPercentage !== undefined ? data.markupPercentage : existingDraft.markupPercentage,
            minimumPrice: data.minimumPrice !== undefined ? data.minimumPrice : existingDraft.minimumPrice,
            discountLabel: data.discountLabel,
            specialSaleText: data.specialSaleText,
            specialSaleStart: data.specialSaleStart,
            specialSaleEnd: data.specialSaleEnd,
            isFlashDeal: data.isFlashDeal !== undefined ? data.isFlashDeal : existingDraft.isFlashDeal,
            flashDealEnd: data.flashDealEnd
          };
          break;
          
        case 'review':
          // For final review step, update any review-related fields
          updateData = {
            ...updateData,
            draftStatus: data.draftStatus || existingDraft.draftStatus,
            // If marked as 'ready', set the time for tracking purposes
            ...(data.draftStatus === 'ready' && { publishedAt: new Date() })
          };
          break;
          
        default:
          // For other steps or for a partial update
          updateData = {
            ...updateData,
            ...data
          };
      }
      
      // Update the draft
      return await this.updateProductDraft(id, updateData);
    } catch (error) {
      logger.error('Error updating product draft wizard step', { error, id, step });
      throw error;
    }
  }

  async updateProductDraftImages(
    id: number, 
    imageUrls: string[], 
    imageObjectKeys: string[], 
    mainImageIndex = 0
  ): Promise<ProductDraft | undefined> {
    try {
      const updateData: Partial<InsertProductDraft> = {
        imageUrls,
        imageObjectKeys,
        mainImageIndex,
        lastModified: new Date()
      };
      
      return await this.updateProductDraft(id, updateData);
    } catch (error) {
      logger.error('Error updating product draft images', { error, id });
      throw error;
    }
  }

  async deleteProductDraftImage(id: number, imageIndex: number): Promise<ProductDraft | undefined> {
    try {
      // Get the current draft
      const draft = await this.getProductDraft(id);
      if (!draft || !draft.imageUrls || !draft.imageObjectKeys) {
        return undefined;
      }
      
      // Create copies of the arrays
      const imageUrls = [...draft.imageUrls];
      const imageObjectKeys = [...draft.imageObjectKeys];
      
      // Check if index is valid
      if (imageIndex < 0 || imageIndex >= imageUrls.length) {
        throw new Error(`Invalid image index: ${imageIndex}`);
      }
      
      // Get the object key to delete from storage
      const objectKey = imageObjectKeys[imageIndex];
      
      // Remove the image from the arrays
      imageUrls.splice(imageIndex, 1);
      imageObjectKeys.splice(imageIndex, 1);
      
      // Update main image index if needed
      let mainImageIndex = draft.mainImageIndex || 0;
      if (mainImageIndex === imageIndex) {
        // If we're deleting the main image, set to the first one or -1 if empty
        mainImageIndex = imageUrls.length > 0 ? 0 : -1;
      } else if (mainImageIndex > imageIndex) {
        // If main image is after the one we're deleting, decrement the index
        mainImageIndex--;
      }
      
      // Delete the image from object storage in the background
      if (objectKey) {
        objectStore.deleteObject(objectKey).catch(error => {
          logger.error('Error deleting image from object storage', { error, objectKey });
        });
      }
      
      // Update the draft
      return await this.updateProductDraftImages(id, imageUrls, imageObjectKeys, mainImageIndex);
    } catch (error) {
      logger.error('Error deleting product draft image', { error, id, imageIndex });
      throw error;
    }
  }

  /**
   * Reorder product draft images
   * @param id The draft ID
   * @param imageIndexes Array of current indexes in the new order
   * @returns The updated draft
   */
  async reorderProductDraftImages(id: number, imageIndexes: number[]): Promise<ProductDraft | undefined> {
    try {
      // Get the current draft
      const draft = await this.getProductDraft(id);
      if (!draft || !draft.imageUrls || !draft.imageObjectKeys) {
        return undefined;
      }
      
      // Validate input
      if (!Array.isArray(imageIndexes) || imageIndexes.length !== draft.imageUrls.length) {
        throw new Error(`Invalid image indexes: expected array of length ${draft.imageUrls.length}`);
      }
      
      // Create new arrays in the specified order
      const newImageUrls: string[] = [];
      const newImageObjectKeys: string[] = [];
      
      for (const index of imageIndexes) {
        if (index < 0 || index >= draft.imageUrls.length) {
          throw new Error(`Invalid image index: ${index}`);
        }
        
        newImageUrls.push(draft.imageUrls[index]);
        newImageObjectKeys.push(draft.imageObjectKeys[index]);
      }
      
      // Update the draft with the new order
      const updatedDraft = await this.updateProductDraftImages(
        id, 
        newImageUrls, 
        newImageObjectKeys, 
        // Maintain the main image index by finding its new position
        draft.mainImageIndex !== undefined && draft.mainImageIndex !== null
          ? imageIndexes.indexOf(draft.mainImageIndex)
          : 0
      );
      
      return updatedDraft;
    } catch (error) {
      logger.error('Error reordering product draft images', { error, id, imageIndexes });
      throw error;
    }
  }

  async publishProductDraft(id: number): Promise<Product | undefined> {
    try {
      // Get the draft
      const draft = await this.getProductDraft(id);
      if (!draft) {
        return undefined;
      }
      
      // Convert draft to product
      // Log draft data for debugging
      logger.debug('Publishing product draft', { 
        draftId: id, 
        originalProductId: draft.originalProductId,
        attributesCount: draft.attributes?.length || 0
      });
      
      const productData: Partial<InsertProduct> = {
        name: draft.name || '',
        slug: draft.slug || '',
        description: draft.description,
        categoryId: draft.categoryId,
        // Map the draft price fields to product price fields
        price: draft.regularPrice || 0,
        costPrice: draft.costPrice || 0,
        salePrice: draft.salePrice || null,
        discountLabel: draft.discountLabel,
        // Set the main image URL if available
        imageUrl: draft.imageUrls && draft.imageUrls.length > 0 
          ? draft.imageUrls[draft.mainImageIndex || 0] 
          : null,
        // Set additional images
        additionalImages: draft.imageUrls && draft.imageUrls.length > 1
          ? draft.imageUrls.filter((_, index) => index !== (draft.mainImageIndex || 0))
          : [],
        // Map stock to product stock
        stock: draft.stockLevel || 0,
        isActive: draft.isActive !== undefined ? draft.isActive : true,
        isFeatured: draft.isFeatured || false,
        supplier: draft.supplierId ? (await this.getSupplier(draft.supplierId))?.name : null,
        weight: draft.weight ? parseFloat(draft.weight) : null,
        dimensions: draft.dimensions,
        // Convert Date timestamps to text strings for storage in products table
        specialSaleText: draft.specialSaleText,
        specialSaleStart: draft.specialSaleStart ? draft.specialSaleStart.toISOString() : null,
        specialSaleEnd: draft.specialSaleEnd ? draft.specialSaleEnd.toISOString() : null,
        isFlashDeal: draft.isFlashDeal || false,
        flashDealEnd: draft.flashDealEnd ? draft.flashDealEnd.toISOString() : null,
        // Additional fields
        brand: draft.brand,
        tags: draft.metaKeywords ? [draft.metaKeywords] : [],
      };
      
      // Handle existing product (update) vs. new product (insert)
      let product: Product;
      
      if (draft.originalProductId) {
        // Update existing product
        const [updatedProduct] = await db
          .update(products)
          .set(productData)
          .where(eq(products.id, draft.originalProductId))
          .returning();
        
        product = updatedProduct;
        
        // Update product attributes using new centralized attribute system
        if (draft.attributes && Array.isArray(draft.attributes)) {
          // Delete existing attributes
          await db
            .delete(productAttributes)
            .where(eq(productAttributes.productId, product.id));
          
          logger.debug('Updating product attributes', { 
            productId: product.id, 
            attributesCount: draft.attributes.length 
          });
          
          // Insert new attributes
          for (const attr of draft.attributes) {
            try {
              await db
                .insert(productAttributes)
                .values({
                  productId: product.id,
                  attributeId: attr.attributeId,
                  // Handle different attribute value types
                  textValue: typeof attr.value === 'string' ? attr.value : null,
                  numberValue: typeof attr.value === 'number' ? attr.value : null,
                  booleanValue: typeof attr.value === 'boolean' ? attr.value : null,
                  // Handle arrays (like selected options) by serializing to JSON
                  selectedOptions: Array.isArray(attr.value) ? attr.value : null,
                  // Optional display name override
                  overrideDisplayName: attr.attributeDisplayName || null,
                });
            } catch (attrError) {
              logger.error('Error saving product attribute', { 
                error: attrError, 
                productId: product.id,
                attributeId: attr.attributeId,
                valueType: typeof attr.value
              });
            }
          }
        }
      } else {
        // Create new product
        const [newProduct] = await db
          .insert(products)
          .values(productData)
          .returning();
        
        product = newProduct;
        
        // Insert product attributes using new centralized attribute system
        if (draft.attributes && Array.isArray(draft.attributes)) {
          logger.debug('Adding product attributes for new product', { 
            productId: product.id, 
            attributesCount: draft.attributes.length 
          });
          
          // Insert new attributes
          for (const attr of draft.attributes) {
            try {
              await db
                .insert(productAttributes)
                .values({
                  productId: product.id,
                  attributeId: attr.attributeId,
                  // Handle different attribute value types
                  textValue: typeof attr.value === 'string' ? attr.value : null,
                  numberValue: typeof attr.value === 'number' ? attr.value : null,
                  booleanValue: typeof attr.value === 'boolean' ? attr.value : null,
                  // Handle arrays (like selected options) by serializing to JSON
                  selectedOptions: Array.isArray(attr.value) ? attr.value : null,
                  // Optional display name override
                  overrideDisplayName: attr.attributeDisplayName || null,
                });
            } catch (attrError) {
              logger.error('Error saving product attribute for new product', { 
                error: attrError, 
                productId: product.id,
                attributeId: attr.attributeId,
                valueType: typeof attr.value
              });
            }
          }
        }
      }
      
      // Process and move the images from draft location to final product location
      if (draft.imageObjectKeys && draft.imageObjectKeys.length > 0) {
        // Get supplier and catalog info for image path construction
        const supplier = draft.supplierId ? await this.getSupplier(draft.supplierId) : null;
        const catalog = draft.catalogId ? await this.getCatalog(draft.catalogId) : null;
        
        // Get category for path construction (for more organized structure)
        const category = draft.categoryId ? await this.getCategory(draft.categoryId) : null;
        
        for (let i = 0; i < draft.imageObjectKeys.length; i++) {
          const sourceObjectKey = draft.imageObjectKeys[i];
          const imageUrl = draft.imageUrls?.[i];
          
          if (!sourceObjectKey || !imageUrl) continue;
          
          try {
            // Move image from draft location to final product location
            const { url: newImageUrl, objectKey: newObjectKey } = await objectStore.moveDraftImageToProduct(
              sourceObjectKey,
              product.id,
              supplier?.name || 'unknown-supplier',
              catalog?.name || 'unknown-catalog',
              category?.name || 'unknown-category',
              product.name || `product-${product.id}`,
              i
            );
            
            // Save product image record with updated locations
            await db
              .insert(productImages)
              .values({
                productId: product.id,
                imageUrl: newImageUrl,
                objectKey: newObjectKey,
                isMainImage: i === (draft.mainImageIndex || 0),
                sortOrder: i
              });
            
            logger.debug('Moved product image from draft to final location', {
              productId: product.id,
              draftId: draft.id,
              sourceKey: sourceObjectKey,
              destinationKey: newObjectKey
            });
          } catch (imageError) {
            // If image move fails, still create the product but log the error
            logger.error('Failed to move image from draft to product location', {
              error: imageError,
              productId: product.id, 
              draftId: draft.id,
              sourceKey: sourceObjectKey
            });
            
            // Fallback to using original image locations
            await db
              .insert(productImages)
              .values({
                productId: product.id,
                imageUrl,
                objectKey: sourceObjectKey,
                isMainImage: i === (draft.mainImageIndex || 0),
                sortOrder: i
              });
          }
        }
      }
      
      // Delete the draft
      await this.deleteProductDraft(id);
      
      return product;
    } catch (error) {
      logger.error('Error publishing product draft', { error, id });
      throw error;
    }
  }

  async updateProductDraftStatus(id: number, status: string, note?: string): Promise<ProductDraft> {
    try {
      // Get the existing draft 
      const draft = await this.getProductDraft(id);
      if (!draft) {
        throw new Error(`Product draft with ID ${id} not found`);
      }
      
      // Prepare the update data
      const updateData: Partial<ProductDraft> = {
        draftStatus: status,
        lastModified: new Date()
      };
      
      // Add additional information based on status
      if (status === 'rejected' && note) {
        updateData.rejectionReason = note;
      }
      
      // Update the change history if available
      if (draft.changeHistory) {
        const changeEntry = {
          timestamp: new Date(),
          fromStatus: draft.draftStatus,
          toStatus: status,
          note: note || null
        };
        
        try {
          const currentHistory = draft.changeHistory as any[] || [];
          updateData.changeHistory = [...currentHistory, changeEntry];
        } catch (error) {
          logger.error('Error updating change history', { error, draftId: id });
          // Continue with the update even if change history fails
        }
      }
      
      // Update the database record
      const [updatedDraft] = await db
        .update(productDrafts)
        .set(updateData)
        .where(eq(productDrafts.id, id))
        .returning();
      
      if (!updatedDraft) {
        throw new Error(`Failed to update status for draft ${id}`);
      }
      
      return updatedDraft;
    } catch (error) {
      logger.error('Error updating product draft status', { error, id, status });
      throw error;
    }
  }
  
  async validateProductDraft(id: number, step?: string): Promise<{ isValid: boolean, errors?: Record<string, string[]> }> {
    try {
      const draft = await this.getProductDraft(id);
      
      if (!draft) {
        throw new Error(`Product draft with ID ${id} not found`);
      }
      
      // Validation based on step
      const errors: Record<string, string[]> = {};
      let isValid = true;
      
      // Basic info validation
      if (!step || step === 'basic-info') {
        if (!draft.name || draft.name.trim() === '') {
          errors['name'] = errors['name'] || [];
          errors['name'].push("Product name is required");
          isValid = false;
        }
        
        if (!draft.slug || draft.slug.trim() === '') {
          errors['slug'] = errors['slug'] || [];
          errors['slug'].push("Product URL slug is required");
          isValid = false;
        }
        
        if (!draft.categoryId) {
          errors['categoryId'] = errors['categoryId'] || [];
          errors['categoryId'].push("Product category is required");
          isValid = false;
        }
      }
      
      // Pricing validation
      if (!step || step === 'pricing') {
        if (!draft.regularPrice) {
          errors['regularPrice'] = errors['regularPrice'] || [];
          errors['regularPrice'].push("Regular price is required");
          isValid = false;
        }
        
        if (draft.onSale && !draft.salePrice) {
          errors['salePrice'] = errors['salePrice'] || [];
          errors['salePrice'].push("Sale price is required when on sale");
          isValid = false;
        }
      }
      
      // Images validation
      if (!step || step === 'images') {
        if (!draft.imageUrls || draft.imageUrls.length === 0 || draft.imageUrls.every(url => !url)) {
          errors['images'] = errors['images'] || [];
          errors['images'].push("At least one product image is required");
          isValid = false;
        }
      }
      
      return { isValid, errors: Object.keys(errors).length > 0 ? errors : undefined };
    } catch (error) {
      logger.error('Error validating product draft', { error, id });
      throw error;
    }
  }

  async deleteProductDraft(id: number): Promise<boolean> {
    try {
      // Get the draft first to access the image object keys
      const draft = await this.getProductDraft(id);
      
      // Delete from database
      const result = await db
        .delete(productDrafts)
        .where(eq(productDrafts.id, id));
      
      // Delete images from object storage if needed
      if (draft?.imageObjectKeys && draft.imageObjectKeys.length > 0) {
        for (const objectKey of draft.imageObjectKeys) {
          if (objectKey) {
            // Delete in the background, don't wait
            objectStore.deleteObject(objectKey).catch(error => {
              logger.error('Error deleting image from object storage', { error, objectKey });
            });
          }
        }
      }
      
      return true;
    } catch (error) {
      logger.error('Error deleting product draft', { error, id });
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
