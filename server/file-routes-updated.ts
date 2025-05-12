/**
 * File Routes
 * 
 * This module provides routes for file handling, including serving static files
 * from the Object Store, handling uploads, and managing temporary files.
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import multer from 'multer';
import { isAuthenticated, isAdmin } from './auth-middleware';
import { objectStore, ROOT_DIRS, STORAGE_FOLDERS } from './object-store-updated';
import { sendSuccess, sendError } from './api-response';
import { catchErrors } from './error-handler';

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10 // Maximum 10 files per upload
  }
});

// Create the router
const router = express.Router();

/**
 * Standard File Serving Route
 * 
 * Serves files from Object Storage with proper caching, content types, and error handling
 * This is the main route used for accessing all stored files
 */
router.get('/:path(*)', catchErrors(async (req: Request, res: Response) => {
  // Decode the path parameter to handle URL-encoded characters
  const filePath = decodeURIComponent(req.params.path);
  
  // Log the request for monitoring and debugging
  console.log(`Serving file: ${filePath}`);
  
  // Check if file exists to provide a proper 404 response
  const exists = await objectStore.exists(filePath);
  if (!exists) {
    console.warn(`File not found: ${filePath}`);
    return sendError(res, 'File not found', 404);
  }
  
  try {
    // Get file data
    const { data: fileData, contentType } = await objectStore.getFileAsBuffer(filePath);
    
    // Set appropriate content type based on file extension or metadata
    const detectedContentType = contentType || determineContentType(filePath);
    res.setHeader('Content-Type', detectedContentType);
    
    // Set caching headers - use longer cache for public files
    if (filePath.startsWith(`${ROOT_DIRS.PUBLIC}/`)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
    } else {
      res.setHeader('Cache-Control', 'private, max-age=3600'); // 1 hour
    }
    
    // Add CORS headers for image requests to allow embedding
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    
    // Add Content-Disposition header for downloads if requested
    if (req.query.download === 'true') {
      const filename = path.basename(filePath);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    } else {
      res.setHeader('Content-Disposition', 'inline');
    }
    
    // Send file data
    res.send(fileData);
  } catch (error) {
    console.error('Error serving file:', error);
    sendError(res, 'Error serving file', 500);
  }
}));

/**
 * Legacy Compatibility Route
 * 
 * Support old image paths for backward compatibility
 */
router.get('/object-storage/:folder/:subfolder/:filename', catchErrors(async (req: Request, res: Response) => {
  // Decode the path parameters to handle URL-encoded characters
  const folder = decodeURIComponent(req.params.folder);
  const subfolder = decodeURIComponent(req.params.subfolder);
  const filename = decodeURIComponent(req.params.filename);
  const filePath = `${folder}/${subfolder}/${filename}`;
  
  console.log(`Redirecting legacy file path: ${filePath}`);
  
  // Redirect to the new file path format with proper encoding
  const encodedPath = `${encodeURIComponent(folder)}/${encodeURIComponent(subfolder)}/${encodeURIComponent(filename)}`;
  res.redirect(`/api/files/${encodedPath}`);
}));

/**
 * Temporary File Access Route
 * 
 * Specialized route for handling temporary files during product creation
 */
router.get('/temp/:identifier/:filename', catchErrors(async (req: Request, res: Response) => {
  // Decode the path parameters to handle URL-encoded characters
  const identifier = decodeURIComponent(req.params.identifier);
  const filename = decodeURIComponent(req.params.filename);
  const filePath = `${ROOT_DIRS.PUBLIC}/${STORAGE_FOLDERS.TEMP}/${identifier}/${filename}`;
  
  console.log(`Serving temp file: ${filePath}`);
  
  // Check if file exists
  const exists = await objectStore.exists(filePath);
  if (!exists) {
    console.warn(`Temp file not found: ${filePath}`);
    return sendError(res, 'File not found', 404);
  }
  
  try {
    // Get file data
    const { data: fileData, contentType } = await objectStore.getFileAsBuffer(filePath);
    
    // Set appropriate content type
    const detectedContentType = contentType || determineContentType(filename);
    res.setHeader('Content-Type', detectedContentType);
    
    // Set shorter cache for temporary files
    res.setHeader('Cache-Control', 'private, max-age=3600'); // 1 hour
    
    // Add CORS headers for image requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    
    // Send file
    res.send(fileData);
  } catch (error) {
    console.error('Error serving temp file:', error);
    sendError(res, 'Error serving file', 500);
  }
}));

/**
 * Product Images Upload Route
 * 
 * Handles multiple file uploads for product images
 * Processes images to optimize them
 */
router.post(
  '/upload/products/images/temp',
  isAuthenticated,
  upload.array('images', 10),
  catchErrors(async (req: Request, res: Response) => {
    // Get the uploaded files
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return sendError(res, 'No files uploaded', 400);
    }
    
    // Use 'pending' as identifier for temp storage, or user-provided ID if available
    const identifier = req.body.identifier || 'pending';
    
    // Process each file
    const uploadResults = await Promise.all(files.map(async (file, index) => {
      try {
        // Process the image to optimize it
        const processedBuffer = await objectStore.processImage(file.buffer, {
          width: 1200, // Max width
          height: 1200, // Max height
          fit: 'inside',
          withoutEnlargement: true,
          quality: 85,
          autoRotate: true
        });
        
        // Upload to temporary storage
        const result = await objectStore.uploadTempFile(
          processedBuffer,
          file.originalname,
          identifier,
          {
            contentType: file.mimetype,
            metadata: {
              originalname: file.originalname,
              size: String(file.size),
              order: String(index),
              processed: 'true'
            }
          }
        );
        
        return {
          id: index, // Temp ID for client reference
          url: result.url,
          objectKey: result.objectKey,
          size: result.size,
          filename: path.basename(result.objectKey),
          originalname: file.originalname,
          mimetype: file.mimetype,
          order: index
        };
      } catch (error) {
        console.error(`Error processing file ${file.originalname}:`, error);
        throw error;
      }
    }));
    
    // Send success response with file details
    sendSuccess(res, { files: uploadResults });
  })
);

