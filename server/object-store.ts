import { Readable } from 'stream';
import { randomUUID } from 'crypto';
import path from 'path';
import { Client } from "@replit/object-storage";
import mime from 'mime-types';

/**
 * File structure constants - hierarchical organization for better management
 */
export const STORAGE_FOLDERS = {
  PRODUCTS: 'products', // Product images
  CATEGORIES: 'categories', // Category images
  SUPPLIERS: 'suppliers', // Supplier logos and images
  USERS: 'users', // User profile pictures
  TEMP: 'temp', // Temporary uploads before final placement
  BANNERS: 'banners', // Homepage banners
  FEATURED: 'featured', // Featured product highlights
  AI_GENERATED: 'ai-generated', // AI generated images
};

/**
 * File metadata interface
 */
export interface FileMetadata {
  contentType?: string;
  contentDisposition?: string;
  cacheControl?: string;
  filename?: string;
  size?: number;
  lastModified?: Date;
  etag?: string;
}

/**
 * A clean implementation of ObjectStore service for TeeMeYou
 * Using buffer-based approach for maximum reliability on Replit
 */
export class ObjectStore {
  private client: Client;
  private initialized: boolean = false;

  constructor() {
    // Initialize Replit Object Store client
    this.client = new Client();
  }

  /**
   * Ensure the object store is initialized before any operation
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    console.log('Initializing Replit Object Storage...');

    try {
      // Create root directories
      for (const folder of Object.values(STORAGE_FOLDERS)) {
        await this.ensureDirectoryExists(folder);
      }

      // Verify access by storing and retrieving a small test file
      const testKey = `_test/${randomUUID()}`;
      const testData = Buffer.from('ObjectStore Initialization Test');

      // Upload test
      const uploadResult = await this.client.uploadFromBytes(testKey, testData);
      if ('err' in uploadResult) {
        throw new Error(`Test upload failed: ${uploadResult.err.message}`);
      }

      // Download test
      const downloadResult = await this.client.downloadAsBytes(testKey);
      if ('err' in downloadResult) {
        throw new Error(`Test download failed: ${downloadResult.err.message}`);
      }

      // Cleanup test
      await this.client.delete(testKey);
      
      this.initialized = true;
      console.log('Replit Object Storage initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Replit Object Storage:', error);
      throw error;
    }
  }

  /**
   * Create a directory (folder) in object storage
   * In object storage, directories are virtual concepts
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      // Normalize the path (remove trailing slash)
      const normalizedPath = dirPath.endsWith('/') 
        ? dirPath.slice(0, -1) 
        : dirPath;
      
      // Check if directory marker exists
      const markerPath = `${normalizedPath}/.keep`;
      const existsResult = await this.client.exists(markerPath);
      
      if (!('err' in existsResult) && !existsResult.value) {
        // Create a marker file to represent the directory
        const uploadResult = await this.client.uploadFromText(markerPath, '');
        if ('err' in uploadResult) {
          throw new Error(`Failed to create directory marker: ${uploadResult.err.message}`);
        }
        console.log(`Created directory: ${normalizedPath}`);
      }
    } catch (error) {
      console.error(`Error creating directory ${dirPath}:`, error);
      throw error;
    }
  }

  /**
   * Generate a unique filename with timestamp
   */
  generateUniqueFilename(originalFilename: string): string {
    const timestamp = Date.now();
    const ext = path.extname(originalFilename);
    const baseName = path.basename(originalFilename, ext);
    const uniqueId = randomUUID().slice(0, 8);
    
    return `${baseName}_${timestamp}_${uniqueId}${ext}`;
  }

  /**
   * Build a complete object key from parts
   */
  buildObjectKey(folder: string, id: number | string, subFolder?: string, filename?: string): string {
    let objectKey = folder;
    
    // Add ID
    objectKey += `/${id}`;
    
    // Add subfolder if provided
    if (subFolder) {
      objectKey += `/${subFolder}`;
    }
    
    // Add filename if provided
    if (filename) {
      objectKey += `/${filename}`;
    }
    
    return objectKey;
  }

  /**
   * Detect content type based on filename
   */
  detectContentType(filename: string, providedContentType?: string): string {
    // If content type is provided, use it
    if (providedContentType) {
      return providedContentType;
    }
    
    // Otherwise, detect from filename
    const detectedType = mime.lookup(filename);
    if (detectedType) {
      return detectedType;
    }
    
    // Default fallback
    return 'application/octet-stream';
  }

  /**
   * Upload a buffer to the object store
   */
  async uploadBuffer(objectKey: string, buffer: Buffer, metadata?: FileMetadata): Promise<string> {
    // Ensure store is initialized
    await this.ensureInitialized();
    
    // Validate buffer
    if (!Buffer.isBuffer(buffer)) {
      throw new Error(`Invalid buffer type: ${typeof buffer}`);
    }
    
    if (buffer.length === 0) {
      throw new Error(`Empty buffer for ${objectKey}`);
    }
    
    console.log(`Uploading buffer for ${objectKey}: ${buffer.length} bytes, type: ${metadata?.contentType || 'not specified'}`);
    
    // Retry logic
    const MAX_RETRIES = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`Uploading file to ${objectKey} (attempt ${attempt}/${MAX_RETRIES})`);
        
