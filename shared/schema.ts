import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, jsonb, varchar, unique, decimal, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - Updated to use camelCase column names
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("fullName"),
  profilePicture: text("profilePicture"),
  phoneNumber: text("phoneNumber"),
  address: text("address"),
  city: text("city"),
  province: text("province"),
  postalCode: text("postalCode"),
  country: text("country").default("South Africa"),
  isActive: boolean("isActive").default(true).notNull(),
  role: text("role").default("user").notNull(), // 'user', 'admin', etc.
  createdAt: text("createdAt").default(String(new Date().toISOString())).notNull(),
  updatedAt: text("updatedAt").default(String(new Date().toISOString())).notNull(),
  lastLogin: text("last_login"),
});

// Categories table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  icon: text("icon"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true).notNull(),
  parentId: integer("parent_id"),
  level: integer("level").default(0).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  // Added timestamp fields to match database structure
  createdAt: text("created_at").default(String(new Date().toISOString())).notNull(),
  updatedAt: text("updated_at").default(String(new Date().toISOString())).notNull(),
}, (table) => ({
  // Allow same category names under different parents
  nameParentUnique: unique().on(table.name, table.parentId),
}));

// Relations will be defined after all tables are created

// Products table
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  sku: text("sku").unique(), // SKU field for supplier ordering
  description: text("description"),
  categoryId: integer("category_id").references(() => categories.id),
  catalogId: integer("catalog_id").references(() => catalogs.id),
  price: doublePrecision("price").notNull(),
  minimumPrice: doublePrecision("minimum_price"), // New field for setting price floors
  costPrice: doublePrecision("cost_price").notNull(),
  salePrice: doublePrecision("sale_price"),
  discount: integer("discount"),
  discountLabel: text("discount_label"), // New field for displaying discount type/occasion
  imageUrl: text("image_url"),
  additionalImages: text("additional_images").array(),
  stock: integer("stock").notNull(), // Added to match DB structure - used as stockQuantity in UI
  minimumOrder: integer("minimum_order").default(1), // New field for supplier requirements
  rating: doublePrecision("rating").default(0),
  reviewCount: integer("review_count").default(0),
  isActive: boolean("is_active").default(true).notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  isFlashDeal: boolean("is_flash_deal").default(false).notNull(),
  flashDealEnd: text("flash_deal_end"), // Changed from timestamp to text
  specialSaleText: text("special_sale_text"), // New field for custom sale messaging
  specialSaleStart: text("special_sale_start"), // Changed from timestamp to text
  specialSaleEnd: text("special_sale_end"), // Changed from timestamp to text
  soldCount: integer("sold_count").default(0),
  supplier: text("supplier"),
  freeShipping: boolean("free_shipping").default(false),
  weight: doublePrecision("weight"), // in kg
  dimensions: text("dimensions"), // format: "LxWxH" in cm
  brand: text("brand"),
  tags: text("tags").array(),
  requiredAttributeIds: integer("required_attribute_ids").array(), // New field to track mandatory attributes
  displayOrder: integer("display_order").default(999), // Default high number to place new products at the end
  hasBackgroundRemoved: boolean("has_background_removed").default(false),
  originalImageObjectKey: text("original_image_object_key"),
  // SEO fields - missing from database
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  metaKeywords: text("meta_keywords"),
  canonicalUrl: text("canonical_url"),
  // Additional pricing fields
  compareAtPrice: doublePrecision("compare_at_price"),
  taxRatePercentage: doublePrecision("tax_rate_percentage"),
  createdAt: text("created_at").default(String(new Date().toISOString())).notNull(),
}, (table) => {
  return {
    categoryIdIdx: index("products_category_id_idx").on(table.categoryId),
  };
});

