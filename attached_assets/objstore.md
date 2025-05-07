# Replit Object Store - VeriTrade Implementation

This document provides a complete, working implementation of file handling with Replit's Object Storage service, including handling for image uploads and serving files. This implementation has been extracted from the VeriTrade.shop project and is known to work reliably.

## Table of Contents

1. [Overview](#overview)
2. [ObjectStore Service](#objectstore-service)
3. [File Upload Routes](#file-upload-routes)
4. [File Serving Routes](#file-serving-routes)
5. [Common Issues and Solutions](#common-issues-and-solutions)
6. [Implementation Examples](#implementation-examples)

## Overview

The VeriTrade implementation uses a buffer-based approach instead of streams, which avoids the common `TypeError: Cannot read properties of undefined (reading 'on')` error that occurs when trying to stream files from Replit's Object Storage.

Key principles:
- Use buffers instead of streams when possible
- Organize files in a hierarchical, user-centric structure
- Properly initialize the Object Store at application startup
- Use robust error handling throughout
- Set appropriate content types when serving files

## ObjectStore Service

This is the core service that interacts with Replit's Object Storage. Place this in a file like `server/objectstore.ts`:

```typescript
import { Readable } from 'stream';
import { randomUUID } from 'crypto';
import { Client as ReplitObjectStore } from "@replit/object-storage";

// File structure constants
const ROOT_DIRS = {
  PUBLIC: 'public-assets',
  PRIVATE: 'private-assets'
};

// User-centric subdirectories
const PUBLIC_USER_SUBDIRS = ['listings', 'profile', 'reviews'];
const PRIVATE_USER_SUBDIRS = ['verification', 'messages', 'transactions'];
const REGULATED_SUBDIRS = ['firearms', 'compliance'];

export class ObjectStore {
  private replitStore: ReplitObjectStore;

  constructor() {
    // Initialize Replit Object Store client with default bucket
    this.replitStore = new ReplitObjectStore();
    
    // Ensure root directories exist
    this.initializeStorageStructure();
  }
  
  /**
   * Initialize the storage structure with root directories
   */
  private async initializeStorageStructure() {
    try {
      // Check if root directories exist, create if not
      await this.ensureDirectoryExists(ROOT_DIRS.PUBLIC);
      await this.ensureDirectoryExists(ROOT_DIRS.PRIVATE);
      
      console.log('Object store structure initialized successfully');
    } catch (error) {
      console.error('Error initializing object store structure:', error);
    }
  }
  
  /**
   * Ensure a directory exists in the object store
   */
  private async ensureDirectoryExists(path: string) {
    // In object storage, directories are virtual concepts
    // We create a marker file to represent the directory
    const markerPath = `${path}/.keep`;
    try {
      // Check if marker file exists
      const existsResult = await this.replitStore.exists(markerPath);
      
      if (existsResult.ok && existsResult.value === false) {
        // If it doesn't exist, create it
        const createResult = await this.replitStore.uploadFromText(markerPath, '');
        
        if (createResult.ok) {
          console.log(`Created directory: ${path}`);
        } else {
          console.error(`Failed to create directory ${path}`);
        }
      }
    } catch (error) {
      console.error(`Error checking/creating directory ${path}:`, error);
      throw error;
    }
  }

  /**
   * Get a standardized path for a file based on user and context
   */
  generatePath(
    isPublic: boolean, 
    userId: number, 
    context: string, 
    filename: string,
    isRegulated: boolean = false
  ): string {
    const rootDir = isPublic ? ROOT_DIRS.PUBLIC : ROOT_DIRS.PRIVATE;
    
    // For regulated content, use special path
    if (isRegulated) {
      return `${rootDir}/regulated/${userId}/${context}/${filename}`;
    }
    
    // For all other content, use user-centric path
    return `${rootDir}/users/${userId}/${context}/${filename}`;
  }

  /**
   * Upload a buffer to the object store
   */
  async uploadBuffer(buffer: Buffer, filename: string, contentType: string, path?: string): Promise<string> {
    // Generate a unique filename
    let uniqueFilename;
    
    if (path) {
      // If a fully qualified path was provided, use it directly
      uniqueFilename = path;
    } else {
      // Otherwise, just use a random UUID filename at the root
      uniqueFilename = `${randomUUID()}-${filename}`;
    }
    
    try {
      // Use standard uploadFromBytes method
      const result = await this.replitStore.uploadFromBytes(uniqueFilename, buffer);
      
      if (!result.ok) {
        throw new Error(`Failed to upload file: ${uniqueFilename}`);
      }
      
      return uniqueFilename;
    } catch (error) {
      console.error('Error uploading file to object store:', error);
      throw error;
    }
  }

  /**
   * Upload a stream to the object store
   * NOTE: This method is less reliable and should only be used when absolutely necessary
   */
  async uploadStream(stream: Readable, filename: string, contentType: string, path?: string): Promise<string> {
    try {
      // Convert stream to buffer for compatibility
      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        
        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on('error', (err) => reject(err));
        stream.on('end', async () => {
          try {
            const buffer = Buffer.concat(chunks);
            const result = await this.uploadBuffer(buffer, filename, contentType, path);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      });
    } catch (error) {
      console.error('Error uploading stream to object store:', error);
      throw error;
    }
  }

  /**
   * Get a file from the object store as a Buffer
   */
  async getFile(filename: string): Promise<Buffer> {
    try {
      // Use standard downloadAsBytes method
      const result = await this.replitStore.downloadAsBytes(filename);
      
      if (!result.ok) {
        throw new Error(`File not found: ${filename}`);
      }
      
      return result.value[0]; // Result is a tuple with Buffer as first element
    } catch (error) {
      console.error('Error retrieving file from object store:', error);
      throw error;
    }
  }

  /**
   * Delete a file from the object store
   */
  async deleteFile(filename: string): Promise<void> {
    try {
      // Use standard delete method
      const result = await this.replitStore.delete(filename);
      
      if (!result.ok) {
        throw new Error(`Failed to delete file: ${filename}`);
      }
    } catch (error) {
      console.error('Error deleting file from object store:', error);
      throw error;
    }
  }
  
  /**
   * Put an object into the store (for image uploads)
   * @param path The path to store the file at
   * @param data The file data as Buffer
   * @param contentType The content type of the file
   */
  async putObject(path: string, data: Buffer, contentType: string): Promise<void> {
    try {
      // Use uploadFromBytes method
      const result = await this.replitStore.uploadFromBytes(path, data);
      
      if (!result.ok) {
        throw new Error(`Failed to upload file to ${path}`);
      }
    } catch (error) {
      console.error('Error putting object to store:', error);
      throw error;
    }
  }

  /**
   * Get a file's public URL (only for public files)
   */
  getPublicUrl(filename: string): string {
    // For private files, require going through API endpoints with auth
    if (!filename.startsWith(ROOT_DIRS.PUBLIC)) {
      return `/api/files/${filename}`;
    }
    
    // For public files, use API endpoint
    return `/api/files/public/${filename}`;
  }
  
  /**
   * Check if a file exists in the object store
   */
  async fileExists(filename: string): Promise<boolean> {
    try {
      // Use standard exists method
      const result = await this.replitStore.exists(filename);
      
      if (!result.ok) {
        return false;
      }
      
      return result.value;
    } catch (error) {
      console.error(`Error checking if file exists: ${filename}`, error);
      return false;
    }
  }
  
  /**
   * List files in a directory
   */
  async listFiles(directory: string): Promise<string[]> {
    try {
      // Use standard list method with prefix option
      const result = await this.replitStore.list({
        prefix: directory
      });
      
      if (!result.ok) {
        throw new Error(`Failed to list files in directory: ${directory}`);
      }
      
      // Map objects to their names
      return result.value.map(obj => obj.key);
    } catch (error) {
      console.error(`Error listing files in directory ${directory}:`, error);
      return [];
    }
  }
  
  /**
   * Create a user's directory structure
   * @param userId The user ID
   */
  async createUserDirectories(userId: number): Promise<void> {
    try {
      // Create public user directories
      const publicUserPath = `${ROOT_DIRS.PUBLIC}/users/${userId}`;
      await this.ensureDirectoryExists(publicUserPath);
      
      for (const dir of PUBLIC_USER_SUBDIRS) {
        await this.ensureDirectoryExists(`${publicUserPath}/${dir}`);
      }
      
      // Create private user directories
      const privateUserPath = `${ROOT_DIRS.PRIVATE}/users/${userId}`;
      await this.ensureDirectoryExists(privateUserPath);
      
      for (const dir of PRIVATE_USER_SUBDIRS) {
        await this.ensureDirectoryExists(`${privateUserPath}/${dir}`);
      }
      
      console.log(`Created directory structure for user ${userId}`);
    } catch (error) {
      console.error(`Error creating directories for user ${userId}:`, error);
      throw error;
    }
  }
}

export const objectStore = new ObjectStore();
```

## File Upload Routes

These are the routes for handling file uploads. Add these to your main routes file:

```typescript
import multer from "multer";
import path from "path";
import { objectStore } from "./objectstore";

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Single file upload route
app.post("/api/upload", isAuthenticated, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    
    const { originalname, buffer, mimetype } = req.file;
    const fileType = req.body.type || "profile"; // Default to profile if not specified
    
    // Create user directories if they don't exist
    await objectStore.createUserDirectories(req.user!.id);
    
    // Generate path based on user ID and context
    const isPublic = true; // Most user content is public
    const path = objectStore.generatePath(
      isPublic,
      req.user!.id, 
      fileType, 
      originalname, 
      false
    );
    
    // Upload to object store with the generated path
    const filename = await objectStore.uploadBuffer(buffer, originalname, mimetype, path);
    const url = objectStore.getPublicUrl(filename);
    
    res.status(201).json({ filename, url });
  } catch (error) {
    res.status(500).json({ message: "File upload failed", error: String(error) });
  }
});

// Multiple files upload route
app.post("/api/upload/multiple", isAuthenticated, upload.array("files", 10), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }
    
    // Create user directories if they don't exist
    await objectStore.createUserDirectories(req.user!.id);
    
    // Default context is listings if not specified
    const fileType = req.body.type || "listings";
    const isPublic = true; // Most user content is public
    
    const results = await Promise.all(files.map(async (file) => {
      const { originalname, buffer, mimetype } = file;
      
      // Generate path based on user ID and context
      const path = objectStore.generatePath(
        isPublic,
        req.user!.id, 
        fileType, 
        originalname, 
        false
      );
      
      const filename = await objectStore.uploadBuffer(buffer, originalname, mimetype, path);
      const url = objectStore.getPublicUrl(filename);
      return { filename, url, originalname };
    }));
    
    res.status(201).json(results);
  } catch (error) {
    res.status(500).json({ message: "Files upload failed", error: String(error) });
  }
});

// Listing image upload with optimization
app.post("/api/upload/listing-image", isAuthenticated, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: "No image file provided" 
      });
    }
    
    const file = req.file;
    const userId = req.user!.id;
    const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}.jpg`;
    
    // Resize and optimize image (using sharp)
    const resizedImageBuffer = await sharp(file.buffer)
      .resize({ 
        width: 1200, 
        height: 1200, 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();
    
    // Fix orientation issues in the image
    const orientedImageBuffer = await sharp(resizedImageBuffer)
      .rotate() // Auto-rotates based on EXIF orientation tag
      .toBuffer();
    
    // Store in the object storage
    const objectPath = `${ROOT_DIRS.PUBLIC}/users/${userId}/listings/images/${filename}`;
    await objectStore.putObject(objectPath, orientedImageBuffer, 'image/jpeg');
    
    // Get URL
    const url = objectStore.getPublicUrl(objectPath);
    
    // Return success with the URL and filename
    res.json({
      success: true,
      url,
      filename,
      originalname: file.originalname
    });
  } catch (error) {
    console.error("Error uploading listing image:", error);
    res.status(500).json({ 
      success: false, 
      error: String(error) 
    });
  }
});
```

## File Serving Routes

These routes handle serving files from the Object Store:

```typescript
// Serve public files from object store (no authentication required)
app.get("/api/files/public/:filename(*)", async (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Check if file exists
    const exists = await objectStore.fileExists(filename);
    if (!exists) {
      return res.status(404).json({ message: "File not found" });
    }
    
    // Get file content as buffer (not stream)
    const fileBuffer = await objectStore.getFile(filename);
    
    // Determine content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    const contentType = 
      ext === '.png' ? 'image/png' :
      ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
      ext === '.gif' ? 'image/gif' :
      ext === '.pdf' ? 'application/pdf' :
      ext === '.svg' ? 'image/svg+xml' :
      'application/octet-stream';
    
    // Set content type and send file
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.send(fileBuffer);
  } catch (error) {
    console.error("Error serving file:", error);
    res.status(500).json({ message: "Error serving file", error: String(error) });
  }
});

// Serve protected files (requires authentication)
app.get("/api/files/:filename(*)", isAuthenticated, async (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Check if file exists
    const exists = await objectStore.fileExists(filename);
    if (!exists) {
      return res.status(404).json({ message: "File not found" });
    }
    
    // For protected files, check user authorization based on file path
    // If the file is in a user-specific directory, ensure the user has access
    if (filename.includes('/users/') && !filename.includes(`/users/${req.user!.id}/`)) {
      // This is a user-specific file but not for the current user
      return res.status(403).json({ message: "Access denied" });
    }
    
    // Get file content
    const fileBuffer = await objectStore.getFile(filename);
    
    // Determine content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    const contentType = 
      ext === '.png' ? 'image/png' :
      ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
      ext === '.gif' ? 'image/gif' :
      ext === '.pdf' ? 'application/pdf' :
      ext === '.svg' ? 'image/svg+xml' :
      'application/octet-stream';
    
    // Set content type and send file
    res.setHeader('Content-Type', contentType);
    res.send(fileBuffer);
  } catch (error) {
    console.error("Error serving file:", error);
    res.status(500).json({ message: "Error serving file", error: String(error) });
  }
});
```

## Common Issues and Solutions

### Issue: Cannot read properties of undefined (reading 'on')

This is a common error when trying to stream files from Replit's Object Storage. The solution is to avoid using streams and instead use buffers:

1. Instead of using `downloadAsStream`, use `downloadAsBytes`
2. Convert the bytes to a buffer
3. Send the buffer directly to the client

### Issue: File not found after upload

This can happen if:

1. The path is incorrectly formatted
2. The file was uploaded to a different bucket
3. The file name has special characters that cause issues

Solution: Use consistent path handling with the `generatePath` method and ensure all file names are properly sanitized.

### Issue: Wrong content type

If files are served with the wrong content type:

1. Extract the extension from the filename
2. Map the extension to the correct MIME type
3. Set the Content-Type header before sending the response

## Implementation Examples

### Example 1: Uploading and Serving a Profile Picture

```typescript
// On the client
const uploadProfilePicture = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', 'profile');
  
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });
  
  const result = await response.json();
  
  if (result.url) {
    // Update user profile with the new image URL
    await fetch('/api/users/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileImageUrl: result.url }),
    });
    
    return result.url;
  }
};

