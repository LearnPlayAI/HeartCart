import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { isAuthenticated, isAdmin } from './auth-middleware';
import { objectStore } from './object-store';

const router = express.Router();

/**
 * Serve files from object storage
 * This handles both public and private files
 */
router.get('/:path(*)', async (req: Request, res: Response) => {
  try {
    const filePath = req.params.path;
    
    // Check if file exists
    const exists = await objectStore.exists(filePath);
    if (!exists) {
      console.error(`File not found: ${filePath}`);
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Get file data
    const { data: fileData, contentType } = await objectStore.getFileAsBuffer(filePath);
    
    // Set appropriate content type based on file extension or metadata
    const detectedContentType = contentType || determineContentType(filePath);
    res.setHeader('Content-Type', detectedContentType);
    
    // Set caching headers
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
    
    // Send file
    res.send(fileData);
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({ error: 'Error serving file' });
  }
});

/**
 * Legacy compatibility route for old image paths
 */
router.get('/object-storage/:folder/:subfolder/:filename', async (req: Request, res: Response) => {
  try {
    const { folder, subfolder, filename } = req.params;
    const filePath = `${folder}/${subfolder}/${filename}`;
    
    // Redirect to the new file path format
    res.redirect(`/api/files/${filePath}`);
  } catch (error) {
    console.error('Error in legacy file redirect:', error);
    res.status(500).json({ error: 'Error serving file' });
  }
});

/**
 * Access temporary files during product creation
 */
router.get('/temp/:productId/:filename', async (req: Request, res: Response) => {
  try {
    const { productId, filename } = req.params;
    const filePath = `${STORAGE_FOLDERS.TEMP}/${productId}/${filename}`;
    
    // Check if file exists
    const exists = await objectStore.exists(filePath);
    if (!exists) {
      console.error(`Temp file not found: ${filePath}`);
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Get file data
    const { data: fileData, contentType } = await objectStore.getFileAsBuffer(filePath);
    
    // Set appropriate content type
    const detectedContentType = contentType || determineContentType(filename);
    res.setHeader('Content-Type', detectedContentType);
    
    // Send file
    res.send(fileData);
  } catch (error) {
    console.error('Error serving temp file:', error);
    res.status(500).json({ error: 'Error serving file' });
  }
});

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