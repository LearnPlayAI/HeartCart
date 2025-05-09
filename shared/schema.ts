import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, jsonb, varchar, unique, decimal } from "drizzle-orm/pg-core";
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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  lastLogin: timestamp("last_login", { withTimezone: true }),
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
  costPrice: doublePrecision("cost_price").notNull(),
  salePrice: doublePrecision("sale_price"),
  discount: integer("discount"),
  imageUrl: text("image_url"),
  additionalImages: text("additional_images").array(),
  rating: doublePrecision("rating").default(0),
  reviewCount: integer("review_count").default(0),
  isActive: boolean("is_active").default(true).notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  isFlashDeal: boolean("is_flash_deal").default(false).notNull(),
  flashDealEnd: timestamp("flash_deal_end", { withTimezone: true }),
  soldCount: integer("sold_count").default(0),
  supplier: text("supplier"),
  freeShipping: boolean("free_shipping").default(false),
  weight: doublePrecision("weight"), // in kg
  dimensions: text("dimensions"), // format: "LxWxH" in cm
  brand: text("brand"),
  tags: text("tags").array(),
  displayOrder: integer("display_order").default(999), // Default high number to place new products at the end
  hasBackgroundRemoved: boolean("has_background_removed").default(false),
  originalImageObjectKey: text("original_image_object_key"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Order items table
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id),
  productId: integer("product_id").references(() => products.id),
  quantity: integer("quantity").notNull(),
  price: doublePrecision("price").notNull(),
  combinationHash: text("combination_hash"),
  // Remove reference to non-existent table
  combinationId: integer("combination_id"),
  selectedAttributes: jsonb("selected_attributes").default({}),
  priceAdjustment: doublePrecision("price_adjustment").default(0),
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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
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

// Catalog Attributes - attributes assigned to a catalog
export const catalogAttributes = pgTable("catalog_attributes", {
  id: serial("id").primaryKey(),
  catalogId: integer("catalog_id").notNull().references(() => catalogs.id, { onDelete: "cascade" }),
  attributeId: integer("attribute_id").notNull().references(() => attributes.id, { onDelete: "cascade" }),
  overrideDisplayName: varchar("override_display_name", { length: 100 }), // Optional custom name for this catalog
  overrideDescription: text("override_description"), // Optional custom description for this catalog
  isRequired: boolean("is_required"), // Override the base attribute's isRequired flag
  isFilterable: boolean("is_filterable"), // Override the base attribute's isFilterable flag
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    catalogAttrUnique: unique().on(table.catalogId, table.attributeId),
  };
});

// Catalog Attribute Options - custom options for catalog level attributes (can override or add to base options)
export const catalogAttributeOptions = pgTable("catalog_attribute_options", {
  id: serial("id").primaryKey(),
  catalogAttributeId: integer("catalog_attribute_id").notNull().references(() => catalogAttributes.id, { onDelete: "cascade" }),
  value: varchar("value", { length: 255 }).notNull(),
  displayValue: varchar("display_value", { length: 255 }).notNull(),
  baseOptionId: integer("base_option_id").references(() => attributeOptions.id), // May link to a base option, or null if custom
  metadata: jsonb("metadata"), // Additional data
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    catalogAttrOptionUnique: unique().on(table.catalogAttributeId, table.value),
  };
});

// Category Attributes - attributes assigned to a category
export const categoryAttributes = pgTable("category_attributes", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  attributeId: integer("attribute_id").notNull().references(() => attributes.id, { onDelete: "cascade" }),
  catalogAttributeId: integer("catalog_attribute_id").references(() => catalogAttributes.id), // Can inherit from catalog or be null
  overrideDisplayName: varchar("override_display_name", { length: 100 }),
  overrideDescription: text("override_description"),
  isRequired: boolean("is_required"),
  isFilterable: boolean("is_filterable"),
  inheritFromParent: boolean("inherit_from_parent").default(false), // Whether to inherit from parent category
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    categoryAttrUnique: unique().on(table.categoryId, table.attributeId),
  };
});

// Category Attribute Options - custom options for category level attributes
export const categoryAttributeOptions = pgTable("category_attribute_options", {
  id: serial("id").primaryKey(),
  categoryAttributeId: integer("category_attribute_id").notNull().references(() => categoryAttributes.id, { onDelete: "cascade" }),
  value: varchar("value", { length: 255 }).notNull(),
  displayValue: varchar("display_value", { length: 255 }).notNull(),
  baseOptionId: integer("base_option_id").references(() => attributeOptions.id), // May link to base option or catalog option
  catalogOptionId: integer("catalog_option_id").references(() => catalogAttributeOptions.id),
  metadata: jsonb("metadata"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    categoryAttrOptionUnique: unique().on(table.categoryAttributeId, table.value),
  };
});

