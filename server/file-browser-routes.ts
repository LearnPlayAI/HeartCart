import { Request, Response, Router } from 'express';
import multer from 'multer';
import path from 'path';
import { enhancedObjectStorage, STORAGE_FOLDERS, logClientAPIMethods } from './objectstore-enhanced';
import { isAuthenticated } from './auth-middleware';
import { sanitizeFilename, getContentTypeFromFilename, generateUniqueFilename } from '../shared/utils/file-utils';

const router = Router();

/**
 * Get Client API Methods (diagnostic route)
 */
router.get('/api-methods', isAuthenticated, async (req: Request, res: Response) => {
  try {
    await logClientAPIMethods();
    return res.json({
      success: true,
      message: 'Client API methods logged to console. Check server logs.'
    });
  } catch (error) {
    console.error('Error checking API methods:', error);
    return res.status(500).json({ success: false, error: 'Failed to check API methods' });
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
    const buckets = enhancedObjectStorage.getAvailableBuckets();
    const currentBucket = enhancedObjectStorage.getCurrentBucket();
    
    res.json({
      success: true,
      data: {
        buckets,
        currentBucket
      }
    });
  } catch (error: any) {
    console.error('Error listing buckets:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list buckets'
    });
  }
});

/**
 * Set current bucket
 */
router.post('/buckets/set', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { bucketId } = req.body;
    
    if (!bucketId) {
      return res.status(400).json({
        success: false,
        error: 'Bucket ID is required'
      });
    }
    
    enhancedObjectStorage.setBucket(bucketId);
    
    res.json({
      success: true,
      data: {
        currentBucket: bucketId
      }
    });
  } catch (error: any) {
    console.error('Error setting bucket:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to set bucket'
    });
  }
});

/**
 * Get list of root folders
 */
router.get('/folders', isAuthenticated, async (req: Request, res: Response) => {
  try {
    await enhancedObjectStorage.initialize();
    const folders = await enhancedObjectStorage.listRootFolders();
    const currentBucket = enhancedObjectStorage.getCurrentBucket();
    
    res.json({
      success: true,
      data: {
        folders,
        currentBucket
      }
    });
  } catch (error: any) {
    console.error('Error listing root folders:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list root folders'
    });
  }
});

/**
 * Get subfolders in a directory
 */
router.get('/folders/:path/subfolders', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const folderPath = sanitizePath(req.params.path);
    
    await enhancedObjectStorage.initialize();
    const subfolders = await enhancedObjectStorage.listSubfolders(folderPath);
    
    res.json({
      success: true,
      data: {
        subfolders
      }
    });
  } catch (error: any) {
    console.error(`Error listing subfolders in '${req.params.path}':`, error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list subfolders'
    });
  }
});

/**
 * Get files in a directory
 */
router.get('/folders/:path/files', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const folderPath = sanitizePath(req.params.path);
    
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
    
    res.json({
      success: true,
      data: {
        files
      }
    });
  } catch (error: any) {
    console.error(`Error listing files in '${req.params.path}':`, error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list files'
    });
  }
});

/**
 * Create a new folder
 */
router.post('/folders', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { path: folderPath } = req.body;
    
    if (!folderPath) {
      return res.status(400).json({
        success: false,
        error: 'Folder path is required'
      });
    }
    
    const sanitizedPath = sanitizePath(folderPath);
    
    await enhancedObjectStorage.initialize();
    
    // Create a marker file to represent the folder
    const markerPath = `${sanitizedPath}/.folder`;
    const markerContent = Buffer.from(`Folder created at ${new Date().toISOString()}`);
    
    await enhancedObjectStorage.putFile(markerPath, markerContent, {
      contentType: 'text/plain'
    });
    
    res.json({
      success: true,
      data: {
        path: sanitizedPath
      }
    });
  } catch (error: any) {
    console.error('Error creating folder:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create folder'
    });
  }
});

/**
 * Get file (download or view)
 */
router.get('/files/:path(*)', async (req: Request, res: Response) => {
  try {
    const filePath = sanitizePath(req.params.path);
    
    await enhancedObjectStorage.initialize();
    
    // Check if file exists
    const exists = await enhancedObjectStorage.fileExists(filePath);
    if (!exists) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    // Get file metadata
    const metadata = await enhancedObjectStorage.getFileMetadata(filePath);
    
    // Get file content
    const fileContent = await enhancedObjectStorage.getFile(filePath);
    if (!fileContent) {
      return res.status(404).json({
        success: false,
        error: 'File content not found'
      });
    }
    
    // Set headers
    if (metadata?.contentType) {
      res.set('Content-Type', metadata.contentType);
    }
    
    if (metadata?.size) {
      res.set('Content-Length', metadata.size.toString());
    }
    
    // For download
    if (req.query.download === 'true') {
      const filename = path.basename(filePath);
      res.set('Content-Disposition', `attachment; filename="${filename}"`);
    }
    
    // Send file
    res.send(fileContent);
  } catch (error: any) {
    console.error(`Error retrieving file '${req.params.path}':`, error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve file'
    });
  }
});

/**
 * Download file (dedicated endpoint)
 */
router.get('/files/:path(*)/download', async (req: Request, res: Response) => {
  try {
    const filePath = sanitizePath(req.params.path);
    
    await enhancedObjectStorage.initialize();
    
    // Check if file exists
    const exists = await enhancedObjectStorage.fileExists(filePath);
    if (!exists) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    // Get file metadata
    const metadata = await enhancedObjectStorage.getFileMetadata(filePath);
    
    // Get file content
    const fileContent = await enhancedObjectStorage.getFile(filePath);
    if (!fileContent) {
      return res.status(404).json({
        success: false,
        error: 'File content not found'
      });
    }
    
    // Set headers
    if (metadata?.contentType) {
      res.set('Content-Type', metadata.contentType);
    }
    
    if (metadata?.size) {
      res.set('Content-Length', metadata.size.toString());
    }
    
    // Set download headers
    const filename = path.basename(filePath);
    res.set('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Send file
    res.send(fileContent);
  } catch (error: any) {
    console.error(`Error downloading file '${req.params.path}':`, error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to download file'
    });
  }
});

/**
 * Upload file
 */
router.post('/upload/:path(*)', isAuthenticated, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }
    
    const folderPath = sanitizePath(req.params.path);
    const originalFilename = req.file.originalname;
    
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
    
    res.json({
      success: true,
      data: {
        originalName: originalFilename,
        fileName: uniqueFilename,
        sanitizedName: sanitizedFilename,
        path: filePath,
        size: req.file.size,
        mimetype: contentType,
        url: `/api/file-browser/files/${filePath}`
      }
    });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload file'
    });
  }
});

/**
 * Delete file
 */
router.delete('/files/:path(*)', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const filePath = sanitizePath(req.params.path);
    
    await enhancedObjectStorage.initialize();
    
    // Check if file exists
    const exists = await enhancedObjectStorage.fileExists(filePath);
    if (!exists) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    // Delete file
    const deleted = await enhancedObjectStorage.deleteFile(filePath);
    
    if (!deleted) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete file'
      });
    }
    
    res.json({
      success: true,
      data: {
        path: filePath
      }
    });
  } catch (error: any) {
    console.error(`Error deleting file '${req.params.path}':`, error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete file'
    });
  }
});

export default router;