// Cart items table - simplified without deprecated combination logic
export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id),
  productId: integer("productId").notNull().references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
  itemPrice: decimal("itemPrice", { precision: 10, scale: 2 }).notNull(),
  attributeSelections: jsonb("attributeSelections").default('{}').notNull(), // Store selected attributes like {gender: "For Him", size: "Large"}
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => {
  return {
    userProductUnique: unique().on(table.userId, table.productId),
  };
});

// Orders table - camelCase version with comprehensive order management
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id),
  orderNumber: text("orderNumber").notNull().unique(), // Human-readable order number
  status: text("status").notNull().default("pending"), // pending, confirmed, processing, shipped, delivered, cancelled
  
  // Customer information
  customerName: text("customerName").notNull(),
  customerEmail: text("customerEmail").notNull(),
  customerPhone: text("customerPhone").notNull(),
  
  // Shipping information
  shippingAddress: text("shippingAddress").notNull(),
  shippingCity: text("shippingCity").notNull(),
  shippingPostalCode: text("shippingPostalCode").notNull(),
  shippingMethod: text("shippingMethod").notNull().default("standard"), // standard, express
  shippingCost: doublePrecision("shippingCost").notNull().default(85), // R85 for PUDO
  
  // Payment information
  paymentMethod: text("paymentMethod").notNull().default("eft"), // eft only for now
  paymentStatus: text("paymentStatus").notNull().default("pending"), // pending, paid, failed
  
  // Order totals
  subtotalAmount: doublePrecision("subtotalAmount").notNull(),
  totalAmount: doublePrecision("totalAmount").notNull(),
  
  // Order notes and tracking
  customerNotes: text("customerNotes"), // Customer special instructions
  adminNotes: text("adminNotes"),
  trackingNumber: text("trackingNumber"),
  eftPop: text("eftPop"), // EFT proof of payment file path
  
  // Timestamps
  createdAt: text("createdAt").default(String(new Date().toISOString())).notNull(),
  updatedAt: text("updatedAt").default(String(new Date().toISOString())).notNull(),
  shippedAt: text("shippedAt"),
  deliveredAt: text("deliveredAt"),
});

// Order items table - camelCase version with full attribute support
export const orderItems = pgTable("orderItems", {
  id: serial("id").primaryKey(),
  orderId: integer("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("productId").notNull().references(() => products.id),
  
  // Product details at time of order (for historical accuracy)
  productName: text("productName").notNull(),
  productSku: text("productSku"),
  productImageUrl: text("productImageUrl"),
  
  // Order item specifics
  quantity: integer("quantity").notNull(),
  unitPrice: doublePrecision("unitPrice").notNull(),
  totalPrice: doublePrecision("totalPrice").notNull(),
  
  // Product attributes selected for this item
  selectedAttributes: jsonb("selectedAttributes").default('{}').notNull(), // {size: "Large", color: "Red", etc.}
  attributeDisplayText: text("attributeDisplayText"), // Human-readable attribute summary like "Large, Red"
  
  createdAt: text("createdAt").default(String(new Date().toISOString())).notNull(),
});

// Product Images table
export const productImages = pgTable("product_images", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id),
  url: text("url").notNull(),
  objectKey: text("object_key").notNull(),  // Required by database constraint
  isMain: boolean("is_main").default(false),
  hasBgRemoved: boolean("has_bg_removed").default(false),
  bgRemovedUrl: text("bg_removed_url"),
  bgRemovedObjectKey: text("bg_removed_object_key"),
  // Note: 'alt' field removed as it doesn't exist in the database
  sortOrder: integer("sort_order").default(0),
  createdAt: text("created_at").default(String(new Date().toISOString())).notNull(),
}, (table) => {
  return {
    productIdIdx: index("product_images_product_id_idx").on(table.productId),
  };
});

// AI Recommendations table
export const aiRecommendations = pgTable("aiRecommendations", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id),
  productIds: integer("productIds").array(),
  reason: text("reason"),
  aiResponse: jsonb("aiResponse"),
  createdAt: text("createdAt").default(String(new Date().toISOString())).notNull(),
  updatedAt: text("updatedAt").default(String(new Date().toISOString())).notNull(),
});

