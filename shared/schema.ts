import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, json, jsonb, varchar, unique, decimal, index } from "drizzle-orm/pg-core";
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
  mailVerified: boolean("mailVerified").default(false).notNull(),
  role: text("role").default("user").notNull(), // 'user', 'admin', etc.
  createdAt: text("createdAt").default(String(new Date().toISOString())).notNull(),
  updatedAt: text("updatedAt").default(String(new Date().toISOString())).notNull(),
  lastLogin: text("last_login"),
  
  // Preferred PUDO Locker
  preferredLockerId: integer("preferredLockerId"),
  preferredLockerCode: text("preferredLockerCode"),
  
  // Sales Rep System
  repCode: text("repCode"), // Optional rep code entered during registration
});

// PUDO Lockers table - stores all available pickup lockers
export const pudoLockers = pgTable("pudoLockers", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  provider: text("provider").notNull(),
  name: text("name").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  openingHours: jsonb("openingHours").notNull(),
  address: text("address").notNull(),
  detailedAddress: jsonb("detailedAddress").notNull(),
  lockerType: jsonb("lockerType").notNull(),
  place: jsonb("place").notNull(),
  lstTypesBoxes: jsonb("lstTypesBoxes").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
}, (table) => {
  return {
    codeIdx: index("pudoLockers_code_idx").on(table.code),
    providerIdx: index("pudoLockers_provider_idx").on(table.provider),
    nameIdx: index("pudoLockers_name_idx").on(table.name),
    isActiveIdx: index("pudoLockers_is_active_idx").on(table.isActive),
  };
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
  supplier: text("supplier"), // Legacy text field - kept for backward compatibility
  supplierId: integer("supplierId").notNull().references(() => suppliers.id), // Required FK to suppliers table for shipping system
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
  // Credit system fields
  costPrice: decimal("costPrice", { precision: 10, scale: 2 }),
  supplierAvailable: boolean("supplierAvailable").default(true).notNull(),
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
  attributeSelections: jsonb("attributeSelections").default('{}').notNull(), // Store selected attributes with quantities like {gender: {"Boy": 1, "Girl": 2}}
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
  shippingMethod: text("shippingMethod").notNull().default("standard"), // standard, express - legacy field
  shippingCost: doublePrecision("shippingCost").notNull(), // Customer payment amount - MUST be explicitly set from checkout
  actualShippingCost: doublePrecision("actualShippingCost"), // Actual shipping cost to company for profit calculation
  
  // Multi-supplier shipping system fields
  shippingTotal: decimal("shippingTotal", { precision: 10, scale: 2 }), // Total shipping cost across all shipments
  shipmentCount: integer("shipmentCount"), // Number of separate shipments for this order
  
  // Payment information
  paymentMethod: text("paymentMethod").notNull().default("eft"), // eft, card
  paymentStatus: text("paymentStatus").notNull().default("pending"), // pending, paid, payment_received, failed
  paymentReferenceNumber: text("paymentReferenceNumber"), // TMY-X-DDMMYYYY format for bank transfer reference
  paymentReceivedDate: text("paymentReceivedDate"), // Date when admin confirmed payment was received
  
  // YoCo card payment fields
  yocoCheckoutId: text("yocoCheckoutId"), // YoCo checkout session ID
  yocoPaymentId: text("yocoPaymentId"), // YoCo payment ID after successful payment
  transactionFeeAmount: doublePrecision("transactionFeeAmount").default(0), // YoCo transaction fee amount
  transactionFeePercentage: doublePrecision("transactionFeePercentage").default(0), // YoCo fee percentage used
  
  // Order totals
  subtotalAmount: doublePrecision("subtotalAmount").notNull(),
  totalAmount: doublePrecision("totalAmount").notNull(),
  
  // VAT system fields - South African Value Added Tax
  vatAmount: doublePrecision("vatAmount").notNull().default(0), // Calculated VAT amount
  vatRate: doublePrecision("vatRate").notNull(), // VAT rate used for this order (from admin settings)
  vatRegistrationNumber: text("vatRegistrationNumber"), // Historical VAT registration number when order was placed
  
  // Credit system fields
  creditUsed: decimal("creditUsed", { precision: 10, scale: 2 }).notNull().default('0'),
  remainingBalance: decimal("remainingBalance", { precision: 10, scale: 2 }),
  
  // Order notes and tracking
  customerNotes: text("customerNotes"), // Customer special instructions
  adminNotes: text("adminNotes"),
  trackingNumber: text("trackingNumber"),
  
  // Timestamps - matching database schema
  createdAt: text("createdAt").default(String(new Date().toISOString())).notNull(),
  updatedAt: text("updatedAt").default(String(new Date().toISOString())).notNull(),
  shippedAt: text("shippedAt"),
  deliveredAt: text("deliveredAt"),
  
  // EFT Proof of Payment
  eftPop: text("eftPop"), // File path to the EFT proof of payment PDF document
  
  // Invoice PDF Path
  invoicePath: text("invoicePath"), // File path to the generated invoice PDF document
  
  // PUDO Locker Information
  selectedLockerId: integer("selectedLockerId").references(() => pudoLockers.id),
  selectedLockerCode: text("selectedLockerCode"),
  selectedLockerName: text("selectedLockerName"),
  selectedLockerAddress: text("selectedLockerAddress"),
  lockerDetails: jsonb("lockerDetails"), // CamelCase column for locker details
});

