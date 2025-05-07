import { Request, Response, Router } from 'express';
import path from 'path';
import { objectStore } from './object-store';

const router = Router();

/**
 * Serve files from object storage
 * Uses buffer-based approach to avoid streaming issues
 */
router.get('/:filename(*)', async (req: Request, res: Response) => {
  try {
    const filename = req.params.filename;
    console.log(`Serving file: ${filename}`);
    
    // Check if file exists
    const exists = await objectStore.exists(filename);
    if (!exists) {
      console.log(`File not found: ${filename}`);
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    
    // Get file content as buffer (not stream)
    const { data: fileBuffer, contentType } = await objectStore.getFileAsBuffer(filename);
    
    // Set content type and caching headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    
    // Send the file
    res.send(fileBuffer);
  } catch (error) {
    console.error("Error serving file:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error serving file", 
      error: error.message || String(error) 
    });
  }
});

export default router;