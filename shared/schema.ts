import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, jsonb, varchar, unique, decimal, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  profilePicture: text("profile_picture"),
  phoneNumber: text("phone_number"),
  address: text("address"),
  city: text("city"),
  postalCode: text("postal_code"),
  country: text("country").default("South Africa"),
  isActive: boolean("is_active").default(true).notNull(),
  role: text("role").default("user").notNull(), // 'user', 'admin', etc.
  createdAt: text("created_at").default(String(new Date().toISOString())).notNull(),
  updatedAt: text("updated_at").default(String(new Date().toISOString())).notNull(),
  lastLogin: text("last_login"),
});

// Categories table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  icon: text("icon"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true).notNull(),
  parentId: integer("parent_id"),
  level: integer("level").default(0).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
});

// Relations will be defined after all tables are created

// Products table
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
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
  createdAt: text("created_at").default(String(new Date().toISOString())).notNull(),
}, (table) => {
  return {
    categoryIdIdx: index("products_category_id_idx").on(table.categoryId),
  };
});

// Cart items table
export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  productId: integer("product_id").references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
  combinationHash: text("combination_hash"),
  // Remove reference to non-existent table
  combinationId: integer("combination_id"),
  selectedAttributes: jsonb("selected_attributes").default({}),
  priceAdjustment: doublePrecision("price_adjustment").default(0),
  // New discount-related fields
  discountData: jsonb("discount_data"),
  totalDiscount: doublePrecision("total_discount").default(0),
  itemPrice: doublePrecision("item_price"),
  createdAt: text("created_at").default(String(new Date().toISOString())).notNull(),
});

// Orders table
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  status: text("status").notNull().default("pending"),
  totalAmount: doublePrecision("total_amount").notNull(),
  shippingAddress: text("shipping_address").notNull(),
  shippingMethod: text("shipping_method"),
  paymentMethod: text("payment_method"),
  createdAt: text("created_at").default(String(new Date().toISOString())).notNull(),
});

// Order items table
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id),
  productId: integer("product_id").references(() => products.id),
  quantity: integer("quantity").notNull(),
  price: doublePrecision("price").notNull(),
});

// Product Images table
export const productImages = pgTable("product_images", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id),
  url: text("url").notNull(),
  objectKey: text("object_key"),  // Make nullable for temporary uploads
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
export const aiRecommendations = pgTable("ai_recommendations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  productIds: integer("product_ids").array(),
  reason: text("reason"),
  aiResponse: jsonb("ai_response"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Pricing settings table for category-specific markup percentages
export const pricing = pgTable("pricing", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => categories.id),
  markupPercentage: integer("markup_percentage").notNull().default(50),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    categoryUnique: unique().on(table.categoryId),
  };
});

// AI Settings table for configuring AI model usage
export const aiSettings = pgTable("ai_settings", {
  id: serial("id").primaryKey(),
  settingName: text("setting_name").notNull().unique(),
  settingValue: text("setting_value").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
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
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
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
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
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

// Batch upload tables - for mass product upload tracking
export const batchUploads = pgTable("batch_uploads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  userId: integer("user_id").references(() => users.id),
  totalRecords: integer("total_records").default(0),
  processedRecords: integer("processed_records").default(0),
  successCount: integer("success_count").default(0),
  errorCount: integer("error_count").default(0),
  // Extended status options: pending, processing, completed, failed, cancelled, paused, resumable
  status: text("status").notNull().default("pending"),
  catalogId: integer("catalog_id").references(() => catalogs.id),
  originalFilename: text("file_original_name"),
  fileName: text("file_name"),
  warnings: jsonb("warnings").default([]),
  // New fields for enhanced batch management
  lastProcessedRow: integer("last_processed_row").default(0),
  processingStrategy: text("processing_strategy").default("sequential"), // sequential, parallel
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),
  // New fields for capacity checks and tracking
  catalogCapacity: integer("catalog_capacity"),
  catalogCurrentCount: integer("catalog_current_count"),
  // Timestamps (as text strings with ISO format)
  createdAt: text("created_at").default(String(new Date().toISOString())).notNull(),
  updatedAt: text("updated_at").default(String(new Date().toISOString())).notNull(),
  // Event timestamps (as text strings with ISO format)
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  canceledAt: text("canceled_at"),
  pausedAt: text("paused_at"),
  resumedAt: text("resumed_at"),
  failedAt: text("failed_at"),
});

// Batch upload error logs for detailed error tracking
export const batchUploadErrors = pgTable("batch_upload_errors", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_upload_id").references(() => batchUploads.id, { onDelete: "cascade" }).notNull(),
  rowNumber: integer("row"),
  errorType: text("type").notNull(), // validation, processing, db, etc.
  errorMessage: text("message").notNull(),
  severity: text("severity").default("error"), // error, warning
  field: text("field"), // The specific field that caused the error
  createdAt: text("created_at").default(String(new Date().toISOString())),
});

