import { pgTable, text, serial, integer, boolean, doublePrecision, jsonb, varchar, unique, decimal, index, numeric } from "drizzle-orm/pg-core";
import { formatCurrentDateSAST } from "./utils/date-utils";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ========== Base Tables ==========

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: text("password").notNull(),
  email: varchar("email", { length: 100 }).notNull().unique(),
  fullName: text("full_name"),
  profilePicture: text("profile_picture"),
  phoneNumber: text("phone_number"),
  address: text("address"),
  city: text("city"),
  postalCode: text("postal_code"),
  country: text("country"),
  role: text("role").default("customer").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  lastLogin: text("last_login"),
  createdAt: text("created_at").default(() => formatCurrentDateSAST()).notNull(),
  updatedAt: text("updated_at").default(() => formatCurrentDateSAST()).notNull(),
});

// User relations
export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
}));

// Categories table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  parentId: integer("parent_id").references(() => categories.id),
  imageUrl: text("image_url"),
  icon: text("icon"),
  isActive: boolean("is_active").default(true).notNull(),
  level: integer("level").default(0).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  createdAt: text("created_at").default(() => formatCurrentDateSAST()).notNull(),
  updatedAt: text("updated_at").default(() => formatCurrentDateSAST()).notNull(),
});

// Category relations
export const categoriesRelations = relations(categories, ({ many, one }) => ({
  products: many(products),
  children: many(categories),
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
  }),
}));

// Suppliers table
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  contactName: varchar("contact_name", { length: 100 }),
  email: varchar("email", { length: 100 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: text("created_at").default(() => formatCurrentDateSAST()).notNull(),
  updatedAt: text("updated_at").default(() => formatCurrentDateSAST()).notNull(),
});

// Supplier relations
export const suppliersRelations = relations(suppliers, ({ many }) => ({
  catalogs: many(catalogs),
}));

// Catalogs table
export const catalogs = pgTable("catalogs", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").references(() => suppliers.id).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  startDate: text("start_date"),
  endDate: text("end_date"),
  createdAt: text("created_at").default(() => formatCurrentDateSAST()).notNull(),
  updatedAt: text("updated_at").default(() => formatCurrentDateSAST()).notNull(),
});

// Catalog relations
export const catalogsRelations = relations(catalogs, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [catalogs.supplierId],
    references: [suppliers.id],
  }),
  products: many(products),
}));

// Products table
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  categoryId: integer("category_id").references(() => categories.id),
  price: doublePrecision("price").notNull(),
  salePrice: doublePrecision("sale_price"),
  discount: integer("discount"),
  imageUrl: text("image_url"),
  additionalImages: text("additional_images").array(),
  stock: integer("stock").notNull(),
  rating: doublePrecision("rating"),
  reviewCount: integer("review_count"),
  isActive: boolean("is_active").notNull(),
  isFeatured: boolean("is_featured").notNull(),
  isFlashDeal: boolean("is_flash_deal").notNull(),
  soldCount: integer("sold_count"),
  supplier: text("supplier"),
  freeShipping: boolean("free_shipping"),
  weight: doublePrecision("weight"),
  dimensions: text("dimensions"),
  brand: text("brand"),
  tags: text("tags").array(),
  hasBackgroundRemoved: boolean("has_background_removed"),
  originalImageObjectKey: text("original_image_object_key"),
  costPrice: doublePrecision("cost_price"),
  catalogId: integer("catalog_id").references(() => catalogs.id),
  displayOrder: integer("display_order"),
  createdAt: text("created_at"),
  flashDealEnd: text("flash_deal_end"),
  minimumPrice: doublePrecision("minimum_price"),
  minimumOrder: integer("minimum_order"),
  discountLabel: text("discount_label"),
  specialSaleText: text("special_sale_text"),
  specialSaleStart: text("special_sale_start"),
  specialSaleEnd: text("special_sale_end"),
  requiredAttributeIds: integer("required_attribute_ids").array(),
  
  // Schema-only columns made nullable
  updatedAt: text("updated_at"),
  sku: text("sku"),
});

// Product relations
export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  // No direct supplier relation in current DB schema, supplier is stored as text
  catalog: one(catalogs, {
    fields: [products.catalogId],
    references: [catalogs.id],
  }),
  images: many(productImages),
}));

