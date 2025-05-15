import { Request, Response, Router, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { enhancedObjectStorage, STORAGE_FOLDERS, logClientAPIMethods } from './objectstore-enhanced';
import { isAuthenticated, isAdmin } from './auth-middleware';
import { sanitizeFilename, getContentTypeFromFilename, generateUniqueFilename } from '../shared/utils/file-utils';
import { sendSuccess, sendError } from './api-response';
import { logger } from './logger';

const router = Router();

/**
 * File browser admin check middleware
 */
const fileBrowserAdminCheck = (req: Request, res: Response, next: NextFunction) => {
  // Check if user exists and has admin role
  const user = req.user as any;
  if (user && user.role === 'admin') {
    logger.debug('File browser admin check passed', { 
      userId: user.id,
      path: req.path,
      method: req.method
    });
    return next();
  } else {
    logger.warn('Unauthorized access attempt to file browser', {
      path: req.path,
      method: req.method,
      userId: user?.id || 'unauthenticated'
    });
    return sendError(res, 'Unauthorized access', 403, 'UNAUTHORIZED');
  }
};

/**
 * Get Client API Methods (diagnostic route)
 */
router.get('/api-methods', fileBrowserAdminCheck, async (req: Request, res: Response) => {
  try {
    logger.debug('Logging client API methods');
    await logClientAPIMethods();
    
    return sendSuccess(res, {
      message: 'Client API methods logged to console. Check server logs.'
    });
  } catch (error: any) {
    logger.error('Error checking API methods', { error });
    return sendError(res, 
      'Failed to check API methods', 
      500, 
      'API_METHOD_ERROR', 
      { message: error.message }
    );
  }
});

/**
 * Helper function to ensure valid path
 * Prevents path traversal attempts and other security issues
 */
function sanitizePath(inputPath: string): string {
  // Convert to posix path format
  const normalizedPath = inputPath.replace(/\\/g, '/');
  
  // Remove any leading or trailing slashes
  const trimmedPath = normalizedPath.replace(/^\/+|\/+$/g, '');
  
  // Remove any attempt to navigate up directories
  const safePath = trimmedPath.replace(/\.\.\//g, '').replace(/\/\.\./g, '');
  
  return safePath;
}

/**
 * Configure multer for file uploads
 */
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

/**
 * Get available buckets
 */
router.get('/buckets', isAuthenticated, async (req: Request, res: Response) => {
  try {
    logger.debug('Retrieving available storage buckets');
    
    const buckets = enhancedObjectStorage.getAvailableBuckets();
    const currentBucket = enhancedObjectStorage.getCurrentBucket();
    
    return sendSuccess(res, {
      buckets,
      currentBucket
    });
  } catch (error: any) {
    logger.error('Error listing storage buckets', { error });
    return sendError(res, 
      'Failed to list storage buckets', 
      500,
      'BUCKET_LIST_ERROR', 
      { message: error.message }
    );
  }
});

/**
 * Set current bucket
 */
router.post('/buckets/set', isAuthenticated, async (req: Request, res: Response) => {
  try {
    logger.debug('Setting current storage bucket');
    const { bucketId } = req.body;
    
    if (!bucketId) {
      return sendError(res, 'Bucket ID is required', 400, 'MISSING_BUCKET_ID');
    }
    
    enhancedObjectStorage.setBucket(bucketId);
    
    return sendSuccess(res, {
      currentBucket: bucketId
    });
  } catch (error: any) {
    logger.error('Error setting storage bucket', { error, bucketId: req.body?.bucketId });
    return sendError(res, 
      'Failed to set storage bucket', 
      500, 
      'BUCKET_SET_ERROR', 
      { message: error.message }
    );
  }
});

/**
 * Get list of root folders
 */
router.get('/folders', isAuthenticated, async (req: Request, res: Response) => {
  try {
    logger.debug('Listing root folders');
    
    await enhancedObjectStorage.initialize();
    const folders = await enhancedObjectStorage.listRootFolders();
    const currentBucket = enhancedObjectStorage.getCurrentBucket();
    
    return sendSuccess(res, {
      folders,
      currentBucket
    });
  } catch (error: any) {
    logger.error('Error listing root folders', { error });
    return sendError(res, 
      'Failed to list root folders', 
      500, 
      'FOLDER_LIST_ERROR', 
      { message: error.message }
    );
  }
});

/**
 * Get subfolders in a directory
 */
router.get('/folders/:path/subfolders', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const folderPath = sanitizePath(req.params.path);
    logger.debug('Listing subfolders', { folderPath });
    
    await enhancedObjectStorage.initialize();
    const subfolders = await enhancedObjectStorage.listSubfolders(folderPath);
    
    return sendSuccess(res, {
      subfolders,
      parentPath: folderPath
    });
  } catch (error: any) {
    logger.error(`Error listing subfolders`, { 
      folderPath: req.params.path,
      error
    });
    return sendError(res, 
      'Failed to list subfolders', 
      500, 
      'SUBFOLDER_LIST_ERROR', 
      { 
        path: req.params.path,
        message: error.message 
      }
    );
  }
});