        // Store metadata in a separate file
        const metadataKey = `${objectKey}.metadata`;
        const metadataContent = JSON.stringify({
          contentType: metadata?.contentType || this.detectContentType(objectKey),
          cacheControl: metadata?.cacheControl || 'public, max-age=86400',
          contentDisposition: metadata?.contentDisposition,
          originalFileName: metadata?.filename,
          size: buffer.length,
          lastModified: new Date().toISOString()
        });
        
        // Upload metadata
        const metadataResult = await this.client.uploadFromText(metadataKey, metadataContent);
        if ('err' in metadataResult) {
          console.warn(`Failed to upload metadata for ${objectKey}:`, metadataResult.err);
        }
        
        // Upload the actual file
        const uploadResult = await this.client.uploadFromBytes(objectKey, buffer, {
          compress: true
        });
        
        if ('err' in uploadResult) {
          throw new Error(`Upload failed: ${uploadResult.err.message}`);
        }
        
        // Verify the file exists
        await new Promise(resolve => setTimeout(resolve, 300));
        const existsResult = await this.client.exists(objectKey);
        
        if ('err' in existsResult || !existsResult.value) {
          throw new Error('File not found after upload');
        }
        
        console.log(`Successfully uploaded file: ${objectKey}`);
        return this.getPublicUrl(objectKey);
      } catch (error) {
        lastError = error as Error;
        console.error(`Error uploading to ${objectKey} (attempt ${attempt}):`, error);
        
        if (attempt < MAX_RETRIES) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 300;
          console.log(`Retrying upload after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`Failed to upload file after ${MAX_RETRIES} attempts: ${lastError?.message}`);
  }
  
  /**
   * Upload a file from base64 data
   */
  async uploadFromBase64(objectKey: string, base64Data: string, metadata?: FileMetadata): Promise<string> {
    try {
      // Parse base64 data
      const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        throw new Error('Invalid base64 image format');
      }
      
      const contentType = matches[1];
      const data = matches[2];
      const buffer = Buffer.from(data, 'base64');
      
      return this.uploadBuffer(objectKey, buffer, {
        ...metadata,
        contentType
      });
    } catch (error) {
      console.error(`Error uploading base64 data:`, error);
      throw error;
    }
  }

  /**
   * Get a file as a buffer
   */
  async getFileAsBuffer(objectKey: string): Promise<{ data: Buffer, contentType: string }> {
    // Ensure store is initialized
    await this.ensureInitialized();
    
    // Retry logic
    const MAX_RETRIES = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`Getting file as buffer: ${objectKey} (attempt ${attempt}/${MAX_RETRIES})`);
        
        // Check if the file exists
        const existsResult = await this.client.exists(objectKey);
        if ('err' in existsResult) {
          throw new Error(`Error checking if file exists: ${existsResult.err.message}`);
        }
        
        if (!existsResult.value) {
          throw new Error(`File does not exist: ${objectKey}`);
        }
        
        // Get the file directly as a buffer
        const result = await this.client.downloadAsBytes(objectKey);
        if ('err' in result) {
          throw new Error(`Failed to get file as buffer: ${result.err.message}`);
        }
        
        // Convert value to buffer if needed
        let buffer: Buffer;
        if (Buffer.isBuffer(result.value)) {
          buffer = result.value;
        } else if (result.value instanceof Uint8Array) {
          buffer = Buffer.from(result.value);
        } else {
          throw new Error(`Unexpected return type: ${typeof result.value}`);
        }
        
        console.log(`Downloaded file: ${objectKey}, size: ${buffer.length} bytes`);
        
        // Get content type from metadata or deduce from filename
        let contentType = 'application/octet-stream';
        
        try {
          const metadataKey = `${objectKey}.metadata`;
          const metadataResult = await this.client.downloadAsText(metadataKey);
          
          if (!('err' in metadataResult)) {
            const metadata = JSON.parse(metadataResult.value);
            contentType = metadata.contentType || this.detectContentType(objectKey);
          } else {
            contentType = this.detectContentType(objectKey);
          }
        } catch (error) {
          // If metadata doesn't exist, use extension
          contentType = this.detectContentType(objectKey);
        }
        
        return { data: buffer, contentType };
      } catch (error) {
        lastError = error as Error;
        console.error(`Error getting file ${objectKey} (attempt ${attempt}):`, error);
        
        if (attempt < MAX_RETRIES) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 300;
          console.log(`Retrying get after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`Failed to get file after ${MAX_RETRIES} attempts: ${lastError?.message}`);
  }
  
  /**
   * Download file as buffer (public convenience method)
   */
  async downloadAsBuffer(objectKey: string): Promise<Buffer> {
    const { data } = await this.getFileAsBuffer(objectKey);
    return data;
  }
  
  /**
   * Create a readable stream from a buffer (safer than direct streaming)
   */
  async downloadAsStream(objectKey: string): Promise<Readable> {
    const { data } = await this.getFileAsBuffer(objectKey);
    return Readable.from(data);
  }
  
  /**
   * Check if a file exists
   */
  async exists(objectKey: string): Promise<boolean> {
    try {
      await this.ensureInitialized();
      
      const result = await this.client.exists(objectKey);
      if ('err' in result) {
        throw new Error(`Error checking if file exists: ${result.err.message}`);
      }
      
      return result.value;
    } catch (error) {
      console.error(`Error checking if file exists: ${objectKey}`, error);
      return false;
    }
  }
  
  /**
   * Delete a file
   */
  async deleteFile(objectKey: string): Promise<void> {
    try {
      await this.ensureInitialized();
      
      // Delete metadata file if it exists
      const metadataKey = `${objectKey}.metadata`;
      if (await this.exists(metadataKey)) {
        await this.client.delete(metadataKey);
      }
      
      // Delete main file
      const result = await this.client.delete(objectKey);
      if ('err' in result) {
        throw new Error(`Failed to delete file: ${result.err.message}`);
      }
      
      console.log(`Successfully deleted file: ${objectKey}`);
    } catch (error) {
      console.error(`Error deleting file: ${objectKey}`, error);
      throw error;
    }
  }
  
  /**
   * List files with a prefix
   */
  async listFiles(prefix: string, delimiter: string = '/'): Promise<{ objects: string[], prefixes: string[] }> {
    try {
      await this.ensureInitialized();
      
      const result = await this.client.list({
        prefix,
        delimiter
      });
      
      if ('err' in result) {
        throw new Error(`Failed to list files: ${result.err.message}`);
      }
      
      return {
        objects: result.value.map(item => item.key),
        prefixes: Array.isArray(result.commonPrefixes) ? result.commonPrefixes : []
      };
    } catch (error) {
      console.error(`Error listing files with prefix ${prefix}:`, error);
      return { objects: [], prefixes: [] };
    }
  }
  
  /**
   * Get public URL for a file
   */
  getPublicUrl(objectKey: string): string {
    // Use the API endpoint to serve files
    return `/api/files/${objectKey}`;
  }
  
  /**
   * Upload a product image
   */
  async uploadProductImage(
    productId: number,
    imageBuffer: Buffer,
    originalFilename: string,
    contentType?: string
  ): Promise<{ url: string, objectKey: string }> {
    try {
      await this.ensureInitialized();
      
      // Validate input
      if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
        throw new Error('Invalid or empty image buffer');
      }
      
      // Generate unique filename and object key
      const filename = this.generateUniqueFilename(originalFilename);
      const objectKey = this.buildObjectKey(
        STORAGE_FOLDERS.PRODUCTS, 
        productId, 
        'images', 
        filename
      );
      
      // Create folder if needed
      await this.ensureDirectoryExists(
        this.buildObjectKey(STORAGE_FOLDERS.PRODUCTS, productId, 'images')
      );
      
      // Upload the file
      const url = await this.uploadBuffer(objectKey, imageBuffer, {
        contentType: contentType || this.detectContentType(originalFilename),
        cacheControl: 'public, max-age=86400',
        filename: originalFilename
      });
      
      return { url, objectKey };
    } catch (error) {
      console.error(`Error uploading product image:`, error);
      throw error;
    }
  }
  
  /**
   * Upload a temporary file (for product creation workflows)
   */
  async uploadTempFile(
    fileBuffer: Buffer,
    originalFilename: string,
    productId: string | number = 'pending',
    contentType?: string
  ): Promise<{ url: string, objectKey: string }> {
    try {
      await this.ensureInitialized();
      
      // Validate input
      if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
        throw new Error('Invalid or empty file buffer');
      }
      
      // Generate unique filename and object key
      const filename = this.generateUniqueFilename(originalFilename);
      const objectKey = this.buildObjectKey(
        STORAGE_FOLDERS.TEMP, 
        productId, 
        undefined, 
        filename
      );
      
      // Create folder if needed
      await this.ensureDirectoryExists(
        this.buildObjectKey(STORAGE_FOLDERS.TEMP, productId)
      );
      
      // Upload the file
      const url = await this.uploadBuffer(objectKey, fileBuffer, {
        contentType: contentType || this.detectContentType(originalFilename),
        cacheControl: 'no-cache, max-age=0',
        filename: originalFilename
      });
      
      return { 
        url: this.getPublicUrl(objectKey),
        objectKey 
      };
    } catch (error) {
      console.error(`Error uploading temp file:`, error);
      throw error;
    }
  }
}

// Export a singleton instance
export const objectStore = new ObjectStore();