// Product Images table
export const productImages = pgTable("product_images", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id).notNull(),
  url: text("url").notNull(),
  objectKey: text("object_key").notNull(),
  isMain: boolean("is_main"),
  hasBgRemoved: boolean("has_bg_removed"),
  bgRemovedUrl: text("bg_removed_url"),
  bgRemovedObjectKey: text("bg_removed_object_key"),
  sortOrder: integer("sort_order").default(0),
  createdAt: text("created_at").default(() => formatCurrentDateSAST()),
});

// Product Images relations
export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

// Product Drafts table for the wizard
export const productDrafts = pgTable("product_drafts", {
  id: serial("id").primaryKey(),
  originalProductId: integer("original_product_id").references(() => products.id),
  draftStatus: text("draft_status").default("draft").notNull(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: text("created_at").default(() => formatCurrentDateSAST()).notNull(),
  lastModified: text("last_modified").default(() => formatCurrentDateSAST()),
  
  // Basic product info
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  sku: text("sku"),
  description: text("description"),
  brand: text("brand"),
  categoryId: integer("category_id").references(() => categories.id),
  isActive: boolean("is_active").default(false),
  isFeatured: boolean("is_featured").default(false),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  catalogId: integer("catalog_id").references(() => catalogs.id),
  
  // Pricing fields
  costPrice: numeric("cost_price"),
  regularPrice: numeric("regular_price"),
  salePrice: numeric("sale_price"),
  onSale: boolean("on_sale").default(false),
  markupPercentage: integer("markup_percentage"),
  minimumPrice: numeric("minimum_price"),
  
  // Inventory fields
  stockLevel: integer("stock_level").default(0),
  lowStockThreshold: integer("low_stock_threshold").default(5),
  backorderEnabled: boolean("backorder_enabled").default(false),
  weight: text("weight"),
  dimensions: text("dimensions"),
  
  // Image fields
  imageUrls: text("image_urls").array(),
  imageObjectKeys: text("image_object_keys").array(),
  mainImageIndex: integer("main_image_index"),
  
  // Sales promotion fields
  discountLabel: text("discount_label"),
  specialSaleText: text("special_sale_text"),
  specialSaleStart: text("special_sale_start"),
  specialSaleEnd: text("special_sale_end"),
  isFlashDeal: boolean("is_flash_deal").default(false),
  flashDealEnd: text("flash_deal_end"),
  
  // SEO fields
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  metaKeywords: text("meta_keywords"),
  canonicalUrl: text("canonical_url"),
  
  // Additional fields
  taxable: boolean("taxable"),
  taxClass: text("tax_class"),
  wizardProgress: jsonb("wizard_progress").default({}),
  attributes: jsonb("attributes"),
  attributesData: jsonb("attributes_data"),
  publishedAt: text("published_at"),
  publishedVersion: integer("published_version"),
  hasAiDescription: boolean("has_ai_description"),
  hasAiSeo: boolean("has_ai_seo"),
  freeShipping: boolean("free_shipping"),
  shippingClass: text("shipping_class"),
  lastReviewer: integer("last_reviewer"),
  rejectionReason: text("rejection_reason"),
  completedSteps: text("completed_steps").array(),
  version: integer("version"),
  changeHistory: jsonb("change_history"),
  
  // Selected attributes (will be stored as relations when published)
  selectedAttributes: jsonb("selected_attributes").default({}),
  
  // AI-generated suggestions
  aiSuggestions: jsonb("ai_suggestions"),
  discountData: jsonb("discount_data"),
});

// AI Recommendations table
export const aiRecommendations = pgTable("ai_recommendations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  productIds: integer("product_ids").array(),
  reason: text("reason"),
  aiResponse: jsonb("ai_response"),
  createdAt: text("created_at").default(() => formatCurrentDateSAST()).notNull(),
});

// Pricing settings table for category-specific markup percentages
export const pricing = pgTable("pricing", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => categories.id),
  markupPercentage: integer("markup_percentage").notNull().default(50),
  description: text("description"),
  createdAt: text("created_at").default(() => formatCurrentDateSAST()).notNull(),
  updatedAt: text("updated_at").default(() => formatCurrentDateSAST()).notNull(),
}, (table) => {
  return {
    categoryUnique: unique().on(table.categoryId),
  };
});

