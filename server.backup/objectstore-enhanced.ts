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
      
      // Safely handle various result formats
      let storageObjects: any[] = [];
      
      // Type assertion to handle any result format
      const typedResult = result as any;
      
      if (typedResult.ok) {
        if (Array.isArray(typedResult.ok)) {
          storageObjects = typedResult.ok;
        } else if (typeof typedResult.ok === 'object' && typedResult.ok !== null) {
          // Handle case where result.ok is an object with entries/items property
          if (Array.isArray(typedResult.ok.entries)) {
            storageObjects = typedResult.ok.entries;
          } else if (Array.isArray(typedResult.ok.items)) {
            storageObjects = typedResult.ok.items;
          } else {
            console.warn('Unexpected result.ok format:', typedResult.ok);
          }
        } else {
          console.error('Unexpected result format:', typedResult);
        }
      } else if (typedResult.error) {
        console.error('Failed to list objects:', typedResult.error);
      } else {
        console.error('Unknown result format:', typedResult);
      }
      
      // Process the results to simulate delimiter behavior
      const filteredObjects: string[] = [];
      
      for (const obj of storageObjects) {
        // Skip null or undefined objects
        if (!obj || !obj.name) continue;
        
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
          // Use the appropriate API based on what's available
          // At runtime, we'll know what method is available
          if ('upload' in this.client) {
            const result = await (this.client as any).upload(filePath, fileData);
            return result && result.ok !== undefined;
          } else if ('put' in this.client) {
            const result = await (this.client as any).put(filePath, data);
            return result && result.ok !== undefined;
          } else if ('putStream' in this.client) {
            const result = await (this.client as any).putStream(filePath, data);
            return result && result.ok !== undefined;
          } else {
            console.error('No compatible upload method found on Client API');
            return false;
          }
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
          // Use the appropriate API based on what's available
          if ('download' in this.client) {
            const result = await (this.client as any).download(filePath);
            if (!result.ok) {
              return null;
            }
            return Buffer.from(result.ok);
          } else if ('get' in this.client) {
            const result = await (this.client as any).get(filePath);
            if (!result.ok) {
              return null;
            }
            return result.ok;
          } else {
            console.error('No compatible download method found on Client API');
            return null;
          }
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
        try {
          // First check if file exists
          if (!(await this.fileExists(filePath))) {
            console.log(`File ${filePath} does not exist, skipping delete`);
            return true; // Consider it a success if file doesn't exist
          }
          
          // Use the appropriate API based on what's available
          if ('remove' in this.client) {
            const result = await (this.client as any).remove(filePath);
            return result && result.ok !== undefined;
          } else if ('delete' in this.client) {
            const result = await (this.client as any).delete(filePath);
            return result && result.ok !== undefined;
          } else {
            console.error('No compatible delete method found on Client API');
            return false;
          }
        } catch (deleteError) {
          console.error(`Error deleting file ${filePath}:`, deleteError);
          return false;
        }
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

// Helper function to log available methods on Client API (for debugging)
export async function logClientAPIMethods(): Promise<void> {
  console.log("==== REPLIT OBJECT STORAGE CLIENT API INSPECTION ====");
  
  try {
    await enhancedObjectStorage.initialize();
    const client = (enhancedObjectStorage as any).client;
    
    if (!client) {
      console.log("No client instance available");
      return;
    }
    
    // Log all methods and properties on the client object
    console.log("\nClient Object Properties and Methods:");
    const clientProps = Object.getOwnPropertyNames(client);
    const clientMethods = clientProps.filter(prop => typeof client[prop] === 'function');
    const clientProperties = clientProps.filter(prop => typeof client[prop] !== 'function');
    
    console.log("\nMethods:");
    clientMethods.forEach(method => {
      try {
        const funcStr = client[method].toString().split('\n')[0];
        console.log(`- ${method}: ${funcStr}`);
      } catch (err) {
        console.log(`- ${method}: [Error getting function signature]`);
      }
    });
    
    console.log("\nProperties:");
    clientProperties.forEach(prop => {
      try {
        console.log(`- ${prop}: ${typeof client[prop]}`);
      } catch (err) {
        console.log(`- ${prop}: [Error getting property type]`);
      }
    });
    
    // Log prototype methods if available
    const proto = Object.getPrototypeOf(client);
    if (proto) {
      console.log("\nPrototype Methods:");
      const protoMethods = Object.getOwnPropertyNames(proto)
        .filter(name => name !== 'constructor' && typeof proto[name] === 'function');
      
      protoMethods.forEach(method => {
        try {
          const funcStr = proto[method].toString().split('\n')[0];
          console.log(`- ${method}: ${funcStr}`);
        } catch (err) {
          console.log(`- ${method}: [Error getting function signature]`);
        }
      });
    }
    
    console.log("\n==== END OF API INSPECTION ====");
  } catch (error) {
    console.error("Error during API inspection:", error);
  }
}