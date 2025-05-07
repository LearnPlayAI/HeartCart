import { Client as ObjectStorageClient } from '@replit/object-storage';
import { Readable } from 'stream';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import mime from 'mime-types';
import { 
  ReplitObjectStorageClient,
  Result, 
  RequestError, 
  StorageObject 
} from './types/objectStorage';

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
  // Using any type to avoid complex type checking issues with the Replit client
  private client: any;
  
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
    return `/api/files/${objectKey}`;
  }
  
  /**
   * Check if an object exists
   * @param objectKey The object key
   * @returns True if the object exists
   */
  async exists(objectKey: string): Promise<boolean> {
    try {
      const result = await this.client.exists(objectKey);
      if ('err' in result) {
        console.error(`Error checking if object exists ${objectKey}:`, result.err);
        return false;
      }
      return result.ok;
    } catch (error: any) {
      console.error(`Error checking if object exists ${objectKey}:`, error);
      return false;
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
      // Validate buffer before uploading
      if (!Buffer.isBuffer(buffer)) {
        console.error(`Invalid buffer type for ${objectKey}: ${typeof buffer}`);
        throw new Error(`Invalid buffer type: ${typeof buffer}`);
      }
      
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
      const uploadResult = await this.client.uploadFromBytes(objectKey, buffer, {
        compress: true // Enable compression for better storage efficiency
      });
      
      // Check for errors in the result
      if ('err' in uploadResult) {
        console.error(`Upload failed for ${objectKey}:`, uploadResult.err);
        throw new Error(`Upload failed: ${uploadResult.err.message || 'Unknown error'}`);
      }
      
      console.log(`Successfully uploaded file to ${objectKey}`);
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
      
      // Validate buffer
      if (!Buffer.isBuffer(buffer)) {
        console.error(`Invalid buffer type for ${objectKey}: ${typeof buffer}`);
        throw new Error(`Invalid buffer type: ${typeof buffer}`);
      }
      
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
      const uploadResult = await this.client.uploadFromBytes(objectKey, buffer, {
        compress: true // Enable compression for better storage efficiency
      });
      
      // Check for errors in the result
      if ('err' in uploadResult) {
        console.error(`Upload failed for ${objectKey}:`, uploadResult.err);
        throw new Error(`Upload failed: ${uploadResult.err.message || 'Unknown error'}`);
      }
      
      console.log(`Successfully uploaded base64 file to ${objectKey}`);
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
      console.log(`Downloading file as buffer: ${objectKey}`);
      const result = await this.client.downloadAsBytes(objectKey);
      if ('err' in result) {
        console.error(`Error in downloadAsBytes for ${objectKey}:`, result.err);
        throw new Error(`Failed to download file: ${result.err.message || 'Unknown error'}`);
      }
      
      if (!result.ok) {
        throw new Error(`Failed to download file: No data returned from object storage`);
      }
      
      // Check if result.ok is a buffer
      if (!Buffer.isBuffer(result.ok)) {
        console.error(`Invalid result type from downloadAsBytes: ${typeof result.ok}`);
        throw new Error('Object storage returned an invalid data type, expected Buffer');
      }
      
      console.log(`Successfully downloaded file: ${objectKey}, size: ${result.ok.length} bytes`);
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
      const result = await this.client.downloadAsStream(objectKey);
      if ('err' in result) {
        throw new Error(`Failed to stream file: ${result.err.message || 'Unknown error'}`);
      }
      return result.ok;
    } catch (error: any) {
      console.error(`Error streaming file ${objectKey}:`, error);
      throw new Error(`Failed to stream file: ${error.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Get the size of an object in bytes
   * @param objectKey The object key
   * @returns The file size in bytes
   */
  async getSize(objectKey: string): Promise<number> {
    try {
      // Try to get the metadata, which will contain the size
      const metadata = await this.getMetadata(objectKey);
      
      // If metadata has size, return it
      if (metadata.size !== undefined) {
        return metadata.size;
      }
      
      // If not, download as buffer and get size
      const buffer = await this.downloadAsBuffer(objectKey);
      return buffer.length;
    } catch (error: any) {
      console.error(`Error getting size for ${objectKey}:`, error);
      throw new Error(`Failed to get file size: ${error.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Get metadata for an object
   * @param objectKey The object key
   * @returns The file metadata
   */
  async getMetadata(objectKey: string): Promise<FileMetadata> {
    try {
      // Since the Replit client doesn't have a proper head method, we'll
      // try to get the metadata from our dedicated metadata file
      const metadataKey = `${objectKey}.metadata`;
      
      if (await this.exists(metadataKey)) {
        try {
          const result = await this.client.downloadAsText(metadataKey);
          if ('err' in result) {
            throw new Error(`Failed to get metadata: ${result.err.message || 'Unknown error'}`);
          }
          
          const metadata = JSON.parse(result.ok);
          return metadata;
        } catch (parseError: any) {
          console.error(`Error parsing metadata for ${objectKey}:`, parseError);
          // Fall back to basic metadata
        }
      }
      
      // If we can't get detailed metadata, return basic info
      return {
        contentType: this.detectContentType(objectKey),
        size: 0
      };
    } catch (error: any) {
      console.error(`Error getting metadata for ${objectKey}:`, error);
      throw new Error(`Failed to get file metadata: ${error.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Delete a file
   * @param objectKey The object key
   */
  async deleteFile(objectKey: string): Promise<void> {
    try {
      // First try to delete any associated metadata
      const metadataKey = `${objectKey}.metadata`;
      if (await this.exists(metadataKey)) {
        const metadataResult = await this.client.delete(metadataKey);
        if ('err' in metadataResult) {
          console.warn(`Failed to delete metadata file ${metadataKey}: ${metadataResult.err.message || 'Unknown error'}`);
        }
      }
      
      // Then delete the actual file
      const result = await this.client.delete(objectKey);
      if ('err' in result) {
        throw new Error(`Failed to delete file: ${result.err.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error(`Error deleting file ${objectKey}:`, error);
      throw new Error(`Failed to delete file: ${error.message || 'Unknown error'}`);
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
      // Note: Replit ObjectStorage client doesn't support delimiter
      // and other parameters, so we'll handle filtering ourselves
      const result = await this.client.list({
        prefix: prefix,
        maxResults: maxResults
      });
      
      if ('err' in result) {
        const errMsg = result.err.message || 'Unknown error';
        throw new Error(`Failed to list files: ${errMsg}`);
      }
      
      // We're using any here since we know the structure but TypeScript doesn't
      const storageObjects = result.ok as any[];
      
      // Process the results to simulate delimiter behavior
      const filteredObjects: string[] = [];
      const prefixes = new Set<string>();
      
      for (const obj of storageObjects) {
        // Skip metadata files
        if (obj.name.endsWith('.metadata')) {
          continue;
        }
        
        const relativePath = obj.name.slice(prefix.length);
        
        if (delimiter && relativePath.includes(delimiter)) {
          // This is a "nested" object, extract the prefix
          const prefixPart = prefix + relativePath.split(delimiter)[0] + delimiter;
          prefixes.add(prefixPart);
        } else {
          // This is a direct child object
          filteredObjects.push(obj.name);
        }
      }
      
      return {
        objects: filteredObjects,
        prefixes: Array.from(prefixes),
        nextPageToken: undefined // Replit ObjectStorage doesn't support pagination
      };
    } catch (error: any) {
      console.error(`Error listing files with prefix ${prefix}:`, error);
      throw new Error(`Failed to list files: ${error.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Create a folder structure (does nothing in object storage, but checks existence)
   * @param folderPath The folder path
   * @returns True if created or already exists
   */
  async createFolder(folderPath: string): Promise<boolean> {
    // Object storage doesn't have folders, but we can create a marker object
    try {
      // Add a trailing slash if not present
      const normalizedPath = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
      
      // Check if the path exists by checking for the marker or listing files
      if (await this.exists(`${normalizedPath}.keep`)) {
        return true;
      }
      
      // Try to list objects with this prefix to check if any exist
      try {
        const result = await this.listFiles(normalizedPath, undefined, '/', 1);
        if (result.objects.length > 0 || result.prefixes.length > 0) {
          return true;
        }
      } catch (listError) {
        // Ignore listing errors and proceed to create the marker
      }
      
      // Create an empty marker object to represent the folder
      // This is a common pattern for object storage
      const result = await this.client.uploadFromBytes(`${normalizedPath}.keep`, Buffer.from(''));
      if ('err' in result) {
        throw new Error(`Failed to create folder marker: ${result.err.message || 'Unknown error'}`);
      }
      
      return true;
    } catch (error: any) {
      console.error(`Error creating folder ${folderPath}:`, error);
      throw new Error(`Failed to create folder: ${error.message || 'Unknown error'}`);
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