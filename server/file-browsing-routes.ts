/**
 * File Browser API Routes
 * 
 * These endpoints provide functionality for browsing the object storage
 * and are primarily used by the URL handling test component.
 */

import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from './api-response';
import { enhancedObjectStorage } from './objectstore-enhanced';

// Helper function for async handlers
const asyncHandler = (fn: Function) => (req: Request, res: Response) => {
  Promise.resolve(fn(req, res)).catch(err => {
    console.error('Error in async handler:', err);
    sendError(res, err.message || 'Internal server error', 500);
  });
};

// Admin check middleware
const isAuthenticatedAdmin = (req: Request, res: Response, next: Function) => {
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

export default router;