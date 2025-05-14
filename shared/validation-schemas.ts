/**
 * Shared Validation Schemas for TeeMeYou API
 * 
 * This module contains reusable Zod validation schemas that are shared
 * between client and server for consistent validation rules.
 */

import { z } from 'zod';
import {
  insertUserSchema,
  insertCategorySchema,
  insertProductSchema,
  insertProductImageSchema,
  insertCartItemSchema,
  insertOrderSchema,
  insertOrderItemSchema,
  insertPricingSchema,
  insertSupplierSchema,
  insertCatalogSchema,
  insertProductAttributeSchema,
  insertAttributeSchema,
  insertAttributeOptionSchema,
  insertProductDraftSchema
} from './schema';

/**
 * User-related validation schemas
 */
export const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100)
});

export const registerSchema = insertUserSchema;

export const updateUserSchema = insertUserSchema.partial();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6).max(100),
  newPassword: z.string().min(6).max(100),
  confirmPassword: z.string().min(6).max(100)
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
});

/**
 * Category-related validation schemas
 */
export const createCategorySchema = insertCategorySchema;

export const updateCategorySchema = insertCategorySchema.partial();

/**
 * Product Drafts validation schemas
 */
export const createProductDraftSchema = insertProductDraftSchema.extend({
  // Additional validation for draft creation
});

export const updateProductDraftSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  slug: z.string().min(3).max(100).optional(),
  sku: z.string().max(50).optional(),
  description: z.string().optional(),
  brand: z.string().optional(),
  categoryId: z.number().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  
  // Pricing information
  costPrice: z.number().optional(),
  regularPrice: z.number().optional(),
  salePrice: z.number().optional(),
  onSale: z.boolean().optional(),
  markupPercentage: z.number().optional(),
  
  // Inventory
  stockLevel: z.number().optional(),
  lowStockThreshold: z.number().optional(),
  backorderEnabled: z.boolean().optional(),
  
  // Attributes (stored as JSON)
  attributes: z.any().optional(),
  
  // Supplier information
  supplierId: z.number().optional(),
  
  // Physical properties
  weight: z.string().optional(),
  dimensions: z.string().optional(),
  
  // Promotions
  discountLabel: z.string().optional(),
  specialSaleText: z.string().optional(),
  specialSaleStart: z.coerce.date().optional().nullable(),
  specialSaleEnd: z.coerce.date().optional().nullable(),
  isFlashDeal: z.boolean().optional(),
  flashDealEnd: z.coerce.date().optional().nullable(),
  
  // Tax information
  taxable: z.boolean().optional(),
  taxClass: z.string().optional(),
  
  // SEO metadata
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional(),
  
  // Wizard progress tracking
  wizardProgress: z.any().optional(),
});

export const updateProductDraftWizardStepSchema = z.object({
  step: z.string(),
  data: z.any()
});

export const productDraftIdParamSchema = z.object({
  id: z.coerce.number()
});

export const publishProductDraftSchema = z.object({
  id: z.number()
});

/**
 * Product-related validation schemas
 */
export const createProductSchema = insertProductSchema;

export const updateProductSchema = insertProductSchema.partial();