// Pricing settings table for category-specific markup percentages
export const pricing = pgTable("pricing", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => categories.id),
  markupPercentage: integer("markup_percentage").notNull().default(50),
  description: text("description"),
  createdAt: text("created_at").default(String(new Date().toISOString())).notNull(),
  updatedAt: text("updated_at").default(String(new Date().toISOString())).notNull(),
}, (table) => {
  return {
    categoryUnique: unique().on(table.categoryId),
  };
});

// AI Settings table for configuring AI model usage
export const aiSettings = pgTable("aiSettings", {
  id: serial("id").primaryKey(),
  settingName: text("settingName").notNull().unique(),
  settingValue: text("settingValue").notNull(),
  description: text("description"),
  createdAt: text("createdAt").default(String(new Date().toISOString())).notNull(),
  updatedAt: text("updatedAt").default(String(new Date().toISOString())).notNull(),
});

// Suppliers table
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  contactName: varchar("contact_name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  country: varchar("country", { length: 100 }).default("South Africa"),
  notes: text("notes"),
  logo: text("logo"),
  website: varchar("website", { length: 255 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: text("created_at").default(String(new Date().toISOString())).notNull(),
  updatedAt: text("updated_at").default(String(new Date().toISOString())).notNull(),
});

// Catalogs table
export const catalogs = pgTable("catalogs", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  defaultMarkupPercentage: integer("default_markup_percentage").default(50),
  isActive: boolean("is_active").default(true).notNull(),
  coverImage: text("cover_image"),
  tags: text("tags").array(),
  startDate: text("start_date"),
  endDate: text("end_date"),
  createdAt: text("created_at").default(String(new Date().toISOString())).notNull(),
  updatedAt: text("updated_at").default(String(new Date().toISOString())).notNull(),
});

// Batch Upload tables for bulk product imports
export const batchUploads = pgTable("batchUploads", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  catalogId: integer("catalogId").references(() => catalogs.id),
  userId: integer("userId").references(() => users.id),
  totalRecords: integer("totalRecords"),
  processedRecords: integer("processedRecords"),
  successCount: integer("successCount"),
  errorCount: integer("errorCount"),
  warnings: jsonb("warnings"),
  fileOriginalName: varchar("fileOriginalName", { length: 255 }),
  fileName: varchar("fileName", { length: 255 }),
  createdAt: text("createdAt").default(String(new Date().toISOString())).notNull(),
  updatedAt: text("updatedAt").default(String(new Date().toISOString())).notNull(),
  completedAt: text("completedAt"),
  lastProcessedRow: integer("lastProcessedRow").default(0),
  processingStrategy: varchar("processingStrategy", { length: 50 }).default("sequential"),
  retryCount: integer("retryCount").default(0),
  maxRetries: integer("maxRetries").default(3),
  catalogCapacity: integer("catalogCapacity"),
  catalogCurrentCount: integer("catalogCurrentCount"),
  canceledAt: text("canceledAt"),
  pausedAt: text("pausedAt"),
  resumedAt: text("resumedAt"),
  failedAt: text("failedAt"),
  startedAt: text("startedAt"),
});

export const batchUploadErrors = pgTable("batchUploadErrors", {
  id: serial("id").primaryKey(),
  batchUploadId: integer("batchUploadId").references(() => batchUploads.id, { onDelete: "cascade" }),
  row: integer("row"),
  field: varchar("field", { length: 255 }),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  severity: varchar("severity", { length: 50 }).notNull(),
  createdAt: text("createdAt").default(String(new Date().toISOString())).notNull(),
});

// =============================================================================
// NEW ATTRIBUTE SYSTEM TABLES
// Implementing the new hierarchical attribute system design
// =============================================================================

