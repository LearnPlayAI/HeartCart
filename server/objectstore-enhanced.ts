/**
 * Enhanced Object Storage Service
 * 
 * This file extends the original objectstore.ts with additional functionality
 * for browsing and listing files and folders in a hierarchical manner.
 */

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
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  SUPPLIERS: 'suppliers',
  CATALOGS: 'catalogs',
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

/**
 * Enhanced Object Storage Service for TeeMeYou
 * 
 * This class handles all interactions with Replit Object Storage,
 * providing both the original functionality and enhanced file browsing capabilities.
 */
export class EnhancedObjectStorageService {
  private clients: Record<string, Client> = {};
  private currentBucket: string = '';
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private localFallbackEnabled = false;
  
  // Define available buckets
  private availableBuckets = ['TeeMeYouStorage', 'TeeMeYouDev'];
  
  constructor(initialBucket: string = 'TeeMeYouStorage') {
    this.setBucket(initialBucket);
  }
  
  /**
   * Get available buckets
   */
  getAvailableBuckets(): string[] {
    return [...this.availableBuckets];
  }
  
  /**
   * Set the current bucket
   */
  setBucket(bucketId: string): void {
    if (!this.availableBuckets.includes(bucketId)) {
      console.warn(`Bucket ${bucketId} is not in the list of available buckets, but will try to use it anyway`);
    }
    
    this.currentBucket = bucketId;
    
    // Create client if it doesn't exist
    if (!this.clients[bucketId]) {
      this.clients[bucketId] = new Client({ bucketId });
    }
    
    // Reset initialization state for the new bucket
    this.initialized = false;
    this.initPromise = null;
  }
  
  /**
   * Get the current bucket
   */
  getCurrentBucket(): string {
    return this.currentBucket;
  }
  
  /**
   * Get the active client for the current bucket
   */
  private get client(): Client {
    return this.clients[this.currentBucket];
  }
  
  /**
   * Initialize the storage service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    if (this.initPromise) {
      return this.initPromise;
    }
    
    this.initPromise = (async () => {
      try {
        // Verify access by trying a test operation
        // Use list operation instead of head since head might not be available
        const testResult = await this.client.list({ maxResults: 1 });
        console.log(`Object Store access verified successfully for bucket '${this.currentBucket}'`);
        
        // Create base folders if they don't exist
        await this.ensureBaseDirectoriesExist();
        
        this.initialized = true;
        console.log(`Object Store successfully initialized for bucket '${this.currentBucket}'`);
      } catch (error) {
        console.error(`Failed to initialize object storage for bucket '${this.currentBucket}':`, error);
        console.warn('Enabling local file fallback for development');
        this.localFallbackEnabled = true;
        
        // Create local directories for fallback
        this.ensureLocalDirectoriesExist();
      }
    })();
    
    return this.initPromise;
  }
  
  /**
   * Create base directories if they don't exist
   */
  private async ensureBaseDirectoriesExist(): Promise<void> {
    // Create a temporary file in each base directory to ensure it exists
    const baseDirectories = Object.values(STORAGE_FOLDERS);
    
    for (const dir of baseDirectories) {
      try {
        // Check if directory marker exists
        const markerPath = `${dir}/.directory_marker`;
        const exists = await this.fileExists(markerPath);
        
        if (!exists) {
          // Create directory marker
          await this.putFile(markerPath, Buffer.from('Directory marker'), {
            contentType: 'text/plain'
          });
        }
      } catch (error) {
        console.error(`Failed to ensure directory exists: ${dir}`, error);
      }
    }
  }
  
  /**
   * Create local directories for fallback storage
   */
  private ensureLocalDirectoriesExist(): void {
    const baseDir = './local-storage';
    
    // Create base storage directory
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
    
    // Create all subdirectories
    Object.values(STORAGE_FOLDERS).forEach(folder => {
      const folderPath = path.join(baseDir, folder);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
    });
  }
  
