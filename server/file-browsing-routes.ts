/**
 * File Management API Routes
 * 
 * These endpoints provide comprehensive functionality for managing files in object storage,
 * including browsing, uploading, downloading, and deleting files.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { sendSuccess, sendError } from './api-response';
import { enhancedObjectStorage } from './objectstore-enhanced';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Set up multer for file uploads to temp directory
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(__dirname, '../temp-uploads');
    // Create the directory if it doesn't exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    // Generate a unique filename to prevent collisions
    const uniqueFilename = `${Date.now()}-${uuidv4()}-${file.originalname.replace(/\s+/g, '-')}`;
    cb(null, uniqueFilename);
  }
});

const upload = multer({ storage });

// Helper function for async handlers
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(err => {
    console.error('Error in async handler:', err);
    sendError(res, err.message || 'Internal server error', 500);
  });
};

// Admin check middleware
const isAuthenticatedAdmin = (req: Request, res: Response, next: NextFunction) => {
  // For development, we'll allow all requests
  // In production, this would check user roles
  next();
};

const router = Router();

/**
 * List all root folders in the object storage
 */
router.get('/folders', 
  isAuthenticatedAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      // List all root folders from object storage
      const folders = await enhancedObjectStorage.listRootFolders();
      sendSuccess(res, { folders });
    } catch (error) {
      console.error('Error listing folders:', error);
      sendError(res, 'Failed to list folders', 500);
    }
  })
);

/**
 * Create a new folder in the object storage
 */
router.post('/folders', 
  isAuthenticatedAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { path } = req.body;
      
      if (!path) {
        return sendError(res, 'Folder path is required', 400);
      }
      
      // Sanitize folder path by removing leading and trailing slashes
      const sanitizedPath = path.replace(/^\/+|\/+$/g, '');
      
      // Create a marker file to represent the folder
      const markerPath = `${sanitizedPath}/.folder_marker`;
      const success = await enhancedObjectStorage.putFile(markerPath, Buffer.from('Folder marker'));
      
      if (success) {
        sendSuccess(res, { message: 'Folder created successfully', path: sanitizedPath });
      } else {
        sendError(res, 'Failed to create folder', 500);
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      sendError(res, 'Failed to create folder', 500);
    }
  })
);

/**
 * List all files within a specific folder
 */
router.get('/folders/:folderPath(*)/files', 
  isAuthenticatedAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { folderPath } = req.params;
      
      if (!folderPath) {
        return sendError(res, 'Folder path is required', 400);
      }
      
      // Sanitize folder path by removing leading and trailing slashes
      const sanitizedPath = folderPath.replace(/^\/+|\/+$/g, '');
      
      // List files in the folder
      const files = await enhancedObjectStorage.listFiles(sanitizedPath);
      
      // Transform to include full path and URL for each file
      const fileObjects = files.map((file: string) => {
        const fullPath = `${sanitizedPath}/${file}`;
        return {
          name: file,
          path: fullPath,
          url: `/api/files/${fullPath}`
        };
      });
      
      sendSuccess(res, { files: fileObjects });
    } catch (error) {
      console.error(`Error listing files in folder ${req.params.folderPath}:`, error);
      sendError(res, 'Failed to list files in folder', 500);
    }
  })
);

/**
 * List subfolders within a specific folder
 */
router.get('/folders/:folderPath(*)/subfolders', 
  isAuthenticatedAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { folderPath } = req.params;
      
      if (!folderPath) {
        return sendError(res, 'Folder path is required', 400);
      }
      
      // Sanitize folder path by removing leading and trailing slashes
      const sanitizedPath = folderPath.replace(/^\/+|\/+$/g, '');
      
      // List subfolders in the folder
      const subfolders = await enhancedObjectStorage.listSubfolders(sanitizedPath);
      
      sendSuccess(res, { subfolders });
    } catch (error) {
      console.error(`Error listing subfolders in ${req.params.folderPath}:`, error);
      sendError(res, 'Failed to list subfolders', 500);
    }
  })
);

/**
 * Upload a file to a specific folder
 */
