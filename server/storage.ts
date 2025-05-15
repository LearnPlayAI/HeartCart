import { eq, and, sql, desc, isNull, or, inArray, asc, SQL, like, ne } from 'drizzle-orm';
import { db, formatDateForDb, setSessionTimezone } from './db';
import { users, products, categories, orders, catalogs, suppliers, attributes, productAttributes, productDrafts, productImages, attributeOptions, cartItems, type User, type Product, type Order, type Attribute, type ProductDraft, type Catalog, type Supplier } from '@shared/schema';
import { logger } from './logger';
import * as fs from 'fs';
import { slugify } from './utils/slugify';
import { objectStore } from './object-store';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from './db';

/**
 * Storage interface for all data operations
 */
export interface IStorage {
  // User-related operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: any): Promise<User>;
  updateUser(id: number, data: any): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  
  // Product-related operations
  getProductById(id: number): Promise<any>;
  getProductBySlug(slug: string): Promise<any>;
  getAllProducts(options?: any): Promise<any[]>;
  getProductsByCatalogId(catalogId: number, options?: any): Promise<any[]>;
  getProductsBySupplierId(supplierId: number, options?: any): Promise<any[]>;
  getProductsByUserId(userId: number, options?: any): Promise<any[]>;
  createProduct(product: any): Promise<any>;
  updateProduct(id: number, data: any): Promise<any>;
  deleteProduct(id: number): Promise<boolean>;
  
  // Category-related operations
  getCategoryById(id: number): Promise<any>;
  getAllCategories(): Promise<any[]>;
  createCategory(category: any): Promise<any>;
  updateCategory(id: number, data: any): Promise<any>;
  deleteCategory(id: number): Promise<boolean>;
  
  // Catalog-related operations
  getCatalogById(id: number): Promise<any>;
  getAllCatalogs(): Promise<any[]>;
  getCatalogsBySupplierId(supplierId: number): Promise<any[]>;
  createCatalog(catalog: any): Promise<any>;
  updateCatalog(id: number, data: any): Promise<any>;
  deleteCatalog(id: number): Promise<boolean>;
  
  // Supplier-related operations
  getSupplierById(id: number): Promise<any>;
  getAllSuppliers(): Promise<any[]>;
  createSupplier(supplier: any): Promise<any>;
  updateSupplier(id: number, data: any): Promise<any>;
  deleteSupplier(id: number): Promise<boolean>;
  
  // Order-related operations
  getOrderById(id: number): Promise<any>;
  getAllOrders(): Promise<any[]>;
  getOrdersByUserId(userId: number): Promise<any[]>;
  createOrder(order: any): Promise<any>;
  updateOrder(id: number, data: any): Promise<any>;
  deleteOrder(id: number): Promise<boolean>;
  
  // Cart-related operations
  getCartByUserId(userId: number): Promise<any>;
  addItemToCart(userId: number, productId: number, quantity: number): Promise<any>;
  updateCartItem(userId: number, cartItemId: number, quantity: number): Promise<any>;
  removeCartItem(userId: number, cartItemId: number): Promise<boolean>;
  clearCart(userId: number): Promise<boolean>;
  
  // Review-related operations
  getReviewById(id: number): Promise<any>;
  getReviewsByProductId(productId: number): Promise<any[]>;
  getReviewsByUserId(userId: number): Promise<any[]>;
  createReview(review: any): Promise<any>;
  updateReview(id: number, data: any): Promise<any>;
  deleteReview(id: number): Promise<boolean>;
  
  // Attribute-related operations
  getAttributeById(id: number): Promise<Attribute | undefined>;
  getAllAttributes(): Promise<Attribute[]>;
  getAttributesByCategoryId(categoryId: number): Promise<Attribute[]>;
  getAttributesByProductId(productId: number): Promise<any[]>;
  createAttribute(attribute: any): Promise<Attribute>;
  updateAttribute(id: number, data: any): Promise<Attribute | undefined>;
  deleteAttribute(id: number): Promise<boolean>;
  getAttributeOptions(attributeId: number): Promise<any[]>;
  addAttributeOption(attributeId: number, option: any): Promise<any>;
  updateAttributeOption(optionId: number, data: any): Promise<any>;
  deleteAttributeOption(optionId: number): Promise<boolean>;
  
