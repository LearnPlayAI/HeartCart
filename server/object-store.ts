import { Client } from '@replit/object-storage';
import { Readable } from 'stream';
import path from 'path';
import mime from 'mime-types';
import retry from 'async-retry';

// Standard folders for organizing files
export const STORAGE_FOLDERS = {
  PRODUCTS: 'products',
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
      // Try to list objects with limit 1 to see if we have access
      const result = await this.objectStore.list({ limit: 1 });
      
      if (result.err) {
        throw new Error(`Object Store access error: ${result.err.message}`);
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
          const uploadResult = await this.objectStore.put(objectKey, buffer, {
            contentType: options.contentType || this.detectContentType(objectKey),
            metadata: options.metadata || {},
            cacheControl: options.cacheControl || 'public, max-age=86400',
            contentDisposition: options.contentDisposition
          });
          
          if (uploadResult.err) {
            console.error(`Error uploading buffer to ${objectKey}:`, uploadResult.err);
            throw new Error(uploadResult.err.message);
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
   * Upload a file directly to a product's folder
   */
  async uploadProductFile(
    buffer: Buffer,
    filename: string,
    productId: number,
    contentType?: string
  ): Promise<{ url: string; objectKey: string }> {
    await this.initialize();
    
    const objectKey = `${STORAGE_FOLDERS.PRODUCTS}/${productId}/${filename}`;
    
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
   * Move a file from temp storage to a permanent location
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
   * Download a file as a buffer
   */
  async getFileAsBuffer(objectKey: string): Promise<{ data: Buffer; contentType?: string }> {
    await this.initialize();
    
    try {
      // Use retry with exponential backoff for reliability
      const result = await retry(
        async () => {
          const downloadResult = await this.objectStore.get(objectKey);
          
          if (downloadResult.err) {
            console.error(`Error downloading ${objectKey}:`, downloadResult.err);
            throw new Error(downloadResult.err.message);
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
      
      try {
        const headResult = await this.objectStore.head(objectKey);
        if (!headResult.err && headResult.value) {
          contentType = headResult.value.contentType;
        }
      } catch (headError) {
        console.warn(`Could not retrieve metadata for ${objectKey}:`, headError);
        // Fall back to detection based on filename
        contentType = this.detectContentType(objectKey);
      }
      
      return {
        data: result.value as Buffer,
        contentType
      };
    } catch (error) {
      console.error(`Failed to get file ${objectKey} as buffer:`, error);
      throw new Error(`Download failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Check if a file exists in Object Storage
   */
  async exists(objectKey: string): Promise<boolean> {
    await this.initialize();
    
    try {
      const existsResult = await this.objectStore.head(objectKey);
      
      if (existsResult.err) {
        if (existsResult.err.code === 'NoSuchKey') {
          return false;
        }
        console.error(`Error checking existence of ${objectKey}:`, existsResult.err);
        throw new Error(existsResult.err.message);
      }
      
      return true;
    } catch (error) {
      // Handle the case where the error means the file doesn't exist
      if (error instanceof Error && error.message.includes('NoSuchKey')) {
        return false;
      }
      
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
      const result = await this.objectStore.head(objectKey);
      
      if (result.err) {
        console.error(`Error getting metadata for ${objectKey}:`, result.err);
        throw new Error(`Failed to get metadata: ${result.err.message}`);
      }
      
      const metadata = result.value;
      
      return {
        contentType: metadata?.contentType,
        contentLength: metadata?.contentLength,
        metadata: metadata?.metadata || {},
        cacheControl: metadata?.cacheControl,
        contentDisposition: metadata?.contentDisposition
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
    await this.initialize();
    
    try {
      const result = await this.objectStore.delete(objectKey);
      
      if (result.err) {
        console.error(`Error deleting ${objectKey}:`, result.err);
        throw new Error(`Failed to delete file: ${result.err.message}`);
      }
    } catch (error) {
      console.error(`Failed to delete ${objectKey}:`, error);
      throw new Error(`Delete operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * List files in a directory (folder)
   */
  async listFiles(prefix: string, recursive: boolean = false): Promise<string[]> {
    await this.initialize();
    
    try {
      const options: any = { 
        prefix,
        delimiter: recursive ? undefined : '/' // Use delimiter for non-recursive listing
      };
      
      const result = await this.objectStore.list(options);
      
      if (result.err) {
        console.error(`Error listing files with prefix ${prefix}:`, result.err);
        throw new Error(`Failed to list files: ${result.err.message}`);
      }
      
      // Extract keys from the result
      const keys = result.value?.map(obj => obj.key) || [];
      
      // If using delimiter, also include common prefixes (folders)
      if (!recursive && result.commonPrefixes) {
        return [...keys, ...result.commonPrefixes];
      }
      
      return keys;
    } catch (error) {
      console.error(`Failed to list files with prefix ${prefix}:`, error);
      throw new Error(`List operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Get a public URL for a file
   */
  getPublicUrl(objectKey: string): string {
    return `${BASE_URL}/${objectKey}`;
  }
  
  /**
   * Detect content type based on filename
   */
  detectContentType(filename: string): string {
    const contentType = mime.lookup(filename);
    return contentType || 'application/octet-stream';
  }
}

// Export a singleton instance
export const objectStore = new ObjectStoreService();