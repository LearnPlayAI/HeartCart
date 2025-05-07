import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import { objectStore, STORAGE_FOLDERS } from './object-store';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

/**
 * Upload temporary product images
 * This handles images during product creation before a product ID exists
 */
router.post('/products/images/temp', upload.array('images', 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }
    
    const results = await Promise.all(files.map(async (file) => {
      const { originalname, buffer, mimetype } = file;
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const filename = `${timestamp}_${randomString}_${originalname}`;
      const productId = req.body.productId || 'pending';
      
      // Upload to temp folder first
      const { url, objectKey } = await objectStore.uploadTempFile(
        buffer,
        filename,
        productId,
        mimetype
      );
      
      return {
        url,
        objectKey,
        originalname,
        filename
      };
    }));
    
    res.json({ success: true, files: results });
  } catch (error) {
    console.error('Error uploading temp images:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error uploading images',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Upload product images for an existing product
 */
router.post('/products/:productId/images', upload.array('images', 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    const productId = parseInt(req.params.productId);
    
    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }
    
    if (isNaN(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }
    
    const results = await Promise.all(files.map(async (file) => {
      const { originalname, buffer, mimetype } = file;
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const filename = `${timestamp}_${randomString}_${originalname}`;
      
      // Upload directly to product folder
      const { url, objectKey } = await objectStore.uploadProductFile(
        buffer,
        filename,
        productId,
        mimetype
      );
      
      return {
        url,
        objectKey,
        originalname,
        filename
      };
    }));
    
    res.json({ success: true, files: results });
  } catch (error) {
    console.error('Error uploading product images:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error uploading images',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Move a temporary file to a permanent location
 */
router.post('/products/images/move', async (req: Request, res: Response) => {
  try {
    const { sourceKey, productId } = req.body;
    
    if (!sourceKey || !productId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Source key and product ID are required' 
      });
    }
    
    // Move file from temp to product folder
    const result = await objectStore.moveFromTemp(sourceKey, parseInt(productId));
    
    res.json({ 
      success: true, 
      url: result.url, 
      objectKey: result.objectKey 
    });
  } catch (error) {
    console.error('Error moving file:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error moving file',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Delete a file from object storage
 */
router.delete('/:objectKey(*)', async (req: Request, res: Response) => {
  try {
    const { objectKey } = req.params;
    
    if (!objectKey) {
      return res.status(400).json({ 
        success: false, 
        message: 'Object key is required' 
      });
    }
    
    // Check if file exists
    const exists = await objectStore.exists(objectKey);
    if (!exists) {
      return res.status(404).json({ 
        success: false, 
        message: 'File not found' 
      });
    }
    
    // Delete file
    await objectStore.deleteFile(objectKey);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting file',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;