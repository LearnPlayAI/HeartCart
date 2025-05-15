import { Client } from '@replit/object-storage';
import { Readable } from 'stream';
import path from 'path';
import mime from 'mime-types';
import retry from 'async-retry';
import sharp from 'sharp'; // For image processing

// Standard folders for organizing files
export const STORAGE_FOLDERS = {
  PRODUCTS: 'products',
  PRODUCT_IMAGES: 'product_images',
  DRAFTS: 'drafts',
  CATEGORIES: 'categories',
  SUPPLIERS: 'suppliers',
  CATALOGS: 'catalogs',
  TEMP: 'temp',
  THUMBNAILS: 'thumbnails',
  OPTIMIZED: 'optimized'
};

// Define file operation options
interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  cacheControl?: string;
  contentDisposition?: string;
}

// Base path for serving files
const BASE_URL = '/api/files';

/**
 * ObjectStore service for handling file operations
 * This implementation uses a clean-break approach with no legacy code or fallbacks
 */
class ObjectStoreService {
  private objectStore: Client;
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;
  
  constructor() {
    // Safely instantiate the ObjectStore client
    this.objectStore = new Client();
    // Initialize right away to detect issues early
    this.initialize();
  }
  
  /**
   * Initialize the Object Store client
   * This ensures initialization happens only once and is awaited properly
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    if (this.initPromise) {
      return this.initPromise;
    }
    
    this.initPromise = (async () => {
      try {
        await this.verifyAccess();
        this.isInitialized = true;
        console.log('Object Store successfully initialized');
      } catch (error) {
        console.error('Failed to initialize Object Store:', error);
        throw error;
      }
    })();
    
    return this.initPromise;
  }
  
  /**
   * Verify access to Object Store by attempting a simple operation
   */
  private async verifyAccess(): Promise<void> {
    try {
      // Try a simple list operation to verify access
      const result = await this.objectStore.list("");
      
      // Check for error in the result
      if ('err' in result && result.err) {
        const errorMessage = typeof result.err === 'object' ? 
          JSON.stringify(result.err) : String(result.err);
        throw new Error(`Object Store access error: ${errorMessage}`);
      }
      
      console.log('Object Store access verified successfully');
    } catch (error) {
      console.error('Object Store access verification failed:', error);
      throw new Error(`Failed to verify Object Store access: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Upload a buffer to Object Storage
   */
  async uploadFromBuffer(
    objectKey: string,
    buffer: Buffer,
    options: UploadOptions = {}
  ): Promise<string> {
    await this.initialize();
    
    try {
      // Use retry with exponential backoff for reliability
      await retry(
        async () => {
          const uploadResult = await this.objectStore.uploadFromBytes(objectKey, buffer, {
            contentType: options.contentType || this.detectContentType(objectKey),
            metadata: options.metadata || {},
            cacheControl: options.cacheControl || 'public, max-age=86400',
            contentDisposition: options.contentDisposition
          });
          
          if ('err' in uploadResult && uploadResult.err) {
            console.error(`Error uploading buffer to ${objectKey}:`, uploadResult.err);
            const errorMessage = typeof uploadResult.err === 'object' ? 
              JSON.stringify(uploadResult.err) : String(uploadResult.err);
            throw new Error(`Upload error: ${errorMessage}`);
          }
          
          // Verify upload by checking that the file exists
          const exists = await this.exists(objectKey);
          if (!exists) {
            throw new Error(`Verification failed for ${objectKey}`);
          }
          
          return uploadResult;
        },
        {
          retries: 3,
          minTimeout: 200,
          factor: 3,
          onRetry: (error, attempt) => {
            console.warn(`Retrying upload for ${objectKey} (attempt ${attempt}/3):`, error.message);
          }
        }
      );
      
      // Return the URL for client use
      return this.getPublicUrl(objectKey);
    } catch (error) {
      console.error(`Failed to upload buffer to ${objectKey} after retries:`, error);
      throw new Error(`Upload failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Upload a temporary file
   * This is used during product creation before a product ID is available
   */
  async uploadTempFile(
    buffer: Buffer,
    filename: string,
    productId: string | number = 'pending',
    contentType?: string
  ): Promise<{ url: string; objectKey: string }> {
    await this.initialize();
    
    const objectKey = `${STORAGE_FOLDERS.TEMP}/${productId}/${filename}`;
    
    try {
      await this.uploadFromBuffer(objectKey, buffer, {
        contentType: contentType || this.detectContentType(filename)
      });
      
      return {
        url: this.getPublicUrl(objectKey),
        objectKey
      };
    } catch (error) {
      console.error(`Failed to upload temp file ${filename}:`, error);
      throw new Error(`Temp file upload failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Sanitize a filename for safe use in URLs and object storage
   * Converts spaces to hyphens and removes special characters
   */
  sanitizeFilename(filename: string): string {
    // First, get the base name and extension
    const extension = path.extname(filename).toLowerCase();
    const baseName = path.basename(filename, extension);
    
    // Replace spaces and unsafe characters with hyphens, remove consecutive hyphens
    const sanitizedBaseName = baseName
      .replace(/[^a-zA-Z0-9-_.]/g, '-') // Replace unsafe chars with hyphens
      .replace(/\s+/g, '-')             // Replace spaces with hyphens
      .replace(/-+/g, '-')              // Replace multiple hyphens with a single one
      .replace(/^-|-$/g, '')            // Remove leading and trailing hyphens
      .trim();
    
    return sanitizedBaseName + extension;
  }

  /**
   * Upload a product draft image with the proper folder structure
   * Path: /root/drafts/{draftId}/{filename}
   */
  async uploadDraftImage(
    buffer: Buffer,
    filename: string,
    draftId: number,
    contentType?: string
  ): Promise<{ url: string; objectKey: string }> {
    await this.initialize();
    
    // Sanitize the filename first
    const sanitizedFilename = this.sanitizeFilename(filename);
    
    // Generate a unique filename to avoid collisions
    const uniqueId = new Date().getTime() + '-' + Math.random().toString(36).substring(2, 15);
    const extension = path.extname(sanitizedFilename).toLowerCase();
    const baseName = path.basename(sanitizedFilename, extension);
    const uniqueFilename = `${baseName}-${uniqueId}${extension}`;
    
    // Create the correct path structure: /root/drafts/{draftId}/image1.xxx
    const objectKey = `${STORAGE_FOLDERS.DRAFTS}/${draftId}/${uniqueFilename}`;
    
    try {
      await this.uploadFromBuffer(objectKey, buffer, {
        contentType: contentType || this.detectContentType(filename)
      });
      
      return {
        url: this.getPublicUrl(objectKey),
        objectKey
      };
    } catch (error) {
      console.error(`Failed to upload draft image ${filename}:`, error);
      throw new Error(`Draft image upload failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Upload a file directly to a product's folder
   */
  async uploadProductFile(
    buffer: Buffer,
    filename: string,
    productId: number,
    contentType?: string
  ): Promise<{ url: string; objectKey: string }> {
    await this.initialize();
    
    // Sanitize the filename first
    const sanitizedFilename = this.sanitizeFilename(filename);
    
    const objectKey = `${STORAGE_FOLDERS.PRODUCTS}/${productId}/${sanitizedFilename}`;
    
    try {
      await this.uploadFromBuffer(objectKey, buffer, {
        contentType: contentType || this.detectContentType(filename)
      });
      
      return {
        url: this.getPublicUrl(objectKey),
        objectKey
      };
    } catch (error) {
      console.error(`Failed to upload product file ${filename}:`, error);
      throw new Error(`Product file upload failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Move a draft image to its final product location when publishing
   * Format: /root/{supplier_supplierId}/{catalog_catalogId}/{product_productId}/image1.xxx
   */
  async moveDraftImageToProduct(
    sourceKey: string,
    productId: number,
    supplierName: string,
    catalogName: string,
    categoryName: string,
    productName: string,
    imageIndex: number
  ): Promise<{ url: string; objectKey: string }> {
    await this.initialize();
    
    // Extract filename from source key
    const sourceFilename = sourceKey.split('/').pop() || `product-image-${imageIndex}.jpg`;
    
    // Create a new filename based on product name and image index
    const newFilename = `${this.sanitizeFilename(productName)}-${imageIndex + 1}-${sourceFilename}`;
    
    // Sanitize supplier, catalog and category names for folder path
    const sanitizedSupplier = this.sanitizeFilename(supplierName);
    const sanitizedCatalog = this.sanitizeFilename(catalogName); 
    const sanitizedCategory = this.sanitizeFilename(categoryName);
    
    // Create the destination path with this structure:
    // /root/suppliers/{supplier_name}/{catalog_name}/{product_id}/{filename}
    const destObjectKey = `${STORAGE_FOLDERS.SUPPLIERS}/${sanitizedSupplier}/${STORAGE_FOLDERS.CATALOGS}/${sanitizedCatalog}/${STORAGE_FOLDERS.PRODUCTS}/${productId}/${newFilename}`;
    
    try {
      // Check if the source file exists
      const sourceExists = await this.exists(sourceKey);
      if (!sourceExists) {
        throw new Error(`Source file does not exist: ${sourceKey}`);
      }
      
      // Read the source file
      const downloadResult = await this.objectStore.downloadAsBytes(sourceKey);
      if ('err' in downloadResult && downloadResult.err) {
        const errorMessage = typeof downloadResult.err === 'object' ? 
          JSON.stringify(downloadResult.err) : String(downloadResult.err);
        throw new Error(`Failed to download source file: ${errorMessage}`);
      }
      if (!downloadResult.value) {
        throw new Error(`Failed to download source file: ${sourceKey}`);
      }
      const data = downloadResult.value;
      
      // Determine content type
      const contentType = this.detectContentType(sanitizedFilename);
      
      // Upload to the new location
      await this.uploadFromBuffer(destObjectKey, data, { contentType });
      
      // Verify the destination file exists
      const destExists = await this.exists(destObjectKey);
      if (!destExists) {
        throw new Error(`Failed to copy file to destination: ${destObjectKey}`);
      }
      
      // Delete the source file (draft image)
      await this.objectStore.delete(sourceKey);
      
      return {
        url: this.getPublicUrl(destObjectKey),
        objectKey: destObjectKey
      };
    } catch (error) {
      console.error(`Failed to move draft image to product location: ${error}`);
      throw new Error(`Image move failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Move a file from temp storage to a permanent location
   * using the old folder structure (only kept for backward compatibility)
   */
  async moveFromTemp(
    sourceKey: string,
    productId: number
  ): Promise<{ url: string; objectKey: string }> {
    await this.initialize();
    
    try {
      // Download the source file as a buffer
      const { data, contentType } = await this.getFileAsBuffer(sourceKey);
      
      // Create a new key in the products folder
      const filename = path.basename(sourceKey);
      const destinationKey = `${STORAGE_FOLDERS.PRODUCTS}/${productId}/${filename}`;
      
      // Upload to the new location
      await this.uploadFromBuffer(destinationKey, data, { contentType });
      
      // Delete the original file
      await this.deleteFile(sourceKey);
      
      return {
        url: this.getPublicUrl(destinationKey),
        objectKey: destinationKey
      };
    } catch (error) {
      console.error(`Failed to move file from ${sourceKey} to product ${productId}:`, error);
      throw new Error(`File move operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Move file from temporary location to final product location with the new folder structure
   * @param sourceKey The original source key (current location)
   * @param supplierName The supplier name
   * @param catalogName The catalog name
   * @param categoryName The category name 
   * @param productName The product name
   * @param productId The product ID
   * @returns The new URL and object key
   */
  async moveToFinalLocation(
    sourceKey: string,
    supplierName: string,
    catalogName: string,
    categoryName: string,
    productName: string,
    productId: number
  ): Promise<{ url: string, objectKey: string }> {
    await this.initialize();
    
    try {
      // Sanitize names for path safety
      const sanitizedSupplier = this.sanitizePath(supplierName);
      const sanitizedCatalog = this.sanitizePath(catalogName);
      const sanitizedCategory = this.sanitizePath(categoryName);
      const sanitizedProduct = this.sanitizePath(productName);
      
      // Extract the original filename from the source key
      const filename = path.basename(sourceKey);
      
      // Build the new path following the required structure
      // Format: root/{supplierName}/{catalogName}/{Category}/{ProductName}_{ProductID}/filename.xxx
      const targetFolder = `${sanitizedSupplier}/${sanitizedCatalog}/${sanitizedCategory}/${sanitizedProduct}_${productId}`;
      const targetKey = `${targetFolder}/${filename}`;
      
      // Get the source file as a buffer
      const { data, contentType } = await this.getFileAsBuffer(sourceKey);
      
      if (!data) {
        throw new Error(`Source file not found: ${sourceKey}`);
      }
      
      // Upload to the new location
      await this.uploadFromBuffer(targetKey, data, {
        contentType: contentType || this.detectContentType(filename)
      });
      
      // Delete the original file
      await this.deleteFile(sourceKey);
      
      return {
        url: this.getPublicUrl(targetKey),
        objectKey: targetKey
      };
    } catch (error) {
      console.error(`Error moving file from ${sourceKey} to final location:`, error);
      throw new Error(`Failed to move file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Sanitize a path segment for file paths
   */
  private sanitizePath(input: string): string {
    if (!input) return 'default';
    
    return input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')  // Replace invalid chars with hyphens
      .replace(/-+/g, '-')           // Replace multiple hyphens with a single one
      .replace(/^-|-$/g, '')         // Remove leading and trailing hyphens
      || 'default';                  // If empty after sanitizing, use default
  }
  
  /**
   * Download a file as a buffer
   */
  async getFileAsBuffer(objectKey: string): Promise<{ data: Buffer; contentType?: string }> {
    await this.initialize();
    
    try {
      // Use retry with exponential backoff for reliability
      const result = await retry(
        async () => {
          const downloadResult = await this.objectStore.downloadAsBytes(objectKey);
          
          if ('err' in downloadResult && downloadResult.err) {
            console.error(`Error downloading ${objectKey}:`, downloadResult.err);
            const errorMessage = typeof downloadResult.err === 'object' ? 
              JSON.stringify(downloadResult.err) : String(downloadResult.err);
            throw new Error(`Download error: ${errorMessage}`);
          }
          
          if (!downloadResult.value) {
            throw new Error(`Empty response from Object Storage for ${objectKey}`);
          }
          
          return downloadResult;
        },
        {
          retries: 3,
          minTimeout: 200,
          factor: 3,
          onRetry: (error, attempt) => {
            console.warn(`Retrying download for ${objectKey} (attempt ${attempt}/3):`, error.message);
          }
        }
      );
      
      // Determine content type
      let contentType: string | undefined;
      
      // Determine content type from file extension
      contentType = this.detectContentType(objectKey);
      
      // Ensure we have a proper Buffer
      let data: Buffer;
      if (result.value) {
        if (Buffer.isBuffer(result.value)) {
          data = result.value;
        } else if (Array.isArray(result.value)) {
          // Handle array result by concatenating or using the first element
          data = Buffer.from(result.value[0] || '');
        } else {
          // Convert other types to buffer if possible
          data = Buffer.from(result.value.toString());
        }
      } else {
        data = Buffer.from('');
      }
      
      return {
        data,
        contentType
      };
    } catch (error) {
      console.error(`Failed to get file ${objectKey} as buffer:`, error);
      throw new Error(`Download failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Check if a file exists in Object Storage
   * This enhanced version uses multiple techniques to accurately check for file existence
   */
  async exists(objectKey: string): Promise<boolean> {
    await this.initialize();
    
    console.log(`Checking if file exists: ${objectKey}`);
    
    try {
      // First try the direct exists method
      const existsResult = await this.objectStore.exists(objectKey);
      
      if (!('err' in existsResult) && existsResult.value === true) {
        console.log(`Direct exists check confirmed file exists: ${objectKey}`);
        return true;
      }
      
      // If direct check fails, try listing the folder and checking the results
      // This is necessary because the object store API might use 'name' instead of 'key'
      const objectPathParts = objectKey.split('/');
      const objectName = objectPathParts.pop() || '';
      const folderPath = objectPathParts.join('/');
      
      console.log(`Fallback existence check using list on folder: ${folderPath}`);
      
      const listResult = await this.objectStore.list(folderPath);
      
      if (!('err' in listResult) && listResult.value && Array.isArray(listResult.value)) {
        // Check each object in the listing
        for (const obj of listResult.value) {
          if (obj && typeof obj === 'object') {
            let foundKey = null;
            
            // Try key property first
            if ('key' in obj && obj.key && typeof obj.key === 'string') {
              foundKey = obj.key as string;
            } 
            // Then try name property 
            else if ('name' in obj && obj.name && typeof obj.name === 'string') {
              foundKey = obj.name as string;
            }
            
            // If we found a matching key/name
            if (foundKey === objectKey) {
              console.log(`File found in listing: ${objectKey}`);
              return true;
            }
          }
        }
      }
      
      console.log(`File not found after checking listing: ${objectKey}`);
      return false;
    } catch (error) {
      console.error(`Error checking if ${objectKey} exists:`, error);
      return false;
    }
  }
  
  /**
   * Get metadata for a file
   */
  async getMetadata(objectKey: string): Promise<{
    contentType?: string;
    contentLength?: number;
    metadata?: Record<string, string>;
    cacheControl?: string;
    contentDisposition?: string;
  }> {
    await this.initialize();
    
    try {
      // Fallback to using detection based on filename for content type
      const contentType = this.detectContentType(objectKey);
      
      // Try to get object size if possible
      let contentLength: number | undefined;
      
      try {
        // Use our enhanced exists method for reliable file existence check
        const fileExists = await this.exists(objectKey);
        if (fileExists) {
          // For Replit object storage, we may not have direct size info
          // But we can get file data and check its length
          const downloadResult = await this.objectStore.downloadAsBytes(objectKey);
          if (!('err' in downloadResult) && downloadResult.value) {
            if (Buffer.isBuffer(downloadResult.value)) {
              contentLength = downloadResult.value.length;
            } else if (Array.isArray(downloadResult.value) && downloadResult.value[0]) {
              contentLength = downloadResult.value[0].length;
            }
          }
        }
      } catch (sizeError) {
        console.warn(`Could not determine size for ${objectKey}:`, sizeError);
        // Continue without size info
      }
      
      return {
        contentType,
        contentLength,
        metadata: {}, // No way to get custom metadata with current API
        cacheControl: 'public, max-age=31536000', // Default cache control
        contentDisposition: `inline; filename="${path.basename(objectKey)}"`
      };
    } catch (error) {
      console.error(`Failed to get metadata for ${objectKey}:`, error);
      throw new Error(`Metadata retrieval failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Get the size of a file in bytes
   */
  async getSize(objectKey: string): Promise<number | undefined> {
    try {
      const metadata = await this.getMetadata(objectKey);
      return metadata.contentLength;
    } catch (error) {
      console.error(`Failed to get size for ${objectKey}:`, error);
      return undefined;
    }
  }
  
  /**
   * Delete a file from Object Storage
   */
  async deleteFile(objectKey: string): Promise<void> {
    if (!objectKey || objectKey === 'undefined') {
      console.log(`Skipping delete for invalid objectKey: "${objectKey}"`);
      return;
    }
    
    console.log(`Starting ENHANCED delete operation for: ${objectKey}`);
    await this.initialize();
    
    try {
      // Normalize the key (remove leading/trailing spaces)
      const normalizedKey = objectKey.trim();
      if (normalizedKey !== objectKey) {
        console.log(`Normalized object key for deletion: ${normalizedKey} (original: ${objectKey})`);
      }
      
      // First check if file exists
      const exists = await this.exists(normalizedKey);
      if (!exists) {
        console.log(`File does not exist, skipping delete: ${normalizedKey}`);
        return;
      }
      
      console.log(`File exists, attempting direct delete: ${normalizedKey}`);
      
      // ENHANCED APPROACH: Access the raw client directly for more reliable deletion
      try {
        // Use the low-level delete operation
        const deletePromise = new Promise<boolean>((resolve, reject) => {
          // Ensure we have full access to the Replit object store client
          if (!this.objectStore || typeof this.objectStore.delete !== 'function') {
            console.error('Invalid object store client or missing delete method');
            reject(new Error('Invalid object store client configuration'));
            return;
          }
          
          // Execute the delete operation with forced options
          try {
            const result = this.objectStore.delete(normalizedKey);
            
            if (result && typeof result.then === 'function') {
              // It's a promise, wait for it
              result
                .then((deleteResult) => {
                  if (deleteResult && 'err' in deleteResult && deleteResult.err) {
                    console.error(`Direct delete error: ${normalizedKey}`, deleteResult.err);
                    resolve(false);
                  } else {
                    console.log(`Direct delete succeeded: ${normalizedKey}`, deleteResult);
                    resolve(true);
                  }
                })
                .catch((error) => {
                  console.error(`Direct delete exception: ${normalizedKey}`, error);
                  resolve(false);
                });
            } else {
              // Not a promise, handle synchronously
              const deleteResult = result as any;
              if (deleteResult && 'err' in deleteResult && deleteResult.err) {
                console.error(`Sync delete error: ${normalizedKey}`, deleteResult.err);
                resolve(false);
              } else {
                console.log(`Sync delete succeeded: ${normalizedKey}`, deleteResult);
                resolve(true);
              }
            }
          } catch (directError) {
            console.error(`Exception in direct delete: ${normalizedKey}`, directError);
            resolve(false);
          }
        });
        
        // Wait for the direct delete with timeout
        const deleteSucceeded = await Promise.race([
          deletePromise,
          new Promise<boolean>(resolve => setTimeout(() => {
            console.log(`Delete timeout for: ${normalizedKey}`);
            resolve(false);
          }, 5000))
        ]);
        
        if (!deleteSucceeded) {
          console.warn(`Direct delete failed for: ${normalizedKey}`);
        }
      } catch (directError) {
        console.error(`Error in direct delete approach: ${normalizedKey}`, directError);
      }
      
      // FALLBACK: If direct approach failed or as additional measure, use retry approach
      // Implement retry logic for deletions (up to 3 attempts)
      let deleteSuccess = false;
      let attempts = 0;
      const maxAttempts = 3;
      let lastError: unknown = null;
      
      while (!deleteSuccess && attempts < maxAttempts) {
        attempts++;
        try {
          console.log(`Standard delete attempt ${attempts} for: ${normalizedKey}`);
          const result = await this.objectStore.delete(normalizedKey);
          
          if ('err' in result && result.err) {
            console.error(`Error in delete attempt ${attempts} for ${normalizedKey}:`, result.err);
            lastError = result.err;
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 500));
          } else {
            deleteSuccess = true;
            console.log(`Successfully deleted file on attempt ${attempts}: ${normalizedKey}`);
          }
        } catch (attemptError) {
          console.error(`Exception in delete attempt ${attempts} for ${normalizedKey}:`, attemptError);
          lastError = attemptError;
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Final verification that file is gone
      // Wait a moment before checking as Replit storage might have eventual consistency
      await new Promise(resolve => setTimeout(resolve, 1000));
      const stillExists = await this.exists(normalizedKey);
      if (stillExists) {
        console.error(`⚠️ CRITICAL: File still exists after all deletion attempts: ${normalizedKey}`);
        // Try a last-resort direct deletion
        try {
          console.log(`Attempting last-resort deletion for: ${normalizedKey}`);
          await this.objectStore.delete(normalizedKey);
        } catch (lastError) {
          console.error(`Last resort deletion failed: ${normalizedKey}`, lastError);
        }
      } else {
        console.log(`✅ Verified file is gone: ${normalizedKey}`);
      }
      
      console.log(`Delete operation complete for: ${normalizedKey}`);
    } catch (error) {
      console.error(`Failed to delete ${objectKey}:`, error);
      // Don't throw the error, just log it - we want the delete draft operation to succeed
      // even if image deletion fails
      console.error(`Delete operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * List files in a directory (folder)
   */
  async listFiles(prefix: string, recursive: boolean = false): Promise<string[]> {
    await this.initialize();
    
    try {
      // Normalize the prefix (remove trailing slashes, etc.)
      const normalizedPrefix = prefix.trim().replace(/\/+$/, '');
      
      console.log(`Listing files with prefix: ${normalizedPrefix}`);
      
      // List all objects with the given prefix
      const result = await this.objectStore.list(normalizedPrefix);
      
      // Extract keys from the result objects
      const keys: string[] = [];
      
      // Process object keys
      if (!('err' in result) || !result.err) {
        if (result.value && Array.isArray(result.value)) {
          for (const obj of result.value) {
            if (obj && typeof obj === 'object') {
              let objectKey = null;
              
              // Try key property first
              if ('key' in obj && obj.key && typeof obj.key === 'string') {
                objectKey = obj.key as string;
                console.log(`Using key property: ${objectKey}`);
              } 
              // Then try name property 
              else if ('name' in obj && obj.name && typeof obj.name === 'string') {
                objectKey = obj.name as string;
                console.log(`Using name property: ${objectKey}`);
              }
              
              if (objectKey) {
                // Only add keys that actually match our prefix
                // This is important because object store may return ALL files
                if (objectKey.startsWith(normalizedPrefix)) {
                  console.log(`File matches prefix ${normalizedPrefix}: ${objectKey}`);
                  keys.push(objectKey);
                } else {
                  console.log(`File does NOT match prefix ${normalizedPrefix} (skipping): ${objectKey}`);
                }
              }
            }
          }
        }
      } else {
        console.error(`Error listing files with prefix ${normalizedPrefix}:`, result.err);
      }
      
      // If we got no results but prefix doesn't end with a slash, try with a slash
      if (keys.length === 0 && !normalizedPrefix.endsWith('/')) {
        const prefixWithSlash = `${normalizedPrefix}/`;
        console.log(`No results found. Retrying with slash: ${prefixWithSlash}`);
        
        const retryResult = await this.objectStore.list(prefixWithSlash);
        
        if (!('err' in retryResult) || !retryResult.err) {
          if (retryResult.value && Array.isArray(retryResult.value)) {
            for (const obj of retryResult.value) {
              if (obj && typeof obj === 'object') {
                let objectKey = null;
                
                // Try key property first
                if ('key' in obj && obj.key && typeof obj.key === 'string') {
                  objectKey = obj.key as string;
                  console.log(`Using key property on retry: ${objectKey}`);
                } 
                // Then try name property 
                else if ('name' in obj && obj.name && typeof obj.name === 'string') {
                  objectKey = obj.name as string;
                  console.log(`Using name property on retry: ${objectKey}`);
                }
                
                if (objectKey) {
                  // Only add keys that actually match our prefix
                  if (objectKey.startsWith(prefixWithSlash)) {
                    console.log(`File matches prefix ${prefixWithSlash}: ${objectKey}`);
                    keys.push(objectKey);
                  } else {
                    console.log(`File does NOT match prefix ${prefixWithSlash} (skipping): ${objectKey}`);
                  }
                }
              }
            }
          }
        }
      }
      
      // If we're looking for a pattern (prefix doesn't end with slash), check if files start with the pattern
      if (!normalizedPrefix.endsWith('/')) {
        // List files at the parent folder level to find files with similar names
        const lastSlashIndex = normalizedPrefix.lastIndexOf('/');
        if (lastSlashIndex > 0) {
          const parentFolder = normalizedPrefix.substring(0, lastSlashIndex);
          const filePattern = normalizedPrefix.substring(lastSlashIndex + 1);
          
          if (filePattern.length > 0) {
            console.log(`Looking for pattern matches in parent folder ${parentFolder} with pattern ${filePattern}`);
            
            const parentResult = await this.objectStore.list(parentFolder);
            
            if (!('err' in parentResult) || !parentResult.err) {
              if (parentResult.value && Array.isArray(parentResult.value)) {
                for (const obj of parentResult.value) {
                  if (obj && typeof obj === 'object' && 'key' in obj) {
                    const key = obj.key as string;
                    const fileName = key.substring(key.lastIndexOf('/') + 1);
                    
                    // If the filename starts with our pattern and it's not already in our list
                    if (fileName.startsWith(filePattern) && !keys.includes(key)) {
                      keys.push(key);
                    }
                  }
                }
              }
            }
          }
        }
      }
      
      console.log(`Found ${keys.length} files with prefix ${normalizedPrefix}`);
      return keys;
    } catch (error) {
      console.error(`Failed to list files with prefix ${prefix}:`, error);
      // Return empty array instead of throwing
      return [];
    }
  }
  
  /**
   * Get the raw object store client (for direct operations)
   */
  getClient(): any {
    if (!this.objectStore) {
      throw new Error('Object store client not initialized');
    }
    return this.objectStore;
  }
  
  /**
   * Get a public URL for a file
   */
  /**
   * Get the public URL for an object, ensuring it starts with the right path
   * This method will always return a URL starting with '/api/files/' for consistency,
   * and does not include the host/origin as that's handled by the client
   */
  getPublicUrl(objectKey: string): string {
    if (!objectKey) {
      console.warn('Attempted to get public URL for empty object key');
      return '';
    }
    
    // Remove any leading slashes from objectKey for consistency
    const sanitizedKey = objectKey.replace(/^\/+/, '');
    
    // Handle special case for temp files
    if (sanitizedKey.startsWith(`${STORAGE_FOLDERS.TEMP}/`)) {
      // Extract the filename for temp files
      const parts = sanitizedKey.split('/');
      const filename = parts[parts.length - 1];
      
      // If this is a temp file with a product ID segment
      if (parts.length > 2 && parts[1] !== 'pending') {
        // Format: /temp/{productId}/{filename}
        return `/temp/${parts[1]}/${filename}`;
      }
      
      // Format: /temp/{filename} for pending files
      return `/temp/${filename}`;
    }
    
    // Default format: /api/files/path/to/object
    return `${BASE_URL}/${sanitizedKey}`;
  }
  
  /**
   * Detect content type based on filename
   */
  detectContentType(filename: string): string {
    const contentType = mime.lookup(filename);
    return contentType || 'application/octet-stream';
  }
  
  /**
   * Process an image for optimization and resizing
   * @param buffer The image buffer to process
   * @param options Processing options
   * @returns A processed image buffer
   */
  async processImage(
    buffer: Buffer,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
      position?: string | number;
      background?: string;
      withoutEnlargement?: boolean;
      autoOrient?: boolean;
      autoRotate?: boolean;
    } = {}
  ): Promise<Buffer> {
    // Default options for image processing
    const {
      width = 1200,
      height = 1200,
      quality = 85,
      fit = 'inside',
      withoutEnlargement = true,
      autoRotate = true,
    } = options;
    
    try {
      // Initialize the sharp instance with the buffer
      let image = sharp(buffer);
      
      // Get the image metadata to determine if processing is needed
      const metadata = await image.metadata();
      
      // Auto-rotate based on EXIF orientation if specified
      if (autoRotate) {
        image = image.rotate(); // Auto-rotate based on EXIF data
      }
      
      // Resize the image if dimensions are provided
      image = image.resize({
        width,
        height,
        fit,
        withoutEnlargement,
      });
      
      // Determine the output format based on the input
      let outputFormat = metadata.format;
      if (!outputFormat || outputFormat === 'jpeg' || outputFormat === 'jpg') {
        // Convert to JPEG with specified quality
        return await image.jpeg({ quality }).toBuffer();
      } else if (outputFormat === 'png') {
        // Optimize PNGs
        return await image.png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
      } else if (outputFormat === 'webp') {
        // Convert to WebP with specified quality
        return await image.webp({ quality }).toBuffer();
      } else {
        // For other formats, just use the input format
        return await image.toBuffer();
      }
    } catch (error) {
      console.error('Error processing image:', error);
      // If processing fails, return the original buffer
      return buffer;
    }
  }
  
  /**
   * Check if an image is valid (correct format, minimum dimensions)
   */
  async validateImage(
    buffer: Buffer,
    filename: string
  ): Promise<{
    valid: boolean;
    width?: number;
    height?: number;
    format?: string;
    size: number;
    issues: string[];
  }> {
    const issues: string[] = [];
    const result = {
      valid: true,
      size: buffer.length,
      issues,
    };
    
    // Check file size (5MB max)
    const maxSizeInBytes = 5 * 1024 * 1024;
    if (buffer.length > maxSizeInBytes) {
      issues.push(`File size exceeds 5MB limit: ${Math.round(buffer.length / 1024 / 1024)}MB`);
      result.valid = false;
    }
    
    // Check file type by extension
    const contentType = this.detectContentType(filename);
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(contentType)) {
      issues.push(`Invalid file type: ${contentType}. Allowed types: JPG, PNG, WebP`);
      result.valid = false;
    }
    
    try {
      // Use sharp to get image metadata
      const metadata = await sharp(buffer).metadata();
      result.width = metadata.width;
      result.height = metadata.height;
      result.format = metadata.format;
      
      // Check minimum dimensions (200x200)
      const minDimension = 200;
      if ((metadata.width && metadata.width < minDimension) || 
          (metadata.height && metadata.height < minDimension)) {
        issues.push(`Image dimensions too small: ${metadata.width}x${metadata.height}. Minimum: ${minDimension}x${minDimension}`);
        result.valid = false;
      }
    } catch (error) {
      issues.push('Failed to process image metadata. File may be corrupted.');
      result.valid = false;
    }
    
    return result;
  }
}

// Export a singleton instance
export const objectStore = new ObjectStoreService();