export const productSearchSchema = z.object({
  query: z.string().min(1).max(100),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const productFilterSchema = z.object({
  category: z.coerce.number().int().positive().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sortBy: z.enum(['price', 'name', 'newest', 'popularity']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

/**
 * Simple products list query validation schema
 */
export const productsQuerySchema = z.object({
  limit: z.coerce.number().int().min(0).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  category: z.coerce.number().int().positive().optional(),
  search: z.string().trim().optional()
});

/**
 * Cart-related validation schemas
 */
export const addToCartSchema = insertCartItemSchema;

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1).max(100)
});

/**
 * Order-related validation schemas
 */
export const createOrderSchema = insertOrderSchema;

export const updateOrderStatusSchema = z.object({
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
});

/**
 * Attribute-related validation schemas
 */
export const createAttributeSchema = insertAttributeSchema;

export const updateAttributeSchema = insertAttributeSchema.partial();

export const createAttributeOptionSchema = insertAttributeOptionSchema;

export const updateAttributeOptionSchema = insertAttributeOptionSchema.partial();

// Product attribute value validation schemas are removed as part of centralization
// Now using the centralized productAttributes table with selectedOptions array

/**
 * Product Image validation schemas
 */
export const createProductImageSchema = insertProductImageSchema;

export const updateProductImageSchema = insertProductImageSchema.partial();

/**
 * Supplier-related validation schemas
 */
export const createSupplierSchema = insertSupplierSchema;

export const updateSupplierSchema = insertSupplierSchema.partial();

/**
 * Catalog-related validation schemas
 */
export const createCatalogSchema = insertCatalogSchema;

export const updateCatalogSchema = insertCatalogSchema.partial();

/**
 * File upload validation schemas
 */
export const uploadFileSchema = z.object({
  type: z.enum(['product', 'category', 'supplier', 'catalog', 'profile', 'other']).default('other'),
  isPublic: z.boolean().default(true)
});

/**
 * Common ID and Pagination schemas
 */
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

export const slugParamSchema = z.object({
  slug: z.string().min(1)
});

export const categoryIdParamSchema = z.object({
  categoryId: z.coerce.number().int().positive()
});

export const productIdParamSchema = z.object({
  productId: z.coerce.number().int().positive()
});

export const productSlugParamSchema = z.object({
  slug: z.string().min(1).max(200)
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

/**
 * Product Wizard Validation Schemas
 */

// Step 1: Basic Info validation
export const productWizardBasicInfoSchema = z.object({
  name: z.string().min(3, { message: "Product name is required (min 3 characters)" }).max(200),
  slug: z.string().min(3, { message: "Product slug is required" }).max(200),
  description: z.string().optional(),
  categoryId: z.number().int().positive({ message: "Category is required" }),
  catalogId: z.number().int().positive({ message: "Catalog is required" }),
  price: z.number().min(0.01, { message: "Price must be greater than 0" }),
  minimumPrice: z.number().min(0).optional(),
  costPrice: z.number().min(0, { message: "Cost price is required" }),
  salePrice: z.number().min(0).optional(),
  discount: z.number().int().min(0).max(100).optional(),
  discountLabel: z.string().max(50).optional(),
});

// Step 2: Product Images validation
export const productWizardImagesSchema = z.object({
  imageUrl: z.string().url().optional(),
  additionalImages: z.array(z.string().url()).optional(),
  hasBackgroundRemoved: z.boolean().default(false),
  originalImageObjectKey: z.string().optional(),
});

// Step 3: Additional Info validation
export const productWizardAdditionalInfoSchema = z.object({
  stock: z.number().int().min(0, { message: "Stock quantity is required" }),
  minimumOrder: z.number().int().min(1).default(1),
  supplier: z.string().optional(),
  brand: z.string().optional(),
  tags: z.array(z.string()).optional(),
  weight: z.number().min(0).optional(),
  dimensions: z.string().optional(),
  requiredAttributeIds: z.array(z.number().int().positive()).optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isFlashDeal: z.boolean().default(false),
  flashDealEnd: z.string().optional(),
  specialSaleText: z.string().max(100).optional(),
  specialSaleStart: z.string().optional(),
  specialSaleEnd: z.string().optional(),
  freeShipping: z.boolean().default(false),
});

// Combined complete product wizard validation schema
export const productWizardCompleteSchema = productWizardBasicInfoSchema
  .merge(productWizardImagesSchema)
  .merge(productWizardAdditionalInfoSchema);

// Schema for product draft saving and retrieval
export const productWizardDraftSchema = z.object({
  userId: z.number().int().positive(),
  draftId: z.string().optional(),
  catalogId: z.number().int().positive().optional(),
  step: z.number().int().min(0).max(3).default(0),
  data: z.any(), // This will store partial product data at any step
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

// Required attributes validation schema
export const requiredAttributesSchema = z.array(
  z.object({
    attributeId: z.number().int().positive(),
    value: z.union([
      z.string(),
      z.number(),
      z.boolean(),
      z.array(z.string()),
      z.array(z.number())
    ]),
    isRequired: z.boolean().default(false)
  })
);