// Order Status History table - tracks all status changes with timestamps
export const orderStatusHistory = pgTable("orderStatusHistory", {
  id: serial("id").primaryKey(),
  orderId: integer("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  status: text("status").notNull(), // Order status: pending, processing, shipped, delivered, cancelled
  paymentStatus: text("paymentStatus"), // Payment status: pending, paid, failed (only for payment-related changes)
  previousStatus: text("previousStatus"), // Previous order status for audit trail
  previousPaymentStatus: text("previousPaymentStatus"), // Previous payment status for audit trail
  changedBy: text("changedBy").notNull(), // 'customer', 'admin', 'system'
  changedByUserId: integer("changedByUserId").references(() => users.id), // User who made the change (if applicable)
  eventType: text("eventType").notNull(), // 'order_placed', 'payment_received', 'status_change', 'shipped', 'delivered'
  notes: text("notes"), // Optional notes about the status change
  trackingNumber: text("trackingNumber"), // Set when order is shipped
  createdAt: text("createdAt").default(String(new Date().toISOString())).notNull(),
}, (table) => {
  return {
    orderIdIdx: index("order_status_history_order_id_idx").on(table.orderId),
    statusIdx: index("order_status_history_status_idx").on(table.status),
    eventTypeIdx: index("order_status_history_event_type_idx").on(table.eventType),
    createdAtIdx: index("order_status_history_created_at_idx").on(table.createdAt),
  };
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
  
  // Multi-supplier shipping system fields (camelCase)
  defaultShippingMethodId: integer("defaultShippingMethodId").references(() => shippingMethods.id),
  shippingNotes: text("shippingNotes"),
  preferredLogisticsCompanyId: integer("preferredLogisticsCompanyId").references(() => logisticsCompanies.id),
  
  createdAt: text("created_at").default(String(new Date().toISOString())).notNull(),
  updatedAt: text("updated_at").default(String(new Date().toISOString())).notNull(),
});

// =============================================================================
// MULTI-SUPPLIER SHIPPING SYSTEM TABLES
// =============================================================================

// Logistics Companies table - manages shipping providers (PUDO, Courier Guy, etc.)
export const logisticsCompanies = pgTable("logisticsCompanies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: text("createdAt").default(String(new Date().toISOString())).notNull(),
  updatedAt: text("updatedAt").default(String(new Date().toISOString())).notNull(),
}, (table) => {
  return {
    nameIdx: index("logisticsCompanies_name_idx").on(table.name),
    isActiveIdx: index("logisticsCompanies_isActive_idx").on(table.isActive),
  };
});

