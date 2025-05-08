/**
 * Batch Upload Service
 * 
 * This service handles the CSV upload, parsing, validation, and product creation
 * for the mass product upload system. It supports multi-value attributes
 * with comma-separated values in the CSV.
 */

import { db } from './db';
import { and, eq, ilike, inArray, isNull, or } from 'drizzle-orm';
import {
  batchUploads,
  batchUploadErrors,
  products,
  categories,
  catalogs,
  suppliers,
  attributes,
  attributeOptions,
  productAttributeValues,
  catalogAttributes,
  productAttributes,
  productAttributeOptions,
  InsertBatchUpload,
  InsertBatchUploadError,
  InsertProduct,
  Product,
  BatchUpload
} from '@shared/schema';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { StandardApiResponse } from './api-response';
import { storage } from './storage';

// Constants
export const ATTRIBUTE_PREFIX = 'attr_';
export const BATCH_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

export const ERROR_TYPES = {
  VALIDATION: 'validation',
  PROCESSING: 'processing',
  DB: 'database',
  SYSTEM: 'system',
};

export const ERROR_SEVERITY = {
  ERROR: 'error',
  WARNING: 'warning',
};

// Types
interface UploadedCsvFile {
  originalname: string;
  path: string;
  size: number;
}

interface CsvRowData {
  [key: string]: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  field?: string;
  message: string;
  type: string;
  severity: string;
}

interface AttributeValue {
  attributeId: number;
  attributeName: string;
  values: string[];
}

// Main service class
export class BatchUploadService {
  /**
   * Create a new batch upload job
   */
  async createBatchUpload(data: InsertBatchUpload): Promise<BatchUpload> {
    const [batchUpload] = await db.insert(batchUploads).values(data).returning();
    return batchUpload;
  }

  /**
   * Get batch upload by ID
   */
  async getBatchUpload(id: number): Promise<BatchUpload | null> {
    const [batchUpload] = await db.select().from(batchUploads).where(eq(batchUploads.id, id));
    return batchUpload || null;
  }

  /**
   * Log an error for a batch upload
   */
  async logBatchError(error: InsertBatchUploadError): Promise<void> {
    await db.insert(batchUploadErrors).values(error);
  }

  /**
   * Update batch upload status
   */
  async updateBatchStatus(id: number, status: string, updatedFields: Partial<BatchUpload> = {}): Promise<void> {
    await db.update(batchUploads)
      .set({
        status,
        updatedAt: new Date(),
        ...(status === BATCH_STATUSES.COMPLETED ? { completedAt: new Date() } : {}),
        ...updatedFields
      })
      .where(eq(batchUploads.id, id));
  }