// On the server
app.patch('/api/users/profile', isAuthenticated, async (req, res) => {
  try {
    const { profileImageUrl } = req.body;
    
    // Update the user's profile
    const updatedUser = await storage.updateUser(req.user!.id, {
      profileImageUrl,
    });
    
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update profile', error: String(error) });
  }
});
```

### Example 2: Handling Multiple Listing Images

```typescript
// On the client
const uploadListingImages = async (files) => {
  const formData = new FormData();
  
  files.forEach((file, index) => {
    formData.append('files', file);
  });
  
  formData.append('type', 'listings');
  
  const response = await fetch('/api/upload/multiple', {
    method: 'POST',
    body: formData,
  });
  
  const results = await response.json();
  
  return results.map(result => result.url);
};

// Create listing with images
const createListing = async (listingData, images) => {
  // First, upload all the images
  const imageUrls = await uploadListingImages(images);
  
  // Then create the listing with the image URLs
  const response = await fetch('/api/listings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...listingData,
      images: imageUrls,
      mainImage: imageUrls[0], // Use the first image as the main image
    }),
  });
  
  return response.json();
};
```

### Example 3: Showing a Gallery of Images

```tsx
// React component for displaying a gallery of images
const ImageGallery = ({ images }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  
  return (
    <div className="image-gallery">
      <div className="main-image">
        <img 
          src={images[activeIndex]} 
          alt={`Image ${activeIndex + 1}`} 
          className="w-full h-full object-cover"
        />
      </div>
      <div className="thumbnails">
        {images.map((image, index) => (
          <div 
            key={index}
            onClick={() => setActiveIndex(index)}
            className={`thumbnail ${activeIndex === index ? 'active' : ''}`}
          >
            <img src={image} alt={`Thumbnail ${index + 1}`} />
          </div>
        ))}
      </div>
    </div>
  );
};
```