// Shipping Methods table - specific shipping options under each logistics company
export const shippingMethods = pgTable("shippingMethods", {
  id: serial("id").primaryKey(),
  companyId: integer("companyId").notNull().references(() => logisticsCompanies.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  description: text("description"),
  basePrice: decimal("basePrice", { precision: 10, scale: 2 }).notNull(),
  estimatedDays: text("estimatedDays"), // e.g., "2-3 business days"
  isActive: boolean("isActive").default(true).notNull(),
  metadata: jsonb("metadata"), // For additional configuration like weight limits, etc.
  createdAt: text("createdAt").default(String(new Date().toISOString())).notNull(),
  updatedAt: text("updatedAt").default(String(new Date().toISOString())).notNull(),
}, (table) => {
  return {
    companyIdIdx: index("shippingMethods_companyId_idx").on(table.companyId),
    nameIdx: index("shippingMethods_name_idx").on(table.name),
    isActiveIdx: index("shippingMethods_isActive_idx").on(table.isActive),
    // Ensure unique method names per company
    companyMethodUnique: unique("shippingMethods_company_method_unique").on(table.companyId, table.name),
  };
});

// Supplier Shipping Methods - junction table linking suppliers to their available shipping methods
export const supplierShippingMethods = pgTable("supplierShippingMethods", {
  supplierId: integer("supplierId").notNull().references(() => suppliers.id, { onDelete: "cascade" }),
  methodId: integer("methodId").notNull().references(() => shippingMethods.id, { onDelete: "restrict" }),
  customPrice: decimal("customPrice", { precision: 10, scale: 2 }), // Override basePrice if set
  isEnabled: boolean("isEnabled").default(true).notNull(),
  isDefault: boolean("isDefault").default(false).notNull(),
  deliveryNotes: text("deliveryNotes"), // Special instructions for this supplier's use of this method
  handlingFee: decimal("handlingFee", { precision: 10, scale: 2 }), // Additional handling fee if applicable
  createdAt: text("createdAt").default(String(new Date().toISOString())).notNull(),
  updatedAt: text("updatedAt").default(String(new Date().toISOString())).notNull(),
}, (table) => {
  return {
    supplierIdIdx: index("supplierShippingMethods_supplierId_idx").on(table.supplierId),
    methodIdIdx: index("supplierShippingMethods_methodId_idx").on(table.methodId),
    // Ensure each supplier-method combination is unique
    supplierMethodUnique: unique("supplierShippingMethods_supplier_method_unique").on(table.supplierId, table.methodId),
  };
});

// Order Shipments table - tracks individual shipments within an order (one per supplier)
export const orderShipments = pgTable("orderShipments", {
  id: serial("id").primaryKey(),
  orderId: integer("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  supplierId: integer("supplierId").notNull().references(() => suppliers.id, { onDelete: "restrict" }),
  methodId: integer("methodId").notNull().references(() => shippingMethods.id, { onDelete: "restrict" }),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // pending, processing, shipped, delivered, cancelled
  trackingNumber: text("trackingNumber"),
  displayLabel: text("displayLabel"), // e.g., "Shipment 1", "Shipment 2" for customer display
  lockerCode: text("lockerCode"), // PUDO locker code if applicable
  items: jsonb("items"), // Denormalized snapshot of items in this shipment for easy display
  estimatedDelivery: text("estimatedDelivery"),
  deliveredAt: text("deliveredAt"),
  createdAt: text("createdAt").default(String(new Date().toISOString())).notNull(),
  updatedAt: text("updatedAt").default(String(new Date().toISOString())).notNull(),
}, (table) => {
  return {
    orderIdIdx: index("orderShipments_orderId_idx").on(table.orderId),
    supplierIdIdx: index("orderShipments_supplierId_idx").on(table.supplierId),
    statusIdx: index("orderShipments_status_idx").on(table.status),
    methodIdIdx: index("orderShipments_methodId_idx").on(table.methodId),
  };
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
// SALES REP COMMISSION SYSTEM TABLES
// =============================================================================

// Sales Representatives table - stores rep information and commission settings
export const salesReps = pgTable("salesReps", {
  id: serial("id").primaryKey(),
  repCode: text("repCode").notNull().unique(), // Unique code for reps (e.g., "REP001")
  firstName: text("firstName").notNull(),
  lastName: text("lastName").notNull(),
  email: text("email").notNull().unique(),
  phoneNumber: text("phoneNumber"),
  commissionRate: decimal("commissionRate", { precision: 5, scale: 2 }).notNull().default("3.00"), // 3% default commission as whole number
  isActive: boolean("isActive").default(true).notNull(),
  notes: text("notes"), // Admin notes about the rep
  
  // Banking details for payments
  bankName: text("bankName"),
  accountNumber: text("accountNumber"),
  accountHolderName: text("accountHolderName"),
  branchCode: text("branchCode"),
  
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
}, (table) => {
  return {
    repCodeIdx: index("salesReps_repCode_idx").on(table.repCode),
    emailIdx: index("salesReps_email_idx").on(table.email),
    isActiveIdx: index("salesReps_isActive_idx").on(table.isActive),
  };
});

// Rep Commissions table - tracks commissions earned on each delivered order
export const repCommissions = pgTable("repCommissions", {
  id: serial("id").primaryKey(),
  repId: integer("repId").notNull().references(() => salesReps.id, { onDelete: "cascade" }),
  orderId: integer("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  userId: integer("userId").notNull().references(() => users.id), // Customer who placed the order
  commissionAmount: decimal("commissionAmount", { precision: 10, scale: 2 }).notNull(), // Calculated commission
  orderAmount: decimal("orderAmount", { precision: 10, scale: 2 }).notNull(), // Total order amount
  commissionRate: decimal("commissionRate", { precision: 5, scale: 4 }).notNull(), // Commission rate at time of order
  totalProfitAmount: decimal("totalProfitAmount", { precision: 10, scale: 2 }), // Total profit from all order items
  totalCustomerPaidAmount: decimal("totalCustomerPaidAmount", { precision: 10, scale: 2 }), // Total amount customer actually paid
  totalCostAmount: decimal("totalCostAmount", { precision: 10, scale: 2 }), // Total cost of all order items
  status: text("status").notNull().default("earned"), // earned, paid, cancelled
  paymentMethod: text("paymentMethod"), // Bank Transfer, Store Credit - set when commission is paid
  owed: decimal("owed", { precision: 10, scale: 2 }).notNull().default("0.00"), // Amount currently owed - zeroed when paid
  notes: text("notes"), // Admin notes about the commission
  createdAt: timestamp("createdAt").defaultNow(), // When commission was earned (order delivered)
  updatedAt: timestamp("updatedAt").defaultNow(), // Last updated
}, (table) => {
  return {
    repIdIdx: index("repCommissions_repId_idx").on(table.repId),
    orderIdIdx: index("repCommissions_orderId_idx").on(table.orderId),
    statusIdx: index("repCommissions_status_idx").on(table.status),
    createdAtIdx: index("repCommissions_createdAt_idx").on(table.createdAt),
  };
});

// Rep Payments table - tracks payment history to reps
export const repPayments = pgTable("repPayments", {
  id: serial("id").primaryKey(),
  repId: integer("repId").notNull().references(() => salesReps.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // Payment amount
  paymentMethod: text("paymentMethod").notNull().default("bank_transfer"), // eft, cash, etc.
  referenceNumber: text("referenceNumber"), // Bank reference or payment ID
  notes: text("notes"), // Admin notes about the payment
  processedBy: integer("processedBy").references(() => users.id), // Admin who processed payment
  createdAt: timestamp("createdAt").defaultNow(), // When payment was created
  updatedAt: timestamp("updatedAt").defaultNow(), // Last updated
}, (table) => {
  return {
    repIdIdx: index("repPayments_repId_idx").on(table.repId),
    createdAtIdx: index("repPayments_createdAt_idx").on(table.createdAt),
  };
});

// =============================================================================
// FAVOURITES AND ANALYTICS SYSTEM TABLES
// =============================================================================

// User Favourites table - tracks which products users have favourited
export const userFavourites = pgTable("userFavourites", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: integer("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
  createdAt: text("createdAt").default(String(new Date().toISOString())).notNull(),
}, (table) => {
  return {
    userProductUnique: unique().on(table.userId, table.productId),
    userIdIdx: index("user_favourites_user_id_idx").on(table.userId),
    productIdIdx: index("user_favourites_product_id_idx").on(table.productId),
  };
});

// Product Interactions table - comprehensive tracking of user engagement
export const productInteractions = pgTable("productInteractions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id, { onDelete: "cascade" }),
  sessionId: text("sessionId").notNull(), // For guest tracking
  productId: integer("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
  interactionType: text("interactionType").notNull(), // 'view', 'add_to_cart', 'remove_from_cart', 'favourite', 'unfavourite'
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  referrer: text("referrer"),
  createdAt: text("createdAt").default(String(new Date().toISOString())).notNull(),
}, (table) => {
  return {
    userIdIdx: index("product_interactions_user_id_idx").on(table.userId),
    productIdIdx: index("product_interactions_product_id_idx").on(table.productId),
    sessionIdIdx: index("product_interactions_session_id_idx").on(table.sessionId),
    interactionTypeIdx: index("product_interactions_type_idx").on(table.interactionType),
    createdAtIdx: index("product_interactions_created_at_idx").on(table.createdAt),
  };
});

// Abandoned Cart Tracking table - for email recovery campaigns
export const abandonedCarts = pgTable("abandonedCarts", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id, { onDelete: "cascade" }),
  sessionId: text("sessionId").notNull(),
  cartData: jsonb("cartData").notNull(), // Snapshot of cart items
  emailSent: boolean("emailSent").default(false).notNull(),
  discountApplied: boolean("discountApplied").default(false).notNull(),
  discountCode: text("discountCode"),
  discountPercentage: integer("discountPercentage"), // 5-15% range
  recoveryEmailSentAt: text("recoveryEmailSentAt"),
  recoveredAt: text("recoveredAt"),
  createdAt: text("createdAt").default(String(new Date().toISOString())).notNull(),
  updatedAt: text("updatedAt").default(String(new Date().toISOString())).notNull(),
}, (table) => {
  return {
    userIdIdx: index("abandoned_carts_user_id_idx").on(table.userId),
    sessionIdIdx: index("abandoned_carts_session_id_idx").on(table.sessionId),
    emailSentIdx: index("abandoned_carts_email_sent_idx").on(table.emailSent),
    createdAtIdx: index("abandoned_carts_created_at_idx").on(table.createdAt),
  };
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
  supplierId: z.number().int().positive({ message: "Supplier is required for shipping system" }), // REQUIRED for multi-supplier shipping
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
  paymentMethod: z.enum(["eft", "card"]).default("eft"),
  paymentStatus: z.enum(["pending", "paid", "payment_received", "failed"]).default("pending"),
  status: z.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]).default("pending"),
  vatAmount: z.number().min(0).default(0),
  vatRate: z.number().min(0).max(100),
  vatRegistrationNumber: z.string().nullable().optional(),
  yocoCheckoutId: z.string().nullable().optional(),
  yocoPaymentId: z.string().nullable().optional(),
  transactionFeeAmount: z.number().min(0).default(0),
  transactionFeePercentage: z.number().min(0).default(0),
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

// Multi-supplier shipping system insert schemas
export const insertLogisticsCompanySchema = createInsertSchema(logisticsCompanies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertShippingMethodSchema = createInsertSchema(shippingMethods).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSupplierShippingMethodSchema = createInsertSchema(supplierShippingMethods).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertOrderShipmentSchema = createInsertSchema(orderShipments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Multi-supplier shipping system update schemas (partial versions for PATCH/PUT operations)
export const updateLogisticsCompanySchema = insertLogisticsCompanySchema.partial().strict();
export const updateShippingMethodSchema = insertShippingMethodSchema.partial().strict();
export const updateSupplierShippingMethodSchema = insertSupplierShippingMethodSchema.partial().strict();

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

// Favourites and Analytics insert schemas
export const insertUserFavouriteSchema = createInsertSchema(userFavourites).omit({
  id: true,
  createdAt: true,
});

export const insertProductInteractionSchema = createInsertSchema(productInteractions).omit({
  id: true,
  createdAt: true,
});

export const insertAbandonedCartSchema = createInsertSchema(abandonedCarts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Promotions table for campaign-based promotion management
export const promotions = pgTable("promotions", {
  id: serial("id").primaryKey(),
  promotionName: text("promotionName").notNull(),
  description: text("description"),
  startDate: text("startDate").notNull(),
  endDate: text("endDate").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  promotionType: text("promotionType").default("percentage").notNull(),
  discountValue: decimal("discountValue", { precision: 10, scale: 2 }),
  minimumOrderValue: decimal("minimumOrderValue", { precision: 10, scale: 2 }),
  rules: json("rules"), // JSON field for flexible promotion rules
  createdBy: integer("createdBy").references(() => users.id),
  createdAt: text("createdAt").default(String(new Date().toISOString())).notNull(),
  updatedAt: text("updatedAt").default(String(new Date().toISOString())).notNull(),
}, (table) => {
  return {
    promotionNameIdx: index("promotions_name_idx").on(table.promotionName),
    startDateIdx: index("promotions_start_date_idx").on(table.startDate),
    endDateIdx: index("promotions_end_date_idx").on(table.endDate),
    isActiveIdx: index("promotions_is_active_idx").on(table.isActive),
  };
});

// Product-Promotion relationship table for many-to-many mapping
export const productPromotions = pgTable("productPromotions", {
  id: serial("id").primaryKey(),
  productId: integer("productId").references(() => products.id).notNull(),
  promotionId: integer("promotionId").references(() => promotions.id).notNull(),
  discountOverride: decimal("discountOverride", { precision: 10, scale: 2 }),
  promotionalPrice: decimal("promotionalPrice", { precision: 10, scale: 2 }),
  createdAt: text("createdAt").default(String(new Date().toISOString())).notNull(),
}, (table) => {
  return {
    productPromotionIdx: index("product_promotion_idx").on(table.productId, table.promotionId),
    uniqueProductPromotion: unique("unique_product_promotion").on(table.productId, table.promotionId),
  };
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

// Multi-supplier shipping system types
export type LogisticsCompany = typeof logisticsCompanies.$inferSelect;
export type InsertLogisticsCompany = z.infer<typeof insertLogisticsCompanySchema>;

export type ShippingMethod = typeof shippingMethods.$inferSelect;
export type InsertShippingMethod = z.infer<typeof insertShippingMethodSchema>;

export type SupplierShippingMethod = typeof supplierShippingMethods.$inferSelect;
export type InsertSupplierShippingMethod = z.infer<typeof insertSupplierShippingMethodSchema>;

export type OrderShipment = typeof orderShipments.$inferSelect;
export type InsertOrderShipment = z.infer<typeof insertOrderShipmentSchema>;

export type Catalog = typeof catalogs.$inferSelect;
export type InsertCatalog = z.infer<typeof insertCatalogSchema>;

export type BatchUpload = typeof batchUploads.$inferSelect;
export type BatchUploadError = typeof batchUploadErrors.$inferSelect;

// Favourites and Analytics types
export type UserFavourite = typeof userFavourites.$inferSelect;
export type InsertUserFavourite = z.infer<typeof insertUserFavouriteSchema>;

export type ProductInteraction = typeof productInteractions.$inferSelect;
export type InsertProductInteraction = z.infer<typeof insertProductInteractionSchema>;

export type AbandonedCart = typeof abandonedCarts.$inferSelect;
export type InsertAbandonedCart = z.infer<typeof insertAbandonedCartSchema>;

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

// Promotion insert schema and types
export const insertPromotionSchema = createInsertSchema(promotions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.string(),
  endDate: z.string(),
  discountValue: z.union([z.string(), z.number()]).transform(val => String(val)).nullable().optional(),
  minimumOrderValue: z.union([z.string(), z.number()]).transform(val => String(val)).nullable().optional(),
});

export type Promotion = typeof promotions.$inferSelect;
export type InsertPromotion = z.infer<typeof insertPromotionSchema>;

// Product-Promotion relationship insert schema and types
export const insertProductPromotionSchema = createInsertSchema(productPromotions).omit({
  id: true,
  createdAt: true,
}).extend({
  discountOverride: z.string().nullable().optional(),
});

export type ProductPromotion = typeof productPromotions.$inferSelect;
export type InsertProductPromotion = z.infer<typeof insertProductPromotionSchema>;

// PUDO Lockers insert schema and types
export const insertPudoLockerSchema = createInsertSchema(pudoLockers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  openingHours: z.array(z.record(z.any())),
  detailedAddress: z.record(z.any()),
  lockerType: z.record(z.any()),
  place: z.record(z.any()),
  lstTypesBoxes: z.array(z.record(z.any())),
});

export type PudoLocker = typeof pudoLockers.$inferSelect;
export type InsertPudoLocker = z.infer<typeof insertPudoLockerSchema>;

// Order Status History insert schema and types
export const insertOrderStatusHistorySchema = createInsertSchema(orderStatusHistory).omit({
  id: true,
  createdAt: true,
});

export type OrderStatusHistory = typeof orderStatusHistory.$inferSelect;
export type InsertOrderStatusHistory = z.infer<typeof insertOrderStatusHistorySchema>;

// =============================================================================
// EMAIL AND TOKEN MANAGEMENT TABLES
// =============================================================================

// Mail Tokens table - stores all email-related tokens (password reset, verification, etc.)
export const mailTokens = pgTable("mailTokens", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 255 }).notNull().unique(), // Store plain token, not hash
  tokenType: varchar("tokenType", { length: 50 }).notNull(), // 'password_reset', 'email_verification'
  userId: integer("userId").notNull().references(() => users.id, { onDelete: 'cascade' }),
  email: varchar("email", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  isActive: boolean("isActive").default(true).notNull(),
}, (table) => ({
  tokenIdx: index("mailTokens_token_idx").on(table.token),
  userIdIdx: index("mailTokens_userId_idx").on(table.userId),
  emailIdx: index("mailTokens_email_idx").on(table.email),
  tokenTypeIdx: index("mailTokens_tokenType_idx").on(table.tokenType),
  expiresAtIdx: index("mailTokens_expiresAt_idx").on(table.expiresAt),
}));

// Email Logs table - tracks all emails sent through the system
export const emailLogs = pgTable("emailLogs", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id, { onDelete: 'set null' }),
  recipientEmail: varchar("recipientEmail", { length: 255 }).notNull(),
  emailType: varchar("emailType", { length: 50 }).notNull(), // 'password_reset', 'order_confirmation', 'invoice', etc.
  templateId: varchar("templateId", { length: 100 }),
  subject: varchar("subject", { length: 500 }).notNull(),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  deliveryStatus: varchar("deliveryStatus", { length: 50 }).default('sent').notNull(), // 'sent', 'delivered', 'failed', 'bounced'
  errorMessage: text("errorMessage"),
  mailerSendId: varchar("mailerSendId", { length: 255 }),
  metadata: jsonb("metadata"), // Store additional data like order IDs, token references, etc.
}, (table) => ({
  userIdIdx: index("emailLogs_userId_idx").on(table.userId),
  recipientEmailIdx: index("emailLogs_recipientEmail_idx").on(table.recipientEmail),
  emailTypeIdx: index("emailLogs_emailType_idx").on(table.emailType),
  sentAtIdx: index("emailLogs_sentAt_idx").on(table.sentAt),
  deliveryStatusIdx: index("emailLogs_deliveryStatus_idx").on(table.deliveryStatus),
}));

// Mail Tokens insert schema and types
export const insertMailTokenSchema = createInsertSchema(mailTokens).omit({
  id: true,
  createdAt: true,
});

export type MailToken = typeof mailTokens.$inferSelect;
export type InsertMailToken = z.infer<typeof insertMailTokenSchema>;

// Email Logs insert schema and types
export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({
  id: true,
  sentAt: true,
});

export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;

// Sales Rep System schemas and types
export const insertSalesRepSchema = createInsertSchema(salesReps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRepCommissionSchema = createInsertSchema(repCommissions).omit({
  id: true,
  createdAt: true,
});

export const insertRepPaymentSchema = createInsertSchema(repPayments).omit({
  id: true,
  createdAt: true,
});

export type SalesRep = typeof salesReps.$inferSelect;
export type InsertSalesRep = z.infer<typeof insertSalesRepSchema>;

export type RepCommission = typeof repCommissions.$inferSelect;
export type InsertRepCommission = z.infer<typeof insertRepCommissionSchema>;

export type RepPayment = typeof repPayments.$inferSelect;
export type InsertRepPayment = z.infer<typeof insertRepPaymentSchema>;

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
  supplier: one(suppliers, {
    fields: [products.supplierId],
    references: [suppliers.id]
  }),
  images: many(productImages),
  productPromotions: many(productPromotions),
  favourites: many(userFavourites),
  interactions: many(productInteractions)
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

export const suppliersRelations = relations(suppliers, ({ one, many }) => ({
  catalogs: many(catalogs),
  products: many(products),
  supplierShippingMethods: many(supplierShippingMethods),
  orderShipments: many(orderShipments),
  defaultShippingMethod: one(shippingMethods, {
    fields: [suppliers.defaultShippingMethodId],
    references: [shippingMethods.id]
  }),
  preferredLogisticsCompany: one(logisticsCompanies, {
    fields: [suppliers.preferredLogisticsCompanyId],
    references: [logisticsCompanies.id]
  })
}));

// Multi-supplier shipping system relations
export const logisticsCompaniesRelations = relations(logisticsCompanies, ({ many }) => ({
  shippingMethods: many(shippingMethods),
  preferredBySuppliers: many(suppliers)
}));

export const shippingMethodsRelations = relations(shippingMethods, ({ one, many }) => ({
  company: one(logisticsCompanies, {
    fields: [shippingMethods.companyId],
    references: [logisticsCompanies.id]
  }),
  supplierShippingMethods: many(supplierShippingMethods),
  orderShipments: many(orderShipments),
  defaultForSuppliers: many(suppliers)
}));

export const supplierShippingMethodsRelations = relations(supplierShippingMethods, ({ one }) => ({
  supplier: one(suppliers, {
    fields: [supplierShippingMethods.supplierId],
    references: [suppliers.id]
  }),
  method: one(shippingMethods, {
    fields: [supplierShippingMethods.methodId],
    references: [shippingMethods.id]
  })
}));

export const orderShipmentsRelations = relations(orderShipments, ({ one }) => ({
  order: one(orders, {
    fields: [orderShipments.orderId],
    references: [orders.id]
  }),
  supplier: one(suppliers, {
    fields: [orderShipments.supplierId],
    references: [suppliers.id]
  }),
  method: one(shippingMethods, {
    fields: [orderShipments.methodId],
    references: [shippingMethods.id]
  })
}));

// Favourites and Analytics Relations
export const userFavouritesRelations = relations(userFavourites, ({ one }) => ({
  user: one(users, {
    fields: [userFavourites.userId],
    references: [users.id]
  }),
  product: one(products, {
    fields: [userFavourites.productId],
    references: [products.id]
  })
}));

export const productInteractionsRelations = relations(productInteractions, ({ one }) => ({
  user: one(users, {
    fields: [productInteractions.userId],
    references: [users.id]
  }),
  product: one(products, {
    fields: [productInteractions.productId],
    references: [products.id]
  })
}));

export const abandonedCartsRelations = relations(abandonedCarts, ({ one }) => ({
  user: one(users, {
    fields: [abandonedCarts.userId],
    references: [users.id]
  })
}));

// Update users relations to include favourites and interactions
export const usersRelations = relations(users, ({ many }) => ({
  favourites: many(userFavourites),
  interactions: many(productInteractions),
  abandonedCarts: many(abandonedCarts),
  orders: many(orders),
  cartItems: many(cartItems),
  mailTokens: many(mailTokens),
  emailLogs: many(emailLogs)
}));

// Mail Tokens relations
export const mailTokensRelations = relations(mailTokens, ({ one }) => ({
  user: one(users, {
    fields: [mailTokens.userId],
    references: [users.id]
  })
}));

// Email Logs relations
export const emailLogsRelations = relations(emailLogs, ({ one }) => ({
  user: one(users, {
    fields: [emailLogs.userId],
    references: [users.id]
  })
}));

// Orders relations
export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id]
  }),
  selectedLocker: one(pudoLockers, {
    fields: [orders.selectedLockerId],
    references: [pudoLockers.id]
  }),
  orderItems: many(orderItems),
  orderShipments: many(orderShipments)
}));

