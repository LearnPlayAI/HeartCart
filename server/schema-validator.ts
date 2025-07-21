/**
 * Schema Validation Utility for HeartCart
 * 
 * This file provides standardized validation functions for database operations
 * to ensure data integrity and consistent error handling.
 */

import { z } from "zod";
import { isDefined, isNonEmptyString } from "@shared/utils";
import * as schema from "@shared/schema";

/**
 * Custom error class for validation errors
 */
export class SchemaValidationError extends Error {
  public readonly errors: z.ZodError | Error;
  public readonly statusCode: number = 400;
  
  constructor(message: string, errors: z.ZodError | Error) {
    super(message);
    this.name = 'SchemaValidationError';
    this.errors = errors;
  }
}

/**
 * Generic validate function for insert operations
 */
export function validateInsert<T>(
  data: unknown, 
  schema: z.ZodType<T>, 
  entityName: string
): T {
  try {
    const validated = schema.parse(data);
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new SchemaValidationError(
        `Invalid ${entityName} data`,
        error
      );
    }
    throw new SchemaValidationError(
      `Error validating ${entityName} data`,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Generic validate function for update operations
 */
export function validateUpdate<T>(
  data: unknown, 
  schema: z.ZodType<T>, 
  entityName: string
): Partial<T> {
  try {
    const validated = schema.partial().parse(data);
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new SchemaValidationError(
        `Invalid ${entityName} update data`,
        error
      );
    }
    throw new SchemaValidationError(
      `Error validating ${entityName} update data`,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Validate ID param
 */
export function validateId(id: unknown, entityName: string): number {
  try {
    const validatedId = z.coerce.number().int().positive().parse(id);
    return validatedId;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new SchemaValidationError(
        `Invalid ${entityName} ID`,
        error
      );
    }
    throw new SchemaValidationError(
      `Error validating ${entityName} ID`,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Validate slug param
 */
export function validateSlug(slug: unknown, entityName: string): string {
  try {
    const validatedSlug = z.string().min(1).parse(slug);
    return validatedSlug;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new SchemaValidationError(
        `Invalid ${entityName} slug`,
        error
      );
    }
    throw new SchemaValidationError(
      `Error validating ${entityName} slug`,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Entity-specific validation functions
 */

// User validation
export function validateUserInsert(data: unknown): schema.InsertUser {
  return validateInsert(data, schema.insertUserSchema, 'user');
}

export function validateUserUpdate(data: unknown): Partial<schema.InsertUser> {
  return validateUpdate(data, schema.insertUserSchema, 'user');
}

// Category validation
export function validateCategoryInsert(data: unknown): schema.InsertCategory {
  return validateInsert(data, schema.insertCategorySchema, 'category');
}

export function validateCategoryUpdate(data: unknown): Partial<schema.InsertCategory> {
  return validateUpdate(data, schema.insertCategorySchema, 'category');
}

// Product validation
export function validateProductInsert(data: unknown): schema.InsertProduct {
  return validateInsert(data, schema.insertProductSchema, 'product');
}

export function validateProductUpdate(data: unknown): Partial<schema.InsertProduct> {
  return validateUpdate(data, schema.insertProductSchema, 'product');
}

// Cart item validation
export function validateCartItemInsert(data: unknown): schema.InsertCartItem {
  return validateInsert(data, schema.insertCartItemSchema, 'cart item');
}

export function validateCartItemUpdate(data: unknown): Partial<schema.InsertCartItem> {
  return validateUpdate(data, schema.insertCartItemSchema, 'cart item');
}

// Order validation
export function validateOrderInsert(data: unknown): schema.InsertOrder {
  return validateInsert(data, schema.insertOrderSchema, 'order');
}

export function validateOrderUpdate(data: unknown): Partial<schema.InsertOrder> {
  return validateUpdate(data, schema.insertOrderSchema, 'order');
}

// Order item validation
export function validateOrderItemInsert(data: unknown): schema.InsertOrderItem {
  return validateInsert(data, schema.insertOrderItemSchema, 'order item');
}

export function validateOrderItemUpdate(data: unknown): Partial<schema.InsertOrderItem> {
  return validateUpdate(data, schema.insertOrderItemSchema, 'order item');
}

// Product image validation
export function validateProductImageInsert(data: unknown): schema.InsertProductImage {
  return validateInsert(data, schema.insertProductImageSchema, 'product image');
}

export function validateProductImageUpdate(data: unknown): Partial<schema.InsertProductImage> {
  return validateUpdate(data, schema.insertProductImageSchema, 'product image');
}

// Supplier validation
export function validateSupplierInsert(data: unknown): schema.InsertSupplier {
  return validateInsert(data, schema.insertSupplierSchema, 'supplier');
}

export function validateSupplierUpdate(data: unknown): Partial<schema.InsertSupplier> {
  return validateUpdate(data, schema.insertSupplierSchema, 'supplier');
}

// Catalog validation
export function validateCatalogInsert(data: unknown): schema.InsertCatalog {
  return validateInsert(data, schema.insertCatalogSchema, 'catalog');
}

export function validateCatalogUpdate(data: unknown): Partial<schema.InsertCatalog> {
  return validateUpdate(data, schema.insertCatalogSchema, 'catalog');
}

// Attribute validation
export function validateAttributeInsert(data: unknown): schema.InsertAttribute {
  return validateInsert(data, schema.insertAttributeSchema, 'attribute');
}

export function validateAttributeUpdate(data: unknown): Partial<schema.InsertAttribute> {
  return validateUpdate(data, schema.insertAttributeSchema, 'attribute');
}

// Attribute option validation
export function validateAttributeOptionInsert(data: unknown): schema.InsertAttributeOption {
  return validateInsert(data, schema.insertAttributeOptionSchema, 'attribute option');
}

export function validateAttributeOptionUpdate(data: unknown): Partial<schema.InsertAttributeOption> {
  return validateUpdate(data, schema.insertAttributeOptionSchema, 'attribute option');
}

// Product attribute value validation
export function validateProductAttributeValueInsert(data: unknown): schema.InsertProductAttributeValue {
  return validateInsert(data, schema.insertProductAttributeValueSchema, 'product attribute value');
}

export function validateProductAttributeValueUpdate(data: unknown): Partial<schema.InsertProductAttributeValue> {
  return validateUpdate(data, schema.insertProductAttributeValueSchema, 'product attribute value');
}

// Attribute discount rule validation has been removed
// as part of the centralized attribute system refactoring.

/**
 * Specialized validators for query parameters
 */

// Category query parameters
export const categoryQuerySchema = z.object({
  includeInactive: z.boolean().optional().default(false),
  parentId: z.number().int().nullable().optional(),
  level: z.number().int().nonnegative().optional(),
  orderBy: z.enum(['name', 'displayOrder']).optional()
});

export type CategoryQueryOptions = z.infer<typeof categoryQuerySchema>;

export function validateCategoryQueryOptions(options: unknown): CategoryQueryOptions {
  try {
    return categoryQuerySchema.parse(options);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new SchemaValidationError(
        'Invalid category query options',
        error
      );
    }
    throw new SchemaValidationError(
      'Error validating category query options',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

// Product query parameters
export const productQuerySchema = z.object({
  includeInactive: z.boolean().optional().default(false),
  includeCategoryInactive: z.boolean().optional().default(false),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
  categoryId: z.number().int().positive().optional(),
  search: z.string().optional(),
  orderBy: z.enum(['name', 'price', 'createdAt']).optional().default('name'),
  orderDir: z.enum(['asc', 'desc']).optional().default('asc')
});

export type ProductQueryOptions = z.infer<typeof productQuerySchema>;

export function validateProductQueryOptions(options: unknown): ProductQueryOptions {
  try {
    return productQuerySchema.parse(options);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new SchemaValidationError(
        'Invalid product query options',
        error
      );
    }
    throw new SchemaValidationError(
      'Error validating product query options',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Helper for handling validation errors in route handlers
 */
export function handleValidationError(error: unknown): { 
  statusCode: number;
  message: string;
  errors?: any;
} {
  if (error instanceof SchemaValidationError) {
    return {
      statusCode: error.statusCode,
      message: error.message,
      errors: error.errors instanceof z.ZodError 
        ? error.errors.format()
        : { message: error.errors.message }
    };
  }
  
  return {
    statusCode: 500,
    message: 'Internal Server Error',
    errors: { message: error instanceof Error ? error.message : String(error) }
  };
}