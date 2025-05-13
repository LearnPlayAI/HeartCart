import { Client } from '@replit/object-storage';
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
  TEMP: 'temp' // Base temp folder - product ID subfolders will be added dynamically
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
  private client: Client;
  private initialized: boolean = false;
  
  constructor() {
    try {
      // Initialize the Replit Object Storage client
      this.client = new Client();
      
      // Initialize storage asynchronously
      // We run this in the constructor but don't await it
      // Operations will wait if needed through the ensureInitialized method
      this.initializeStorage()
        .then(() => {
          console.log('Replit Object Storage client initialization completed');
        })
        .catch(error => {
          console.error('Failed to fully initialize Replit Object Storage:', error);
        });
    } catch (error) {
      console.error('Failed to create Replit Object Storage Client:', error);
      // Ensure client is initialized to avoid null references
      this.client = new Client();
    }
  }
  
  /**
   * Ensure that the Object Storage is initialized before continuing
   * This should be called at the start of any storage operation
   */
  private async ensureInitialized(): Promise<void> {
    // If already initialized, return immediately
    if (this.initialized) return;
    
    // Otherwise, initialize storage
    try {
      await this.initializeStorage();
    } catch (error) {
      console.error('Failed to initialize storage when needed:', error);
      throw new Error('Object Storage is not available');
    }
  }
  
  /**
   * Initialize the Object Storage with test operations
   * This helps ensure the service is ready before we try to use it
   */
  private async initializeStorage(): Promise<void> {
    try {
      const testKey = 'test-initialization';
      const testData = Buffer.from('test-data');
      
      console.log('Initializing Replit Object Storage...');
      
      // Test write operation
      const uploadResult = await this.client.uploadFromBytes(testKey, testData);
      if ('err' in uploadResult) {
        throw new Error(`Initialization write error: ${uploadResult.err.message}`);
      }
      
      // Add a small delay to allow for any internal processing
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Test read operation
      const downloadResult = await this.client.downloadAsBytes(testKey);
      if ('err' in downloadResult) {
        throw new Error(`Initialization read error: ${downloadResult.err.message}`);
      }
      
      // Test delete operation
      const deleteResult = await this.client.delete(testKey);
      if ('err' in deleteResult) {
        console.warn(`Could not delete test key during initialization: ${deleteResult.err.message}`);
      }
      
      this.initialized = true;
      console.log('Replit Object Storage initialized successfully');
    } catch (error: any) {
      console.error('Error initializing Replit Object Storage:', error.message);
      // We don't throw here to allow the application to continue,
      // but operations may fail until storage is properly available
    }
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
   * VeriTrade compatible implementation that's more reliable
   * @param objectKey The object key
   * @returns True if the object exists
   */
  async exists(objectKey: string): Promise<boolean> {
    // Ensure storage is initialized
    await this.ensureInitialized();
    
    try {
      // Use the Replit Object Storage Client's exists method
      const result = await this.client.exists(objectKey);
      
      // Check for error response
      if ('err' in result) {
        console.error(`Error checking if object exists ${objectKey}:`, result.err);
        return false;
      }
      
      // Log for debugging
      console.log(`Checked existence of ${objectKey}: ${result.value ? 'Exists' : 'Does not exist'}`);
      
      return result.value;
    } catch (error: any) {
      console.error(`Error checking if object exists ${objectKey}:`, error);
      return false;
    }
  }
  
  /**
   * Upload a file from a Buffer with VeriTrade's verified upload approach
   * @param objectKey The object key
   * @param buffer The file buffer
   * @param metadata Optional file metadata
   * @returns The public URL of the uploaded file
   */
  async uploadFromBuffer(objectKey: string, buffer: Buffer, metadata?: FileMetadata): Promise<string> {
    // Ensure storage is initialized
    await this.ensureInitialized();
    
    const MAX_RETRIES = 3;
    let lastError: any = null;
    
    // Validate buffer before uploading
    if (!Buffer.isBuffer(buffer)) {
      console.error(`Invalid buffer type for ${objectKey}: ${typeof buffer}`);
      throw new Error(`Invalid buffer type: ${typeof buffer}`);
    }
    
    // Log the buffer size for debugging
    console.log(`Uploading buffer for ${objectKey}: ${buffer.length} bytes, type: ${metadata?.contentType || 'not specified'}`);
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`Uploading file to ${objectKey} (attempt ${attempt}/${MAX_RETRIES})`);
        
        // Store the content type and other metadata in a separate file
        const metadataKey = `${objectKey}.metadata`;
        const metadataContent = JSON.stringify({
          contentType: metadata?.contentType || this.detectContentType(objectKey),
          cacheControl: metadata?.cacheControl || 'public, max-age=86400',
          contentDisposition: metadata?.contentDisposition,
          originalFileName: metadata?.filename,
          size: buffer.length,
          lastModified: new Date().toISOString()
        });
        
        // Upload metadata first
        const metadataResult = await this.client.uploadFromText(metadataKey, metadataContent);
        if ('err' in metadataResult) {
          console.warn(`Failed to upload metadata for ${objectKey}, continuing with file upload:`, metadataResult.err);
        }
        
        // Upload the actual file
        const uploadResult = await this.client.uploadFromBytes(objectKey, buffer, {
          compress: true // Enable compression for better storage efficiency
        });
        
        // Check for errors in the result
        if ('err' in uploadResult) {
          throw new Error(`Upload failed: ${uploadResult.err.message || 'Unknown error'}`);
        }
        
        // Verify the file was uploaded by checking its existence
        // Add a small delay to ensure the upload has propagated
        await new Promise(resolve => setTimeout(resolve, 250));
        
        const exists = await this.exists(objectKey);
        if (!exists) {
          throw new Error('File upload verification failed - file does not exist after upload');
        }
        
        // Advanced verification: Check file existence only, not size comparison
        // This avoids the buffer conversion issues when the file is stored in Replit Object Storage
        try {
          const exists = await this.exists(objectKey);
          if (!exists) {
            throw new Error(`File was not found in Object Storage after upload verification: ${objectKey}`);
          }
          console.log(`File existence verification successful for ${objectKey}`);
        } catch (verifyError: any) {
          console.error(`File existence verification failed for ${objectKey}:`, verifyError);
          throw new Error(`File upload verification failed: ${verifyError.message}`);
        }
        
        console.log(`Successfully uploaded and verified file in object storage: ${objectKey}`);
        return this.getPublicUrl(objectKey);
      } catch (error: any) {
        lastError = error;
        console.error(`Error uploading file to ${objectKey} (attempt ${attempt}):`, error);
        
        if (attempt < MAX_RETRIES) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 250;
          console.log(`Retrying upload after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`Failed to upload file after ${MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`);
  }
  
  /**
   * Upload a file from a local file path
   * @param objectKey The object key
   * @param filePath The local file path
   * @param metadata Optional file metadata
   * @returns The public URL of the uploaded file
   */
  async uploadFromFile(objectKey: string, filePath: string, metadata?: FileMetadata): Promise<string> {
    // Ensure storage is initialized
    await this.ensureInitialized();
    
    try {
      // First read the file into a buffer
      console.log(`Reading file from disk: ${filePath}`);
      const fileBuffer = await fs.promises.readFile(filePath);
      
      console.log(`Read file into buffer: ${filePath}, size: ${fileBuffer.length} bytes`);
      
      // Now use our reliable uploadFromBuffer method which already has retry, verification, etc.
      return await this.uploadFromBuffer(objectKey, fileBuffer, {
        contentType: metadata?.contentType || this.detectContentType(filePath),
        cacheControl: metadata?.cacheControl || 'public, max-age=86400',
        contentDisposition: metadata?.contentDisposition,
        filename: metadata?.filename || path.basename(filePath)
      });
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
    // Ensure storage is initialized
    await this.ensureInitialized();
    
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
      
      if (buffer.length === 0) {
        throw new Error(`Empty buffer from base64 data for ${objectKey}`);
      }
      
      console.log(`Converting base64 data to buffer for ${objectKey}: ${buffer.length} bytes`);
      
      // Now use our reliable uploadFromBuffer method which already has retry, verification, etc.
      return await this.uploadFromBuffer(objectKey, buffer, {
        contentType: contentType,
        cacheControl: metadata?.cacheControl || 'public, max-age=86400',
        contentDisposition: metadata?.contentDisposition,
        filename: metadata?.filename
      });
    } catch (error: any) {
      console.error(`Error uploading base64 data to ${objectKey}:`, error);
      throw new Error(`Failed to upload base64 data: ${error.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Helper function to work around Replit object storage issues
   * @param objectKey The object key to download
   * @returns Buffer containing the file data
   */
  /**
   * Get a file's content as a buffer using the direct method (no streaming)
   * This is the key method for reliable file retrieval that avoids streaming issues
   * @param objectKey The object key to download
   * @returns Buffer containing the file data and its content type
   */
  /**
   * Get a file's content as a buffer using the VeriTrade direct buffer approach
   * This method is public so it can be used directly by routes
   * @param objectKey The object key to download
   * @returns Buffer containing the file data and its content type
   */
  async getFileAsBuffer(objectKey: string): Promise<{ data: Buffer, contentType: string }> {
    // Ensure storage is initialized
    await this.ensureInitialized();
    
    const MAX_RETRIES = 3;
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`Getting file as buffer: ${objectKey} (attempt ${attempt}/${MAX_RETRIES})`);
        
        // Ensure object exists first
        const exists = await this.exists(objectKey);
        if (!exists) {
          throw new Error(`File does not exist: ${objectKey}`);
        }
        
        // Get the file directly as a buffer (no streaming)
        const result = await this.client.downloadAsBytes(objectKey);
        if ('err' in result) {
          throw new Error(`Failed to get file as buffer: ${result.err.message || 'Unknown error'}`);
        }
        
        // Convert value to buffer if it's not already a buffer
        let bufferData: Buffer;
        if (Buffer.isBuffer(result.value)) {
          bufferData = result.value;
        } else if (result.value instanceof Uint8Array) {
          // Handle Uint8Array case
          bufferData = Buffer.from(result.value);
        } else if (typeof result.value === 'object') {
          // Try to convert object to buffer - this handles odd Replit Object Storage behaviors
          console.warn(`Object returned from Object Storage instead of Buffer for ${objectKey}, attempting conversion`);
          try {
            // Try to convert to string first then to buffer as a fallback
            const objString = JSON.stringify(result.value);
            bufferData = Buffer.from(objString);
          } catch (conversionError) {
            console.error(`Failed to convert object to buffer: ${conversionError}`);
            throw new Error(`Cannot convert returned object to buffer: ${typeof result.value}`);
          }
        } else {
          console.error(`Invalid data type returned for ${objectKey}: ${typeof result.value}`);
          throw new Error(`Invalid data type returned from object storage: ${typeof result.value}`);
        }
        
        // Log the buffer size for debugging
        console.log(`Downloaded buffer for ${objectKey}: ${bufferData.length} bytes`);
        
        // Get the metadata to determine content type
        let contentType = 'application/octet-stream';
        try {
          const metadataKey = `${objectKey}.metadata`;
          const metadataResult = await this.client.downloadAsText(metadataKey);
          if (!('err' in metadataResult)) {
            try {
              const metadata = JSON.parse(metadataResult.value);
              contentType = metadata.contentType || this.getContentTypeFromKey(objectKey);
              console.log(`Using content type from metadata for ${objectKey}: ${contentType}`);
            } catch (parseError) {
              console.error(`Error parsing metadata JSON for ${objectKey}:`, parseError);
              contentType = this.getContentTypeFromKey(objectKey);
            }
          } else {
            contentType = this.getContentTypeFromKey(objectKey);
            console.log(`Using detected content type for ${objectKey}: ${contentType}`);
          }
        } catch (metadataError) {
          // If metadata doesn't exist, determine by extension
          contentType = this.getContentTypeFromKey(objectKey);
          console.log(`Using filename-based content type for ${objectKey}: ${contentType}`);
        }
        
        return {
          data: bufferData,
          contentType
        };
      } catch (error: any) {
        lastError = error;
        console.error(`Error in getFileAsBuffer for ${objectKey} (attempt ${attempt}): ${error.message}`);
        
        if (attempt < MAX_RETRIES) {
          // Exponential backoff
          const delay = Math.pow(2, attempt - 1) * 500;
          console.log(`Retrying after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`Failed to get file as buffer after ${MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`);
  }
  
  /**
   * Get content type based on file extension
   * @param key The object key
   * @returns The content type based on file extension
   */
  private getContentTypeFromKey(key: string): string {
    const extension = key.split('.').pop()?.toLowerCase();
    if (!extension) return 'application/octet-stream';
    
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'pdf': 'application/pdf',
      'json': 'application/json',
      'txt': 'text/plain',
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript'
    };
    
    return mimeTypes[extension] || 'application/octet-stream';
  }
  
  /**
   * Download a file as a Buffer with enhanced error handling and retry logic
   * @param objectKey The object key
   * @returns The file buffer
   */
  /**
   * Download a file as a Buffer with reliable buffer-based approach
   * @param objectKey The object key
   * @returns The file buffer
   */
  async downloadAsBuffer(objectKey: string): Promise<Buffer> {
    try {
      // Use our more reliable buffer-based method
      const { data } = await this.getFileAsBuffer(objectKey);
      return data;
    } catch (error: any) {
      console.error(`Error in downloadAsBuffer for ${objectKey}:`, error);
      throw new Error(`Failed to download file: ${error.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Download a file as a stream with enhanced error handling
   * @param objectKey The object key
   * @returns The file stream
   */
  /**
   * Download a file as a stream by using our reliable buffer method under the hood
   * This avoids all streaming issues by completely converting to a buffer first
   * @param objectKey The object key
   * @returns The file stream created from a complete buffer
   */
  async downloadAsStream(objectKey: string): Promise<Readable> {
    try {
      // Get the file as a buffer first (using our reliable method), then create a stream from it
      const { data } = await this.getFileAsBuffer(objectKey);
      
      // Create a Readable stream from the buffer
      const stream = Readable.from(data);
      
      return stream;
    } catch (error: any) {
      console.error(`Error in downloadAsStream for ${objectKey}:`, error);
      throw new Error(`Error creating stream from buffer: ${error.message || 'Unknown error'}`);
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
      // Handle different possible return formats
      let storageObjects: any[] = [];
      
      if (Array.isArray(result.ok)) {
        storageObjects = result.ok;
      } else if (result.ok && typeof result.ok === 'object') {
        // Handle case where result.ok is an object with entries/items property
        if (Array.isArray(result.ok.entries)) {
          storageObjects = result.ok.entries;
        } else if (Array.isArray(result.ok.items)) {
          storageObjects = result.ok.items;
        }
      }
      
      // Process the results to simulate delimiter behavior
      const filteredObjects: string[] = [];
      const prefixes = new Set<string>();
      
      // Ensure storageObjects is iterable
      if (!Array.isArray(storageObjects)) {
        console.error('Error listing files with prefix', prefix, ': storageObjects is not an array:', storageObjects);
        storageObjects = [];
      }
      
      for (const obj of storageObjects) {
        // Skip null or undefined objects
        if (!obj || typeof obj !== 'object' || !obj.name) continue;
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
    // Ensure storage is initialized
    await this.ensureInitialized();
    
    // Validate buffer before uploading
    if (!Buffer.isBuffer(imageFile)) {
      console.error(`Invalid buffer type for product image: ${typeof imageFile}`);
      throw new Error(`Invalid buffer type: ${typeof imageFile}`);
    }
    
    if (imageFile.length === 0) {
      throw new Error(`Empty buffer for product image: ${originalFilename}`);
    }
    
    console.log(`Uploading product image for product ${productId}: ${originalFilename}, size: ${imageFile.length} bytes`);
    
    // Generate a unique filename
    const filename = this.generateUniqueFilename(originalFilename);
    
    // Build the object key
    const objectKey = this.buildObjectKey(STORAGE_FOLDERS.PRODUCTS, productId, 'images', filename);
    
    // Ensure the folder exists
    await this.createFolder(this.buildObjectKey(STORAGE_FOLDERS.PRODUCTS, productId, 'images'));
    
    const MAX_RETRIES = 3;
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`Uploading product image attempt ${attempt}/${MAX_RETRIES}: ${objectKey}`);
        
        // Set explicit content type
        const detectedContentType = contentType || this.detectContentType(filename);
        console.log(`Content type for ${filename}: ${detectedContentType}`);
        
        // Upload the file
        const url = await this.uploadFromBuffer(objectKey, imageFile, {
          contentType: detectedContentType,
          cacheControl: 'public, max-age=86400', // 1 day cache
          filename: originalFilename  // Store original filename in metadata
        });
        
        // Add a delay after upload to ensure Replit Object Storage has processed the file
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Verify the file exists in Object Storage - that's sufficient for verification
        const exists = await this.exists(objectKey);
        if (!exists) {
          throw new Error(`File was not found in Object Storage after upload: ${objectKey}`);
        }
        
        console.log(`Successfully uploaded and verified product image in object storage: ${objectKey}`);
        
        return { url, objectKey };
      } catch (error: any) {
        lastError = error;
        console.error(`Error uploading product image (attempt ${attempt}/${MAX_RETRIES}): ${error.message}`);
        
        if (attempt < MAX_RETRIES) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 300;
          console.log(`Retrying upload after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // If we got here, all attempts failed
    throw new Error(`Failed to upload product image after ${MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`);
  }
  
  /**
   * Helper method to upload a temporary file
   * @param fileBuffer The file buffer
   * @param originalFilename The original filename
   * @param productId The product ID (or 'pending' for products not yet created)
   * @param contentType Optional content type
   * @returns The public URL and object key
   */
  async uploadTempFile(
    fileBuffer: Buffer,
    originalFilename: string,
    productId: string | number = 'pending',
    contentType?: string
  ): Promise<{ url: string, objectKey: string }> {
    // Ensure storage is initialized
    await this.ensureInitialized();
    
    // Validate buffer before uploading
    if (!Buffer.isBuffer(fileBuffer)) {
      console.error(`Invalid buffer type for temp file: ${typeof fileBuffer}`);
      throw new Error(`Invalid buffer type: ${typeof fileBuffer}`);
    }
    
    if (fileBuffer.length === 0) {
      throw new Error(`Empty buffer for temp file: ${originalFilename}`);
    }
    
    console.log(`Uploading temp file for product ${productId}: ${originalFilename}, size: ${fileBuffer.length} bytes`);
    
    // Generate a unique filename with timestamp to avoid collisions
    const timestamp = Date.now();
    const ext = path.extname(originalFilename);
    const baseName = path.basename(originalFilename, ext);
    const uniqueFilename = `${baseName}_${timestamp}${ext}`;
    
    // Build the object key with product ID in the folder structure
    const objectKey = `${STORAGE_FOLDERS.TEMP}/${productId}/${uniqueFilename}`;
    
    // Ensure the folder exists
    await this.createFolder(`${STORAGE_FOLDERS.TEMP}/${productId}`);
    
    const MAX_RETRIES = 3;
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`Uploading temp file attempt ${attempt}/${MAX_RETRIES}: ${objectKey}`);
        
        // Set explicit content type to ensure browser can display it correctly
        const detectedContentType = contentType || this.detectContentType(uniqueFilename);
        console.log(`Content type for ${uniqueFilename}: ${detectedContentType}`);
        
        // Upload the file
        const url = await this.uploadFromBuffer(objectKey, fileBuffer, {
          contentType: detectedContentType,
          cacheControl: 'no-cache, max-age=0', // Don't cache temp files
          filename: originalFilename  // Store original filename in metadata
        });
        
        // Add a delay after upload to ensure Replit Object Storage has processed the file
        // This is critical for avoiding race conditions where the file is reported as uploaded
        // but not yet available for download
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Verify the file exists in Object Storage - that's sufficient for verification
        const exists = await this.exists(objectKey);
        if (!exists) {
          throw new Error(`File was not found in Object Storage after upload: ${objectKey}`);
        }
        
        console.log(`Successfully uploaded and verified temp file in object storage: ${objectKey}`);
        
        return { 
          url: `/api/files/${objectKey}`,  // Use our file serving endpoint 
          objectKey 
        };
      } catch (error: any) {
        lastError = error;
        console.error(`Error uploading temp file (attempt ${attempt}/${MAX_RETRIES}): ${error.message}`);
        
        if (attempt < MAX_RETRIES) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 300;
          console.log(`Retrying upload after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // If we got here, all attempts failed
    throw new Error(`Failed to upload temp file after ${MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`);
  }
}

// Export a singleton instance
export const objectStorageService = new ObjectStorageService();