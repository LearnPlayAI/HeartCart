import { Client as ObjectStorageClient } from '@replit/object-storage';
import { Readable } from 'stream';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import mime from 'mime-types';

// Convert fs.readFile to promise-based
const readFile = promisify(fs.readFile);

// Folder structure constants
export const STORAGE_FOLDERS = {
  PRODUCTS: 'public/products',
  CATEGORIES: 'public/categories',
  SUPPLIERS: 'public/suppliers',
  CATALOGS: 'public/catalogs',
  TEMP: 'temp'
};

// Interface for file metadata
export interface FileMetadata {
  contentType?: string;
  contentDisposition?: string;
  cacheControl?: string;
  filename?: string;
  size?: number;
  lastModified?: Date;
  etag?: string;
}

// Interface for listing results
export interface ListResult {
  objects: string[];
  prefixes: string[];
  nextPageToken?: string;
}

/**
 * ObjectStorageService - A service for managing file operations with Replit Object Storage
 */
export class ObjectStorageService {
  private client: ObjectStorageClient;
  
  constructor() {
    this.client = new ObjectStorageClient();
  }
  
  /**
   * Sanitize a filename to prevent path traversal and other issues
   * @param filename The original filename
   * @returns The sanitized filename
   */
  sanitizeFilename(filename: string): string {
    // Remove path traversal characters and sanitize the filename
    const sanitized = filename
      .replace(/[/\\?%*:|"<>]/g, '-') // Replace invalid filename characters
      .replace(/\s+/g, '_');          // Replace spaces with underscores
    
    return sanitized;
  }
  
  /**
   * Generate a unique filename with timestamp
   * @param originalFilename The original filename
   * @returns A unique filename with timestamp
   */
  generateUniqueFilename(originalFilename: string): string {
    const timestamp = Date.now();
    const sanitizedName = this.sanitizeFilename(originalFilename);
    const ext = path.extname(sanitizedName);
    const baseName = path.basename(sanitizedName, ext);
    
    return `${baseName}_${timestamp}${ext}`;
  }
  
  /**
   * Detect content type based on filename or provided content type
   * @param filename The filename
   * @param providedContentType An optional content type
   * @returns The detected content type
   */
  detectContentType(filename: string, providedContentType?: string): string {
    if (providedContentType) {
      return providedContentType;
    }
    
    const contentType = mime.lookup(filename);
    return contentType ? contentType.toString() : 'application/octet-stream';
  }
  
  /**
   * Build a complete object key from parts
   * @param folder The storage folder
   * @param id The entity ID (e.g., productId)
   * @param subFolder Optional subfolder
   * @param filename The filename
   * @returns The complete object key
   */
  buildObjectKey(folder: string, id: number | string, subFolder?: string, filename?: string): string {
    let objectKey = `${folder}/${id}`;
    
    if (subFolder) {
      objectKey += `/${subFolder}`;
    }
    
    if (filename) {
      objectKey += `/${filename}`;
    }
    
    return objectKey;
  }
  
  /**
   * Generate a public URL for an object
   * @param objectKey The object key
   * @returns The public URL
   */
  getPublicUrl(objectKey: string): string {
    return `/object-storage/${objectKey}`;
  }
  
  /**
   * Check if an object exists
   * @param objectKey The object key
   * @returns True if the object exists
   */
  async exists(objectKey: string): Promise<boolean> {
    try {
      return await this.client.exists(objectKey);
    } catch (error: any) {
      console.error(`Error checking if object exists ${objectKey}:`, error);
      throw new Error(`Failed to check if object exists: ${error.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Upload a file from a Buffer
   * @param objectKey The object key
   * @param buffer The file buffer
   * @param metadata Optional file metadata
   * @returns The public URL of the uploaded file
   */
  async uploadFromBuffer(objectKey: string, buffer: Buffer, metadata?: FileMetadata): Promise<string> {
    try {
      // Store the content type and other metadata in a separate file if needed
      const metadataKey = `${objectKey}.metadata`;
      if (metadata) {
        const metadataContent = JSON.stringify({
          contentType: metadata.contentType || this.detectContentType(objectKey),
          cacheControl: metadata.cacheControl || 'public, max-age=86400',
          contentDisposition: metadata.contentDisposition,
          originalFileName: metadata.filename
        });
        await this.client.uploadFromText(metadataKey, metadataContent);
      }
      
      // Upload the actual file
      await this.client.uploadFromBytes(objectKey, buffer, {
        compress: true // Enable compression for better storage efficiency
      });
      
      return this.getPublicUrl(objectKey);
    } catch (error: any) {
      console.error(`Error uploading file to ${objectKey}:`, error);
      throw new Error(`Failed to upload file: ${error.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Upload a file from a local file path
   * @param objectKey The object key
   * @param filePath The local file path
   * @param metadata Optional file metadata
   * @returns The public URL of the uploaded file
   */
  async uploadFromFile(objectKey: string, filePath: string, metadata?: FileMetadata): Promise<string> {
    try {
      // Store metadata in a separate file if needed
      const metadataKey = `${objectKey}.metadata`;
      const contentType = metadata?.contentType || this.detectContentType(filePath);
      
      if (metadata || contentType) {
        const metadataContent = JSON.stringify({
          contentType: contentType,
          cacheControl: metadata?.cacheControl || 'public, max-age=86400',
          contentDisposition: metadata?.contentDisposition,
          originalFileName: metadata?.filename || path.basename(filePath)
        });
        await this.client.uploadFromText(metadataKey, metadataContent);
      }
      
      // Use the direct file upload method
      await this.client.uploadFromFilename(objectKey, filePath, {
        compress: true // Enable compression for better storage efficiency
      });
      
      return this.getPublicUrl(objectKey);
    } catch (error: any) {
      console.error(`Error uploading file ${filePath} to ${objectKey}:`, error);
      throw new Error(`Failed to upload file from path: ${error.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Upload a file from a Base64 data URL
   * @param objectKey The object key
   * @param base64DataUrl The Base64 data URL
   * @param metadata Optional file metadata
   * @returns The public URL of the uploaded file
   */
  async uploadFromBase64(objectKey: string, base64DataUrl: string, metadata?: FileMetadata): Promise<string> {
    try {
      // Extract the base64 data and content type
      const matches = base64DataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        throw new Error('Invalid base64 image format');
      }
      
      const contentType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Store metadata in a separate file
      const metadataKey = `${objectKey}.metadata`;
      const metadataContent = JSON.stringify({
        contentType: contentType,
        cacheControl: metadata?.cacheControl || 'public, max-age=86400',
        contentDisposition: metadata?.contentDisposition,
        originalFileName: metadata?.filename
      });
      await this.client.uploadFromText(metadataKey, metadataContent);
      
      // Upload the actual file
      await this.client.uploadFromBytes(objectKey, buffer, {
        compress: true // Enable compression for better storage efficiency
      });
      
      return this.getPublicUrl(objectKey);
    } catch (error: any) {
      console.error(`Error uploading base64 data to ${objectKey}:`, error);
      throw new Error(`Failed to upload base64 data: ${error.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Download a file as a Buffer
   * @param objectKey The object key
   * @returns The file buffer
   */
  async downloadAsBuffer(objectKey: string): Promise<Buffer> {
    try {
      const result = await this.client.downloadAsBytes(objectKey);
      if ('err' in result) {
        throw new Error(`Failed to download file: ${result.err.message || 'Unknown error'}`);
      }
      return result.ok;
    } catch (error: any) {
      console.error(`Error downloading file ${objectKey}:`, error);
      throw new Error(`Failed to download file: ${error.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Download a file as a stream
   * @param objectKey The object key
   * @returns The file stream
   */
  async downloadAsStream(objectKey: string): Promise<Readable> {
    try {
      return await this.client.downloadAsStream(objectKey);
    } catch (error) {
      console.error(`Error streaming file ${objectKey}:`, error);
      throw new Error(`Failed to stream file: ${error.message}`);
    }
  }
  
  /**
   * Get metadata for an object
   * @param objectKey The object key
   * @returns The file metadata
   */
  async getMetadata(objectKey: string): Promise<FileMetadata> {
    try {
      const metadata = await this.client.head(objectKey);
      return {
        contentType: metadata.contentType,
        contentDisposition: metadata.contentDisposition,
        cacheControl: metadata.cacheControl,
        size: metadata.size,
        lastModified: metadata.lastModified,
        etag: metadata.etag
      };
    } catch (error) {
      console.error(`Error getting metadata for ${objectKey}:`, error);
      throw new Error(`Failed to get file metadata: ${error.message}`);
    }
  }
  
  /**
   * Delete a file
   * @param objectKey The object key
   */
  async deleteFile(objectKey: string): Promise<void> {
    try {
      await this.client.delete(objectKey);
    } catch (error) {
      console.error(`Error deleting file ${objectKey}:`, error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }
  
  /**
   * List objects in a directory
   * @param prefix The directory prefix
   * @param pageToken Optional page token for pagination
   * @param delimiter Optional delimiter (default: '/')
   * @param maxResults Optional maximum number of results
   * @returns The list result
   */
  async listFiles(
    prefix: string,
    pageToken?: string,
    delimiter: string = '/',
    maxResults: number = 100
  ): Promise<ListResult> {
    try {
      const result = await this.client.list({
        prefix,
        delimiter,
        pageToken,
        maxResults
      });
      
      return {
        objects: result.objects.map(obj => obj.key),
        prefixes: result.prefixes,
        nextPageToken: result.nextPageToken
      };
    } catch (error) {
      console.error(`Error listing files with prefix ${prefix}:`, error);
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }
  
  /**
   * Create a folder structure (does nothing in object storage, but checks existence)
   * @param folderPath The folder path
   * @returns True if created or already exists
   */
  async createFolder(folderPath: string): Promise<boolean> {
    // Object storage doesn't have folders, but we can check if the prefix exists
    // by listing objects with the prefix
    try {
      // Add a trailing slash if not present
      const normalizedPath = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
      
      // Check if any objects exist with this prefix
      const result = await this.listFiles(normalizedPath, undefined, '/', 1);
      
      // If we have objects or prefixes, the "folder" exists
      if (result.objects.length > 0 || result.prefixes.length > 0) {
        return true;
      }
      
      // Create an empty marker object to represent the folder
      // This is a common pattern for object storage
      await this.client.uploadFromBytes(`${normalizedPath}.keep`, Buffer.from(''));
      return true;
    } catch (error) {
      console.error(`Error creating folder ${folderPath}:`, error);
      throw new Error(`Failed to create folder: ${error.message}`);
    }
  }
  
  /**
   * Helper method to create product image path and upload image
   * @param productId The product ID
   * @param imageFile The image file (Buffer)
   * @param originalFilename The original filename
   * @param contentType Optional content type
   * @returns The public URL and object key
   */
  async uploadProductImage(
    productId: number,
    imageFile: Buffer,
    originalFilename: string,
    contentType?: string
  ): Promise<{ url: string, objectKey: string }> {
    // Generate a unique filename
    const filename = this.generateUniqueFilename(originalFilename);
    
    // Build the object key
    const objectKey = this.buildObjectKey(STORAGE_FOLDERS.PRODUCTS, productId, 'images', filename);
    
    // Ensure the folder exists
    await this.createFolder(this.buildObjectKey(STORAGE_FOLDERS.PRODUCTS, productId, 'images'));
    
    // Upload the file
    const url = await this.uploadFromBuffer(objectKey, imageFile, {
      contentType: contentType || this.detectContentType(filename),
      cacheControl: 'public, max-age=86400' // 1 day cache
    });
    
    return { url, objectKey };
  }
  
  /**
   * Helper method to upload a temporary file
   * @param fileBuffer The file buffer
   * @param originalFilename The original filename
   * @param contentType Optional content type
   * @returns The public URL and object key
   */
  async uploadTempFile(
    fileBuffer: Buffer,
    originalFilename: string,
    contentType?: string
  ): Promise<{ url: string, objectKey: string }> {
    // Generate a unique filename
    const filename = this.generateUniqueFilename(originalFilename);
    
    // Build the object key
    const objectKey = `${STORAGE_FOLDERS.TEMP}/${filename}`;
    
    // Upload the file
    const url = await this.uploadFromBuffer(objectKey, fileBuffer, {
      contentType: contentType || this.detectContentType(filename),
      cacheControl: 'no-cache, max-age=0' // Don't cache temp files
    });
    
    return { url, objectKey };
  }
}

// Export a singleton instance
export const objectStorageService = new ObjectStorageService();