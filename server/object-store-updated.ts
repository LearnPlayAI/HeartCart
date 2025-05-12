/**
 * Enhanced ObjectStore Service
 * 
 * This module provides a comprehensive, production-ready service for file operations 
 * using Replit's ObjectStorage. It includes improved error handling, retries, 
 * and a consistent API for file operations.
 */

import { Client } from '@replit/object-storage';
import { Readable } from 'stream';
import path from 'path';
import mime from 'mime-types';
import retry from 'async-retry';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

// Root directories for organizing storage
export const ROOT_DIRS = {
  PUBLIC: 'public',
  PRIVATE: 'private'
};

// Standard folders for organizing files
export const STORAGE_FOLDERS = {
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  SUPPLIERS: 'suppliers',
  CATALOGS: 'catalogs',
  TEMP: 'temp',
  PENDING: 'pending',
  THUMBNAILS: 'thumbnails',
  OPTIMIZED: 'optimized'
};

// Define the interface for the replit ObjectStore upload options
interface UploadOptions {
  metadata?: Record<string, string>;
  cacheControl?: string;
  contentDisposition?: string;
  contentType?: string;
}

// File operation options
interface FileOperationOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  cacheControl?: string;
  contentDisposition?: string;
  maxAge?: number;
}

// Image processing options
interface ImageProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  background?: string;
  withoutEnlargement?: boolean;
  autoRotate?: boolean;
}

// Result of a successful file operation
interface FileOperationResult {
  objectKey: string;
  url: string;
  size?: number;
  contentType?: string;
  metadata?: Record<string, string>;
}

// Standard base URL for serving files
const API_FILES_BASE = '/api/files';

class ObjectStoreService {
  private objectStore: Client;
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;
  
  constructor() {
    // Initialize the Replit ObjectStore client
    this.objectStore = new Client();
    this.initialize();
  }
  
  /**
   * Initialize the Object Store service
   * Ensures the service is properly set up before use
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
        // Verify access to the ObjectStore
        await this.verifyAccess();
        
        // Ensure our root directories exist
        await this.ensureRootDirectories();
        
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
   * Ensure root directories exist in the storage
   */
  private async ensureRootDirectories(): Promise<void> {
    try {
      // Create public and private root directories if they don't exist
      await this.ensureDirectoryExists(ROOT_DIRS.PUBLIC);
      await this.ensureDirectoryExists(ROOT_DIRS.PRIVATE);
      
      // Create standard subdirectories under public
      await this.ensureDirectoryExists(`${ROOT_DIRS.PUBLIC}/${STORAGE_FOLDERS.PRODUCTS}`);
      await this.ensureDirectoryExists(`${ROOT_DIRS.PUBLIC}/${STORAGE_FOLDERS.CATEGORIES}`);
      await this.ensureDirectoryExists(`${ROOT_DIRS.PUBLIC}/${STORAGE_FOLDERS.SUPPLIERS}`);
      await this.ensureDirectoryExists(`${ROOT_DIRS.PUBLIC}/${STORAGE_FOLDERS.CATALOGS}`);
      await this.ensureDirectoryExists(`${ROOT_DIRS.PUBLIC}/${STORAGE_FOLDERS.TEMP}`);
      await this.ensureDirectoryExists(`${ROOT_DIRS.PUBLIC}/${STORAGE_FOLDERS.TEMP}/${STORAGE_FOLDERS.PENDING}`);
      
      console.log('Root directories initialized');
    } catch (error) {
      console.error('Error creating root directories:', error);
      throw error;
    }
  }
  
  /**
   * Ensure a directory exists in the object store
   * Note: This is a pseudo-operation as object stores don't have directories
   * We create an empty marker object to simulate directory creation
   */
  async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      const normalized = dirPath.endsWith('/') ? dirPath : `${dirPath}/`;
      const markerExists = await this.exists(`${normalized}.dir`);
      
