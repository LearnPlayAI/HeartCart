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
  // New attribute system imports
  attributes, type Attribute, type InsertAttribute,
  attributeOptions, type AttributeOption, type InsertAttributeOption,
  catalogAttributes, type CatalogAttribute, type InsertCatalogAttribute,
  catalogAttributeOptions, type CatalogAttributeOption, type InsertCatalogAttributeOption,
  categoryAttributes, type CategoryAttribute, type InsertCategoryAttribute,
  categoryAttributeOptions, type CategoryAttributeOption, type InsertCategoryAttributeOption,
  productAttributes, type ProductAttribute, type InsertProductAttribute,
  productAttributeOptions, type ProductAttributeOption, type InsertProductAttributeOption,
  productAttributeValues, type ProductAttributeValue, type InsertProductAttributeValue,
  // Attribute discount rules
  attributeDiscountRules, type AttributeDiscountRule, type InsertAttributeDiscountRule
} from "@shared/schema";
import { db } from "./db";
import { eq, like, and, desc, asc, sql, inArray, isNull, not, or, SQL } from "drizzle-orm";
import { objectStore, STORAGE_FOLDERS } from "./object-store";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined>;
  
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
  bulkUpdateCatalogProducts(catalogId: number, updateData: Partial<InsertProduct>): Promise<number>;
  updateProductDisplayOrder(catalogId: number, productIds: number[]): Promise<{ count: number }>;
  
  // Attribute system operations
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

  // Catalog attribute operations
  getCatalogAttributes(catalogId: number): Promise<(CatalogAttribute & { attribute: Attribute })[]>;
  getCatalogAttributeById(id: number): Promise<(CatalogAttribute & { attribute: Attribute }) | undefined>;
  createCatalogAttribute(catalogAttribute: InsertCatalogAttribute): Promise<CatalogAttribute>;
  updateCatalogAttribute(id: number, catalogAttributeData: Partial<InsertCatalogAttribute>): Promise<CatalogAttribute | undefined>;
  deleteCatalogAttribute(id: number): Promise<boolean>;
  
  // Catalog attribute options operations
  getCatalogAttributeOptions(catalogAttributeId: number): Promise<(CatalogAttributeOption & { baseOption?: AttributeOption })[]>;
  getCatalogAttributeOptionById(id: number): Promise<CatalogAttributeOption | undefined>;
  createCatalogAttributeOption(option: InsertCatalogAttributeOption): Promise<CatalogAttributeOption>;
  updateCatalogAttributeOption(id: number, optionData: Partial<InsertCatalogAttributeOption>): Promise<CatalogAttributeOption | undefined>;
  deleteCatalogAttributeOption(id: number): Promise<boolean>;
  updateCatalogAttributeOptionsOrder(catalogAttributeId: number, optionIds: number[]): Promise<boolean>;
  
  // Category attribute operations
  getCategoryAttributes(categoryId: number): Promise<(CategoryAttribute & { attribute: Attribute })[]>;
  getCategoryAttributeById(id: number): Promise<(CategoryAttribute & { attribute: Attribute }) | undefined>;
  createCategoryAttribute(categoryAttribute: InsertCategoryAttribute): Promise<CategoryAttribute>;
  updateCategoryAttribute(id: number, categoryAttributeData: Partial<InsertCategoryAttribute>): Promise<CategoryAttribute | undefined>;
  deleteCategoryAttribute(id: number): Promise<boolean>;
  
  // Category attribute options operations
  getCategoryAttributeOptions(categoryAttributeId: number): Promise<(CategoryAttributeOption & { baseOption?: AttributeOption, catalogOption?: CatalogAttributeOption })[]>;
  getCategoryAttributeOptionById(id: number): Promise<CategoryAttributeOption | undefined>;
  createCategoryAttributeOption(option: InsertCategoryAttributeOption): Promise<CategoryAttributeOption>;
  updateCategoryAttributeOption(id: number, optionData: Partial<InsertCategoryAttributeOption>): Promise<CategoryAttributeOption | undefined>;
  deleteCategoryAttributeOption(id: number): Promise<boolean>;
  updateCategoryAttributeOptionsOrder(categoryAttributeId: number, optionIds: number[]): Promise<boolean>;
  
  // Product attribute operations
  getProductAttributes(productId: number): Promise<(ProductAttribute & { attribute: Attribute })[]>;
  getProductAttributeById(id: number): Promise<(ProductAttribute & { attribute: Attribute }) | undefined>;
  createProductAttribute(productAttribute: InsertProductAttribute): Promise<ProductAttribute>;
  updateProductAttribute(id: number, productAttributeData: Partial<InsertProductAttribute>): Promise<ProductAttribute | undefined>;
  deleteProductAttribute(id: number): Promise<boolean>;
  
  // Product attribute options operations
  getProductAttributeOptions(productAttributeId: number): Promise<(ProductAttributeOption & { 
    baseOption?: AttributeOption, 
    catalogOption?: CatalogAttributeOption,
    categoryOption?: CategoryAttributeOption
  })[]>;
  getProductAttributeOptionById(id: number): Promise<ProductAttributeOption | undefined>;
  createProductAttributeOption(option: InsertProductAttributeOption): Promise<ProductAttributeOption>;
  updateProductAttributeOption(id: number, optionData: Partial<InsertProductAttributeOption>): Promise<ProductAttributeOption | undefined>;
  deleteProductAttributeOption(id: number): Promise<boolean>;
  updateProductAttributeOptionsOrder(productAttributeId: number, optionIds: number[]): Promise<boolean>;
  
  // Product attribute values operations
  getProductAttributeValues(productId: number): Promise<ProductAttributeValue[]>;
  getProductAttributeValueById(id: number): Promise<ProductAttributeValue | undefined>;
  createProductAttributeValue(value: InsertProductAttributeValue): Promise<ProductAttributeValue>;
  updateProductAttributeValue(id: number, valueData: Partial<InsertProductAttributeValue>): Promise<ProductAttributeValue | undefined>;
  deleteProductAttributeValue(id: number): Promise<boolean>;
  
  // Attribute discount rules operations
  getAllAttributeDiscountRules(): Promise<AttributeDiscountRule[]>;
  getAttributeDiscountRule(id: number): Promise<AttributeDiscountRule | undefined>;
  getAttributeDiscountRulesByProduct(productId: number): Promise<AttributeDiscountRule[]>;
  getAttributeDiscountRulesByCategory(categoryId: number): Promise<AttributeDiscountRule[]>;
  getAttributeDiscountRulesByCatalog(catalogId: number): Promise<AttributeDiscountRule[]>;
  getAttributeDiscountRulesByAttribute(attributeId: number): Promise<AttributeDiscountRule[]>;
  createAttributeDiscountRule(rule: InsertAttributeDiscountRule): Promise<AttributeDiscountRule>;
  updateAttributeDiscountRule(id: number, ruleData: Partial<InsertAttributeDiscountRule>): Promise<AttributeDiscountRule | undefined>;
  deleteAttributeDiscountRule(id: number): Promise<boolean>;
  calculateAttributeBasedPriceAdjustments(productId: number, selectedAttributes: Record<string, any>, quantity?: number): Promise<{
    adjustments: Array<{
      ruleId: number,
      ruleName: string,
      discountType: string,
      discountValue: number,
      appliedValue: number
    }>,
    totalAdjustment: number
  }>;
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
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: number, productData: Partial<InsertProduct>): Promise<Product | undefined> {
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
  }

  // Cart operations
  async getCartItemById(id: number): Promise<CartItem | undefined> {
    try {
      const [item] = await db
        .select()
        .from(cartItems)
        .where(eq(cartItems.id, id));
      return item;
    } catch (error) {
      console.error(`Error fetching cart item with ID ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }
  
  async getCartItems(userId: number): Promise<CartItem[]> {
    try {
      return await db
        .select()
        .from(cartItems)
        .where(eq(cartItems.userId, userId));
    } catch (error) {
      console.error(`Error fetching cart items for user ${userId}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async getCartItemsWithProducts(userId: number): Promise<(CartItem & { product: Product })[]> {
    try {
      const items = await db
        .select()
        .from(cartItems)
        .where(eq(cartItems.userId, userId));
      
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
            } catch (enrichError) {
              console.error(`Error enriching product ${product.id} with images for cart item ${item.id}:`, enrichError);
              // Continue to next item but don't rethrow as we want to return whatever items we successfully retrieved
            }
          }
        } catch (productError) {
          console.error(`Error fetching product ${item.productId} for cart item ${item.id}:`, productError);
          // Continue to next item but don't rethrow as we want to return whatever items we successfully retrieved
        }
      }
      
      return result;
    } catch (error) {
      console.error(`Error in getCartItemsWithProducts for user ${userId}:`, error);
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
            const [updatedItem] = await db
              .update(cartItems)
              .set({ quantity: existingItem.quantity + cartItem.quantity })
              .where(eq(cartItems.id, existingItem.id))
              .returning();
            return updatedItem;
          } catch (updateError) {
            console.error(`Error updating quantity for existing cart item ${existingItem.id}:`, updateError);
            throw updateError; // Rethrow so the route handler can catch it and send a proper error response
          }
        } else {
          try {
            // Insert new item
            const [newItem] = await db.insert(cartItems).values(cartItem).returning();
            return newItem;
          } catch (insertError) {
            console.error('Error inserting new item into cart:', insertError);
            throw insertError; // Rethrow so the route handler can catch it and send a proper error response
          }
        }
      } catch (queryError) {
        console.error('Error checking if item already exists in cart:', queryError);
        throw queryError; // Rethrow so the route handler can catch it and send a proper error response
      }
    } catch (error) {
      console.error('Error in addToCart:', error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async updateCartItemQuantity(id: number, quantity: number): Promise<CartItem | undefined> {
    try {
      if (quantity <= 0) {
        try {
          await db.delete(cartItems).where(eq(cartItems.id, id));
          return undefined;
        } catch (deleteError) {
          console.error(`Error deleting cart item ${id} with quantity ${quantity}:`, deleteError);
          throw deleteError; // Rethrow so the route handler can catch it and send a proper error response
        }
      }
      
      try {
        const [updatedItem] = await db
          .update(cartItems)
          .set({ quantity })
          .where(eq(cartItems.id, id))
          .returning();
        return updatedItem;
      } catch (updateError) {
        console.error(`Error updating quantity for cart item ${id} to ${quantity}:`, updateError);
        throw updateError; // Rethrow so the route handler can catch it and send a proper error response
      }
    } catch (error) {
      console.error(`Error in updateCartItemQuantity for item ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async removeFromCart(id: number): Promise<boolean> {
    try {
      await db.delete(cartItems).where(eq(cartItems.id, id));
      return true;
    } catch (error) {
      console.error(`Error removing item ${id} from cart:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async clearCart(userId: number): Promise<boolean> {
    try {
      await db.delete(cartItems).where(eq(cartItems.userId, userId));
      return true;
    } catch (error) {
      console.error(`Error clearing cart for user ${userId}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  // Order operations
  async createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order> {
    try {
      // Create the order
      try {
        const [newOrder] = await db.insert(orders).values(order).returning();
        
        // Add order items with attribute combination data
        for (const item of items) {
          try {
            await db.insert(orderItems).values({
              ...item,
              orderId: newOrder.id
            });
            
            // If this item has a combination, update the product's sold count
            if (item.productId) {
              try {
                await db
                  .update(products)
                  .set({
                    soldCount: sql`${products.soldCount} + ${item.quantity}`
                  })
                  .where(eq(products.id, item.productId));
              } catch (updateError) {
                console.error(`Error updating sold count for product ${item.productId}:`, updateError);
                // Continue processing other items instead of halting the entire order process
              }
            }
          } catch (itemError) {
            console.error(`Error inserting order item for order ${newOrder.id}:`, itemError);
            // Continue processing other items instead of halting the entire order process
          }
        }
        
        // Clear the cart
        try {
          await this.clearCart(order.userId);
        } catch (cartError) {
          console.error(`Error clearing cart for user ${order.userId} after order creation:`, cartError);
          // Don't throw here as the order is already created
        }
        
        return newOrder;
      } catch (orderInsertError) {
        console.error('Error creating new order:', orderInsertError);
        throw orderInsertError; // Rethrow so the route handler can catch it and send a proper error response
      }
    } catch (error) {
      console.error('Error in createOrder:', error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async getOrdersByUser(userId: number | null): Promise<Order[]> {
    try {
      // If userId is null, return all orders (admin function)
      if (userId === null) {
        try {
          return await db
            .select()
            .from(orders)
            .orderBy(desc(orders.createdAt));
        } catch (adminOrdersError) {
          console.error('Error fetching all orders (admin function):', adminOrdersError);
          throw adminOrdersError; // Rethrow so the route handler can catch it and send a proper error response
        }
      }
      
      // Return orders for specific user
      try {
        return await db
          .select()
          .from(orders)
          .where(eq(orders.userId, userId))
          .orderBy(desc(orders.createdAt));
      } catch (userOrdersError) {
        console.error(`Error fetching orders for user ${userId}:`, userOrdersError);
        throw userOrdersError; // Rethrow so the route handler can catch it and send a proper error response
      }
    } catch (error) {
      console.error(`Error in getOrdersByUser for ${userId === null ? 'admin' : 'user ' + userId}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async getOrderById(id: number): Promise<(Order & { items: (OrderItem & { product: Product; attributeDetails?: any })[] }) | undefined> {
    try {
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, id));
      
      if (!order) return undefined;
      
      try {
        const orderItemsList = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, id));
        
        const items: (OrderItem & { product: Product; attributeDetails?: any })[] = [];
        
        for (const item of orderItemsList) {
          try {
            const [product] = await db
              .select()
              .from(products)
              .where(eq(products.id, item.productId));
            
            if (product) {
              try {
                // Enrich product with main image URL
                const enrichedProducts = await this.enrichProductsWithMainImage([product]);
                const enrichedProduct = enrichedProducts[0];
                
                let attributeDetails = undefined;
                
                // If there's a combination, get more details
                if (item.combinationId) {
                  try {
                    const [combination] = await db
                      .select()
                      .from(productAttributeCombinations)
                      .where(eq(productAttributeCombinations.id, item.combinationId));
                      
                    if (combination) {
                      // Get category attributes - COMMENTED OUT as part of attribute system redesign
                      // const categoryAttributes = await this.getCategoryAttributes(enrichedProduct.categoryId);
                      
                      attributeDetails = {
                        combination,
                        attributes: item.selectedAttributes
                        // categoryAttributes removed as part of attribute system redesign
                      };
                    }
                  } catch (combinationError) {
                    console.error(`Error fetching attribute combination ${item.combinationId} for order item ${item.id}:`, combinationError);
                    // Continue without attribute details
                  }
                }
                
                items.push({
                  ...item,
                  product: enrichedProduct,
                  attributeDetails
                });
              } catch (enrichError) {
                console.error(`Error enriching product ${product.id} with images for order item ${item.id}:`, enrichError);
                // Add the item with the basic product info
                items.push({
                  ...item,
                  product: product
                });
              }
            }
          } catch (productError) {
            console.error(`Error fetching product ${item.productId} for order item ${item.id}:`, productError);
            // Continue to next order item
          }
        }
        
        return {
          ...order,
          items
        };
      } catch (itemsError) {
        console.error(`Error fetching order items for order ${id}:`, itemsError);
        // Return order without items
        return {
          ...order,
          items: []
        };
      }
    } catch (error) {
      console.error(`Error in getOrderById for order ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }
  
  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    try {
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
    } catch (error) {
      console.error(`Error updating status to "${status}" for order ${id}:`, error);
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
      
      return result;
    } catch (error) {
      console.error(`Error fetching images for product ${productId}:`, error);
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
        
      return result;
    } catch (error) {
      console.error(`Error fetching background-removed images for product ${productId}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async getProductImageById(id: number): Promise<ProductImage | undefined> {
    try {
      const [image] = await db
        .select()
        .from(productImages)
        .where(eq(productImages.id, id));
      return image;
    } catch (error) {
      console.error(`Error fetching image with ID ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }
  
  async createProductImage(image: InsertProductImage): Promise<ProductImage> {
    try {
      // If this is marked as main image, unset any existing main image
      if (image.isMain && image.productId) {
        try {
          await db
            .update(productImages)
            .set({ isMain: false })
            .where(
              and(
                eq(productImages.productId, image.productId),
                eq(productImages.isMain, true)
              )
            );
        } catch (updateError) {
          console.error(`Error unsetting existing main image for product ${image.productId}:`, updateError);
          throw updateError; // Rethrow so the route handler can catch it and send a proper error response
        }
      }
      
      try {
        const [newImage] = await db.insert(productImages).values(image).returning();
        return newImage;
      } catch (insertError) {
        console.error('Error inserting new product image:', insertError);
        throw insertError; // Rethrow so the route handler can catch it and send a proper error response
      }
    } catch (error) {
      console.error('Error in createProductImage:', error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async updateProductImage(id: number, imageData: Partial<InsertProductImage>): Promise<ProductImage | undefined> {
    try {
      // If this is marked as main image, unset any existing main images
      if (imageData.isMain && imageData.productId) {
        try {
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
        } catch (updateError) {
          console.error(`Error unsetting existing main image for product ${imageData.productId}:`, updateError);
          throw updateError; // Rethrow so the route handler can catch it and send a proper error response
        }
      }
      
      try {
        const [updatedImage] = await db
          .update(productImages)
          .set(imageData)
          .where(eq(productImages.id, id))
          .returning();
        
        return updatedImage;
      } catch (updateError) {
        console.error(`Error updating product image ${id}:`, updateError);
        throw updateError; // Rethrow so the route handler can catch it and send a proper error response
      }
    } catch (error) {
      console.error(`Error in updateProductImage for image ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async setMainProductImage(productId: number, imageId: number): Promise<boolean> {
    try {
      // Unset existing main image
      try {
        await db
          .update(productImages)
          .set({ isMain: false })
          .where(
            and(
              eq(productImages.productId, productId),
              eq(productImages.isMain, true)
            )
          );
      } catch (unsetError) {
        console.error(`Error unsetting existing main image for product ${productId}:`, unsetError);
        throw unsetError; // Rethrow so the route handler can catch it and send a proper error response
      }
      
      try {
        // Set new main image
        const [updatedImage] = await db
          .update(productImages)
          .set({ isMain: true })
          .where(eq(productImages.id, imageId))
          .returning();
        
        return !!updatedImage;
      } catch (setError) {
        console.error(`Error setting image ${imageId} as main for product ${productId}:`, setError);
        throw setError; // Rethrow so the route handler can catch it and send a proper error response
      }
    } catch (error) {
      console.error(`Error in setMainProductImage for product ${productId} and image ${imageId}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async deleteProductImage(id: number): Promise<boolean> {
    try {
      const [image] = await db
        .select()
        .from(productImages)
        .where(eq(productImages.id, id));
        
      if (image) {
        // Delete the image file from object storage if it exists
        if (image.objectKey) {
          try {
            await objectStore.deleteFile(image.objectKey);
            console.log(`Deleted original image from object storage: ${image.objectKey}`);
          } catch (error) {
            console.error(`Error deleting original image from object storage: ${image.objectKey}`, error);
            // Continue with deletion even if file deletion fails
          }
        }
        
        // Delete the background-removed image if it exists
        if (image.bgRemovedObjectKey) {
          try {
            await objectStore.deleteFile(image.bgRemovedObjectKey);
            console.log(`Deleted bg removed image from object storage: ${image.bgRemovedObjectKey}`);
          } catch (error) {
            console.error(`Error deleting bg removed image from object storage: ${image.bgRemovedObjectKey}`, error);
            // Continue with deletion even if file deletion fails
          }
        }
      }
      
      // Delete the database record
      await db.delete(productImages).where(eq(productImages.id, id));
      return true;
    } catch (error) {
      console.error(`Error deleting product image ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }
  
  async deleteProduct(id: number): Promise<boolean> {
    try {
      // First, get all product images to delete them from object storage
      const productImagesData = await this.getProductImages(id);
      
      // Delete each image from database and object storage
      for (const image of productImagesData) {
        try {
          await this.deleteProductImage(image.id);
        } catch (imageError) {
          console.error(`Error deleting product image ID ${image.id}:`, imageError);
          // Continue with deletion even if a specific image deletion fails
        }
      }
      
      // Additionally, search for any files in the product's folder that might not be linked in the database
      try {
        const productFolderPrefix = `${STORAGE_FOLDERS.PRODUCTS}/${id}/`;
        const filesList = await objectStore.listFiles(productFolderPrefix, true);
        
        console.log(`Found ${filesList.length} files in product folder ${productFolderPrefix} to delete`);
        
        // Delete each file found in the folder
        for (const objectKey of filesList) {
          try {
            await objectStore.deleteFile(objectKey);
            console.log(`Deleted orphaned file from object storage: ${objectKey}`);
          } catch (fileError) {
            console.error(`Error deleting orphaned file ${objectKey}:`, fileError);
            // Continue with deletion even if file deletion fails
          }
        }
      } catch (folderError) {
        console.error(`Error listing product files for cleanup:`, folderError);
        // Continue with deletion even if listing fails
      }
      
      try {
        // Delete product attribute values
        await db.delete(productAttributeValues).where(eq(productAttributeValues.productId, id));
      } catch (attrValuesError) {
        console.error(`Error deleting product attribute values for product ${id}:`, attrValuesError);
        // Continue with deletion
      }
      
      // Skip product attribute combinations as they might not be needed anymore
      // Leaving comment for future reference in case this needs to be re-implemented
      /*try {
        // Delete product attribute combinations
        if (typeof productAttributeCombinations !== 'undefined') {
          await db.delete(productAttributeCombinations).where(eq(productAttributeCombinations.productId, id));
        }
      } catch (combosError) {
        console.error(`Error deleting product attribute combinations for product ${id}:`, combosError);
        // Continue with deletion
      }*/
      
      // Finally delete the product itself
      await db.delete(products).where(eq(products.id, id));
      
      return true;
    } catch (error) {
      console.error(`Error deleting product ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }
  
  async bulkUpdateProductStatus(productIds: number[], isActive: boolean): Promise<number> {
    try {
      if (productIds.length === 0) {
        return 0;
      }
      
      try {
        // Update all products in the list to the new status
        await db
          .update(products)
          .set({ isActive })
          .where(inArray(products.id, productIds));
          
        // Return the number of affected rows
        return productIds.length;
      } catch (updateError) {
        console.error(`Error updating status to ${isActive ? 'active' : 'inactive'} for ${productIds.length} products:`, updateError);
        throw updateError; // Rethrow so the route handler can catch it and send a proper error response
      }
    } catch (error) {
      console.error(`Error in bulkUpdateProductStatus for ${productIds.length} products:`, error);
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
    const query = db
      .select({
        ...products,
        categoryName: categories.name
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id));

    if (activeOnly) {
      return await query
        .where(
          and(
            eq(products.catalogId, catalogId),
            eq(products.isActive, true)
          )
        )
        .limit(limit)
        .offset(offset);
    } else {
      return await query
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
    try {
      await db
        .delete(productAttributeCombinations)
        .where(eq(productAttributeCombinations.id, id));
      return true;
    } catch (error) {
      console.error(`Error deleting product attribute combination ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
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
  */

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
  
  // Catalog attribute operations
  async getCatalogAttributes(catalogId: number): Promise<(CatalogAttribute & { attribute: Attribute })[]> {
    const result = await db
      .select({
        catalogAttribute: catalogAttributes,
        attribute: attributes
      })
      .from(catalogAttributes)
      .innerJoin(attributes, eq(catalogAttributes.attributeId, attributes.id))
      .where(eq(catalogAttributes.catalogId, catalogId))
      .orderBy(asc(catalogAttributes.sortOrder));
    
    return result.map(row => ({
      ...row.catalogAttribute,
      attribute: row.attribute
    }));
  }
  
  async getCatalogAttributeById(id: number): Promise<(CatalogAttribute & { attribute: Attribute }) | undefined> {
    const result = await db
      .select({
        catalogAttribute: catalogAttributes,
        attribute: attributes
      })
      .from(catalogAttributes)
      .innerJoin(attributes, eq(catalogAttributes.attributeId, attributes.id))
      .where(eq(catalogAttributes.id, id));
    
    if (result.length === 0) {
      return undefined;
    }
    
    return {
      ...result[0].catalogAttribute,
      attribute: result[0].attribute
    };
  }
  
  async createCatalogAttribute(catalogAttribute: InsertCatalogAttribute): Promise<CatalogAttribute> {
    const [newCatalogAttribute] = await db
      .insert(catalogAttributes)
      .values(catalogAttribute)
      .returning();
    return newCatalogAttribute;
  }
  
  async updateCatalogAttribute(id: number, catalogAttributeData: Partial<InsertCatalogAttribute>): Promise<CatalogAttribute | undefined> {
    const [updatedCatalogAttribute] = await db
      .update(catalogAttributes)
      .set(catalogAttributeData)
      .where(eq(catalogAttributes.id, id))
      .returning();
    return updatedCatalogAttribute;
  }
  
  async deleteCatalogAttribute(id: number): Promise<boolean> {
    try {
      await db
        .delete(catalogAttributes)
        .where(eq(catalogAttributes.id, id));
      return true;
    } catch (error) {
      console.error(`Error deleting catalog attribute ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }
  
  // Catalog attribute options operations
  async getCatalogAttributeOptions(catalogAttributeId: number): Promise<(CatalogAttributeOption & { baseOption?: AttributeOption })[]> {
    const result = await db
      .select({
        catalogOption: catalogAttributeOptions,
        baseOption: attributeOptions
      })
      .from(catalogAttributeOptions)
      .leftJoin(attributeOptions, eq(catalogAttributeOptions.baseOptionId, attributeOptions.id))
      .where(eq(catalogAttributeOptions.catalogAttributeId, catalogAttributeId))
      .orderBy(asc(catalogAttributeOptions.sortOrder));
    
    return result.map(row => ({
      ...row.catalogOption,
      baseOption: row.baseOption || undefined
    }));
  }
  
  async getCatalogAttributeOptionById(id: number): Promise<CatalogAttributeOption | undefined> {
    const [option] = await db
      .select()
      .from(catalogAttributeOptions)
      .where(eq(catalogAttributeOptions.id, id));
    return option;
  }
  
  async createCatalogAttributeOption(option: InsertCatalogAttributeOption): Promise<CatalogAttributeOption> {
    const [newOption] = await db
      .insert(catalogAttributeOptions)
      .values(option)
      .returning();
    return newOption;
  }
  
  async updateCatalogAttributeOption(id: number, optionData: Partial<InsertCatalogAttributeOption>): Promise<CatalogAttributeOption | undefined> {
    const [updatedOption] = await db
      .update(catalogAttributeOptions)
      .set(optionData)
      .where(eq(catalogAttributeOptions.id, id))
      .returning();
    return updatedOption;
  }
  
  async deleteCatalogAttributeOption(id: number): Promise<boolean> {
    try {
      await db
        .delete(catalogAttributeOptions)
        .where(eq(catalogAttributeOptions.id, id));
      return true;
    } catch (error) {
      console.error(`Error deleting catalog attribute option ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }
  
  async updateCatalogAttributeOptionsOrder(catalogAttributeId: number, optionIds: number[]): Promise<boolean> {
    try {
      // Start a transaction
      await db.transaction(async (tx) => {
        // Update the sort order for each option
        for (let i = 0; i < optionIds.length; i++) {
          await tx
            .update(catalogAttributeOptions)
            .set({ sortOrder: i })
            .where(and(
              eq(catalogAttributeOptions.id, optionIds[i]),
              eq(catalogAttributeOptions.catalogAttributeId, catalogAttributeId)
            ));
        }
      });
      return true;
    } catch (error) {
      console.error(`Error updating catalog attribute options order for catalogAttributeId ${catalogAttributeId}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }
  
  // Category attribute operations
  async getCategoryAttributes(categoryId: number): Promise<(CategoryAttribute & { attribute: Attribute })[]> {
    const result = await db
      .select({
        categoryAttribute: categoryAttributes,
        attribute: attributes
      })
      .from(categoryAttributes)
      .innerJoin(attributes, eq(categoryAttributes.attributeId, attributes.id))
      .where(eq(categoryAttributes.categoryId, categoryId))
      .orderBy(asc(categoryAttributes.sortOrder));
    
    return result.map(row => ({
      ...row.categoryAttribute,
      attribute: row.attribute
    }));
  }
  
  async getCategoryAttributeById(id: number): Promise<(CategoryAttribute & { attribute: Attribute }) | undefined> {
    const result = await db
      .select({
        categoryAttribute: categoryAttributes,
        attribute: attributes
      })
      .from(categoryAttributes)
      .innerJoin(attributes, eq(categoryAttributes.attributeId, attributes.id))
      .where(eq(categoryAttributes.id, id));
    
    if (result.length === 0) {
      return undefined;
    }
    
    return {
      ...result[0].categoryAttribute,
      attribute: result[0].attribute
    };
  }
  
  async createCategoryAttribute(categoryAttribute: InsertCategoryAttribute): Promise<CategoryAttribute> {
    const [newCategoryAttribute] = await db
      .insert(categoryAttributes)
      .values(categoryAttribute)
      .returning();
    return newCategoryAttribute;
  }
  
  async updateCategoryAttribute(id: number, categoryAttributeData: Partial<InsertCategoryAttribute>): Promise<CategoryAttribute | undefined> {
    const [updatedCategoryAttribute] = await db
      .update(categoryAttributes)
      .set(categoryAttributeData)
      .where(eq(categoryAttributes.id, id))
      .returning();
    return updatedCategoryAttribute;
  }
  
  async deleteCategoryAttribute(id: number): Promise<boolean> {
    try {
      await db
        .delete(categoryAttributes)
        .where(eq(categoryAttributes.id, id));
      return true;
    } catch (error) {
      console.error(`Error deleting category attribute ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }
  
  // Category attribute options operations
  async getCategoryAttributeOptions(categoryAttributeId: number): Promise<(CategoryAttributeOption & { 
    baseOption?: AttributeOption, 
    catalogOption?: CatalogAttributeOption 
  })[]> {
    const result = await db
      .select({
        categoryOption: categoryAttributeOptions,
        baseOption: attributeOptions,
        catalogOption: catalogAttributeOptions
      })
      .from(categoryAttributeOptions)
      .leftJoin(attributeOptions, eq(categoryAttributeOptions.baseOptionId, attributeOptions.id))
      .leftJoin(catalogAttributeOptions, eq(categoryAttributeOptions.catalogOptionId, catalogAttributeOptions.id))
      .where(eq(categoryAttributeOptions.categoryAttributeId, categoryAttributeId))
      .orderBy(asc(categoryAttributeOptions.sortOrder));
    
    return result.map(row => ({
      ...row.categoryOption,
      baseOption: row.baseOption || undefined,
      catalogOption: row.catalogOption || undefined
    }));
  }
  
  async getCategoryAttributeOptionById(id: number): Promise<CategoryAttributeOption | undefined> {
    const [option] = await db
      .select()
      .from(categoryAttributeOptions)
      .where(eq(categoryAttributeOptions.id, id));
    return option;
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
  
  async updateCategoryAttributeOptionsOrder(categoryAttributeId: number, optionIds: number[]): Promise<boolean> {
    try {
      // Start a transaction
      await db.transaction(async (tx) => {
        // Update the sort order for each option
        for (let i = 0; i < optionIds.length; i++) {
          await tx
            .update(categoryAttributeOptions)
            .set({ sortOrder: i })
            .where(and(
              eq(categoryAttributeOptions.id, optionIds[i]),
              eq(categoryAttributeOptions.categoryAttributeId, categoryAttributeId)
            ));
        }
      });
      return true;
    } catch (error) {
      console.error(`Error updating category attribute options order for categoryAttributeId ${categoryAttributeId}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }
  
  // Product attribute operations
  async getProductAttributes(productId: number): Promise<(ProductAttribute & { attribute: Attribute })[]> {
    const result = await db
      .select({
        productAttribute: productAttributes,
        attribute: attributes
      })
      .from(productAttributes)
      .innerJoin(attributes, eq(productAttributes.attributeId, attributes.id))
      .where(eq(productAttributes.productId, productId))
      .orderBy(asc(productAttributes.sortOrder));
    
    return result.map(row => ({
      ...row.productAttribute,
      attribute: row.attribute
    }));
  }
  
  async getProductAttributeById(id: number): Promise<(ProductAttribute & { attribute: Attribute }) | undefined> {
    const result = await db
      .select({
        productAttribute: productAttributes,
        attribute: attributes
      })
      .from(productAttributes)
      .innerJoin(attributes, eq(productAttributes.attributeId, attributes.id))
      .where(eq(productAttributes.id, id));
    
    if (result.length === 0) {
      return undefined;
    }
    
    return {
      ...result[0].productAttribute,
      attribute: result[0].attribute
    };
  }
  
  async createProductAttribute(productAttribute: InsertProductAttribute): Promise<ProductAttribute> {
    const [newProductAttribute] = await db
      .insert(productAttributes)
      .values(productAttribute)
      .returning();
    return newProductAttribute;
  }
  
  async updateProductAttribute(id: number, productAttributeData: Partial<InsertProductAttribute>): Promise<ProductAttribute | undefined> {
    const [updatedProductAttribute] = await db
      .update(productAttributes)
      .set(productAttributeData)
      .where(eq(productAttributes.id, id))
      .returning();
    return updatedProductAttribute;
  }
  
  async deleteProductAttribute(id: number): Promise<boolean> {
    try {
      await db
        .delete(productAttributes)
        .where(eq(productAttributes.id, id));
      return true;
    } catch (error) {
      console.error(`Error deleting product attribute ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }
  
  // Product attribute options operations
  async getProductAttributeOptions(productAttributeId: number): Promise<(ProductAttributeOption & { 
    baseOption?: AttributeOption, 
    catalogOption?: CatalogAttributeOption,
    categoryOption?: CategoryAttributeOption
  })[]> {
    const result = await db
      .select({
        productOption: productAttributeOptions,
        baseOption: attributeOptions,
        catalogOption: catalogAttributeOptions,
        categoryOption: categoryAttributeOptions
      })
      .from(productAttributeOptions)
      .leftJoin(attributeOptions, eq(productAttributeOptions.baseOptionId, attributeOptions.id))
      .leftJoin(catalogAttributeOptions, eq(productAttributeOptions.catalogOptionId, catalogAttributeOptions.id))
      .leftJoin(categoryAttributeOptions, eq(productAttributeOptions.categoryOptionId, categoryAttributeOptions.id))
      .where(eq(productAttributeOptions.productAttributeId, productAttributeId))
      .orderBy(asc(productAttributeOptions.sortOrder));
    
    return result.map(row => ({
      ...row.productOption,
      baseOption: row.baseOption || undefined,
      catalogOption: row.catalogOption || undefined,
      categoryOption: row.categoryOption || undefined
    }));
  }
  
  async getProductAttributeOptionById(id: number): Promise<ProductAttributeOption | undefined> {
    const [option] = await db
      .select()
      .from(productAttributeOptions)
      .where(eq(productAttributeOptions.id, id));
    return option;
  }
  
  async createProductAttributeOption(option: InsertProductAttributeOption): Promise<ProductAttributeOption> {
    const [newOption] = await db
      .insert(productAttributeOptions)
      .values(option)
      .returning();
    return newOption;
  }
  
  async updateProductAttributeOption(id: number, optionData: Partial<InsertProductAttributeOption>): Promise<ProductAttributeOption | undefined> {
    const [updatedOption] = await db
      .update(productAttributeOptions)
      .set(optionData)
      .where(eq(productAttributeOptions.id, id))
      .returning();
    return updatedOption;
  }
  
  async deleteProductAttributeOption(id: number): Promise<boolean> {
    try {
      await db
        .delete(productAttributeOptions)
        .where(eq(productAttributeOptions.id, id));
      return true;
    } catch (error) {
      console.error(`Error deleting product attribute option ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }
  
  async updateProductAttributeOptionsOrder(productAttributeId: number, optionIds: number[]): Promise<boolean> {
    try {
      // Start a transaction
      await db.transaction(async (tx) => {
        // Update the sort order for each option
        for (let i = 0; i < optionIds.length; i++) {
          await tx
            .update(productAttributeOptions)
            .set({ sortOrder: i })
            .where(and(
              eq(productAttributeOptions.id, optionIds[i]),
              eq(productAttributeOptions.productAttributeId, productAttributeId)
            ));
        }
      });
      return true;
    } catch (error) {
      console.error(`Error updating product attribute options order for productAttributeId ${productAttributeId}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }
  
  // Product attribute values operations
  async getProductAttributeValues(productId: number): Promise<ProductAttributeValue[]> {
    return await db
      .select()
      .from(productAttributeValues)
      .where(eq(productAttributeValues.productId, productId))
      .orderBy(asc(productAttributeValues.sortOrder));
  }
  
  async getProductAttributeValueById(id: number): Promise<ProductAttributeValue | undefined> {
    const [value] = await db
      .select()
      .from(productAttributeValues)
      .where(eq(productAttributeValues.id, id));
    return value;
  }
  
  async createProductAttributeValue(value: InsertProductAttributeValue): Promise<ProductAttributeValue> {
    const [newValue] = await db
      .insert(productAttributeValues)
      .values(value)
      .returning();
    return newValue;
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

  // Attribute discount rules operations
  async getAllAttributeDiscountRules(): Promise<AttributeDiscountRule[]> {
    return await db
      .select()
      .from(attributeDiscountRules)
      .orderBy(asc(attributeDiscountRules.name));
  }

  async getAttributeDiscountRule(id: number): Promise<AttributeDiscountRule | undefined> {
    const [rule] = await db
      .select()
      .from(attributeDiscountRules)
      .where(eq(attributeDiscountRules.id, id));
    return rule;
  }

  async getAttributeDiscountRulesByProduct(productId: number): Promise<AttributeDiscountRule[]> {
    const rules = await db
      .select()
      .from(attributeDiscountRules)
      .where(
        and(
          eq(attributeDiscountRules.productId, productId),
          eq(attributeDiscountRules.isActive, true)
        )
      )
      .orderBy(asc(attributeDiscountRules.name));

    return rules;
  }

  async getAttributeDiscountRulesByCategory(categoryId: number): Promise<AttributeDiscountRule[]> {
    const rules = await db
      .select()
      .from(attributeDiscountRules)
      .where(
        and(
          eq(attributeDiscountRules.categoryId, categoryId),
          eq(attributeDiscountRules.isActive, true)
        )
      )
      .orderBy(asc(attributeDiscountRules.name));

    return rules;
  }

  async getAttributeDiscountRulesByCatalog(catalogId: number): Promise<AttributeDiscountRule[]> {
    const rules = await db
      .select()
      .from(attributeDiscountRules)
      .where(
        and(
          eq(attributeDiscountRules.catalogId, catalogId),
          eq(attributeDiscountRules.isActive, true)
        )
      )
      .orderBy(asc(attributeDiscountRules.name));

    return rules;
  }

  async getAttributeDiscountRulesByAttribute(attributeId: number): Promise<AttributeDiscountRule[]> {
    const rules = await db
      .select()
      .from(attributeDiscountRules)
      .where(
        and(
          eq(attributeDiscountRules.attributeId, attributeId),
          eq(attributeDiscountRules.isActive, true)
        )
      )
      .orderBy(asc(attributeDiscountRules.name));

    return rules;
  }

  async createAttributeDiscountRule(rule: InsertAttributeDiscountRule): Promise<AttributeDiscountRule> {
    const [newRule] = await db
      .insert(attributeDiscountRules)
      .values(rule)
      .returning();
    return newRule;
  }

  async updateAttributeDiscountRule(id: number, ruleData: Partial<InsertAttributeDiscountRule>): Promise<AttributeDiscountRule | undefined> {
    const [updatedRule] = await db
      .update(attributeDiscountRules)
      .set(ruleData)
      .where(eq(attributeDiscountRules.id, id))
      .returning();
    return updatedRule;
  }

  async deleteAttributeDiscountRule(id: number): Promise<boolean> {
    try {
      await db
        .delete(attributeDiscountRules)
        .where(eq(attributeDiscountRules.id, id));
      return true;
    } catch (error) {
      console.error(`Error deleting attribute discount rule ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async calculateAttributeBasedPriceAdjustments(
    productId: number, 
    selectedAttributes: Record<string, any>, 
    quantity: number = 1
  ): Promise<{
    adjustments: Array<{
      ruleId: number,
      ruleName: string,
      discountType: string,
      discountValue: number,
      appliedValue: number
    }>,
    totalAdjustment: number
  }> {
    // Get product details
    const product = await this.getProductById(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Get all active discount rules that apply to this product
    const directRules = await this.getAttributeDiscountRulesByProduct(productId);
    
    // Get category-based rules
    const categoryRules = product.categoryId 
      ? await this.getAttributeDiscountRulesByCategory(product.categoryId)
      : [];
    
    // Get catalog-based rules
    const catalogRules = product.catalogId
      ? await this.getAttributeDiscountRulesByCatalog(product.catalogId)
      : [];
    
    // Combine all rules
    const allRules = [...directRules, ...categoryRules, ...catalogRules];
    
    // Get attribute IDs from selected attributes
    const attributeIds = Object.keys(selectedAttributes).map(key => parseInt(key));
    
    // Filter rules based on attribute IDs and selected options
    const applicableRules = allRules.filter(rule => {
      // Filter by attribute ID
      if (!attributeIds.includes(rule.attributeId)) {
        return false;
      }
      
      // If rule has optionId, check if it matches the selected option
      if (rule.optionId) {
        const selectedOption = selectedAttributes[rule.attributeId.toString()];
        if (typeof selectedOption === 'object' && selectedOption.optionId !== rule.optionId) {
          return false;
        } else if (typeof selectedOption === 'number' && selectedOption !== rule.optionId) {
          return false;
        }
      }
      
      // Check quantity threshold
      if (rule.minQuantity && quantity < rule.minQuantity) {
        return false;
      }
      
      // Check date range
      const now = new Date();
      if (rule.startDate && new Date(rule.startDate) > now) {
        return false;
      }
      if (rule.endDate && new Date(rule.endDate) < now) {
        return false;
      }
      
      return true;
    });
    
    // Calculate adjustments
    const adjustments = applicableRules.map(rule => {
      let appliedValue = 0;
      
      if (rule.discountType === 'percentage') {
        appliedValue = product.price * (rule.discountValue / 100);
      } else { // 'fixed'
        appliedValue = parseFloat(rule.discountValue.toString());
      }
      
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        discountType: rule.discountType,
        discountValue: parseFloat(rule.discountValue.toString()),
        appliedValue: appliedValue
      };
    });
    
    // Calculate total adjustment
    const totalAdjustment = adjustments.reduce((sum, adjustment) => sum + adjustment.appliedValue, 0);
    
    return {
      adjustments,
      totalAdjustment
    };
  }
}

export const storage = new DatabaseStorage();