  /**
   * Process a CSV file
   */
  async processCsvFile(batchId: number, file: UploadedCsvFile): Promise<StandardApiResponse<BatchUpload>> {
    try {
      // Get the batch upload
      const batchUpload = await this.getBatchUpload(batchId);
      if (!batchUpload) {
        return {
          success: false,
          error: {
            message: `Batch upload with ID ${batchId} not found`,
            code: 'BATCH_NOT_FOUND',
          }
        };
      }

      // Update batch status to processing
      await this.updateBatchStatus(batchId, BATCH_STATUSES.PROCESSING, {
        fileName: file.path,
        originalFilename: file.originalname,
      });

      // Parse and process the CSV file
      const results = await this.parseAndProcessCsv(batchId, file.path);

      // Update batch status based on results
      await this.updateBatchStatus(batchId, results.success ? BATCH_STATUSES.COMPLETED : BATCH_STATUSES.FAILED, {
        totalRecords: results.totalRecords || 0,
        processedRecords: results.processedRecords || 0,
        successCount: results.successRecords || 0,
        errorCount: results.failedRecords || 0,
      });

      // Clean up temporary file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      const updatedBatch = await this.getBatchUpload(batchId);
      
      return {
        success: results.success,
        data: updatedBatch as BatchUpload,
        ...(results.success ? {} : {
          error: {
            message: 'Batch processing completed with errors',
            code: 'BATCH_PROCESSING_ERRORS',
            details: results.errors
          }
        })
      };
    } catch (error: unknown) {
      console.error('Error processing CSV file:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Log the system error
      await this.logBatchError({
        batchId,
        errorType: ERROR_TYPES.SYSTEM,
        errorMessage: `System error: ${errorMessage}`,
        severity: ERROR_SEVERITY.ERROR,
      });

      // Update batch status to failed
      await this.updateBatchStatus(batchId, BATCH_STATUSES.FAILED);

      // Clean up temporary file
      if (file && file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      return {
        success: false,
        error: {
          message: 'Failed to process CSV file',
          code: 'BATCH_PROCESSING_FAILED',
          details: errorMessage
        }
      };
    }
  }

  /**
   * Parse and process a CSV file
   */
  private async parseAndProcessCsv(batchId: number, filePath: string): Promise<{
    success: boolean;
    totalRecords: number;
    processedRecords: number;
    successRecords: number;
    failedRecords: number;
    errors?: any[];
  }> {
    const batch = await this.getBatchUpload(batchId);
    
    if (!batch) {
      throw new Error(`Batch upload with ID ${batchId} not found`);
    }

    let totalRecords = 0;
    let processedRecords = 0;
    let successRecords = 0;
    let failedRecords = 0;
    const errors: any[] = [];
    
    // Create a readable stream from the CSV file
    const fileStream = fs.createReadStream(filePath);
    
    // Create a parser
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    
    try {
      // Save reference to class instance
      const self = this;
      
      // Process each row in the CSV file within a transaction
      await pipeline(
        fileStream,
        parser,
        async function* (source: AsyncIterable<CsvRowData>) {
          for await (const row of source) {
            totalRecords++;
            
            try {
              // Validate the row data
              const validationResult = await self.validateRowData(row, batch.catalogId);
              
              if (!validationResult.isValid) {
                // Log validation errors
                for (const error of validationResult.errors) {
                  await self.logBatchError({
                    batchId,
                    rowNumber: totalRecords,
                    errorType: ERROR_TYPES.VALIDATION,
                    errorMessage: error.message,
                    severity: error.severity,
                    field: error.field,
                    rawData: row,
                  });
                }
                
                failedRecords++;
                errors.push({
                  row: totalRecords,
                  errors: validationResult.errors,
                });
                
                yield { success: false, row: totalRecords, errors: validationResult.errors };
                continue;
              }
              
              // Process the row and create the product
              const result = await db.transaction(async (tx) => {
                try {
                  // Extract and prepare data for product creation
                  const productData = await self.prepareProductData(row, batch.catalogId);
                  
                  // Process attributes (handle comma-separated values)
                  const attributeValues = self.extractAttributeValues(row);
                  
                  // Create the product
                  const [product] = await tx
                    .insert(products)
                    .values(productData)
                    .returning();
                  
                  // Process and save attribute values
                  if (attributeValues.length > 0) {
                    await self.processAttributeValues(tx, product.id, attributeValues);
                  }
                  
                  return { success: true, productId: product.id };
                } catch (error: unknown) {
                  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                  console.error('Transaction error:', error);
                  return { success: false, error: { message: errorMessage } };
                }
              });
              
              if (result.success) {
                successRecords++;
              } else {
                failedRecords++;
                const errorMessage = typeof result.error === 'object' && result.error !== null && 'message' in result.error
                  ? String(result.error.message) 
                  : 'Unknown processing error';
                
                await self.logBatchError({
                  batchId,
                  rowNumber: totalRecords,
                  errorType: ERROR_TYPES.PROCESSING,
                  errorMessage,
                  severity: ERROR_SEVERITY.ERROR,
                  rawData: row,
                });
                errors.push({
                  row: totalRecords,
                  error: errorMessage,
                });
              }
              
              processedRecords++;
              yield result;
            } catch (error: unknown) {
              console.error('Row processing error:', error);
              failedRecords++;
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              
              await self.logBatchError({
                batchId,
                rowNumber: totalRecords,
                errorType: ERROR_TYPES.SYSTEM,
                errorMessage: `System error: ${errorMessage}`,
                severity: ERROR_SEVERITY.ERROR,
                rawData: row,
              });
              errors.push({
                row: totalRecords,
                error: errorMessage,
              });
              yield { success: false, row: totalRecords, error: errorMessage };
            }
          }
        }
      );
      
      return {
        success: failedRecords === 0,
        totalRecords,
        processedRecords,
        successRecords,
        failedRecords,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('CSV processing error:', errorMessage);
      throw error;
    } finally {
      // Ensure file stream is closed
      if (fileStream) {
        fileStream.destroy();
      }
    }
  }

  /**
   * Validate row data against the expected schema
   */
  private async validateRowData(row: CsvRowData, catalogId?: number): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const requiredFields = [
      'product_name',
      'product_description',
      'product_sku',
      'cost_price',
      'regular_price',
      'sale_price',
      'discount_percentage',
      'discount_label',
      'minimum_price',
      'wholesale_minimum_qty',
      'wholesale_discount_percentage',
    ];
    
    // Check required fields
    for (const field of requiredFields) {
      if (!row[field] || row[field].trim() === '') {
        errors.push({
          field,
          message: `${field} is required`,
          type: ERROR_TYPES.VALIDATION,
          severity: ERROR_SEVERITY.ERROR,
        });
      }
    }
    
    // Validate if either supplier_id or supplier_name is provided
    if ((!row.supplier_id || row.supplier_id.trim() === '') && 
        (!row.supplier_name || row.supplier_name.trim() === '')) {
      errors.push({
        message: 'Either supplier_id or supplier_name must be provided',
        type: ERROR_TYPES.VALIDATION,
        severity: ERROR_SEVERITY.ERROR,
      });
    }
    
    // Validate if either catalog_id or catalog_name is provided
    if ((!row.catalog_id || row.catalog_id.trim() === '') && 
        (!row.catalog_name || row.catalog_name.trim() === '') &&
        !catalogId) {
      errors.push({
        message: 'Either catalog_id or catalog_name must be provided',
        type: ERROR_TYPES.VALIDATION,
        severity: ERROR_SEVERITY.ERROR,
      });
    }
    
    // Validate if either category_id or category_name is provided
    if ((!row.category_id || row.category_id.trim() === '') && 
        (!row.category_name || row.category_name.trim() === '')) {
      errors.push({
        message: 'Either category_id or category_name must be provided',
        type: ERROR_TYPES.VALIDATION,
        severity: ERROR_SEVERITY.ERROR,
      });
    }
    
    // Validate numeric fields
    const numericFields = [
      'cost_price',
      'regular_price',
      'sale_price',
      'discount_percentage',
      'minimum_price',
      'wholesale_minimum_qty',
      'wholesale_discount_percentage',
    ];
    
    for (const field of numericFields) {
      if (row[field] && isNaN(Number(row[field]))) {
        errors.push({
          field,
          message: `${field} must be a number`,
          type: ERROR_TYPES.VALIDATION,
          severity: ERROR_SEVERITY.ERROR,
        });
      }
    }
    
    // Validate pricing rules
    if (!isNaN(Number(row.regular_price)) && !isNaN(Number(row.sale_price))) {
      if (Number(row.sale_price) > Number(row.regular_price)) {
        errors.push({
          field: 'sale_price',
          message: 'Sale price cannot be greater than regular price',
          type: ERROR_TYPES.VALIDATION,
          severity: ERROR_SEVERITY.ERROR,
        });
      }
    }
    
    if (!isNaN(Number(row.minimum_price)) && !isNaN(Number(row.sale_price))) {
      if (Number(row.sale_price) < Number(row.minimum_price)) {
        errors.push({
          field: 'sale_price',
          message: 'Sale price cannot be less than minimum price',
          type: ERROR_TYPES.VALIDATION,
          severity: ERROR_SEVERITY.ERROR,
        });
      }
    }
    
    if (!isNaN(Number(row.cost_price)) && !isNaN(Number(row.sale_price))) {
      if (Number(row.sale_price) < Number(row.cost_price)) {
        errors.push({
          field: 'sale_price',
          message: 'Sale price should be greater than cost price',
          type: ERROR_TYPES.VALIDATION,
          severity: ERROR_SEVERITY.WARNING,
        });
      }
    }
    
    // Validate discount percentage calculation
    if (!isNaN(Number(row.regular_price)) && 
        !isNaN(Number(row.sale_price)) && 
        !isNaN(Number(row.discount_percentage))) {
      const calculatedDiscount = Math.round(
        ((Number(row.regular_price) - Number(row.sale_price)) / Number(row.regular_price)) * 100
      );
      const listedDiscount = Number(row.discount_percentage);
      
      if (Math.abs(calculatedDiscount - listedDiscount) > 1) {
        errors.push({
          field: 'discount_percentage',
          message: `Listed discount (${listedDiscount}%) doesn't match calculated discount (${calculatedDiscount}%)`,
          type: ERROR_TYPES.VALIDATION,
          severity: ERROR_SEVERITY.WARNING,
        });
      }
    }
    
    // Validate SKU uniqueness
    if (row.product_sku && row.product_sku.trim() !== '') {
      const existingProduct = await db.select({ id: products.id })
        .from(products)
        .where(eq(products.slug, this.slugify(row.product_sku)))
        .limit(1);
      
      if (existingProduct.length > 0) {
        errors.push({
          field: 'product_sku',
          message: `Product with SKU '${row.product_sku}' already exists`,
          type: ERROR_TYPES.VALIDATION,
          severity: ERROR_SEVERITY.ERROR,
        });
      }
    }
    
    return {
      isValid: errors.filter(e => e.severity === ERROR_SEVERITY.ERROR).length === 0,
      errors,
    };
  }

  /**
   * Prepare product data from row data
   */
  private async prepareProductData(row: CsvRowData, catalogId?: number): Promise<InsertProduct> {
    // Handle category
    let categoryId: number | null = null;
    if (row.category_id && !isNaN(Number(row.category_id))) {
      categoryId = Number(row.category_id);
    } else if (row.category_name) {
      // Find or create category
      const category = await this.findOrCreateCategory(
        row.category_name, 
        row.category_parent_name
      );
      categoryId = category.id;
    }
    
    // Handle catalog
    let actualCatalogId: number | null = catalogId || null;
    if (!actualCatalogId) {
      if (row.catalog_id && !isNaN(Number(row.catalog_id))) {
        actualCatalogId = Number(row.catalog_id);
      } else if (row.catalog_name) {
        // Find or create catalog
        const catalog = await this.findOrCreateCatalog(
          row.catalog_name,
          row.supplier_id || row.supplier_name
        );
        actualCatalogId = catalog.id;
      }
    }
    
    // Extract tags
    const tags = row.tags ? row.tags.split(',').map(tag => tag.trim()) : [];
    
    // Prepare product data
    const productData: InsertProduct = {
      name: row.product_name,
      slug: this.slugify(row.product_sku),
      description: row.product_description,
      categoryId,
      catalogId: actualCatalogId,
      price: Number(row.regular_price),
      costPrice: Number(row.cost_price),
      salePrice: Number(row.sale_price),
      discount: Number(row.discount_percentage),
      // Remove fields not in InsertProduct
      isActive: row.status !== 'draft',
      isFeatured: row.featured === 'true',
      weight: row.weight ? Number(row.weight) : null,
      dimensions: row.dimensions || null,
      tags,
      // Add required fields for supplier that weren't previously included
      supplier: row.supplier_name || null,
      brand: row.brand || null,
    };
    
    return productData;
  }

  /**
   * Extract attribute values from row data
   */
  private extractAttributeValues(row: CsvRowData): AttributeValue[] {
    const attributeValues: AttributeValue[] = [];
    
    for (const [key, value] of Object.entries(row)) {
      if (key.startsWith(ATTRIBUTE_PREFIX) && value && value.trim() !== '') {
        const attributeName = key.substring(ATTRIBUTE_PREFIX.length);
        
        // Split by comma to get multiple values
        const values = value.split(',').map(v => v.trim()).filter(v => v !== '');
        
        if (values.length > 0) {
          attributeValues.push({
            attributeId: 0, // Will be determined during processing
            attributeName,
            values,
          });
        }
      }
    }
    
    return attributeValues;
  }

  /**
   * Process and save attribute values
   */
  private async processAttributeValues(tx: any, productId: number, attributeValues: AttributeValue[]): Promise<void> {
    for (const attrValue of attributeValues) {
      // Find attribute by name
      const [attribute] = await tx
        .select()
        .from(attributes)
        .where(
          or(
            eq(attributes.name, attrValue.attributeName),
            eq(attributes.displayName, attrValue.attributeName)
          )
        );
        
      if (!attribute) {
        // Create new attribute if it doesn't exist
        const [newAttribute] = await tx
          .insert(attributes)
          .values({
            name: attrValue.attributeName,
            displayName: attrValue.attributeName,
            attributeType: this.determineAttributeType(attrValue.attributeName),
            isFilterable: true,
          })
          .returning();
          
        attrValue.attributeId = newAttribute.id;
      } else {
        attrValue.attributeId = attribute.id;
      }
      
      // Find or create product attribute
      const [productAttribute] = await tx
        .select()
        .from(productAttributes)
        .where(
          and(
            eq(productAttributes.productId, productId),
            eq(productAttributes.attributeId, attrValue.attributeId)
          )
        );
        
      let productAttributeId: number;
      
      if (!productAttribute) {
        const [newProductAttribute] = await tx
          .insert(productAttributes)
          .values({
            productId,
            attributeId: attrValue.attributeId,
          })
          .returning();
          
        productAttributeId = newProductAttribute.id;
      } else {
        productAttributeId = productAttribute.id;
      }
      
      // Process each attribute value
      for (const value of attrValue.values) {
        // Find or create attribute option
        let attributeOptionId: number | null = null;
        
        const [existingOption] = await tx
          .select()
          .from(attributeOptions)
          .where(
            and(
              eq(attributeOptions.attributeId, attrValue.attributeId),
              eq(attributeOptions.value, value)
            )
          );
          
        if (existingOption) {
          attributeOptionId = existingOption.id;
        } else {
          const [newOption] = await tx
            .insert(attributeOptions)
            .values({
              attributeId: attrValue.attributeId,
              value,
              displayValue: value,
            })
            .returning();
            
          attributeOptionId = newOption.id;
        }
        
        // Find or create product attribute option
        let productAttributeOptionId: number | null = null;
        
        const [existingProductOption] = await tx
          .select()
          .from(productAttributeOptions)
          .where(
            and(
              eq(productAttributeOptions.productAttributeId, productAttributeId),
              eq(productAttributeOptions.value, value)
            )
          );
          
        if (existingProductOption) {
          productAttributeOptionId = existingProductOption.id;
        } else {
          const [newProductOption] = await tx
            .insert(productAttributeOptions)
            .values({
              productAttributeId,
              attributeOptionId,
              value,
              displayValue: value,
            })
            .returning();
            
          productAttributeOptionId = newProductOption.id;
        }
        
        // Create product attribute value
        await tx
          .insert(productAttributeValues)
          .values({
            productId,
            attributeId: attrValue.attributeId,
            optionId: productAttributeOptionId,
          });
      }
    }
  }

  /**
   * Determine attribute type based on name
   */
  private determineAttributeType(attributeName: string): string {
    const nameMap: Record<string, string> = {
      'color': 'color',
      'size': 'size',
      'material': 'select',
      'bed_size': 'size',
      'weight': 'number',
      'length': 'number',
      'width': 'number',
      'height': 'number',
    };
    
    return nameMap[attributeName] || 'select';
  }

  /**
   * Find or create a category
   */
  private async findOrCreateCategory(
    categoryName: string, 
    parentCategoryName?: string
  ): Promise<{ id: number; name: string }> {
    let parentId: number | null = null;
    
    // Find parent category if provided
    if (parentCategoryName) {
      const [parentCategory] = await db
        .select()
        .from(categories)
        .where(ilike(categories.name, parentCategoryName.trim()));
        
      if (parentCategory) {
        parentId = parentCategory.id;
      } else {
        // Create parent category if it doesn't exist
        const [newParentCategory] = await db
          .insert(categories)
          .values({
            name: parentCategoryName.trim(),
            slug: this.slugify(parentCategoryName.trim()),
          })
          .returning();
          
        parentId = newParentCategory.id;
      }
    }
    
    // Find existing category
    const [existingCategory] = await db
      .select()
      .from(categories)
      .where(ilike(categories.name, categoryName.trim()));
      
    if (existingCategory) {
      // Update parent if provided and different
      if (parentId && existingCategory.parentId !== parentId) {
        await db
          .update(categories)
          .set({ parentId })
          .where(eq(categories.id, existingCategory.id));
          
        return { id: existingCategory.id, name: existingCategory.name };
      }
      
      return { id: existingCategory.id, name: existingCategory.name };
    }
    
    // Create new category
    const [newCategory] = await db
      .insert(categories)
      .values({
        name: categoryName.trim(),
        slug: this.slugify(categoryName.trim()),
        parentId,
      })
      .returning();
      
    return { id: newCategory.id, name: newCategory.name };
  }

  /**
   * Find or create a catalog
   */
  private async findOrCreateCatalog(
    catalogName: string,
    supplierIdOrName?: string
  ): Promise<{ id: number; name: string }> {
    let supplierId: number | null = null;
    
    // Handle supplier
    if (supplierIdOrName) {
      if (!isNaN(Number(supplierIdOrName))) {
        // Use supplier ID directly
        supplierId = Number(supplierIdOrName);
      } else {
        // Find supplier by name
        const [existingSupplier] = await db
          .select()
          .from(suppliers)
          .where(ilike(suppliers.name, supplierIdOrName.trim()));
          
        if (existingSupplier) {
          supplierId = existingSupplier.id;
        } else {
          // Create new supplier if it doesn't exist
          const [newSupplier] = await db
            .insert(suppliers)
            .values({
              name: supplierIdOrName.trim(),
            })
            .returning();
            
          supplierId = newSupplier.id;
        }
      }
    }
    
    // Find existing catalog
    const [existingCatalog] = await db
      .select()
      .from(catalogs)
      .where(ilike(catalogs.name, catalogName.trim()));
      
    if (existingCatalog) {
      // Update supplier if provided and different
      if (supplierId && existingCatalog.supplierId !== supplierId) {
        await db
          .update(catalogs)
          .set({ supplierId })
          .where(eq(catalogs.id, existingCatalog.id));
          
        return { id: existingCatalog.id, name: existingCatalog.name };
      }
      
      return { id: existingCatalog.id, name: existingCatalog.name };
    }
    
    // Create new catalog
    const [newCatalog] = await db
      .insert(catalogs)
      .values({
        name: catalogName.trim(),
        supplierId,
      })
      .returning();
      
    return { id: newCatalog.id, name: newCatalog.name };
  }

  /**
   * Create a slug from a string
   */
  private slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-');
  }

  /**
   * Get all batch uploads
   */
  async getAllBatchUploads(userId?: number): Promise<BatchUpload[]> {
    let query = db.select().from(batchUploads);
    
    if (userId) {
      query = query.where(eq(batchUploads.userId, userId));
    }
    
    return await query.orderBy(batchUploads.createdAt);
  }

  /**
   * Get batch upload errors
   */
  async getBatchErrors(batchId: number): Promise<BatchUploadError[]> {
    return await db
      .select()
      .from(batchUploadErrors)
      .where(eq(batchUploadErrors.batchId, batchId))
      .orderBy(batchUploadErrors.createdAt);
  }

  /**
   * Delete a batch upload and all related errors
   */
  async deleteBatchUpload(batchId: number): Promise<void> {
    await db.transaction(async (tx) => {
      // Delete related errors
      await tx
        .delete(batchUploadErrors)
        .where(eq(batchUploadErrors.batchId, batchId));
        
      // Delete the batch upload
      await tx
        .delete(batchUploads)
        .where(eq(batchUploads.id, batchId));
    });
  }

  /**
   * Generate a template CSV for a catalog
   */
  async generateTemplateCsv(catalogId?: number): Promise<string> {
    // Base template headers
    const headers = [
      'supplier_id',
      'catalog_id',
      'category_name',
      'category_parent_name',
      'product_name',
      'product_description',
      'product_sku',
      'cost_price',
      'regular_price',
      'sale_price',
      'discount_percentage',
      'discount_label',
      'minimum_price',
      'wholesale_minimum_qty',
      'wholesale_discount_percentage',
      'short_description',
      'tags',
      'status',
      'featured',
      'weight',
      'dimensions',
    ];
    
    // Add dynamic attribute headers based on global attributes and catalog attributes
    const attributeNames = new Set<string>();
    
    // Get all global attributes
    const globalAttributes = await db.select().from(attributes);
    globalAttributes.forEach(attr => attributeNames.add(attr.name));
    
    // If catalogId is provided, get catalog-specific attributes
    if (catalogId) {
      const catalogAttributesList = await db
        .select({
          attributeName: attributes.name,
        })
        .from(catalogAttributes)
        .innerJoin(attributes, eq(attributes.id, catalogAttributes.attributeId))
        .where(eq(catalogAttributes.catalogId, catalogId));
        
      catalogAttributesList.forEach(item => attributeNames.add(item.attributeName));
    }
    
    // Add attribute headers with prefix
    const attributeHeaders = Array.from(attributeNames).map(name => `attr_${name}`);
    
    // Combine all headers
    const allHeaders = [...headers, ...attributeHeaders];
    
    // Generate CSV content
    let csvContent = allHeaders.join(',') + '\n';
    
    // Add example rows
    if (catalogId) {
      // Add catalog-specific example
      const [catalog] = await db
        .select({
          id: catalogs.id,
          name: catalogs.name,
          supplierId: catalogs.supplierId,
        })
        .from(catalogs)
        .where(eq(catalogs.id, catalogId));
        
      if (catalog) {
        // Example row for existing catalog
        const exampleRow = [
          catalog.supplierId || '',
          catalog.id,
          'Example Category',
          'Parent Category',
          'Example Product',
          'This is an example product description.',
          'SKU-12345',
          '100.00',
          '249.99',
          '199.99',
          '20',
          'Special Offer',
          '150.00',
          '5',
          '10',
          'Short product description',
          'example,product,sample',
          'active',
          'false',
          '1.5',
          '20x30x10',
        ];
        
        // Add example attribute values
        attributeHeaders.forEach(attr => {
          exampleRow.push('Value1,Value2,Value3');
        });
        
        csvContent += exampleRow.join(',') + '\n';
      }
    } else {
      // Generic example
      const exampleRow1 = [
        '1',
        '1',
        'Electronics',
        'Products',
        'Wireless Headphones',
        'High-quality wireless headphones with noise cancellation.',
        'WH-1000',
        '200.00',
        '399.99',
        '299.99',
        '25',
        'Limited Offer',
        '250.00',
        '3',
        '15',
        'Premium wireless headphones',
        'headphones,wireless,audio',
        'active',
        'true',
        '0.3',
        '18x20x8',
      ];
      
      const exampleRow2 = [
        '',
        'New Catalog',
        'Clothing',
        'Fashion',
        'Cotton T-Shirt',
        'Comfortable cotton t-shirt for everyday wear.',
        'TS-2000',
        '50.00',
        '149.99',
        '99.99',
        '33',
        'Flash Sale',
        '80.00',
        '10',
        '20',
        'Essential cotton t-shirt',
        'clothing,t-shirt,cotton',
        'active',
        'false',
        '0.2',
        '30x40x2',
      ];
      
      // Add example attribute values
      attributeHeaders.forEach(attr => {
        if (attr === 'attr_color') {
          exampleRow1.push('Black,Silver,White');
          exampleRow2.push('Red,Blue,Green,Yellow');
        } else if (attr === 'attr_size') {
          exampleRow1.push('One Size');
          exampleRow2.push('S,M,L,XL');
        } else if (attr === 'attr_material') {
          exampleRow1.push('Plastic,Metal');
          exampleRow2.push('Cotton,Polyester');
        } else {
          exampleRow1.push('Value1,Value2');
          exampleRow2.push('Value1,Value2,Value3');
        }
      });
      
      csvContent += exampleRow1.join(',') + '\n';
      csvContent += exampleRow2.join(',') + '\n';
    }
    
    return csvContent;
  }
}

// Export singleton instance
export const batchUploadService = new BatchUploadService();