/**
 * Get files in a directory
 */
router.get('/folders/:path/files', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const folderPath = sanitizePath(req.params.path || '');
    logger.debug('Listing files in folder', { folderPath });
    
    await enhancedObjectStorage.initialize();
    const filesList = await enhancedObjectStorage.listFiles(folderPath);
    
    // Get metadata for each file
    const files = await Promise.all(
      filesList.map(async (filename) => {
        const filePath = folderPath ? `${folderPath}/${filename}` : filename;
        const metadata = await enhancedObjectStorage.getFileMetadata(filePath);
        
        return {
          name: filename,
          path: filePath,
          url: `/api/file-browser/files/${filePath}`,
          size: metadata?.size,
          type: metadata?.contentType,
          lastModified: metadata?.lastModified ? metadata.lastModified.toISOString() : undefined
        };
      })
    );
    
    return sendSuccess(res, {
      files,
      parentPath: folderPath,
      totalCount: files.length
    });
  } catch (error: any) {
    logger.error(`Error listing files`, { 
      folderPath: req.params.path,
      error
    });
    return sendError(res, 
      'Failed to list files', 
      500, 
      'FILE_LIST_ERROR', 
      { 
        path: req.params.path,
        message: error.message 
      }
    );
  }
});

/**
 * Create a new folder
 */
router.post('/folders', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { path: folderPath } = req.body;
    
    if (!folderPath) {
      return sendError(res, 'Folder path is required', 400, 'MISSING_FOLDER_PATH');
    }
    
    const sanitizedPath = sanitizePath(folderPath);
    logger.debug('Creating new folder', { folderPath, sanitizedPath });
    
    await enhancedObjectStorage.initialize();
    
    // Create a marker file to represent the folder
    const markerPath = `${sanitizedPath}/.folder`;
    const markerContent = Buffer.from(`Folder created at ${new Date().toISOString()}`);
    
    await enhancedObjectStorage.putFile(markerPath, markerContent, {
      contentType: 'text/plain'
    });
    
    return sendSuccess(res, {
      path: sanitizedPath,
      created: true,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Error creating folder', { 
      folderPath: req.body.path,
      error
    });
    return sendError(res, 
      'Failed to create folder', 
      500, 
      'FOLDER_CREATE_ERROR', 
      { 
        path: req.body.path,
        message: error.message 
      }
    );
  }
});

/**
 * Get file (download or view)
 */
router.get('/files/:path(*)', async (req: Request, res: Response) => {
  try {
    const filePath = sanitizePath(req.params.path);
    logger.debug('Retrieving file', { filePath });
    
    await enhancedObjectStorage.initialize();
    
    // Check if file exists
    const exists = await enhancedObjectStorage.fileExists(filePath);
    if (!exists) {
      logger.warn('File not found', { filePath });
      return sendError(res, 'File not found', 404, 'FILE_NOT_FOUND');
    }
    
    // Get file metadata
    const metadata = await enhancedObjectStorage.getFileMetadata(filePath);
    
    // Get file content
    const fileContent = await enhancedObjectStorage.getFile(filePath);
    if (!fileContent) {
      logger.warn('File content not found', { filePath });
      return sendError(res, 'File content not found', 404, 'FILE_CONTENT_NOT_FOUND');
    }
    
    // Set headers
    if (metadata?.contentType) {
      res.set('Content-Type', metadata.contentType);
    }
    
    if (metadata?.size) {
      res.set('Content-Length', metadata.size.toString());
    }
    
    // Set cache control for improved performance
    res.set('Cache-Control', 'public, max-age=3600'); // 1 hour cache
    
    // For download
    if (req.query.download === 'true') {
      const filename = path.basename(filePath);
      res.set('Content-Disposition', `attachment; filename="${filename}"`);
    }
    
    // Send file
    res.send(fileContent);
  } catch (error: any) {
    logger.error(`Error retrieving file`, { 
      filePath: req.params.path,
      error
    });
    return sendError(res, 
      'Failed to retrieve file', 
      500, 
      'FILE_RETRIEVAL_ERROR', 
      { message: error.message }
    );
  }
});

/**
 * Download file (dedicated endpoint)
 */