  // Product Draft operations
  getProductDraft(id: number): Promise<ProductDraft | undefined>;
  getProductDraftsByUserId(userId: number, options?: any): Promise<ProductDraft[]>;
  getUserProductDrafts(userId: number, catalogId?: number): Promise<any[]>;
  deleteProductDraft(userId: number, draftId: string | number): Promise<boolean>;
  createDraftFromProduct(productId: number, userId?: number): Promise<ProductDraft | undefined>;
  
  // API Testing support methods
  getProductWithSlug(): Promise<Product | undefined>;
  getAllOrders(): Promise<Order[]>;
  getAllCatalogs(): Promise<Catalog[]>;
  getAllAttributes(): Promise<Attribute[]>;
  
  // Session store for authentication testing
  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  /**
   * Helper method to enrich products with their main image URL and additional images
   * @param productList The list of products to enrich
   * @returns The enriched product list with imageUrl and additionalImages fields
   */
  private async enrichProductsWithMainImage(productList: Product[]): Promise<Product[]> {
    if (!productList || productList.length === 0) {
      return [];
    }
    
    return productList.map(product => {
      return {
        ...product,
        imageUrl: product.mainImageUrl || '/placeholder-product.jpg',
        additionalImages: [] // Will be populated as needed
      };
    });
  }
  
  // Establish the session store for authentication
  sessionStore = (() => {
    const PgSession = connectPgSimple(session);
    return new PgSession({
      pool,
      tableName: 'sessions',
      createTableIfMissing: true,
    });
  })();
  