// Product Attributes - attributes assigned to a product
export const productAttributes = pgTable("product_attributes", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  attributeId: integer("attribute_id").notNull().references(() => attributes.id, { onDelete: "cascade" }),
  categoryAttributeId: integer("category_attribute_id").references(() => categoryAttributes.id), // Can inherit or be custom
  overrideDisplayName: varchar("override_display_name", { length: 100 }),
  overrideDescription: text("override_description"),
  isRequired: boolean("is_required"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    productAttrUnique: unique().on(table.productId, table.attributeId),
  };
});

// Product Attribute Options - custom options for product level attributes
export const productAttributeOptions = pgTable("product_attribute_options", {
  id: serial("id").primaryKey(),
  productAttributeId: integer("product_attribute_id").notNull().references(() => productAttributes.id, { onDelete: "cascade" }),
  value: varchar("value", { length: 255 }).notNull(),
  displayValue: varchar("display_value", { length: 255 }).notNull(),
  baseOptionId: integer("base_option_id").references(() => attributeOptions.id),
  categoryOptionId: integer("category_option_id").references(() => categoryAttributeOptions.id),
  catalogOptionId: integer("catalog_option_id").references(() => catalogAttributeOptions.id),
  priceAdjustment: decimal("price_adjustment", { precision: 10, scale: 2 }).default("0"),
  metadata: jsonb("metadata"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    productAttrOptionUnique: unique().on(table.productAttributeId, table.value),
  };
});

// Product Attribute Values - selected attribute values for a specific product
export const productAttributeValues = pgTable("product_attribute_values", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  attributeId: integer("attribute_id").notNull().references(() => attributes.id, { onDelete: "cascade" }),
  optionId: integer("option_id").references(() => productAttributeOptions.id), // For select/radio/color types
  textValue: text("text_value"), // For text/textarea types
  dateValue: timestamp("date_value", { withTimezone: true }), // For date types
  numericValue: decimal("numeric_value", { precision: 10, scale: 2 }), // For numeric types
  priceAdjustment: decimal("price_adjustment", { precision: 10, scale: 2 }).default("0"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

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
export const insertCatalogAttributeSchema = createInsertSchema(catalogAttributes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Catalog attribute option insert schema
export const insertCatalogAttributeOptionSchema = createInsertSchema(catalogAttributeOptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  metadata: z.record(z.any()).optional(),
  baseOptionId: z.number().nullable().optional(),
});

// Category attribute insert schema
export const insertCategoryAttributeSchema = createInsertSchema(categoryAttributes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  catalogAttributeId: z.number().nullable().optional(),
});

// Category attribute option insert schema
export const insertCategoryAttributeOptionSchema = createInsertSchema(categoryAttributeOptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  metadata: z.record(z.any()).optional(),
  baseOptionId: z.number().nullable().optional(),
  catalogOptionId: z.number().nullable().optional(),
});

// Product attribute insert schema
export const insertProductAttributeSchema = createInsertSchema(productAttributes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  categoryAttributeId: z.number().nullable().optional(),
});

// Product attribute option insert schema
export const insertProductAttributeOptionSchema = createInsertSchema(productAttributeOptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  metadata: z.record(z.any()).optional(),
  baseOptionId: z.number().nullable().optional(),
  categoryOptionId: z.number().nullable().optional(),
  catalogOptionId: z.number().nullable().optional(),
});

// Product attribute value insert schema
export const insertProductAttributeValueSchema = createInsertSchema(productAttributeValues).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  optionId: z.number().nullable().optional(),
  textValue: z.string().nullable().optional(),
  dateValue: z.date().nullable().optional(),
  numericValue: z.number().nullable().optional(),
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

export type CatalogAttribute = typeof catalogAttributes.$inferSelect;
export type InsertCatalogAttribute = z.infer<typeof insertCatalogAttributeSchema>;

export type CatalogAttributeOption = typeof catalogAttributeOptions.$inferSelect;
export type InsertCatalogAttributeOption = z.infer<typeof insertCatalogAttributeOptionSchema>;

export type CategoryAttribute = typeof categoryAttributes.$inferSelect;
export type InsertCategoryAttribute = z.infer<typeof insertCategoryAttributeSchema>;

export type CategoryAttributeOption = typeof categoryAttributeOptions.$inferSelect;
export type InsertCategoryAttributeOption = z.infer<typeof insertCategoryAttributeOptionSchema>;

export type ProductAttribute = typeof productAttributes.$inferSelect;
export type InsertProductAttribute = z.infer<typeof insertProductAttributeSchema>;

export type ProductAttributeOption = typeof productAttributeOptions.$inferSelect;
export type InsertProductAttributeOption = z.infer<typeof insertProductAttributeOptionSchema>;

