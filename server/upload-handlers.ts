import { Request, Response, Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { objectStore, STORAGE_FOLDERS } from './object-store';
import { isAuthenticated, isAdmin } from './auth-middleware';

const router = Router();

// Memory storage for multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

/**
 * Upload temporary product images
 * This handles images during product creation before a product ID exists
 */
router.post('/products/images/temp', isAdmin, upload.array('images', 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No files uploaded' 
      });
    }
    
    console.log(`Processing ${files.length} temporary product image(s)`);
    
    const results = await Promise.all(files.map(async (file, index) => {
      try {
        // Process image with sharp for optimization
        const processedImageBuffer = await sharp(file.buffer)
          .resize({ 
            width: 1200,
            height: 1200,
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 85, progressive: true })
          .toBuffer();
        
        // Upload to object store as temporary file
        const { url, objectKey } = await objectStore.uploadTempFile(
          processedImageBuffer,
          file.originalname,
          'pending',
          'image/jpeg'
        );
        
        return {
          url,
          objectKey,
          originalName: file.originalname,
          size: processedImageBuffer.length,
          index
        };
      } catch (error) {
        console.error(`Error processing file ${file.originalname}:`, error);
        throw error;
      }
    }));
    
    res.status(200).json({ 
      success: true, 
      files: results 
    });
  } catch (error) {
    console.error('Error processing uploaded files:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error processing uploaded files', 
      error: error.message || String(error) 
    });
  }
});

/**
 * Upload product images for an existing product
 */
router.post('/products/:productId/images', isAdmin, upload.array('images', 10), async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No files uploaded' 
      });
    }
    
    if (!productId || isNaN(parseInt(productId))) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid product ID' 
      });
    }
    
    console.log(`Processing ${files.length} image(s) for product ${productId}`);
    
    const results = await Promise.all(files.map(async (file, index) => {
      try {
        // Process image with sharp for optimization
        const processedImageBuffer = await sharp(file.buffer)
          .resize({ 
            width: 1200,
            height: 1200,
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 85, progressive: true })
          .toBuffer();
        
        // Generate thumbnails
        const thumbnailBuffer = await sharp(processedImageBuffer)
          .resize({ 
            width: 300,
            height: 300,
            fit: 'cover'
          })
          .jpeg({ quality: 80 })
          .toBuffer();
        
        // Upload main image
        const { url, objectKey } = await objectStore.uploadProductImage(
          parseInt(productId),
          processedImageBuffer,
          file.originalname,
          'image/jpeg'
        );
        
        // Upload thumbnail with similar key pattern
        const thumbnailKey = objectKey.replace('/images/', '/thumbnails/');
        await objectStore.uploadBuffer(
          thumbnailKey,
          thumbnailBuffer,
          {
            contentType: 'image/jpeg',
            cacheControl: 'public, max-age=86400',
            filename: `thumb_${file.originalname}`
          }
        );
        
        const thumbnailUrl = objectStore.getPublicUrl(thumbnailKey);
        
        return {
          url,
          objectKey,
          thumbnailUrl,
          thumbnailKey,
          originalName: file.originalname,
          size: processedImageBuffer.length,
          index
        };
      } catch (error) {
        console.error(`Error processing file ${file.originalname}:`, error);
        throw error;
      }
    }));
    
    res.status(200).json({ 
      success: true, 
      files: results 
    });
  } catch (error) {
    console.error('Error processing uploaded files:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error processing uploaded files', 
      error: error.message || String(error) 
    });
  }
});

/**
 * Move a temporary file to a permanent location
 */
router.post('/products/images/move', isAdmin, async (req: Request, res: Response) => {
  try {
    const { sourceKey, productId } = req.body;
    
    if (!sourceKey) {
      return res.status(400).json({ 
        success: false, 
        message: 'Source key is required' 
      });
    }
    
    if (!productId || isNaN(parseInt(productId))) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid product ID is required' 
      });
    }
    
    // Check if source file exists
    const exists = await objectStore.exists(sourceKey);
    if (!exists) {
      return res.status(404).json({ 
        success: false, 
        message: 'Source file not found' 
      });
    }
    
    // Get source file buffer and content type
    const { data: fileBuffer, contentType } = await objectStore.getFileAsBuffer(sourceKey);
    
    // Extract original filename from the source key
    const originalFilename = sourceKey.split('/').pop() || 'image.jpg';
    
    // Upload to the permanent location
    const { url, objectKey } = await objectStore.uploadProductImage(
      parseInt(productId),
      fileBuffer,
      originalFilename,
      contentType
    );
    
    // Generate thumbnail
    const thumbnailBuffer = await sharp(fileBuffer)
      .resize({ 
        width: 300,
        height: 300,
        fit: 'cover'
      })
      .jpeg({ quality: 80 })
      .toBuffer();
    
    // Upload thumbnail
    const thumbnailKey = objectKey.replace('/images/', '/thumbnails/');
    await objectStore.uploadBuffer(
      thumbnailKey,
      thumbnailBuffer,
      {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=86400',
        filename: `thumb_${originalFilename}`
      }
    );
    
    const thumbnailUrl = objectStore.getPublicUrl(thumbnailKey);
    
    // Delete the temporary file
    await objectStore.deleteFile(sourceKey);
    
    res.status(200).json({
      success: true,
      url,
      objectKey,
      thumbnailUrl,
      thumbnailKey
    });
  } catch (error) {
    console.error('Error moving file:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error moving file', 
      error: error.message || String(error) 
    });
  }
});

/**
 * Delete a file from object storage
 */
router.delete('/:objectKey(*)', isAdmin, async (req: Request, res: Response) => {
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
    
    // Delete the file
    await objectStore.deleteFile(objectKey);
    
    // If it's a product image, try to delete the thumbnail too
    if (objectKey.includes('/images/')) {
      const thumbnailKey = objectKey.replace('/images/', '/thumbnails/');
      if (await objectStore.exists(thumbnailKey)) {
        await objectStore.deleteFile(thumbnailKey);
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting file', 
      error: error.message || String(error) 
    });
  }
});

export default router;