      if (!markerExists) {
        // Create an empty file as a directory marker
        await this.objectStore.uploadFromBytes(`${normalized}.dir`, Buffer.from(''), {
          contentType: 'application/octet-stream'
        });
      }
    } catch (error) {
      console.error(`Error ensuring directory exists: ${dirPath}`, error);
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(`Unknown error ensuring directory exists: ${dirPath}`);
      }
    }
  }
  
  /**
   * Verify access to the ObjectStore
   */
  private async verifyAccess(): Promise<void> {
    try {
      const result = await this.objectStore.list("", { limit: 1 });
      
      if ('err' in result && result.err) {
        const errorMessage = typeof result.err === 'object' ? 
          JSON.stringify(result.err) : String(result.err);
        throw new Error(`Object Store access error: ${errorMessage}`);
      }
      
      console.log('Object Store access verified successfully');
    } catch (error) {
      console.error('Object Store access verification failed:', error);
      throw error;
    }
  }
  
  /**
   * Upload a buffer to the ObjectStore
   */
  async uploadBuffer(
    buffer: Buffer, 
    filename: string,
    options: FileOperationOptions = {}
  ): Promise<FileOperationResult> {
    await this.initialize();
    
    // Generate a unique object key if not provided
    const objectKey = this.generateUniqueKey(filename);
    
    try {
      // Upload with retry for reliability
      await retry(
        async () => {
          const result = await this.objectStore.uploadFromBytes(objectKey, buffer, {
            contentType: options.contentType || this.detectContentType(filename),
            metadata: options.metadata || {},
            cacheControl: options.cacheControl || `public, max-age=${options.maxAge || 86400}`,
            contentDisposition: options.contentDisposition
          });
          
          if ('err' in result && result.err) {
            const errorMessage = typeof result.err === 'object' ? 
              JSON.stringify(result.err) : String(result.err);
            throw new Error(`Upload error: ${errorMessage}`);
          }
          
          return result;
        },
        {
          retries: 3,
          minTimeout: 200,
          factor: 2,
          onRetry: (error, attempt) => {
            console.warn(`Retrying upload for ${objectKey} (attempt ${attempt}/3):`, error.message);
          }
        }
      );
      
      return {
        objectKey,
        url: this.getPublicUrl(objectKey),
        size: buffer.length,
        contentType: options.contentType || this.detectContentType(filename),
        metadata: options.metadata
      };
    } catch (error) {
      console.error(`Failed to upload buffer to ${objectKey}:`, error);
      throw new Error(`Upload failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Upload a file to a temporary location
   * Used for files that will be moved to a permanent location later
   */
  async uploadTempFile(
    buffer: Buffer,
    filename: string,
    identifier: string = 'pending',
    options: FileOperationOptions = {}
  ): Promise<FileOperationResult> {
    await this.initialize();
    
    // Create a unique filename with timestamp prefix
    const uniqueFilename = this.generateUniqueFilename(filename);
    
    // Generate the object key in the temp directory
    const objectKey = `${ROOT_DIRS.PUBLIC}/${STORAGE_FOLDERS.TEMP}/${identifier}/${uniqueFilename}`;
    
    try {
      // First ensure the temp directory exists
      await this.ensureDirectoryExists(`${ROOT_DIRS.PUBLIC}/${STORAGE_FOLDERS.TEMP}/${identifier}`);
      
      // Upload the file
      const uploadResult = await this.objectStore.uploadFromBytes(objectKey, buffer, {
        contentType: options.contentType || this.detectContentType(filename),
        metadata: options.metadata || {},
        cacheControl: 'private, max-age=3600', // 1 hour cache for temp files
        contentDisposition: options.contentDisposition
      });
      
      if ('err' in uploadResult && uploadResult.err) {
        const errorMessage = typeof uploadResult.err === 'object' ?
          JSON.stringify(uploadResult.err) : String(uploadResult.err);
        throw new Error(`Temp file upload error: ${errorMessage}`);
      }
      
      return {
        objectKey,
        url: this.getPublicUrl(objectKey),
        size: buffer.length,
        contentType: options.contentType || this.detectContentType(filename),
        metadata: options.metadata
      };
    } catch (error) {
      console.error(`Failed to upload temp file ${filename}:`, error);
      throw new Error(`Temp file upload failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Upload a product image to a permanent location
   */
  async uploadProductImage(
    buffer: Buffer,
    filename: string,
    productId: number | string,
    options: FileOperationOptions = {}
  ): Promise<FileOperationResult> {
    await this.initialize();
    
    // Create a unique filename to prevent collisions
    const uniqueFilename = this.generateUniqueFilename(filename);
    
    // Generate the object key in the products directory
    const objectKey = `${ROOT_DIRS.PUBLIC}/${STORAGE_FOLDERS.PRODUCTS}/${productId}/${uniqueFilename}`;
    
    try {
      // First ensure the product directory exists
      await this.ensureDirectoryExists(`${ROOT_DIRS.PUBLIC}/${STORAGE_FOLDERS.PRODUCTS}/${productId}`);
      
      // Upload the file
      const uploadResult = await this.objectStore.uploadFromBytes(objectKey, buffer, {
        contentType: options.contentType || this.detectContentType(filename),
        metadata: options.metadata || {},
        cacheControl: 'public, max-age=31536000', // 1 year cache
        contentDisposition: options.contentDisposition
      });
      
      if ('err' in uploadResult && uploadResult.err) {
        const errorMessage = typeof uploadResult.err === 'object' ?
          JSON.stringify(uploadResult.err) : String(uploadResult.err);
        throw new Error(`Product image upload error: ${errorMessage}`);
      }
      
      return {
        objectKey,
        url: this.getPublicUrl(objectKey),
        size: buffer.length,
        contentType: options.contentType || this.detectContentType(filename),
        metadata: options.metadata
      };
    } catch (error) {
      console.error(`Failed to upload product image ${filename}:`, error);
      throw new Error(`Product image upload failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Process and optimize an image before storage
   */
  async processImage(
    buffer: Buffer,
    options: ImageProcessingOptions = {}
  ): Promise<Buffer> {
    try {
      let sharpInstance = sharp(buffer);
      
      // Apply auto-rotation by default to fix orientation issues
      if (options.autoRotate !== false) {
        sharpInstance = sharpInstance.rotate();
      }
      
      // Resize if dimensions are provided
      if (options.width || options.height) {
        sharpInstance = sharpInstance.resize({
          width: options.width,
          height: options.height,
          fit: options.fit || 'inside',
          background: options.background || { r: 255, g: 255, b: 255, alpha: 1 },
          withoutEnlargement: options.withoutEnlargement !== false
        });
      }
      
      // Convert to specified format or optimize existing
      if (options.format === 'jpeg') {
        return await sharpInstance.jpeg({ quality: options.quality || 85 }).toBuffer();
      } else if (options.format === 'png') {
        return await sharpInstance.png().toBuffer();
      } else if (options.format === 'webp') {
        return await sharpInstance.webp({ quality: options.quality || 85 }).toBuffer();
      }
      
      // If no format specified, use input format
      return await sharpInstance.toBuffer();
    } catch (error) {
      console.error('Error processing image:', error);
      throw new Error(`Image processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Upload and process an image in one operation
   */
  async uploadProcessedImage(
    buffer: Buffer,
    filename: string,
    destination: string,
    imageOptions: ImageProcessingOptions = {},
    fileOptions: FileOperationOptions = {}
  ): Promise<FileOperationResult> {
    try {
      // Process the image
      const processedBuffer = await this.processImage(buffer, imageOptions);
      
      // Add processing information to metadata
      const metadata = {
        ...fileOptions.metadata,
        processed: 'true',
        processingOptions: JSON.stringify({
          width: imageOptions.width,
          height: imageOptions.height,
          quality: imageOptions.quality,
          format: imageOptions.format
        })
      };
      
      // Determine content type based on format option
      let contentType = fileOptions.contentType || this.detectContentType(filename);
      if (imageOptions.format === 'jpeg') {
        contentType = 'image/jpeg';
      } else if (imageOptions.format === 'png') {
        contentType = 'image/png';
      } else if (imageOptions.format === 'webp') {
        contentType = 'image/webp';
      }
      
      // Upload the processed image
      return await this.uploadBuffer(processedBuffer, filename, {
        ...fileOptions,
        contentType,
        metadata
      });
    } catch (error) {
      console.error('Error processing and uploading image:', error);
      throw new Error(`Image processing and upload failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Move a file from source to destination
   * This copies the file and then deletes the original
   */
  async moveFile(
    sourceKey: string,
    destinationKey: string
  ): Promise<FileOperationResult> {
    await this.initialize();
    
    try {
      // Get the source file
      const { data, contentType } = await this.getFileAsBuffer(sourceKey);
      
      // Upload to destination
      await this.objectStore.uploadFromBytes(destinationKey, data, {
        contentType
      });
      
      // Delete the source file
      await this.deleteFile(sourceKey);
      
      return {
        objectKey: destinationKey,
        url: this.getPublicUrl(destinationKey),
        size: data.length,
        contentType
      };
    } catch (error) {
      console.error(`Failed to move file from ${sourceKey} to ${destinationKey}:`, error);
      throw new Error(`File move operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Move files from temporary storage to permanent location
   */
  async moveFromTemp(
    sourceKey: string,
    productId: number | string
  ): Promise<FileOperationResult> {
    // Extract filename from source key
    const filename = path.basename(sourceKey);
    
    // Create destination key in products folder
    const destinationKey = `${ROOT_DIRS.PUBLIC}/${STORAGE_FOLDERS.PRODUCTS}/${productId}/${filename}`;
    
    // Ensure the destination directory exists
    await this.ensureDirectoryExists(`${ROOT_DIRS.PUBLIC}/${STORAGE_FOLDERS.PRODUCTS}/${productId}`);
    
    // Move the file
    return await this.moveFile(sourceKey, destinationKey);
  }
  
  /**
   * Get a file as a buffer
   */
  async getFileAsBuffer(objectKey: string): Promise<{ data: Buffer; contentType?: string }> {
    await this.initialize();
    
    try {
      // Use retry for reliability
      const result = await retry(
        async () => {
          const downloadResult = await this.objectStore.downloadAsBytes(objectKey);
          
          if ('err' in downloadResult && downloadResult.err) {
            const errorMessage = typeof downloadResult.err === 'object' ?
              JSON.stringify(downloadResult.err) : String(downloadResult.err);
            throw new Error(`Download error: ${errorMessage}`);
          }
          
          return downloadResult;
        },
        {
          retries: 3,
          minTimeout: 200,
          factor: 2
        }
      );
      
      // Handle the result to ensure we get a Buffer
      let data: Buffer;
      if (result.value) {
        if (Buffer.isBuffer(result.value)) {
          data = result.value;
        } else if (Array.isArray(result.value) && result.value.length > 0) {
          data = Buffer.from(result.value[0]);
        } else {
          data = Buffer.from(result.value.toString());
        }
      } else {
        throw new Error(`Empty response retrieving ${objectKey}`);
      }
      
      // Determine content type from file extension
      const contentType = this.detectContentType(objectKey);
      
      return { data, contentType };
    } catch (error) {
      console.error(`Failed to get file ${objectKey}:`, error);
      throw new Error(`File retrieval failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Check if a file exists in the ObjectStore
   */
  async exists(objectKey: string): Promise<boolean> {
    await this.initialize();
    
    try {
      const result = await this.objectStore.exists(objectKey);
      
      if ('err' in result) {
        console.error(`Error checking existence of ${objectKey}:`, result.err);
        return false;
      }
      
      return result.value;
    } catch (error) {
      console.error(`Error checking if ${objectKey} exists:`, error);
      return false;
    }
  }
  
  /**
   * Delete a file from the ObjectStore
   */
  async deleteFile(objectKey: string): Promise<boolean> {
    await this.initialize();
    
    try {
      // First check if the file exists
      const exists = await this.exists(objectKey);
      if (!exists) {
        console.warn(`File ${objectKey} does not exist, nothing to delete`);
        return true; // Consider it a success since the file is already gone
      }
      
      // Delete the file
      const result = await this.objectStore.delete(objectKey);
      
      if ('err' in result && result.err) {
        const errorMessage = typeof result.err === 'object' ?
          JSON.stringify(result.err) : String(result.err);
        throw new Error(`Delete error: ${errorMessage}`);
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to delete ${objectKey}:`, error);
      throw new Error(`File deletion failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Delete multiple files at once
   */
  async deleteFiles(objectKeys: string[]): Promise<{ deleted: string[]; failed: string[] }> {
    await this.initialize();
    
    const deleted: string[] = [];
    const failed: string[] = [];
    
    // Delete each file individually
    for (const objectKey of objectKeys) {
      try {
        const success = await this.deleteFile(objectKey);
        if (success) {
          deleted.push(objectKey);
        } else {
          failed.push(objectKey);
        }
      } catch (error) {
        failed.push(objectKey);
        console.error(`Failed to delete ${objectKey}:`, error);
      }
    }
    
    return { deleted, failed };
  }
  
  /**
   * List files in a directory
   */
  async listFiles(prefix: string = '', recursive: boolean = false): Promise<string[]> {
    await this.initialize();
    
    try {
      // Create options for Replit ObjectStore list method
      const options = {};
      
      // Call the list method with the given prefix
      const result = await this.objectStore.list(prefix);
      
      if ('err' in result && result.err) {
        const errorMessage = typeof result.err === 'object' ?
          JSON.stringify(result.err) : String(result.err);
        throw new Error(`List error: ${errorMessage}`);
      }
      
      // Extract keys from result
      const keys: string[] = [];
      
      if (result.value && Array.isArray(result.value)) {
        for (const obj of result.value) {
          if (obj && typeof obj === 'object' && 'key' in obj) {
            const key = String(obj.key);
            // Skip directory marker files
            if (key.endsWith('.dir')) {
              continue;
            }
            keys.push(key);
          }
        }
      }
      
      return keys;
    } catch (error) {
      console.error(`Failed to list files with prefix ${prefix}:`, error);
      throw new Error(`List operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Generate a public URL for a file
   */
  getPublicUrl(objectKey: string): string {
    return `${API_FILES_BASE}/${objectKey}`;
  }
  
  /**
   * Generate a unique filename with timestamp to prevent collisions
   */
  generateUniqueFilename(originalFilename: string): string {
    const timestamp = Date.now();
    const randomPart = Math.floor(Math.random() * 1000000);
    const ext = path.extname(originalFilename);
    const baseName = path.basename(originalFilename, ext)
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .substring(0, 20); // Limit base name length
    
    return `${timestamp}-${randomPart}-${baseName}${ext}`;
  }
  
  /**
   * Generate a unique object key
   */
  generateUniqueKey(filename: string): string {
    const uuid = randomUUID();
    const ext = path.extname(filename);
    return `${uuid}${ext}`;
  }
  
  /**
   * Detect content type based on file extension
   */
  detectContentType(filename: string): string {
    const contentType = mime.lookup(filename);
    return contentType || 'application/octet-stream';
  }
}

// Export a singleton instance
export const objectStore = new ObjectStoreService();