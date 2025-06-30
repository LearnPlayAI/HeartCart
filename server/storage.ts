import {
  users,
  type User,
  type InsertUser,
  categories,
  type Category,
  type InsertCategory,
  products,
  type Product,
  type InsertProduct,
  cartItems,
  type CartItem,
  type InsertCartItem,
  orders,
  type Order,
  type InsertOrder,
  orderItems,
  type OrderItem,
  type InsertOrderItem,
  orderStatusHistory,
  type OrderStatusHistory,
  type InsertOrderStatusHistory,
  productImages,
  type ProductImage,
  type InsertProductImage,
  aiRecommendations,
  type AiRecommendation,
  type InsertAiRecommendation,
  pricing,
  type Pricing,
  type InsertPricing,
  aiSettings,
  type AiSetting,
  type InsertAiSetting,
  suppliers,
  type Supplier,
  type InsertSupplier,
  catalogs,
  type Catalog,
  type InsertCatalog,
  productDrafts,
  type ProductDraft,
  type InsertProductDraft,
  // Centralized attribute system imports - we've removed the hierarchy to simplify
  attributes,
  type Attribute,
  type InsertAttribute,
  attributeOptions,
  type AttributeOption,
  type InsertAttributeOption,
  // Email and token management
  mailTokens,
  type MailToken,
  type InsertMailToken,
  emailLogs,
  type EmailLog,
  type InsertEmailLog,
  productAttributes,
  type ProductAttribute,
  type InsertProductAttribute,
  // PUDO Lockers
  pudoLockers,
  type PudoLocker,
  type InsertPudoLocker,
  systemSettings,
  type SystemSetting,
  type InsertSystemSetting,
  // Promotions system imports
  promotions,
  type Promotion,
  type InsertPromotion,
  productPromotions,
  type ProductPromotion,
  type InsertProductPromotion,
  // Favourites and Analytics system imports
  userFavourites,
  type UserFavourite,
  type InsertUserFavourite,
  productInteractions,
  type ProductInteraction,
  type InsertProductInteraction,
  abandonedCarts,
  type AbandonedCart,
  type InsertAbandonedCart,
  // Credit system imports
  customerCredits,
  type CustomerCredit,
  type InsertCustomerCredit,
  creditTransactions,
  type CreditTransaction,
  type InsertCreditTransaction,
  orderItemSupplierStatus,
  type OrderItemSupplierStatus,
  type InsertOrderItemSupplierStatus,
  // Sales Rep system imports
  salesReps,
  type SalesRep,
  type InsertSalesRep,
  repCommissions,
  type RepCommission,
  type InsertRepCommission,
  repPayments,
  type RepPayment,
  type InsertRepPayment,
} from "@shared/schema";
import { db } from "./db";
import {
  eq,
  ne,
  like,
  lt,
  ilike,
  and,
  or,
  desc,
  asc,
  sql,
  inArray,
  isNull,
  not,
  SQL,
  count,
  lte,
  gte,
} from "drizzle-orm";
import { objectStore, STORAGE_FOLDERS } from "./object-store";
import { logger } from "./logger";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(
    id: number,
    userData: Partial<InsertUser>,
  ): Promise<User | undefined>;
  updateUserLastLogin(id: number): Promise<boolean>;
  getUserCount(): Promise<number>;
  hashPassword(password: string): Promise<string>;
  getAllUsers(): Promise<User[]>;
  
  // Enhanced user management methods for admin
  getUsersWithPagination(
    limit?: number,
    offset?: number,
    search?: string,
    roleFilter?: string,
    statusFilter?: string,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc'
  ): Promise<{ users: User[], total: number }>;
  updateUserRole(id: number, role: string): Promise<User | undefined>;
  updateUserStatus(id: number, isActive: boolean): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  resetUserPassword(id: number, newPassword: string): Promise<boolean>;
  getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    adminUsers: number;
    regularUsers: number;
    recentRegistrations: number;
  }>;

  // Product Wizard Draft operations
  saveProductDraft(
    userId: number,
    draftData: any,
    step: number,
    draftId?: string | number,
    catalogId?: number,
  ): Promise<any>;
  getProductDraft(
    userId: number,
    draftId: string | number,
  ): Promise<any | undefined>;
  getUserProductDrafts(userId: number, catalogId?: number): Promise<any[]>;
  deleteProductDraft(
    userId: number,
    draftId: string | number,
  ): Promise<boolean>;
  publishProductDraft(userId: number, draftId: string | number): Promise<any>;

  // API Testing support methods
  getProductWithSlug(): Promise<Product | undefined>;
  getAllOrders(): Promise<Order[]>;

  getAllAttributes(): Promise<Attribute[]>;

  // Session store for authentication testing
  sessionStore: any;

  // Category operations
  getAllCategories(options?: {
    includeInactive?: boolean;
    parentId?: number | null;
    level?: number;
    orderBy?: "name" | "displayOrder";
  }): Promise<Category[]>;
  getCategoryById(
    id: number,
    options?: { includeInactive?: boolean },
  ): Promise<Category | undefined>;
  getCategoryBySlug(
    slug: string,
    options?: { includeInactive?: boolean },
  ): Promise<Category | undefined>;
  getCategoryWithChildren(
    categoryId: number,
    options?: { includeInactive?: boolean },
  ): Promise<{ category: Category; children: Category[] } | undefined>;
  getMainCategoriesWithChildren(options?: {
    includeInactive?: boolean;
  }): Promise<Array<{ category: Category; children: Category[] }>>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(
    id: number,
    categoryData: Partial<InsertCategory>,
  ): Promise<Category | undefined>;
  updateCategoryDisplayOrder(
    id: number,
    displayOrder: number,
  ): Promise<Category | undefined>;
  batchUpdateCategoryDisplayOrder(
    updates: { id: number; displayOrder: number }[]
  ): Promise<Category[]>;

  // Product operations
  getProductCount(
    categoryId?: number,
    search?: string,
    options?: { includeInactive?: boolean; includeCategoryInactive?: boolean },
  ): Promise<number>;
  getAllProducts(
    limit?: number,
    offset?: number,
    categoryId?: number,
    search?: string,
    options?: { 
      includeInactive?: boolean; 
      includeCategoryInactive?: boolean;
      parentCategoryId?: number;
      minTmyPercent?: number;
      statusFilter?: string;
      sortField?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ): Promise<{ products: Product[]; total: number }>;
  getProductById(
    id: number,
    options?: { includeInactive?: boolean; includeCategoryInactive?: boolean },
  ): Promise<Product | undefined>;
  getProductBySlug(
    slug: string,
    options?: { includeInactive?: boolean; includeCategoryInactive?: boolean },
  ): Promise<Product | undefined>;
  getProductsByCategory(
    categoryId: number,
    limit?: number,
    offset?: number,
    options?: { includeInactive?: boolean; includeCategoryInactive?: boolean },
  ): Promise<Product[]>;
  getFeaturedProducts(
    limit?: number,
    options?: { includeInactive?: boolean; includeCategoryInactive?: boolean },
  ): Promise<Product[]>;
  getFlashDeals(
    limit?: number,
    options?: { includeInactive?: boolean; includeCategoryInactive?: boolean },
  ): Promise<Product[]>;
  searchProducts(
    query: string,
    limit?: number,
    offset?: number,
    options?: { includeInactive?: boolean; includeCategoryInactive?: boolean },
  ): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(
    id: number,
    productData: Partial<InsertProduct>,
  ): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;
  bulkUpdateProductStatus(
    productIds: number[],
    isActive: boolean,
  ): Promise<number>;

  // Product Image operations
  getProductImages(productId: number): Promise<ProductImage[]>;
  getProductImagesWithBgRemoved(productId: number): Promise<ProductImage[]>;
  createProductImage(image: InsertProductImage): Promise<ProductImage>;
  updateProductImage(
    id: number,
    imageData: Partial<InsertProductImage>,
  ): Promise<ProductImage | undefined>;
  setMainProductImage(productId: number, imageId: number): Promise<boolean>;
  deleteProductImage(id: number): Promise<boolean>;

  // Cart operations
  getCartItems(userId: number): Promise<CartItem[]>;
  getCartItemsWithProducts(
    userId: number,
  ): Promise<(CartItem & { product: Product })[]>;
  addToCart(cartItem: InsertCartItem): Promise<CartItem>;
  updateCartItemQuantity(
    id: number,
    quantity: number,
  ): Promise<CartItem | undefined>;
  updateCartItemAttributes(
    id: number,
    attributeSelections: Record<string, any>
  ): Promise<CartItem | undefined>;
  removeFromCart(id: number): Promise<boolean>;
  clearCart(userId: number): Promise<boolean>;

  // Order operations
  createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order>;
  getOrdersByUser(userId: number | null): Promise<Order[]>; // null means get all orders (admin only)
  getOrderById(
    id: number,
  ): Promise<
    (Order & { items: (OrderItem & { product: Product })[] }) | undefined
  >;
  getOrderItems(orderId: number): Promise<(OrderItem & { product: Product })[]>;
  updateOrderStatus(id: number, status: string): Promise<Order | undefined>;
  
  // Order Status History operations
  createOrderStatusHistoryEntry(entry: InsertOrderStatusHistory): Promise<OrderStatusHistory>;
  getOrderStatusHistory(orderId: number): Promise<OrderStatusHistory[]>;
  addOrderStatusHistory(
    orderId: number,
    status: string,
    paymentStatus: string | null,
    changedBy: string,
    changedByUserId: number | null,
    eventType: string,
    notes?: string,
    trackingNumber?: string
  ): Promise<OrderStatusHistory>;

  // AI Recommendation operations
  saveRecommendation(
    recommendation: InsertAiRecommendation,
  ): Promise<AiRecommendation>;
  getRecommendationsForUser(
    userId: number,
  ): Promise<AiRecommendation | undefined>;

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
  getSupplierByName(name: string): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(
    id: number,
    supplierData: Partial<InsertSupplier>,
  ): Promise<Supplier | undefined>;
  deleteSupplier(id: number): Promise<boolean>; // Soft delete (set inactive)
  hardDeleteSupplier(id: number): Promise<boolean>; // Hard delete from database
  getProductCountByCatalogId(catalogId: number): Promise<number>;

  // Catalog operations
  getAllCatalogs(activeOnly?: boolean): Promise<Catalog[]>;
  getCatalogsBySupplierId(
    supplierId: number,
    activeOnly?: boolean,
  ): Promise<Catalog[]>;
  getCatalogById(id: number): Promise<Catalog | undefined>;
  createCatalog(catalog: InsertCatalog): Promise<Catalog>;
  updateCatalog(
    id: number,
    catalogData: Partial<InsertCatalog>,
  ): Promise<Catalog | undefined>;
  deleteCatalog(id: number): Promise<boolean>;
  bulkUpdateCatalogProducts(catalogId: number, updates: Partial<InsertProduct>): Promise<number>;
  getProductsByCatalogId(
    catalogId: number,
    activeOnly?: boolean,
    limit?: number,
    offset?: number,
  ): Promise<Product[]>;
  getProductCountByCatalogId(
    catalogId: number,
    includeInactive?: boolean,
  ): Promise<number>;
  bulkUpdateCatalogProducts(
    catalogId: number,
    updateData: Partial<InsertProduct>,
  ): Promise<number>;
  updateProductDisplayOrder(
    catalogId: number,
    productIds: number[],
  ): Promise<{ count: number }>;

  // Centralized attribute system operations
  // Core attribute operations
  getAllAttributes(): Promise<Attribute[]>;
  getAttributeById(id: number): Promise<Attribute | undefined>;
  getAttributeByName(name: string): Promise<Attribute | undefined>;
  createAttribute(attribute: InsertAttribute): Promise<Attribute>;
  updateAttribute(
    id: number,
    attributeData: Partial<InsertAttribute>,
  ): Promise<Attribute | undefined>;
  deleteAttribute(id: number): Promise<boolean>;

  // Attribute options operations
  getAttributeOptions(attributeId: number): Promise<AttributeOption[]>;
  getAttributeOptionById(id: number): Promise<AttributeOption | undefined>;
  createAttributeOption(
    option: InsertAttributeOption,
  ): Promise<AttributeOption>;
  updateAttributeOption(
    id: number,
    optionData: Partial<InsertAttributeOption>,
  ): Promise<AttributeOption | undefined>;
  deleteAttributeOption(id: number): Promise<boolean>;
  updateAttributeOptionsOrder(
    attributeId: number,
    optionIds: number[],
  ): Promise<boolean>;

  // Product attribute operations
  getProductAttributes(
    productId: number,
  ): Promise<(ProductAttribute & { attribute: Attribute })[]>;
  getProductAttributeById(
    id: number,
  ): Promise<(ProductAttribute & { attribute: Attribute }) | undefined>;
  createProductAttribute(
    productAttribute: InsertProductAttribute,
  ): Promise<ProductAttribute>;
  updateProductAttribute(
    id: number,
    productAttributeData: Partial<InsertProductAttribute>,
  ): Promise<ProductAttribute | undefined>;
  deleteProductAttribute(id: number): Promise<boolean>;

  // Product draft operations for database-centric approach
  createProductDraft(draft: InsertProductDraft): Promise<ProductDraft>;
  createDraftFromProduct(productId: number, userId: number): Promise<ProductDraft>;
  getProductDraft(id: number): Promise<ProductDraft | undefined>;
  getProductDraftByOriginalId(
    originalProductId: number,
  ): Promise<ProductDraft | undefined>;
  getUserProductDrafts(userId: number): Promise<ProductDraft[]>;
  getAllDrafts(): Promise<ProductDraft[]>;
  updateProductDraft(
    id: number,
    data: Partial<InsertProductDraft>,
  ): Promise<ProductDraft | undefined>;
  updateProductDraftWizardStep(
    id: number,
    step: string,
    data: any,
  ): Promise<ProductDraft | undefined>;
  updateProductDraftImages(
    id: number,
    imageUrls: string[],
    imageObjectKeys: string[],
    mainImageIndex?: number,
  ): Promise<ProductDraft | undefined>;
  deleteProductDraftImage(
    id: number,
    imageIndex: number,
  ): Promise<ProductDraft | undefined>;
  publishProductDraft(id: number): Promise<Product | undefined>;
  deleteProductDraft(id: number): Promise<boolean>;

  // Promotion operations
  getPromotions(): Promise<Promotion[]>;
  getPromotionById(id: number): Promise<Promotion | undefined>;
  getActivePromotions(): Promise<Promotion[]>;
  createPromotion(promotionData: InsertPromotion): Promise<Promotion>;
  updatePromotion(id: number, updateData: Partial<InsertPromotion>): Promise<Promotion | undefined>;
  deletePromotion(id: number): Promise<boolean>;
  
  // Product-Promotion relationship operations
  getPromotionProducts(promotionId: number): Promise<(Product & { discountOverride?: number })[]>;
  getProductPromotions(productId: number): Promise<Promotion[]>;
  addProductToPromotion(promotionId: number, productId: number, discountOverride?: number): Promise<ProductPromotion>;
  removeProductFromPromotion(promotionId: number, productId: number): Promise<boolean>;
  bulkAddProductsToPromotion(promotionId: number, productIds: number[]): Promise<ProductPromotion[]>;
  bulkRemoveProductsFromPromotion(promotionId: number, productIds: number[]): Promise<boolean>;
  
  // Bulk operations for promotion management
  getProductIdsByCategory(categoryId: number, includeSubcategories?: boolean): Promise<number[]>;
  getProductIdsBySupplier(supplierId: number): Promise<number[]>;
  getProductIdsByCatalog(catalogId: number): Promise<number[]>;
  
  // Promotion analytics operations
  getPromotionAnalytics(promotionId?: number, dateRange?: { from: Date; to: Date }, compareWith?: { from: Date; to: Date }): Promise<any>;
  getPromotionPerformanceMetrics(promotionId: number): Promise<any>;
  getPromotionTopProducts(promotionId: number, limit?: number): Promise<any[]>;
  
  // System Settings operations
  getSystemSetting(key: string): Promise<SystemSetting | undefined>;
  getAllSystemSettings(): Promise<SystemSetting[]>;
  updateSystemSetting(key: string, value: string): Promise<SystemSetting | undefined>;
  createSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting>;

  // Favourites operations
  addToFavourites(userId: number, productId: number): Promise<UserFavourite>;
  removeFromFavourites(userId: number, productId: number): Promise<boolean>;
  getUserFavourites(userId: number): Promise<UserFavourite[]>;
  getUserFavouritesWithProducts(userId: number): Promise<any[]>;
  isProductFavourited(userId: number, productId: number): Promise<boolean>;
  getFavouriteCount(productId: number): Promise<number>;
  getMostFavouritedProducts(limit?: number): Promise<any[]>;

  // Product Interactions operations
  logProductInteraction(interaction: InsertProductInteraction): Promise<ProductInteraction>;
  getProductInteractions(productId: number, interactionType?: string, limit?: number): Promise<ProductInteraction[]>;
  getUserInteractions(userId: number, interactionType?: string, limit?: number): Promise<ProductInteraction[]>;
  getProductViewCount(productId: number, dateRange?: { from: string; to: string }): Promise<number>;
  getPopularProducts(limit?: number, dateRange?: { from: string; to: string }): Promise<any[]>;
  getInteractionAnalytics(dateRange?: { from: string; to: string }): Promise<any>;

  // Abandoned Cart operations
  createAbandonedCart(cart: InsertAbandonedCart): Promise<AbandonedCart>;
  getAbandonedCarts(userId?: number, emailSent?: boolean): Promise<AbandonedCart[]>;
  updateAbandonedCart(id: number, updates: Partial<InsertAbandonedCart>): Promise<AbandonedCart | undefined>;
  markCartRecovered(id: number): Promise<boolean>;
  getAbandonedCartAnalytics(dateRange?: { from: string; to: string }): Promise<any>;

  // Credit System operations
  getUserCreditBalance(userId: number): Promise<CustomerCredit>;
  getUserCreditTransactions(userId: number, limit?: number, offset?: number): Promise<CreditTransaction[]>;
  addUserCredits(userId: number, amount: number, description: string, orderId?: number): Promise<CreditTransaction>;
  useUserCredits(userId: number, amount: number, description: string, orderId: number): Promise<CreditTransaction>;
  createOrUpdateCustomerCredit(userId: number): Promise<CustomerCredit>;
  
  // Order Item Supplier Status operations
  getOrderItemById(orderItemId: number): Promise<(OrderItem & { order?: Order }) | undefined>;
  updateOrderItemSupplierStatus(orderItemId: number, statusData: Partial<InsertOrderItemSupplierStatus>): Promise<OrderItemSupplierStatus>;
  getSupplierOrderStatuses(status?: string, limit?: number, offset?: number): Promise<OrderItemSupplierStatus[]>;
  getOrderItemSupplierStatus(orderItemId: number): Promise<OrderItemSupplierStatus | undefined>;
  getOrderItemsForSupplierManagement(filters?: { status?: string; orderId?: number; }): Promise<any[]>;

  // PUDO Locker operations
  getAllPudoLockers(): Promise<PudoLocker[]>;
  searchPudoLockers(query: string, province?: string, city?: string): Promise<PudoLocker[]>;
  getPudoLockersByLocation(province: string, city?: string): Promise<PudoLocker[]>;
  getPudoLockerByCode(code: string): Promise<PudoLocker | undefined>;
  getPudoLockerById(id: number): Promise<PudoLocker | undefined>;
  updateUserPreferredLocker(userId: number, lockerId: number, lockerCode: string): Promise<boolean>;
  getUserPreferredLocker(userId: number): Promise<PudoLocker | undefined>;

  // Token Management operations
  createMailToken(tokenData: InsertMailToken): Promise<MailToken>;
  getMailTokenByHash(tokenHash: string): Promise<MailToken | undefined>;
  markTokenUsed(tokenHash: string): Promise<boolean>;
  deleteExpiredTokens(): Promise<number>;
  cleanupUserTokens(userId: number, tokenType: string): Promise<number>;

  // Email Log operations
  logEmail(emailData: InsertEmailLog): Promise<EmailLog>;
  getEmailLogs(userId?: number, emailType?: string, limit?: number): Promise<EmailLog[]>;
  updateEmailDeliveryStatus(emailId: number, status: string, errorMessage?: string): Promise<boolean>;

  // Additional email token methods for verification test compatibility
  storeEmailToken(token: InsertMailToken): Promise<MailToken>;
  verifyEmailToken(tokenHash: string, tokenType: string): Promise<MailToken | undefined>;
  markTokenAsUsed(tokenHash: string): Promise<boolean>;
  cleanupExpiredTokens(): Promise<number>;

  // Sales Rep System operations
  getSalesRepByCode(repCode: string): Promise<SalesRep | undefined>;
  createSalesRep(repData: InsertSalesRep): Promise<SalesRep>;
  updateSalesRep(id: number, repData: Partial<InsertSalesRep>): Promise<SalesRep | undefined>;
  getAllSalesReps(): Promise<SalesRep[]>;
  getSalesRepCommissions(repId: number, limit?: number, offset?: number): Promise<RepCommission[]>;
  createRepCommission(commissionData: InsertRepCommission): Promise<RepCommission>;
  getRepCommissionsByOrder(orderId: number): Promise<RepCommission[]>;
  calculateRepEarnings(repId: number, startDate?: string, endDate?: string): Promise<{ totalEarnings: number; commissionCount: number }>;
  createRepPayment(paymentData: InsertRepPayment): Promise<RepPayment>;
  getRepPayments(repId: number): Promise<RepPayment[]>;
}

