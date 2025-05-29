/**
 * Batch Upload Service
 * 
 * This service handles the CSV upload, parsing, validation, and product creation
 * for the mass product upload system. It supports multi-value attributes
 * with comma-separated values in the CSV.
 */

import { db } from './db';
import { and, eq, ilike, inArray, isNull, or, desc } from 'drizzle-orm';
import {
  batchUploads,
  batchUploadErrors,
  products,
  categories,
  catalogs,
  suppliers,
  attributes,
  attributeOptions,
  productAttributes,
  InsertBatchUpload,
  InsertBatchUploadError,
  InsertProduct,
  Product,
  BatchUpload,
  BatchUploadError
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
  CANCELLED: 'cancelled',
  PAUSED: 'paused',
  RESUMABLE: 'resumable',
  RETRYING: 'retrying',
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
  INFO: 'info', // Adding INFO level for audit and log messages that aren't errors
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
    // Validate ID is a valid number
    if (isNaN(id) || id <= 0) {
      console.warn(`Invalid batch upload ID provided: ${id}`);
      return null;
    }
    
    try {
      const [batchUpload] = await db.select().from(batchUploads).where(eq(batchUploads.id, id));
      return batchUpload || null;
    } catch (error) {
      console.error(`Error fetching batch upload with ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Log an error for a batch upload
   */
  async logBatchError(error: InsertBatchUploadError): Promise<void> {
    try {
      // Validate batchUploadId is a valid number
      if (!error.batchUploadId || isNaN(error.batchUploadId) || error.batchUploadId <= 0) {
        console.warn(`Invalid batch ID in error log: ${error.batchUploadId}`);
        return;
      }
      
      await db.insert(batchUploadErrors).values(error);
    } catch (dbError) {
      console.error('Failed to log batch error:', dbError);
      // Continue without throwing to avoid cascading errors
    }
  }

  /**
   * Update batch upload status
   */
  async updateBatchStatus(id: number, status: string, updatedFields: Partial<BatchUpload> = {}): Promise<void> {
    // Validate ID is a valid number
    if (isNaN(id) || id <= 0) {
      console.warn(`Invalid batch upload ID provided for status update: ${id}`);
      return;
    }
    
    try {
      const statusFields: Partial<BatchUpload> = {
        status,
        updatedAt: new Date().toISOString(),
      };
      
      // Add appropriate timestamp based on status
      switch (status) {
        case BATCH_STATUSES.COMPLETED:
          statusFields.completedAt = new Date().toISOString();
          break;
        case BATCH_STATUSES.CANCELLED:
          statusFields.canceledAt = new Date().toISOString();
          break;
        case BATCH_STATUSES.PAUSED:
          statusFields.pausedAt = new Date().toISOString();
          break;
        case BATCH_STATUSES.RESUMABLE:
        case BATCH_STATUSES.RETRYING:
          statusFields.resumedAt = new Date().toISOString();
          break;
      }
      
      await db.update(batchUploads)
        .set({
          ...statusFields,
          ...updatedFields
        })
        .where(eq(batchUploads.id, id));
    } catch (error) {
      console.error(`Error updating batch status for ID ${id}:`, error);
      // Continue without throwing to avoid cascading errors
    }
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
        fileOriginalName: file.originalname,
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
        batchUploadId: batchId,
        type: ERROR_TYPES.SYSTEM,
        message: `System error: ${errorMessage}`,
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
   * @param batchId The ID of the batch upload
   * @param filePath The path to the CSV file
   * @param startRow The row to start processing from (for resuming)
   */
  private async parseAndProcessCsv(batchId: number, filePath: string, startRow: number = 0): Promise<{
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
          let rowCount = 0;
          
          for await (const row of source) {
            rowCount++;
            totalRecords++;
            
            // Skip rows until we reach the startRow (for resuming)
            if (startRow > 0 && rowCount <= startRow) {
              continue;
            }
            
            try {
              // Validate the row data
              const validationResult = await self.validateRowData(row, batch.catalogId || undefined);
              
              if (!validationResult.isValid) {
                // Log validation errors
                for (const error of validationResult.errors) {
                  await self.logBatchError({
                    batchUploadId: batchId,
                    row: totalRecords,
                    type: ERROR_TYPES.VALIDATION,
                    message: error.message,
                    severity: error.severity,
                    field: error.field,
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
                  const productData = await self.prepareProductData(row, batch.catalogId || undefined);
                  
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
                  batchUploadId: batchId,
                  row: totalRecords,
                  type: ERROR_TYPES.PROCESSING,
                  message: errorMessage,
                  severity: ERROR_SEVERITY.ERROR,
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
                batchUploadId: batchId,
                row: totalRecords,
                type: ERROR_TYPES.SYSTEM,
                message: `System error: ${errorMessage}`,
                severity: ERROR_SEVERITY.ERROR,
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
    let categoryId: number | undefined = undefined;
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
    let actualCatalogId: number | undefined = catalogId;
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
    
    // Prepare product data with safe undefined handling
    const productData: InsertProduct = {
      name: row.product_name,
      slug: this.slugify(row.product_sku),
      description: row.product_description || undefined,
      categoryId, // Already properly handled above
      catalogId: actualCatalogId,
      price: Number(row.regular_price) || 0, // Ensure price doesn't become NaN
      costPrice: Number(row.cost_price) || 0, // Ensure costPrice doesn't become NaN
      salePrice: row.sale_price ? Number(row.sale_price) || undefined : undefined,
      discount: row.discount_percentage ? Number(row.discount_percentage) || undefined : undefined,
      isActive: row.status !== 'draft',
      isFeatured: row.featured === 'true',
      weight: row.weight ? Number(row.weight) || undefined : undefined,
      dimensions: row.dimensions || undefined,
      tags,
      supplier: row.supplier_name || undefined,
      brand: row.brand || undefined,
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
      
      // Process each attribute value and collect option IDs
      const selectedOptionIds: number[] = [];
      let textValue: string | null = null;
      
      for (const value of attrValue.values) {
        // Find or create attribute option
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
          selectedOptionIds.push(existingOption.id);
        } else {
          const [newOption] = await tx
            .insert(attributeOptions)
            .values({
              attributeId: attrValue.attributeId,
              value,
              displayValue: value,
            })
            .returning();
            
          selectedOptionIds.push(newOption.id);
        }
        
        // If it's a text-based attribute and this is the first value,
        // also store as text value
        if (attribute && (attribute.attributeType === 'text' || attribute.attributeType === 'textarea') && !textValue) {
          textValue = value;
        }
      }
      
      // Find or update product attribute with the new selectedOptions array
      const [existingProductAttribute] = await tx
        .select()
        .from(productAttributes)
        .where(
          and(
            eq(productAttributes.productId, productId),
            eq(productAttributes.attributeId, attrValue.attributeId)
          )
        );
        
      if (existingProductAttribute) {
        // Update existing product attribute with new selected options
        await tx
          .update(productAttributes)
          .set({
            selectedOptions: selectedOptionIds,
            textValue: textValue,
            updatedAt: new Date()
          })
          .where(eq(productAttributes.id, existingProductAttribute.id));
      } else {
        // Create new product attribute
        await tx
          .insert(productAttributes)
          .values({
            productId,
            attributeId: attrValue.attributeId,
            selectedOptions: selectedOptionIds,
            textValue: textValue,
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
    let parentId: number | undefined = undefined;
    
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
    let supplierId: number | undefined = undefined;
    
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
   * Cancel a batch upload
   * @param batchId - The ID of the batch upload to cancel
   * @returns A standard API response with the updated batch upload or error details
   */
  async cancelBatchUpload(batchId: number): Promise<StandardApiResponse<BatchUpload>> {
    // Input validation
    if (!batchId || isNaN(batchId) || batchId <= 0) {
      console.error(`Invalid batch ID provided for cancellation: ${batchId}`);
      return {
        success: false,
        error: {
          message: 'Invalid batch upload ID',
          code: 'INVALID_BATCH_ID',
        }
      };
    }
    
    try {
      // Get batch with validation
      const batch = await this.getBatchUpload(batchId);
      if (!batch) {
        console.warn(`Attempted to cancel non-existent batch with ID ${batchId}`);
        return {
          success: false,
          error: {
            message: `Batch upload with ID ${batchId} not found`,
            code: 'BATCH_NOT_FOUND',
          }
        };
      }
      
      // State validation - only allow cancellation of batches that are in processing, pending, or paused state
      const cancelableStates = [BATCH_STATUSES.PROCESSING, BATCH_STATUSES.PENDING, BATCH_STATUSES.PAUSED];
      if (!cancelableStates.includes(batch.status)) {
        console.warn(`Attempted to cancel batch ${batchId} in invalid state: ${batch.status}`);
        return {
          success: false,
          error: {
            message: `Cannot cancel batch in ${batch.status} status. Batch must be in one of these states: ${cancelableStates.join(', ')}`,
            code: 'INVALID_BATCH_STATE',
          }
        };
      }
      
      // Log the cancellation action
      console.log(`Cancelling batch upload ${batchId} (previous status: ${batch.status})`);
      
      try {
        // Update batch status to cancelled
        await this.updateBatchStatus(batchId, BATCH_STATUSES.CANCELLED, {
          canceledAt: new Date(), // Add cancellation timestamp for tracking
        });
        
        // Log the system event for audit trail
        await this.logBatchError({
          batchId,
          errorType: ERROR_TYPES.SYSTEM,
          errorMessage: `Batch was manually cancelled while in ${batch.status} state`,
          severity: ERROR_SEVERITY.INFO, // This is an informational message, not an error
        });
        
        // Get updated batch for response
        const updatedBatch = await this.getBatchUpload(batchId);
        if (!updatedBatch) {
          throw new Error(`Failed to retrieve updated batch after cancellation`);
        }
        
        console.log(`Successfully cancelled batch upload ${batchId}`);
        return {
          success: true,
          data: updatedBatch
        };
      } catch (updateError) {
        // Handle errors during the update operation
        const updateErrorMessage = updateError instanceof Error ? updateError.message : 'Unknown update error';
        console.error(`Error updating batch status during cancellation: ${updateErrorMessage}`);
        throw updateError; // Re-throw to be caught by the outer catch block
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error cancelling batch ${batchId}:`, error);
      
      // Attempt to log the error to the database for the batch
      try {
        await this.logBatchError({
          batchId,
          errorType: ERROR_TYPES.SYSTEM,
          errorMessage: `Failed to cancel batch: ${errorMessage}`,
          severity: ERROR_SEVERITY.ERROR,
        });
      } catch (logError) {
        // Just log to console if we can't log to the database
        console.error(`Failed to log batch cancellation error: ${logError}`);
      }
      
      return {
        success: false,
        error: {
          message: 'Failed to cancel batch upload',
          code: 'BATCH_CANCEL_FAILED',
          details: errorMessage
        }
      };
    }
  }
  
  /**
   * Pause a batch upload
   * @param batchId - The ID of the batch upload to pause
   * @returns A standard API response with the updated batch upload or error details
   */
  async pauseBatchUpload(batchId: number): Promise<StandardApiResponse<BatchUpload>> {
    // Input validation
    if (!batchId || isNaN(batchId) || batchId <= 0) {
      console.error(`Invalid batch ID provided for pausing: ${batchId}`);
      return {
        success: false,
        error: {
          message: 'Invalid batch upload ID',
          code: 'INVALID_BATCH_ID',
        }
      };
    }
    
    try {
      // Get batch with validation
      const batch = await this.getBatchUpload(batchId);
      if (!batch) {
        console.warn(`Attempted to pause non-existent batch with ID ${batchId}`);
        return {
          success: false,
          error: {
            message: `Batch upload with ID ${batchId} not found`,
            code: 'BATCH_NOT_FOUND',
          }
        };
      }
      
      // State validation - only allow pausing of batches that are in processing state
      if (batch.status !== BATCH_STATUSES.PROCESSING) {
        console.warn(`Attempted to pause batch ${batchId} in invalid state: ${batch.status}`);
        return {
          success: false,
          error: {
            message: `Cannot pause batch in ${batch.status} status. Batch must be in ${BATCH_STATUSES.PROCESSING} state.`,
            code: 'INVALID_BATCH_STATE',
          }
        };
      }
      
      // Log the pause action
      console.log(`Pausing batch upload ${batchId} (current progress: ${batch.processedRecords || 0}/${batch.totalRecords || 0} records)`);
      
      try {
        // Update the batch status to paused, and store the last processed row
        // This ensures we can resume from the correct position later
        await this.updateBatchStatus(batchId, BATCH_STATUSES.PAUSED, {
          lastProcessedRow: batch.processedRecords || 0,
          pausedAt: new Date() // Add timestamp for when the batch was paused
        });
        
        // Log the system event for audit trail
        await this.logBatchError({
          batchId,
          errorType: ERROR_TYPES.SYSTEM,
          errorMessage: `Batch was manually paused at row ${batch.processedRecords || 0}`,
          severity: ERROR_SEVERITY.INFO, // This is an informational message, not an error
        });
        
        // Get updated batch for response
        const updatedBatch = await this.getBatchUpload(batchId);
        if (!updatedBatch) {
          throw new Error(`Failed to retrieve updated batch after pausing`);
        }
        
        console.log(`Successfully paused batch upload ${batchId}`);
        return {
          success: true,
          data: updatedBatch
        };
      } catch (updateError) {
        // Handle errors during the update operation
        const updateErrorMessage = updateError instanceof Error ? updateError.message : 'Unknown update error';
        console.error(`Error updating batch status during pause: ${updateErrorMessage}`);
        throw updateError; // Re-throw to be caught by the outer catch block
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error pausing batch ${batchId}:`, error);
      
      // Attempt to log the error to the database for the batch
      try {
        await this.logBatchError({
          batchId,
          errorType: ERROR_TYPES.SYSTEM,
          errorMessage: `Failed to pause batch: ${errorMessage}`,
          severity: ERROR_SEVERITY.ERROR,
        });
      } catch (logError) {
        // Just log to console if we can't log to the database
        console.error(`Failed to log batch pause error: ${logError}`);
      }
      
      return {
        success: false,
        error: {
          message: 'Failed to pause batch upload',
          code: 'BATCH_PAUSE_FAILED',
          details: errorMessage
        }
      };
    }
  }
  
  /**
   * Resume a batch upload that was previously paused
   * @param batchId - The ID of the batch upload to resume
   * @returns A standard API response with the updated batch upload or error details
   */
  async resumeBatchUpload(batchId: number): Promise<StandardApiResponse<BatchUpload>> {
    // Input validation
    if (!batchId || isNaN(batchId) || batchId <= 0) {
      console.error(`Invalid batch ID provided for resuming: ${batchId}`);
      return {
        success: false,
        error: {
          message: 'Invalid batch upload ID',
          code: 'INVALID_BATCH_ID',
        }
      };
    }
    
    try {
      // Get batch with validation
      const batch = await this.getBatchUpload(batchId);
      if (!batch) {
        console.warn(`Attempted to resume non-existent batch with ID ${batchId}`);
        return {
          success: false,
          error: {
            message: `Batch upload with ID ${batchId} not found`,
            code: 'BATCH_NOT_FOUND',
          }
        };
      }
      
      // State validation - only allow resuming of batches that are in paused or resumable state
      const resumableStates = [BATCH_STATUSES.PAUSED, BATCH_STATUSES.RESUMABLE];
      if (!resumableStates.includes(batch.status)) {
        console.warn(`Attempted to resume batch ${batchId} in invalid state: ${batch.status}`);
        return {
          success: false,
          error: {
            message: `Cannot resume batch in ${batch.status} status. Batch must be in one of these states: ${resumableStates.join(', ')}`,
            code: 'INVALID_BATCH_STATE',
          }
        };
      }
      
      // Check for CSV file existence
      if (!batch.fileName) {
        console.error(`No file path associated with batch ID ${batchId}`);
        await this.logBatchError({
          batchId,
          errorType: ERROR_TYPES.SYSTEM,
          errorMessage: 'Cannot resume batch: No file path stored with batch',
          severity: ERROR_SEVERITY.ERROR,
        });
        
        return {
          success: false,
          error: {
            message: 'No CSV file associated with this batch',
            code: 'FILE_PATH_MISSING',
          }
        };
      }
      
      if (!fs.existsSync(batch.fileName)) {
        console.error(`CSV file not found for batch ID ${batchId}: ${batch.fileName}`);
        await this.logBatchError({
          batchId,
          errorType: ERROR_TYPES.SYSTEM,
          errorMessage: `Cannot resume batch: File not found at ${batch.fileName}`,
          severity: ERROR_SEVERITY.ERROR,
        });
        
        return {
          success: false,
          error: {
            message: 'CSV file no longer exists on the server',
            code: 'FILE_NOT_FOUND',
          }
        };
      }
      
      // Log the resume action
      console.log(`Resuming batch upload ${batchId} from row ${batch.lastProcessedRow || 0}`);
      
      try {
        // Update batch status to processing before starting
        await this.updateBatchStatus(batchId, BATCH_STATUSES.PROCESSING, {
          resumedAt: new Date(), // Add timestamp for when the batch was resumed
        });
        
        // Log the system event for audit trail
        await this.logBatchError({
          batchId,
          errorType: ERROR_TYPES.SYSTEM,
          errorMessage: `Batch is being resumed from row ${batch.lastProcessedRow || 0}`,
          severity: ERROR_SEVERITY.INFO,
        });
        
        // Process the CSV file from the last processed row
        // This handles the actual data processing and product creation
        const results = await this.parseAndProcessCsv(
          batchId, 
          batch.fileName, 
          batch.lastProcessedRow || 0
        );
        
        // Calculate the final batch statistics
        const totalRecords = (batch.totalRecords || 0) + results.totalRecords;
        const processedRecords = (batch.processedRecords || 0) + results.processedRecords;
        const successCount = (batch.successCount || 0) + results.successRecords;
        const errorCount = (batch.errorCount || 0) + results.failedRecords;
        
        // Determine final status and update batch with stats
        const finalStatus = results.success ? BATCH_STATUSES.COMPLETED : BATCH_STATUSES.FAILED;
        await this.updateBatchStatus(batchId, finalStatus, {
          totalRecords,
          processedRecords,
          successCount,
          errorCount,
          completedAt: finalStatus === BATCH_STATUSES.COMPLETED ? new Date() : undefined
        });
        
        console.log(`Resume completed for batch ${batchId}: ${processedRecords}/${totalRecords} records processed, ${successCount} succeeded, ${errorCount} failed`);
        
        // Log completion event
        await this.logBatchError({
          batchId,
          errorType: ERROR_TYPES.SYSTEM,
          errorMessage: `Resume completed with status: ${finalStatus}. Stats: ${processedRecords}/${totalRecords} processed, ${successCount} successful, ${errorCount} errors.`,
          severity: results.success ? ERROR_SEVERITY.INFO : ERROR_SEVERITY.WARNING,
        });
        
        // Get the updated batch for the response
        const updatedBatch = await this.getBatchUpload(batchId);
        if (!updatedBatch) {
          throw new Error(`Failed to retrieve updated batch after resuming`);
        }
        
        return {
          success: results.success,
          data: updatedBatch,
          ...(results.success ? {} : {
            error: {
              message: 'Batch resume completed with errors',
              code: 'BATCH_RESUME_ERRORS',
              details: results.errors
            }
          })
        };
      } catch (processingError) {
        // Handle errors during the processing operation
        const errorMessage = processingError instanceof Error ? processingError.message : 'Unknown processing error';
        console.error(`Error processing batch during resume: ${errorMessage}`);
        throw processingError; // Re-throw to be caught by the outer catch block
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error resuming batch ${batchId}:`, error);
      
      // Attempt to log the error to the database for the batch
      try {
        // Log the system error
        await this.logBatchError({
          batchId,
          errorType: ERROR_TYPES.SYSTEM,
          errorMessage: `Resume error: ${errorMessage}`,
          severity: ERROR_SEVERITY.ERROR,
        });
        
        // Update batch status to failed
        await this.updateBatchStatus(batchId, BATCH_STATUSES.FAILED, {
          failedAt: new Date()
        });
      } catch (logError) {
        // Just log to console if we can't log to the database
        console.error(`Failed to log batch resumption error: ${logError}`);
      }
      
      return {
        success: false,
        error: {
          message: 'Failed to resume batch upload',
          code: 'BATCH_RESUME_FAILED',
          details: errorMessage
        }
      };
    }
  }
  
  /**
   * Retry a failed batch upload from scratch
   * @param batchId - The ID of the batch upload to retry
   * @returns A standard API response with the updated batch upload or error details
   */
  async retryBatchUpload(batchId: number): Promise<StandardApiResponse<BatchUpload>> {
    // Input validation
    if (!batchId || isNaN(batchId) || batchId <= 0) {
      console.error(`Invalid batch ID provided for retry: ${batchId}`);
      return {
        success: false,
        error: {
          message: 'Invalid batch upload ID',
          code: 'INVALID_BATCH_ID',
        }
      };
    }
    
    try {
      // Get batch with validation
      const batch = await this.getBatchUpload(batchId);
      if (!batch) {
        console.warn(`Attempted to retry non-existent batch with ID ${batchId}`);
        return {
          success: false,
          error: {
            message: `Batch upload with ID ${batchId} not found`,
            code: 'BATCH_NOT_FOUND',
          }
        };
      }
      
      // State validation - only allow retrying of batches that are in failed state
      if (batch.status !== BATCH_STATUSES.FAILED) {
        console.warn(`Attempted to retry batch ${batchId} in invalid state: ${batch.status}`);
        return {
          success: false,
          error: {
            message: `Cannot retry batch in ${batch.status} status. Batch must be in ${BATCH_STATUSES.FAILED} state.`,
            code: 'INVALID_BATCH_STATE',
          }
        };
      }
      
      // Check for CSV file existence
      if (!batch.fileName) {
        console.error(`No file path associated with batch ID ${batchId}`);
        await this.logBatchError({
          batchId,
          errorType: ERROR_TYPES.SYSTEM,
          errorMessage: 'Cannot retry batch: No file path stored with batch',
          severity: ERROR_SEVERITY.ERROR,
        });
        
        return {
          success: false,
          error: {
            message: 'No CSV file associated with this batch',
            code: 'FILE_PATH_MISSING',
          }
        };
      }
      
      if (!fs.existsSync(batch.fileName)) {
        console.error(`CSV file not found for batch ID ${batchId}: ${batch.fileName}`);
        await this.logBatchError({
          batchId,
          errorType: ERROR_TYPES.SYSTEM,
          errorMessage: `Cannot retry batch: File not found at ${batch.fileName}`,
          severity: ERROR_SEVERITY.ERROR,
        });
        
        return {
          success: false,
          error: {
            message: 'CSV file no longer exists on the server',
            code: 'FILE_NOT_FOUND',
          }
        };
      }
      
      // Increment retry count
      const retryCount = (batch.retryCount || 0) + 1;
      
      console.log(`Retrying batch upload ${batchId} (attempt #${retryCount})`);
      
      try {
        // Update batch status to retrying with reset counters
        await this.updateBatchStatus(batchId, BATCH_STATUSES.RETRYING, {
          retryCount,
          processedRecords: 0,
          successCount: 0,
          errorCount: 0,
          startedAt: new Date(), // Reset start time for this retry attempt
        });
        
        // Log the retry event for audit trail
        await this.logBatchError({
          batchId,
          errorType: ERROR_TYPES.SYSTEM,
          errorMessage: `Starting retry attempt #${retryCount}`,
          severity: ERROR_SEVERITY.INFO,
        });
        
        // Clear previous errors for this batch to start fresh
        try {
          await db.delete(batchUploadErrors).where(eq(batchUploadErrors.batchUploadId, batchId));
          console.log(`Cleared previous errors for batch ${batchId}`);
        } catch (clearError) {
          console.error(`Failed to clear previous errors for batch ${batchId}:`, clearError);
          // Continue despite error - we'll log new errors anyway
        }
        
        // Process the CSV file from the beginning
        // Retry processes the entire file from scratch, ignoring previous progress
        const results = await this.parseAndProcessCsv(batchId, batch.fileName);
        
        // Determine final status and update batch with stats
        const finalStatus = results.success ? BATCH_STATUSES.COMPLETED : BATCH_STATUSES.FAILED;
        await this.updateBatchStatus(batchId, finalStatus, {
          totalRecords: results.totalRecords,
          processedRecords: results.processedRecords,
          successCount: results.successRecords,
          errorCount: results.failedRecords,
          completedAt: finalStatus === BATCH_STATUSES.COMPLETED ? new Date() : undefined,
          failedAt: finalStatus === BATCH_STATUSES.FAILED ? new Date() : undefined
        });
        
        console.log(`Retry completed for batch ${batchId}: ${results.processedRecords}/${results.totalRecords} records processed, ${results.successRecords} succeeded, ${results.failedRecords} failed`);
        
        // Log completion event
        await this.logBatchError({
          batchId,
          errorType: ERROR_TYPES.SYSTEM,
          errorMessage: `Retry #${retryCount} completed with status: ${finalStatus}. Stats: ${results.processedRecords}/${results.totalRecords} processed, ${results.successRecords} successful, ${results.failedRecords} errors.`,
          severity: results.success ? ERROR_SEVERITY.INFO : ERROR_SEVERITY.WARNING,
        });
        
        // Get updated batch for response
        const updatedBatch = await this.getBatchUpload(batchId);
        if (!updatedBatch) {
          throw new Error(`Failed to retrieve updated batch after retry`);
        }
        
        return {
          success: results.success,
          data: updatedBatch,
          ...(results.success ? {} : {
            error: {
              message: `Batch retry attempt #${retryCount} completed with errors`,
              code: 'BATCH_RETRY_ERRORS',
              details: results.errors
            }
          })
        };
      } catch (processingError) {
        // Handle errors during the processing operation
        const errorMessage = processingError instanceof Error ? processingError.message : 'Unknown processing error';
        console.error(`Error processing batch during retry: ${errorMessage}`);
        throw processingError; // Re-throw to be caught by the outer catch block
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error retrying batch ${batchId}:`, error);
      
      // Attempt to log the error to the database for the batch
      try {
        // Log the system error
        await this.logBatchError({
          batchId,
          errorType: ERROR_TYPES.SYSTEM,
          errorMessage: `Retry error: ${errorMessage}`,
          severity: ERROR_SEVERITY.ERROR,
        });
        
        // Update batch status to failed
        await this.updateBatchStatus(batchId, BATCH_STATUSES.FAILED, {
          failedAt: new Date()
        });
      } catch (logError) {
        // Just log to console if we can't log to the database
        console.error(`Failed to log batch retry error: ${logError}`);
      }
      
      return {
        success: false,
        error: {
          message: 'Failed to retry batch upload',
          code: 'BATCH_RETRY_FAILED',
          details: errorMessage
        }
      };
    }
  }

  /**
   * Get all batch uploads
   */
  async getAllBatchUploads(userId?: number): Promise<BatchUpload[]> {
    if (userId) {
      return await db
        .select()
        .from(batchUploads)
        .where(eq(batchUploads.userId, userId))
        .orderBy(desc(batchUploads.createdAt));
    }
    
    return await db
      .select()
      .from(batchUploads)
      .orderBy(desc(batchUploads.createdAt));
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
        .where(eq(batchUploadErrors.batchUploadId, batchId));
        
      // Delete the batch upload
      await tx
        .delete(batchUploads)
        .where(eq(batchUploads.id, batchId));
    });
  }

  /**
   * Generate a template CSV for a catalog
   */
  async generateTemplateCsv(catalogId?: number): Promise<{ content: string; catalogName?: string }> {
    // Handle special cases for catalogId
    const isValidCatalogId = catalogId !== undefined && 
                           catalogId !== null && 
                           !isNaN(Number(catalogId)) && 
                           Number(catalogId) > 0 &&
                           String(catalogId).toLowerCase() !== 'none' &&
                           String(catalogId).toLowerCase() !== 'undefined';
    
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
    let catalogInfo = null;
    
    try {
      // Get all global attributes
      const globalAttributes = await db.select().from(attributes);
      globalAttributes.forEach(attr => attributeNames.add(attr.name));
    } catch (error) {
      console.error('Error fetching global attributes:', error);
      // Continue with empty attributes rather than failing completely
    }
    
    // If catalogId is provided and valid, get catalog-specific attributes and info
    let validCatalog = false;
    if (isValidCatalogId) {
      try {
        // First check if catalog exists
        const [catalog] = await db
          .select({
            id: catalogs.id,
            name: catalogs.name,
            supplierId: catalogs.supplierId,
          })
          .from(catalogs)
          .where(eq(catalogs.id, Number(catalogId)));
        
        if (catalog) {
          catalogInfo = catalog;
          validCatalog = true;
          
          // Get catalog attributes
          try {
            const catalogAttributesList = await db
              .select({
                attributeName: attributes.name,
              })
              .from(catalogAttributes)
              .innerJoin(attributes, eq(attributes.id, catalogAttributes.attributeId))
              .where(eq(catalogAttributes.catalogId, Number(catalogId)));
              
            catalogAttributesList.forEach(item => attributeNames.add(item.attributeName));
          } catch (attrError) {
            console.error('Error fetching catalog attributes:', attrError);
            // Continue with global attributes
          }
        } else {
          console.warn(`Catalog with ID ${catalogId} not found.`);
        }
      } catch (error) {
        console.error('Error verifying catalog existence:', error);
      }
    }
    
    // Add attribute headers with prefix
    const attributeHeaders = Array.from(attributeNames).map(name => `attr_${name}`);
    
    // Combine all headers
    const allHeaders = [...headers, ...attributeHeaders];
    
    // Generate CSV content
    let csvContent = allHeaders.join(',') + '\n';
    
    // Add example rows
    if (validCatalog && catalogInfo) {
      // Add catalog-specific example
      try {
        // Example row for existing catalog
        const exampleRow = [
          catalogInfo.supplierId || '',
          catalogInfo.id,
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
      } catch (error) {
        console.error('Error generating catalog-specific template:', error);
        // Continue with generic example if there's an error
        validCatalog = false;
      }
    } 
    
    if (!validCatalog) {
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
    
    // Return both the CSV content and catalog info for filename customization
    return {
      content: csvContent,
      catalogName: catalogInfo?.name
    };
  }
}

// Export singleton instance
export const batchUploadService = new BatchUploadService();