/**
 * Upload Product Images to Specific Product
 * 
 * Used for adding images to an existing product
 */
router.post(
  '/upload/products/:productId/images',
  isAuthenticated,
  upload.array('images', 10),
  catchErrors(async (req: Request, res: Response) => {
    const productId = req.params.productId;
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return sendError(res, 'No files uploaded', 400);
    }
    
    if (!productId || isNaN(Number(productId))) {
      return sendError(res, 'Invalid product ID', 400);
    }
    
    // Process each file
    const uploadResults = await Promise.all(files.map(async (file, index) => {
      try {
        // Process the image to optimize it
        const processedBuffer = await objectStore.processImage(file.buffer, {
          width: 1200,
          height: 1200,
          fit: 'inside',
          withoutEnlargement: true,
          quality: 85,
          autoRotate: true
        });
        
        // Upload directly to product folder
        const result = await objectStore.uploadProductImage(
          processedBuffer,
          file.originalname,
          productId,
          {
            contentType: file.mimetype,
            metadata: {
              originalname: file.originalname,
              size: String(file.size),
              order: String(index),
              processed: 'true'
            }
          }
        );
        
        return {
          id: index, // Temp ID for client reference
          url: result.url,
          objectKey: result.objectKey,
          size: result.size,
          filename: path.basename(result.objectKey),
          originalname: file.originalname,
          mimetype: file.mimetype,
          order: index
        };
      } catch (error) {
        console.error(`Error processing file ${file.originalname}:`, error);
        throw error;
      }
    }));
    
    // Send success response with file details
    sendSuccess(res, { files: uploadResults });
  })
);

/**
 * Move Temporary Files to Permanent Location
 * 
 * Used when finalizing product creation
 */
router.post(
  '/move-temp-files/:productId',
  isAuthenticated,
  catchErrors(async (req: Request, res: Response) => {
    const productId = req.params.productId;
    const { objectKeys } = req.body;
    
    if (!productId || isNaN(Number(productId))) {
      return sendError(res, 'Invalid product ID', 400);
    }
    
    if (!objectKeys || !Array.isArray(objectKeys) || objectKeys.length === 0) {
      return sendError(res, 'No object keys provided', 400);
    }
    
    // Move each file
    const movedFiles = await Promise.all(objectKeys.map(async (objectKey) => {
      try {
        const result = await objectStore.moveFromTemp(objectKey, productId);
        
        return {
          originalKey: objectKey,
          newKey: result.objectKey,
          url: result.url
        };
      } catch (error) {
        console.error(`Error moving file ${objectKey}:`, error);
        throw error;
      }
    }));
    
    // Send success response with moved file details
    sendSuccess(res, { movedFiles });
  })
);

/**
 * Delete Files Route
 * 
 * Handles deletion of files from storage
 */
router.post(
  '/delete-files',
  isAuthenticated,
  catchErrors(async (req: Request, res: Response) => {
    const { objectKeys } = req.body;
    
    if (!objectKeys || !Array.isArray(objectKeys) || objectKeys.length === 0) {
      return sendError(res, 'No object keys provided', 400);
    }
    
    // Delete each file
    const result = await objectStore.deleteFiles(objectKeys);
    
    // Send success response with deletion results
    sendSuccess(res, result);
  })
);

/**
 * Cleanup Temporary Files Route (Admin Only)
 * 
 * Removes old temporary files to free up storage space
 */
router.post(
  '/cleanup-temp-files',
  isAuthenticated,
  isAdmin,
  catchErrors(async (req: Request, res: Response) => {
    const { olderThan } = req.body;
    
    // Convert olderThan to milliseconds, default to 24 hours
    const olderThanMs = olderThan ? parseInt(olderThan) * 1000 : 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(Date.now() - olderThanMs);
    
    // List all files in temp directory
    const tempFiles = await objectStore.listFiles(`${ROOT_DIRS.PUBLIC}/${STORAGE_FOLDERS.TEMP}`);
    
    // Filter files older than cutoff
    const filesToDelete: string[] = [];
    
    for (const file of tempFiles) {
      // Extract timestamp from filename if possible
      const filename = path.basename(file);
      const timestampMatch = filename.match(/^(\d+)/);
      
      if (timestampMatch && timestampMatch[1]) {
        const fileTimestamp = parseInt(timestampMatch[1]);
        if (!isNaN(fileTimestamp) && new Date(fileTimestamp) < cutoffDate) {
          filesToDelete.push(file);
        }
      } else {
        // For files without timestamp in name, we can't reliably determine age
        // so we skip them
        console.log(`Skipping file without timestamp: ${file}`);
      }
    }
    
    // Delete the files
    const result = await objectStore.deleteFiles(filesToDelete);
    
    // Send success response with cleanup results
    sendSuccess(res, {
      cutoffDate,
      totalTempFiles: tempFiles.length,
      deletedCount: result.deleted.length,
      failedCount: result.failed.length,
      ...result
    });
  })
);

/**
 * Determine content type based on file extension
 */
function determineContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.svg':
      return 'image/svg+xml';
    case '.pdf':
      return 'application/pdf';
    case '.json':
      return 'application/json';
    case '.txt':
      return 'text/plain';
    case '.html':
      return 'text/html';
    case '.css':
      return 'text/css';
    case '.js':
      return 'application/javascript';
    default:
      return 'application/octet-stream';
  }
}

export default router;