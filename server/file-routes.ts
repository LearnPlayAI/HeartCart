import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { isAuthenticated, isAdmin } from './auth-middleware';
import { objectStore, STORAGE_FOLDERS } from './object-store';
import { sendSuccess, sendError } from './api-response';
import { withStandardResponse } from './response-wrapper';

const router = express.Router();

/**
 * Serve files from object storage
 * This handles both public and private files
 */
router.get('/:path(*)', async (req: Request, res: Response) => {
  try {
    // Decode the path parameter to handle URL-encoded characters
    const filePath = decodeURIComponent(req.params.path);
    
    console.log(`Serving file: ${filePath}`);
    
    // Check if file exists
    const exists = await objectStore.exists(filePath);
    if (!exists) {
      console.error(`File not found: ${filePath}`);
      return sendError(res, 'File not found', 404);
    }
    
    // Get file data
    const { data: fileData, contentType } = await objectStore.getFileAsBuffer(filePath);
    
    // Set appropriate content type based on file extension or metadata
    const detectedContentType = contentType || determineContentType(filePath);
    res.setHeader('Content-Type', detectedContentType);
    
    // Set caching headers
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
    
    // Add CORS headers for image requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    
    // Send file
    res.send(fileData);
  } catch (error) {
    console.error('Error serving file:', error);
    sendError(res, 'Error serving file', 500);
  }
});

/**
 * Legacy compatibility route for old image paths
 */
router.get('/object-storage/:folder/:subfolder/:filename', async (req: Request, res: Response) => {
  try {
    // Decode the path parameters to handle URL-encoded characters
    const folder = decodeURIComponent(req.params.folder);
    const subfolder = decodeURIComponent(req.params.subfolder);
    const filename = decodeURIComponent(req.params.filename);
    const filePath = `${folder}/${subfolder}/${filename}`;
    
    console.log(`Redirecting legacy file path: ${filePath}`);
    
    // Redirect to the new file path format with proper encoding
    const encodedPath = `${encodeURIComponent(folder)}/${encodeURIComponent(subfolder)}/${encodeURIComponent(filename)}`;
    res.redirect(`/api/files/${encodedPath}`);
  } catch (error) {
    console.error('Error in legacy file redirect:', error);
    sendError(res, 'Error serving file', 500);
  }
});

/**
 * Access temporary files during product creation
 */
router.get('/temp/:productId/:filename', async (req: Request, res: Response) => {
  try {
    // Decode the path parameters to handle URL-encoded characters
    const productId = decodeURIComponent(req.params.productId);
    const filename = decodeURIComponent(req.params.filename);
    const filePath = `${STORAGE_FOLDERS.TEMP}/${productId}/${filename}`;
    
    console.log(`Serving temp file: ${filePath}`);
    
    // Check if file exists
    const exists = await objectStore.exists(filePath);
    if (!exists) {
      console.error(`Temp file not found: ${filePath}`);
      return sendError(res, 'File not found', 404);
    }
    
    // Get file data
    const { data: fileData, contentType } = await objectStore.getFileAsBuffer(filePath);
    
    // Set appropriate content type
    const detectedContentType = contentType || determineContentType(filename);
    res.setHeader('Content-Type', detectedContentType);
    
    // Add CORS headers for image requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    
    // Send file
    res.send(fileData);
  } catch (error) {
    console.error('Error serving temp file:', error);
    sendError(res, 'Error serving file', 500);
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