// PUDO Lockers relations
export const pudoLockersRelations = relations(pudoLockers, ({ many }) => ({
  orders: many(orders)
}));

// Order items relations
export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id]
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id]
  })
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
  
  // Promotion field (camelCase as per requirements)
  promotionId: integer("promotionId").references(() => promotions.id),
  
  // Supplier information
  supplierId: integer("supplier_id").references(() => suppliers.id),
  supplierUrl: text("supplierUrl"), // URL to supplier's product page for easy image sourcing
  
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
  supplierUrl: z.string().optional().nullable(),
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
  }),
  promotion: one(promotions, {
    fields: [productDrafts.promotionId],
    references: [promotions.id]
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

// =============================================================================
// PROMOTIONS SYSTEM RELATIONS
// =============================================================================

// Promotions relations
export const promotionsRelations = relations(promotions, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [promotions.createdBy],
    references: [users.id]
  }),
  productPromotions: many(productPromotions),
  productDrafts: many(productDrafts)
}));

// Product-Promotion relationship relations
export const productPromotionsRelations = relations(productPromotions, ({ one }) => ({
  product: one(products, {
    fields: [productPromotions.productId],
    references: [products.id]
  }),
  promotion: one(promotions, {
    fields: [productPromotions.promotionId],
    references: [promotions.id]
  })
}));