// Core Attributes - base attribute definitions that can be used at any level
export const attributes = pgTable("attributes", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  description: text("description"),
  attributeType: varchar("attribute_type", { length: 50 }).notNull(), // 'select', 'radio', 'color', 'text', etc.
  validationRules: jsonb("validation_rules"), // JSON with validation settings like min/max length, regex, etc.
  isRequired: boolean("is_required").default(false),
  isFilterable: boolean("is_filterable").default(false), // Can this attribute be used for filtering in product listings?
  isComparable: boolean("is_comparable").default(false), // Can this attribute be used in product comparisons?
  isSwatch: boolean("is_swatch").default(false), // Is this attribute shown as a swatch (color/texture)?
  displayInProductSummary: boolean("display_in_product_summary").default(false), // Show in product list summaries?
  sortOrder: integer("sort_order").default(0),
  createdAt: text("created_at").default(String(new Date().toISOString())).notNull(),
  updatedAt: text("updated_at").default(String(new Date().toISOString())).notNull(),
}, (table) => {
  return {
    nameUnique: unique().on(table.name),
  };
});

// Attribute Options - predefined options for select/radio/color-type attributes
export const attributeOptions = pgTable("attribute_options", {
  id: serial("id").primaryKey(),
  attributeId: integer("attribute_id").notNull().references(() => attributes.id, { onDelete: "cascade" }),
  value: varchar("value", { length: 255 }).notNull(),
  displayValue: varchar("display_value", { length: 255 }).notNull(),
  metadata: jsonb("metadata"), // Additional data like hex code for colors, image URL for texture, etc.
  sortOrder: integer("sort_order").default(0),
  createdAt: text("created_at").default(String(new Date().toISOString())).notNull(),
  updatedAt: text("updated_at").default(String(new Date().toISOString())).notNull(),
}, (table) => {
  return {
    attrOptionUnique: unique().on(table.attributeId, table.value),
  };
});

// We're removing the tables:
// - catalogAttributes
// - catalogAttributeOptions
// - categoryAttributes
// - categoryAttributeOptions
// to centralize all attribute functionality to only use:
// - attributes
// - attributeOptions
// - productAttributes

// Product Attributes - attributes assigned to a product
export const productAttributes = pgTable("product_attributes", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  attributeId: integer("attribute_id").notNull().references(() => attributes.id, { onDelete: "cascade" }),
  // We're removing the reference to categoryAttributes as part of centralization
  overrideDisplayName: varchar("override_display_name", { length: 100 }),
  overrideDescription: text("override_description"),
  isRequired: boolean("is_required"),
  // Store the selected attribute options as JSON to avoid need for separate tables
  selectedOptions: jsonb("selected_options").default([]),
  // Store custom values (for text type attributes) directly here
  textValue: text("text_value"),
  // This field will never affect pricing as per requirements, but we'll keep it for reference
  // and always ensure it's set to 0 in the application code
  priceAdjustment: decimal("price_adjustment", { precision: 10, scale: 2 }).default("0"),
  sortOrder: integer("sort_order").default(0),
  createdAt: text("created_at").default(String(new Date().toISOString())).notNull(),
  updatedAt: text("updated_at").default(String(new Date().toISOString())).notNull(),
}, (table) => {
  return {
    productAttrUnique: unique().on(table.productId, table.attributeId),
  };
});

// We're removing the tables:
// - productAttributeOptions
// - productAttributeValues
// All attribute data will now be stored in productAttributes table with the selectedOptions field