router.get('/files/:path(*)/download', async (req: Request, res: Response) => {
  try {
    const filePath = sanitizePath(req.params.path);
    logger.debug('Downloading file', { filePath });
    
    await enhancedObjectStorage.initialize();
    
    // Check if file exists
    const exists = await enhancedObjectStorage.fileExists(filePath);
    if (!exists) {
      logger.warn('File not found for download', { filePath });
      return sendError(res, 'File not found', 404, 'FILE_NOT_FOUND');
    }
    
    // Get file metadata
    const metadata = await enhancedObjectStorage.getFileMetadata(filePath);
    
    // Get file content
    const fileContent = await enhancedObjectStorage.getFile(filePath);
    if (!fileContent) {
      logger.warn('File content not found for download', { filePath });
      return sendError(res, 'File content not found', 404, 'FILE_CONTENT_NOT_FOUND');
    }
    
    // Set basic headers
    if (metadata?.contentType) {
      res.set('Content-Type', metadata.contentType);
    }
    
    if (metadata?.size) {
      res.set('Content-Length', metadata.size.toString());
    }
    
    // Set download-specific headers
    const filename = path.basename(filePath);
    res.set('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Set cache control for improved performance
    res.set('Cache-Control', 'private, max-age=3600'); // 1 hour cache
    
    // Log download event
    logger.debug('File download initiated', { 
      filePath, 
      size: metadata?.size,
      contentType: metadata?.contentType 
    });
    
    // Send file directly to client
    res.send(fileContent);
  } catch (error: any) {
    logger.error('Error downloading file', { 
      filePath: req.params.path,
      error
    });
    return sendError(res, 
      'Failed to download file', 
      500, 
      'FILE_DOWNLOAD_ERROR', 
      { message: error.message }
    );
  }
});

/**
 * Upload file
 */
router.post('/upload/:path(*)', isAuthenticated, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return sendError(res, 'No file provided', 400, 'FILE_MISSING');
    }
    
    const folderPath = sanitizePath(req.params.path);
    const originalFilename = req.file.originalname;
    
    logger.debug('Processing file upload', { 
      folderPath, 
      originalFilename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
    
    // Sanitize filename using utility function
    const sanitizedFilename = sanitizeFilename(originalFilename);
    
    // Generate unique filename to prevent overwrites
    const uniqueFilename = generateUniqueFilename(originalFilename);
    
    // Create full path
    const filePath = folderPath ? `${folderPath}/${uniqueFilename}` : uniqueFilename;
    
    await enhancedObjectStorage.initialize();
    
    // Get auto-detected content type if not provided by multer
    const contentType = req.file.mimetype || getContentTypeFromFilename(uniqueFilename) || 'application/octet-stream';
    
    // Upload file with proper content type
    await enhancedObjectStorage.putFile(filePath, req.file.buffer, {
      contentType
    });
    
    logger.debug('File upload successful', { filePath, size: req.file.size });
    
    return sendSuccess(res, {
      originalName: originalFilename,
      fileName: uniqueFilename,
      sanitizedName: sanitizedFilename,
      path: filePath,
      size: req.file.size,
      mimetype: contentType,
      url: `/api/file-browser/files/${filePath}`,
      bucket: enhancedObjectStorage.getCurrentBucket()
    }, 201); // Created status code
  } catch (error: any) {
    logger.error('Error uploading file', { 
      folderPath: req.params.path,
      filename: req.file?.originalname,
      error
    });
    return sendError(res, 
      'Failed to upload file', 
      500, 
      'FILE_UPLOAD_ERROR', 
      { message: error.message }
    );
  }
});

/**
 * Delete file
 */
router.delete('/files/:path(*)', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const filePath = sanitizePath(req.params.path);
    logger.debug('Deleting file', { filePath });
    
    await enhancedObjectStorage.initialize();
    
    // Check if file exists
    const exists = await enhancedObjectStorage.fileExists(filePath);
    if (!exists) {
      logger.warn('File not found for deletion', { filePath });
      return sendError(res, 'File not found', 404, 'FILE_NOT_FOUND');
    }
    
    // Get file metadata before deletion (for response)
    const metadata = await enhancedObjectStorage.getFileMetadata(filePath);
    
    // Delete file
    const deleted = await enhancedObjectStorage.deleteFile(filePath);
    
    if (!deleted) {
      logger.error('File deletion failed', { filePath });
      return sendError(res, 'Failed to delete file', 500, 'FILE_DELETE_FAILED');
    }
    
    logger.debug('File deleted successfully', { filePath });
    
    return sendSuccess(res, {
      path: filePath,
      deleted: true,
      size: metadata?.size,
      type: metadata?.contentType,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Error deleting file', { 
      filePath: req.params.path,
      error
    });
    return sendError(res, 
      'Failed to delete file', 
      500, 
      'FILE_DELETE_ERROR', 
      { message: error.message }
    );
  }
});

export default router;