export class DatabaseStorage implements IStorage {
  /**
   * Generates a slug from a product name
   * Used for slug creation and ensuring uniqueness
   */
  private generateSlug(name: string): string {
    if (!name) return `product-${Date.now()}`;

    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "") // Remove all non-word chars
      .replace(/[\s_-]+/g, "-") // Replace spaces, underscores and hyphens with a single hyphen
      .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
      .substring(0, 60); // Truncate to reasonable length
  }

  /**
   * Checks if a slug belongs to the specified product
   */
  private async isSlugOwnedByProduct(
    slug: string,
    productId: number,
  ): Promise<boolean> {
    try {
      const result = await db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.slug, slug), eq(products.id, productId)));

      return result.length > 0;
    } catch (error) {
      logger.error("Error checking slug ownership", { error, slug, productId });
      return false;
    }
  }
  /**
   * Helper method to enrich products with their main image URL and additional images
   * @param productList The list of products to enrich
   * @returns The enriched product list with imageUrl and additionalImages fields
   */
  private async enrichProductsWithMainImage(
    productList: Product[],
  ): Promise<Product[]> {
    if (!productList.length) return productList;

    // For each product, find its images and published date
    const enrichedProducts = await Promise.all(
      productList.map(async (product) => {
        // Get all images for this product
        const allImages = await db
          .select()
          .from(productImages)
          .where(eq(productImages.productId, product.id))
          .orderBy(asc(productImages.sortOrder));

        // Get published date from product_drafts table
        const publishedDraft = await db
          .select({
            publishedAt: productDrafts.publishedAt
          })
          .from(productDrafts)
          .where(and(
            eq(productDrafts.originalProductId, product.id),
            eq(productDrafts.draftStatus, 'published')
          ))
          .limit(1);

        if (allImages.length === 0) {
          // No images, but include published date if available
          return {
            ...product,
            publishedAt: publishedDraft[0]?.publishedAt || null
          };
        }

        // Find the main image
        const mainImage = allImages.find((img) => img.isMain);

        // Get additional (non-main) images
        const additionalImageUrls = allImages
          .filter((img) => !img.isMain)
          .map((img) => img.url);

        // Return enriched product with image and published date
        return {
          ...product,
          imageUrl: mainImage ? mainImage.url : allImages[0].url,
          additionalImages:
            additionalImageUrls.length > 0 ? additionalImageUrls : null,
          publishedAt: publishedDraft[0]?.publishedAt || null
        };
      }),
    );

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
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username));
      return user;
    } catch (error) {
      console.error(`Error fetching user by username "${username}":`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
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
      console.error(
        `Error creating user with username "${user.username}":`,
        error,
      );
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async updateUser(
    id: number,
    userData: Partial<InsertUser>,
  ): Promise<User | undefined> {
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
          lastLogin: now.toISOString(),
          updatedAt: now.toISOString(), // Also update the general updatedAt field
        })
        .where(eq(users.id, id));

      // Check if the update was successful
      // Note: rowCount might be null in some PostgreSQL drivers, so we use a safe check
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      logger.error(`Error updating last login time for user ${id}:`, {
        error,
        userId: id,
        timestamp: new Date().toISOString(),
      });

      // We don't throw the error since this is a non-critical operation
      // Just return false to indicate failure
      return false;
    }
  }

  // Category operations
  async getAllCategories(options?: {
    includeInactive?: boolean;
    parentId?: number | null;
    level?: number;
    orderBy?: "name" | "displayOrder";
  }): Promise<Category[]> {
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
      if (options?.orderBy === "name") {
        query = query.orderBy(asc(categories.name));
      } else {
        // Default to displayOrder if not specified or if displayOrder is specified
        query = query.orderBy(
          asc(categories.displayOrder),
          asc(categories.name),
        );
      }

      const result = await query;
      
      // Create a map of all categories for quick lookup
      const categoryMap = new Map(result.map(cat => [cat.id, cat]));
      
      // Add parent information to each category
      return result.map(category => {
        const parent = category.parentId ? categoryMap.get(category.parentId) : null;
        
        return {
          ...category,
          parent: parent ? {
            id: parent.id,
            name: parent.name,
            slug: parent.slug,
            description: parent.description,
            icon: parent.icon,
            imageUrl: parent.imageUrl,
            isActive: parent.isActive,
            parentId: parent.parentId,
            level: parent.level,
            displayOrder: parent.displayOrder,
            createdAt: parent.createdAt,
            updatedAt: parent.updatedAt
          } : null
        };
      });
    } catch (error) {
      console.error(`Error fetching all categories:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async getCategoryById(
    id: number,
    options?: { includeInactive?: boolean },
  ): Promise<Category | undefined> {
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

  async getCategoryBySlug(
    slug: string,
    options?: { includeInactive?: boolean },
  ): Promise<Category | undefined> {
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

  async getCategoriesByParent(
    parentId: number,
    options?: { includeInactive?: boolean },
  ): Promise<Category[]> {
    try {
      // Build conditions for children
      const conditions: SQL<unknown>[] = [
        eq(categories.parentId, parentId),
      ];

      // Only filter by isActive if we're not including inactive categories
      if (!options?.includeInactive) {
        conditions.push(eq(categories.isActive, true));
      }

      // Get the children categories
      const children = await db
        .select()
        .from(categories)
        .where(and(...conditions))
        .orderBy(asc(categories.displayOrder), asc(categories.name));

      return children;
    } catch (error) {
      console.error(
        `Error fetching categories by parent ${parentId}:`,
        error,
      );
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async getCategoryWithChildren(
    categoryId: number,
    options?: { includeInactive?: boolean },
  ): Promise<{ category: Category; children: Category[] } | undefined> {
    try {
      // Build conditions for parent category
      const categoryConditions: SQL<unknown>[] = [
        eq(categories.id, categoryId),
      ];

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
      const childrenConditions: SQL<unknown>[] = [
        eq(categories.parentId, categoryId),
      ];

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
      console.error(
        `Error fetching category ${categoryId} with children:`,
        error,
      );
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async getMainCategoriesWithChildren(options?: {
    includeInactive?: boolean;
  }): Promise<Array<{ category: Category; children: Category[] }>> {
    try {
      // Get all main categories (level 0)
      const mainCategories = await this.getAllCategories({
        level: 0,
        includeInactive: options?.includeInactive,
      });

      // For each main category, get its children
      const result = await Promise.all(
        mainCategories.map(async (category) => {
          try {
            // Build conditions
            const conditions: SQL<unknown>[] = [
              eq(categories.parentId, category.id),
            ];

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
            console.error(
              `Error fetching children for category ${category.id}:`,
              childError,
            );
            // Return the category with an empty children array to avoid failing the entire request
            return { category, children: [] };
          }
        }),
      );

      return result;
    } catch (error) {
      console.error(`Error fetching main categories with children:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    try {
      // Auto-assign display order if not provided or if it would conflict
      let finalCategory = { ...category };
      
      if (finalCategory.displayOrder === undefined || finalCategory.displayOrder === null) {
        // Get the highest display order for categories at the same level
        const siblings = await db
          .select({ displayOrder: categories.displayOrder })
          .from(categories)
          .where(eq(categories.parentId, finalCategory.parentId || null))
          .orderBy(desc(categories.displayOrder))
          .limit(1);
        
        const maxDisplayOrder = siblings.length > 0 ? (siblings[0].displayOrder || 0) : 0;
        finalCategory.displayOrder = maxDisplayOrder + 1;
      } else {
        // Check if the provided display order conflicts with existing categories
        const existingCategory = await db
          .select({ id: categories.id })
          .from(categories)
          .where(
            and(
              eq(categories.parentId, finalCategory.parentId || null),
              eq(categories.displayOrder, finalCategory.displayOrder)
            )
          )
          .limit(1);
        
        if (existingCategory.length > 0) {
          // Conflict detected, auto-assign next available order
          const siblings = await db
            .select({ displayOrder: categories.displayOrder })
            .from(categories)
            .where(eq(categories.parentId, finalCategory.parentId || null))
            .orderBy(desc(categories.displayOrder))
            .limit(1);
          
          const maxDisplayOrder = siblings.length > 0 ? (siblings[0].displayOrder || 0) : 0;
          finalCategory.displayOrder = maxDisplayOrder + 1;
        }
      }

      const [newCategory] = await db
        .insert(categories)
        .values(finalCategory)
        .returning();
      return newCategory;
    } catch (error) {
      console.error(
        `Error creating category with name "${category.name}":`,
        error,
      );
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async updateCategory(
    id: number,
    categoryData: Partial<InsertCategory>,
  ): Promise<Category | undefined> {
    try {
      // Handle display order conflicts when updating
      let finalUpdateData = { ...categoryData };
      
      if (finalUpdateData.displayOrder !== undefined && finalUpdateData.displayOrder !== null) {
        // Get the current category to check if parentId is changing
        const currentCategory = await db
          .select()
          .from(categories)
          .where(eq(categories.id, id))
          .limit(1);
        
        if (currentCategory.length > 0) {
          const current = currentCategory[0];
          const newParentId = finalUpdateData.parentId !== undefined ? finalUpdateData.parentId : current.parentId;
          
          // Check if display order conflicts with existing categories in the same parent
          const conflictingCategory = await db
            .select({ id: categories.id })
            .from(categories)
            .where(
              and(
                eq(categories.parentId, newParentId || null),
                eq(categories.displayOrder, finalUpdateData.displayOrder),
                ne(categories.id, id) // Exclude the current category being updated
              )
            )
            .limit(1);
          
          if (conflictingCategory.length > 0) {
            // Conflict detected, auto-assign next available order
            const siblings = await db
              .select({ displayOrder: categories.displayOrder })
              .from(categories)
              .where(
                and(
                  eq(categories.parentId, newParentId || null),
                  ne(categories.id, id) // Exclude the current category
                )
              )
              .orderBy(desc(categories.displayOrder))
              .limit(1);
            
            const maxDisplayOrder = siblings.length > 0 ? (siblings[0].displayOrder || 0) : 0;
            finalUpdateData.displayOrder = maxDisplayOrder + 1;
          }
        }
      }

      // Add updatedAt timestamp
      const updateData = {
        ...finalUpdateData,
        updatedAt: new Date().toISOString()
      };

      const [updatedCategory] = await db
        .update(categories)
        .set(updateData)
        .where(eq(categories.id, id))
        .returning();
      return updatedCategory;
    } catch (error) {
      console.error(`Error updating category ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async updateCategoryDisplayOrder(
    id: number,
    displayOrder: number,
  ): Promise<Category | undefined> {
    try {
      return this.updateCategory(id, { displayOrder });
    } catch (error) {
      console.error(`Error updating display order for category ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async batchUpdateCategoryDisplayOrder(
    updates: { id: number; displayOrder: number }[]
  ): Promise<Category[]> {
    try {
      const updatedCategories: Category[] = [];
      
      // Update each category in the batch
      for (const update of updates) {
        const category = await this.updateCategory(update.id, { displayOrder: update.displayOrder });
        if (category) {
          updatedCategories.push(category);
        }
      }
      
      return updatedCategories;
    } catch (error) {
      console.error('Error in batch update of category display orders:', error);
      throw error;
    }
  }

  async reorderAllCategories(): Promise<{ updatedCount: number; message: string }> {
    try {
      // Get all categories
      const allCategories = await db
        .select()
        .from(categories)
        .orderBy(asc(categories.parentId));

      // Group by parent ID
      const categoryGroups = new Map<number | null, Category[]>();
      
      for (const category of allCategories) {
        const parentId = category.parentId;
        if (!categoryGroups.has(parentId)) {
          categoryGroups.set(parentId, []);
        }
        categoryGroups.get(parentId)!.push(category);
      }

      let updatedCount = 0;

      // Reorder each group alphabetically by name
      for (const [parentId, groupCategories] of categoryGroups) {
        // Sort original array by current display order to get the current order
        const currentOrder = [...groupCategories].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
        
        // Sort categories alphabetically by name (case-insensitive)
        const sortedCategories = [...groupCategories].sort((a, b) => 
          a.name.toLowerCase().localeCompare(b.name.toLowerCase())
        );
        
        // Check if the order has actually changed by comparing current vs sorted order
        const currentIdOrder = currentOrder.map(cat => cat.id);
        const sortedIdOrder = sortedCategories.map(cat => cat.id);
        const orderChanged = !currentIdOrder.every((id, index) => id === sortedIdOrder[index]);
        
        // Only update if the alphabetical order is different from current order
        if (orderChanged) {
          for (let i = 0; i < sortedCategories.length; i++) {
            const category = sortedCategories[i];
            const newDisplayOrder = i;
            
            await db
              .update(categories)
              .set({ displayOrder: newDisplayOrder })
              .where(eq(categories.id, category.id));
            
            updatedCount++;
          }
        }
      }

      return {
        updatedCount,
        message: `Successfully reordered ${updatedCount} categories alphabetically`
      };
    } catch (error) {
      console.error('Error reordering categories:', error);
      throw error;
    }
  }

  async deleteCategory(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(categories)
        .where(eq(categories.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error(`Error deleting category ${id}:`, error);
      throw error;
    }
  }

  // Product operations
  async getProductCount(
    categoryId?: number,
    search?: string,
    options?: { includeInactive?: boolean; includeCategoryInactive?: boolean },
  ): Promise<number> {
    try {
      // Create conditions array
      const conditions: SQL<unknown>[] = [];

      // Only filter active products if not explicitly including inactive ones
      if (!options?.includeInactive) {
        conditions.push(eq(products.isActive, true));
      }

      // Add category filter if provided
      if (categoryId) {
        try {
          // Get the category with its children to support parent category filtering
          const categoryWithChildren = await this.getCategoryWithChildren(
            categoryId,
            { includeInactive: options?.includeCategoryInactive }
          );

          // If category doesn't exist or is inactive, return 0
          if (!categoryWithChildren) {
            return 0;
          }

          // Collect all category IDs to filter by (parent + children)
          const categoryIds = [categoryId];
          if (categoryWithChildren.children.length > 0) {
            categoryIds.push(...categoryWithChildren.children.map(child => child.id));
          }

          // Filter products by any of these category IDs
          conditions.push(inArray(products.categoryId, categoryIds));
        } catch (categoryError) {
          console.error(
            `Error checking category ${categoryId} and children for count:`,
            categoryError,
          );
          throw categoryError;
        }
      }

      // Build count query
      let countQuery = db.select({ count: sql<number>`count(*)` }).from(products);

      // Add joins for category filtering if needed
      if (!options?.includeCategoryInactive && !categoryId) {
        // Only join with categories if we're not filtering by category
        // and we need to exclude products from inactive categories
        countQuery = db
          .select({ count: sql<number>`count(*)` })
          .from(products)
          .innerJoin(categories, eq(products.categoryId, categories.id))
          .where(and(...conditions, eq(categories.isActive, true)));
      }

      // Apply conditions if no join was needed
      if (options?.includeCategoryInactive || categoryId) {
        if (conditions.length > 0) {
          countQuery = countQuery.where(and(...conditions));
        }
      }

      // Add comprehensive search condition if provided
      if (search) {
        const searchTerm = `%${search}%`;
        const searchCondition = or(
          like(products.name, searchTerm),
          like(products.description || "", searchTerm),
          like(products.sku || "", searchTerm),
          like(products.brand || "", searchTerm),
          like(products.supplier || "", searchTerm),
          like(products.metaTitle || "", searchTerm),
          like(products.metaDescription || "", searchTerm),
          like(products.metaKeywords || "", searchTerm),
          like(products.dimensions || "", searchTerm),
          like(products.specialSaleText || "", searchTerm),
          like(products.discountLabel || "", searchTerm)
        );
        
        if (countQuery.where) {
          countQuery = countQuery.where(searchCondition);
        } else {
          countQuery = countQuery.where(searchCondition);
        }
      }

      const [{ count }] = await countQuery;
      return count;
    } catch (error) {
      console.error(`Error getting product count:`, error);
      throw error;
    }
  }

  async getAllProducts(
    limit = 20,
    offset = 0,
    categoryId?: number,
    search?: string,
    options?: { 
      includeInactive?: boolean; 
      includeCategoryInactive?: boolean; 
      parentCategoryId?: number;
      minTmyPercent?: number; 
      statusFilter?: string;
      sortField?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ): Promise<{ products: Product[]; total: number }> {
    try {
      console.log('getAllProducts called with:', { limit, offset, categoryId, search, options });

      // Create conditions array
      const conditions: SQL<unknown>[] = [];

      // Only filter active products if not explicitly including inactive ones
      if (!options?.includeInactive) {
        conditions.push(eq(products.isActive, true));
      }

      // Add category filter if provided
      if (categoryId) {
        try {
          // Get the category with its children to support parent category filtering
          const categoryWithChildren = await this.getCategoryWithChildren(
            categoryId,
            { includeInactive: options?.includeCategoryInactive }
          );

          // If category doesn't exist or is inactive, return empty result
          if (!categoryWithChildren) {
            return { products: [], total: 0 };
          }

          // Collect all category IDs to filter by (parent + children)
          const categoryIds = [categoryId];
          if (categoryWithChildren.children.length > 0) {
            categoryIds.push(...categoryWithChildren.children.map(child => child.id));
          }

          console.log(`Category filtering: categoryId=${categoryId}, categoryIds=[${categoryIds.join(', ')}]`);
          
          // Filter products by any of these category IDs
          conditions.push(inArray(products.categoryId, categoryIds));
        } catch (categoryError) {
          console.error(
            `Error checking category ${categoryId} and children:`,
            categoryError,
          );
          throw categoryError; // Rethrow so the route handler can catch it and send a proper error response
        }
      } else if (options?.parentCategoryId) {
        // Handle parent category filtering when no specific category is provided
        try {
          // Get the parent category with its children
          const parentCategoryWithChildren = await this.getCategoryWithChildren(
            options.parentCategoryId,
            { includeInactive: options?.includeCategoryInactive }
          );

          // If parent category doesn't exist or is inactive, return empty result
          if (!parentCategoryWithChildren) {
            return { products: [], total: 0 };
          }

          // Collect all child category IDs (not including the parent itself for this filter)
          const childCategoryIds = parentCategoryWithChildren.children.map(child => child.id);
          
          console.log(`Parent category filtering: parentCategoryId=${options.parentCategoryId}, childCategoryIds=[${childCategoryIds.join(', ')}]`);
          
          // Filter products by any of the child category IDs
          if (childCategoryIds.length > 0) {
            conditions.push(inArray(products.categoryId, childCategoryIds));
          } else {
            // If parent has no children, return empty result
            return { products: [], total: 0 };
          }
        } catch (categoryError) {
          console.error(
            `Error checking parent category ${options.parentCategoryId} and children:`,
            categoryError,
          );
          throw categoryError; // Rethrow so the route handler can catch it and send a proper error response
        }
      }

      // Build final conditions for both count and data queries
      const allConditions = [...conditions];
      
      // Add comprehensive search condition if provided
      if (search) {
        const searchTerm = `%${search}%`;
        const searchConditions = or(
          like(products.name, searchTerm),
          like(products.description || "", searchTerm),
          like(products.sku || "", searchTerm),
          like(products.brand || "", searchTerm),
          like(products.supplier || "", searchTerm),
          like(products.metaTitle || "", searchTerm),
          like(products.metaDescription || "", searchTerm),
          like(products.metaKeywords || "", searchTerm),
          like(products.dimensions || "", searchTerm),
          like(products.specialSaleText || "", searchTerm),
          like(products.discountLabel || "", searchTerm)
        );
        allConditions.push(searchConditions);
      }

      // Add TMY percentage filter if provided
      if (options?.minTmyPercent !== undefined && options.minTmyPercent > 0) {
        // Create SQL condition for TMY calculation: ((effective_price - cost_price) / cost_price * 100) <= minTmyPercent
        // Use COALESCE to handle nulls and ensure we don't divide by zero
        const tmyCondition = sql`
          CASE 
            WHEN COALESCE(${products.costPrice}, 0) > 0 THEN
              ((COALESCE(${products.salePrice}, ${products.price}, 0) - COALESCE(${products.costPrice}, 0)) / COALESCE(${products.costPrice}, 1) * 100) <= ${options.minTmyPercent}
            ELSE FALSE
          END
        `;
        allConditions.push(tmyCondition);
      }

      // Add status filter if provided (Active/Inactive products)
      if (options?.statusFilter && options.statusFilter !== 'all') {
        if (options.statusFilter === 'active') {
          allConditions.push(eq(products.isActive, true));
        } else if (options.statusFilter === 'inactive') {
          allConditions.push(eq(products.isActive, false));
        }
      }

      // Handle category filtering and product_drafts joins
      const needsCategoryJoin = !categoryId && !options?.includeCategoryInactive;
      const sortField = options?.sortField || 'displayOrder';
      const needsDraftsJoin = sortField === 'publishedAt';

      let countQuery: any;
      let dataQuery: any;

      if (needsCategoryJoin && needsDraftsJoin) {
        // Join with both categories and product_drafts tables
        const joinConditions = [...allConditions, eq(categories.isActive, true)];
        
        countQuery = db
          .select({ count: count() })
          .from(products)
          .innerJoin(categories, eq(products.categoryId, categories.id))
          .leftJoin(productDrafts, eq(products.id, productDrafts.originalProductId))
          .where(and(...joinConditions));

        dataQuery = db
          .select({ 
            product: products,
            publishedAt: productDrafts.publishedAt,
            createdAt: productDrafts.createdAt
          })
          .from(products)
          .innerJoin(categories, eq(products.categoryId, categories.id))
          .leftJoin(productDrafts, eq(products.id, productDrafts.originalProductId))
          .where(and(...joinConditions));
      } else if (needsCategoryJoin) {
        // Only join with categories table
        const joinConditions = [...allConditions, eq(categories.isActive, true)];
        
        countQuery = db
          .select({ count: count() })
          .from(products)
          .innerJoin(categories, eq(products.categoryId, categories.id))
          .where(and(...joinConditions));

        dataQuery = db
          .select({ product: products })
          .from(products)
          .innerJoin(categories, eq(products.categoryId, categories.id))
          .where(and(...joinConditions));
      } else if (needsDraftsJoin) {
        // Only join with product_drafts table
        const whereCondition = allConditions.length > 0 ? and(...allConditions) : undefined;
        
        countQuery = db
          .select({ count: count() })
          .from(products)
          .leftJoin(productDrafts, eq(products.id, productDrafts.originalProductId));
        
        if (whereCondition) {
          countQuery = countQuery.where(whereCondition);
        }

        dataQuery = db
          .select({ 
            product: products,
            publishedAt: productDrafts.publishedAt,
            createdAt: productDrafts.createdAt
          })
          .from(products)
          .leftJoin(productDrafts, eq(products.id, productDrafts.originalProductId));
        
        if (whereCondition) {
          dataQuery = dataQuery.where(whereCondition);
        }
      } else {
        // Simple query without joins
        const whereCondition = allConditions.length > 0 ? and(...allConditions) : undefined;
        
        countQuery = db
          .select({ count: count() })
          .from(products);
        
        if (whereCondition) {
          countQuery = countQuery.where(whereCondition);
        }

        dataQuery = db
          .select()
          .from(products);
        
        if (whereCondition) {
          dataQuery = dataQuery.where(whereCondition);
        }
      }

      // Apply sorting
      const sortOrder = options?.sortOrder || 'asc';
      
      // Map frontend field names to database columns
      const sortFieldMap: Record<string, any> = {
        'name': products.name,
        'sku': products.sku,
        'price': products.price,
        'salePrice': products.salePrice,
        'costPrice': products.costPrice,
        'stock': products.stock,
        'createdAt': products.createdAt,
        'publishedAt': needsDraftsJoin ? productDrafts.publishedAt : products.createdAt,
        'displayOrder': products.displayOrder,
        'brand': products.brand,
        'isActive': products.isActive,
        'tmyPercentage': sql`CASE WHEN COALESCE(${products.costPrice}, 0) > 0 THEN ((COALESCE(${products.salePrice}, ${products.price}, 0) - COALESCE(${products.costPrice}, 0)) / COALESCE(${products.costPrice}, 1) * 100) ELSE 0 END`
      };

      const sortColumn = sortFieldMap[sortField] || products.displayOrder;
      
      if (sortOrder === 'asc') {
        dataQuery = dataQuery.orderBy(asc(sortColumn), products.id);
      } else {
        dataQuery = dataQuery.orderBy(desc(sortColumn), products.id);
      }
      
      dataQuery = dataQuery
        .limit(limit)
        .offset(offset);

      try {
        // Execute both queries in parallel
        const [countResult, dataResult] = await Promise.all([
          countQuery,
          dataQuery
        ]);

        const total = countResult[0]?.count || 0;
        
        // Handle different query result structures based on joins
        let productList: any[];
        if (needsDraftsJoin || (needsCategoryJoin && needsDraftsJoin)) {
          // When joining with product_drafts, merge the draft timestamps with product data
          productList = dataResult.map((row: any) => ({
            ...row.product,
            publishedAt: row.publishedAt || row.product.createdAt,
            // Override createdAt from product_drafts if available for more accurate timestamps
            createdAt: row.createdAt || row.product.createdAt
          }));
        } else if (needsCategoryJoin) {
          // Simple category join
          productList = dataResult.map((row: any) => row.product);
        } else {
          // No joins
          productList = dataResult;
        }
        
        console.log('Products found:', productList.length, 'Total:', total);
        
        // Enrich products with main image URLs
        const enrichedProducts = await this.enrichProductsWithMainImage(productList);
        
        return { products: enrichedProducts, total };
      } catch (queryError) {
        console.error("Error querying products:", queryError);
        throw queryError;
      }
    } catch (error) {
      console.error(`Error getting all products with filters:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async getProductById(
    id: number,
    options?: { includeInactive?: boolean; includeCategoryInactive?: boolean },
  ): Promise<Product | undefined> {
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
      if (!options?.includeCategoryInactive && product.categoryId) {
        try {
          const [category] = await db
            .select()
            .from(categories)
            .where(eq(categories.id, product.categoryId));

          // If category doesn't exist or is inactive, return undefined (unless we're including inactive products)
          if (!category || !category.isActive) {
            console.log(`Product ${id} has inactive category ${product.categoryId}, includeCategoryInactive: ${options?.includeCategoryInactive}`);
            return undefined;
          }
        } catch (categoryError) {
          console.error(
            `Error checking if category ${product.categoryId} for product ${id} is active:`,
            categoryError,
          );
          throw categoryError; // Rethrow so the route handler can catch it and send a proper error response
        }
      }

      // Enrich product with main image URL
      const enrichedProducts = await this.enrichProductsWithMainImage([
        product,
      ]);
      return enrichedProducts[0];
    } catch (error) {
      console.error(`Error getting product ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async getProductBySlug(
    slug: string,
    options?: { includeInactive?: boolean; includeCategoryInactive?: boolean },
  ): Promise<Product | undefined> {
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
            .where(
              and(
                eq(categories.id, product.categoryId),
                eq(categories.isActive, true),
              ),
            );

          // If category doesn't exist or is inactive, return undefined
          if (!category) {
            return options?.includeInactive ? product : undefined;
          }
        } catch (categoryError) {
          console.error(
            `Error checking if category ${product.categoryId} for product with slug "${slug}" is active:`,
            categoryError,
          );
          throw categoryError; // Rethrow so the route handler can catch it and send a proper error response
        }
      }

      // Enrich product with main image URL
      const enrichedProducts = await this.enrichProductsWithMainImage([
        product,
      ]);
      return enrichedProducts[0];
    } catch (error) {
      console.error(`Error getting product by slug "${slug}":`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async getProductsByCategory(
    categoryId: number,
    limit = 20,
    offset = 0,
    options?: { includeInactive?: boolean; includeCategoryInactive?: boolean },
  ): Promise<Product[]> {
    try {
      // Check if the category exists and is active (if needed)
      if (!options?.includeCategoryInactive) {
        try {
          const [category] = await db
            .select()
            .from(categories)
            .where(
              and(eq(categories.id, categoryId), eq(categories.isActive, true)),
            );

          // If category is inactive or doesn't exist, return empty array
          if (!category) {
            return [];
          }
        } catch (categoryError) {
          console.error(
            `Error checking if category ${categoryId} is active:`,
            categoryError,
          );
          throw categoryError; // Rethrow so the route handler can catch it and send a proper error response
        }
      }

      try {
        // Create conditions array
        const conditions: SQL<unknown>[] = [
          eq(products.categoryId, categoryId),
        ];

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
        console.error(
          `Error fetching products for category ${categoryId}:`,
          productsError,
        );
        throw productsError; // Rethrow so the route handler can catch it and send a proper error response
      }
    } catch (error) {
      console.error(
        `Error in getProductsByCategory for category ${categoryId}:`,
        error,
      );
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async getFeaturedProducts(
    limit = 10,
    options?: { includeInactive?: boolean; includeCategoryInactive?: boolean },
    offset = 0,
  ): Promise<Product[]> {
    try {
      let productList: Product[] = [];

      if (!options?.includeCategoryInactive) {
        try {
          // For featured products, we need to join with categories to check if category is active
          const query = db
            .select({
              product: products,
            })
            .from(products)
            .innerJoin(categories, eq(products.categoryId, categories.id))
            .where(
              and(
                eq(products.isFeatured, true),
                options?.includeInactive
                  ? sql`1=1`
                  : eq(products.isActive, true),
                eq(categories.isActive, true),
              ),
            )
            .orderBy(sql`RANDOM()`)
            .limit(limit)
            .offset(offset);

          const result = await query;
          productList = result.map((row) => row.product);
        } catch (joinError) {
          console.error(
            "Error fetching featured products with active categories:",
            joinError,
          );
          throw joinError; // Rethrow so the route handler can catch it and send a proper error response
        }
      } else {
        try {
          // If we don't need to check category visibility, use simpler query
          productList = await db
            .select()
            .from(products)
            .where(
              and(
                eq(products.isFeatured, true),
                options?.includeInactive
                  ? sql`1=1`
                  : eq(products.isActive, true),
              ),
            )
            .orderBy(sql`RANDOM()`)
            .limit(limit)
            .offset(offset);
        } catch (queryError) {
          console.error("Error fetching featured products:", queryError);
          throw queryError; // Rethrow so the route handler can catch it and send a proper error response
        }
      }

      // Enrich products with main image URLs - handle potential null/undefined gracefully
      if (!productList || productList.length === 0) {
        return [];
      }

      return await this.enrichProductsWithMainImage(productList);
    } catch (error) {
      console.error("Error in getFeaturedProducts:", error);
      // Return empty array instead of throwing to prevent site crashes
      return [];
    }
  }

  async getFlashDeals(
    limit = 6,
    options?: { includeInactive?: boolean; includeCategoryInactive?: boolean },
  ): Promise<Product[]> {
    try {
      const now = new Date();
      let productList: Product[] = [];

      if (!options?.includeCategoryInactive) {
        try {
          // For flash deals, we need to join with categories to check if category is active
          const query = db
            .select({
              product: products,
            })
            .from(products)
            .innerJoin(categories, eq(products.categoryId, categories.id))
            .where(
              and(
                eq(products.isFlashDeal, true),
                options?.includeInactive
                  ? sql`1=1`
                  : eq(products.isActive, true),
                eq(categories.isActive, true),
                sql`${products.flashDealEnd} > ${now}`,
              ),
            )
            .limit(limit);

          const result = await query;
          productList = result.map((row) => row.product);
        } catch (joinError) {
          console.error(
            "Error fetching flash deals with active categories:",
            joinError,
          );
          throw joinError; // Rethrow so the route handler can catch it and send a proper error response
        }
      } else {
        try {
          // If we don't need to check category visibility, use simpler query
          productList = await db
            .select()
            .from(products)
            .where(
              and(
                eq(products.isFlashDeal, true),
                options?.includeInactive
                  ? sql`1=1`
                  : eq(products.isActive, true),
                sql`${products.flashDealEnd} > ${now}`,
              ),
            )
            .limit(limit);
        } catch (queryError) {
          console.error("Error fetching flash deals:", queryError);
          throw queryError; // Rethrow so the route handler can catch it and send a proper error response
        }
      }

      // Enrich products with main image URLs
      return await this.enrichProductsWithMainImage(productList);
    } catch (error) {
      console.error("Error in getFlashDeals:", error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async searchProducts(
    query: string,
    limit = 20,
    offset = 0,
    options?: { 
      includeInactive?: boolean; 
      includeCategoryInactive?: boolean;
      categoryId?: number;
      parentCategoryId?: number;
    },
  ): Promise<Product[]> {
    try {
      // Split query into individual terms and create search patterns
      const searchTerms = query.trim().split(/\s+/).filter(term => term.length > 0);
      console.log(`Searching products with terms: ${searchTerms.join(', ')}`);
      
      // Get all products first, then apply sophisticated ranking
      const allProductsResult = await this.getAllProducts(
        1000, // Get more products for ranking
        0,
        options?.categoryId,
        undefined,
        options
      );
      
      // Extract products array from the result object
      const allProducts = allProductsResult.products;
      
      // Filter and rank products based on search terms
      const rankedProducts = allProducts
        .filter(product => {
          if (!options?.includeInactive && !product.isActive) return false;
          
          // Apply category filtering if specified
          if (options?.categoryId && product.categoryId !== options.categoryId) return false;
          if (options?.parentCategoryId && product.category?.parentCategoryId !== options.parentCategoryId) return false;
          
          // Check if any search term matches
          return searchTerms.some(term => {
            const searchTerm = term.toLowerCase();
            return (
              product.name?.toLowerCase().includes(searchTerm) ||
              product.description?.toLowerCase().includes(searchTerm) ||
              product.brand?.toLowerCase().includes(searchTerm) ||
              product.supplier?.toLowerCase().includes(searchTerm) ||
              product.sku?.toLowerCase().includes(searchTerm) ||
              product.metaTitle?.toLowerCase().includes(searchTerm) ||
              product.metaDescription?.toLowerCase().includes(searchTerm) ||
              product.metaKeywords?.toLowerCase().includes(searchTerm) ||
              product.dimensions?.toLowerCase().includes(searchTerm) ||
              product.specialSaleText?.toLowerCase().includes(searchTerm) ||
              product.discountLabel?.toLowerCase().includes(searchTerm) ||
              product.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
            );
          });
        })
        .map(product => {
          // Calculate relevance score for ranking
          let score = 0;
          const productName = product.name?.toLowerCase() || '';
          const productDescription = product.description?.toLowerCase() || '';
          const productBrand = product.brand?.toLowerCase() || '';
          const productSku = product.sku?.toLowerCase() || '';
          
          searchTerms.forEach(term => {
            const searchTerm = term.toLowerCase();
            
            // Exact name match gets highest score
            if (productName === searchTerm) score += 100;
            // Name starts with term gets high score
            else if (productName.startsWith(searchTerm)) score += 80;
            // Name contains term gets medium score
            else if (productName.includes(searchTerm)) score += 60;
            
            // SKU exact match gets high score
            if (productSku === searchTerm) score += 90;
            else if (productSku.includes(searchTerm)) score += 50;
            
            // Brand exact match gets high score
            if (productBrand === searchTerm) score += 70;
            else if (productBrand.includes(searchTerm)) score += 40;
            
            // Description contains term gets lower score
            if (productDescription.includes(searchTerm)) score += 20;
            
            // Tags match gets medium score
            if (product.tags?.some(tag => tag.toLowerCase().includes(searchTerm))) score += 30;
            
            // Bonus for multiple word matches in name
            const nameWords = productName.split(' ');
            const matchingWords = nameWords.filter(word => word.includes(searchTerm));
            score += matchingWords.length * 10;
          });
          
          return { product, score };
        })
        .sort((a, b) => b.score - a.score) // Sort by relevance score descending
        .slice(offset, offset + limit)
        .map(item => item.product);

      console.log(`Found ${rankedProducts.length} ranked products`);
      
      // Enrich products with main image URLs
      return await this.enrichProductsWithMainImage(rankedProducts);
    } catch (error) {
      console.error(`Error in searchProducts for query "${query}":`, error);
      throw error;
    }
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    try {
      const [newProduct] = await db
        .insert(products)
        .values(product)
        .returning();
      return newProduct;
    } catch (error) {
      console.error(`Error creating product "${product.name}":`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async updateProduct(productId: number, productData: Partial<InsertProduct>): Promise<Product> {
    try {
      // Use snake_case field names like the working createProductWithWizard method
      const updateData = {
        name: productData.name,
        slug: productData.slug,
        price: productData.price,
        cost_price: productData.costPrice,
        stock: productData.stock,
        description: productData.description,
        category_id: productData.categoryId,
        catalog_id: productData.catalogId,
        sale_price: productData.salePrice,
        discount: productData.discount,
        image_url: productData.imageUrl,
        additional_images: productData.additionalImages || [],
        is_active: productData.isActive,
        is_featured: productData.isFeatured,
        is_flash_deal: productData.isFlashDeal,
        updated_at: new Date()
      };

      // Remove undefined values to avoid issues
      const cleanUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== undefined)
      );

      const [updatedProduct] = await db
        .update(products)
        .set(cleanUpdateData)
        .where(eq(products.id, productId))
        .returning();

      if (!updatedProduct) {
        throw new Error(`Product with ID ${productId} not found`);
      }

      return updatedProduct;
    } catch (error) {
      console.error(`Error updating product ID ${productId}:`, error);
      throw error;
    }
  }

  async updateProductFromDraft(productId: number, productData: Partial<InsertProduct>): Promise<Product> {
    try {
      const [updatedProduct] = await db
        .update(products)
        .set(productData)
        .where(eq(products.id, productId))
        .returning();
      
      if (!updatedProduct) {
        throw new Error(`Product with ID ${productId} not found`);
      }
      
      return updatedProduct;
    } catch (error) {
      console.error(`Error updating product ${productId}:`, error);
      throw error;
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
        const [createdProductRecord] = await tx
          .insert(products)
          .values(product)
          .returning();

        if (!createdProductRecord) {
          throw new Error("Failed to create product");
        }

        // Process images if they were provided via the wizard
        if (
          Array.isArray(product.imageObjectKeys) &&
          product.imageObjectKeys.length > 0
        ) {
          logger.debug(
            `Processing ${product.imageObjectKeys.length} product images`,
            {
              productId: createdProductRecord.id,
              imageCount: product.imageObjectKeys.length,
            },
          );

          // Extract main image index (defaulting to 0 if not specified)
          const mainImageIndex =
            typeof product.mainImageIndex === "number"
              ? product.mainImageIndex
              : 0;

          // Process each image
          for (let i = 0; i < product.imageObjectKeys.length; i++) {
            const objectKey = product.imageObjectKeys[i];
            const imageUrl =
              Array.isArray(product.imageUrls) && i < product.imageUrls.length
                ? product.imageUrls[i]
                : null;

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
                created_at: new Date(),
              });

              // If this is the main image, update the product record
              if (isMainImage && imageRecord) {
                // Update product's main image URL
                await tx
                  .update(products)
                  .set({
                    image_url: imageRecord.url,
                    original_image_object_key: imageRecord.objectKey,
                  })
                  .where(eq(products.id, createdProductRecord.id));

                // Also update our local copy of the record
                createdProductRecord.image_url = imageRecord.url;
                createdProductRecord.original_image_object_key =
                  imageRecord.objectKey;
              }

              logger.debug(`Created product image record`, {
                productId: createdProductRecord.id,
                imageUrl: imageUrl,
                isMain: isMainImage,
              });
            } catch (imageError) {
              logger.error(`Error creating product image record`, {
                error: imageError,
                productId: createdProductRecord.id,
                objectKey: objectKey,
              });
            }
          }
        }

        // Handle required attributes if specified
        if (
          product.requiredAttributeIds &&
          product.requiredAttributeIds.length > 0
        ) {
          logger.debug(
            `Setting required attributes for product ${createdProductRecord.id}:`,
            {
              attributes: product.requiredAttributeIds,
            },
          );

          // Update product attributes to mark them as required
          for (const attributeId of product.requiredAttributeIds) {
            const existingAttr = await tx.query.productAttributes.findFirst({
              where:
                eq(productAttributes.productId, createdProductRecord.id) &&
                eq(productAttributes.attributeId, attributeId),
            });

            if (existingAttr) {
              // Update existing attribute to be required
              await tx
                .update(productAttributes)
                .set({ isRequired: true })
                .where(eq(productAttributes.id, existingAttr.id));
            }
          }
        }

        // Handle special sale configuration if specified
        if (
          product.specialSaleText &&
          (product.specialSaleStart || product.specialSaleEnd)
        ) {
          logger.debug(
            `Setting special sale for product ${createdProductRecord.id}:`,
            {
              text: product.specialSaleText,
              start: product.specialSaleStart,
              end: product.specialSaleEnd,
            },
          );
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
        if (
          Array.isArray(product.imageObjectKeys) &&
          product.imageObjectKeys.length > 0
        ) {
          logger.info(
            `Moving ${product.imageObjectKeys.length} images for product ${createdProduct.id}`,
            {
              productId: createdProduct.id,
              imageCount: product.imageObjectKeys.length,
            },
          );

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
                supplier ? supplier.name : "unsorted",
                catalog ? catalog.name : "uncategorized",
                category ? category.name : "uncategorized",
                createdProduct.name,
                createdProduct.id,
              );

              // Store image information in the database
              await this.createProductImage({
                productId: createdProduct.id,
                url: result.url,
                objectKey: result.objectKey,
                isMain: isMainImage,
                sortOrder: i,
              });

              logger.debug(`Moved product image to final location`, {
                productId: createdProduct.id,
                from: sourceKey,
                to: result.objectKey,
                isMain: isMainImage,
              });
            } catch (imageError) {
              // Log error but continue with other images
              logger.error(
                `Error moving image for product ${createdProduct.id}:`,
                {
                  sourceKey,
                  productId: createdProduct.id,
                  error: imageError,
                },
              );
            }
          }
        }
      }

      return createdProduct;
    } catch (error) {
      logger.error(`Error creating product with wizard "${product.name}":`, {
        error,
      });
      throw error;
    }
  }

  /**
   * Saves a product draft for the wizard auto-save functionality
   * Creates a new draft if draftId is not provided, otherwise updates the existing draft
   */
  async saveProductDraft(
    userId: number,
    draftData: any,
    step: number,
    draftId?: string,
    catalogId?: number,
  ): Promise<any> {
    try {
      const randomDraftId =
        draftId ||
        `draft_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

      // Check if draft already exists
      const existingDraft = draftId
        ? await db.query.productDrafts.findFirst({
            where: and(
              eq(productDrafts.userId, userId),
              eq(productDrafts.draftId, draftId),
            ),
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
            updatedAt: new Date(),
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
            data: draftData,
          })
          .returning();

        return newDraft;
      }
    } catch (error) {
      logger.error("Error saving product draft", { userId, draftId, error });
      throw new Error(
        `Failed to save product draft: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Gets a specific product draft by its draft ID
   */
  async getProductDraft(
    userId: number,
    draftId: string,
  ): Promise<any | undefined> {
    try {
      const draft = await db.query.productDrafts.findFirst({
        where: and(
          eq(productDrafts.userId, userId),
          eq(productDrafts.draftId, draftId),
        ),
      });

      return draft;
    } catch (error) {
      logger.error("Error retrieving product draft", {
        userId,
        draftId,
        error,
      });
      throw new Error(
        `Failed to retrieve product draft: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Gets all product drafts for a specific user, optionally filtered by catalog
   */
  /* Deprecated - use the implementation at line ~4834 instead */
  async getUserProductDraftsOld(
    userId: number,
    catalogId?: number,
  ): Promise<any[]> {
    logger.warn(
      "Deprecated getUserProductDrafts function called - use newer implementation",
    );
    try {
      return await storage.getUserProductDrafts(userId);
    } catch (error) {
      logger.error("Error retrieving user product drafts (old method)", {
        userId,
        catalogId,
        error,
      });
      throw new Error(
        `Failed to retrieve user product drafts: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Deletes a product draft
   */
  // This older version of deleteProductDraft is deprecated
  // Using the new version with numeric ID below
  async deleteProductDraftLegacy(
    userId: number,
    draftId: string,
  ): Promise<boolean> {
    logger.warn("Using deprecated deleteProductDraftLegacy method");
    if (!isNaN(Number(draftId))) {
      // Convert to the new style call
      return this.deleteProductDraft(Number(draftId));
    }
    try {
      throw new Error(
        "Deprecated method - use deleteProductDraft(id: number) instead",
      );
    } catch (error) {
      logger.error("Error in deprecated deleteProductDraftLegacy", {
        userId,
        draftId,
        error,
      });
      throw error;
    }
  }

  async updateProduct(
    id: number,
    productData: Partial<InsertProduct>,
  ): Promise<Product | undefined> {
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
      if (
        productData.catalogId === undefined &&
        existingProduct.catalogId !== null
      ) {
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
        found: !!item,
      });

      return item;
    } catch (error) {
      logger.error(`Error fetching cart item`, {
        error,
        cartItemId: id,
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
        itemCount: items.length,
      });

      return items;
    } catch (error) {
      logger.error(`Error fetching cart items for user`, {
        error,
        userId,
      });
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async getCartItemsWithProducts(
    userId: number,
  ): Promise<(CartItem & { product: Product })[]> {
    try {
      const items = await db
        .select()
        .from(cartItems)
        .where(eq(cartItems.userId, userId));

      logger.debug(`Retrieved cart items for retrieval with products`, {
        userId,
        itemCount: items.length,
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
              const enrichedProducts = await this.enrichProductsWithMainImage([
                product,
              ]);

              result.push({
                ...item,
                product: enrichedProducts[0],
              });

              logger.debug(`Added product to cart results`, {
                cartItemId: item.id,
                productId: product.id,
                productName: product.name,
              });
            } catch (enrichError) {
              logger.error(
                `Error enriching product with images for cart item`,
                {
                  error: enrichError,
                  productId: product.id,
                  cartItemId: item.id,
                },
              );
              // Continue to next item but don't rethrow as we want to return whatever items we successfully retrieved
            }
          } else {
            logger.warn(`Product not found for cart item`, {
              cartItemId: item.id,
              productId: item.productId,
            });
          }
        } catch (productError) {
          logger.error(`Error fetching product for cart item`, {
            error: productError,
            productId: item.productId,
            cartItemId: item.id,
          });
          // Continue to next item but don't rethrow as we want to return whatever items we successfully retrieved
        }
      }

      logger.debug(`Completed cart items with products retrieval`, {
        userId,
        totalItems: result.length,
      });

      return result;
    } catch (error) {
      logger.error(`Error retrieving cart items with products`, {
        error,
        userId,
      });
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async addToCart(cartItem: InsertCartItem): Promise<CartItem> {
    try {
      console.log(`🔍 NEW CART DEBUG - Received cartItem:`, cartItem);
      console.log(`🔍 NEW CART DEBUG - itemPrice value:`, cartItem.itemPrice, typeof cartItem.itemPrice);
      
      // Check if the item is already in the cart (same user and product)
      const [existingItem] = await db
        .select()
        .from(cartItems)
        .where(and(
          eq(cartItems.userId, cartItem.userId),
          eq(cartItems.productId, cartItem.productId)
        ));

      if (existingItem) {
        // Update quantity and merge attribute selections with quantity tracking
        const newQuantity = existingItem.quantity + cartItem.quantity;
        const existingSelections = existingItem.attributeSelections || {};
        const newSelections = cartItem.attributeSelections || {};
        
        // Merge attribute selections with quantity counts
        const mergedSelections: any = { ...existingSelections };
        
        for (const [attributeName, value] of Object.entries(newSelections)) {
          if (!mergedSelections[attributeName]) {
            // New attribute - store as quantity count object
            mergedSelections[attributeName] = { [value]: cartItem.quantity };
          } else if (typeof mergedSelections[attributeName] === 'string') {
            // Convert old string format to quantity count object
            const oldValue = mergedSelections[attributeName];
            if (oldValue === value) {
              // Same value - add to existing count
              mergedSelections[attributeName] = { [value]: existingItem.quantity + cartItem.quantity };
            } else {
              // Different values - create separate counts
              mergedSelections[attributeName] = { 
                [oldValue]: existingItem.quantity, 
                [value]: cartItem.quantity 
              };
            }
          } else if (typeof mergedSelections[attributeName] === 'object') {
            // Already in quantity count format
            if (mergedSelections[attributeName][value]) {
              // Add to existing count
              mergedSelections[attributeName][value] += cartItem.quantity;
            } else {
              // New value for this attribute
              mergedSelections[attributeName][value] = cartItem.quantity;
            }
          }
        }

        const [updatedItem] = await db
          .update(cartItems)
          .set({ 
            quantity: newQuantity,
            attributeSelections: mergedSelections,
            updatedAt: new Date()
          })
          .where(eq(cartItems.id, existingItem.id))
          .returning();

        logger.info(`Updated cart item with merged attributes`, {
          cartItemId: existingItem.id,
          productId: cartItem.productId,
          userId: cartItem.userId,
          oldQuantity: existingItem.quantity,
          newQuantity: newQuantity,
          mergedSelections
        });

        return updatedItem;
      } else {
        // Insert new item - ensure itemPrice is properly formatted and convert attribute selections to quantity count format
        const formattedAttributeSelections: any = {};
        
        if (cartItem.attributeSelections) {
          for (const [attributeName, value] of Object.entries(cartItem.attributeSelections)) {
            formattedAttributeSelections[attributeName] = { [value]: cartItem.quantity };
          }
        }
        
        const itemToInsert = {
          userId: cartItem.userId,
          productId: cartItem.productId,
          quantity: cartItem.quantity,
          itemPrice: String(cartItem.itemPrice), // Convert to string for decimal column
          attributeSelections: formattedAttributeSelections
        };

        console.log(`🔍 NEW CART DEBUG - Inserting:`, itemToInsert);

        const [newItem] = await db
          .insert(cartItems)
          .values(itemToInsert)
          .returning();

        console.log(`🔍 NEW CART DEBUG - Database returned:`, newItem);

        logger.info(`Added new item to cart`, {
          cartItemId: newItem.id,
          productId: cartItem.productId,
          userId: cartItem.userId,
          quantity: cartItem.quantity,
          itemPrice: cartItem.itemPrice
        });

        return newItem;
      }
    } catch (error) {
      logger.error(`Error adding item to cart`, {
        error,
        userId: cartItem.userId,
        productId: cartItem.productId,
      });
      throw error;
    }
  }

  async updateCartItemQuantity(
    id: number,
    quantity: number,
  ): Promise<CartItem | undefined> {
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
            requestedQuantity: quantity,
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
              previousQuantity: cartItem.quantity,
            });

            return undefined;
          } catch (deleteError) {
            logger.error(`Error deleting cart item with zero quantity`, {
              error: deleteError,
              cartItemId: id,
              quantity,
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
            newQuantity: quantity,
          });

          return updatedItem;
        } catch (updateError) {
          logger.error(`Error updating quantity for cart item`, {
            error: updateError,
            cartItemId: id,
            quantity,
            productId: cartItem.productId,
          });
          throw updateError; // Rethrow so the route handler can catch it and send a proper error response
        }
      } catch (fetchError) {
        logger.error(`Error fetching cart item before quantity update`, {
          error: fetchError,
          cartItemId: id,
        });
        throw fetchError;
      }
    } catch (error) {
      logger.error(`Error in cart item quantity update operation`, {
        error,
        cartItemId: id,
        requestedQuantity: quantity,
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
            cartItemId: id,
          });
          return true; // Return success as idempotent operation (item already gone)
        }

        // Proceed with deletion
        await db.delete(cartItems).where(eq(cartItems.id, id));

        logger.info(`Removed item from cart`, {
          cartItemId: id,
          productId: cartItem.productId,
          userId: cartItem.userId,
          quantity: cartItem.quantity,
        });

        return true;
      } catch (fetchError) {
        logger.error(`Error fetching cart item before removal`, {
          error: fetchError,
          cartItemId: id,
        });
        throw fetchError;
      }
    } catch (error) {
      logger.error(`Error removing item from cart`, {
        error,
        cartItemId: id,
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
          cartItemIds: items.map((item) => item.id),
        });

        return true;
      } catch (deleteError) {
        logger.error(`Error deleting items during cart clear operation`, {
          error: deleteError,
          userId,
        });
        throw deleteError;
      }
    } catch (error) {
      logger.error(`Error clearing cart`, {
        error,
        userId,
      });
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async updateCartItemAttributes(
    id: number,
    attributeSelections: Record<string, any>
  ): Promise<CartItem | undefined> {
    try {
      // First, retrieve the cart item to check if it exists
      const [cartItem] = await db
        .select()
        .from(cartItems)
        .where(eq(cartItems.id, id));

      if (!cartItem) {
        logger.warn(`Attempted to update attributes for non-existent cart item`, {
          cartItemId: id,
        });
        return undefined;
      }

      // Update the attribute selections
      const [updatedItem] = await db
        .update(cartItems)
        .set({ 
          attributeSelections,
          updatedAt: new Date()
        })
        .where(eq(cartItems.id, id))
        .returning();

      logger.info(`Updated cart item attributes`, {
        cartItemId: id,
        productId: cartItem.productId,
        userId: cartItem.userId,
        previousSelections: cartItem.attributeSelections,
        newSelections: attributeSelections,
      });

      return updatedItem;
    } catch (error) {
      logger.error(`Error updating cart item attributes`, {
        error,
        cartItemId: id,
        attributeSelections,
      });
      throw error;
    }
  }

  /**
   * Get all order items for a specific order with product details
   * @param orderId The ID of the order to get items for
   * @returns Array of order items with product details
   */
  async getOrderItems(
    orderId: number,
  ): Promise<(OrderItem & { product: Product })[]> {
    try {
      // Get order items with product details
      const items = await db
        .select({
          orderItem: orderItems,
          product: products,
        })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(eq(orderItems.orderId, orderId));

      // Map the result to get the structure we want
      return items.map((row) => ({
        ...row.orderItem,
        product: row.product,
      }));
    } catch (error) {
      console.error(`Error fetching order items for order ${orderId}:`, error);
      throw error; // Rethrow for proper error handling in the route
    }
  }

  // Order operations
  async createOrder(
    order: InsertOrder,
    items: InsertOrderItem[],
  ): Promise<Order> {
    try {
      // Generate a temporary order number for initial insert
      const tempOrderNumber = `TMY-TEMP-${Date.now()}`;
      
      // Create the order with temporary order number
      const orderWithTempNumber = {
        ...order,
        orderNumber: tempOrderNumber,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const [newOrder] = await db.insert(orders).values(orderWithTempNumber).returning();

      // Generate the final order number using the actual OrderID and date
      const orderDate = new Date().toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD format
      const finalOrderNumber = `TMY-${newOrder.id}-${orderDate}`;

      // Update the order with the final order number
      const [updatedOrder] = await db
        .update(orders)
        .set({ orderNumber: finalOrderNumber })
        .where(eq(orders.id, newOrder.id))
        .returning();

      // Use the updated order for the rest of the process
      const orderToUse = updatedOrder;

      logger.info(`Created new order`, {
        orderId: orderToUse.id,
        orderNumber: orderToUse.orderNumber,
        userId: order.userId,
        status: order.status,
        itemCount: items.length,
        totalAmount: order.totalAmount,
      });

      // Add order items with full product details and attributes
      let successfulItemInserts = 0;
      let failedItemInserts = 0;

      for (const item of items) {
        try {
          const [orderItem] = await db
            .insert(orderItems)
            .values({
              ...item,
              orderId: orderToUse.id,
              createdAt: new Date().toISOString(),
            })
            .returning();

          successfulItemInserts++;

          logger.debug(`Added item to order`, {
            orderId: orderToUse.id,
            orderItemId: orderItem.id,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            selectedAttributes: item.selectedAttributes,
          });

          // Update the product's sold count
          if (item.productId) {
            try {
              await db
                .update(products)
                .set({
                  soldCount: sql`${products.soldCount} + ${item.quantity}`,
                })
                .where(eq(products.id, item.productId));

              logger.debug(`Updated product sold count`, {
                orderId: orderToUse.id,
                productId: item.productId,
                quantitySold: item.quantity,
              });
            } catch (updateError) {
              logger.error(`Error updating sold count for product`, {
                error: updateError,
                orderId: orderToUse.id,
                productId: item.productId,
                quantity: item.quantity,
              });
              // Continue processing other items
            }
          }
        } catch (itemError) {
          failedItemInserts++;
          logger.error(`Error inserting order item`, {
            error: itemError,
            orderId: orderToUse.id,
            productId: item.productId,
            itemIndex: successfulItemInserts + failedItemInserts - 1,
          });
        }
      }

      if (failedItemInserts > 0) {
        logger.warn(`Some order items failed to insert`, {
          orderId: orderToUse.id,
          successCount: successfulItemInserts,
          failCount: failedItemInserts,
          totalItems: items.length,
        });
      }

      // Create initial status history entry for order creation
      try {
        await this.addOrderStatusHistory(
          orderToUse.id,
          orderToUse.status,
          orderToUse.paymentStatus,
          'System',
          null,
          'order_created',
          `Order ${orderToUse.orderNumber} created`
        );
        
        logger.debug(`Created initial status history entry`, {
          orderId: orderToUse.id,
          status: orderToUse.status,
          paymentStatus: orderToUse.paymentStatus
        });
      } catch (historyError) {
        logger.error(`Error creating initial status history`, {
          error: historyError,
          orderId: orderToUse.id,
        });
        // Don't throw here as the order is already created
      }

      // Clear the cart after successful order creation
      try {
        if (order.userId) {
          await this.clearCart(order.userId);
          logger.info(`Cleared cart after order creation`, {
            orderId: orderToUse.id,
            orderNumber: orderToUse.orderNumber,
            userId: order.userId,
          });
        }
      } catch (cartError) {
        logger.error(`Error clearing cart after order creation`, {
          error: cartError,
          orderId: orderToUse.id,
          userId: order.userId,
        });
        // Don't throw here as the order is already created
      }

      return orderToUse;
    } catch (error) {
      logger.error(`Error in order creation process`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userId: order.userId,
      });
      throw error;
    }
  }

  async getOrdersByUser(userId: number | null): Promise<Order[]> {
    try {
      // If userId is null, return all orders (admin function)
      if (userId === null) {
        try {
          const results = await db.query.orders.findMany({
            orderBy: [desc(orders.createdAt)],
            with: {
              orderItems: true
            }
          });

          logger.info(`Retrieved all orders for admin view`, {
            count: results.length,
          });

          return results;
        } catch (adminOrdersError) {
          logger.error(`Error fetching all orders (admin function)`, {
            error: adminOrdersError,
          });
          throw adminOrdersError;
        }
      }

      // Return orders for specific user
      try {
        const results = await db.query.orders.findMany({
          where: eq(orders.userId, userId),
          orderBy: [desc(orders.createdAt)],
          with: {
            orderItems: true
          }
        });

        logger.info(`Retrieved orders for user`, {
          userId,
          count: results.length,
        });

        return results;
      } catch (userOrdersError) {
        logger.error(`Error fetching orders for user`, {
          error: userOrdersError,
          userId,
        });
        throw userOrdersError;
      }
    } catch (error) {
      logger.error(`Error in order retrieval process`, {
        error,
        userType: userId === null ? "admin" : "user",
        userId,
      });
      throw error;
    }
  }

  async updateOrderTracking(
    id: number,
    trackingNumber: string,
  ): Promise<Order | undefined> {
    try {
      // First check if the order exists
      const [existingOrder] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, id));

      if (!existingOrder) {
        logger.warn(`Attempted to update tracking of non-existent order`, {
          orderId: id,
          trackingNumber,
        });
        return undefined;
      }

      // Update the order with the new tracking number
      const [updatedOrder] = await db
        .update(orders)
        .set({
          trackingNumber,
        })
        .where(eq(orders.id, id))
        .returning();

      logger.info(`Updated order tracking number`, {
        orderId: id,
        trackingNumber,
        userId: updatedOrder.userId,
      });

      return updatedOrder;
    } catch (error) {
      logger.error(`Error updating order tracking number`, {
        error,
        orderId: id,
        trackingNumber,
      });
      throw error;
    }
  }

  async getOrderById(
    id: number,
  ): Promise<
    | (Order & {
        items: (OrderItem & { product: Product; attributeDetails?: any })[];
      })
    | undefined
  > {
    try {
      // Get the order
      const [order] = await db.select().from(orders).where(eq(orders.id, id));

      if (!order) {
        logger.warn(`Order not found`, { orderId: id });
        return undefined;
      }

      logger.debug(`Retrieved order details`, {
        orderId: id,
        userId: order.userId,
        status: order.status,
        createdAt: order.createdAt,
      });

      try {
        // Use the getOrderItems method to fetch items with products
        const itemsWithProducts = await this.getOrderItems(id);

        logger.debug(`Retrieved order items using getOrderItems method`, {
          orderId: id,
          itemCount: itemsWithProducts.length,
        });

        const items: (OrderItem & {
          product: Product;
          attributeDetails?: any;
        })[] = [];
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
                  combinationHash: item.combinationHash,
                };

                logger.debug(`Retrieved attribute details for order item`, {
                  orderId: id,
                  orderItemId: item.id,
                  productId: item.productId,
                  combinationHash: item.combinationHash,
                });
              } catch (attributeError) {
                logger.error(
                  `Error processing attribute details for order item`,
                  {
                    error: attributeError,
                    orderId: id,
                    orderItemId: item.id,
                  },
                );
                // Continue without attribute details
              }
            }

            // Add the item with attribute details
            items.push({
              ...item,
              attributeDetails,
            });

            successfulItemLoads++;
          } catch (itemError) {
            failedItemLoads++;
            logger.error(`Error processing order item details`, {
              error: itemError,
              orderId: id,
              orderItemId: item.id,
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
            totalItems: itemsWithProducts.length,
          });
        }

        logger.info(`Completed order details retrieval`, {
          orderId: id,
          itemCount: items.length,
        });

        // Parse lockerDetails JSON and enrich with full PUDO locker data if available
        let parsedOrder = { ...order };
        if (order.lockerDetails && typeof order.lockerDetails === 'string') {
          try {
            parsedOrder.lockerDetails = JSON.parse(order.lockerDetails);
          } catch (parseError) {
            logger.error(`Error parsing lockerDetails JSON`, {
              error: parseError,
              orderId: id,
              lockerDetails: order.lockerDetails,
            });
            // Keep the original string value if parsing fails
          }
        }

        // If this is a PUDO order with a selected locker, fetch complete locker details
        if (order.shippingMethod === 'pudo' && order.selectedLockerId) {
          try {
            const [fullLockerDetails] = await db
              .select()
              .from(pudoLockers)
              .where(eq(pudoLockers.id, order.selectedLockerId));

            if (fullLockerDetails) {
              // Merge the complete locker details with the basic order locker info
              parsedOrder.lockerDetails = {
                ...parsedOrder.lockerDetails,
                ...fullLockerDetails,
                // Ensure we preserve any order-specific locker info
                selectedAt: parsedOrder.lockerDetails?.selectedAt,
              };

              logger.debug(`Enriched order with complete PUDO locker details`, {
                orderId: id,
                lockerId: order.selectedLockerId,
                lockerCode: fullLockerDetails.code,
                lockerName: fullLockerDetails.name,
              });
            }
          } catch (lockerError) {
            logger.error(`Error fetching complete PUDO locker details`, {
              error: lockerError,
              orderId: id,
              selectedLockerId: order.selectedLockerId,
            });
            // Continue with basic locker details if full details can't be fetched
          }
        }

        return {
          ...parsedOrder,
          items,
        };
      } catch (itemsError) {
        logger.error(`Error fetching order items`, {
          error: itemsError,
          orderId: id,
        });

        // Return order without items
        logger.warn(`Returning order without items due to error`, {
          orderId: id,
        });

        // Parse lockerDetails JSON even in error case
        let parsedOrder = { ...order };
        if (order.lockerDetails && typeof order.lockerDetails === 'string') {
          try {
            parsedOrder.lockerDetails = JSON.parse(order.lockerDetails);
          } catch (parseError) {
            logger.error(`Error parsing lockerDetails JSON in error case`, {
              error: parseError,
              orderId: id,
            });
          }
        }

        return {
          ...parsedOrder,
          items: [],
        };
      }
    } catch (error) {
      logger.error(`Error in order retrieval process`, {
        error,
        orderId: id,
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
  async updateOrderStatus(
    id: number,
    status: string,
  ): Promise<Order | undefined> {
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
            newStatus: status,
          });
          return undefined;
        }

        const oldStatus = existingOrder.status;
        const now = new Date();

        try {
          // Prepare update data with status and updatedAt
          const updateData: any = {
            status,
            updatedAt: now,
          };

          // If status is shipped, set shippedAt timestamp
          if (status === 'shipped') {
            updateData.shippedAt = now;
          }

          // Update the order with the new status and timestamps
          const [updatedOrder] = await db
            .update(orders)
            .set(updateData)
            .where(eq(orders.id, id))
            .returning();

          // If order is marked as shipped, update all supplier order items with status "ordered" to "shipped"
          if (status === 'shipped') {
            try {
              // Get all order items for this order
              const orderItems = await db
                .select({ id: orderItems.id })
                .from(orderItems)
                .where(eq(orderItems.orderId, id));

              // Update supplier status for items that are currently "ordered" to "shipped"
              for (const item of orderItems) {
                await db
                  .update(orderItemSupplierStatus)
                  .set({
                    supplierStatus: 'shipped',
                    updatedAt: now.toISOString()
                  })
                  .where(
                    and(
                      eq(orderItemSupplierStatus.orderItemId, item.id),
                      eq(orderItemSupplierStatus.supplierStatus, 'ordered')
                    )
                  );
              }

              logger.info(`Updated supplier order statuses to shipped for order ${id}`, {
                orderId: id,
                orderItemCount: orderItems.length
              });
            } catch (supplierUpdateError) {
              logger.error(`Error updating supplier order statuses when marking order as shipped`, {
                error: supplierUpdateError,
                orderId: id
              });
              // Don't throw error here as the main order update was successful
            }
          }

          logger.info(`Updated order status`, {
            orderId: id,
            oldStatus,
            newStatus: status,
            userId: updatedOrder.userId,
          });

          // Create status history entry for the status change
          try {
            await this.addOrderStatusHistory(
              id,
              status,
              updatedOrder.paymentStatus,
              'Admin',
              null,
              'status_changed',
              `Order status changed from ${oldStatus} to ${status}`
            );
            
            logger.debug(`Created status history entry for status change`, {
              orderId: id,
              oldStatus,
              newStatus: status
            });
          } catch (historyError) {
            logger.error(`Error creating status history for status change`, {
              error: historyError,
              orderId: id,
              oldStatus,
              newStatus: status
            });
            // Don't throw here as the order update was successful
          }

          return updatedOrder;
        } catch (updateError) {
          logger.error(`Error updating order status`, {
            error: updateError,
            orderId: id,
            oldStatus,
            newStatus: status,
            userId: existingOrder.userId,
          });
          throw updateError; // Rethrow for outer error handler to catch
        }
      } catch (queryError) {
        logger.error(`Error querying order before status update`, {
          error: queryError,
          orderId: id,
          newStatus: status,
        });
        throw queryError; // Rethrow for outer error handler to catch
      }
    } catch (error) {
      logger.error(`Error in order status update process`, {
        error,
        orderId: id,
        newStatus: status,
      });
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async updateOrderInvoicePath(
    id: number,
    invoicePath: string,
  ): Promise<Order | undefined> {
    try {
      const [updatedOrder] = await db
        .update(orders)
        .set({
          invoicePath,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(orders.id, id))
        .returning();

      if (!updatedOrder) {
        logger.warn(`Order not found when updating invoice path`, { orderId: id });
        return undefined;
      }

      logger.info('Updated order invoice path', {
        orderId: id,
        invoicePath,
        userId: updatedOrder.userId,
      });

      return updatedOrder;
    } catch (error) {
      logger.error('Error updating order invoice path', { error, orderId: id, invoicePath });
      throw error;
    }
  }

  async updateOrderPaymentStatus(
    id: number,
    paymentStatus: string,
    paymentReceivedDate?: string,
  ): Promise<Order | undefined> {
    try {
      // First check if the order exists
      try {
        const [existingOrder] = await db
          .select()
          .from(orders)
          .where(eq(orders.id, id));

        if (!existingOrder) {
          logger.warn(`Attempted to update payment status of non-existent order`, {
            orderId: id,
            newPaymentStatus: paymentStatus,
          });
          return undefined;
        }

        const oldPaymentStatus = existingOrder.paymentStatus;
        const now = new Date().toISOString();

        try {
          // Prepare update data
          const updateData: any = {
            paymentStatus,
            updatedAt: now,
          };

          // Add payment received date if provided
          if (paymentReceivedDate) {
            updateData.paymentReceivedDate = paymentReceivedDate;
          }

          // Update the order with the new payment status and updatedAt timestamp
          const [updatedOrder] = await db
            .update(orders)
            .set(updateData)
            .where(eq(orders.id, id))
            .returning();

          logger.info(`Updated order payment status`, {
            orderId: id,
            oldPaymentStatus,
            newPaymentStatus: paymentStatus,
            paymentReceivedDate,
            userId: updatedOrder.userId,
          });

          // Create status history entry for the payment status change
          try {
            await this.addOrderStatusHistory(
              id,
              updatedOrder.status,
              paymentStatus,
              'Admin',
              null,
              'payment_status_changed',
              `Payment status changed from ${oldPaymentStatus} to ${paymentStatus}`
            );
            
            logger.debug(`Created status history entry for payment status change`, {
              orderId: id,
              oldPaymentStatus,
              newPaymentStatus: paymentStatus
            });
          } catch (historyError) {
            logger.error(`Error creating status history for payment status change`, {
              error: historyError,
              orderId: id,
              oldPaymentStatus,
              newPaymentStatus: paymentStatus
            });
            // Don't throw here as the order update was successful
          }

          return updatedOrder;
        } catch (updateError) {
          logger.error(`Error updating order payment status`, {
            error: updateError,
            orderId: id,
            oldPaymentStatus,
            newPaymentStatus: paymentStatus,
            userId: existingOrder.userId,
          });
          throw updateError;
        }
      } catch (queryError) {
        logger.error(`Error querying order before payment status update`, {
          error: queryError,
          orderId: id,
          newPaymentStatus: paymentStatus,
        });
        throw queryError;
      }
    } catch (error) {
      logger.error(`Error in order payment status update process`, {
        error,
        orderId: id,
        newPaymentStatus: paymentStatus,
      });
      throw error;
    }
  }

  // Order Status History implementation
  async createOrderStatusHistoryEntry(entry: InsertOrderStatusHistory): Promise<OrderStatusHistory> {
    try {
      const [newEntry] = await db
        .insert(orderStatusHistory)
        .values({
          ...entry,
          createdAt: new Date().toISOString()
        })
        .returning();
      
      logger.info(`Created order status history entry`, { 
        orderId: entry.orderId, 
        eventType: entry.eventType,
        status: entry.status 
      });
      
      return newEntry;
    } catch (error) {
      logger.error(`Error creating order status history entry`, { error, entry });
      throw error;
    }
  }

  async getOrderStatusHistory(orderId: number): Promise<OrderStatusHistory[]> {
    try {
      const history = await db
        .select()
        .from(orderStatusHistory)
        .where(eq(orderStatusHistory.orderId, orderId))
        .orderBy(orderStatusHistory.createdAt);
        
      logger.debug(`Retrieved order status history`, { 
        orderId, 
        entryCount: history.length 
      });
      
      return history;
    } catch (error) {
      logger.error(`Error retrieving order status history`, { error, orderId });
      throw error;
    }
  }

  async addOrderStatusHistory(
    orderId: number,
    status: string,
    paymentStatus: string | null,
    changedBy: string,
    changedByUserId: number | null,
    eventType: string,
    notes?: string,
    trackingNumber?: string
  ): Promise<OrderStatusHistory> {
    try {
      // Get current order to capture previous status
      const [currentOrder] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId));

      if (!currentOrder) {
        throw new Error(`Order ${orderId} not found`);
      }

      const entry: InsertOrderStatusHistory = {
        orderId,
        status,
        paymentStatus,
        previousStatus: currentOrder.status,
        previousPaymentStatus: currentOrder.paymentStatus,
        changedBy,
        changedByUserId,
        eventType,
        notes,
        trackingNumber
      };

      return await this.createOrderStatusHistoryEntry(entry);
    } catch (error) {
      logger.error(`Error adding order status history`, { 
        error, 
        orderId, 
        eventType, 
        status 
      });
      throw error;
    }
  }

  async updateOrderEftProof(
    id: number,
    eftPop: string,
  ): Promise<Order | undefined> {
    try {
      // First check if the order exists
      try {
        const [existingOrder] = await db
          .select()
          .from(orders)
          .where(eq(orders.id, id));

        if (!existingOrder) {
          logger.warn(`Attempted to update EFT proof of non-existent order`, {
            orderId: id,
            eftPop,
          });
          return undefined;
        }

        const now = new Date().toISOString();

        try {
          // Update the order with the EFT proof path and updatedAt timestamp
          const [updatedOrder] = await db
            .update(orders)
            .set({
              eftPop,
              updatedAt: now,
            })
            .where(eq(orders.id, id))
            .returning();

          logger.info(`Updated order EFT proof of payment`, {
            orderId: id,
            eftPop,
            userId: updatedOrder.userId,
          });

          return updatedOrder;
        } catch (updateError) {
          logger.error(`Error updating order EFT proof`, {
            error: updateError,
            orderId: id,
            eftPop,
            userId: existingOrder.userId,
          });
          throw updateError;
        }
      } catch (queryError) {
        logger.error(`Error querying order before EFT proof update`, {
          error: queryError,
          orderId: id,
          eftPop,
        });
        throw queryError;
      }
    } catch (error) {
      logger.error(`Error in order EFT proof update process`, {
        error,
        orderId: id,
        eftPop,
      });
      throw error;
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
          createdAt: productImages.createdAt,
        })
        .from(productImages)
        .where(eq(productImages.productId, productId))
        .orderBy(asc(productImages.sortOrder));

      logger.debug(`Retrieved product images`, {
        productId,
        imageCount: result.length,
        hasMainImage: result.some((img) => img.isMain),
      });

      return result;
    } catch (error) {
      logger.error(`Error retrieving product images`, {
        error,
        productId,
      });
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async getProductImagesWithBgRemoved(
    productId: number,
  ): Promise<ProductImage[]> {
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
          createdAt: productImages.createdAt,
        })
        .from(productImages)
        .where(
          and(
            eq(productImages.productId, productId),
            eq(productImages.hasBgRemoved, true),
          ),
        )
        .orderBy(asc(productImages.sortOrder));

      logger.debug(`Retrieved background-removed product images`, {
        productId,
        imageCount: result.length,
      });

      return result;
    } catch (error) {
      logger.error(`Error retrieving background-removed product images`, {
        error,
        productId,
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
        hasBgRemoved: image.hasBgRemoved,
      });

      return image;
    } catch (error) {
      logger.error(`Error retrieving product image by ID`, {
        error,
        imageId: id,
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
                eq(productImages.isMain, true),
              ),
            );

          if (currentMainImage) {
            // Unset existing main image
            await db
              .update(productImages)
              .set({ isMain: false })
              .where(
                and(
                  eq(productImages.productId, image.productId),
                  eq(productImages.isMain, true),
                ),
              );

            logger.debug(`Unset existing main image`, {
              productId: image.productId,
              previousMainImageId: currentMainImage.id,
            });
          }
        } catch (updateError) {
          logger.error(`Error unsetting existing main image`, {
            error: updateError,
            productId: image.productId,
          });
          throw updateError; // Rethrow so the route handler can catch it and send a proper error response
        }
      }

      try {
        // Insert the new image
        const [newImage] = await db
          .insert(productImages)
          .values(image)
          .returning();

        logger.info(`Created new product image`, {
          imageId: newImage.id,
          productId: newImage.productId,
          isMain: newImage.isMain,
          objectKey: newImage.objectKey,
        });

        return newImage;
      } catch (insertError) {
        logger.error(`Error inserting new product image`, {
          error: insertError,
          productId: image.productId,
          isMain: image.isMain,
        });
        throw insertError; // Rethrow so the route handler can catch it and send a proper error response
      }
    } catch (error) {
      logger.error(`Error in product image creation process`, {
        error,
        productId: image.productId,
      });
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async updateProductImage(
    id: number,
    imageData: Partial<InsertProductImage>,
  ): Promise<ProductImage | undefined> {
    try {
      // First, verify that the image exists
      const existingImage = await this.getProductImageById(id);
      if (!existingImage) {
        logger.warn(`Cannot update product image that doesn't exist`, {
          imageId: id,
        });
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
                sql`${productImages.id} != ${id}`,
              ),
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
                  sql`${productImages.id} != ${id}`,
                ),
              );

            logger.debug(`Unset existing main image during update`, {
              productId: imageData.productId,
              previousMainImageId: currentMainImage.id,
              newMainImageId: id,
            });
          }
        } catch (updateError) {
          logger.error(
            `Error unsetting existing main image during image update`,
            {
              error: updateError,
              productId: imageData.productId,
              imageId: id,
            },
          );
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
          logger.warn(`Product image update failed, no record returned`, {
            imageId: id,
          });
          return undefined;
        }

        logger.info(`Updated product image`, {
          imageId: id,
          productId: updatedImage.productId,
          isMain: updatedImage.isMain,
          isBackgroundRemoved: updatedImage.hasBgRemoved,
        });

        return updatedImage;
      } catch (updateError) {
        logger.error(`Error updating product image data`, {
          error: updateError,
          imageId: id,
          productId: imageData.productId,
        });
        throw updateError; // Rethrow so the route handler can catch it and send a proper error response
      }
    } catch (error) {
      logger.error(`Error in product image update process`, {
        error,
        imageId: id,
      });
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async setMainProductImage(
    productId: number,
    imageId: number,
  ): Promise<boolean> {
    try {
      // First, verify that the image exists and belongs to the product
      const image = await this.getProductImageById(imageId);
      if (!image) {
        logger.warn(`Cannot set main image - image not found`, {
          imageId,
          productId,
        });
        return false;
      }

      if (image.productId !== productId) {
        logger.warn(
          `Cannot set main image - image belongs to different product`,
          {
            imageId,
            productId,
            actualProductId: image.productId,
          },
        );
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
              eq(productImages.isMain, true),
            ),
          );

        if (currentMainImage) {
          await db
            .update(productImages)
            .set({ isMain: false })
            .where(
              and(
                eq(productImages.productId, productId),
                eq(productImages.isMain, true),
              ),
            );

          logger.debug(`Unset existing main image`, {
            productId,
            previousMainImageId: currentMainImage.id,
            newMainImageId: imageId,
          });
        }
      } catch (unsetError) {
        logger.error(`Error unsetting existing main image`, {
          error: unsetError,
          productId,
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
          success: !!updatedImage,
        });

        return !!updatedImage;
      } catch (setError) {
        logger.error(`Error setting image as main`, {
          error: setError,
          productId,
          imageId,
        });
        throw setError; // Rethrow so the route handler can catch it and send a proper error response
      }
    } catch (error) {
      logger.error(`Error in main product image setting process`, {
        error,
        productId,
        imageId,
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
            productId,
          });
        } catch (storageError) {
          logger.error(`Error deleting original image from object storage`, {
            error: storageError,
            objectKey: image.objectKey,
            imageId: id,
            productId,
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
            productId,
          });
        } catch (storageError) {
          logger.error(
            `Error deleting background-removed image from object storage`,
            {
              error: storageError,
              objectKey: image.bgRemovedObjectKey,
              imageId: id,
              productId,
            },
          );
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
            bgRemoved: storageInfo.bgRemovedDeleted,
          },
        });

        return true;
      } catch (dbError) {
        logger.error(`Error deleting product image from database`, {
          error: dbError,
          imageId: id,
          productId,
        });
        throw dbError;
      }
    } catch (error) {
      logger.error(`Error in product image deletion process`, {
        error,
        imageId: id,
      });
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async deleteProduct(id: number): Promise<boolean> {
    try {
      // Use the database function that handles all the complex deletion logic
      const result = await db.execute(sql`SELECT delete_product_completely(${id}) as success`);
      const success = result.rows[0]?.success;
      
      if (success) {
        logger.info(`Product ${id} successfully deleted using database function`);
        return true;
      } else {
        logger.warn(`Product ${id} deletion returned false - may not exist`);
        return false;
      }
    } catch (error) {
      logger.error(`Error in product deletion process`, {
        error,
        productId: id,
      });
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async bulkUpdateProductStatus(
    productIds: number[],
    isActive: boolean,
  ): Promise<number> {
    try {
      if (productIds.length === 0) {
        logger.debug(`Bulk status update called with empty product ID list`, {
          isActive,
          count: 0,
        });
        return 0;
      }

      // Check which products actually exist (for better error messages and accurate counts)
      const existingProducts = await db
        .select({
          id: products.id,
          name: products.name,
          isCurrentlyActive: products.isActive,
        })
        .from(products)
        .where(inArray(products.id, productIds));

      const existingIds = existingProducts.map((p) => p.id);
      const notFoundIds = productIds.filter((id) => !existingIds.includes(id));

      // Log a warning if some products were not found
      if (notFoundIds.length > 0) {
        logger.warn(`Some products not found during bulk status update`, {
          notFoundCount: notFoundIds.length,
          notFoundIds,
          requestedCount: productIds.length,
        });
      }

      // Early return if no products actually exist
      if (existingIds.length === 0) {
        logger.warn(`No products found to update status`, {
          requestedIds: productIds,
          isActive,
        });
        return 0;
      }

      // Count products that already have the requested status
      const alreadyInStatusCount = existingProducts.filter(
        (p) => p.isCurrentlyActive === isActive,
      ).length;
      if (alreadyInStatusCount === existingIds.length) {
        logger.info(`All products already have the requested status`, {
          isActive,
          count: existingIds.length,
        });
        return existingIds.length; // All products already have the requested status
      }

      try {
        // Update all existing products in the list to the new status
        await db
          .update(products)
          .set({
            isActive,
            updatedAt: new Date(),
          })
          .where(inArray(products.id, existingIds));

        logger.info(`Bulk updated product status`, {
          isActive,
          totalProductCount: existingIds.length,
          alreadyInStatusCount,
          actuallyUpdatedCount: existingIds.length - alreadyInStatusCount,
        });

        // Return the number of affected rows (successfully processed)
        return existingIds.length;
      } catch (updateError) {
        logger.error(`Error updating product status in database`, {
          error: updateError,
          isActive,
          productCount: existingIds.length,
        });
        throw updateError; // Rethrow so the route handler can catch it and send a proper error response
      }
    } catch (error) {
      logger.error(`Error in bulk product status update process`, {
        error,
        isActive,
        productIdCount: productIds.length,
      });
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  // AI Recommendation operations
  async saveRecommendation(
    recommendation: InsertAiRecommendation,
  ): Promise<AiRecommendation> {
    try {
      const [newRecommendation] = await db
        .insert(aiRecommendations)
        .values(recommendation)
        .returning();
      return newRecommendation;
    } catch (error) {
      console.error("Error saving AI recommendation:", error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async getRecommendationsForUser(
    userId: number,
  ): Promise<AiRecommendation | undefined> {
    try {
      const [recommendation] = await db
        .select()
        .from(aiRecommendations)
        .where(eq(aiRecommendations.userId, userId))
        .orderBy(desc(aiRecommendations.createdAt))
        .limit(1);

      return recommendation;
    } catch (error) {
      console.error(
        `Error fetching AI recommendations for user ${userId}:`,
        error,
      );
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  // Pricing operations
  async getPricingByCategoryId(
    categoryId: number,
  ): Promise<Pricing | undefined> {
    try {
      const [pricingSetting] = await db
        .select()
        .from(pricing)
        .where(eq(pricing.categoryId, categoryId));

      return pricingSetting;
    } catch (error) {
      console.error(
        `Error fetching pricing for category ${categoryId}:`,
        error,
      );
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
      console.error("Error fetching all pricing settings:", error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async createOrUpdatePricing(pricingData: InsertPricing): Promise<Pricing> {
    try {
      // Check if pricing for this category already exists
      try {
        const existing = await this.getPricingByCategoryId(
          pricingData.categoryId,
        );

        if (existing) {
          try {
            // Update existing pricing
            const [updated] = await db
              .update(pricing)
              .set({
                markupPercentage: pricingData.markupPercentage,
                description: pricingData.description,
                updatedAt: new Date(),
              })
              .where(eq(pricing.id, existing.id))
              .returning();

            return updated;
          } catch (updateError) {
            console.error(
              `Error updating existing pricing for category ${pricingData.categoryId}:`,
              updateError,
            );
            throw updateError; // Rethrow so the route handler can catch it and send a proper error response
          }
        } else {
          try {
            // Create new pricing
            const [newPricing] = await db
              .insert(pricing)
              .values(pricingData)
              .returning();
            return newPricing;
          } catch (insertError) {
            console.error(
              `Error creating new pricing for category ${pricingData.categoryId}:`,
              insertError,
            );
            throw insertError; // Rethrow so the route handler can catch it and send a proper error response
          }
        }
      } catch (lookupError) {
        console.error(
          `Error checking if pricing exists for category ${pricingData.categoryId}:`,
          lookupError,
        );
        throw lookupError; // Rethrow so the route handler can catch it and send a proper error response
      }
    } catch (error) {
      console.error(
        `Error in createOrUpdatePricing for category ${pricingData.categoryId}:`,
        error,
      );
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
      console.error("Error fetching default markup percentage:", error);
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
      console.error(
        `Error fetching AI setting with name "${settingName}":`,
        error,
      );
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
      console.error("Error fetching all AI settings:", error);
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
                updatedAt: new Date(),
              })
              .where(eq(aiSettings.settingName, setting.settingName))
              .returning();

            return updatedSetting;
          } catch (updateError) {
            console.error(
              `Error updating existing AI setting "${setting.settingName}":`,
              updateError,
            );
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
            console.error(
              `Error creating new AI setting "${setting.settingName}":`,
              insertError,
            );
            throw insertError; // Rethrow so the route handler can catch it and send a proper error response
          }
        }
      } catch (lookupError) {
        console.error(
          `Error checking if AI setting "${setting.settingName}" exists:`,
          lookupError,
        );
        throw lookupError; // Rethrow so the route handler can catch it and send a proper error response
      }
    } catch (error) {
      console.error(
        `Error in saveAiSetting for "${setting.settingName}":`,
        error,
      );
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
        return await db.select().from(suppliers).orderBy(asc(suppliers.name));
      }
    } catch (error) {
      console.error(
        `Error fetching all suppliers (activeOnly=${activeOnly}):`,
        error,
      );
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

  async getSupplierByName(name: string): Promise<Supplier | undefined> {
    try {
      const [supplier] = await db
        .select()
        .from(suppliers)
        .where(eq(suppliers.name, name));
      return supplier;
    } catch (error) {
      console.error(`Error fetching supplier with name "${name}":`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    try {
      const now = new Date().toISOString();
      
      // Log the supplier data being inserted for debugging
      console.log('🔍 SUPPLIER DEBUG - About to insert:', {
        ...supplier,
        createdAt: now,
        updatedAt: now,
      });
      
      const [newSupplier] = await db
        .insert(suppliers)
        .values({
          ...supplier,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
        
      console.log('🔍 SUPPLIER DEBUG - Successfully created:', newSupplier);
      return newSupplier;
    } catch (error) {
      console.error(`🔍 SUPPLIER DEBUG - Error creating supplier "${supplier.name}":`, error);
      console.error('🔍 SUPPLIER DEBUG - Error details:', {
        message: error?.message,
        stack: error?.stack,
        code: error?.code,
        detail: error?.detail,
        name: error?.name,
        fullError: error
      });
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async updateSupplier(
    id: number,
    supplierData: Partial<InsertSupplier>,
  ): Promise<Supplier | undefined> {
    try {
      const [updatedSupplier] = await db
        .update(suppliers)
        .set({
          ...supplierData,
          updatedAt: new Date(),
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
          updatedAt: new Date().toISOString(),
        })
        .where(eq(suppliers.id, id))
        .returning();
      return !!updatedSupplier;
    } catch (error) {
      console.error(`Error soft-deleting supplier ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async hardDeleteSupplier(id: number): Promise<boolean> {
    try {
      // Hard deletion - actually remove from database
      const result = await db
        .delete(suppliers)
        .where(eq(suppliers.id, id));
      return true; // If no error thrown, deletion was successful
    } catch (error) {
      console.error(`Error hard-deleting supplier ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async getProductCountByCatalogId(catalogId: number): Promise<number> {
    try {
      const result = await db
        .select({ count: count() })
        .from(products)
        .where(eq(products.catalogId, catalogId));
      return result[0]?.count ?? 0;
    } catch (error) {
      console.error(`Error counting products for catalog ${catalogId}:`, error);
      throw error;
    }
  }

  // Catalog operations
  async getAllCatalogs(activeOnly = true): Promise<any[]> {
    console.log('DEBUG: getAllCatalogs() WITH activeOnly parameter called, activeOnly =', activeOnly);
    try {
      // Get catalogs with supplier information using raw SQL to ensure it works
      try {
        const sqlQuery = activeOnly 
          ? `
            SELECT 
              c.id,
              c.name,
              c.description,
              c.supplier_id as "supplierId",
              s.name as "supplierName",
              c.is_active as "isActive",
              c.default_markup_percentage as "defaultMarkupPercentage",
              c.start_date as "startDate",
              c.end_date as "endDate",
              c.created_at as "createdAt"
            FROM catalogs c
            LEFT JOIN suppliers s ON c.supplier_id = s.id
            WHERE c.is_active = true
            ORDER BY c.name
          `
          : `
            SELECT 
              c.id,
              c.name,
              c.description,
              c.supplier_id as "supplierId",
              s.name as "supplierName",
              c.is_active as "isActive",
              c.default_markup_percentage as "defaultMarkupPercentage",
              c.start_date as "startDate",
              c.end_date as "endDate",
              c.created_at as "createdAt"
            FROM catalogs c
            LEFT JOIN suppliers s ON c.supplier_id = s.id
            ORDER BY c.name
          `;

        const result = await db.execute(sql.raw(sqlQuery));
        const catalogData = result.rows;
        
        // Debug log to see what we're getting from raw SQL
        console.log('Raw SQL result:', JSON.stringify(catalogData, null, 2));

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
                      .where(
                        and(
                          eq(products.catalogId, catalog.id),
                          eq(products.isActive, true),
                        ),
                      )
                  : db
                      .select({ count: sql<number>`count(*)` })
                      .from(products)
                      .where(eq(products.catalogId, catalog.id));

                const [result] = await productsQuery;
                const count = result?.count || 0;

                // Format all dates as ISO strings
                return {
                  ...catalog,
                  startDate: catalog.startDate
                    ? new Date(catalog.startDate).toISOString()
                    : null,
                  endDate: catalog.endDate
                    ? new Date(catalog.endDate).toISOString()
                    : null,
                  createdAt: catalog.createdAt
                    ? new Date(catalog.createdAt).toISOString()
                    : null,
                  productsCount: Number(count),
                };
              } catch (productCountError) {
                console.error(
                  `Error counting products for catalog ${catalog.id}:`,
                  productCountError,
                );
                // Return the catalog with a zero product count in case of an error
                return {
                  ...catalog,
                  startDate: catalog.startDate
                    ? new Date(catalog.startDate).toISOString()
                    : null,
                  endDate: catalog.endDate
                    ? new Date(catalog.endDate).toISOString()
                    : null,
                  createdAt: catalog.createdAt
                    ? new Date(catalog.createdAt).toISOString()
                    : null,
                  productsCount: 0,
                };
              }
            }),
          );

          return catalogsWithProductCount;
        } catch (productCountsError) {
          console.error(
            "Error while getting product counts for catalogs:",
            productCountsError,
          );
          throw productCountsError; // Rethrow so the route handler can catch it and send a proper error response
        }
      } catch (catalogsQueryError) {
        console.error(
          `Error fetching catalogs (activeOnly=${activeOnly}):`,
          catalogsQueryError,
        );
        throw catalogsQueryError; // Rethrow so the route handler can catch it and send a proper error response
      }
    } catch (error) {
      console.error(
        `Error in getAllCatalogs (activeOnly=${activeOnly}):`,
        error,
      );
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async getCatalogsBySupplierId(
    supplierId: number,
    activeOnly = true,
  ): Promise<any[]> {
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
            createdAt: catalogs.createdAt,
          })
          .from(catalogs)
          .leftJoin(suppliers, eq(catalogs.supplierId, suppliers.id))
          .where(
            and(
              eq(catalogs.supplierId, supplierId),
              eq(catalogs.isActive, true),
            ),
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
            createdAt: catalogs.createdAt,
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
              .where(
                and(
                  eq(products.catalogId, catalog.id),
                  eq(products.isActive, true),
                ),
              )
          : db
              .select({ count: sql<number>`count(*)` })
              .from(products)
              .where(eq(products.catalogId, catalog.id));

        const [result] = await productsQuery;
        const count = result?.count || 0;

        // Format all dates as ISO strings
        return {
          ...catalog,
          startDate: catalog.startDate
            ? new Date(catalog.startDate).toISOString()
            : null,
          endDate: catalog.endDate
            ? new Date(catalog.endDate).toISOString()
            : null,
          createdAt: catalog.createdAt
            ? new Date(catalog.createdAt).toISOString()
            : null,
          productsCount: Number(count),
        };
      }),
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
        updatedAt: catalogs.updatedAt,
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
      startDate: catalogData.startDate
        ? new Date(catalogData.startDate).toISOString()
        : null,
      endDate: catalogData.endDate
        ? new Date(catalogData.endDate).toISOString()
        : null,
      freeShipping: false, // Placeholder for freeShipping
      productsCount: Number(productCount),
      createdAt: catalogData.createdAt
        ? new Date(catalogData.createdAt).toISOString()
        : null,
      updatedAt: catalogData.updatedAt
        ? new Date(catalogData.updatedAt).toISOString()
        : null,
    };

    return catalog;
  }

  async getCatalogByNameAndSupplierId(name: string, supplierId: number): Promise<Catalog | undefined> {
    try {
      const [catalog] = await db
        .select()
        .from(catalogs)
        .where(and(
          eq(catalogs.name, name),
          eq(catalogs.supplierId, supplierId)
        ))
        .limit(1);

      return catalog;
    } catch (error) {
      console.error('Error checking for existing catalog:', error);
      throw error;
    }
  }

  async createCatalog(catalog: InsertCatalog): Promise<Catalog> {
    try {
      const now = new Date().toISOString();
      
      // Log the catalog data being inserted for debugging
      console.log('🔍 CATALOG DEBUG - About to insert:', {
        ...catalog,
        createdAt: now,
        updatedAt: now,
      });
      
      const [newCatalog] = await db
        .insert(catalogs)
        .values({
          ...catalog,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
        
      console.log('🔍 CATALOG DEBUG - Successfully created:', newCatalog);
      return newCatalog;
    } catch (error) {
      console.error(`🔍 CATALOG DEBUG - Error creating catalog "${catalog.name}":`, error);
      console.error('🔍 CATALOG DEBUG - Error details:', {
        message: error?.message,
        stack: error?.stack,
        code: error?.code,
        detail: error?.detail,
        name: error?.name,
        fullError: error
      });
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async updateCatalog(
    id: number,
    catalogData: Partial<InsertCatalog>,
  ): Promise<Catalog | undefined> {
    // Convert startDate and endDate strings to Date objects if provided
    const updateValues = {
      ...catalogData,
      startDate: catalogData.startDate
        ? new Date(catalogData.startDate)
        : undefined,
      // Handle null explicitly to allow clearing the endDate
      endDate:
        catalogData.endDate === null
          ? null
          : catalogData.endDate
            ? new Date(catalogData.endDate)
            : undefined,
    };

    // Remove createdAt and updatedAt from the payload since these are handled by Drizzle
    delete updateValues["createdAt"];
    delete updateValues["updatedAt"];

    const [updatedCatalog] = await db
      .update(catalogs)
      .set({
        ...updateValues,
        updatedAt: new Date(),
      })
      .where(eq(catalogs.id, id))
      .returning();

    return updatedCatalog;
  }

  async deleteCatalog(id: number): Promise<boolean> {
    try {
      // Use hard deletion for catalogs - completely remove from database
      const [deletedCatalog] = await db
        .delete(catalogs)
        .where(eq(catalogs.id, id))
        .returning();
      return !!deletedCatalog;
    } catch (error) {
      console.error(`Error deleting catalog ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async bulkUpdateCatalogProducts(catalogId: number, updates: Partial<InsertProduct>): Promise<number> {
    try {
      const result = await db
        .update(products)
        .set({
          ...updates,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(products.catalogId, catalogId));
      return result.rowCount || 0;
    } catch (error) {
      console.error(`Error bulk updating products for catalog ${catalogId}:`, error);
      throw error;
    }
  }

  async getProductsByCatalogId(
    catalogId: number,
    activeOnly = true,
    limit = 20,
    offset = 0,
  ): Promise<(Product & { categoryName?: string })[]> {
    try {
      console.log(
        `Getting products for catalog ID ${catalogId}, activeOnly: ${activeOnly}, limit: ${limit}, offset: ${offset}`,
      );

      const query = db
        .select({
          ...products,
          categoryName: categories.name,
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id));

      let result;
      if (activeOnly) {
        result = await query
          .where(
            and(eq(products.catalogId, catalogId), eq(products.isActive, true)),
          )
          .limit(limit)
          .offset(offset);
      } else {
        result = await query
          .where(eq(products.catalogId, catalogId))
          .limit(limit)
          .offset(offset);
      }

      console.log(
        `Found ${result.length} products for catalog ID ${catalogId}`,
      );

      // Enrich products with main image URLs
      return await this.enrichProductsWithMainImage(result);
    } catch (error) {
      console.error(
        `Error getting products for catalog ID ${catalogId}:`,
        error,
      );
      throw error;
    }
  }

  async getProductCountByCatalogId(
    catalogId: number,
    includeInactive = false,
  ): Promise<number> {
    // Count query to get total number of products in a catalog
    try {
      console.log(
        `Getting product count for catalog ID ${catalogId}, includeInactive: ${includeInactive}`,
      );

      const query = db.select({ count: count() }).from(products);

      if (includeInactive) {
        // Include all products regardless of active status
        query.where(eq(products.catalogId, catalogId));
      } else {
        // Only include active products
        query.where(
          and(eq(products.catalogId, catalogId), eq(products.isActive, true)),
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

  async bulkUpdateCatalogProducts(
    catalogId: number,
    updateData: Partial<InsertProduct>,
  ): Promise<number> {
    // Update all products in a catalog with the provided data
    // Returns number of products updated
    const result = await db
      .update(products)
      .set(updateData)
      .where(eq(products.catalogId, catalogId))
      .returning({ id: products.id });

    return result.length;
  }

  async updateProductDisplayOrder(
    catalogId: number,
    productIds: number[],
  ): Promise<{ count: number }> {
    // Update display order for each product based on its position in the provided array
    // This ensures products appear in the order specified by productIds

    // Validate that all products belong to the specified catalog
    const catalogProducts = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.catalogId, catalogId));

    const catalogProductIds = new Set(catalogProducts.map((p) => p.id));
    const validProductIds = productIds.filter((id) =>
      catalogProductIds.has(id),
    );

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
            .where(
              and(
                eq(products.id, productId),
                eq(products.catalogId, catalogId),
              ),
            )
            .returning({ id: products.id }),
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
  async getProductAttributeValues(
    productId: number,
  ): Promise<ProductAttributeValue[]> {
    try {
      const values = await db
        .select()
        .from(productAttributeValues)
        .where(eq(productAttributeValues.productId, productId));

      logger.debug(`Retrieved product attribute values`, {
        productId,
        valueCount: values.length,
      });

      return values;
    } catch (error) {
      logger.error(`Error retrieving product attribute values`, {
        error,
        productId,
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
  async getProductAttributeValuesByAttributeId(
    productId: number,
    attributeId: number,
  ): Promise<ProductAttributeValue[]> {
    try {
      const values = await db
        .select()
        .from(productAttributeValues)
        .where(
          and(
            eq(productAttributeValues.productId, productId),
            eq(productAttributeValues.attributeId, attributeId),
          ),
        );

      logger.debug(
        `Retrieved product attribute values for specific attribute`,
        {
          productId,
          attributeId,
          valueCount: values.length,
        },
      );

      return values;
    } catch (error) {
      logger.error(
        `Error retrieving product attribute values for specific attribute`,
        {
          error,
          productId,
          attributeId,
        },
      );
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  /**
   * Create a new attribute value for a product
   * @param value The value data to insert
   * @returns The created attribute value
   */
  async createProductAttributeValue(
    value: InsertProductAttributeValue,
  ): Promise<ProductAttributeValue> {
    try {
      const [newValue] = await db
        .insert(productAttributeValues)
        .values(value)
        .returning();

      logger.info(`Created new product attribute value`, {
        valueId: newValue.id,
        productId: newValue.productId,
        attributeId: newValue.attributeId,
        optionId: newValue.optionId,
      });

      return newValue;
    } catch (error) {
      logger.error(`Error creating product attribute value`, {
        error,
        productId: value.productId,
        attributeId: value.attributeId,
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
  async updateProductAttributeValue(
    id: number,
    valueData: Partial<InsertProductAttributeValue>,
  ): Promise<ProductAttributeValue | undefined> {
    try {
      const [updatedValue] = await db
        .update(productAttributeValues)
        .set(valueData)
        .where(eq(productAttributeValues.id, id))
        .returning();

      if (!updatedValue) {
        logger.warn(`Product attribute value not found for update`, {
          valueId: id,
        });
        return undefined;
      }

      logger.info(`Updated product attribute value`, {
        valueId: id,
        productId: updatedValue.productId,
        attributeId: updatedValue.attributeId,
      });

      return updatedValue;
    } catch (error) {
      logger.error(`Error updating product attribute value`, {
        error,
        valueId: id,
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
        valueId: id,
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
      logger.warn(`Using deprecated method getProductAttributeCombinations`, {
        productId,
      });
      const values = await this.getProductAttributeValues(productId);
      // Convert to the expected format to maintain compatibility
      return values.map((value) => ({
        id: value.id,
        productId: value.productId,
        attributeValues: [value],
      }));
    } catch (error) {
      logger.error(
        `Error in deprecated getProductAttributeCombinations method`,
        {
          error,
          productId,
        },
      );
      throw error;
    }
  }

  /**
   * @deprecated Use getProductAttributeValues with filtering instead
   */
  async getProductAttributeCombinationByHash(
    productId: number,
    combinationHash: string,
  ): Promise<any | undefined> {
    try {
      logger.warn(
        `Using deprecated method getProductAttributeCombinationByHash`,
        {
          productId,
          combinationHash,
        },
      );
      // Just return the first value as a fallback
      const values = await this.getProductAttributeValues(productId);
      if (values.length === 0) return undefined;

      return {
        id: values[0].id,
        productId,
        attributeValues: values,
      };
    } catch (error) {
      logger.error(
        `Error in deprecated getProductAttributeCombinationByHash method`,
        {
          error,
          productId,
          combinationHash,
        },
      );
      throw error;
    }
  }

  /**
   * @deprecated Use createProductAttributeValue instead
   */
  async createProductAttributeCombination(combination: any): Promise<any> {
    try {
      logger.warn(`Using deprecated method createProductAttributeCombination`, {
        productId: combination.productId,
      });

      if (
        !combination.attributeValues ||
        combination.attributeValues.length === 0
      ) {
        logger.error(`Cannot create combination without attribute values`, {
          productId: combination.productId,
        });
        throw new Error("Attribute values are required");
      }

      // Create the first attribute value and return a compatible object
      const value = await this.createProductAttributeValue({
        productId: combination.productId,
        attributeId: combination.attributeValues[0].attributeId,
        optionId: combination.attributeValues[0].optionId,
        textValue: combination.attributeValues[0].textValue,
      });

      return {
        id: value.id,
        productId: value.productId,
        attributeValues: [value],
      };
    } catch (error) {
      logger.error(
        `Error in deprecated createProductAttributeCombination method`,
        {
          error,
          productId: combination.productId,
        },
      );
      throw error;
    }
  }

  /**
   * @deprecated Use updateProductAttributeValue instead
   */
  async updateProductAttributeCombination(
    id: number,
    combinationData: any,
  ): Promise<any | undefined> {
    try {
      logger.warn(`Using deprecated method updateProductAttributeCombination`, {
        id,
      });

      // We'll just update the value with this ID as a fallback
      const value = await this.updateProductAttributeValue(id, {
        productId: combinationData.productId,
      });

      if (!value) return undefined;

      return {
        id: value.id,
        productId: value.productId,
        attributeValues: [value],
      };
    } catch (error) {
      logger.error(
        `Error in deprecated updateProductAttributeCombination method`,
        {
          error,
          id,
        },
      );
      throw error;
    }
  }

  /**
   * @deprecated Use deleteProductAttributeValue instead
   */
  async deleteProductAttributeCombination(id: number): Promise<boolean> {
    try {
      logger.warn(`Using deprecated method deleteProductAttributeCombination`, {
        id,
      });
      return await this.deleteProductAttributeValue(id);
    } catch (error) {
      logger.error(
        `Error in deprecated deleteProductAttributeCombination method`,
        {
          error,
          id,
        },
      );
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

  async getGlobalAttributeById(
    id: number,
  ): Promise<GlobalAttribute | undefined> {
    const [attribute] = await db
      .select()
      .from(globalAttributes)
      .where(eq(globalAttributes.id, id));

    return attribute;
  }

  async createGlobalAttribute(
    attribute: InsertGlobalAttribute,
  ): Promise<GlobalAttribute> {
    const [newAttribute] = await db
      .insert(globalAttributes)
      .values(attribute)
      .returning();

    return newAttribute;
  }

  async updateGlobalAttribute(
    id: number,
    attributeData: Partial<InsertGlobalAttribute>,
  ): Promise<GlobalAttribute | undefined> {
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
  async getGlobalAttributeOptions(
    attributeId: number,
  ): Promise<GlobalAttributeOption[]> {
    const options = await db
      .select()
      .from(globalAttributeOptions)
      .where(eq(globalAttributeOptions.attributeId, attributeId))
      .orderBy(
        asc(globalAttributeOptions.sortOrder),
        asc(globalAttributeOptions.value),
      );

    return options;
  }

  async createGlobalAttributeOption(
    option: InsertGlobalAttributeOption,
  ): Promise<GlobalAttributeOption> {
    const [newOption] = await db
      .insert(globalAttributeOptions)
      .values(option)
      .returning();

    return newOption;
  }

  async updateGlobalAttributeOption(
    id: number,
    optionData: Partial<InsertGlobalAttributeOption>,
  ): Promise<GlobalAttributeOption | undefined> {
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
  async getProductGlobalAttributes(
    productId: number,
  ): Promise<
    (ProductGlobalAttribute & {
      attribute: GlobalAttribute;
      options: GlobalAttributeOption[];
    })[]
  > {
    const result = await db
      .select({
        productAttr: productGlobalAttributes,
        attribute: globalAttributes,
      })
      .from(productGlobalAttributes)
      .innerJoin(
        globalAttributes,
        eq(productGlobalAttributes.attributeId, globalAttributes.id),
      )
      .where(eq(productGlobalAttributes.productId, productId));

    // For each product-attribute relationship, get the selected options
    const enriched = await Promise.all(
      result.map(async (row) => {
        const options = await this.getProductGlobalAttributeOptions(
          row.productAttr.id,
        );
        return {
          ...row.productAttr,
          attribute: row.attribute,
          options,
        };
      }),
    );

    return enriched;
  }

  async addGlobalAttributeToProduct(
    productId: number,
    attributeId: number,
  ): Promise<ProductGlobalAttribute> {
    // Check if this attribute is already assigned to this product
    const existing = await db
      .select()
      .from(productGlobalAttributes)
      .where(
        and(
          eq(productGlobalAttributes.productId, productId),
          eq(productGlobalAttributes.attributeId, attributeId),
        ),
      );

    if (existing.length > 0) {
      return existing[0]; // Return the existing relationship
    }

    // Create new relationship
    const [newAttr] = await db
      .insert(productGlobalAttributes)
      .values({
        productId,
        attributeId,
      })
      .returning();

    return newAttr;
  }

  async removeGlobalAttributeFromProduct(
    productId: number,
    attributeId: number,
  ): Promise<boolean> {
    // Find the product-attribute relationship
    const [relation] = await db
      .select()
      .from(productGlobalAttributes)
      .where(
        and(
          eq(productGlobalAttributes.productId, productId),
          eq(productGlobalAttributes.attributeId, attributeId),
        ),
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
  async getProductGlobalAttributeOptions(
    productAttributeId: number,
  ): Promise<GlobalAttributeOption[]> {
    const options = await db
      .select({
        option: globalAttributeOptions,
      })
      .from(productGlobalAttributeOptions)
      .innerJoin(
        globalAttributeOptions,
        eq(productGlobalAttributeOptions.optionId, globalAttributeOptions.id),
      )
      .where(
        eq(
          productGlobalAttributeOptions.productAttributeId,
          productAttributeId,
        ),
      );

    return options.map((row) => row.option);
  }

  async getGlobalAttributeOptionsForProduct(
    productAttributeId: number,
  ): Promise<ProductGlobalAttributeOption[]> {
    const options = await db
      .select()
      .from(productGlobalAttributeOptions)
      .where(
        eq(
          productGlobalAttributeOptions.productAttributeId,
          productAttributeId,
        ),
      );

    return options;
  }

  async addGlobalAttributeOptionToProduct(
    productAttributeId: number,
    optionId: number,
  ): Promise<ProductGlobalAttributeOption> {
    // Check if this option is already assigned
    const existing = await db
      .select()
      .from(productGlobalAttributeOptions)
      .where(
        and(
          eq(
            productGlobalAttributeOptions.productAttributeId,
            productAttributeId,
          ),
          eq(productGlobalAttributeOptions.optionId, optionId),
        ),
      );

    if (existing.length > 0) {
      return existing[0]; // Return the existing relationship
    }

    // Create new relationship
    const [newOption] = await db
      .insert(productGlobalAttributeOptions)
      .values({
        productAttributeId,
        optionId,
      })
      .returning();

    return newOption;
  }

  async removeGlobalAttributeOptionFromProduct(
    productAttributeId: number,
    optionId: number,
  ): Promise<boolean> {
    const result = await db
      .delete(productGlobalAttributeOptions)
      .where(
        and(
          eq(
            productGlobalAttributeOptions.productAttributeId,
            productAttributeId,
          ),
          eq(productGlobalAttributeOptions.optionId, optionId),
        ),
      );

    return result.count > 0;
  }

  async getGlobalAttributesWithOptionsForProduct(productId: number): Promise<
    {
      attribute: GlobalAttribute;
      productAttributeId: number;
      selectedOptions: GlobalAttributeOption[];
    }[]
  > {
    // Get all global attributes assigned to this product
    const productGlobalAttrs = await this.getProductGlobalAttributes(productId);

    // Map to the required format
    return productGlobalAttrs.map((productAttr) => ({
      attribute: productAttr.attribute,
      productAttributeId: productAttr.id,
      selectedOptions: productAttr.options,
    }));
  }

  // ==================================================================================
  // ATTRIBUTE SYSTEM IMPLEMENTATION
  // ==================================================================================

  // Core attribute operations
  async getAllAttributes(): Promise<Attribute[]> {
    return await db.select().from(attributes).orderBy(asc(attributes.name));
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
    // Always auto-generate sort order for new attributes
    const maxSortOrderResult = await db
      .select({ maxSortOrder: sql<number>`COALESCE(MAX(sort_order), -1)` })
      .from(attributes);
    
    const nextSortOrder = (maxSortOrderResult[0]?.maxSortOrder || -1) + 1;
    
    // Remove sortOrder from input and use auto-generated value
    const { sortOrder: _, ...attributeWithoutSort } = attribute;
    
    const [newAttribute] = await db
      .insert(attributes)
      .values({
        ...attributeWithoutSort,
        sortOrder: nextSortOrder
      })
      .returning();
    return newAttribute;
  }

  async updateAttribute(
    id: number,
    attributeData: Partial<InsertAttribute>,
  ): Promise<Attribute | undefined> {
    const [updatedAttribute] = await db
      .update(attributes)
      .set(attributeData)
      .where(eq(attributes.id, id))
      .returning();
    return updatedAttribute;
  }

  async deleteAttribute(id: number): Promise<boolean> {
    try {
      await db.delete(attributes).where(eq(attributes.id, id));
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

  async getAttributeOptionById(
    id: number,
  ): Promise<AttributeOption | undefined> {
    const [option] = await db
      .select()
      .from(attributeOptions)
      .where(eq(attributeOptions.id, id));
    return option;
  }

  async createAttributeOption(
    option: InsertAttributeOption,
  ): Promise<AttributeOption> {
    // Always auto-generate sort order for new attribute options
    const maxSortOrderResult = await db
      .select({ maxSortOrder: sql<number>`COALESCE(MAX(sort_order), -1)` })
      .from(attributeOptions)
      .where(eq(attributeOptions.attributeId, option.attributeId));
    
    const nextSortOrder = (maxSortOrderResult[0]?.maxSortOrder || -1) + 1;
    
    // Remove sortOrder from input and use auto-generated value
    const { sortOrder: _, ...optionWithoutSort } = option;
    
    const [newOption] = await db
      .insert(attributeOptions)
      .values({
        ...optionWithoutSort,
        sortOrder: nextSortOrder
      })
      .returning();
    return newOption;
  }

  async updateAttributeOption(
    id: number,
    optionData: Partial<InsertAttributeOption>,
  ): Promise<AttributeOption | undefined> {
    const [updatedOption] = await db
      .update(attributeOptions)
      .set(optionData)
      .where(eq(attributeOptions.id, id))
      .returning();
    return updatedOption;
  }

  async deleteAttributeOption(id: number): Promise<boolean> {
    try {
      await db.delete(attributeOptions).where(eq(attributeOptions.id, id));
      return true;
    } catch (error) {
      console.error(`Error deleting attribute option ${id}:`, error);
      throw error; // Rethrow so the route handler can catch it and send a proper error response
    }
  }

  async updateAttributeOptionsOrder(
    attributeId: number,
    optionIds: number[],
  ): Promise<boolean> {
    try {
      // Start a transaction
      await db.transaction(async (tx) => {
        // Update the sort order for each option
        for (let i = 0; i < optionIds.length; i++) {
          await tx
            .update(attributeOptions)
            .set({ sortOrder: i })
            .where(
              and(
                eq(attributeOptions.id, optionIds[i]),
                eq(attributeOptions.attributeId, attributeId),
              ),
            );
        }
      });
      return true;
    } catch (error) {
      console.error(
        `Error updating attribute options order for attribute ${attributeId}:`,
        error,
      );
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
  async getProductAttributes(
    productId: number,
  ): Promise<(ProductAttribute & { attribute: Attribute })[]> {
    try {
      const result = await db
        .select({
          productAttr: productAttributes,
          attribute: attributes,
        })
        .from(productAttributes)
        .innerJoin(attributes, eq(productAttributes.attributeId, attributes.id))
        .where(eq(productAttributes.productId, productId))
        .orderBy(asc(productAttributes.sortOrder));

      return result.map((row) => ({
        ...row.productAttr,
        attribute: row.attribute,
      }));
    } catch (error) {
      logger.error("Error getting product attributes", { error, productId });
      throw error;
    }
  }

  /**
   * Get a specific product attribute by ID
   * @param id ID of the product attribute
   * @returns The product attribute with its base attribute information
   */
  async getProductAttributeById(
    id: number,
  ): Promise<(ProductAttribute & { attribute: Attribute }) | undefined> {
    try {
      const [result] = await db
        .select({
          productAttr: productAttributes,
          attribute: attributes,
        })
        .from(productAttributes)
        .innerJoin(attributes, eq(productAttributes.attributeId, attributes.id))
        .where(eq(productAttributes.id, id));

      if (!result) return undefined;

      return {
        ...result.productAttr,
        attribute: result.attribute,
      };
    } catch (error) {
      logger.error("Error getting product attribute by ID", { error, id });
      throw error;
    }
  }

  /**
   * Create a new product attribute
   * @param productAttribute The product attribute to create
   * @returns The created product attribute
   */
  async createProductAttribute(
    productAttribute: InsertProductAttribute,
  ): Promise<ProductAttribute> {
    try {
      const [newAttribute] = await db
        .insert(productAttributes)
        .values(productAttribute)
        .returning();

      return newAttribute;
    } catch (error) {
      logger.error("Error creating product attribute", {
        error,
        productAttribute,
      });
      throw error;
    }
  }

  /**
   * Update a product attribute
   * @param id ID of the product attribute to update
   * @param productAttributeData The updated product attribute data
   * @returns The updated product attribute
   */
  async updateProductAttribute(
    id: number,
    productAttributeData: Partial<InsertProductAttribute>,
  ): Promise<ProductAttribute | undefined> {
    try {
      const [updatedAttribute] = await db
        .update(productAttributes)
        .set(productAttributeData)
        .where(eq(productAttributes.id, id))
        .returning();

      return updatedAttribute;
    } catch (error) {
      logger.error("Error updating product attribute", { error, id });
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
      await db.delete(productAttributes).where(eq(productAttributes.id, id));

      return true;
    } catch (error) {
      logger.error("Error deleting product attribute", { error, id });
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
  async getProductAttributeValues(
    productId: number,
  ): Promise<ProductAttributeValue[]> {
    try {
      // Get values from the centralized attribute system
      const centralizedAttrs = await db
        .select()
        .from(productAttributes)
        .where(eq(productAttributes.productId, productId));

      // Convert from centralized format to legacy format for backward compatibility
      return centralizedAttrs.map((attr) => ({
        id: attr.id,
        productId: attr.productId,
        attributeId: attr.attributeId,
        attributeOptionId:
          Array.isArray(attr.selectedOptions) &&
          attr.selectedOptions.length > 0
            ? attr.selectedOptions[0]
            : null,
        valueText: attr.textValue || null,
        createdAt: attr.createdAt,
        updatedAt: attr.updatedAt,
      }));
    } catch (error) {
      logger.error("Error getting product attribute values", {
        error,
        productId,
      });
      throw error;
    }
  }

  /**
   * Get a specific attribute value by ID
   * @param id ID of the attribute value
   * @returns The attribute value
   */
  async getProductAttributeValueById(
    id: number,
  ): Promise<ProductAttributeValue | undefined> {
    try {
      const [value] = await db
        .select()
        .from(productAttributeValues)
        .where(eq(productAttributeValues.id, id));

      return value;
    } catch (error) {
      logger.error("Error getting product attribute value by ID", {
        error,
        id,
      });
      throw error;
    }
  }

  /**
   * Create a new product attribute value
   * @param value The attribute value to create
   * @returns The created attribute value
   */
  async createProductAttributeValue(
    value: InsertProductAttributeValue,
  ): Promise<ProductAttributeValue> {
    try {
      const [newValue] = await db
        .insert(productAttributeValues)
        .values(value)
        .returning();

      return newValue;
    } catch (error) {
      logger.error("Error creating product attribute value", { error, value });
      throw error;
    }
  }

  /**
   * Update a product attribute value
   * @param id ID of the attribute value to update
   * @param data The updated attribute value data
   * @returns The updated attribute value
   */
  async updateProductAttributeValue(
    id: number,
    data: Partial<InsertProductAttributeValue>,
  ): Promise<ProductAttributeValue | undefined> {
    try {
      const [updatedValue] = await db
        .update(productAttributeValues)
        .set(data)
        .where(eq(productAttributeValues.id, id))
        .returning();

      return updatedValue;
    } catch (error) {
      logger.error("Error updating product attribute value", { error, id });
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
      logger.error("Error deleting product attribute value", { error, id });
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
      logger.info("Attempting to count users");
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(users);
      const count = result[0]?.count;
      logger.info("User count retrieved successfully", { count });

      // Handle both number and string cases
      if (typeof count === "number") {
        return count;
      } else if (typeof count === "string") {
        // Parse string to number
        const parsedCount = parseInt(count, 10);
        if (!isNaN(parsedCount)) {
          logger.info("Successfully parsed string count to number", {
            original: count,
            parsed: parsedCount,
          });
          return parsedCount;
        }
      }

      // Log if we couldn't handle the count properly
      logger.error("User count could not be parsed to a number", {
        count,
        type: typeof count,
        resultObject: JSON.stringify(result),
      });
      return 0;
    } catch (error) {
      logger.error("Error counting users", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
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
    const { hashPassword } = await import("./auth");
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
        orderBy: [asc(users.id)],
      });
      return result || [];
    } catch (error) {
      logger.error("Error fetching all users", { error });
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
        where: and(not(isNull(products.slug)), products.isActive.equals(true)),
      });
      return result;
    } catch (error) {
      logger.error("Error fetching product with slug", { error });
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
      const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
      
      // Fetch order items for each order
      const ordersWithItems = await Promise.all(
        allOrders.map(async (order) => {
          try {
            const orderItemsData = await db
              .select()
              .from(orderItems)
              .where(eq(orderItems.orderId, order.id));

            return {
              ...order,
              orderItems: orderItemsData || [],
            };
          } catch (itemError) {
            logger.error(`Error fetching items for order ${order.id}`, { error: itemError });
            return {
              ...order,
              orderItems: [],
            };
          }
        })
      );

      logger.info(`Retrieved ${ordersWithItems.length} orders with items`);
      return ordersWithItems as Order[];
    } catch (error) {
      logger.error("Error fetching all orders", { error });
      return [];
    }
  }



  // ===============================================================
  // USER ADMIN MANAGEMENT METHODS
  // ===============================================================

  /**
   * Get users with pagination, search, and filtering capabilities
   */
  async getUsersWithPagination(
    limit: number = 20,
    offset: number = 0,
    search?: string,
    roleFilter?: string,
    statusFilter?: string,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{ users: User[], total: number }> {
    try {
      let whereConditions: any[] = [];

      // Search filter across all user fields
      if (search && search.trim()) {
        const searchTerm = `%${search.toLowerCase()}%`;
        whereConditions.push(
          or(
            ilike(users.username, searchTerm),
            ilike(users.email, searchTerm),
            ilike(users.fullName, searchTerm),
            ilike(users.phoneNumber, searchTerm),
            ilike(users.address, searchTerm),
            ilike(users.city, searchTerm),
            ilike(users.province, searchTerm),
            ilike(users.country, searchTerm),
            ilike(users.role, searchTerm)
          )
        );
      }

      // Role filter
      if (roleFilter && roleFilter !== 'all') {
        whereConditions.push(eq(users.role, roleFilter));
      }

      // Status filter
      if (statusFilter && statusFilter !== 'all') {
        whereConditions.push(eq(users.isActive, statusFilter === 'active'));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      // Determine sort column
      const sortColumn = sortBy === 'username' ? users.username : 
                        sortBy === 'email' ? users.email :
                        sortBy === 'role' ? users.role :
                        sortBy === 'isActive' ? users.isActive :
                        sortBy === 'lastLogin' ? users.lastLogin :
                        users.createdAt;

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(whereClause);
      
      const total = Number(countResult[0]?.count) || 0;

      // Get users with pagination
      const userResults = await db
        .select()
        .from(users)
        .where(whereClause)
        .orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn))
        .limit(limit)
        .offset(offset);

      return { users: userResults, total };
    } catch (error) {
      logger.error('Error getting users with pagination', { error });
      throw error;
    }
  }

  /**
   * Update user role
   */
  async updateUserRole(id: number, role: string): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({ 
          role,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, id))
        .returning();

      logger.info('User role updated', { userId: id, newRole: role });
      return updatedUser;
    } catch (error) {
      logger.error('Error updating user role', { error, userId: id, role });
      throw error;
    }
  }

  /**
   * Update user status (active/inactive)
   */
  async updateUserStatus(id: number, isActive: boolean): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({ 
          isActive,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, id))
        .returning();

      logger.info('User status updated', { userId: id, isActive });
      return updatedUser;
    } catch (error) {
      logger.error('Error updating user status', { error, userId: id, isActive });
      throw error;
    }
  }

  /**
   * Delete user (soft delete by setting inactive)
   */
  async deleteUser(id: number): Promise<boolean> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({ 
          isActive: false,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, id))
        .returning();

      logger.info('User soft deleted', { userId: id });
      return !!updatedUser;
    } catch (error) {
      logger.error('Error deleting user', { error, userId: id });
      throw error;
    }
  }

  /**
   * Reset user password
   */
  async resetUserPassword(id: number, newPassword: string): Promise<boolean> {
    try {
      const hashedPassword = await this.hashPassword(newPassword);
      
      const [updatedUser] = await db
        .update(users)
        .set({ 
          password: hashedPassword,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, id))
        .returning();

      logger.info('User password reset', { userId: id });
      return !!updatedUser;
    } catch (error) {
      logger.error('Error resetting user password', { error, userId: id });
      throw error;
    }
  }

  /**
   * Get user statistics for admin dashboard
   */
  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    adminUsers: number;
    regularUsers: number;
    recentRegistrations: number;
  }> {
    try {
      // Get basic counts
      const [totalResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users);
      
      const [activeResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.isActive, true));
      
      const [inactiveResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.isActive, false));
      
      const [adminResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.role, 'admin'));
      
      const [regularResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.role, 'user'));

      // Get recent registrations (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const [recentResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(gte(users.createdAt, thirtyDaysAgo.toISOString()));

      return {
        totalUsers: Number(totalResult?.count) || 0,
        activeUsers: Number(activeResult?.count) || 0,
        inactiveUsers: Number(inactiveResult?.count) || 0,
        adminUsers: Number(adminResult?.count) || 0,
        regularUsers: Number(regularResult?.count) || 0,
        recentRegistrations: Number(recentResult?.count) || 0
      };
    } catch (error) {
      logger.error('Error getting user statistics', { error });
      throw error;
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
      const { default: session } = await import("express-session");
      const { default: pgSimple } = await import("connect-pg-simple");

      const PostgresSessionStore = pgSimple(session);

      this.sessionStore = new PostgresSessionStore({
        pool,
        tableName: "session",
        createTableIfMissing: true,
        pruneSessionInterval: 60, // Check for expired sessions every minute
      });

      logger.info("PostgreSQL session store initialized successfully");
    } catch (error) {
      // Fallback to memory store if PostgreSQL session store fails
      logger.error(
        "Failed to initialize PostgreSQL session store, using memory store instead",
        { error },
      );
      const { default: memorystore } = await import("memorystore");
      const { default: session } = await import("express-session");

      const MemoryStore = memorystore(session);
      this.sessionStore = new MemoryStore({
        checkPeriod: 86400000, // Prune expired entries every 24h
      });
    }
  }

  // Product Draft Methods for Database-Centric Approach
  async createProductDraft(draft: InsertProductDraft): Promise<ProductDraft> {
    try {
      // Set lastModified to current timestamp
      const draftWithTimestamp = {
        ...draft,
        lastModified: new Date(),
      };

      // Debug log the data we're about to insert
      logger.debug("Creating product draft with data", {
        draftData: {
          originalProductId: draftWithTimestamp.originalProductId,
          name: draftWithTimestamp.name,
          slug: draftWithTimestamp.slug,
          description: draftWithTimestamp.description,
          categoryId: draftWithTimestamp.categoryId,
          regularPrice: draftWithTimestamp.regularPrice,
          salePrice: draftWithTimestamp.salePrice,
        },
      });

      const [newDraft] = await db
        .insert(productDrafts)
        .values(draftWithTimestamp)
        .returning();

      return newDraft;
    } catch (error) {
      logger.error("Error creating product draft", { error });
      throw error;
    }
  }

  async getProductDraft(id: number, userRole?: string, userId?: number): Promise<ProductDraft | undefined> {
    try {
      // Admin users can access any draft, non-admin users only their own drafts
      let whereCondition = eq(productDrafts.id, id);
      
      if (userRole !== 'admin' && userId) {
        whereCondition = and(eq(productDrafts.id, id), eq(productDrafts.createdBy, userId));
      }

      // Force fresh query by explicitly selecting specific fields including rating and reviewCount
      const [draft] = await db
        .select({
          id: productDrafts.id,
          originalProductId: productDrafts.originalProductId,
          draftStatus: productDrafts.draftStatus,
          createdBy: productDrafts.createdBy,
          createdAt: productDrafts.createdAt,
          lastModified: productDrafts.lastModified,
          name: productDrafts.name,
          slug: productDrafts.slug,
          sku: productDrafts.sku,
          description: productDrafts.description,
          brand: productDrafts.brand,
          categoryId: productDrafts.categoryId,
          isActive: productDrafts.isActive,
          isFeatured: productDrafts.isFeatured,
          catalogId: productDrafts.catalogId,
          costPrice: productDrafts.costPrice,
          regularPrice: productDrafts.regularPrice,
          salePrice: productDrafts.salePrice,
          onSale: productDrafts.onSale,
          markupPercentage: productDrafts.markupPercentage,
          minimumPrice: productDrafts.minimumPrice,
          imageUrls: productDrafts.imageUrls,
          imageObjectKeys: productDrafts.imageObjectKeys,
          mainImageIndex: productDrafts.mainImageIndex,
          stockLevel: productDrafts.stockLevel,
          lowStockThreshold: productDrafts.lowStockThreshold,
          backorderEnabled: productDrafts.backorderEnabled,
          attributes: productDrafts.attributes,
          attributesData: productDrafts.attributesData,
          supplierId: productDrafts.supplierId,
          supplierUrl: productDrafts.supplierUrl,
          weight: productDrafts.weight,
          dimensions: productDrafts.dimensions,
          discountLabel: productDrafts.discountLabel,
          specialSaleText: productDrafts.specialSaleText,
          specialSaleStart: productDrafts.specialSaleStart,
          specialSaleEnd: productDrafts.specialSaleEnd,
          isFlashDeal: productDrafts.isFlashDeal,
          flashDealEnd: productDrafts.flashDealEnd,
          taxable: productDrafts.taxable,
          taxClass: productDrafts.taxClass,
          metaTitle: productDrafts.metaTitle,
          metaDescription: productDrafts.metaDescription,
          metaKeywords: productDrafts.metaKeywords,
          canonicalUrl: productDrafts.canonicalUrl,
          publishedAt: productDrafts.publishedAt,
          publishedVersion: productDrafts.publishedVersion,
          hasAIDescription: productDrafts.hasAIDescription,
          hasAISeo: productDrafts.hasAISeo,
          freeShipping: productDrafts.freeShipping,
          shippingClass: productDrafts.shippingClass,
          lastReviewer: productDrafts.lastReviewer,
          rejectionReason: productDrafts.rejectionReason,
          wizardProgress: productDrafts.wizardProgress,
          completedSteps: productDrafts.completedSteps,
          version: productDrafts.version,
          changeHistory: productDrafts.changeHistory,
          selectedAttributes: productDrafts.selectedAttributes,
          aiSuggestions: productDrafts.aiSuggestions,
          discountData: productDrafts.discountData,
          // Explicitly include rating and reviewCount
          rating: productDrafts.rating,
          reviewCount: productDrafts.reviewCount,
        })
        .from(productDrafts)
        .where(whereCondition);

      return draft;
    } catch (error) {
      logger.error("Error getting product draft", { error, id, userRole, userId });
      throw error;
    }
  }

  async getProductDraftByOriginalId(
    originalProductId: number,
  ): Promise<ProductDraft | undefined> {
    try {
      const [draft] = await db
        .select()
        .from(productDrafts)
        .where(eq(productDrafts.originalProductId, originalProductId))
        .orderBy(desc(productDrafts.lastModified));

      return draft;
    } catch (error) {
      logger.error("Error getting product draft by original ID", {
        error,
        originalProductId,
      });
      throw error;
    }
  }
  
  /**
   * Create a product draft from an existing product
   * @param productId The ID of the existing product to create a draft from
   * @param userId User ID of the creator
   * @returns The created draft based on the existing product
   */
  async createDraftFromProduct(
    productId: number,
    userId: number
  ): Promise<ProductDraft> {
    try {
      // Check if there's already an active draft (not published) for this product
      const existingDraft = await db
        .select()
        .from(productDrafts)
        .where(
          and(
            eq(productDrafts.originalProductId, productId),
            eq(productDrafts.draftStatus, 'draft')
          )
        )
        .limit(1);
      
      if (existingDraft.length > 0) {
        logger.info("Found existing draft for product - returning existing draft", {
          productId,
          draftId: existingDraft[0].id,
          draftStatus: existingDraft[0].draftStatus
        });
        return existingDraft[0];
      }
      
      logger.info("No existing draft found, creating new draft for editing", {
        productId,
        action: 'create_new_draft'
      });

      // Get the product details
      const product = await this.getProductById(productId);
      if (!product) {
        throw new Error(`Product with ID ${productId} not found`);
      }
      
      // Get product images
      const productImages = await this.getProductImages(productId);
      logger.debug("Retrieved product images", {
        productId,
        imageCount: productImages.length,
        hasMainImage: productImages.some(img => img.isMain === true)
      });
      
      // Get product attributes
      const productAttributes = await this.getProductAttributes(productId);
      
      // Convert Date to ISO string for database storage - product_drafts uses text for date storage
      const now = new Date().toISOString();
      
      // Organize images properly
      const imageUrls: string[] = [];
      const imageObjectKeys: string[] = [];
      let mainImageIndex = 0;
      
      // Process images - handle the main image first
      const mainImage = productImages.find(img => img.isMain === true);
      if (mainImage) {
        imageUrls.push(mainImage.url || '');
        imageObjectKeys.push(mainImage.objectKey || '');
        mainImageIndex = 0; // Main image is at index 0
      }
      
      // Add the rest of the images
      productImages.forEach(img => {
        // Skip the main image as we've already added it
        if (img.isMain !== true) {
          imageUrls.push(img.url || '');
          imageObjectKeys.push(img.objectKey || '');
        }
      });
      
      // Map attributes to the correct format for the draft
      const mappedAttributes = productAttributes.map(attr => ({
        attributeId: attr.attributeId,
        valueText: attr.textValue || '',
        selectedOptions: attr.selectedOptions || []
      }));
      
      // Create comprehensive draft data with ALL product fields properly mapped
      
      // Process tags array safely
      const tagsArray = product.tags ? 
        (Array.isArray(product.tags) ? 
          product.tags : 
          (typeof product.tags === 'string' ? 
            JSON.parse(product.tags) : [])) 
        : [];
      
      // Process additional images array safely
      const additionalImagesArray = product.additionalImages ? 
        (Array.isArray(product.additionalImages) ? 
          product.additionalImages : 
          (typeof product.additionalImages === 'string' ? 
            JSON.parse(product.additionalImages) : [])) 
        : [];
      
      // Process required attribute IDs safely
      const requiredAttributeIds = product.requiredAttributeIds ? 
        (Array.isArray(product.requiredAttributeIds) ? 
          product.requiredAttributeIds : 
          (typeof product.requiredAttributeIds === 'string' ? 
            JSON.parse(product.requiredAttributeIds) : [])) 
        : [];
      
      // Comprehensive image processing from all sources
      const allImageUrls: string[] = [];
      const allObjectKeys: string[] = [];
      
      // 1. Add images from product_images table first (most reliable source)
      if (productImages && productImages.length > 0) {
        productImages.forEach(img => {
          if (img.url) {
            allImageUrls.push(img.url);
            allObjectKeys.push(img.objectKey || '');
          }
        });
      }
      
      // 2. If no images from product_images, check main image URL
      if (allImageUrls.length === 0 && product.imageUrl) {
        allImageUrls.push(product.imageUrl);
        allObjectKeys.push(product.originalImageObjectKey || '');
      }
      
      // 3. Add additional images if any
      if (additionalImagesArray.length > 0) {
        additionalImagesArray.forEach((url: string) => {
          if (url && !allImageUrls.includes(url)) {
            allImageUrls.push(url);
            allObjectKeys.push(''); // Additional images typically don't have object keys
          }
        });
      }
      
      // Ensure arrays are same length
      while (allObjectKeys.length < allImageUrls.length) {
        allObjectKeys.push('');
      }
      
      // Main image index already determined above
      
      // Log some key info for debugging
      logger.debug("Creating draft with data", { 
        productId, 
        supplierValue: product.supplier,
        userId,
        imageCount: allImageUrls.length,
        attributeCount: mappedAttributes.length
      });
      
      const draftData = {
        // Link to original product - use correct snake_case field names
        original_product_id: productId,
        
        // Basic info - copy ALL product fields comprehensively
        name: product.name || '',
        slug: product.slug || this.generateSlug(product.name || 'product'),
        sku: product.sku || '',
        description: product.description || '',
        brand: product.brand || '',
        
        // Product relationships
        category_id: product.categoryId,
        supplier_id: product.supplierId || (typeof product.supplier === 'string' && product.supplier !== '' ? parseInt(product.supplier) : null),
        catalog_id: product.catalogId,
        
        // Status flags - preserve ALL status fields
        is_active: product.isActive === true,
        is_featured: product.isFeatured === true,
        is_flash_deal: product.isFlashDeal === true,
        
        // Comprehensive pricing information - copy ALL pricing fields
        cost_price: product.costPrice || 0,
        regular_price: product.price || 0,
        sale_price: product.salePrice,
        on_sale: product.salePrice !== null && product.salePrice !== undefined && product.salePrice > 0,
        markup_percentage: product.markup || product.discount || 0, // Handle both markup and discount fields
        minimum_price: product.minimumPrice,
        
        // Inventory settings - copy ALL inventory fields
        stock_level: product.stock || 0,
        low_stock_threshold: product.lowStockThreshold || 5,
        backorder_enabled: product.backorderEnabled === true,
        
        // Note: Performance metrics (rating, review_count, sold_count, display_order) 
        // are not stored in product_drafts table - they stay with the published product
        
        // Discounts and promotions - copy ALL promotion fields
        discount_label: product.discountLabel || '',
        special_sale_text: product.specialSaleText || '',
        special_sale_start: product.specialSaleStart ? 
          (product.specialSaleStart instanceof Date ? 
            product.specialSaleStart.toISOString() : 
            product.specialSaleStart.toString()) 
          : null,
        special_sale_end: product.specialSaleEnd ? 
          (product.specialSaleEnd instanceof Date ? 
            product.specialSaleEnd.toISOString() : 
            product.specialSaleEnd.toString()) 
          : null,
        flash_deal_end: product.flashDealEnd ? 
          (product.flashDealEnd instanceof Date ? 
            product.flashDealEnd.toISOString() : 
            product.flashDealEnd.toString()) 
          : null,
        
        // Images - comprehensive image data
        image_urls: allImageUrls,
        image_object_keys: allObjectKeys,
        main_image_index: mainImageIndex,
        
        // Attributes - comprehensive attribute data
        attributes: mappedAttributes || [],
        attributes_data: mappedAttributes || [],
        
        // Shipping and product details - copy ALL physical properties
        weight: product.weight ? product.weight.toString() : '',
        dimensions: product.dimensions || '',
        free_shipping: product.freeShipping === true,
        shipping_class: product.shippingClass || 'standard',
        
        // Note: minimum_order is not in product_drafts table - stays with published product
        
        // SEO metadata - copy ALL SEO fields
        meta_title: product.metaTitle || product.name || '',
        meta_description: product.metaDescription || 
          (product.description ? product.description.substring(0, 160) : ''),
        meta_keywords: product.metaKeywords || (tagsArray.length > 0 ? tagsArray.join(', ') : ''),
        canonical_url: product.canonicalUrl || '',
        
        // Tax information - copy ALL tax fields
        taxable: product.taxable !== false,
        tax_class: product.taxClass || 'standard',
        
        // Additional pricing fields
        compare_at_price: product.compareAtPrice || null,
        tax_rate_percentage: product.taxRatePercentage || null,
        
        // Product quality and processing flags
        has_background_removed: product.hasBackgroundRemoved === true,
        
        // Draft specific fields
        draft_status: 'draft',
        created_by: userId,
        created_at: now,
        last_modified: now,
        
        // Publication fields
        published_at: null,
        published_version: null,
        
        // Product wizard progress
        wizard_progress: {
          'basic-info': true,
          'images': allImageUrls.length > 0,
          'additional-info': true,
          'sales-promotions': true, 
          'review': false
        },
        
        // Status tracking
        completed_steps: ['basic-info', 'images', 'additional-info', 'sales-promotions'],
        version: 1,
        
        // AI features status
        has_ai_description: false,
        has_ai_seo: false,
        
        // Customer selection attributes - preserve required attributes for customer selection
        selected_attributes: requiredAttributeIds || [],
        
        // Change history
        change_history: [{
          timestamp: now,
          fromStatus: null,
          toStatus: 'draft',
          note: 'Created from existing product',
          userId: userId
        }],
        
        // AI suggestions
        ai_suggestions: {},
        
        // Discount data
        discount_data: {}
      };

      logger.debug("Attempting to insert draft with data", { 
        draftStatus: draftData.draft_status,
        fields: Object.keys(draftData).length
      });
      
      // Insert the draft into the database
      const [draft] = await db
        .insert(productDrafts)
        .values(draftData)
        .returning();
      
      logger.info("Created draft from existing product", {
        productId,
        draftId: draft.id,
        name: draft.name
      });
      
      return draft;
    } catch (error) {
      logger.error("Error creating draft from product", { error, productId });
      throw error;
    }
  }

  async getUserProductDrafts(
    userId: number, 
    options?: {
      search?: string;
      limit?: number;
      offset?: number;
      parentCategoryId?: number;
      childCategoryId?: number;
      minTmyPercent?: number;
      statusFilter?: string;
      sortField?: string;
      sortOrder?: 'asc' | 'desc';
    },
    userRole?: string
  ): Promise<{ drafts: ProductDraft[], total: number }> {
    try {
      // Build base conditions - admin users can see all drafts
      let conditions = [];
      if (userRole !== 'admin') {
        conditions.push(eq(productDrafts.createdBy, userId));
      }
      
      // Exclude published drafts from the drafts section - they should only appear in Published Products
      conditions.push(ne(productDrafts.draftStatus, 'published'));

      // Add search functionality across multiple columns if search query is provided
      if (options?.search && options.search.trim()) {
        const searchTerm = `%${options.search.toLowerCase()}%`;
        conditions.push(
          or(
            ilike(productDrafts.name, searchTerm),
            ilike(productDrafts.slug, searchTerm),
            ilike(productDrafts.sku, searchTerm),
            ilike(productDrafts.description, searchTerm),
            ilike(productDrafts.brand, searchTerm),
            ilike(productDrafts.metaTitle, searchTerm),
            ilike(productDrafts.metaDescription, searchTerm),
            ilike(productDrafts.metaKeywords, searchTerm),
            ilike(productDrafts.supplierUrl, searchTerm),
            ilike(productDrafts.discountLabel, searchTerm),
            ilike(productDrafts.specialSaleText, searchTerm),
            ilike(productDrafts.rejectionReason, searchTerm)
          )
        );
      }

      // Add category filters
      if (options?.parentCategoryId) {
        // Get the category with its children to support parent category filtering
        const categoryWithChildren = await this.getCategoryWithChildren(
          options.parentCategoryId,
          { includeInactive: true }
        );
        
        if (categoryWithChildren) {
          // Collect all category IDs to filter by (parent + children)
          const categoryIds = [options.parentCategoryId];
          if (categoryWithChildren.children.length > 0) {
            categoryIds.push(...categoryWithChildren.children.map(child => child.id));
          }
          
          // Filter products by any of these category IDs
          conditions.push(inArray(productDrafts.categoryId, categoryIds));
        }
      } else if (options?.childCategoryId) {
        conditions.push(eq(productDrafts.categoryId, options.childCategoryId));
      }

      // Add TMY percentage filter if provided (show products with margin ≤ threshold)
      if (options?.minTmyPercent !== undefined && options.minTmyPercent > 0) {
        const tmyCondition = sql`
          CASE 
            WHEN COALESCE(cost_price, 0) > 0 THEN
              ((COALESCE(sale_price, regular_price, 0) - COALESCE(cost_price, 0)) / COALESCE(cost_price, 1) * 100) <= ${options.minTmyPercent}
            ELSE FALSE
          END
        `;
        conditions.push(tmyCondition);
      }

      // Add status filter if provided (Draft status filtering)
      if (options?.statusFilter && options.statusFilter !== 'all') {
        conditions.push(eq(productDrafts.draftStatus, options.statusFilter));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count for pagination
      const countQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(productDrafts);
      
      if (whereClause) {
        countQuery.where(whereClause);
      }

      const [countResult] = await countQuery;
      const total = countResult?.count || 0;

      // Get paginated results with dynamic sorting
      let query = db
        .select()
        .from(productDrafts);

      // Apply sorting based on sortField and sortOrder
      const sortField = options?.sortField || 'lastModified';
      const sortOrder = options?.sortOrder || 'desc';
      
      // Map frontend field names to database columns
      const sortFieldMap: Record<string, any> = {
        'name': sql`name`,
        'sku': sql`sku`,
        'lastModified': sql`last_modified`,
        'createdAt': sql`created_at`,
        'draftStatus': sql`draft_status`,
        'regularPrice': sql`regular_price`,
        'salePrice': sql`sale_price`,
        'costPrice': sql`cost_price`,
        'categoryId': sql`category_id`,
        'parentCategory': sql`category_id`,
        'childCategory': sql`category_id`,
        'tmyPercentage': sql`CASE WHEN COALESCE(cost_price, 0) > 0 THEN ((COALESCE(sale_price, regular_price, 0) - COALESCE(cost_price, 0)) / COALESCE(cost_price, 1) * 100) ELSE 0 END`,
        'isActive': sql`is_active`
      };

      const sortColumn = sortFieldMap[sortField] || sql`last_modified`;
      
      if (sortOrder === 'asc') {
        query = query.orderBy(asc(sortColumn));
      } else {
        query = query.orderBy(desc(sortColumn));
      }

      if (whereClause) {
        query = query.where(whereClause);
      }

      if (options?.limit !== undefined) {
        query = query.limit(options.limit);
      }

      if (options?.offset !== undefined) {
        query = query.offset(options.offset);
      }

      const drafts = await query;

      return { drafts, total };
    } catch (error) {
      logger.error("Error getting user product drafts", { error, userId, options, userRole });
      throw error;
    }
  }

  /**
   * Get all product drafts in the system
   * Used for administrative purposes and cleanup operations
   */
  async getAllDrafts(): Promise<ProductDraft[]> {
    try {
      const drafts = await db.select().from(productDrafts);

      return drafts;
    } catch (error) {
      logger.error("Error getting all product drafts", { error });
      throw error;
    }
  }

  async updateProductDraft(
    id: number,
    data: Partial<InsertProductDraft>,
    userRole?: string,
    userId?: number
  ): Promise<ProductDraft | undefined> {
    try {
      // Admin users can update any draft, non-admin users need ownership check
      if (userRole !== 'admin' && userId) {
        // Verify ownership for non-admin users
        const existingDraft = await this.getProductDraft(id, userRole, userId);
        if (!existingDraft) {
          throw new Error("Draft not found or access denied");
        }
      }

      // Always update the lastModified timestamp
      const updateData = {
        ...data,
        lastModified: new Date(),
      };

      const [updatedDraft] = await db
        .update(productDrafts)
        .set(updateData)
        .where(eq(productDrafts.id, id))
        .returning();

      return updatedDraft;
    } catch (error) {
      logger.error("Error updating product draft", { error, id, userRole, userId });
      throw error;
    }
  }

  async updateProductDraftWizardStep(
    id: number,
    step: string | number,
    draftData: any,
  ): Promise<ProductDraft | undefined> {
    try {
      // First get the current draft
      const existingDraft = await this.getProductDraft(id);
      if (!existingDraft) {
        return undefined;
      }

      // Update the appropriate fields based on the step
      let updateData: Partial<InsertProductDraft> = {
        lastModified: new Date(),
      };

      // Update wizard progress to mark this step as completed
      const wizardProgress = existingDraft.wizardProgress
        ? { ...existingDraft.wizardProgress }
        : {};
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
        fields: Object.keys(draftData),
        notes: `Updated ${step} step`,
      };
      updateData.changeHistory = [...changeHistory, changeRecord];

      // Increment version
      updateData.version = (existingDraft.version || 1) + 1;

      // Update specific fields based on the step
      switch (step) {
        case "basic-info":
        case 0: // Handle numeric equivalent
          updateData = {
            ...updateData,
            name: draftData.name,
            slug: draftData.slug,
            sku: draftData.sku,
            description: draftData.description,
            brand: draftData.brand,
            categoryId: draftData.categoryId,
            isActive:
              draftData.isActive !== undefined
                ? draftData.isActive
                : existingDraft.isActive,
            isFeatured:
              draftData.isFeatured !== undefined
                ? draftData.isFeatured
                : existingDraft.isFeatured,
            taxable:
              draftData.taxable !== undefined
                ? draftData.taxable
                : existingDraft.taxable,
            taxClass: draftData.taxClass || existingDraft.taxClass,
            supplierId: draftData.supplierId,
            catalogId: draftData.catalogId,
            // Add pricing fields to basic-info step as well
            regularPrice:
              draftData.regularPrice !== undefined
                ? draftData.regularPrice
                : existingDraft.regularPrice,
            salePrice:
              draftData.salePrice !== undefined
                ? draftData.salePrice
                : existingDraft.salePrice,
            costPrice:
              draftData.costPrice !== undefined
                ? draftData.costPrice
                : existingDraft.costPrice,
            onSale:
              draftData.onSale !== undefined
                ? draftData.onSale
                : existingDraft.onSale,
            stockLevel:
              draftData.stockLevel !== undefined
                ? draftData.stockLevel
                : existingDraft.stockLevel,
          };
          break;

        case "images":
        case 1: // Handle numeric equivalent
          // Most image updates are handled by updateProductDraftImages
          // But ensure we properly handle any mainImageIndex that might be sent with this step
          updateData = {
            ...updateData,
            mainImageIndex:
              draftData.mainImageIndex !== undefined
                ? draftData.mainImageIndex
                : existingDraft.mainImageIndex,
            imageUrls: draftData.imageUrls || existingDraft.imageUrls,
            imageObjectKeys:
              draftData.imageObjectKeys || existingDraft.imageObjectKeys,
            supplierUrl:
              draftData.supplierUrl !== undefined
                ? draftData.supplierUrl
                : existingDraft.supplierUrl,
          };
          break;

        case "additional-info":
        case 2: // Handle numeric equivalent
          updateData = {
            ...updateData,
            weight:
              draftData.weight !== undefined
                ? draftData.weight
                : existingDraft.weight,
            dimensions:
              draftData.dimensions !== undefined
                ? draftData.dimensions
                : existingDraft.dimensions,
            attributes:
              draftData.attributes !== undefined
                ? draftData.attributes
                : existingDraft.attributes,
            stockLevel:
              draftData.stockLevel !== undefined
                ? draftData.stockLevel
                : existingDraft.stockLevel,
            lowStockThreshold:
              draftData.lowStockThreshold !== undefined
                ? draftData.lowStockThreshold
                : existingDraft.lowStockThreshold,
            backorderEnabled:
              draftData.backorderEnabled !== undefined
                ? draftData.backorderEnabled
                : existingDraft.backorderEnabled,
            freeShipping:
              draftData.freeShipping !== undefined
                ? draftData.freeShipping
                : existingDraft.freeShipping,
            shippingClass:
              draftData.shippingClass || existingDraft.shippingClass,
            // Add any other additional info fields that might be on the form
            sku:
              draftData.sku !== undefined ? draftData.sku : existingDraft.sku,
            brand:
              draftData.brand !== undefined
                ? draftData.brand
                : existingDraft.brand,
          };
          break;

        case "attributes":
        case 3: // Handle numeric equivalent
          // For the new attributes step, specifically handling attributesData
          updateData = {
            ...updateData,
            attributes:
              draftData.attributes !== undefined
                ? draftData.attributes
                : existingDraft.attributes,
            attributesData:
              draftData.attributesData !== undefined
                ? draftData.attributesData
                : existingDraft.attributesData,
            // Add any custom attribute toggles or flags
            hasCustomAttributes:
              draftData.hasCustomAttributes !== undefined
                ? draftData.hasCustomAttributes
                : existingDraft.hasCustomAttributes,
          };
          break;

        case "seo":
        case 4: // Handle numeric equivalent
          updateData = {
            ...updateData,
            metaTitle:
              draftData.metaTitle !== undefined
                ? draftData.metaTitle
                : existingDraft.metaTitle,
            metaDescription:
              draftData.metaDescription !== undefined
                ? draftData.metaDescription
                : existingDraft.metaDescription,
            metaKeywords:
              draftData.metaKeywords !== undefined
                ? draftData.metaKeywords
                : existingDraft.metaKeywords,
            canonicalUrl:
              draftData.canonicalUrl !== undefined
                ? draftData.canonicalUrl
                : existingDraft.canonicalUrl,
            hasAISeo:
              draftData.hasAISeo !== undefined
                ? draftData.hasAISeo
                : existingDraft.hasAISeo,
            seoTags:
              draftData.seoTags !== undefined
                ? draftData.seoTags
                : existingDraft.seoTags,
          };
          break;

        case "sales-promotions":
        case 5: // Handle numeric equivalent
          // For sales promotions step, ensure date fields are stored as strings
          // Also ensure explicitly that the fields shown in red boxes in the UI are processed properly

          // Log incoming data for debugging - log ALL draftData to see what's actually received
          logger.debug(`Incoming sales promotions data:`, {
            draftId: id,
            fullDraftData: draftData,
            hasRating: 'rating' in draftData,
            hasReviewCount: 'review_count' in draftData,
            ratingValue: draftData.rating,
            reviewCountValue: draftData.review_count,
            allKeys: Object.keys(draftData)
          });

          updateData = {
            ...updateData,
            costPrice:
              draftData.costPrice !== undefined
                ? draftData.costPrice
                : existingDraft.costPrice,
            regularPrice:
              draftData.regularPrice !== undefined
                ? draftData.regularPrice
                : existingDraft.regularPrice,
            salePrice:
              draftData.salePrice !== undefined
                ? draftData.salePrice
                : existingDraft.salePrice,
            onSale:
              draftData.onSale !== undefined
                ? draftData.onSale
                : existingDraft.onSale,
            markupPercentage:
              draftData.markupPercentage !== undefined
                ? draftData.markupPercentage
                : existingDraft.markupPercentage,
            minimumPrice:
              draftData.minimumPrice !== undefined
                ? draftData.minimumPrice
                : existingDraft.minimumPrice,

            // Explicitly handle the fields shown in red boxes in the UI
            // If onSale is false, discountLabel should be null
            discountLabel:
              draftData.onSale === false
                ? null
                : draftData.discountLabel !== undefined
                  ? draftData.discountLabel
                  : existingDraft.discountLabel,

            // Special sale text should always be stored as provided
            specialSaleText:
              draftData.specialSaleText !== undefined
                ? draftData.specialSaleText
                : existingDraft.specialSaleText,

            // Handle date fields - ensure they're properly formatted for the database
            // The database expects either Date objects or null for timestamp fields
            specialSaleStart:
              draftData.specialSaleStart !== undefined
                ? draftData.specialSaleStart
                  ? typeof draftData.specialSaleStart === "string"
                    ? new Date(draftData.specialSaleStart)
                    : draftData.specialSaleStart
                  : null
                : existingDraft.specialSaleStart,

            specialSaleEnd:
              draftData.specialSaleEnd !== undefined
                ? draftData.specialSaleEnd
                  ? typeof draftData.specialSaleEnd === "string"
                    ? new Date(draftData.specialSaleEnd)
                    : draftData.specialSaleEnd
                  : null
                : existingDraft.specialSaleEnd,

            // Flash deal flag should always be stored as provided
            isFlashDeal:
              draftData.isFlashDeal !== undefined
                ? draftData.isFlashDeal
                : existingDraft.isFlashDeal,

            flashDealEnd:
              draftData.flashDealEnd !== undefined
                ? draftData.flashDealEnd
                  ? typeof draftData.flashDealEnd === "string"
                    ? new Date(draftData.flashDealEnd)
                    : draftData.flashDealEnd
                  : null
                : existingDraft.flashDealEnd,

            // Rating and review count for marketplace appearance
            rating:
              draftData.rating !== undefined
                ? draftData.rating
                : existingDraft.rating,
            reviewCount:
              draftData.review_count !== undefined
                ? draftData.review_count
                : existingDraft.reviewCount,

            // Additional sales flags
            hasSpecialSale:
              draftData.hasSpecialSale !== undefined
                ? draftData.hasSpecialSale
                : existingDraft.hasSpecialSale,
            hasDynamicPricing:
              draftData.hasDynamicPricing !== undefined
                ? draftData.hasDynamicPricing
                : existingDraft.hasDynamicPricing,
          };

          // Add debug logging for the processed data
          logger.debug(`Sales promotions step update processed:`, {
            step,
            draftId: id,
            data: {
              salePrice: updateData.salePrice,
              onSale: updateData.onSale,
              discountLabel: updateData.discountLabel,
              specialSaleText: updateData.specialSaleText,
              specialSaleStart: updateData.specialSaleStart,
              specialSaleEnd: updateData.specialSaleEnd,
              isFlashDeal: updateData.isFlashDeal,
              flashDealEnd: updateData.flashDealEnd,
              rating: updateData.rating,
              reviewCount: updateData.reviewCount,
            },
          });

          break;

        case "review":
        case 6: // Handle numeric equivalent
          // For final review step, update any review-related fields
          updateData = {
            ...updateData,
            draftStatus: draftData.draftStatus || existingDraft.draftStatus,
            // If marked as 'ready', set the time for tracking purposes
            ...(draftData.draftStatus === "ready" && {
              publishedAt: new Date(),
            }),
            // Handle rating and review count for marketplace appearance
            rating:
              draftData.rating !== undefined
                ? draftData.rating
                : existingDraft.rating,
            review_count:
              draftData.review_count !== undefined
                ? draftData.review_count
                : existingDraft.review_count,
            // Handle any additional review-specific fields
            reviewNotes:
              draftData.reviewNotes !== undefined
                ? draftData.reviewNotes
                : existingDraft.reviewNotes,
            reviewApprovedBy:
              draftData.reviewApprovedBy !== undefined
                ? draftData.reviewApprovedBy
                : existingDraft.reviewApprovedBy,
            isApproved:
              draftData.isApproved !== undefined
                ? draftData.isApproved
                : existingDraft.isApproved,
          };
          break;

        default:
          // For other steps or for a partial update
          updateData = {
            ...updateData,
            ...draftData,
          };
      }

      // Fix field mapping for rating and review count before database update
      // Convert frontend field names to schema field names
      if (draftData.review_count !== undefined) {
        updateData.reviewCount = draftData.review_count;
        delete updateData.review_count; // Remove the snake_case version
      }
      
      // Log the final updateData before database update
      logger.debug(`Final updateData being sent to database:`, {
        draftId: id,
        step,
        updateDataKeys: Object.keys(updateData),
        rating: updateData.rating,
        reviewCount: updateData.reviewCount,
        hasRating: 'rating' in updateData,
        hasReviewCount: 'reviewCount' in updateData
      });

      // Update the draft
      return await this.updateProductDraft(id, updateData);
    } catch (error) {
      logger.error("Error updating product draft wizard step", {
        error,
        id,
        step,
      });
      throw error;
    }
  }

  async updateProductDraftImages(
    id: number,
    imageUrls: string[],
    imageObjectKeys: string[],
    mainImageIndex = 0,
  ): Promise<ProductDraft | undefined> {
    try {
      const updateData: Partial<InsertProductDraft> = {
        imageUrls,
        imageObjectKeys,
        mainImageIndex,
        lastModified: new Date(),
      };

      logger.debug("Updating product draft images", {
        id,
        imageCount: imageUrls.length,
        objectKeyCount: imageObjectKeys.length,
        mainImageIndex
      });

      return await this.updateProductDraft(id, updateData);
    } catch (error) {
      logger.error("Error updating product draft images", { error, id });
      throw error;
    }
  }

  async deleteProductDraftImage(
    id: number,
    imageIndex: number,
  ): Promise<ProductDraft | undefined> {
    try {
      // Get the current draft
      const draft = await this.getProductDraft(id);
      if (!draft || !draft.imageUrls || !draft.imageObjectKeys) {
        logger.warn("Cannot delete image: draft not found or has no images", {
          id,
          imageIndex,
        });
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
      logger.debug("Attempting to delete draft image", {
        draftId: id,
        imageIndex,
        objectKey,
        allObjectKeys: imageObjectKeys,
      });

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

      // Build an array of files to delete
      const filesToDelete = [];

      // Add the specific objectKey from the database
      if (objectKey) {
        filesToDelete.push(objectKey);
      }

      // Extract base filename patterns to look for related untracked files
      if (objectKey) {
        try {
          // Extract the base pattern from the objectKey to find similar files
          // Example: from drafts/98/WhatsApp-Image-2025-05-08-at-12.25.32-1-1747300372451-s4u0f8pu4pa.jpeg
          // We want to extract: drafts/98/WhatsApp-Image-2025-05-08-at-12.25.32
          const parts = objectKey.split("-");
          // Extract base pattern by removing the last 2 parts which are usually the timestamp and random id
          if (parts.length > 2) {
            parts.pop(); // Remove random id
            parts.pop(); // Remove timestamp
            const basePattern = parts.join("-");

            // List all files in the draft folder
            logger.debug("Searching for related files with pattern", {
              basePattern,
              draftId: id,
            });
            const draftFolder = `drafts/${id}`;
            const files = await objectStore.listFiles(draftFolder);

            // Find files that match our pattern but aren't in the imageObjectKeys array
            for (const file of files) {
              if (
                file.startsWith(basePattern) &&
                !imageObjectKeys.includes(file) &&
                !filesToDelete.includes(file)
              ) {
                logger.debug("Found related file that may need deletion", {
                  file,
                  draftId: id,
                });
                filesToDelete.push(file);
              }
            }
          }
        } catch (listError) {
          logger.warn("Error listing related files for deletion", {
            error:
              listError instanceof Error
                ? listError.message
                : String(listError),
            draftId: id,
            objectKey,
          });
          // Continue even if we can't find related files
        }
      }

      // Delete all identified files
      for (const fileToDelete of filesToDelete) {
        try {
          logger.debug("Deleting file from object store", {
            draftId: id,
            fileToDelete,
          });
          await objectStore.deleteFile(fileToDelete);

          // Verify the image was actually deleted
          const stillExists = await objectStore.exists(fileToDelete);
          if (stillExists) {
            logger.warn("Image still exists after deletion attempt", {
              draftId: id,
              fileToDelete,
            });
          } else {
            logger.debug("Successfully deleted file from object store", {
              draftId: id,
              fileToDelete,
            });
          }
        } catch (deleteError) {
          logger.error("Error deleting file from object storage", {
            error:
              deleteError instanceof Error
                ? deleteError.message
                : String(deleteError),
            draftId: id,
            fileToDelete,
          });
          // Continue with other files even if one deletion fails
        }
      }

      // Update the draft
      const updatedDraft = await this.updateProductDraftImages(
        id,
        imageUrls,
        imageObjectKeys,
        mainImageIndex,
      );
      logger.debug("Updated draft after image deletion", {
        draftId: id,
        remainingImageCount: imageUrls.length,
        newMainImageIndex: mainImageIndex,
        filesDeleted: filesToDelete.length,
        mainFileDeleted: objectKey,
      });

      return updatedDraft;
    } catch (error) {
      logger.error("Error deleting product draft image", {
        error: error instanceof Error ? error.message : String(error),
        id,
        imageIndex,
      });
      throw error;
    }
  }

  /**
   * Reorder product draft images
   * @param id The draft ID
   * @param imageIndexes Array of current indexes in the new order
   * @returns The updated draft
   */
  async reorderProductDraftImages(
    id: number,
    imageIndexes: number[],
  ): Promise<ProductDraft | undefined> {
    try {
      // Get the current draft
      const draft = await this.getProductDraft(id);
      if (!draft || !draft.imageUrls || !draft.imageObjectKeys) {
        return undefined;
      }

      // Validate input
      if (
        !Array.isArray(imageIndexes) ||
        imageIndexes.length !== draft.imageUrls.length
      ) {
        throw new Error(
          `Invalid image indexes: expected array of length ${draft.imageUrls.length}`,
        );
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
          : 0,
      );

      return updatedDraft;
    } catch (error) {
      logger.error("Error reordering product draft images", {
        error,
        id,
        imageIndexes,
      });
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
      logger.debug("Publishing product draft", {
        draftId: id,
        originalProductId: draft.originalProductId,
        attributesCount: draft.attributes?.length || 0,
      });

      // Check if the slug already exists to avoid unique constraint violation
      let uniqueSlug = draft.slug || "";

      if (uniqueSlug) {
        // Check if this slug exists in products table
        const existingWithSlug = await db
          .select({ count: sql`count(*)` })
          .from(products)
          .where(eq(products.slug, uniqueSlug));

        // If slug exists and this is a new product (not updating an existing one)
        if (existingWithSlug[0]?.count > 0 && !draft.originalProductId) {
          // Use timestamp-based uniqueness for reliable slug generation
          const timestamp = Date.now();
          const testSlug = `${uniqueSlug}-${timestamp}`;
          
          // Verify the timestamp-based slug is unique (should always be)
          const existingWithTestSlug = await db
            .select({ count: sql`count(*)` })
            .from(products)
            .where(eq(products.slug, testSlug));

          if (existingWithTestSlug[0]?.count === 0) {
            uniqueSlug = testSlug;
            logger.debug("Using timestamp-based unique slug", {
              originalSlug: draft.slug,
              uniqueSlug,
            });
          } else {
            // Fallback with random string if timestamp somehow conflicts
            const randomSuffix = Math.random().toString(36).substring(2, 8);
            uniqueSlug = `${uniqueSlug}-${timestamp}-${randomSuffix}`;
            logger.debug("Using timestamp+random unique slug", {
              originalSlug: draft.slug,
              uniqueSlug,
            });
          }
        }
      }

      // Get required attributes information
      const requiredAttributes = (draft.attributeValues || [])
        .filter((attr) => attr.isRequired)
        .map((attr) => attr.attributeId);

      // Lookup supplier name from supplier table
      let supplierName = "Unknown Supplier";
      if (draft.supplierId) {
        const supplierData = await db
          .select()
          .from(suppliers)
          .where(eq(suppliers.id, draft.supplierId))
          .limit(1);

        if (supplierData && supplierData.length > 0) {
          supplierName = supplierData[0].name;
        }
      }

      // Handle discount data correctly based on database schema
      // The products table has an integer 'discount' field, not a JSON field
      // Extract numeric discount value if available, otherwise use 0
      let discountValue = 0;

      // Debug the discount data
      console.log("Publishing draft, discount data:", JSON.stringify({
        discount: draft.discount,
        discountData: draft.discountData
      }));
      
      // Check both discount and discountData fields (since schema shows discountData is the JSON field)
      if (draft.discount) {
        if (typeof draft.discount === 'number') {
          discountValue = draft.discount;
        } else if (typeof draft.discount === 'object' && draft.discount.value) {
          // Try to extract numeric value from discount object
          discountValue = parseInt(String(draft.discount.value), 10) || 0;
        }
      } else if (draft.discountData) {
        // Try to extract from discountData JSON field
        try {
          const discountObj = typeof draft.discountData === 'string' 
            ? JSON.parse(draft.discountData)
            : draft.discountData;
            
          if (discountObj && discountObj.value) {
            discountValue = parseInt(String(discountObj.value), 10) || 0;
          }
        } catch (e) {
          console.error("Error parsing discount data:", e);
        }
      }

      // Create comprehensive product data from draft
      const productData: Partial<InsertProduct> = {
        // Basic product information
        name: draft.name || "",
        slug: uniqueSlug, // Use potentially updated unique slug
        sku: draft.sku,
        description: draft.description,
        categoryId: draft.categoryId,
        supplierId: draft.supplierId,
        catalogId: draft.catalogId,

        // Pricing information - ensure proper numeric conversions from decimal to double
        price: draft.regularPrice ? parseFloat(String(draft.regularPrice)) : 0,
        costPrice: draft.costPrice ? parseFloat(String(draft.costPrice)) : 0,
        salePrice: draft.salePrice ? parseFloat(String(draft.salePrice)) : null,
        onSale: draft.onSale || false,
        discount: discountValue, // Use the processed integer discount value
        discountLabel: draft.discountLabel,
        markupPercentage: draft.markupPercentage ? 
          typeof draft.markupPercentage === 'string' ? 
            parseInt(draft.markupPercentage, 10) : draft.markupPercentage : null,
        minimumPrice: draft.minimumPrice ? parseFloat(String(draft.minimumPrice)) : null,

        // Set the main image URL in the products table "image_url" column
        imageUrl:
          draft.imageUrls && draft.imageUrls.length > 0
            ? draft.imageUrls[draft.mainImageIndex || 0]
            : null,
        // Set additional images in the products table "additional_images" column
        // This is a string[] array of non-main image URLs
        additionalImages:
          draft.imageUrls && draft.imageUrls.length > 1
            ? draft.imageUrls.filter(
                (_, index) => index !== (draft.mainImageIndex || 0),
              )
            : [],

        // Inventory information
        stock: draft.stockLevel || 0,
        lowStockThreshold: draft.lowStockThreshold || 5,
        backorderEnabled: draft.backorderEnabled || false,

        // SEO and metadata
        metaTitle: draft.metaTitle,
        metaDescription: draft.metaDescription,
        metaKeywords: draft.metaKeywords,
        canonicalUrl:
          draft.canonicalUrl ||
          `https://www.teemeyou.shop/product/id/${draft.originalProductId || "new"}`,

        // Product status flags
        isActive: draft.isActive !== undefined ? draft.isActive : true,
        isFeatured: draft.isFeatured || false,

        // Product attributes and specifications
        supplier: supplierName,
        brand: draft.brand,
        weight: draft.weight ? 
          (typeof draft.weight === 'string' ? 
            parseFloat(draft.weight) : 
            typeof draft.weight === 'number' ? 
              draft.weight : null) : null,
        dimensions: draft.dimensions,

        // Required attributes
        requiredAttributeIds: requiredAttributes,

        // Discount value already set above, no need to duplicate

        // Sales promotion data - convert to ISO strings for database storage
        specialSaleText: draft.specialSaleText,
        specialSaleStart: draft.specialSaleStart
          ? (draft.specialSaleStart instanceof Date 
             ? draft.specialSaleStart.toISOString() 
             : typeof draft.specialSaleStart === 'string' 
               ? draft.specialSaleStart
               : String(draft.specialSaleStart))
          : null,
        specialSaleEnd: draft.specialSaleEnd
          ? (draft.specialSaleEnd instanceof Date 
             ? draft.specialSaleEnd.toISOString() 
             : typeof draft.specialSaleEnd === 'string' 
               ? draft.specialSaleEnd
               : String(draft.specialSaleEnd))
          : null,
        isFlashDeal: draft.isFlashDeal || false,
        flashDealEnd: draft.flashDealEnd
          ? (draft.flashDealEnd instanceof Date 
             ? draft.flashDealEnd.toISOString() 
             : typeof draft.flashDealEnd === 'string' 
               ? draft.flashDealEnd
               : String(draft.flashDealEnd))
          : null,
        // These fields don't exist in the products table schema but are in product_drafts
        // Remove them to avoid errors
        // hasSpecialSale: draft.hasSpecialSale || false,
        // hasDynamicPricing: draft.hasDynamicPricing || false,

        // Categorization and grouping
        tags: draft.metaKeywords
          ? draft.metaKeywords.split(",").map((tag) => tag.trim())
          : [],

        // Timestamps - convert to ISO strings for database storage
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Handle existing product (update) vs. new product (insert)
      let product: Product;
      
      // First check if a product with this name/slug already exists
      // This prevents duplicate products when publishing
      let existingProductId = draft.originalProductId;
      
      if (!existingProductId) {
        // Check if product exists by slug first (most reliable)
        let existingProducts = await db
          .select()
          .from(products)
          .where(eq(products.slug, uniqueSlug))
          .limit(1);
          
        if (existingProducts.length > 0) {
          existingProductId = existingProducts[0].id;
          logger.info(`Found existing product with matching slug. Using product ID ${existingProductId} for update instead of creating new product.`, {
            draftId: id,
            existingProductId,
            slug: uniqueSlug
          });
        } else {
          // If no slug match, check by name and catalog as fallback
          existingProducts = await db
            .select()
            .from(products)
            .where(and(
              eq(products.name, draft.name || ""),
              draft.catalogId ? eq(products.catalogId, draft.catalogId) : undefined
            ))
            .limit(1);
            
          if (existingProducts.length > 0) {
            existingProductId = existingProducts[0].id;
            logger.info(`Found existing product with matching name and catalog. Using product ID ${existingProductId} for update instead of creating new product.`, {
              draftId: id,
              existingProductId,
              draftName: draft.name
            });
          }
        }
      }
      
      // Before publishing, first clean up any existing product images to avoid duplication
      if (existingProductId) {
        try {
          // Delete existing product images to avoid duplicates
          await db
            .delete(productImages)
            .where(eq(productImages.productId, existingProductId));
            
          logger.debug("Deleted existing product images before publishing", {
            productId: existingProductId
          });
        } catch (deleteError) {
          logger.error("Error deleting existing product images", {
            error: deleteError,
            productId: existingProductId
          });
        }
      }

      if (existingProductId) {
        // Update existing product - but first get existing data to preserve fields not in draft
        const [existingProduct] = await db
          .select()
          .from(products)
          .where(eq(products.id, existingProductId))
          .limit(1);

        if (existingProduct) {
          // Debug the draft cost price value
          console.log('🔍 COST PRESERVATION DEBUG:', {
            draftId: id,
            draftCostPrice: draft.costPrice,
            draftCostPriceType: typeof draft.costPrice,
            existingCostPrice: existingProduct.costPrice,
            existingCostPriceType: typeof existingProduct.costPrice,
            parsedDraftCost: draft.costPrice ? parseFloat(String(draft.costPrice)) : 'NO_DRAFT_COST'
          });

          // Create update data that preserves existing values when draft values are null/undefined/0
          const updateData: Partial<InsertProduct> = {
            ...productData,
            // Preserve cost price if draft doesn't have it or it's 0/null/undefined
            costPrice: (draft.costPrice && parseFloat(String(draft.costPrice)) > 0) 
              ? parseFloat(String(draft.costPrice)) 
              : existingProduct.costPrice,
            // Preserve supplier ID if draft doesn't have it
            supplierId: draft.supplierId !== undefined ? draft.supplierId : existingProduct.supplierId,
            // Preserve catalog ID if draft doesn't have it
            catalogId: draft.catalogId !== undefined ? draft.catalogId : existingProduct.catalogId,
            // Preserve SKU if draft doesn't have it
            sku: draft.sku || existingProduct.sku,
            // Preserve other critical fields that might not be in draft
            createdAt: existingProduct.createdAt, // Don't overwrite creation date
            updatedAt: new Date().toISOString(), // Update the modification date
          };

          console.log('🔍 FINAL UPDATE DATA COST:', {
            finalCostPrice: updateData.costPrice,
            willPreserve: updateData.costPrice === existingProduct.costPrice
          });

          const [updatedProduct] = await db
            .update(products)
            .set(updateData)
            .where(eq(products.id, existingProductId))
            .returning();

          product = updatedProduct;
        } else {
          throw new Error(`Existing product ${existingProductId} not found`);
        }

        // Update product attributes using new centralized attribute system
        if (draft.attributes && Array.isArray(draft.attributes)) {
          // Delete existing attributes
          await db
            .delete(productAttributes)
            .where(eq(productAttributes.productId, product.id));

          logger.debug("Updating product attributes", {
            productId: product.id,
            attributesCount: draft.attributes.length,
          });

          // Insert new attributes
          for (const attr of draft.attributes) {
            try {
              // Process each attribute differently based on its type/value
              if (Array.isArray(attr.value)) {
                // For array values (like multiple selected options)
                logger.debug("Processing attribute array", {
                  productId: product.id,
                  attributeId: attr.attributeId,
                  valueCount: attr.value.length,
                  values: attr.value,
                });

                // Insert attribute record with all selected options
                await db.insert(productAttributes).values({
                  productId: product.id,
                  attributeId: attr.attributeId,
                  textValue: null,
                  
                  
                  // Store the full array of selected option IDs
                  selectedOptions: attr.value,
                  // Optional display name override
                  overrideDisplayName: attr.attributeDisplayName || null,
                });
              } else {
                // For scalar values (string, number, boolean)
                await db.insert(productAttributes).values({
                  productId: product.id,
                  attributeId: attr.attributeId,
                  // Handle different attribute value types
                  textValue: typeof attr.value === "string" ? attr.value : null,
                  // No selected options for scalar values
                  selectedOptions: null,
                  // Optional display name override
                  overrideDisplayName: attr.attributeDisplayName || null,
                });
              }
            } catch (attrError) {
              logger.error("Error saving product attribute", {
                error: attrError,
                productId: product.id,
                attributeId: attr.attributeId,
                valueType: typeof attr.value,
                value: attr.value,
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
          logger.debug("Adding product attributes for new product", {
            productId: product.id,
            attributesCount: draft.attributes.length,
          });

          // Insert new attributes
          for (const attr of draft.attributes) {
            try {
              // Process each attribute differently based on its type/value
              if (Array.isArray(attr.value)) {
                // For array values (like multiple selected options)
                logger.debug("Processing attribute array for new product", {
                  productId: product.id,
                  attributeId: attr.attributeId,
                  valueCount: attr.value.length,
                  values: attr.value,
                });

                // Insert attribute record with all selected options
                await db.insert(productAttributes).values({
                  productId: product.id,
                  attributeId: attr.attributeId,
                  textValue: null,
                  
                  
                  // Store the full array of selected option IDs
                  selectedOptions: attr.value,
                  // Optional display name override
                  overrideDisplayName: attr.attributeDisplayName || null,
                });
              } else {
                // For scalar values (string, number, boolean)
                await db.insert(productAttributes).values({
                  productId: product.id,
                  attributeId: attr.attributeId,
                  // Handle different attribute value types
                  textValue: typeof attr.value === "string" ? attr.value : null,
                  // numberValue:
                  // booleanValue:
                  // No selected options for scalar values
                  selectedOptions: null,
                  // Optional display name override
                  overrideDisplayName: attr.attributeDisplayName || null,
                });
              }
            } catch (attrError) {
              logger.error("Error saving product attribute for new product", {
                error: attrError,
                productId: product.id,
                attributeId: attr.attributeId,
                valueType: typeof attr.value,
                value: attr.value,
              });
            }
          }
        }
      }

      // With new image path strategy, we don't need to move images during publish
      // The images are already in the correct final location
      if (draft.imageUrls && draft.imageUrls.length > 0) {
        // Just extract the image object keys from image URLs if needed
        // The image path contains supplier and catalog info already
        // Create an array to store extracted object keys from URLs
        const extractedObjectKeys: string[] = [];
        
        // Process each image URL to extract object keys
        for (const url of draft.imageUrls) {
          if (!url) continue;
          
          const urlParts = url.split("/");
          const lastSegment = urlParts[urlParts.length - 1];
          const draftId = draft.id.toString();
          
          // Try to find the correct path in the URL
          let objectKey: string | null = null;
          for (let i = 0; i < urlParts.length; i++) {
            if (urlParts[i] === draftId && i > 0) {
              // Format is now /supplier/catalog/draftId/filename.jpg
              const supplierName = urlParts[i - 2] || "unknown-supplier";
              const catalogName = urlParts[i - 1] || "catalog-0";
              objectKey = `${supplierName}/${catalogName}/${draftId}/${lastSegment}`;
              break;
            }
          }
          
          if (objectKey) {
            extractedObjectKeys.push(objectKey);
          }
        }
        
        // Use extracted keys or fall back to empty array
        const imageObjectKeys = extractedObjectKeys;

        // Use draft data directly for path construction  
        const supplierName = draft.supplierId ? String(draft.supplierId) : "unknown-supplier";
        const catalogName = `catalog-${draft.catalogId || 0}`;
        const categoryName = `category-${draft.categoryId || 0}`;

        for (let i = 0; i < imageObjectKeys.length; i++) {
          const sourceObjectKey = imageObjectKeys[i];
          const imageUrl = draft.imageUrls?.[i];

          if (!sourceObjectKey || !imageUrl) continue;

          try {
            // With the new path strategy, we can use the existing image directly
            // No need to copy/move files since they are already in their final location
            const newObjectKey = sourceObjectKey;
            const newImageUrl = objectStore.getPublicUrl(newObjectKey);

            // Verify image exists
            const exists = await objectStore.exists(sourceObjectKey);
            if (!exists) {
              logger.warn(
                "Image referenced in draft does not exist in object store",
                {
                  objectKey: sourceObjectKey,
                  draftId: draft.id,
                  productId: product.id,
                },
              );
              continue; // Skip this image if it doesn't exist
            }

            // Make sure we have a valid URL before inserting
            if (!newImageUrl) {
              logger.warn("Could not generate valid public URL for image", {
                objectKey: newObjectKey,
                draftId: draft.id,
                productId: product.id,
              });

              // Use the original image URL from the draft if available
              if (imageUrl) {
                // Save product image record with the original URL
                await db.insert(productImages).values({
                  productId: product.id,
                  url: imageUrl,  // Correct column name 'url'
                  objectKey: newObjectKey,
                  isMain: i === (draft.mainImageIndex || 0), // Fix: using 'isMain' instead of 'isMainImage'
                  sortOrder: i,
                });
              }
              continue;
            }

            // Save product image record with the same locations
            await db.insert(productImages).values({
              productId: product.id,
              url: newImageUrl, // Use the correct column name 'url'
              objectKey: newObjectKey,
              isMain: i === (draft.mainImageIndex || 0), // Fix: using 'isMain' instead of 'isMainImage'
              sortOrder: i,
            });

            logger.debug(
              "Registered product image using existing draft location",
              {
                productId: product.id,
                draftId: draft.id,
                objectKey: newObjectKey,
              },
            );
          } catch (imageError) {
            // If image copy fails, still create the product but log the error
            logger.error(
              "Failed to copy image from draft to product location",
              {
                error: imageError,
                productId: product.id,
                draftId: draft.id,
                sourceKey: sourceObjectKey,
              },
            );

            // Fallback to using original image locations
            if (imageUrl) {
              await db.insert(productImages).values({
                productId: product.id,
                url: imageUrl, // 'url' is the correct column name
                objectKey: sourceObjectKey,
                isMain: i === (draft.mainImageIndex || 0), // Fix: 'isMain' is the correct column name, not 'isMainImage'
                sortOrder: i,
              });
            } else {
              logger.error(
                "Cannot create product image: No valid URL available",
                {
                  productId: product.id,
                  draftId: draft.id,
                  sourceKey: sourceObjectKey,
                },
              );
            }
          }
        }
      }

      // With the new image path strategy, we don't need to delete the draft images
      // because they're already in their final location and we're reusing them
      logger.debug("Skipping draft image deletion with new path strategy", {
        draftId: draft.id,
        imageCount: draft.imageUrls?.length || 0,
      });

      // Instead of deleting the draft, update its status to 'published'
      // This ensures we keep draft records even after publishing
      const now = new Date();
      const updateData: Partial<ProductDraft> = {
        draftStatus: 'published',
        lastModified: now,
        publishedAt: now.toISOString(), // Record when it was published
      };

      // Add to change history
      if (!draft.changeHistory) {
        updateData.changeHistory = [];
      }

      // Create the new change entry
      const changeEntry = {
        timestamp: now.toISOString(),
        fromStatus: draft.draftStatus,
        toStatus: 'published',
        note: 'Published to store',
      };

      try {
        // Process existing history
        let currentHistory = [];
        if (draft.changeHistory && Array.isArray(draft.changeHistory)) {
          currentHistory = draft.changeHistory;
        }
        // Add new entry
        updateData.changeHistory = [...currentHistory, changeEntry];
      } catch (historyError) {
        logger.error("Error updating draft history during publish", {
          error: historyError,
          draftId: id,
        });
        // Continue even if history update fails
      }

      // Update the draft instead of deleting it
      await db
        .update(productDrafts)
        .set(updateData)
        .where(eq(productDrafts.id, id));

      logger.info("Updated product draft status to published", {
        draftId: id,
        productId: product.id
      });

      return product;
    } catch (error) {
      logger.error("Error publishing product draft", { error, id });
      throw error;
    }
  }

  async updateProductDraftStatus(
    id: number,
    status: string,
    note?: string,
  ): Promise<ProductDraft> {
    try {
      // Get the existing draft
      const draft = await this.getProductDraft(id);
      if (!draft) {
        throw new Error(`Product draft with ID ${id} not found`);
      }

      // Prepare the update data with proper type handling
      // For timestamp fields, use actual Date objects as Drizzle will handle the conversion
      const now = new Date();
      const updateData: Partial<ProductDraft> = {
        draftStatus: status,
        lastModified: now, // Use Date object for timestamp columns
      };

      // Add additional information based on status
      if (status === "rejected" && note) {
        updateData.rejectionReason = note;
      }

      // Initialize change history if it doesn't exist yet
      if (!draft.changeHistory) {
        updateData.changeHistory = [];
      }

      // Create the new change entry with proper timestamp (for the jsonb field)
      const changeEntry = {
        timestamp: now.toISOString(), // For jsonb, we need to store as string
        fromStatus: draft.draftStatus,
        toStatus: status,
        note: note || null,
      };

      try {
        // Process existing history and ensure it's a proper array for JSONB
        let currentHistory = [];

        try {
          if (draft.changeHistory) {
            // Handle different formats of changeHistory
            if (Array.isArray(draft.changeHistory)) {
              // Process each entry to ensure valid format
              currentHistory = (draft.changeHistory as any[]).map((entry) => {
                try {
                  // Make sure all existing timestamps are strings
                  return {
                    fromStatus: entry.fromStatus || "unknown",
                    toStatus: entry.toStatus || "unknown",
                    note: entry.note || null,
                    timestamp:
                      typeof entry.timestamp === "string"
                        ? entry.timestamp
                        : entry.timestamp instanceof Date
                          ? entry.timestamp.toISOString()
                          : new Date().toISOString(),
                  };
                } catch (entryError) {
                  logger.warn("Error processing history entry", {
                    entryError,
                    entry:
                      typeof entry === "object"
                        ? JSON.stringify(entry)
                        : typeof entry,
                  });
                  // Return a simple valid entry rather than failing
                  return {
                    fromStatus: "unknown",
                    toStatus: "unknown",
                    note: null,
                    timestamp: new Date().toISOString(),
                  };
                }
              });
            } else if (typeof draft.changeHistory === "object") {
              // It might be a single object rather than an array
              logger.warn("Change history is an object, not an array", {
                type: typeof draft.changeHistory,
              });
              currentHistory = [];
            } else {
              // Initialize to empty array for any other type
              logger.warn("Change history is not valid", {
                type: typeof draft.changeHistory,
              });
              currentHistory = [];
            }
          }
        } catch (historyError) {
          logger.error("Failed to process change history", {
            historyError,
            changeHistoryType: typeof draft.changeHistory,
          });
          // Always use a new array if there's an error
          currentHistory = [];
        }

        // Add new entry to history
        updateData.changeHistory = [...currentHistory, changeEntry];

        // Log what we're adding to help with debugging
        logger.debug("Change history entry added", {
          newEntry: changeEntry,
          historyLength: currentHistory.length + 1,
        });
      } catch (error) {
        logger.error("Error updating change history", { error, draftId: id });
        // Continue with the update even if change history fails
      }

      // Add debugging info to help diagnose issues
      logger.debug("Updating product draft status with data", {
        draftId: id,
        status,
        updateData,
        lastModifiedType: typeof updateData.lastModified,
      });

      // Update the database record
      try {
        // Handle changeHistory as a proper array for the jsonb field
        if (updateData.changeHistory) {
          if (Array.isArray(updateData.changeHistory)) {
            // Ensure the array is properly formatted for PostgreSQL JSONB
            updateData.changeHistory = JSON.parse(
              JSON.stringify(updateData.changeHistory),
            );
          } else {
            // If somehow it's not an array, make it one
            updateData.changeHistory = [];
          }

          logger.debug("Change history prepared for database", {
            changeHistoryType: typeof updateData.changeHistory,
            isArray: Array.isArray(updateData.changeHistory),
            length: Array.isArray(updateData.changeHistory)
              ? updateData.changeHistory.length
              : 0,
          });
        }

        // Perform the database update
        const [updatedDraft] = await db
          .update(productDrafts)
          .set(updateData)
          .where(eq(productDrafts.id, id))
          .returning();

        if (!updatedDraft) {
          throw new Error(`Failed to update status for draft ${id}`);
        }

        logger.debug("Draft successfully updated", {
          id: updatedDraft.id,
          newStatus: updatedDraft.draftStatus,
          lastModified: updatedDraft.lastModified,
        });

        return updatedDraft;
      } catch (dbError) {
        // More detailed error for database operations
        logger.error("Database error when updating product draft status", {
          error: dbError,
          id,
          status,
          errorName: dbError.name,
          errorMessage: dbError.message,
          errorStack: dbError.stack,
          updateData: {
            draftStatus: updateData.draftStatus,
            lastModifiedType: typeof updateData.lastModified,
            changeHistoryType: updateData.changeHistory
              ? typeof updateData.changeHistory
              : "undefined",
            changeHistoryIsArray: updateData.changeHistory
              ? Array.isArray(updateData.changeHistory)
              : false,
          },
        });
        throw dbError;
      }
    } catch (error) {
      logger.error("Error updating product draft status", {
        error,
        id,
        status,
        errorName: error.name,
        errorMessage: error.message,
      });
      throw error;
    }
  }

  async validateProductDraft(
    id: number,
    step?: string,
  ): Promise<{ isValid: boolean; errors?: Record<string, string[]> }> {
    try {
      const draft = await this.getProductDraft(id);

      if (!draft) {
        throw new Error(`Product draft with ID ${id} not found`);
      }

      // Validation based on step
      const errors: Record<string, string[]> = {};
      let isValid = true;

      // Basic info validation
      if (!step || step === "basic-info") {
        if (!draft.name || draft.name.trim() === "") {
          errors["name"] = errors["name"] || [];
          errors["name"].push("Product name is required");
          isValid = false;
        }

        if (!draft.slug || draft.slug.trim() === "") {
          errors["slug"] = errors["slug"] || [];
          errors["slug"].push("Product URL slug is required");
          isValid = false;
        }

        if (!draft.categoryId) {
          errors["categoryId"] = errors["categoryId"] || [];
          errors["categoryId"].push("Product category is required");
          isValid = false;
        }
      }

      // Pricing validation
      if (!step || step === "pricing") {
        if (!draft.regularPrice) {
          errors["regularPrice"] = errors["regularPrice"] || [];
          errors["regularPrice"].push("Regular price is required");
          isValid = false;
        }

        if (draft.onSale && !draft.salePrice) {
          errors["salePrice"] = errors["salePrice"] || [];
          errors["salePrice"].push("Sale price is required when on sale");
          isValid = false;
        }
      }

      // Images validation
      if (!step || step === "images") {
        if (
          !draft.imageUrls ||
          draft.imageUrls.length === 0 ||
          draft.imageUrls.every((url) => !url)
        ) {
          errors["images"] = errors["images"] || [];
          errors["images"].push("At least one product image is required");
          isValid = false;
        }
      }

      return {
        isValid,
        errors: Object.keys(errors).length > 0 ? errors : undefined,
      };
    } catch (error) {
      logger.error("Error validating product draft", { error, id });
      throw error;
    }
  }

  async deleteProductDraft(id: number, userRole?: string, userId?: number): Promise<boolean> {
    try {
      // Import dynamically to avoid circular dependencies
      const { cleanupOrphanedDraftImages } = await import(
        "./clean-orphaned-images"
      );

      // Get the draft first to access the image object keys and verify access
      const draft = await this.getProductDraft(id, userRole, userId);

      if (!draft) {
        logger.error(`Draft not found or access denied when trying to delete: ${id}`);
        throw new Error(`Draft with ID ${id} not found or access denied`);
      }

      // First, clean up any orphaned images for this draft that may not be tracked in the database
      logger.info(
        `Running orphaned image cleanup for draft ${id} before deletion`,
      );
      const cleanupResult = await cleanupOrphanedDraftImages(id);
      logger.info(
        `Orphaned image cleanup results: ${JSON.stringify(cleanupResult)}`,
      );

      // Delete from database first
      const result = await db
        .delete(productDrafts)
        .where(eq(productDrafts.id, id));

      logger.debug(`Deleted draft from database, ID: ${id}`);

      // Delete tracked images from object storage if needed
      if (draft.imageObjectKeys && draft.imageObjectKeys.length > 0) {
        const deletePromises = [];

        for (const objectKey of draft.imageObjectKeys) {
          if (
            objectKey &&
            objectKey !== "undefined" &&
            objectKey.trim() !== ""
          ) {
            try {
              logger.debug(`Deleting tracked image: ${objectKey}`);
              // Add each delete operation to our promises array
              deletePromises.push(
                objectStore.deleteFile(objectKey).catch((error) => {
                  logger.error("Error deleting image from object storage", {
                    error: error.message || String(error),
                    objectKey,
                  });
                  // Don't throw - we want to continue with other images if one fails
                  return null;
                }),
              );
            } catch (deleteError) {
              // Log but don't fail if image deletion fails
              logger.error("Failed to delete draft image", {
                draftId: id,
                objectKey,
                error:
                  deleteError instanceof Error
                    ? deleteError.message
                    : String(deleteError),
              });
            }
          }
        }

        // Wait for all image deletions to complete or fail
        await Promise.allSettled(deletePromises);
        logger.debug(`Completed tracked image deletion for draft ${id}`);
      } else {
        logger.debug(`No tracked images to delete for draft ${id}`);
      }

      // Finally, make one more pass to clean up any remaining files in this draft's directory
      logger.info(`Checking for any remaining files in drafts/${id}/...`);
      try {
        const draftPrefix = `drafts/${id}/`;

        // Get direct listing of any remaining files using raw object store client
        const rawResult = await objectStore.getClient().list("");
        if (
          "err" in rawResult ||
          !rawResult.value ||
          !Array.isArray(rawResult.value)
        ) {
          logger.error(
            `Error listing object store files: ${
              "err" in rawResult
                ? JSON.stringify(rawResult.err)
                : "Unknown error"
            }`,
          );
        } else {
          // Find any remaining files in this draft's directory
          const remainingFiles: string[] = [];

          for (const obj of rawResult.value) {
            if (obj && typeof obj === "object") {
              let objectKey = null;
              // Try to extract the key/name property
              if ("key" in obj && obj.key && typeof obj.key === "string") {
                objectKey = obj.key;
              } else if (
                "name" in obj &&
                obj.name &&
                typeof obj.name === "string"
              ) {
                objectKey = obj.name;
              }

              // If we found a key that matches our draft prefix, delete it
              if (objectKey && objectKey.startsWith(draftPrefix)) {
                remainingFiles.push(objectKey);
                logger.info(`Found remaining file to delete: ${objectKey}`);
                try {
                  await objectStore.deleteFile(objectKey);
                  logger.debug(
                    `Successfully deleted remaining file: ${objectKey}`,
                  );
                } catch (deleteError) {
                  logger.error(
                    `Failed to delete remaining file: ${objectKey}`,
                    {
                      error:
                        deleteError instanceof Error
                          ? deleteError.message
                          : String(deleteError),
                    },
                  );
                }
              }
            }
          }

          if (remainingFiles.length > 0) {
            logger.info(
              `Deleted ${remainingFiles.length} remaining files for draft ${id}`,
            );
          } else {
            logger.info(`No remaining files found for draft ${id}`);
          }
        }
      } catch (finalCleanupError) {
        logger.error(`Error in final cleanup for draft ${id}`, {
          error:
            finalCleanupError instanceof Error
              ? finalCleanupError.message
              : String(finalCleanupError),
        });
        // Don't throw - this is best-effort cleanup
      }

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Error deleting product draft ${id}: ${errorMessage}`);
      throw error;
    }
  }

  // ===== PROMOTIONS MANAGEMENT =====

  async createPromotion(promotionData: InsertPromotion): Promise<Promotion> {
    try {
      const [promotion] = await db
        .insert(promotions)
        .values(promotionData)
        .returning();
      return promotion;
    } catch (error) {
      console.error("Error creating promotion:", error);
      throw error;
    }
  }

  async getPromotions(): Promise<Promotion[]> {
    try {
      return await db.select().from(promotions).orderBy(desc(promotions.createdAt));
    } catch (error) {
      console.error("Error fetching promotions:", error);
      throw error;
    }
  }

  async getActivePromotions(): Promise<Promotion[]> {
    try {
      const now = new Date().toISOString();
      return await db
        .select()
        .from(promotions)
        .where(
          and(
            eq(promotions.isActive, true),
            lte(promotions.startDate, now),
            gte(promotions.endDate, now)
          )
        )
        .orderBy(desc(promotions.createdAt));
    } catch (error) {
      console.error("Error fetching active promotions:", error);
      throw error;
    }
  }

  async getPromotionById(id: number): Promise<Promotion | undefined> {
    try {
      const [promotion] = await db
        .select()
        .from(promotions)
        .where(eq(promotions.id, id));
      return promotion;
    } catch (error) {
      console.error(`Error fetching promotion ${id}:`, error);
      throw error;
    }
  }

  async updatePromotion(id: number, updateData: Partial<InsertPromotion>): Promise<Promotion | undefined> {
    try {
      const [updatedPromotion] = await db
        .update(promotions)
        .set(updateData)
        .where(eq(promotions.id, id))
        .returning();
      return updatedPromotion;
    } catch (error) {
      console.error(`Error updating promotion ${id}:`, error);
      throw error;
    }
  }

  async deletePromotion(id: number): Promise<boolean> {
    try {
      // First remove all product associations
      await db.delete(productPromotions).where(eq(productPromotions.promotionId, id));
      
      // Then delete the promotion
      await db.delete(promotions).where(eq(promotions.id, id));
      return true;
    } catch (error) {
      console.error(`Error deleting promotion ${id}:`, error);
      throw error;
    }
  }

  // ===== PRODUCT PROMOTIONS MANAGEMENT =====

  async addProductToPromotion(promotionId: number, productId: number, discountOverride?: number): Promise<ProductPromotion> {
    try {
      const [productPromotion] = await db
        .insert(productPromotions)
        .values({
          promotionId,
          productId,
          discountOverride
        })
        .returning();
      return productPromotion;
    } catch (error) {
      console.error(`Error adding product ${productId} to promotion ${promotionId}:`, error);
      throw error;
    }
  }

  async removeProductFromPromotion(promotionId: number, productId: number): Promise<boolean> {
    try {
      await db
        .delete(productPromotions)
        .where(
          and(
            eq(productPromotions.promotionId, promotionId),
            eq(productPromotions.productId, productId)
          )
        );
      return true;
    } catch (error) {
      console.error(`Error removing product ${productId} from promotion ${promotionId}:`, error);
      throw error;
    }
  }

  async updatePromotionalPrice(promotionId: number, productId: number, promotionalPrice: number): Promise<boolean> {
    try {
      const result = await db
        .update(productPromotions)
        .set({ promotionalPrice })
        .where(
          and(
            eq(productPromotions.promotionId, promotionId),
            eq(productPromotions.productId, productId)
          )
        );
      return true;
    } catch (error) {
      console.error(`Error updating promotional price for product ${productId} in promotion ${promotionId}:`, error);
      throw error;
    }
  }

  async massPublishPromotionProducts(promotionId: number): Promise<{ publishedCount: number; skippedCount: number; errors: string[] }> {
    try {
      // Get all products in the promotion
      const promotionProducts = await db
        .select({
          productId: productPromotions.productId
        })
        .from(productPromotions)
        .where(eq(productPromotions.promotionId, promotionId));

      let publishedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];

      for (const item of promotionProducts) {
        try {
          // Check if product is already published
          const [product] = await db
            .select({ isPublished: products.isPublished })
            .from(products)
            .where(eq(products.id, item.productId));

          if (product?.isPublished) {
            skippedCount++;
            continue;
          }

          // Publish the product
          await db
            .update(products)
            .set({ 
              isPublished: true,
              updatedAt: new Date().toISOString()
            })
            .where(eq(products.id, item.productId));

          publishedCount++;
        } catch (error) {
          console.error(`Error publishing product ${item.productId}:`, error);
          errors.push(`Failed to publish product ${item.productId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return { publishedCount, skippedCount, errors };
    } catch (error) {
      console.error(`Error in mass publish for promotion ${promotionId}:`, error);
      throw error;
    }
  }

  async getPromotionProducts(promotionId: number): Promise<any[]> {
    try {
      // First get the promotion details
      const [promotion] = await db
        .select()
        .from(promotions)
        .where(eq(promotions.id, promotionId));

      if (!promotion) {
        return [];
      }

      // Get the promotion products with basic product info
      const promotionProductsList = await db
        .select()
        .from(productPromotions)
        .innerJoin(products, eq(productPromotions.productId, products.id))
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(eq(productPromotions.promotionId, promotionId));

      // Then get parent categories for each category if they exist
      const result = [];
      for (const item of promotionProductsList) {
        let parentCategory = null;
        if (item.categories?.parentId) {
          const [parent] = await db
            .select()
            .from(categories)
            .where(eq(categories.id, item.categories.parentId));
          parentCategory = parent || null;
        }

        // Calculate promotional price if not already set
        let calculatedPromotionalPrice = item.productPromotions.promotionalPrice;
        if (!calculatedPromotionalPrice && promotion && promotion.discountValue && item.products.salePrice) {
          const discountPercentage = parseFloat(promotion.discountValue);
          const salePrice = parseFloat(item.products.salePrice);
          calculatedPromotionalPrice = Math.round(salePrice * (1 - discountPercentage / 100));
        }

        // Calculate the additional discount percentage for the "EXTRA X% OFF" badge
        let additionalDiscountPercentage = 0;
        if (calculatedPromotionalPrice && item.products.salePrice) {
          const salePrice = parseFloat(item.products.salePrice);
          const promotionalPrice = parseFloat(calculatedPromotionalPrice);
          
          if (promotionalPrice < salePrice) {
            // Calculate the additional discount percentage based on Sale Price vs Promotional Price
            additionalDiscountPercentage = Math.round(((salePrice - promotionalPrice) / salePrice) * 100);
          }
        }

        result.push({
          id: item.productPromotions.id,
          productId: item.productPromotions.productId,
          promotionId: item.productPromotions.promotionId,
          discountOverride: item.productPromotions.discountOverride,
          promotionalPrice: calculatedPromotionalPrice,
          // Override the promotion discount with the calculated additional discount percentage
          additionalDiscountPercentage: additionalDiscountPercentage,
          product: {
            ...item.products,
            category: item.categories ? {
              ...item.categories,
              parentCategory: parentCategory
            } : null
          }
        });
      }

      return result;
    } catch (error) {
      console.error(`Error fetching products for promotion ${promotionId}:`, error);
      throw error;
    }
  }

  async getProductPromotions(productId: number): Promise<Promotion[]> {
    try {
      const productPromotionsList = await db
        .select({
          promotion: promotions
        })
        .from(promotions)
        .innerJoin(productPromotions, eq(promotions.id, productPromotions.promotionId))
        .where(eq(productPromotions.productId, productId));

      return productPromotionsList.map(item => item.promotion);
    } catch (error) {
      console.error(`Error fetching promotions for product ${productId}:`, error);
      throw error;
    }
  }

  async bulkAddProductsToPromotion(promotionId: number, productIds: number[]): Promise<ProductPromotion[]> {
    try {
      // Get the promotion details to calculate promotional prices
      const promotion = await this.getPromotion(promotionId);
      if (!promotion) {
        throw new Error(`Promotion ${promotionId} not found`);
      }

      const values = [];
      
      // Get product details and calculate promotional prices
      for (const productId of productIds) {
        const product = await this.getProduct(productId);
        if (product) {
          let promotionalPrice = null;
          
          // Calculate promotional price by applying discount to existing sale price
          if (promotion.discountValue && product.salePrice) {
            const discountPercentage = parseFloat(promotion.discountValue);
            const currentSalePrice = parseFloat(product.salePrice);
            // Apply discount to current sale price to make it cheaper
            promotionalPrice = Math.round(currentSalePrice * (1 - discountPercentage / 100));
          }

          values.push({
            promotionId,
            productId,
            promotionalPrice
          });
        }
      }

      return await db
        .insert(productPromotions)
        .values(values)
        .returning();
    } catch (error) {
      console.error(`Error bulk adding products to promotion ${promotionId}:`, error);
      throw error;
    }
  }

  // Get product IDs by category (with optional subcategories)
  async getProductIdsByCategory(categoryId: number, includeSubcategories: boolean = false): Promise<number[]> {
    try {
      if (includeSubcategories) {
        // Get all subcategory IDs recursively
        const subcategoryIds = await this.getAllSubcategoryIds(categoryId);
        const allCategoryIds = [categoryId, ...subcategoryIds];
        
        const results = await db
          .select({ id: products.id })
          .from(products)
          .where(inArray(products.categoryId, allCategoryIds));
        
        return results.map(r => r.id);
      } else {
        const results = await db
          .select({ id: products.id })
          .from(products)
          .where(eq(products.categoryId, categoryId));
        
        return results.map(r => r.id);
      }
    } catch (error) {
      console.error(`Error getting product IDs by category ${categoryId}:`, error);
      throw error;
    }
  }

  // Get product IDs by supplier
  async getProductIdsBySupplier(supplierId: number): Promise<number[]> {
    try {
      const results = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.supplierId, supplierId));
      
      return results.map(r => r.id);
    } catch (error) {
      console.error(`Error getting product IDs by supplier ${supplierId}:`, error);
      throw error;
    }
  }

  // Get product IDs by catalog
  async getProductIdsByCatalog(catalogId: number): Promise<number[]> {
    try {
      const results = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.catalogId, catalogId));
      
      return results.map(r => r.id);
    } catch (error) {
      console.error(`Error getting product IDs by catalog ${catalogId}:`, error);
      throw error;
    }
  }

  // Helper method to get all subcategory IDs recursively
  private async getAllSubcategoryIds(parentId: number): Promise<number[]> {
    try {
      const directChildren = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.parentId, parentId));
      
      const childIds = directChildren.map(c => c.id);
      const allSubcategoryIds = [...childIds];
      
      // Recursively get subcategories
      for (const childId of childIds) {
        const grandChildren = await this.getAllSubcategoryIds(childId);
        allSubcategoryIds.push(...grandChildren);
      }
      
      return allSubcategoryIds;
    } catch (error) {
      console.error(`Error getting subcategory IDs for parent ${parentId}:`, error);
      throw error;
    }
  }

  async bulkRemoveProductsFromPromotion(promotionId: number, productIds: number[]): Promise<boolean> {
    try {
      await db
        .delete(productPromotions)
        .where(
          and(
            eq(productPromotions.promotionId, promotionId),
            inArray(productPromotions.productId, productIds)
          )
        );
      return true;
    } catch (error) {
      console.error(`Error bulk removing products from promotion ${promotionId}:`, error);
      throw error;
    }
  }

  // ==================================================================================
  // PROMOTION ANALYTICS METHODS
  // ==================================================================================

  async getPromotionAnalytics(
    promotionId?: number,
    dateRange?: { from: Date; to: Date },
    compareWith?: { from: Date; to: Date }
  ): Promise<any> {
    try {
      // Build base query conditions
      const conditions = [];
      
      if (promotionId) {
        conditions.push(eq(productPromotions.promotionId, promotionId));
      }
      
      if (dateRange) {
        conditions.push(
          and(
            gte(orders.createdAt, dateRange.from.toISOString()),
            lte(orders.createdAt, dateRange.to.toISOString())
          )
        );
      }

      // Get promotion analytics data
      const analyticsQuery = db
        .select({
          promotionId: promotions.id,
          promotionName: promotions.name,
          status: promotions.status,
          startDate: promotions.startDate,
          endDate: promotions.endDate,
          orderId: orders.id,
          orderTotal: orders.totalAmount,
          orderSubtotal: orders.subtotalAmount,
          orderDate: orders.createdAt,
          customerId: orders.userId,
          customerProvince: users.province,
          productId: orderItems.productId,
          productName: orderItems.productName,
          quantity: orderItems.quantity,
          unitPrice: orderItems.unitPrice,
          totalPrice: orderItems.totalPrice
        })
        .from(promotions)
        .leftJoin(productPromotions, eq(productPromotions.promotionId, promotions.id))
        .leftJoin(orderItems, eq(orderItems.productId, productPromotions.productId))
        .leftJoin(orders, eq(orders.id, orderItems.orderId))
        .leftJoin(users, eq(users.id, orders.userId));

      if (conditions.length > 0) {
        analyticsQuery.where(and(...conditions));
      }

      const rawData = await analyticsQuery;

      // Process and aggregate the data
      const analytics = this.processPromotionAnalyticsData(rawData);
      
      // Add comparison data if requested
      if (compareWith) {
        const comparisonData = await this.getPromotionAnalyticsComparison(
          promotionId,
          compareWith,
          dateRange
        );
        analytics.comparison = comparisonData;
      }

      return analytics;
    } catch (error) {
      console.error('Error getting promotion analytics:', error);
      throw error;
    }
  }

  private processPromotionAnalyticsData(rawData: any[]): any {
    const promotionMap = new Map();
    const dailyMetrics = new Map();
    const geographicData = new Map();
    const topProducts = new Map();
    const customerTracking = new Set();

    rawData.forEach(row => {
      if (!row.promotionId) return;

      // Initialize promotion data
      if (!promotionMap.has(row.promotionId)) {
        promotionMap.set(row.promotionId, {
          id: row.promotionId,
          promotionName: row.promotionName,
          status: row.status,
          startDate: row.startDate,
          endDate: row.endDate,
          totalOrders: 0,
          totalRevenue: 0,
          totalProducts: 0,
          newCustomers: 0,
          returningCustomers: 0,
          orderIds: new Set(),
          productIds: new Set(),
          customerIds: new Set()
        });
      }

      const promotion = promotionMap.get(row.promotionId);

      // Track orders and revenue
      if (row.orderId && !promotion.orderIds.has(row.orderId)) {
        promotion.orderIds.add(row.orderId);
        promotion.totalOrders++;
        promotion.totalRevenue += parseFloat(row.orderTotal) || 0;
      }

      // Track products
      if (row.productId) {
        promotion.productIds.add(row.productId);
      }

      // Track customers
      if (row.customerId) {
        promotion.customerIds.add(row.customerId);
        customerTracking.add(row.customerId);
      }

      // Daily metrics
      if (row.orderDate) {
        const dateKey = row.orderDate.split('T')[0];
        if (!dailyMetrics.has(dateKey)) {
          dailyMetrics.set(dateKey, {
            date: dateKey,
            orders: 0,
            revenue: 0,
            visitors: 0,
            orderIds: new Set()
          });
        }
        
        const daily = dailyMetrics.get(dateKey);
        if (!daily.orderIds.has(row.orderId)) {
          daily.orderIds.add(row.orderId);
          daily.orders++;
          daily.revenue += parseFloat(row.orderTotal) || 0;
        }
      }

      // Geographic data
      if (row.customerProvince && row.orderId) {
        const province = row.customerProvince;
        if (!geographicData.has(province)) {
          geographicData.set(province, {
            province,
            orders: 0,
            revenue: 0,
            orderIds: new Set()
          });
        }
        
        const geo = geographicData.get(province);
        if (!geo.orderIds.has(row.orderId)) {
          geo.orderIds.add(row.orderId);
          geo.orders++;
          geo.revenue += parseFloat(row.orderTotal) || 0;
        }
      }

      // Top products
      if (row.productId && row.productName) {
        if (!topProducts.has(row.productId)) {
          topProducts.set(row.productId, {
            id: row.productId,
            name: row.productName,
            sales: 0,
            revenue: 0
          });
        }
        
        const product = topProducts.get(row.productId);
        product.sales += parseInt(row.quantity) || 0;
        product.revenue += parseFloat(row.totalPrice) || 0;
      }
    });

    // Convert maps to arrays and calculate additional metrics
    const processedAnalytics = Array.from(promotionMap.values()).map(promotion => {
      promotion.totalProducts = promotion.productIds.size;
      promotion.conversionRate = promotion.totalOrders > 0 ? 
        (promotion.totalOrders / Math.max(promotion.customerIds.size, 1)) * 100 : 0;
      promotion.avgOrderValue = promotion.totalOrders > 0 ? 
        promotion.totalRevenue / promotion.totalOrders : 0;
      
      // Clean up tracking sets
      delete promotion.orderIds;
      delete promotion.productIds;
      delete promotion.customerIds;

      return promotion;
    });

    return {
      promotions: processedAnalytics,
      dailyMetrics: Array.from(dailyMetrics.values()).map(day => {
        delete day.orderIds;
        return day;
      }),
      geographicData: Array.from(geographicData.values()).map(geo => {
        delete geo.orderIds;
        return geo;
      }),
      topProducts: Array.from(topProducts.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)
    };
  }

  private async getPromotionAnalyticsComparison(
    promotionId?: number,
    compareWith?: { from: Date; to: Date },
    originalRange?: { from: Date; to: Date }
  ): Promise<any> {
    if (!compareWith) return null;

    try {
      const comparisonData = await this.getPromotionAnalytics(promotionId, compareWith);
      
      return {
        period: compareWith,
        metrics: comparisonData
      };
    } catch (error) {
      console.error('Error getting comparison analytics:', error);
      return null;
    }
  }

  async getPromotionPerformanceMetrics(promotionId: number): Promise<any> {
    try {
      const [promotion] = await db
        .select()
        .from(promotions)
        .where(eq(promotions.id, promotionId));

      if (!promotion) {
        throw new Error(`Promotion ${promotionId} not found`);
      }

      // Get performance metrics
      const metricsQuery = await db
        .select({
          totalOrders: sql<number>`COUNT(DISTINCT ${orders.id})`,
          totalRevenue: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)`,
          totalProducts: sql<number>`COUNT(DISTINCT ${productPromotions.productId})`,
          avgOrderValue: sql<number>`COALESCE(AVG(${orders.totalAmount}), 0)`,
          totalCustomers: sql<number>`COUNT(DISTINCT ${orders.userId})`
        })
        .from(productPromotions)
        .leftJoin(orderItems, eq(orderItems.productId, productPromotions.productId))
        .leftJoin(orders, eq(orders.id, orderItems.orderId))
        .where(eq(productPromotions.promotionId, promotionId));

      const metrics = metricsQuery[0];

      return {
        promotion,
        metrics: {
          totalOrders: parseInt(metrics.totalOrders) || 0,
          totalRevenue: parseFloat(metrics.totalRevenue) || 0,
          totalProducts: parseInt(metrics.totalProducts) || 0,
          avgOrderValue: parseFloat(metrics.avgOrderValue) || 0,
          totalCustomers: parseInt(metrics.totalCustomers) || 0,
          conversionRate: metrics.totalCustomers > 0 ? 
            (parseInt(metrics.totalOrders) / parseInt(metrics.totalCustomers)) * 100 : 0
        }
      };
    } catch (error) {
      console.error(`Error getting performance metrics for promotion ${promotionId}:`, error);
      throw error;
    }
  }

  async updatePromotionalPrice(promotionId: number, productId: number, promotionalPrice: string): Promise<boolean> {
    try {
      const result = await db
        .update(productPromotions)
        .set({ 
          promotionalPrice: promotionalPrice
        })
        .where(
          and(
            eq(productPromotions.promotionId, promotionId),
            eq(productPromotions.productId, productId)
          )
        );

      return true;
    } catch (error) {
      console.error(`Error updating promotional price for product ${productId} in promotion ${promotionId}:`, error);
      throw error;
    }
  }

  async getPromotionTopProducts(promotionId: number, limit = 10): Promise<any[]> {
    try {
      const topProducts = await db
        .select({
          productId: productPromotions.productId,
          productName: orderItems.productName,
          totalSales: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`,
          totalRevenue: sql<number>`COALESCE(SUM(${orderItems.totalPrice}), 0)`,
          orderCount: sql<number>`COUNT(DISTINCT ${orders.id})`
        })
        .from(productPromotions)
        .leftJoin(orderItems, eq(orderItems.productId, productPromotions.productId))
        .leftJoin(orders, eq(orders.id, orderItems.orderId))
        .where(eq(productPromotions.promotionId, promotionId))
        .groupBy(productPromotions.productId, orderItems.productName)
        .orderBy(desc(sql`COALESCE(SUM(${orderItems.totalPrice}), 0)`))
        .limit(limit);

      return topProducts.map(product => ({
        id: product.productId,
        name: product.productName,
        sales: parseInt(product.totalSales) || 0,
        revenue: parseFloat(product.totalRevenue) || 0,
        orders: parseInt(product.orderCount) || 0
      }));
    } catch (error) {
      console.error(`Error getting top products for promotion ${promotionId}:`, error);
      throw error;
    }
  }

  // ===============================================================
  // USER MANAGEMENT METHODS
  // ===============================================================

  /**
   * Get users with pagination, search, and filtering
   */
  async getUsersWithPagination(
    limit: number,
    offset: number,
    search?: string,
    roleFilter?: string,
    statusFilter?: string,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc'
  ): Promise<{ users: any[], total: number }> {
    try {
      let conditions = [];

      // Search across multiple fields
      if (search && search.trim()) {
        const searchTerm = `%${search.toLowerCase()}%`;
        conditions.push(
          or(
            ilike(users.username, searchTerm),
            ilike(users.email, searchTerm),
            ilike(users.fullName, searchTerm),
            ilike(users.phoneNumber, searchTerm),
            ilike(users.address, searchTerm),
            ilike(users.city, searchTerm),
            ilike(users.province, searchTerm),
            ilike(users.country, searchTerm),
            ilike(users.role, searchTerm)
          )
        );
      }

      // Role filter
      if (roleFilter && roleFilter !== 'all') {
        conditions.push(eq(users.role, roleFilter));
      }

      // Status filter
      if (statusFilter && statusFilter !== 'all') {
        const isActive = statusFilter === 'active';
        conditions.push(eq(users.isActive, isActive));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const countQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(users);
      
      if (whereClause) {
        countQuery.where(whereClause);
      }

      const [countResult] = await countQuery;
      const total = countResult?.count || 0;

      // Build order by clause
      let orderByClause;
      const order = sortOrder === 'asc' ? asc : desc;
      
      switch (sortBy) {
        case 'username':
          orderByClause = order(users.username);
          break;
        case 'email':
          orderByClause = order(users.email);
          break;
        case 'role':
          orderByClause = order(users.role);
          break;
        case 'isActive':
          orderByClause = order(users.isActive);
          break;
        case 'createdAt':
        default:
          orderByClause = order(users.createdAt);
          break;
      }

      // Get paginated results
      let query = db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          fullName: users.fullName,
          phoneNumber: users.phoneNumber,
          address: users.address,
          city: users.city,
          province: users.province,
          postalCode: users.postalCode,
          country: users.country,
          isActive: users.isActive,
          role: users.role,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          lastLogin: users.lastLogin
        })
        .from(users)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      if (whereClause) {
        query = query.where(whereClause);
      }

      const userResults = await query;

      return { users: userResults, total };
    } catch (error) {
      logger.error("Error getting users with pagination", { error, limit, offset, search, roleFilter, statusFilter });
      throw error;
    }
  }

  /**
   * Get user statistics for admin dashboard
   */
  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    adminUsers: number;
    regularUsers: number;
    recentRegistrations: number;
  }> {
    try {
      // Get total users
      const [totalResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users);
      const totalUsers = totalResult?.count || 0;

      // Get active users
      const [activeResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.isActive, true));
      const activeUsers = activeResult?.count || 0;

      // Get inactive users
      const inactiveUsers = totalUsers - activeUsers;

      // Get admin users
      const [adminResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.role, 'admin'));
      const adminUsers = adminResult?.count || 0;

      // Get regular users
      const regularUsers = totalUsers - adminUsers;

      // Get recent registrations (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const [recentResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(sql`${users.createdAt} >= ${thirtyDaysAgo.toISOString()}`);
      const recentRegistrations = recentResult?.count || 0;

      return {
        totalUsers,
        activeUsers,
        inactiveUsers,
        adminUsers,
        regularUsers,
        recentRegistrations
      };
    } catch (error) {
      logger.error("Error getting user statistics", { error });
      throw error;
    }
  }

  /**
   * Update user information
   */
  async updateUser(userId: number, updateData: {
    username?: string;
    email?: string;
    fullName?: string;
    phoneNumber?: string;
    address?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    country?: string;
    role?: string;
    isActive?: boolean;
  }): Promise<any | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({
          ...updateData,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          username: users.username,
          email: users.email,
          fullName: users.fullName,
          phoneNumber: users.phoneNumber,
          address: users.address,
          city: users.city,
          province: users.province,
          postalCode: users.postalCode,
          country: users.country,
          isActive: users.isActive,
          role: users.role,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          lastLogin: users.lastLogin
        });

      return updatedUser;
    } catch (error) {
      logger.error("Error updating user", { error, userId });
      throw error;
    }
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: number, role: string): Promise<any | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({
          role,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          username: users.username,
          email: users.email,
          fullName: users.fullName,
          phoneNumber: users.phoneNumber,
          address: users.address,
          city: users.city,
          province: users.province,
          postalCode: users.postalCode,
          country: users.country,
          isActive: users.isActive,
          role: users.role,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          lastLogin: users.lastLogin
        });

      return updatedUser;
    } catch (error) {
      logger.error("Error updating user role", { error, userId, role });
      throw error;
    }
  }

  /**
   * Update user status (active/inactive)
   */
  async updateUserStatus(userId: number, isActive: boolean): Promise<any | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({
          isActive,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          username: users.username,
          email: users.email,
          fullName: users.fullName,
          phoneNumber: users.phoneNumber,
          address: users.address,
          city: users.city,
          province: users.province,
          postalCode: users.postalCode,
          country: users.country,
          isActive: users.isActive,
          role: users.role,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          lastLogin: users.lastLogin
        });

      return updatedUser;
    } catch (error) {
      logger.error("Error updating user status", { error, userId, isActive });
      throw error;
    }
  }

  /**
   * Reset user password
   */
  async resetUserPassword(userId: number, newPassword: string): Promise<boolean> {
    try {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await db
        .update(users)
        .set({
          password: hashedPassword,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, userId));

      return true;
    } catch (error) {
      logger.error("Error resetting user password", { error, userId });
      throw error;
    }
  }

  /**
   * Delete user (soft delete by setting isActive to false)
   */
  async deleteUser(userId: number): Promise<boolean> {
    try {
      const [result] = await db
        .update(users)
        .set({
          isActive: false,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, userId))
        .returning({ id: users.id });

      return !!result;
    } catch (error) {
      logger.error("Error deleting user", { error, userId });
      throw error;
    }
  }

  // System Settings operations
  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    try {
      const [setting] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.settingKey, key));
      
      return setting;
    } catch (error) {
      logger.error('Error getting system setting', { error, key });
      throw error;
    }
  }

  async getAllSystemSettings(): Promise<SystemSetting[]> {
    try {
      const settings = await db
        .select()
        .from(systemSettings)
        .orderBy(asc(systemSettings.key));
      
      return settings;
    } catch (error) {
      logger.error('Error getting all system settings', { error });
      throw error;
    }
  }

  async updateSystemSetting(key: string, value: string): Promise<SystemSetting | undefined> {
    try {
      const [updatedSetting] = await db
        .update(systemSettings)
        .set({ 
          settingValue: value,
          updatedAt: new Date().toISOString()
        })
        .where(eq(systemSettings.settingKey, key))
        .returning();

      logger.info('System setting updated', { key, value });
      return updatedSetting;
    } catch (error) {
      logger.error('Error updating system setting', { error, key, value });
      throw error;
    }
  }

  async createSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting> {
    try {
      const [createdSetting] = await db
        .insert(systemSettings)
        .values(setting)
        .returning();

      logger.info('System setting created', { key: setting.key, value: setting.value });
      return createdSetting;
    } catch (error) {
      logger.error('Error creating system setting', { error, setting });
      throw error;
    }
  }

  // =============================================================================
  // EMAIL TOKEN OPERATIONS
  // =============================================================================

  async createToken(tokenData: InsertMailToken): Promise<MailToken> {
    try {
      const [token] = await db
        .insert(mailTokens)
        .values(tokenData)
        .returning();

      logger.info('Email token created', { 
        tokenType: tokenData.tokenType, 
        userId: tokenData.userId,
        email: tokenData.email 
      });
      return token;
    } catch (error) {
      logger.error('Error creating email token', { error, tokenData });
      throw error;
    }
  }

  async getToken(hashedToken: string): Promise<MailToken | undefined> {
    try {
      const [token] = await db
        .select()
        .from(mailTokens)
        .where(eq(mailTokens.hashedToken, hashedToken));

      return token;
    } catch (error) {
      logger.error('Error getting email token', { error, hashedToken: hashedToken.substring(0, 10) + '...' });
      throw error;
    }
  }

  async useToken(hashedToken: string): Promise<boolean> {
    try {
      const [updatedToken] = await db
        .update(mailTokens)
        .set({ 
          usedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .where(eq(mailTokens.hashedToken, hashedToken))
        .returning();

      if (updatedToken) {
        logger.info('Email token marked as used', { 
          tokenType: updatedToken.tokenType, 
          userId: updatedToken.userId 
        });
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error marking token as used', { error, hashedToken: hashedToken.substring(0, 10) + '...' });
      throw error;
    }
  }

  async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await db
        .delete(mailTokens)
        .where(lt(mailTokens.expiresAt, new Date()));

      logger.info('Cleaned up expired email tokens', { deletedCount: result.rowCount || 0 });
      return result.rowCount || 0;
    } catch (error) {
      logger.error('Error cleaning up expired tokens', { error });
      throw error;
    }
  }

  async logEmail(emailData: InsertEmailLog): Promise<EmailLog> {
    try {
      const [emailLog] = await db
        .insert(emailLogs)
        .values(emailData)
        .returning();

      logger.info('Email logged', { 
        emailType: emailData.emailType, 
        recipientEmail: emailData.recipientEmail,
        userId: emailData.userId 
      });
      return emailLog;
    } catch (error) {
      logger.error('Error logging email', { error, emailData });
      throw error;
    }
  }

  async getEmailLogs(filters?: {
    userId?: number;
    emailType?: string;
    recipientEmail?: string;
    limit?: number;
  }): Promise<EmailLog[]> {
    try {
      let query = db.select().from(emailLogs);

      if (filters?.userId) {
        query = query.where(eq(emailLogs.userId, filters.userId));
      }
      if (filters?.emailType) {
        query = query.where(eq(emailLogs.emailType, filters.emailType));
      }
      if (filters?.recipientEmail) {
        query = query.where(eq(emailLogs.recipientEmail, filters.recipientEmail));
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const logs = await query.orderBy(desc(emailLogs.sentAt));
      
      logger.info('Retrieved email logs', { 
        count: logs.length, 
        filters 
      });
      return logs;
    } catch (error) {
      logger.error('Error getting email logs', { error, filters });
      throw error;
    }
  }

  // =============================================================================
  // FAVOURITES OPERATIONS
  // =============================================================================

  async addToFavourites(userId: number, productId: number): Promise<UserFavourite> {
    try {
      const [favourite] = await db
        .insert(userFavourites)
        .values({
          userId,
          productId,
          createdAt: new Date().toISOString()
        })
        .returning();

      logger.info('Product added to favourites', { userId, productId });
      return favourite;
    } catch (error) {
      logger.error('Error adding to favourites', { error, userId, productId });
      throw error;
    }
  }

  async removeFromFavourites(userId: number, productId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(userFavourites)
        .where(and(
          eq(userFavourites.userId, userId),
          eq(userFavourites.productId, productId)
        ));

      logger.info('Product removed from favourites', { userId, productId });
      return true;
    } catch (error) {
      logger.error('Error removing from favourites', { error, userId, productId });
      return false;
    }
  }

  async getUserFavourites(userId: number): Promise<UserFavourite[]> {
    try {
      return await db
        .select()
        .from(userFavourites)
        .where(eq(userFavourites.userId, userId))
        .orderBy(desc(userFavourites.createdAt));
    } catch (error) {
      logger.error('Error getting user favourites', { error, userId });
      throw error;
    }
  }

  async getUserFavouritesWithProducts(userId: number): Promise<any[]> {
    try {
      const favourites = await db
        .select({
          id: userFavourites.id,
          userId: userFavourites.userId,
          productId: userFavourites.productId,
          createdAt: userFavourites.createdAt,
          product: {
            id: products.id,
            name: products.name,
            slug: products.slug,
            price: products.price,
            salePrice: products.salePrice,
            imageUrl: products.imageUrl,
            isActive: products.isActive,
            isFeatured: products.isFeatured,
            rating: products.rating,
            reviewCount: products.reviewCount,
            description: products.description,
            brand: products.brand,
          }
        })
        .from(userFavourites)
        .innerJoin(products, eq(userFavourites.productId, products.id))
        .where(eq(userFavourites.userId, userId))
        .orderBy(desc(userFavourites.createdAt));

      // Filter out favourites where product is null (shouldn't happen with inner join, but safety check)
      const validFavourites = favourites.filter(fav => fav.product && fav.product.id);

      logger.info('Retrieved user favourites with products', { 
        userId, 
        totalFavourites: favourites.length,
        validFavourites: validFavourites.length
      });

      return validFavourites;
    } catch (error) {
      logger.error('Error getting user favourites with products', { error, userId });
      throw error;
    }
  }

  async isProductFavourited(userId: number, productId: number): Promise<boolean> {
    try {
      const result = await db
        .select({ id: userFavourites.id })
        .from(userFavourites)
        .where(and(
          eq(userFavourites.userId, userId),
          eq(userFavourites.productId, productId)
        ))
        .limit(1);

      return result.length > 0;
    } catch (error) {
      logger.error('Error checking if product is favourited', { error, userId, productId });
      return false;
    }
  }

  async getFavouriteCount(productId: number): Promise<number> {
    try {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(userFavourites)
        .where(eq(userFavourites.productId, productId));

      return result[0]?.count || 0;
    } catch (error) {
      logger.error('Error getting favourite count', { error, productId });
      return 0;
    }
  }

  async getMostFavouritedProducts(limit: number = 10): Promise<any[]> {
    try {
      const favouritedProducts = await db
        .select({
          product: {
            id: products.id,
            name: products.name,
            slug: products.slug,
            price: products.price,
            salePrice: products.salePrice,
            imageUrl: products.imageUrl,
            rating: products.rating,
            reviewCount: products.reviewCount,
          },
          favouriteCount: sql<number>`count(${userFavourites.id})`
        })
        .from(products)
        .leftJoin(userFavourites, eq(products.id, userFavourites.productId))
        .where(eq(products.isActive, true))
        .groupBy(products.id)
        .orderBy(desc(sql`count(${userFavourites.id})`))
        .limit(limit);

      return favouritedProducts;
    } catch (error) {
      logger.error('Error getting most favourited products', { error, limit });
      throw error;
    }
  }

  // =============================================================================
  // PRODUCT INTERACTIONS OPERATIONS
  // =============================================================================

  async logProductInteraction(interaction: InsertProductInteraction): Promise<ProductInteraction> {
    try {
      const [logged] = await db
        .insert(productInteractions)
        .values({
          ...interaction,
          createdAt: new Date().toISOString()
        })
        .returning();

      return logged;
    } catch (error) {
      logger.error('Error logging product interaction', { error, interaction });
      throw error;
    }
  }

  async getProductInteractions(productId: number, interactionType?: string, limit: number = 100): Promise<ProductInteraction[]> {
    try {
      let query = db
        .select()
        .from(productInteractions)
        .where(eq(productInteractions.productId, productId));

      if (interactionType) {
        query = query.where(and(
          eq(productInteractions.productId, productId),
          eq(productInteractions.interactionType, interactionType)
        ));
      }

      return await query
        .orderBy(desc(productInteractions.createdAt))
        .limit(limit);
    } catch (error) {
      logger.error('Error getting product interactions', { error, productId, interactionType });
      throw error;
    }
  }

  async getUserInteractions(userId: number, interactionType?: string, limit: number = 100): Promise<ProductInteraction[]> {
    try {
      let query = db
        .select()
        .from(productInteractions)
        .where(eq(productInteractions.userId, userId));

      if (interactionType) {
        query = query.where(and(
          eq(productInteractions.userId, userId),
          eq(productInteractions.interactionType, interactionType)
        ));
      }

      return await query
        .orderBy(desc(productInteractions.createdAt))
        .limit(limit);
    } catch (error) {
      logger.error('Error getting user interactions', { error, userId, interactionType });
      throw error;
    }
  }

  async getProductViewCount(productId: number, dateRange?: { from: string; to: string }): Promise<number> {
    try {
      let query = db
        .select({ count: sql<number>`count(*)` })
        .from(productInteractions)
        .where(and(
          eq(productInteractions.productId, productId),
          eq(productInteractions.interactionType, 'view')
        ));

      if (dateRange) {
        query = query.where(and(
          eq(productInteractions.productId, productId),
          eq(productInteractions.interactionType, 'view'),
          gte(productInteractions.createdAt, dateRange.from),
          lte(productInteractions.createdAt, dateRange.to)
        ));
      }

      const result = await query;
      return result[0]?.count || 0;
    } catch (error) {
      logger.error('Error getting product view count', { error, productId, dateRange });
      return 0;
    }
  }

  async getPopularProducts(limit: number = 10, dateRange?: { from: string; to: string }): Promise<any[]> {
    try {
      let query = db
        .select({
          product: {
            id: products.id,
            name: products.name,
            slug: products.slug,
            price: products.price,
            salePrice: products.salePrice,
            imageUrl: products.imageUrl,
            rating: products.rating,
            reviewCount: products.reviewCount,
          },
          viewCount: sql<number>`count(${productInteractions.id})`
        })
        .from(products)
        .leftJoin(productInteractions, and(
          eq(products.id, productInteractions.productId),
          eq(productInteractions.interactionType, 'view')
        ))
        .where(eq(products.isActive, true));

      if (dateRange) {
        query = query.where(and(
          eq(products.isActive, true),
          gte(productInteractions.createdAt, dateRange.from),
          lte(productInteractions.createdAt, dateRange.to)
        ));
      }

      return await query
        .groupBy(products.id)
        .orderBy(desc(sql`count(${productInteractions.id})`))
        .limit(limit);
    } catch (error) {
      logger.error('Error getting popular products', { error, limit, dateRange });
      throw error;
    }
  }

  async getInteractionAnalytics(dateRange?: { from: string; to: string }): Promise<any> {
    try {
      let baseQuery = db
        .select({
          interactionType: productInteractions.interactionType,
          count: sql<number>`count(*)`
        })
        .from(productInteractions);

      if (dateRange) {
        baseQuery = baseQuery.where(and(
          gte(productInteractions.createdAt, dateRange.from),
          lte(productInteractions.createdAt, dateRange.to)
        ));
      }

      const analytics = await baseQuery
        .groupBy(productInteractions.interactionType)
        .orderBy(desc(sql`count(*)`));

      return {
        interactionsByType: analytics,
        dateRange: dateRange || null
      };
    } catch (error) {
      logger.error('Error getting interaction analytics', { error, dateRange });
      throw error;
    }
  }

  // =============================================================================
  // ABANDONED CART OPERATIONS
  // =============================================================================

  async createAbandonedCart(cart: InsertAbandonedCart): Promise<AbandonedCart> {
    try {
      const [created] = await db
        .insert(abandonedCarts)
        .values({
          ...cart,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .returning();

      logger.info('Abandoned cart created', { sessionId: cart.sessionId, userId: cart.userId });
      return created;
    } catch (error) {
      logger.error('Error creating abandoned cart', { error, cart });
      throw error;
    }
  }

  async getAbandonedCarts(userId?: number, emailSent?: boolean): Promise<AbandonedCart[]> {
    try {
      let conditions = [];

      if (userId !== undefined) {
        conditions.push(eq(abandonedCarts.userId, userId));
      }

      if (emailSent !== undefined) {
        conditions.push(eq(abandonedCarts.emailSent, emailSent));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      let query = db
        .select()
        .from(abandonedCarts)
        .orderBy(desc(abandonedCarts.createdAt));

      if (whereClause) {
        query = query.where(whereClause);
      }

      return await query;
    } catch (error) {
      logger.error('Error getting abandoned carts', { error, userId, emailSent });
      throw error;
    }
  }

  async updateAbandonedCart(id: number, updates: Partial<InsertAbandonedCart>): Promise<AbandonedCart | undefined> {
    try {
      const [updated] = await db
        .update(abandonedCarts)
        .set({
          ...updates,
          updatedAt: new Date().toISOString()
        })
        .where(eq(abandonedCarts.id, id))
        .returning();

      logger.info('Abandoned cart updated', { id, updates });
      return updated;
    } catch (error) {
      logger.error('Error updating abandoned cart', { error, id, updates });
      return undefined;
    }
  }

  async markCartRecovered(id: number): Promise<boolean> {
    try {
      await db
        .update(abandonedCarts)
        .set({
          recoveredAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .where(eq(abandonedCarts.id, id));

      logger.info('Cart marked as recovered', { id });
      return true;
    } catch (error) {
      logger.error('Error marking cart as recovered', { error, id });
      return false;
    }
  }

  async getAbandonedCartAnalytics(dateRange?: { from: string; to: string }): Promise<any> {
    try {
      let baseQuery = db
        .select({
          totalCarts: sql<number>`count(*)`,
          emailsSent: sql<number>`count(*) filter (where ${abandonedCarts.emailSent} = true)`,
          cartsRecovered: sql<number>`count(*) filter (where ${abandonedCarts.recoveredAt} is not null)`,
          discountsApplied: sql<number>`count(*) filter (where ${abandonedCarts.discountApplied} = true)`
        })
        .from(abandonedCarts);

      if (dateRange) {
        baseQuery = baseQuery.where(and(
          gte(abandonedCarts.createdAt, dateRange.from),
          lte(abandonedCarts.createdAt, dateRange.to)
        ));
      }

      const analytics = await baseQuery;

      return {
        ...analytics[0],
        recoveryRate: analytics[0].totalCarts > 0 
          ? (analytics[0].cartsRecovered / analytics[0].totalCarts * 100).toFixed(2)
          : 0,
        emailResponseRate: analytics[0].emailsSent > 0
          ? (analytics[0].cartsRecovered / analytics[0].emailsSent * 100).toFixed(2)
          : 0,
        dateRange: dateRange || null
      };
    } catch (error) {
      logger.error('Error getting abandoned cart analytics', { error, dateRange });
      throw error;
    }
  }

  // Credit System implementations

  async checkShippingExemptionForCredits(userId: number, creditAmount: number): Promise<boolean> {
    try {
      // Get credit transactions that would be used (most recent earned credits first)
      const creditTransactionsList = await db
        .select()
        .from(creditTransactions)
        .where(
          and(
            eq(creditTransactions.userId, userId),
            eq(creditTransactions.transactionType, 'earned'),
            // Only consider credits that have an associated order (from unavailable items)
            sql`${creditTransactions.orderId} IS NOT NULL`
          )
        )
        .orderBy(desc(creditTransactions.createdAt));

      let remainingCreditToCheck = creditAmount;
      
      // Check each credit transaction to see if it came from an unshipped order
      for (const transaction of creditTransactionsList) {
        if (remainingCreditToCheck <= 0) break;
        
        const transactionAmount = parseFloat(transaction.amount);
        const creditToUse = Math.min(remainingCreditToCheck, transactionAmount);
        
        // Get the original order details
        if (transaction.orderId) {
          const [order] = await db
            .select()
            .from(orders)
            .where(eq(orders.id, transaction.orderId));
            
          // If the order hasn't been shipped yet, user gets shipping exemption
          if (order && order.status !== 'shipped' && order.status !== 'delivered') {
            logger.info("Shipping exemption granted - credit from unshipped order", {
              userId,
              orderId: order.id,
              orderStatus: order.status,
              creditAmount: creditToUse
            });
            return true;
          }
        }
        
        remainingCreditToCheck -= creditToUse;
      }
      
      logger.info("No shipping exemption - all credits from shipped orders", {
        userId,
        creditAmount
      });
      return false;
    } catch (error) {
      logger.error("Error checking shipping exemption for credits", {
        error,
        userId,
        creditAmount
      });
      return false;
    }
  }

  async getUserCreditBalance(userId: number): Promise<CustomerCredit> {
    try {
      // Calculate actual balance from all credit transactions
      const transactions = await db
        .select()
        .from(creditTransactions)
        .where(eq(creditTransactions.userId, userId));

      let totalEarned = 0;
      let totalUsed = 0;

      for (const transaction of transactions) {
        const amount = parseFloat(transaction.amount);
        if (transaction.transactionType === 'earned') {
          totalEarned += amount;
        } else if (transaction.transactionType === 'used') {
          totalUsed += amount;
        }
      }

      const totalCreditAmount = totalEarned;
      const availableCreditAmount = totalEarned - totalUsed;

      // Get or create customer credit record
      let [existingCredit] = await db
        .select()
        .from(customerCredits)
        .where(eq(customerCredits.userId, userId));

      if (!existingCredit) {
        // Create new credit record
        [existingCredit] = await db
          .insert(customerCredits)
          .values({
            userId,
            totalCreditAmount: totalCreditAmount.toString(),
            availableCreditAmount: availableCreditAmount.toString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .returning();
      } else {
        // Update existing record with calculated values
        [existingCredit] = await db
          .update(customerCredits)
          .set({
            totalCreditAmount: totalCreditAmount.toString(),
            availableCreditAmount: availableCreditAmount.toString(),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(customerCredits.userId, userId))
          .returning();
      }

      logger.info('Calculated user credit balance from transactions', {
        userId,
        totalEarned,
        totalUsed,
        totalCreditAmount,
        availableCreditAmount,
        transactionCount: transactions.length
      });

      return existingCredit;
    } catch (error) {
      logger.error('Error getting user credit balance', { error, userId });
      throw error;
    }
  }

  async getUserCreditTransactions(userId: number, limit: number = 20, offset: number = 0): Promise<CreditTransaction[]> {
    try {
      const transactions = await db
        .select()
        .from(creditTransactions)
        .where(eq(creditTransactions.userId, userId))
        .orderBy(desc(creditTransactions.createdAt))
        .limit(limit)
        .offset(offset);

      return transactions;
    } catch (error) {
      logger.error('Error getting user credit transactions', { error, userId, limit, offset });
      throw error;
    }
  }

  async addUserCredits(userId: number, amount: number, description: string, orderId?: number): Promise<CreditTransaction> {
    try {
      // Start transaction to ensure data consistency
      return await db.transaction(async (tx) => {
        // Create transaction record first
        const [transaction] = await tx
          .insert(creditTransactions)
          .values({
            userId,
            orderId,
            transactionType: 'earned',
            amount: amount.toString(),
            description,
            createdAt: new Date().toISOString(),
          })
          .returning();

        // Calculate new balance from all transactions
        const transactions = await tx
          .select()
          .from(creditTransactions)
          .where(eq(creditTransactions.userId, userId));

        let totalEarned = 0;
        let totalUsed = 0;

        for (const trans of transactions) {
          const transAmount = parseFloat(trans.amount);
          if (trans.transactionType === 'earned') {
            totalEarned += transAmount;
          } else if (trans.transactionType === 'used') {
            totalUsed += transAmount;
          }
        }

        const totalCreditAmount = totalEarned;
        const availableCreditAmount = totalEarned - totalUsed;

        // Update or create customer credit record with calculated balance
        let [customerCredit] = await tx
          .select()
          .from(customerCredits)
          .where(eq(customerCredits.userId, userId));

        if (!customerCredit) {
          // Create new credit record
          await tx
            .insert(customerCredits)
            .values({
              userId,
              totalCreditAmount: totalCreditAmount.toString(),
              availableCreditAmount: availableCreditAmount.toString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
        } else {
          // Update existing credit record with calculated values
          await tx
            .update(customerCredits)
            .set({
              totalCreditAmount: totalCreditAmount.toString(),
              availableCreditAmount: availableCreditAmount.toString(),
              updatedAt: new Date().toISOString(),
            })
            .where(eq(customerCredits.userId, userId));
        }

        logger.info('Credit earned and balance updated', {
          userId,
          amount,
          description,
          orderId,
          newTotalEarned: totalEarned,
          newAvailableBalance: availableCreditAmount,
          transactionId: transaction.id
        });

        return transaction;
      });
    } catch (error) {
      logger.error('Error adding user credits', { error, userId, amount, description, orderId });
      throw error;
    }
  }

  async useUserCredits(userId: number, amount: number, description: string, orderId: number): Promise<CreditTransaction> {
    try {
      return await db.transaction(async (tx) => {
        // Get current balance by calculating from transactions
        const transactions = await tx
          .select()
          .from(creditTransactions)
          .where(eq(creditTransactions.userId, userId));

        let totalEarned = 0;
        let totalUsed = 0;

        for (const transaction of transactions) {
          const transactionAmount = parseFloat(transaction.amount);
          if (transaction.transactionType === 'earned') {
            totalEarned += transactionAmount;
          } else if (transaction.transactionType === 'used') {
            totalUsed += transactionAmount;
          }
        }

        const availableCredits = totalEarned - totalUsed;

        if (availableCredits < amount) {
          throw new Error(`Insufficient credit balance. Available: R${availableCredits.toFixed(2)}, Requested: R${amount.toFixed(2)}`);
        }

        // Create transaction record for the credit usage
        const [transaction] = await tx
          .insert(creditTransactions)
          .values({
            userId,
            orderId,
            transactionType: 'used',
            amount: amount.toString(),
            description,
            createdAt: new Date().toISOString(),
          })
          .returning();

        // Update the customer credits table with new calculated balance
        const newUsedAmount = totalUsed + amount;
        const newAvailableCredits = totalEarned - newUsedAmount;

        await tx
          .update(customerCredits)
          .set({
            totalCreditAmount: totalEarned.toString(),
            availableCreditAmount: newAvailableCredits.toString(),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(customerCredits.userId, userId));

        logger.info('Credit usage processed successfully', {
          userId,
          amount,
          description,
          orderId,
          previousAvailable: availableCredits,
          newAvailable: newAvailableCredits,
          totalEarned,
          totalUsed: newUsedAmount
        });

        return transaction;
      });
    } catch (error) {
      logger.error('Error using user credits', { error, userId, amount, description, orderId });
      throw error;
    }
  }

  async createOrUpdateCustomerCredit(userId: number): Promise<CustomerCredit> {
    try {
      // Try to get existing record first
      const [existingCredit] = await db
        .select()
        .from(customerCredits)
        .where(eq(customerCredits.userId, userId));

      if (existingCredit) {
        return existingCredit;
      }

      // Create new credit record with zero balance
      const [newCredit] = await db
        .insert(customerCredits)
        .values({
          userId,
          totalCreditAmount: '0',
          availableCreditAmount: '0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .returning();

      return newCredit;
    } catch (error) {
      logger.error('Error creating or updating customer credit', { error, userId });
      throw error;
    }
  }

  async getOrderItemById(orderItemId: number): Promise<(OrderItem & { order?: Order }) | undefined> {
    try {
      const [orderItem] = await db
        .select({
          id: orderItems.id,
          orderId: orderItems.orderId,
          productId: orderItems.productId,
          productName: orderItems.productName,
          productSku: orderItems.productSku,
          productImageUrl: orderItems.productImageUrl,
          quantity: orderItems.quantity,
          unitPrice: orderItems.unitPrice,
          totalPrice: orderItems.totalPrice,
          selectedAttributes: orderItems.selectedAttributes,
          attributeDisplayText: orderItems.attributeDisplayText,
          createdAt: orderItems.createdAt,
          // Join order details
          order: {
            id: orders.id,
            userId: orders.userId,
            orderNumber: orders.orderNumber,
            status: orders.status,
            customerName: orders.customerName,
            customerEmail: orders.customerEmail,
            customerPhone: orders.customerPhone,
            shippingAddress: orders.shippingAddress,
            shippingCity: orders.shippingCity,
            shippingPostalCode: orders.shippingPostalCode,
            shippingMethod: orders.shippingMethod,
            shippingCost: orders.shippingCost,
            paymentMethod: orders.paymentMethod,
            paymentStatus: orders.paymentStatus,
            paymentReceivedDate: orders.paymentReceivedDate,
            subtotalAmount: orders.subtotalAmount,
            totalAmount: orders.totalAmount,
            creditUsed: orders.creditUsed,
            remainingBalance: orders.remainingBalance,
            customerNotes: orders.customerNotes,
            adminNotes: orders.adminNotes,
            trackingNumber: orders.trackingNumber,
            createdAt: orders.createdAt,
            updatedAt: orders.updatedAt,
            shippedAt: orders.shippedAt,
            deliveredAt: orders.deliveredAt,
            eftPop: orders.eftPop,
          },
        })
        .from(orderItems)
        .leftJoin(orders, eq(orderItems.orderId, orders.id))
        .where(eq(orderItems.id, orderItemId));

      return orderItem || undefined;
    } catch (error) {
      logger.error('Error getting order item by ID', { error, orderItemId });
      throw error;
    }
  }

  // Supplier Order Management Methods for Credit System
  async createSupplierOrder(supplierOrderData: InsertSupplierOrder): Promise<SupplierOrder> {
    try {
      const [created] = await db
        .insert(supplierOrders)
        .values({
          ...supplierOrderData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .returning();

      logger.info('Supplier order created', { supplierOrderId: created.id });
      return created;
    } catch (error) {
      logger.error('Error creating supplier order', { error, supplierOrderData });
      throw error;
    }
  }

  async getSupplierOrderById(supplierOrderId: number): Promise<SupplierOrder | undefined> {
    try {
      const [supplierOrder] = await db
        .select()
        .from(supplierOrders)
        .where(eq(supplierOrders.id, supplierOrderId));

      return supplierOrder || undefined;
    } catch (error) {
      logger.error('Error getting supplier order by ID', { error, supplierOrderId });
      throw error;
    }
  }

  async getSupplierOrdersByOrderId(orderId: number): Promise<any[]> {
    try {
      // Get supplier orders for a specific order ID
      const results = await this.getOrderItemsForSupplierManagement({ orderId });
      return results;
    } catch (error) {
      logger.error('Error getting supplier orders by order ID', { error, orderId });
      throw error;
    }
  }

  async getOrderItemsForSupplierManagement(filters?: { 
    status?: string; 
    orderId?: number;
    search?: string;
  }): Promise<any[]> {
    try {
      // Get order items from paid orders with their supplier status and draft URLs
      const query = db
        .select({
          orderItem: orderItems,
          order: orders,
          product: products,
          supplierStatus: orderItemSupplierStatus,
          productDraft: productDrafts,
          creditTransaction: creditTransactions,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .innerJoin(products, eq(orderItems.productId, products.id))
        .leftJoin(orderItemSupplierStatus, eq(orderItems.id, orderItemSupplierStatus.orderItemId))
        .leftJoin(productDrafts, eq(productDrafts.sku, products.sku))
        .leftJoin(creditTransactions, eq(creditTransactions.supplierOrderId, orderItems.id))
        .where(
          and(
            eq(orders.paymentStatus, 'payment_received'),
            ...(filters?.orderId ? [eq(orders.id, filters.orderId)] : []),
            // Handle status filtering at database level
            ...(filters?.status && filters.status !== 'pending' ? 
              [eq(orderItemSupplierStatus.supplierStatus, filters.status)] : []),
            // For pending status, we want items WITHOUT supplier status entries
            ...(filters?.status === 'pending' ? 
              [isNull(orderItemSupplierStatus.supplierStatus)] : [])
          )
        )
        .orderBy(desc(orders.createdAt));

      const results = await query;
      
      // Map the raw results to structured objects
      const mappedResults = results.map(row => ({
        id: row.orderItem.id,
        orderId: row.order.id,
        productId: row.product.id,
        productName: row.orderItem.productName || row.product.name,
        supplierUrl: row.productDraft?.supplierUrl || row.product.supplier || '', // Use actual product URL from drafts
        quantity: row.orderItem.quantity,
        unitCost: row.product.costPrice || row.orderItem.unitPrice, // Use product costPrice instead of order unitPrice
        totalCost: row.product.costPrice ? 
          (parseFloat(row.product.costPrice.toString()) * row.orderItem.quantity).toFixed(2) : 
          row.orderItem.totalPrice, // Calculate total using costPrice
        status: row.supplierStatus?.supplierStatus || 'pending',
        supplierOrderNumber: row.supplierStatus?.supplierOrderNumber || '',
        orderDate: row.supplierStatus?.supplierOrderDate || '',
        expectedDelivery: '',
        notes: row.supplierStatus?.adminNotes || '',
        urlValidationStatus: 'pending',
        urlLastChecked: '',
        createdAt: row.order.createdAt,
        updatedAt: row.supplierStatus?.createdAt || row.order.createdAt,
        hasCreditGenerated: !!row.creditTransaction, // Check if credit transaction exists
        customerOrder: {
          id: row.order.id,
          orderNumber: row.order.orderNumber,
          customerName: row.order.customerName,
          createdAt: row.order.createdAt,
          status: row.order.status,
          trackingNumber: row.order.trackingNumber,
        },
        product: {
          id: row.product.id,
          name: row.product.name,
          imageUrl: row.product.imageUrl,
          price: row.product.price,
          costPrice: row.product.costPrice, // Include costPrice in product data
          sku: row.product.sku,
          supplierAvailable: true,
          actualSupplierUrl: row.productDraft?.supplierUrl, // Include the actual URL from drafts
        },
        customerUnitPrice: row.orderItem.unitPrice, // Add the actual price customer paid
      }));

      // Apply case-insensitive search filtering across all order information
      if (filters?.search && filters.search.trim()) {
        const searchTerm = filters.search.toLowerCase().trim();
        
        return mappedResults.filter(item => {
          // Search across all relevant fields with case-insensitive partial matching
          const searchableFields = [
            item.customerOrder.orderNumber,           // Order number (e.g., TMY-35-20250627)
            item.customerOrder.customerName,          // Customer name
            item.productName,                         // Product name
            item.product.name,                        // Product name (alternative)
            item.product.sku,                        // Product SKU
            item.supplierOrderNumber,                // Supplier order number
            item.notes,                              // Admin notes
            item.status,                             // Order status
            item.customerOrder.status,               // Customer order status
            item.customerOrder.trackingNumber,       // Tracking number
            item.orderDate,                          // Order date
            item.supplierUrl,                        // Supplier URL
          ].filter(Boolean); // Remove null/undefined values

          // Check if search term matches any field (partial, case-insensitive)
          return searchableFields.some(field => 
            field && field.toString().toLowerCase().includes(searchTerm)
          );
        });
      }

      return mappedResults;
    } catch (error) {
      logger.error('Error getting order items for supplier management', { error, filters });
      throw error;
    }
  }

  async updateSupplierOrder(supplierOrderId: number, updates: Partial<InsertSupplierOrder>): Promise<SupplierOrder | undefined> {
    try {
      const [updated] = await db
        .update(supplierOrders)
        .set({
          ...updates,
          updatedAt: new Date().toISOString()
        })
        .where(eq(supplierOrders.id, supplierOrderId))
        .returning();

      logger.info('Supplier order updated', { supplierOrderId, updates });
      return updated;
    } catch (error) {
      logger.error('Error updating supplier order', { error, supplierOrderId, updates });
      throw error;
    }
  }

  async updateUserCreditBalance(userId: number, newBalance: number): Promise<boolean> {
    try {
      await db
        .update(users)
        .set({ creditBalance: newBalance })
        .where(eq(users.id, userId));

      logger.info('User credit balance updated', { userId, newBalance });
      return true;
    } catch (error) {
      logger.error('Error updating user credit balance', { error, userId, newBalance });
      throw error;
    }
  }

  async createCreditTransaction(transactionData: InsertCreditTransaction): Promise<CreditTransaction> {
    try {
      const [created] = await db
        .insert(creditTransactions)
        .values({
          ...transactionData,
          createdAt: new Date().toISOString()
        })
        .returning();

      logger.info('Credit transaction created', { transactionId: created.id });
      return created;
    } catch (error) {
      logger.error('Error creating credit transaction', { error, transactionData });
      throw error;
    }
  }

  async getCreditTransactionBySupplierOrder(supplierOrderId: number): Promise<CreditTransaction | undefined> {
    try {
      const [transaction] = await db
        .select()
        .from(creditTransactions)
        .where(eq(creditTransactions.supplierOrderId, supplierOrderId));

      return transaction || undefined;
    } catch (error) {
      logger.error('Error getting credit transaction by supplier order', { error, supplierOrderId });
      throw error;
    }
  }

  // Order Item Supplier Status Management for Credit System
  async updateOrderItemSupplierStatus(orderItemId: number, statusData: Partial<InsertOrderItemSupplierStatus>): Promise<OrderItemSupplierStatus> {
    try {
      // First check if a record exists
      const [existing] = await db
        .select()
        .from(orderItemSupplierStatus)
        .where(eq(orderItemSupplierStatus.orderItemId, orderItemId));

      if (existing) {
        // Update existing record
        const [updated] = await db
          .update(orderItemSupplierStatus)
          .set({
            ...statusData,
            updatedAt: new Date().toISOString()
          })
          .where(eq(orderItemSupplierStatus.orderItemId, orderItemId))
          .returning();

        logger.info('Order item supplier status updated', { orderItemId, statusData });
        return updated;
      } else {
        // Get the order item to extract orderId and productId (required fields)
        const [orderItem] = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.id, orderItemId));

        if (!orderItem) {
          throw new Error(`Order item with ID ${orderItemId} not found`);
        }

        // Create new record with required fields
        const [created] = await db
          .insert(orderItemSupplierStatus)
          .values({
            orderItemId,
            orderId: orderItem.orderId,
            productId: orderItem.productId,
            ...statusData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
          .returning();

        logger.info('Order item supplier status created', { orderItemId, statusData });
        return created;
      }
    } catch (error) {
      logger.error('Error updating order item supplier status', { error, orderItemId, statusData });
      throw error;
    }
  }

  async getOrderItemSupplierStatus(orderItemId: number): Promise<OrderItemSupplierStatus | undefined> {
    try {
      const [status] = await db
        .select()
        .from(orderItemSupplierStatus)
        .where(eq(orderItemSupplierStatus.orderItemId, orderItemId));

      return status || undefined;
    } catch (error) {
      logger.error('Error getting order item supplier status', { error, orderItemId });
      throw error;
    }
  }

  // Notification Management for Credit System
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    try {
      const [created] = await db
        .insert(notifications)
        .values({
          ...notificationData,
          createdAt: new Date().toISOString()
        })
        .returning();

      logger.info('Notification created', { notificationId: created.id, userId: created.userId });
      return created;
    } catch (error) {
      logger.error('Error creating notification', { error, notificationData });
      throw error;
    }
  }

  async getUserNotifications(userId: number, unreadOnly: boolean = false): Promise<Notification[]> {
    try {
      let query = db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId));

      if (unreadOnly) {
        query = query.where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        ));
      }

      return await query.orderBy(desc(notifications.createdAt));
    } catch (error) {
      logger.error('Error getting user notifications', { error, userId, unreadOnly });
      throw error;
    }
  }

  async markNotificationRead(notificationId: number): Promise<boolean> {
    try {
      await db
        .update(notifications)
        .set({ 
          isRead: true,
          readAt: new Date().toISOString()
        })
        .where(eq(notifications.id, notificationId));

      logger.info('Notification marked as read', { notificationId });
      return true;
    } catch (error) {
      logger.error('Error marking notification as read', { error, notificationId });
      return false;
    }
  }

  async markAllNotificationsRead(userId: number): Promise<boolean> {
    try {
      await db
        .update(notifications)
        .set({ 
          isRead: true,
          readAt: new Date().toISOString()
        })
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        ));

      logger.info('All notifications marked as read', { userId });
      return true;
    } catch (error) {
      logger.error('Error marking all notifications as read', { error, userId });
      return false;
    }
  }

  // ============================================================================
  // PUDO LOCKER OPERATIONS
  // ============================================================================

  async getAllPudoLockers(): Promise<PudoLocker[]> {
    try {
      const lockers = await this.db
        .select()
        .from(pudoLockers)
        .where(eq(pudoLockers.isActive, true))
        .orderBy(pudoLockers.name);

      return lockers;
    } catch (error) {
      logger.error('Error fetching all PUDO lockers', { error });
      throw error;
    }
  }

  async searchPudoLockers(query: string, province?: string, city?: string): Promise<PudoLocker[]> {
    try {
      let whereConditions = [eq(pudoLockers.isActive, true)];

      if (query && query.trim()) {
        // Parse query for AND/OR operators
        const normalizedQuery = query.trim().toLowerCase();
        
        if (normalizedQuery.includes(' and ') || normalizedQuery.includes(' or ')) {
          // Complex query with explicit AND/OR operators
          let searchCondition = this.parseComplexQuery(query);
          if (searchCondition) {
            whereConditions.push(searchCondition);
          }
        } else {
          // Intelligent keyword search
          const keywords = query.trim().split(/\s+/).filter(k => k.length > 0);
          
          if (keywords.length === 1) {
            // Single keyword search - search across all columns
            const keyword = keywords[0];
            whereConditions.push(
              or(
                ilike(pudoLockers.name, `%${keyword}%`),
                ilike(pudoLockers.address, `%${keyword}%`),
                ilike(pudoLockers.code, `%${keyword}%`),
                ilike(pudoLockers.provider, `%${keyword}%`),
                sql`${pudoLockers.place}->>'town' ILIKE ${`%${keyword}%`}`,
                sql`${pudoLockers.place}->>'postalCode' ILIKE ${`%${keyword}%`}`,
                sql`${pudoLockers.detailedAddress}->>'locality' ILIKE ${`%${keyword}%`}`,
                sql`${pudoLockers.detailedAddress}->>'province' ILIKE ${`%${keyword}%`}`,
                sql`${pudoLockers.detailedAddress}->>'postal_code' ILIKE ${`%${keyword}%`}`,
                sql`${pudoLockers.detailedAddress}->>'street_name' ILIKE ${`%${keyword}%`}`,
                sql`${pudoLockers.detailedAddress}->>'sublocality' ILIKE ${`%${keyword}%`}`,
                sql`${pudoLockers.detailedAddress}->>'formatted_address' ILIKE ${`%${keyword}%`}`
              )
            );
          } else {
            // Multi-keyword intelligent search - try AND logic first for precise results
            // This handles cases like "port elizabeth" as if user typed "port AND elizabeth"
            const keywordConditions = keywords.map(keyword => 
              or(
                ilike(pudoLockers.name, `%${keyword}%`),
                ilike(pudoLockers.address, `%${keyword}%`),
                ilike(pudoLockers.code, `%${keyword}%`),
                ilike(pudoLockers.provider, `%${keyword}%`),
                sql`${pudoLockers.place}->>'town' ILIKE ${`%${keyword}%`}`,
                sql`${pudoLockers.place}->>'postalCode' ILIKE ${`%${keyword}%`}`,
                sql`${pudoLockers.detailedAddress}->>'locality' ILIKE ${`%${keyword}%`}`,
                sql`${pudoLockers.detailedAddress}->>'province' ILIKE ${`%${keyword}%`}`,
                sql`${pudoLockers.detailedAddress}->>'postal_code' ILIKE ${`%${keyword}%`}`,
                sql`${pudoLockers.detailedAddress}->>'street_name' ILIKE ${`%${keyword}%`}`,
                sql`${pudoLockers.detailedAddress}->>'sublocality' ILIKE ${`%${keyword}%`}`,
                sql`${pudoLockers.detailedAddress}->>'formatted_address' ILIKE ${`%${keyword}%`}`
              )
            );
            
            // Use AND logic by default for multi-word searches (more precise)
            // This means "port elizabeth" will find lockers that contain BOTH words
            whereConditions.push(and(...keywordConditions));
          }
        }
      }

      // Only apply location filters if there's no search query
      // When user searches, they want results from anywhere, not just their current location
      if (!query || !query.trim()) {
        if (province && province.trim()) {
          whereConditions.push(
            sql`${pudoLockers.detailedAddress}->>'province' = ${province}`
          );
        }

        if (city && city.trim()) {
          whereConditions.push(
            sql`${pudoLockers.detailedAddress}->>'locality' ILIKE ${`%${city}%`}`
          );
        }
      }

      const lockers = await db
        .select()
        .from(pudoLockers)
        .where(and(...whereConditions))
        .orderBy(pudoLockers.name);

      return lockers;
    } catch (error) {
      logger.error('Error searching PUDO lockers', { error, query, province, city });
      throw error;
    }
  }

  private parseComplexQuery(query: string): any {
    try {
      // Normalize the query and split by AND/OR operators
      const normalizedQuery = query.trim().toLowerCase();
      
      // Split by OR first, then handle AND within each OR group
      const orGroups = normalizedQuery.split(' or ').map(group => group.trim());
      
      const orConditions = orGroups.map(orGroup => {
        if (orGroup.includes(' and ')) {
          // Handle AND within this OR group
          const andTerms = orGroup.split(' and ').map(term => term.trim()).filter(t => t.length > 0);
          const andConditions = andTerms.map(term => this.createKeywordCondition(term));
          return and(...andConditions);
        } else {
          // Single term in this OR group
          return this.createKeywordCondition(orGroup);
        }
      });
      
      if (orConditions.length === 1) {
        return orConditions[0];
      } else {
        return or(...orConditions);
      }
    } catch (error) {
      logger.error('Error parsing complex query', { error, query });
      return null;
    }
  }

  private createKeywordCondition(keyword: string): any {
    const trimmedKeyword = keyword.trim();
    if (!trimmedKeyword) return null;
    
    return or(
      ilike(pudoLockers.name, `%${trimmedKeyword}%`),
      ilike(pudoLockers.address, `%${trimmedKeyword}%`),
      ilike(pudoLockers.code, `%${trimmedKeyword}%`),
      ilike(pudoLockers.provider, `%${trimmedKeyword}%`),
      sql`${pudoLockers.place}->>'town' ILIKE ${`%${trimmedKeyword}%`}`,
      sql`${pudoLockers.place}->>'postalCode' ILIKE ${`%${trimmedKeyword}%`}`,
      sql`${pudoLockers.detailedAddress}->>'locality' ILIKE ${`%${trimmedKeyword}%`}`,
      sql`${pudoLockers.detailedAddress}->>'province' ILIKE ${`%${trimmedKeyword}%`}`,
      sql`${pudoLockers.detailedAddress}->>'postal_code' ILIKE ${`%${trimmedKeyword}%`}`,
      sql`${pudoLockers.detailedAddress}->>'street_name' ILIKE ${`%${trimmedKeyword}%`}`,
      sql`${pudoLockers.detailedAddress}->>'sublocality' ILIKE ${`%${trimmedKeyword}%`}`,
      sql`${pudoLockers.detailedAddress}->>'formatted_address' ILIKE ${`%${trimmedKeyword}%`}`
    );
  }

  async getPudoLockersByLocation(province: string, city?: string): Promise<PudoLocker[]> {
    try {
      let whereConditions = [
        eq(pudoLockers.isActive, true),
        sql`${pudoLockers.detailedAddress}->>'province' ILIKE ${`%${province}%`}`
      ];

      if (city && city.trim()) {
        // Search both the locality field AND the main address column with case-insensitive wildcard search
        whereConditions.push(
          or(
            sql`${pudoLockers.detailedAddress}->>'locality' ILIKE ${`%${city}%`}`,
            sql`${pudoLockers.address} ILIKE ${`%${city}%`}`
          )
        );
      }

      const lockers = await db
        .select()
        .from(pudoLockers)
        .where(and(...whereConditions))
        .orderBy(pudoLockers.name);

      logger.debug('PUDO lockers query executed', { 
        province, 
        city, 
        resultCount: lockers.length,
        conditions: whereConditions.length 
      });

      return lockers;
    } catch (error) {
      logger.error('Error fetching PUDO lockers by location', { error, province, city });
      throw error;
    }
  }

  async getPudoLockerByCode(code: string): Promise<PudoLocker | undefined> {
    try {
      const [locker] = await db
        .select()
        .from(pudoLockers)
        .where(and(
          eq(pudoLockers.code, code),
          eq(pudoLockers.isActive, true)
        ));

      return locker;
    } catch (error) {
      logger.error('Error fetching PUDO locker by code', { error, code });
      throw error;
    }
  }

  async getPudoLockerById(id: number): Promise<PudoLocker | undefined> {
    try {
      const [locker] = await db
        .select()
        .from(pudoLockers)
        .where(and(
          eq(pudoLockers.id, id),
          eq(pudoLockers.isActive, true)
        ));

      return locker;
    } catch (error) {
      logger.error('Error fetching PUDO locker by ID', { error, id });
      throw error;
    }
  }

  async updateUserPreferredLocker(userId: number, lockerId: number, lockerCode: string): Promise<boolean> {
    try {
      await db
        .update(users)
        .set({
          preferredLockerId: lockerId,
          preferredLockerCode: lockerCode,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, userId));

      logger.info('Updated user preferred locker', { userId, lockerId, lockerCode });
      return true;
    } catch (error) {
      logger.error('Error updating user preferred locker', { error, userId, lockerId });
      throw error;
    }
  }

  async getUserPreferredLocker(userId: number): Promise<PudoLocker | undefined> {
    try {
      const [user] = await db
        .select({
          preferredLockerId: users.preferredLockerId,
          preferredLockerCode: users.preferredLockerCode
        })
        .from(users)
        .where(eq(users.id, userId));

      if (!user?.preferredLockerId) {
        return undefined;
      }

      return await this.getPudoLockerById(user.preferredLockerId);
    } catch (error) {
      logger.error('Error fetching user preferred locker', { error, userId });
      throw error;
    }
  }

  // =============================================================================
  // TOKEN MANAGEMENT OPERATIONS
  // =============================================================================

  /**
   * Create a mail token with hashed token for security
   */
  async createMailToken(tokenData: InsertMailToken): Promise<MailToken> {
    try {
      const [newToken] = await db
        .insert(mailTokens)
        .values(tokenData)
        .returning();
      return newToken;
    } catch (error) {
      logger.error('Error creating mail token', { error });
      throw error;
    }
  }

  /**
   * Get mail token by hash
   */
  async getMailTokenByHash(tokenHash: string): Promise<MailToken | undefined> {
    try {
      const [token] = await db
        .select()
        .from(mailTokens)
        .where(eq(mailTokens.tokenHash, tokenHash));
      return token;
    } catch (error) {
      logger.error('Error getting mail token by hash', { error, tokenHash });
      throw error;
    }
  }

  /**
   * Mark a token as used
   */
  async markTokenUsed(token: string): Promise<boolean> {
    try {
      const result = await db
        .update(mailTokens)
        .set({
          usedAt: new Date(),
          isActive: false
        })
        .where(eq(mailTokens.token, token));
      
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      logger.error('Error marking token as used', { error, token: token.substring(0, 8) + '...' });
      throw error;
    }
  }

  /**
   * Delete expired tokens
   */
  async deleteExpiredTokens(): Promise<number> {
    try {
      const result = await db
        .delete(mailTokens)
        .where(lte(mailTokens.expiresAt, new Date()));
      
      return result.rowCount || 0;
    } catch (error) {
      logger.error('Error deleting expired tokens', { error });
      throw error;
    }
  }

  /**
   * Clean up old tokens for a specific user and token type
   */
  async cleanupUserTokens(userId: number, tokenType: string): Promise<number> {
    try {
      const result = await db
        .delete(mailTokens)
        .where(
          and(
            eq(mailTokens.userId, userId),
            eq(mailTokens.tokenType, tokenType)
          )
        );
      
      return result.rowCount || 0;
    } catch (error) {
      logger.error('Error cleaning up user tokens', { error, userId, tokenType });
      throw error;
    }
  }

  // =============================================================================
  // EMAIL LOG OPERATIONS
  // =============================================================================

  /**
   * Log an email that was sent
   */
  async logEmail(emailData: InsertEmailLog): Promise<EmailLog> {
    try {
      const [newEmailLog] = await db
        .insert(emailLogs)
        .values(emailData)
        .returning();
      return newEmailLog;
    } catch (error) {
      logger.error('Error logging email', { error });
      throw error;
    }
  }

  /**
   * Get email logs with optional filtering
   */
  async getEmailLogs(userId?: number, emailType?: string, limit?: number): Promise<EmailLog[]> {
    try {
      let query = db.select().from(emailLogs);

      const conditions: SQL<unknown>[] = [];

      if (userId !== undefined) {
        conditions.push(eq(emailLogs.userId, userId));
      }

      if (emailType) {
        conditions.push(eq(emailLogs.emailType, emailType));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      query = query.orderBy(desc(emailLogs.sentAt));

      if (limit) {
        query = query.limit(limit);
      }

      return await query;
    } catch (error) {
      logger.error('Error getting email logs', { error, userId, emailType, limit });
      throw error;
    }
  }

  /**
   * Update email delivery status
   */
  async updateEmailDeliveryStatus(emailId: number, status: string, errorMessage?: string): Promise<boolean> {
    try {
      const updateData: Partial<EmailLog> = {
        deliveryStatus: status
      };

      if (errorMessage) {
        updateData.errorMessage = errorMessage;
      }

      const result = await db
        .update(emailLogs)
        .set(updateData)
        .where(eq(emailLogs.id, emailId));
      
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      logger.error('Error updating email delivery status', { error, emailId, status });
      throw error;
    }
  }
  // ===============================================================
  // EMAIL TOKEN MANAGEMENT METHODS
  // ===============================================================

  /**
   * Store an email token for password reset or email verification
   */
  async storeEmailToken(token: InsertMailToken): Promise<MailToken> {
    const [newToken] = await db
      .insert(mailTokens)
      .values(token)
      .returning();
    return newToken;
  }

  /**
   * Verify an email token by token and type
   */
  async verifyEmailToken(token: string, tokenType: string): Promise<MailToken | undefined> {
    const [tokenRecord] = await db
      .select()
      .from(mailTokens)
      .where(
        and(
          eq(mailTokens.token, token),
          eq(mailTokens.tokenType, tokenType),
          eq(mailTokens.isActive, true),
          isNull(mailTokens.usedAt)
        )
      );
    return tokenRecord;
  }

  /**
   * Mark a token as used
   */
  async markTokenAsUsed(token: string): Promise<boolean> {
    try {
      const [updatedToken] = await db
        .update(mailTokens)
        .set({ 
          usedAt: new Date(),
          isActive: false 
        })
        .where(eq(mailTokens.token, token))
        .returning();
      return !!updatedToken;
    } catch (error) {
      logger.error('Error marking token as used', { token: token.substring(0, 8) + '...', error });
      return false;
    }
  }

  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const now = new Date();
      const result = await db
        .delete(mailTokens)
        .where(
          or(
            lt(mailTokens.expiresAt, now),
            eq(mailTokens.isActive, false)
          )
        );
      return result.rowCount || 0;
    } catch (error) {
      logger.error('Error cleaning up expired tokens', { error });
      return 0;
    }
  }

  // Sales Rep System Implementation
  async getSalesRepByCode(repCode: string): Promise<SalesRep | undefined> {
    try {
      const [rep] = await db
        .select()
        .from(salesReps)
        .where(eq(salesReps.repCode, repCode));
      
      return rep;
    } catch (error) {
      logger.error('Error getting sales rep by code', { error, repCode });
      throw error;
    }
  }

  async createSalesRep(repData: InsertSalesRep): Promise<SalesRep> {
    try {
      const [newRep] = await db
        .insert(salesReps)
        .values(repData)
        .returning();
      
      return newRep;
    } catch (error) {
      logger.error('Error creating sales rep', { error, repData });
      throw error;
    }
  }

  async updateSalesRep(id: number, repData: Partial<InsertSalesRep>): Promise<SalesRep | undefined> {
    try {
      const [updatedRep] = await db
        .update(salesReps)
        .set(repData)
        .where(eq(salesReps.id, id))
        .returning();
      
      return updatedRep;
    } catch (error) {
      logger.error('Error updating sales rep', { error, id, repData });
      throw error;
    }
  }

  async getAllSalesReps(): Promise<SalesRep[]> {
    try {
      const reps = await db
        .select()
        .from(salesReps)
        .orderBy(salesReps.firstName);
      
      return reps;
    } catch (error) {
      logger.error('Error getting all sales reps', { error });
      throw error;
    }
  }

  async getSalesRepCommissions(repId: number, limit?: number, offset?: number): Promise<RepCommission[]> {
    try {
      let query = db
        .select()
        .from(repCommissions)
        .where(eq(repCommissions.repId, repId))
        .orderBy(desc(repCommissions.createdAt));

      if (limit) {
        query = query.limit(limit);
      }
      if (offset) {
        query = query.offset(offset);
      }

      const commissions = await query;
      return commissions;
    } catch (error) {
      logger.error('Error getting sales rep commissions', { error, repId, limit, offset });
      throw error;
    }
  }

  async createRepCommission(commissionData: InsertRepCommission): Promise<RepCommission> {
    try {
      const [newCommission] = await db
        .insert(repCommissions)
        .values(commissionData)
        .returning();
      
      return newCommission;
    } catch (error) {
      logger.error('Error creating rep commission', { error, commissionData });
      throw error;
    }
  }

  async getRepCommissionsByOrder(orderId: number): Promise<RepCommission[]> {
    try {
      const commissions = await db
        .select()
        .from(repCommissions)
        .where(eq(repCommissions.orderId, orderId));
      
      return commissions;
    } catch (error) {
      logger.error('Error getting rep commissions by order', { error, orderId });
      throw error;
    }
  }

  async calculateRepEarnings(repId: number, startDate?: string, endDate?: string): Promise<{ totalEarnings: number; commissionCount: number }> {
    try {
      let query = db
        .select({
          totalEarnings: sql<number>`COALESCE(SUM(${repCommissions.commissionAmount}), 0)`,
          commissionCount: sql<number>`COUNT(*)`
        })
        .from(repCommissions)
        .where(eq(repCommissions.repId, repId));

      // Add date range filtering if provided
      if (startDate && endDate) {
        query = query.where(
          and(
            eq(repCommissions.repId, repId),
            gte(repCommissions.createdAt, startDate),
            lte(repCommissions.createdAt, endDate)
          )
        );
      }

      const [result] = await query;
      
      return {
        totalEarnings: Number(result?.totalEarnings) || 0,
        commissionCount: Number(result?.commissionCount) || 0
      };
    } catch (error) {
      logger.error('Error calculating rep earnings', { error, repId, startDate, endDate });
      throw error;
    }
  }

  async createRepPayment(paymentData: InsertRepPayment): Promise<RepPayment> {
    try {
      const [newPayment] = await db
        .insert(repPayments)
        .values(paymentData)
        .returning();
      
      return newPayment;
    } catch (error) {
      logger.error('Error creating rep payment', { error, paymentData });
      throw error;
    }
  }

  async getRepPayments(repId: number): Promise<RepPayment[]> {
    try {
      const payments = await db
        .select()
        .from(repPayments)
        .where(eq(repPayments.repId, repId))
        .orderBy(desc(repPayments.createdAt));
      
      return payments;
    } catch (error) {
      logger.error('Error getting rep payments', { error, repId });
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