  // USER-RELATED METHODS
  
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async createUser(userData: any): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }
  
  async updateUser(id: number, data: any): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    await db.delete(users).where(eq(users.id, id));
    return true;
  }
  
  // CATEGORY-RELATED METHODS
  
  async getCategoryById(id: number): Promise<any> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }
  
  async getAllCategories(): Promise<any[]> {
    return await db.select().from(categories).orderBy(categories.name);
  }
  
  async createCategory(categoryData: any): Promise<any> {
    const [category] = await db.insert(categories).values(categoryData).returning();
    return category;
  }
  
  async updateCategory(id: number, data: any): Promise<any> {
    const [updatedCategory] = await db
      .update(categories)
      .set(data)
      .where(eq(categories.id, id))
      .returning();
    return updatedCategory;
  }
  
  async deleteCategory(id: number): Promise<boolean> {
    await db.delete(categories).where(eq(categories.id, id));
    return true;
  }
  
  // PRODUCT-RELATED METHODS
  
  async getProductById(id: number): Promise<any> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    if (!product) return undefined;
    
    // Enrich with main image URL
    const enrichedProducts = await this.enrichProductsWithMainImage([product]);
    return enrichedProducts[0];
  }
  
  async getProductBySlug(slug: string): Promise<any> {
    const [product] = await db.select().from(products).where(eq(products.slug, slug));
    if (!product) return undefined;
    
    // Enrich with main image URL
    const enrichedProducts = await this.enrichProductsWithMainImage([product]);
    return enrichedProducts[0];
  }
  
  async getAllProducts(options: any = {}): Promise<any[]> {
    const { limit, offset, categoryId, isActive, isFeatured, sortBy, sortOrder } = options;
    
    // Start with a base query
    let query = db.select().from(products);
    
    // Apply filters
    if (categoryId) {
      query = query.where(eq(products.categoryId, categoryId));
    }
    
    if (isActive !== undefined) {
      query = query.where(eq(products.isActive, isActive));
    }
    
    if (isFeatured !== undefined) {
      query = query.where(eq(products.isFeatured, isFeatured));
    }
    
    // Apply sorting
    if (sortBy) {
      const column = products[sortBy as keyof typeof products] || products.createdAt;
      query = query.orderBy(sortOrder === 'asc' ? asc(column) : desc(column));
    } else {
      // Default sorting
      query = query.orderBy(desc(products.createdAt));
    }
    
    // Apply pagination
    if (limit) {
      query = query.limit(limit);
    }
    
    if (offset) {
      query = query.offset(offset);
    }
    
    // Execute the query
    const productList = await query;
    
    // Enrich products with main image URL
    return this.enrichProductsWithMainImage(productList);
  }
  
  async getProductsByCatalogId(catalogId: number, options: any = {}): Promise<any[]> {
    // Get products in the catalog
    const productList = await db
      .select()
      .from(products)
      .where(eq(products.catalogId, catalogId));
    
    // Enrich products with main image URL
    return this.enrichProductsWithMainImage(productList);
  }
  
  async getProductsBySupplierId(supplierId: number, options: any = {}): Promise<any[]> {
    // Get products from the supplier
    const productList = await db
      .select()
      .from(products)
      .where(eq(products.supplierId, supplierId));
    
    // Enrich products with main image URL
    return this.enrichProductsWithMainImage(productList);
  }
  
  async getProductsByUserId(userId: number, options: any = {}): Promise<any[]> {
    // For now, assume user created products are linked by a createdBy field
    // This may need to be adjusted based on actual schema
    const productList = await db
      .select()
      .from(products)
      .where(eq(products.createdBy, userId));
    
    // Enrich products with main image URL
    return this.enrichProductsWithMainImage(productList);
  }
  
  async createProduct(productData: any): Promise<any> {
    // Ensure slug is created if not provided
    if (!productData.slug && productData.name) {
      productData.slug = slugify(productData.name);
    }
    
    const [product] = await db.insert(products).values(productData).returning();
    
    // Enrich with main image URL
    const enrichedProducts = await this.enrichProductsWithMainImage([product]);
    return enrichedProducts[0];
  }
  
  async updateProduct(id: number, data: any): Promise<any> {
    // Update slug if name is changing and slug is not provided
    if (data.name && !data.slug) {
      data.slug = slugify(data.name);
    }
    
    const [updatedProduct] = await db
      .update(products)
      .set(data)
      .where(eq(products.id, id))
      .returning();
    
    // Enrich with main image URL
    const enrichedProducts = await this.enrichProductsWithMainImage([updatedProduct]);
    return enrichedProducts[0];
  }
  
  async deleteProduct(id: number): Promise<boolean> {
    await db.delete(products).where(eq(products.id, id));
    return true;
  }
  
  // CATALOG-RELATED METHODS
  
  async getCatalogById(id: number): Promise<any> {
    const [catalog] = await db.select().from(catalogs).where(eq(catalogs.id, id));
    return catalog;
  }
  
  async getAllCatalogs(): Promise<any[]> {
    return await db.select().from(catalogs).orderBy(catalogs.name);
  }
  
  async getCatalogsBySupplierId(supplierId: number): Promise<any[]> {
    return await db
      .select()
      .from(catalogs)
      .where(eq(catalogs.supplierId, supplierId))
      .orderBy(catalogs.name);
  }
  
  async createCatalog(catalogData: any): Promise<any> {
    const [catalog] = await db.insert(catalogs).values(catalogData).returning();
    return catalog;
  }
  
  async updateCatalog(id: number, data: any): Promise<any> {
    const [updatedCatalog] = await db
      .update(catalogs)
      .set(data)
      .where(eq(catalogs.id, id))
      .returning();
    return updatedCatalog;
  }
  
  async deleteCatalog(id: number): Promise<boolean> {
    await db.delete(catalogs).where(eq(catalogs.id, id));
    return true;
  }
  
  // SUPPLIER-RELATED METHODS
  
  async getSupplierById(id: number): Promise<any> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return supplier;
  }
  
  async getAllSuppliers(): Promise<any[]> {
    return await db.select().from(suppliers).orderBy(suppliers.name);
  }
  
  async createSupplier(supplierData: any): Promise<any> {
    const [supplier] = await db.insert(suppliers).values(supplierData).returning();
    return supplier;
  }
  
  async updateSupplier(id: number, data: any): Promise<any> {
    const [updatedSupplier] = await db
      .update(suppliers)
      .set(data)
      .where(eq(suppliers.id, id))
      .returning();
    return updatedSupplier;
  }
  
  async deleteSupplier(id: number): Promise<boolean> {
    await db.delete(suppliers).where(eq(suppliers.id, id));
    return true;
  }
  
  // ORDER-RELATED METHODS
  
  async getOrderById(id: number): Promise<any> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }
  
  async getAllOrders(): Promise<Order[]> {
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }
  
  async getOrdersByUserId(userId: number): Promise<any[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));
  }
  
  async createOrder(orderData: any): Promise<any> {
    const [order] = await db.insert(orders).values(orderData).returning();
    return order;
  }
  
  async updateOrder(id: number, data: any): Promise<any> {
    const [updatedOrder] = await db
      .update(orders)
      .set(data)
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }
  
  async deleteOrder(id: number): Promise<boolean> {
    await db.delete(orders).where(eq(orders.id, id));
    return true;
  }
  
  // CART-RELATED METHODS
  
  async getCartByUserId(userId: number): Promise<any> {
    // Find or create the user's cart
    let [userCart] = await db
      .select()
      .from(carts)
      .where(eq(carts.userId, userId));
    
    // If no cart exists, create one
    if (!userCart) {
      [userCart] = await db
        .insert(carts)
        .values({ userId, status: 'active' })
        .returning();
    }
    
    // Get cart items
    const cartItemsList = await db
      .select()
      .from(cartItems)
      .where(eq(cartItems.cartId, userCart.id));
    
    // Get product details for each cart item
    const cartItemsWithProducts = await Promise.all(
      cartItemsList.map(async (item) => {
        const product = await this.getProductById(item.productId);
        return {
          ...item,
          product,
        };
      })
    );
    
    // Return the full cart with items
    return {
      ...userCart,
      items: cartItemsWithProducts,
      totalItems: cartItemsWithProducts.length,
      subtotal: cartItemsWithProducts.reduce(
        (sum, item) => sum + item.quantity * (item.product?.price || 0),
        0
      ),
    };
  }
  
  async addItemToCart(userId: number, productId: number, quantity: number): Promise<any> {
    // Get the user's cart
    const cart = await this.getCartByUserId(userId);
    
    // Check if the product already exists in the cart
    const existingItem = cart.items.find((item: any) => item.productId === productId);
    
    if (existingItem) {
      // Update the quantity
      return await this.updateCartItem(userId, existingItem.id, existingItem.quantity + quantity);
    }
    
    // Add a new item
    const [newItem] = await db
      .insert(cartItems)
      .values({
        cartId: cart.id,
        productId,
        quantity,
      })
      .returning();
    
    // Return the updated cart
    return await this.getCartByUserId(userId);
  }
  
  async updateCartItem(userId: number, cartItemId: number, quantity: number): Promise<any> {
    // Get the user's cart to verify ownership
    const cart = await this.getCartByUserId(userId);
    
    // Check if the item belongs to the user's cart
    const cartItem = cart.items.find((item: any) => item.id === cartItemId);
    
    if (!cartItem) {
      throw new Error('Cart item not found');
    }
    
    if (quantity <= 0) {
      // Remove the item if quantity is zero or negative
      return await this.removeCartItem(userId, cartItemId);
    }
    
    // Update the item quantity
    await db
      .update(cartItems)
      .set({ quantity })
      .where(eq(cartItems.id, cartItemId));
    
    // Return the updated cart
    return await this.getCartByUserId(userId);
  }
  
  async removeCartItem(userId: number, cartItemId: number): Promise<boolean> {
    // Get the user's cart to verify ownership
    const cart = await this.getCartByUserId(userId);
    
    // Check if the item belongs to the user's cart
    const cartItem = cart.items.find((item: any) => item.id === cartItemId);
    
    if (!cartItem) {
      throw new Error('Cart item not found');
    }
    
    // Remove the item
    await db.delete(cartItems).where(eq(cartItems.id, cartItemId));
    
    return true;
  }
  
  async clearCart(userId: number): Promise<boolean> {
    // Get the user's cart
    const cart = await this.getCartByUserId(userId);
    
    // Remove all items from the cart
    await db.delete(cartItems).where(eq(cartItems.cartId, cart.id));
    
    return true;
  }
  
  // REVIEW-RELATED METHODS
  
  async getReviewById(id: number): Promise<any> {
    const [review] = await db.select().from(reviews).where(eq(reviews.id, id));
    return review;
  }
  
  async getReviewsByProductId(productId: number): Promise<any[]> {
    return await db
      .select()
      .from(reviews)
      .where(eq(reviews.productId, productId))
      .orderBy(desc(reviews.createdAt));
  }
  
  async getReviewsByUserId(userId: number): Promise<any[]> {
    return await db
      .select()
      .from(reviews)
      .where(eq(reviews.userId, userId))
      .orderBy(desc(reviews.createdAt));
  }
  
  async createReview(reviewData: any): Promise<any> {
    const [review] = await db.insert(reviews).values(reviewData).returning();
    return review;
  }
  
  async updateReview(id: number, data: any): Promise<any> {
    const [updatedReview] = await db
      .update(reviews)
      .set(data)
      .where(eq(reviews.id, id))
      .returning();
    return updatedReview;
  }
  
  async deleteReview(id: number): Promise<boolean> {
    await db.delete(reviews).where(eq(reviews.id, id));
    return true;
  }
  
  // ATTRIBUTE-RELATED METHODS
  
  async getAttributeById(id: number): Promise<Attribute | undefined> {
    const [attribute] = await db.select().from(attributes).where(eq(attributes.id, id));
    return attribute;
  }
  
  async getAllAttributes(): Promise<Attribute[]> {
    return await db.select().from(attributes).orderBy(attributes.name);
  }
  
  async getAttributesByCategoryId(categoryId: number): Promise<Attribute[]> {
    // Get the attribute category associations
    return await db
      .select()
      .from(attributes)
      .where(eq(attributes.categoryId, categoryId))
      .orderBy(attributes.name);
  }
  
  async getAttributesByProductId(productId: number): Promise<any[]> {
    // Get the product's attributes
    const productAttributesList = await db
      .select()
      .from(productAttributes)
      .where(eq(productAttributes.productId, productId));
    
    // Get details for each attribute
    const attributesWithDetails = await Promise.all(
      productAttributesList.map(async (productAttr) => {
        const attribute = await this.getAttributeById(productAttr.attributeId);
        
        // Get attribute options if applicable
        let options = [];
        if (attribute) {
          options = await this.getAttributeOptions(attribute.id);
        }
        
        return {
          ...productAttr,
          attribute,
          options,
        };
      })
    );
    
    return attributesWithDetails;
  }
  
  async createAttribute(attributeData: any): Promise<Attribute> {
    const [attribute] = await db.insert(attributes).values(attributeData).returning();
    return attribute;
  }
  
  async updateAttribute(id: number, data: any): Promise<Attribute | undefined> {
    const [updatedAttribute] = await db
      .update(attributes)
      .set(data)
      .where(eq(attributes.id, id))
      .returning();
    return updatedAttribute;
  }
  
  async deleteAttribute(id: number): Promise<boolean> {
    await db.delete(attributes).where(eq(attributes.id, id));
    return true;
  }
  
  async getAttributeOptions(attributeId: number): Promise<any[]> {
    return await db
      .select()
      .from(attributeOptions)
      .where(eq(attributeOptions.attributeId, attributeId))
      .orderBy(attributeOptions.displayOrder);
  }
  
  async addAttributeOption(attributeId: number, optionData: any): Promise<any> {
    const [option] = await db
      .insert(attributeOptions)
      .values({
        ...optionData,
        attributeId,
      })
      .returning();
    return option;
  }
  
  async updateAttributeOption(optionId: number, data: any): Promise<any> {
    const [updatedOption] = await db
      .update(attributeOptions)
      .set(data)
      .where(eq(attributeOptions.id, optionId))
      .returning();
    return updatedOption;
  }
  
  async deleteAttributeOption(optionId: number): Promise<boolean> {
    await db.delete(attributeOptions).where(eq(attributeOptions.id, optionId));
    return true;
  }
  
  // PRODUCT DRAFT METHODS
  
  async getProductDraft(id: number): Promise<ProductDraft | undefined> {
    const [draft] = await db.select().from(productDrafts).where(eq(productDrafts.id, id));
    return draft;
  }
  
  async createProductDraft(data: any): Promise<ProductDraft> {
    const [draft] = await db.insert(productDrafts).values(data).returning();
    return draft;
  }
  
  async updateProductDraft(id: number, data: any): Promise<ProductDraft | undefined> {
    const [updatedDraft] = await db
      .update(productDrafts)
      .set(data)
      .where(eq(productDrafts.id, id))
      .returning();
    return updatedDraft;
  }
  
  async deleteProductDraft(userId: number, draftId: string | number): Promise<boolean> {
    // Convert string ID to number if needed
    const id = typeof draftId === 'string' ? parseInt(draftId, 10) : draftId;
    
    // Get the draft to verify ownership
    const draft = await this.getProductDraft(id);
    
    if (!draft) {
      return false; // Draft not found
    }
    
    // Check if user has permission to delete this draft
    if (draft.createdBy !== userId) {
      throw new Error("You don't have permission to delete this draft");
    }
    
    // Delete the draft
    await db.delete(productDrafts).where(eq(productDrafts.id, id));
    
    // Clean up any associated images from storage
    if (draft.imageObjectKeys && draft.imageObjectKeys.length > 0) {
      try {
        for (const key of draft.imageObjectKeys) {
          await objectStore.delete(key);
        }
      } catch (error) {
        logger.error('Error deleting draft images', { error, draftId: id });
        // Continue with deletion even if image cleanup fails
      }
    }
    
    return true;
  }
  
  async getProductDraftsByUserId(userId: number, options: any = {}): Promise<ProductDraft[]> {
    const { catalogId } = options;
    
    let query = db
      .select()
      .from(productDrafts)
      .where(eq(productDrafts.createdBy, userId));
    
    if (catalogId) {
      query = query.where(eq(productDrafts.catalogId, catalogId));
    }
    
    // Sort by most recently updated
    query = query.orderBy(desc(productDrafts.updatedAt));
    
    return await query;
  }
  
  async getUserProductDrafts(userId: number, catalogId?: number): Promise<any[]> {
    return this.getProductDraftsByUserId(userId, { catalogId });
  }
  
  async createDraftFromProduct(productId: number, userId?: number): Promise<ProductDraft | undefined> {
    // Get the existing product
    const product = await this.getProductById(productId);
    
    if (!product) {
      return undefined;
    }
    
    // Create a draft based on the product
    const [draft] = await db
      .insert(productDrafts)
      .values({
        name: product.name,
        slug: product.slug,
        description: product.description,
        regularPrice: product.price,
        salePrice: product.salePrice,
        costPrice: product.costPrice,
        stockLevel: product.stock,
        categoryId: product.categoryId,
        supplierId: product.supplierId,
        catalogId: product.catalogId,
        metaTitle: product.metaTitle,
        metaDescription: product.metaDescription,
        metaKeywords: product.tags && product.tags.length > 0 ? product.tags[0] : null,
        isActive: product.isActive,
        isFeatured: product.isFeatured,
        brand: product.brand,
        draftStatus: 'draft',
        originalProductId: productId,
        createdBy: userId || product.createdBy,
      })
      .returning();
    
    return draft;
  }
  
  // Implementation moved to publishProductDraft.ts
  async publishProductDraft(id: number): Promise<Product | undefined> {
    // This implementation is now in a separate file: server/publishProductDraft.ts
    // We'll just forward the call to that implementation
    const { publishProductDraft } = require('./publishProductDraft');
    return await publishProductDraft(id);
  }
  
  async getProductWithSlug(): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(
        and(
          ne(products.slug, ''),
          isNull(products.slug).not()
        )
      )
      .limit(1);
    
    return product;
  }
}

export const storage = new DatabaseStorage();