export type ProductAttributeValue = typeof productAttributeValues.$inferSelect;
export type InsertProductAttributeValue = z.infer<typeof insertProductAttributeValueSchema>;

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
  catalogAttributes: many(catalogAttributes),
  categoryAttributes: many(categoryAttributes),
  productAttributes: many(productAttributes),
  productAttributeValues: many(productAttributeValues)
}));

// Attribute options relations
export const attributeOptionsRelations = relations(attributeOptions, ({ one }) => ({
  attribute: one(attributes, {
    fields: [attributeOptions.attributeId],
    references: [attributes.id]
  })
}));

// Catalog attributes relations
export const catalogAttributesRelations = relations(catalogAttributes, ({ one, many }) => ({
  catalog: one(catalogs, {
    fields: [catalogAttributes.catalogId],
    references: [catalogs.id]
  }),
  attribute: one(attributes, {
    fields: [catalogAttributes.attributeId],
    references: [attributes.id]
  }),
  options: many(catalogAttributeOptions),
  categoryAttributes: many(categoryAttributes, {
    relationName: "catalog_relation"
  })
}));

// Catalog attribute options relations
export const catalogAttributeOptionsRelations = relations(catalogAttributeOptions, ({ one }) => ({
  catalogAttribute: one(catalogAttributes, {
    fields: [catalogAttributeOptions.catalogAttributeId],
    references: [catalogAttributes.id]
  }),
  baseOption: one(attributeOptions, {
    fields: [catalogAttributeOptions.baseOptionId],
    references: [attributeOptions.id]
  })
}));

// Category attributes relations
export const categoryAttributesRelations = relations(categoryAttributes, ({ one, many }) => ({
  category: one(categories, {
    fields: [categoryAttributes.categoryId],
    references: [categories.id]
  }),
  attribute: one(attributes, {
    fields: [categoryAttributes.attributeId],
    references: [attributes.id]
  }),
  catalogAttribute: one(catalogAttributes, {
    fields: [categoryAttributes.catalogAttributeId],
    references: [catalogAttributes.id],
    relationName: "catalog_relation"
  }),
  options: many(categoryAttributeOptions),
  productAttributes: many(productAttributes, {
    relationName: "category_relation"
  })
}));

// Category attribute options relations
export const categoryAttributeOptionsRelations = relations(categoryAttributeOptions, ({ one }) => ({
  categoryAttribute: one(categoryAttributes, {
    fields: [categoryAttributeOptions.categoryAttributeId],
    references: [categoryAttributes.id]
  }),
  baseOption: one(attributeOptions, {
    fields: [categoryAttributeOptions.baseOptionId],
    references: [attributeOptions.id]
  }),
  catalogOption: one(catalogAttributeOptions, {
    fields: [categoryAttributeOptions.catalogOptionId],
    references: [catalogAttributeOptions.id]
  })
}));

// Product attributes relations
export const productAttributesRelations = relations(productAttributes, ({ one, many }) => ({
  product: one(products, {
    fields: [productAttributes.productId],
    references: [products.id]
  }),
  attribute: one(attributes, {
    fields: [productAttributes.attributeId],
    references: [attributes.id]
  }),
  categoryAttribute: one(categoryAttributes, {
    fields: [productAttributes.categoryAttributeId],
    references: [categoryAttributes.id],
    relationName: "category_relation"
  }),
  options: many(productAttributeOptions)
}));

// Product attribute options relations
export const productAttributeOptionsRelations = relations(productAttributeOptions, ({ one }) => ({
  productAttribute: one(productAttributes, {
    fields: [productAttributeOptions.productAttributeId],
    references: [productAttributes.id]
  }),
  baseOption: one(attributeOptions, {
    fields: [productAttributeOptions.baseOptionId],
    references: [attributeOptions.id]
  }),
  categoryOption: one(categoryAttributeOptions, {
    fields: [productAttributeOptions.categoryOptionId],
    references: [categoryAttributeOptions.id]
  }),
  catalogOption: one(catalogAttributeOptions, {
    fields: [productAttributeOptions.catalogOptionId],
    references: [catalogAttributeOptions.id]
  })
}));

// Product attribute values relations
export const productAttributeValuesRelations = relations(productAttributeValues, ({ one }) => ({
  product: one(products, {
    fields: [productAttributeValues.productId],
    references: [products.id]
  }),
  attribute: one(attributes, {
    fields: [productAttributeValues.attributeId],
    references: [attributes.id]
  }),
  option: one(productAttributeOptions, {
    fields: [productAttributeValues.optionId],
    references: [productAttributeOptions.id]
  })
}));

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
  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  // Event timestamps
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  pausedAt: timestamp("paused_at", { withTimezone: true }),
  resumedAt: timestamp("resumed_at", { withTimezone: true }),
  failedAt: timestamp("failed_at", { withTimezone: true }),
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
  createdAt: timestamp("created_at", { withTimezone: true }),
});

// Attribute-based discount rules
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
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Attribute discount rules relations
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