// Create insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true,
  isActive: true,
  role: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  level: true,
  displayOrder: true,
}).extend({
  parentId: z.number().nullable().optional(),
  level: z.number().default(0),
  displayOrder: z.number().default(0),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
}).extend({
  displayOrder: z.number().default(999).optional(),
  stock: z.number().int().nonnegative().default(0), // Add default value for stock column
  // Date fields as strings
  specialSaleStart: z.string().nullable().optional(),
  specialSaleEnd: z.string().nullable().optional(),
  flashDealEnd: z.string().nullable().optional(),
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  orderNumber: true, // Generated automatically
}).extend({
  shippingMethod: z.enum(["standard", "express"]).default("standard"),
  paymentMethod: z.enum(["eft"]).default("eft"),
  paymentStatus: z.enum(["pending", "paid", "failed"]).default("pending"),
  status: z.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]).default("pending"),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
  createdAt: true,
});

export const insertProductImageSchema = createInsertSchema(productImages)
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    objectKey: z.string().optional(),
    bgRemovedObjectKey: z.string().optional(),
  });

export const insertAiRecommendationSchema = createInsertSchema(aiRecommendations).omit({
  id: true,
  createdAt: true,
});

export const insertPricingSchema = createInsertSchema(pricing).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAiSettingsSchema = createInsertSchema(aiSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCatalogSchema = createInsertSchema(catalogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.string().or(z.date()).optional(),
  endDate: z.string().or(z.date()).nullable().optional(),
});

export const insertBatchUploadSchema = createInsertSchema(batchUploads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBatchUploadErrorSchema = createInsertSchema(batchUploadErrors).omit({
  id: true,
  createdAt: true,
});



// =============================================================================
// NEW ATTRIBUTE SYSTEM INSERT SCHEMAS
// =============================================================================

// Core attribute insert schema
export const insertAttributeSchema = createInsertSchema(attributes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  validationRules: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
});

// Attribute options insert schema
export const insertAttributeOptionSchema = createInsertSchema(attributeOptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  metadata: z.record(z.any()).optional(),
});

// Catalog attribute insert schema
// Product attribute insert schema - Updated for the centralized three-table model
export const insertProductAttributeSchema = createInsertSchema(productAttributes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  selectedOptions: z.array(z.number()).optional(),
  textValue: z.string().nullable().optional(),
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

export type ProductImage = typeof productImages.$inferSelect;
export type InsertProductImage = z.infer<typeof insertProductImageSchema>;

export type AiRecommendation = typeof aiRecommendations.$inferSelect;
export type InsertAiRecommendation = z.infer<typeof insertAiRecommendationSchema>;

export type Pricing = typeof pricing.$inferSelect;
export type InsertPricing = z.infer<typeof insertPricingSchema>;

export type AiSetting = typeof aiSettings.$inferSelect;
export type InsertAiSetting = z.infer<typeof insertAiSettingsSchema>;

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;

export type Catalog = typeof catalogs.$inferSelect;
export type InsertCatalog = z.infer<typeof insertCatalogSchema>;

export type BatchUpload = typeof batchUploads.$inferSelect;
export type BatchUploadError = typeof batchUploadErrors.$inferSelect;

// =============================================================================
// NEW ATTRIBUTE SYSTEM TYPES
// =============================================================================

export type Attribute = typeof attributes.$inferSelect;
export type InsertAttribute = z.infer<typeof insertAttributeSchema>;

export type AttributeOption = typeof attributeOptions.$inferSelect;
export type InsertAttributeOption = z.infer<typeof insertAttributeOptionSchema>;

// Removed catalog attribute types as part of centralization

// Removed type definitions for eliminated tables 
// Now using centralized attribute system

export type ProductAttribute = typeof productAttributes.$inferSelect;
export type InsertProductAttribute = z.infer<typeof insertProductAttributeSchema>;

// Batch upload insert types (defined after schemas)
export type InsertBatchUpload = z.infer<typeof insertBatchUploadSchema>;
export type InsertBatchUploadError = z.infer<typeof insertBatchUploadErrorSchema>;

// Define all table relations after all tables and types are defined
export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "parent"
  }),
  children: many(categories, {
    relationName: "parent"
  }),
  products: many(products)
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id]
  }),
  catalog: one(catalogs, {
    fields: [products.catalogId],
    references: [catalogs.id]
  }),
  images: many(productImages)
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id]
  })
}));