  /**
   * List all root folders in storage
   */
  async listRootFolders(): Promise<string[]> {
    try {
      await this.initialize();
      
      // List all objects to find unique root folders
      const result = await this.client.list({});
      
      if (!result.ok || !Array.isArray(result.ok)) {
        console.error('Failed to list objects:', result.error);
        return [];
      }
      
      const storageObjects = result.ok as any[];
      
      // Extract all unique top-level folders
      const rootFolders = new Set<string>();
      
      for (const obj of storageObjects) {
        // Skip metadata files
        if (obj.name.endsWith('.metadata')) {
          continue;
        }
        
        const parts = obj.name.split('/');
        if (parts.length > 0) {
          rootFolders.add(parts[0]);
        }
      }
      
      return Array.from(rootFolders);
    } catch (error) {
      console.error('Error listing root folders:', error);
      return [];
    }
  }
  
  /**
   * List subfolders within a directory
   */
  async listSubfolders(directory: string): Promise<string[]> {
    try {
      await this.initialize();
      
      const delimiter = '/';
      const prefix = directory ? 
        (directory.endsWith(delimiter) ? directory : `${directory}${delimiter}`) : 
        '';
      
      // List objects with the prefix
      const result = await this.client.list({
        prefix
      });
      
      if (!result.ok || !Array.isArray(result.ok)) {
        console.error('Failed to list objects:', result.error);
        return [];
      }
      
      const storageObjects = result.ok as any[];
      
      // Extract unique subfolder names
      const subfolders = new Set<string>();
      
      for (const obj of storageObjects) {
        // Skip metadata files
        if (obj.name.endsWith('.metadata')) {
          continue;
        }
        
        // Skip the prefix directory itself
        if (obj.name === prefix) {
          continue;
        }
        
        // Get the relative path after the prefix
        const relativePath = obj.name.slice(prefix.length);
        
        // If the relative path contains a delimiter, it's in a subfolder
        if (relativePath.includes(delimiter)) {
          // Extract the subfolder name
          const subfolderName = relativePath.split(delimiter)[0];
          if (subfolderName) {
            subfolders.add(subfolderName);
          }
        }
      }
      
      return Array.from(subfolders);
    } catch (error) {
      console.error('Error listing subfolders:', error);
      return [];
    }
  }
  
  /**
   * List files in a directory
   */
  async listFiles(directory: string): Promise<string[]> {
    try {
      await this.initialize();
      
      const delimiter = '/';
      const prefix = directory ? 
        (directory.endsWith(delimiter) ? directory : `${directory}${delimiter}`) : 
        '';
      
      // List objects with the prefix
      const result = await this.client.list({
        prefix
      });
      
      if (!result.ok || !Array.isArray(result.ok)) {
        console.error('Failed to list objects:', result.error);
        return [];
      }
      
      const storageObjects = result.ok as any[];
      
      // Process the results to simulate delimiter behavior
      const filteredObjects: string[] = [];
      
      for (const obj of storageObjects) {
        // Skip metadata files
        if (obj.name.endsWith('.metadata')) {
          continue;
        }
        
        const relativePath = obj.name.slice(prefix.length);
        
        if (!relativePath.includes(delimiter)) {
          // This is a direct child file (not in a subfolder)
          filteredObjects.push(relativePath);
        }
      }
      
      return filteredObjects;
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    }
  }
  