// Product Attributes (template)
export const attributes = pgTable("attributes", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 50 }).default("select").notNull(),
  isRequired: boolean("is_required").default(false),
  isFilterable: boolean("is_filterable").default(true),
  isSearchable: boolean("is_searchable").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: text("created_at").default(() => formatCurrentDateSAST()).notNull(),
  updatedAt: text("updated_at").default(() => formatCurrentDateSAST()).notNull(),
});

// Attribute options
export const attributeOptions = pgTable("attribute_options", {
  id: serial("id").primaryKey(),
  attributeId: integer("attribute_id").references(() => attributes.id).notNull(),
  value: varchar("value").notNull(),
  displayValue: varchar("display_value").notNull(),
  // Add metadata column from database
  metadata: jsonb("metadata"),
  sortOrder: integer("sort_order"),
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
}, (table) => {
  return {
    attributeValueUnique: unique().on(table.attributeId, table.value),
  };
});

// Product - Attribute values
export const productAttributes = pgTable("product_attributes", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id).notNull(),
  attributeId: integer("attribute_id").references(() => attributes.id).notNull(),
  attributeOptionId: integer("attribute_option_id").references(() => attributeOptions.id),
  customValue: text("custom_value"),
  sortOrder: integer("sort_order").default(0),
  createdAt: text("created_at").default(() => formatCurrentDateSAST()).notNull(),
  updatedAt: text("updated_at").default(() => formatCurrentDateSAST()).notNull(),
}, (table) => {
  return {
    productAttributeUnique: unique().on(table.productId, table.attributeId),
  };
});

// Relations for attributes
export const attributesRelations = relations(attributes, ({ many }) => ({
  options: many(attributeOptions),
  productAttributes: many(productAttributes),
}));

export const attributeOptionsRelations = relations(attributeOptions, ({ one, many }) => ({
  attribute: one(attributes, {
    fields: [attributeOptions.attributeId],
    references: [attributes.id],
  }),
  productAttributes: many(productAttributes),
}));

export const productAttributesRelations = relations(productAttributes, ({ one }) => ({
  product: one(products, {
    fields: [productAttributes.productId],
    references: [products.id],
  }),
  attribute: one(attributes, {
    fields: [productAttributes.attributeId],
    references: [attributes.id],
  }),
  attributeOption: one(attributeOptions, {
    fields: [productAttributes.attributeOptionId],
    references: [attributeOptions.id],
  }),
}));

// Orders table
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  status: varchar("status", { length: 50 }).default("pending").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).default("0").notNull(),
  paymentStatus: varchar("payment_status", { length: 50 }).default("pending").notNull(),
  shippingAddress: text("shipping_address"),
  billingAddress: text("billing_address"),
  paymentMethod: varchar("payment_method", { length: 50 }),
  shippingMethod: varchar("shipping_method", { length: 50 }),
  trackingNumber: varchar("tracking_number", { length: 100 }),
  notes: text("notes"),
  createdAt: text("created_at").default(() => formatCurrentDateSAST()).notNull(),
  updatedAt: text("updated_at").default(() => formatCurrentDateSAST()).notNull(),
});

// Order relations
export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
}));

// Order Items table
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").default(1).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  selectedOptions: jsonb("selected_options"),
  createdAt: text("created_at").default(() => formatCurrentDateSAST()).notNull(),
});

// Order Items relations
export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

// Cart Items table
export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  productId: integer("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").default(1).notNull(),
  combinationHash: text("combination_hash"),
  combinationId: integer("combination_id"),
  selectedAttributes: jsonb("selected_attributes").default({}),
  priceAdjustment: doublePrecision("price_adjustment").default(0),
  discountData: jsonb("discount_data"),
  totalDiscount: doublePrecision("total_discount").default(0),
  itemPrice: doublePrecision("item_price"),
  createdAt: text("created_at").default(() => formatCurrentDateSAST()).notNull(),
});

// Cart Items relations
export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
  user: one(users, {
    fields: [cartItems.userId],
    references: [users.id],
  }),
}));

// AI Settings table
export const aiSettings = pgTable("ai_settings", {
  id: serial("id").primaryKey(),
  // Actual database columns
  settingName: varchar("setting_name").notNull(),
  settingValue: text("setting_value").notNull(),
  description: text("description"),
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
  
  // Schema-only columns made nullable
  userId: integer("user_id").references(() => users.id),
  preferredModel: varchar("preferred_model", { length: 50 }),
  maxTokens: integer("max_tokens"),
  temperature: doublePrecision("temperature"),
  customSettings: jsonb("custom_settings"),
});

