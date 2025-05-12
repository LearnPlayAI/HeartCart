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
  private client: Client;
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private localFallbackEnabled = false;
  
  constructor() {
    this.client = new Client(); // Use Replit environment variables for authentication
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
        const testResult = await this.client.head('test-access');
        console.log('Object Store access verified successfully');
        
        // Create base folders if they don't exist
        await this.ensureBaseDirectoriesExist();
        
        this.initialized = true;
        console.log('Object Store successfully initialized');
      } catch (error) {
        console.error('Failed to initialize object storage:', error);
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
        const result = await this.client.head(filePath);
        return result.ok !== undefined;
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
        const result = await this.client.head(filePath);
        
        if (!result.ok) {
          return null;
        }
        
        // Parse metadata from headers
        const metadata: FileMetadata = {};
        
        if (result.ok.contentType) {
          metadata.contentType = result.ok.contentType;
        }
        
        if (result.ok.contentDisposition) {
          metadata.contentDisposition = result.ok.contentDisposition;
        }
        
        if (result.ok.cacheControl) {
          metadata.cacheControl = result.ok.cacheControl;
        }
        
        if (result.ok.contentLength) {
          metadata.size = parseInt(result.ok.contentLength, 10);
        }
        
        if (result.ok.lastModified) {
          metadata.lastModified = new Date(result.ok.lastModified);
        }
        
        if (result.ok.etag) {
          metadata.etag = result.ok.etag;
        }
        
        metadata.filename = path.basename(filePath);
        
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
        const putOptions: any = {};
        
        if (metadata) {
          if (metadata.contentType) {
            putOptions.contentType = metadata.contentType;
          }
          
          if (metadata.contentDisposition) {
            putOptions.contentDisposition = metadata.contentDisposition;
          }
          
          if (metadata.cacheControl) {
            putOptions.cacheControl = metadata.cacheControl;
          }
        }
        
        let result;
        if (Buffer.isBuffer(data)) {
          result = await this.client.put(filePath, data, putOptions);
        } else {
          result = await this.client.putStream(filePath, data, putOptions);
        }
        
        return result.ok !== undefined;
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
        const result = await this.client.get(filePath);
        
        if (!result.ok) {
          return null;
        }
        
        return result.ok;
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