// Attribute-based discount rules
// @deprecated - This table will be removed in a future migration
// as part of the centralized attribute system refactoring.
// Product attributes should never affect pricing in the new system.
export const attributeDiscountRules = pgTable("attribute_discount_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  discountType: text("discount_type").notNull().default("percentage"), // 'percentage', 'fixed'
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  attributeId: integer("attribute_id").references(() => attributes.id).notNull(),
  optionId: integer("option_id").references(() => attributeOptions.id),
  productId: integer("product_id").references(() => products.id),
  categoryId: integer("category_id").references(() => categories.id),
  catalogId: integer("catalog_id").references(() => catalogs.id),
  minQuantity: integer("min_quantity").default(1),
  startDate: text("start_date"),
  endDate: text("end_date"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: text("created_at").default(String(new Date().toISOString())).notNull(),
  updatedAt: text("updated_at").default(String(new Date().toISOString())).notNull(),
});

// Attribute discount rules relations
// @deprecated - These relations will be removed with the attributeDiscountRules table
export const attributeDiscountRulesRelations = relations(attributeDiscountRules, ({ one }) => ({
  attribute: one(attributes, {
    fields: [attributeDiscountRules.attributeId],
    references: [attributes.id]
  }),
  attributeOption: one(attributeOptions, {
    fields: [attributeDiscountRules.optionId],
    references: [attributeOptions.id]
  }),
  product: one(products, {
    fields: [attributeDiscountRules.productId],
    references: [products.id]
  }),
  category: one(categories, {
    fields: [attributeDiscountRules.categoryId],
    references: [categories.id]
  }),
  catalog: one(catalogs, {
    fields: [attributeDiscountRules.catalogId],
    references: [catalogs.id]
  })
}));

// Create insert schema for attribute discount rules
export const insertAttributeDiscountRuleSchema = createInsertSchema(attributeDiscountRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  startDate: z.string().or(z.date()).optional(),
  endDate: z.string().or(z.date()).nullable().optional(),
});

export type AttributeDiscountRule = typeof attributeDiscountRules.$inferSelect;
export type InsertAttributeDiscountRule = z.infer<typeof insertAttributeDiscountRuleSchema>;

// Create insert schema for batch uploads
export const insertBatchUploadSchema = createInsertSchema(batchUploads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  canceledAt: true,
  pausedAt: true,
  resumedAt: true,
  processedRecords: true,
  successCount: true,
  errorCount: true,
  warnings: true,
  lastProcessedRow: true,
  retryCount: true,
});

// Create insert schema for batch upload errors
export const insertBatchUploadErrorSchema = createInsertSchema(batchUploadErrors).omit({
  id: true,
  createdAt: true,
});

// Export batch upload types
export type BatchUpload = typeof batchUploads.$inferSelect;
export type InsertBatchUpload = z.infer<typeof insertBatchUploadSchema>;
export type BatchUploadError = typeof batchUploadErrors.$inferSelect;
export type InsertBatchUploadError = z.infer<typeof insertBatchUploadErrorSchema>;

// Define batch upload relations
export const batchUploadsRelations = relations(batchUploads, ({ one, many }) => ({
  user: one(users, {
    fields: [batchUploads.userId],
    references: [users.id]
  }),
  catalog: one(catalogs, {
    fields: [batchUploads.catalogId],
    references: [catalogs.id]
  }),
  errors: many(batchUploadErrors)
}));

export const batchUploadErrorsRelations = relations(batchUploadErrors, ({ one }) => ({
  batchUpload: one(batchUploads, {
    fields: [batchUploadErrors.batchId],
    references: [batchUploads.id]
  })
}));

// Product Drafts table for wizard auto-save functionality
export const productDrafts = pgTable("product_drafts", {
  id: serial("id").primaryKey(),
  draftId: text("draft_id").notNull().unique(), // Unique identifier for the draft
  userId: integer("user_id").references(() => users.id).notNull(),
  catalogId: integer("catalog_id").references(() => catalogs.id),
  step: integer("step").default(0).notNull(), // Current step in the wizard (0-3)
  data: jsonb("data").notNull(), // JSON data for the draft at any step
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Product Drafts relations
export const productDraftsRelations = relations(productDrafts, ({ one }) => ({
  user: one(users, {
    fields: [productDrafts.userId],
    references: [users.id]
  }),
  catalog: one(catalogs, {
    fields: [productDrafts.catalogId],
    references: [catalogs.id]
  })
}));

// Create insert schema for product drafts
export const insertProductDraftSchema = createInsertSchema(productDrafts).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
