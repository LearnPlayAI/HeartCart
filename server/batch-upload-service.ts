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
  INFO: 'info',
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
      if (!error.batchUploadId || isNaN(error.batchUploadId) || error.batchUploadId <= 0) {
        console.warn(`Invalid batch ID in error log: ${error.batchUploadId}`);
        return;
      }
      
      await db.insert(batchUploadErrors).values(error);
    } catch (dbError) {
      console.error('Failed to log batch error:', dbError);
    }
  }

  /**
   * Update batch upload status
   */
  async updateBatchStatus(id: number, status: string, updatedFields: Partial<BatchUpload> = {}): Promise<void> {
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
    }
  }

  /**
   * Get all batch uploads for a user
   */
  async getAllBatchUploads(userId?: number): Promise<BatchUpload[]> {
    try {
      const query = db.select().from(batchUploads);
      
      if (userId) {
        return await query.where(eq(batchUploads.userId, userId)).orderBy(desc(batchUploads.createdAt));
      }
      
      return await query.orderBy(desc(batchUploads.createdAt));
    } catch (error) {
      console.error('Error fetching batch uploads:', error);
      return [];
    }
  }

  /**
   * Get batch upload errors
   */
  async getBatchErrors(batchId: number): Promise<BatchUploadError[]> {
    return await db
      .select()
      .from(batchUploadErrors)
      .where(eq(batchUploadErrors.batchUploadId, batchId))
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
   * Process a CSV file
   */
  async processCsvFile(batchId: number, file: UploadedCsvFile): Promise<StandardApiResponse<BatchUpload>> {
    try {
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
      const self = this;
      
      // Process each row in the CSV file
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
              
              // Create a minimal product for now
              const productData: InsertProduct = {
                name: row.product_name,
                slug: row.product_name.toLowerCase().replace(/\s+/g, '-'),
                description: row.product_description,
                categoryId: parseInt(row.category_id) || undefined,
                catalogId: batch.catalogId || parseInt(row.catalog_id) || undefined,
                price: parseFloat(row.regular_price),
                costPrice: parseFloat(row.cost_price),
                salePrice: row.sale_price ? parseFloat(row.sale_price) : undefined,
                stock: parseInt(row.stock || '0'),
                brand: row.brand || undefined,
                weight: row.weight ? parseFloat(row.weight) : undefined,
                dimensions: row.dimensions || undefined,
                isActive: true,
                isFeatured: false,
              };
              
              // Process the row and create the product
              const result = await db.transaction(async (tx) => {
                try {
                  // Create the product
                  const [product] = await tx
                    .insert(products)
                    .values(productData)
                    .returning();
                  
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
      'regular_price',
      'cost_price',
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
    
    // Validate numeric fields
    const numericFields = ['regular_price', 'cost_price', 'sale_price'];
    
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
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate template CSV
   */
  async generateTemplateCsv(catalogId?: number): Promise<{ content: string; catalogName?: string }> {
    const headers = [
      'product_name',
      'product_description',
      'regular_price',
      'cost_price',
      'sale_price',
      'stock',
      'brand',
      'weight',
      'dimensions',
      'category_id',
      'catalog_id',
    ];
    
    const sampleRow = [
      'Sample Product',
      'This is a sample product description',
      '29.99',
      '15.00',
      '24.99',
      '100',
      'Sample Brand',
      '0.5',
      '10x10x5',
      '1',
      catalogId?.toString() || '1',
    ];
    
    const csvContent = [headers.join(','), sampleRow.join(',')].join('\n');
    
    return {
      content: csvContent,
      catalogName: catalogId ? `catalog_${catalogId}` : 'generic',
    };
  }
}

// Export a singleton instance
export const batchUploadService = new BatchUploadService();