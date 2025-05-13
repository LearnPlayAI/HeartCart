/**
 * Object Store Adapter
 * 
 * This file serves as an adapter to standardize object storage operations
 * across the application. It wraps the object-store.ts implementation
 * that's used by the product wizard.
 */

import { objectStore as primaryObjectStore, STORAGE_FOLDERS } from './object-store';
import path from 'path';

// Re-export the storage folders constant for consistency
export { STORAGE_FOLDERS };

/**
 * ObjectStoreAdapter
 * Standardizes access to object storage operations
 */
class ObjectStoreAdapter {
  /**
   * Initialize and check access to object storage
   */
  async initialize(): Promise<void> {
    return primaryObjectStore.initialize();
  }

  /**
   * Upload a buffer to object storage
   */
  async uploadFromBuffer(
    objectKey: string,
    buffer: Buffer,
    options?: any
  ): Promise<{ url: string; objectKey: string }> {
    await primaryObjectStore.uploadFromBuffer(objectKey, buffer, options);
    return {
      url: primaryObjectStore.getPublicUrl(objectKey),
      objectKey
    };
  }

  /**
   * Upload a temporary file for product creation process
   */
  async uploadTempFile(
    buffer: Buffer,
    filename: string,
    productId: string | number = 'pending',
    options?: any
  ): Promise<{ url: string; objectKey: string }> {
    const objectKey = `${STORAGE_FOLDERS.TEMP}/${productId}/${filename}`;
    
    try {
      await primaryObjectStore.uploadFromBuffer(objectKey, buffer, {
        contentType: options?.contentType || this.detectContentType(filename),
        ...options
      });
      
      return {
        url: primaryObjectStore.getPublicUrl(objectKey),
        objectKey
      };
    } catch (error) {
      console.error(`Failed to upload temp file ${filename}:`, error);
      throw new Error(`Failed to upload temporary file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Process an image for optimization
   */
  async processImage(buffer: Buffer, options?: any): Promise<Buffer> {
    return primaryObjectStore.processImage(buffer, options);
  }

  /**
   * Move a file from temporary to permanent storage
   */
  async moveToFinalLocation(
    sourceKey: string,
    supplierName: string,
    catalogName: string,
    categoryName: string,
    productName: string,
    productId: number
  ): Promise<{ url: string, objectKey: string }> {
    return primaryObjectStore.moveToFinalLocation(
      sourceKey,
      supplierName,
      catalogName,
      categoryName,
      productName,
      productId
    );
  }

  /**
   * Get a file from storage as a buffer
   */
  async getFileAsBuffer(objectKey: string): Promise<{ data: Buffer; contentType?: string }> {
    return primaryObjectStore.getFileAsBuffer(objectKey);
  }

  /**
   * Check if a file exists
   */
  async exists(objectKey: string): Promise<boolean> {
    return primaryObjectStore.exists(objectKey);
  }

  /**
   * Delete a file
   */
  async deleteFile(objectKey: string): Promise<boolean> {
    return primaryObjectStore.deleteFile(objectKey);
  }

  /**
   * Get the public URL for a file
   */
  getPublicUrl(objectKey: string): string {
    return primaryObjectStore.getPublicUrl(objectKey);
  }

  /**
   * Detect content type based on filename
   */
  detectContentType(filename: string): string {
    return primaryObjectStore.detectContentType(filename);
  }
}

// Export a singleton instance
export const objectStoreAdapter = new ObjectStoreAdapter();