export const catalogsRelations = relations(catalogs, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [catalogs.supplierId],
    references: [suppliers.id]
  }),
  products: many(products)
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  catalogs: many(catalogs)
}));

// Product Drafts table for storing work-in-progress products
export const productDrafts = pgTable("product_drafts", {
  id: serial("id").primaryKey(),
  originalProductId: integer("original_product_id").references(() => products.id),
  draftStatus: text("draft_status").default("draft").notNull(), // 'draft', 'review', 'ready', 'published'
  createdBy: integer("created_by").references(() => users.id),
  createdAt: text("created_at").default(String(new Date().toISOString())).notNull(),
  lastModified: text("last_modified").default(String(new Date().toISOString())).notNull(),
  
  // Basic product information
  name: text("name"),
  slug: text("slug"),
  sku: text("sku"),
  description: text("description"),
  brand: text("brand"),
  categoryId: integer("category_id").references(() => categories.id),
  isActive: boolean("is_active").default(true),
  isFeatured: boolean("is_featured").default(false),
  catalogId: integer("catalog_id").references(() => catalogs.id),
  
  // Pricing information
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
  regularPrice: decimal("regular_price", { precision: 10, scale: 2 }),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }),
  onSale: boolean("on_sale").default(false),
  markupPercentage: integer("markup_percentage"),
  minimumPrice: decimal("minimum_price", { precision: 10, scale: 2 }),
  
  // Images
  imageUrls: text("image_urls").array(),
  imageObjectKeys: text("image_object_keys").array(),
  mainImageIndex: integer("main_image_index").default(0),
  
  // Inventory
  stockLevel: integer("stock_level").default(0),
  lowStockThreshold: integer("low_stock_threshold").default(5),
  backorderEnabled: boolean("backorder_enabled").default(false),
  
  // Attributes (stored as JSON)
  attributes: jsonb("attributes").default('[]'),
  // Enhanced product attributes with structured format
  attributesData: jsonb("attributes_data").default('[]'),
  
  // Supplier information
  supplierId: integer("supplier_id").references(() => suppliers.id),
  
  // Physical properties
  weight: text("weight"),
  dimensions: text("dimensions"),
  
  // Promotions
  discountLabel: text("discount_label"),
  specialSaleText: text("special_sale_text"),
  specialSaleStart: text("special_sale_start"),
  specialSaleEnd: text("special_sale_end"),
  isFlashDeal: boolean("is_flash_deal").default(false),
  flashDealEnd: text("flash_deal_end"),
  
  // Tax information
  taxable: boolean("taxable").default(true),
  taxClass: text("tax_class").default("standard"),
  
  // SEO metadata
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  metaKeywords: text("meta_keywords"),
  canonicalUrl: text("canonical_url"),
  
  // Publication information
  publishedAt: text("published_at"),
  publishedVersion: integer("published_version").default(1),
  
  // AI-generated content flags
  hasAIDescription: boolean("has_ai_description").default(false),
  hasAISeo: boolean("has_ai_seo").default(false),
  
  // Shipping information
  freeShipping: boolean("free_shipping").default(false),
  shippingClass: text("shipping_class").default("standard"),
  
  // Detailed audit information
  lastReviewer: integer("last_reviewer").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  
  // Wizard progress tracking
  wizardProgress: jsonb("wizard_progress").default('{"basic-info": false, "images": false, "additional-info": false, "attributes": false, "seo": false, "sales-promotions": false, "review": false}'),
  
  // Stores completed steps in the wizard
  completedSteps: text("completed_steps").array(),
  
  // Version control
  version: integer("version").default(1),
  
  // Change history
  changeHistory: jsonb("change_history").default('[]'),
  
  // Additional fields found in database but missing from schema
  selectedAttributes: jsonb("selected_attributes").default('[]'),
  aiSuggestions: jsonb("ai_suggestions").default('{}'),
  discountData: jsonb("discount_data").default('{}'),
  
  // Rating and review count for marketplace appearance
  rating: doublePrecision("rating"),
  reviewCount: integer("review_count"),
}, (table) => {
  return {
    originalProductIdx: index("idx_product_drafts_original_product").on(table.originalProductId),
    statusIdx: index("idx_product_drafts_status").on(table.draftStatus),
    categoryIdIdx: index("idx_product_drafts_category").on(table.categoryId),
    supplierIdIdx: index("idx_product_drafts_supplier").on(table.supplierId),
    catalogIdIdx: index("idx_product_drafts_catalog").on(table.catalogId),
  };
});