// Customer Credits table - tracks credit balance per user
export const customerCredits = pgTable("customerCredits", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id),
  totalCreditAmount: decimal("totalCreditAmount", { precision: 10, scale: 2 }).notNull().default('0'),
  availableCreditAmount: decimal("availableCreditAmount", { precision: 10, scale: 2 }).notNull().default('0'),
  createdAt: text("createdAt").default(String(new Date().toISOString())).notNull(),
  updatedAt: text("updatedAt").default(String(new Date().toISOString())).notNull(),
}, (table) => ({
  userIdUnique: unique().on(table.userId),
}));

// Credit Transactions table - tracks all credit movements
export const creditTransactions = pgTable("creditTransactions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id),
  orderId: integer("orderId").references(() => orders.id),
  supplierOrderId: integer("supplierOrderId").references(() => orderItems.id), // Track which order item the credit was generated for
  transactionType: text("transactionType").notNull(), // 'earned', 'used', 'refund'
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  createdAt: text("createdAt").default(String(new Date().toISOString())).notNull(),
});

// Order Item Supplier Status table - tracks supplier ordering status per item
export const orderItemSupplierStatus = pgTable("orderItemSupplierStatus", {
  id: serial("id").primaryKey(),
  orderItemId: integer("orderItemId").notNull().references(() => orderItems.id),
  orderId: integer("orderId").notNull().references(() => orders.id),
  productId: integer("productId").notNull().references(() => products.id),
  supplierOrderPlaced: boolean("supplierOrderPlaced").notNull().default(false),
  supplierOrderDate: text("supplierOrderDate"),
  supplierOrderNumber: text("supplierOrderNumber"), // Added field for supplier order reference
  supplierStatus: text("supplierStatus").notNull().default('pending'), // 'pending', 'ordered', 'backordered', 'unavailable', 'shipped'
  adminNotes: text("adminNotes"),
  customerNotified: boolean("customerNotified").notNull().default(false),
  createdAt: text("createdAt").default(String(new Date().toISOString())).notNull(),
  updatedAt: text("updatedAt").default(String(new Date().toISOString())).notNull(),
});