  /**
   * Check if a file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await this.initialize();
      
      if (this.localFallbackEnabled) {
        const localPath = path.join('./local-storage', filePath);
        return fs.existsSync(localPath);
      } else {
        // Use list with prefix instead of head
        const result = await this.client.list({
          prefix: filePath,
          maxResults: 1
        });
        
        if (!result.ok || !Array.isArray(result.ok)) {
          return false;
        }
        
        // Check if the exact file exists
        return result.ok.some(item => item.name === filePath);
      }
    } catch (error) {
      // File doesn't exist or error occurred
      return false;
    }
  }
  
  /**
   * Get file metadata
   */
  async getFileMetadata(filePath: string): Promise<FileMetadata | null> {
    try {
      await this.initialize();
      
      if (this.localFallbackEnabled) {
        const localPath = path.join('./local-storage', filePath);
        
        if (!fs.existsSync(localPath)) {
          return null;
        }
        
        const stats = fs.statSync(localPath);
        const contentType = mime.lookup(localPath) || 'application/octet-stream';
        
        return {
          contentType,
          filename: path.basename(filePath),
          size: stats.size,
          lastModified: stats.mtime
        };
      } else {
        // Use list with prefix instead of head
        const result = await this.client.list({
          prefix: filePath,
          maxResults: 1
        });
        
        if (!result.ok || !Array.isArray(result.ok)) {
          return null;
        }
        
        // Find exact file
        const file = result.ok.find(item => item.name === filePath);
        if (!file) {
          return null;
        }
        
        // Create basic metadata from available information
        const metadata: FileMetadata = {
          filename: path.basename(filePath),
          contentType: mime.lookup(filePath) || 'application/octet-stream'
        };
        
        return metadata;
      }
    } catch (error) {
      console.error(`Error getting metadata for ${filePath}:`, error);
      return null;
    }
  }
  
  /**
   * Put a file in object storage
   */
  async putFile(filePath: string, data: Buffer | Readable, metadata?: FileMetadata): Promise<boolean> {
    try {
      await this.initialize();
      
      if (this.localFallbackEnabled) {
        const localPath = path.join('./local-storage', filePath);
        const dirPath = path.dirname(localPath);
        
        // Ensure directory exists
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
        
        if (Buffer.isBuffer(data)) {
          fs.writeFileSync(localPath, data);
        } else {
          const writeStream = fs.createWriteStream(localPath);
          data.pipe(writeStream);
          
          await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
          });
        }
        
        return true;
      } else {
        // Create upload options
        const uploadOptions = {};
        
        // Convert Buffer to Uint8Array for compatibility
        const fileData = Buffer.isBuffer(data) 
          ? new Uint8Array(data) 
          : data;
        
        try {
          const result = await this.client.upload(filePath, fileData);
          return result && result.ok !== undefined;
        } catch (uploadError) {
          console.error(`Error uploading file ${filePath}:`, uploadError);
          return false;
        }
      }
    } catch (error) {
      console.error(`Error putting file ${filePath}:`, error);
      return false;
    }
  }
  
  /**
   * Get a file from storage
   */
  async getFile(filePath: string): Promise<Buffer | null> {
    try {
      await this.initialize();
      
      if (this.localFallbackEnabled) {
        const localPath = path.join('./local-storage', filePath);
        
        if (!fs.existsSync(localPath)) {
          return null;
        }
        
        return await readFile(localPath);
      } else {
        try {
          const result = await this.client.download(filePath);
          
          if (!result.ok) {
            return null;
          }
          
          // Convert the ArrayBuffer to Buffer
          return Buffer.from(result.ok);
        } catch (downloadError) {
          console.error(`Error downloading file ${filePath}:`, downloadError);
          return null;
        }
      }
    } catch (error) {
      console.error(`Error getting file ${filePath}:`, error);
      return null;
    }
  }
  
  /**
   * Delete a file from storage
   */
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      await this.initialize();
      
      if (this.localFallbackEnabled) {
        const localPath = path.join('./local-storage', filePath);
        
        if (!fs.existsSync(localPath)) {
          return true; // File doesn't exist, so delete "succeeded"
        }
        
        fs.unlinkSync(localPath);
        return true;
      } else {
        const result = await this.client.delete(filePath);
        return result.ok !== undefined;
      }
    } catch (error) {
      console.error(`Error deleting file ${filePath}:`, error);
      return false;
    }
  }
  
  /**
   * Check if the object storage is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export a singleton instance
export const enhancedObjectStorage = new EnhancedObjectStorageService();