// AI Settings relations
export const aiSettingsRelations = relations(aiSettings, ({ one }) => ({
  user: one(users, {
    fields: [aiSettings.userId],
    references: [users.id],
  }),
}));

// Batch Uploads table
export const batchUploads = pgTable("batch_uploads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).default("pending").notNull(),
  totalRows: integer("total_rows").default(0),
  processedRows: integer("processed_rows").default(0),
  successfulRows: integer("successful_rows").default(0),
  failedRows: integer("failed_rows").default(0),
  fileUrl: text("file_url"),
  objectKey: text("object_key"),
  createdAt: text("created_at").default(() => formatCurrentDateSAST()).notNull(),
  updatedAt: text("updated_at").default(() => formatCurrentDateSAST()).notNull(),
});

// Batch Upload relations
export const batchUploadsRelations = relations(batchUploads, ({ one, many }) => ({
  user: one(users, {
    fields: [batchUploads.userId],
    references: [users.id],
  }),
  errors: many(batchUploadErrors),
}));

// Batch Upload Errors table
export const batchUploadErrors = pgTable("batch_upload_errors", {
  id: serial("id").primaryKey(),
  batchUploadId: integer("batch_upload_id").references(() => batchUploads.id).notNull(),
  rowNumber: integer("row_number").notNull(),
  columnName: varchar("column_name", { length: 100 }),
  errorMessage: text("error_message").notNull(),
  rowData: jsonb("row_data"),
  createdAt: text("created_at").default(() => formatCurrentDateSAST()).notNull(),
});

// Batch Upload Errors relations
export const batchUploadErrorsRelations = relations(batchUploadErrors, ({ one }) => ({
  batchUpload: one(batchUploads, {
    fields: [batchUploadErrors.batchUploadId],
    references: [batchUploads.id],
  }),
}));

// ========== Insert Schemas ==========
// These are used for validating data before insertion

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertProductDraftSchema = createInsertSchema(productDrafts).omit({ id: true });
export const insertProductImageSchema = createInsertSchema(productImages).omit({ id: true });
export const insertAttributeSchema = createInsertSchema(attributes).omit({ id: true });
export const insertAttributeOptionSchema = createInsertSchema(attributeOptions).omit({ id: true });
export const insertProductAttributeSchema = createInsertSchema(productAttributes).omit({ id: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export const insertCartItemSchema = createInsertSchema(cartItems).omit({ id: true });
export const insertAiSettingSchema = createInsertSchema(aiSettings).omit({ id: true });
export const insertBatchUploadSchema = createInsertSchema(batchUploads).omit({ id: true });
export const insertBatchUploadErrorSchema = createInsertSchema(batchUploadErrors).omit({ id: true });
export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true });
export const insertCatalogSchema = createInsertSchema(catalogs).omit({ id: true });

// ========== TypeScript Types ==========
// These are used to enforce type safety in our application code

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type ProductDraft = typeof productDrafts.$inferSelect;
export type InsertProductDraft = z.infer<typeof insertProductDraftSchema>;

export type ProductImage = typeof productImages.$inferSelect;
export type InsertProductImage = z.infer<typeof insertProductImageSchema>;

export type Attribute = typeof attributes.$inferSelect;
export type InsertAttribute = z.infer<typeof insertAttributeSchema>;

export type AttributeOption = typeof attributeOptions.$inferSelect;
export type InsertAttributeOption = z.infer<typeof insertAttributeOptionSchema>;

export type ProductAttribute = typeof productAttributes.$inferSelect;
export type InsertProductAttribute = z.infer<typeof insertProductAttributeSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;

export type AiSetting = typeof aiSettings.$inferSelect;
export type InsertAiSetting = z.infer<typeof insertAiSettingSchema>;

export type BatchUpload = typeof batchUploads.$inferSelect;
export type InsertBatchUpload = z.infer<typeof insertBatchUploadSchema>;

export type BatchUploadError = typeof batchUploadErrors.$inferSelect;
export type InsertBatchUploadError = z.infer<typeof insertBatchUploadErrorSchema>;

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;

export type Catalog = typeof catalogs.$inferSelect;
export type InsertCatalog = z.infer<typeof insertCatalogSchema>;