// System Settings table - for app-wide configuration
export const systemSettings = pgTable("systemSettings", {
  id: serial("id").primaryKey(),
  settingKey: text("settingKey").notNull().unique(),
  settingValue: text("settingValue").notNull(),
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: text("createdAt").default(String(new Date().toISOString())).notNull(),
  updatedAt: text("updatedAt").default(String(new Date().toISOString())).notNull(),
});

// Credit system insert schemas
export const insertCustomerCreditSchema = createInsertSchema(customerCredits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCreditTransactionSchema = createInsertSchema(creditTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertOrderItemSupplierStatusSchema = createInsertSchema(orderItemSupplierStatus).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Credit system types
export type CustomerCredit = typeof customerCredits.$inferSelect;
export type InsertCustomerCredit = z.infer<typeof insertCustomerCreditSchema>;

export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertCreditTransaction = z.infer<typeof insertCreditTransactionSchema>;

export type OrderItemSupplierStatus = typeof orderItemSupplierStatus.$inferSelect;
export type InsertOrderItemSupplierStatus = z.infer<typeof insertOrderItemSupplierStatusSchema>;

// System Settings types and schemas
export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;

export const insertSystemSettingSchema = createInsertSchema(systemSettings);

// Export ProductDraft type
export type ProductDraft = typeof productDrafts.$inferSelect;
export type InsertProductDraft = z.infer<typeof insertProductDraftSchema>;

// Credit system relations
export const customerCreditsRelations = relations(customerCredits, ({ one, many }) => ({
  user: one(users, {
    fields: [customerCredits.userId],
    references: [users.id]
  }),
  transactions: many(creditTransactions)
}));

export const creditTransactionsRelations = relations(creditTransactions, ({ one }) => ({
  user: one(users, {
    fields: [creditTransactions.userId],
    references: [users.id]
  }),
  order: one(orders, {
    fields: [creditTransactions.orderId],
    references: [orders.id]
  }),
  customerCredit: one(customerCredits, {
    fields: [creditTransactions.userId],
    references: [customerCredits.userId]
  })
}));

export const orderItemSupplierStatusRelations = relations(orderItemSupplierStatus, ({ one }) => ({
  orderItem: one(orderItems, {
    fields: [orderItemSupplierStatus.orderItemId],
    references: [orderItems.id]
  }),
  order: one(orders, {
    fields: [orderItemSupplierStatus.orderId],
    references: [orders.id]
  }),
  product: one(products, {
    fields: [orderItemSupplierStatus.productId],
    references: [products.id]
  })
}));

// Sales Rep relations
export const salesRepsRelations = relations(salesReps, ({ many }) => ({
  commissions: many(repCommissions),
  payments: many(repPayments),
}));

export const repCommissionsRelations = relations(repCommissions, ({ one }) => ({
  rep: one(salesReps, {
    fields: [repCommissions.repId],
    references: [salesReps.id]
  }),
  order: one(orders, {
    fields: [repCommissions.orderId],
    references: [orders.id]
  }),
  user: one(users, {
    fields: [repCommissions.userId],
    references: [users.id]
  })
}));

export const repPaymentsRelations = relations(repPayments, ({ one }) => ({
  rep: one(salesReps, {
    fields: [repPayments.repId],
    references: [salesReps.id]
  })
}));
