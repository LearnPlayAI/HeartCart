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
  insertProductAttributeValueSchema
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

export const createProductAttributeValueSchema = insertProductAttributeValueSchema;

export const updateProductAttributeValueSchema = insertProductAttributeValueSchema.partial();

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