router.post('/upload/:folderPath(*)', 
  isAuthenticatedAdmin,
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return sendError(res, 'No file uploaded', 400);
      }
      
      const { folderPath } = req.params;
      const sanitizedFolderPath = folderPath ? folderPath.replace(/^\/+|\/+$/g, '') : '';
      
      // Generate a sanitized filename (replace spaces with hyphens)
      const originalFilename = req.file.originalname;
      const sanitizedFilename = originalFilename.replace(/\s+/g, '-');
      
      // Full path where the file will be stored
      const fullPath = sanitizedFolderPath 
        ? `${sanitizedFolderPath}/${sanitizedFilename}`
        : sanitizedFilename;
      
      // Read the file from the temp location
      const fileBuffer = fs.readFileSync(req.file.path);
      
      // Determine content type based on file extension
      const contentType = req.file.mimetype || 'application/octet-stream';
      
      // Upload the file to object storage
      const success = await enhancedObjectStorage.putFile(fullPath, fileBuffer, {
        contentType,
        filename: sanitizedFilename
      });
      
      // Delete the temporary file
      fs.unlinkSync(req.file.path);
      
      if (success) {
        sendSuccess(res, { 
          message: 'File uploaded successfully',
          file: {
            name: sanitizedFilename,
            path: fullPath,
            url: `/api/files/${fullPath}`,
            size: req.file.size,
            type: contentType
          }
        });
      } else {
        sendError(res, 'Failed to upload file to object storage', 500);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      
      // Cleanup temp file if it exists
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      sendError(res, 'Failed to upload file', 500);
    }
  })
);

/**
 * Get file details
 */
router.get('/files/:filePath(*)/details', 
  isAuthenticatedAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { filePath } = req.params;
      
      if (!filePath) {
        return sendError(res, 'File path is required', 400);
      }
      
      // Sanitize file path
      const sanitizedPath = filePath.replace(/^\/+|\/+$/g, '');
      
      // Get file metadata
      const metadata = await enhancedObjectStorage.getFileMetadata(sanitizedPath);
      
      if (!metadata) {
        return sendError(res, 'File not found', 404);
      }
      
      sendSuccess(res, { 
        file: {
          name: path.basename(sanitizedPath),
          path: sanitizedPath,
          url: `/api/files/${sanitizedPath}`,
          size: metadata.size,
          type: metadata.contentType,
          lastModified: metadata.lastModified
        }
      });
    } catch (error) {
      console.error(`Error getting file details for ${req.params.filePath}:`, error);
      sendError(res, 'Failed to get file details', 500);
    }
  })
);

/**
 * Download a file
 */
router.get('/files/:filePath(*)/download', 
  isAuthenticatedAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { filePath } = req.params;
      
      if (!filePath) {
        return sendError(res, 'File path is required', 400);
      }
      
      // Sanitize file path
      const sanitizedPath = filePath.replace(/^\/+|\/+$/g, '');
      
      // Get file data
      const fileData = await enhancedObjectStorage.getFile(sanitizedPath);
      
      if (!fileData) {
        return sendError(res, 'File not found', 404);
      }
      
      // Get metadata for content type
      const metadata = await enhancedObjectStorage.getFileMetadata(sanitizedPath);
      const filename = path.basename(sanitizedPath);
      
      // Set appropriate headers
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', metadata?.contentType || 'application/octet-stream');
      
      // Send the file
      res.send(fileData);
    } catch (error) {
      console.error(`Error downloading file ${req.params.filePath}:`, error);
      sendError(res, 'Failed to download file', 500);
    }
  })
);

/**
 * Delete a file
 */
router.delete('/files/:filePath(*)', 
  isAuthenticatedAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { filePath } = req.params;
      
      if (!filePath) {
        return sendError(res, 'File path is required', 400);
      }
      
      // Sanitize file path
      const sanitizedPath = filePath.replace(/^\/+|\/+$/g, '');
      
      // Delete the file
      const success = await enhancedObjectStorage.deleteFile(sanitizedPath);
      
      if (success) {
        sendSuccess(res, { message: 'File deleted successfully' });
      } else {
        sendError(res, 'Failed to delete file', 500);
      }
    } catch (error) {
      console.error(`Error deleting file ${req.params.filePath}:`, error);
      sendError(res, 'Failed to delete file', 500);
    }
  })
);

export default router;