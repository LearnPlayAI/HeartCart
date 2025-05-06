import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, jsonb, varchar, unique, decimal } from "drizzle-orm/pg-core";
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastLogin: timestamp("last_login"),
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
});

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
  flashDealEnd: timestamp("flash_deal_end"),
  soldCount: integer("sold_count").default(0),
  supplier: text("supplier"),
  freeShipping: boolean("free_shipping").default(false),
  weight: doublePrecision("weight"), // in kg
  dimensions: text("dimensions"), // format: "LxWxH" in cm
  brand: text("brand"),
  tags: text("tags").array(),
  hasBackgroundRemoved: boolean("has_background_removed").default(false),
  originalImageObjectKey: text("original_image_object_key"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Cart items table
export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  productId: integer("product_id").references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  alt: text("alt"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// AI Recommendations table
export const aiRecommendations = pgTable("ai_recommendations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  productIds: integer("product_ids").array(),
  reason: text("reason"),
  aiResponse: jsonb("ai_response"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Pricing settings table for category-specific markup percentages
export const pricing = pgTable("pricing", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => categories.id),
  markupPercentage: integer("markup_percentage").notNull().default(50),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Category Attributes - for defining which attributes a category has
export const categoryAttributes = pgTable("category_attributes", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull().references(() => categories.id),
  name: varchar("name", { length: 100 }).notNull(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  description: text("description"),
  attributeType: varchar("attribute_type", { length: 50 }).notNull(), // 'select', 'color', 'text', etc.
  isRequired: boolean("is_required").default(false),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    categoryAttrUnique: unique().on(table.categoryId, table.name),
  };
});

// Category Attribute Options - for storing predefined options for select-type attributes
export const categoryAttributeOptions = pgTable("category_attribute_options", {
  id: serial("id").primaryKey(),
  attributeId: integer("attribute_id").notNull().references(() => categoryAttributes.id),
  value: varchar("value", { length: 255 }).notNull(),
  displayValue: varchar("display_value", { length: 255 }).notNull(),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Product Attribute Values - for storing the actual values of attributes for each product
export const productAttributeValues = pgTable("product_attribute_values", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  attributeId: integer("attribute_id").notNull().references(() => categoryAttributes.id),
  value: text("value").notNull(), // Could be an option ID, color hex code, text, etc.
  priceAdjustment: decimal("price_adjustment", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    productAttrUnique: unique().on(table.productId, table.attributeId),
  };
});

// Product Attribute Combinations - for storing different combinations and their prices
export const productAttributeCombinations = pgTable("product_attribute_combinations", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  combinationHash: varchar("combination_hash", { length: 64 }).notNull(), // Hash of the attribute values
  priceAdjustment: decimal("price_adjustment", { precision: 10, scale: 2 }).default("0"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    productCombinationUnique: unique().on(table.productId, table.combinationHash),
  };
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
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
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
  isActive: true,
});

export const insertCatalogSchema = createInsertSchema(catalogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isActive: true,
}).extend({
  startDate: z.string().or(z.date()).optional(),
  endDate: z.string().or(z.date()).nullable().optional(),
});

// Category Attributes insert schema
export const insertCategoryAttributeSchema = createInsertSchema(categoryAttributes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Category Attribute Options insert schema
export const insertCategoryAttributeOptionSchema = createInsertSchema(categoryAttributeOptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Product Attribute Values insert schema
export const insertProductAttributeValueSchema = createInsertSchema(productAttributeValues).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Product Attribute Combinations insert schema
export const insertProductAttributeCombinationSchema = createInsertSchema(productAttributeCombinations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isActive: true,
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

export type CategoryAttribute = typeof categoryAttributes.$inferSelect;
export type InsertCategoryAttribute = z.infer<typeof insertCategoryAttributeSchema>;

export type CategoryAttributeOption = typeof categoryAttributeOptions.$inferSelect;
export type InsertCategoryAttributeOption = z.infer<typeof insertCategoryAttributeOptionSchema>;

export type ProductAttributeValue = typeof productAttributeValues.$inferSelect;
export type InsertProductAttributeValue = z.infer<typeof insertProductAttributeValueSchema>;

export type ProductAttributeCombination = typeof productAttributeCombinations.$inferSelect;
export type InsertProductAttributeCombination = z.infer<typeof insertProductAttributeCombinationSchema>;