// Insert schema for product drafts
export const insertProductDraftSchema = createInsertSchema(productDrafts, {
  createdAt: z.coerce.date().optional(),
  lastModified: z.coerce.date().optional(),
  specialSaleStart: z.coerce.date().optional().nullable(),
  specialSaleEnd: z.coerce.date().optional().nullable(),
  flashDealEnd: z.coerce.date().optional().nullable(),
  publishedAt: z.coerce.date().optional().nullable(),
  wizardProgress: z.any().optional(),
  attributes: z.any().optional(),
  attributesData: z.any().optional(),
  completedSteps: z.array(z.string()).optional(),
  changeHistory: z.any().optional(),
  // Added fields for the missing database columns
  selectedAttributes: z.any().optional(),
  aiSuggestions: z.any().optional(),
  discountData: z.any().optional(),
  rating: z.number().optional().nullable(),
  reviewCount: z.number().int().optional().nullable(),
}).omit({ 
  id: true 
});

// Define the relations for productDrafts
export const productDraftsRelations = relations(productDrafts, ({ one }) => ({
  originalProduct: one(products, {
    fields: [productDrafts.originalProductId],
    references: [products.id]
  }),
  category: one(categories, {
    fields: [productDrafts.categoryId],
    references: [categories.id]
  }),
  supplier: one(suppliers, {
    fields: [productDrafts.supplierId],
    references: [suppliers.id]
  }),
  user: one(users, {
    fields: [productDrafts.createdBy],
    references: [users.id]
  })
}));

// =============================================================================
// NEW ATTRIBUTE SYSTEM RELATIONS
// =============================================================================

// Attribute relations
export const attributesRelations = relations(attributes, ({ many }) => ({
  options: many(attributeOptions),
  productAttributes: many(productAttributes)
}));

// Attribute options relations
export const attributeOptionsRelations = relations(attributeOptions, ({ one }) => ({
  attribute: one(attributes, {
    fields: [attributeOptions.attributeId],
    references: [attributes.id]
  })
}));

// Removed catalog attributes relations as part of centralization

// Removed category attributes relations as part of centralization

// Product attributes relations
export const productAttributesRelations = relations(productAttributes, ({ one }) => ({
  product: one(products, {
    fields: [productAttributes.productId],
    references: [products.id]
  }),
  attribute: one(attributes, {
    fields: [productAttributes.attributeId],
    references: [attributes.id]
  })
  // Removed references to tables we're eliminating
}));

// Removed relation definitions for eliminated tables
// Now using centralized attribute system with three tables:
// - attributes
// - attributeOptions
// - productAttributes

// Attribute Discount Rules and their relations have been completely removed
// As part of the centralized attribute system refactoring, product attributes
// no longer affect pricing anywhere in the application.
/* 
 * The following tables and types have been removed:
 * - attributeDiscountRules table
 * - attributeDiscountRulesRelations
 * - AttributeDiscountRule type
 * - InsertAttributeDiscountRule type
 * - insertAttributeDiscountRuleSchema
 */

// Export ProductDraft type
export type ProductDraft = typeof productDrafts.$inferSelect;
export type InsertProductDraft = z.infer<typeof insertProductDraftSchema>;
