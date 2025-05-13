/**
 * File Routes
 * 
 * Handles all file upload endpoints for product images, including:
 * - Temporary uploads for pending products
 * - Moving files from temp to permanent locations
 * - Image optimization and processing
 */

import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { objectStore, STORAGE_FOLDERS } from './object-store';
import { isAuthenticated } from './auth-middleware';
import { storage } from './storage';
import { productImages } from '@shared/schema';

// Create a router
const router = express.Router();

// Configure multer to store files in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  }
});

// Helper function to send standard responses
const sendResponse = (res: Response, data: any, status = 200, message = '') => {
  res.status(status).json({
    success: true,
    data,
    message,
  });
};

// Helper function to send error responses
const sendError = (res: Response, message: string, status = 400) => {
  res.status(status).json({
    success: false,
    error: message,
  });
};

// Middleware to catch async errors
const catchErrors = (fn: Function) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      console.error('Error in route handler:', error);
      
      // Get error message
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      
      // Send error response
      sendError(res, message, 500);
    }
  };
};

/**
 * General file upload endpoint
 * 
 * Used as a universal file upload handler with folder specification
 */
router.post(
  '/upload',
  isAuthenticated,
  upload.single('file'),
  catchErrors(async (req: Request, res: Response) => {
    if (!req.file) {
      return sendError(res, 'No file uploaded', 400);
    }
    
    // Default to 'temp/pending' folder if none specified
    const folder = req.body.folder || `${STORAGE_FOLDERS.TEMP}/pending`;
    
    // Process the image for optimization
    const processedBuffer = await objectStore.processImage(req.file.buffer, {
      width: 1200,
      height: 1200,
      fit: 'inside',
      withoutEnlargement: true,
      quality: 85,
      autoRotate: true
    });
    
    // Generate a unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const originalName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}_${randomString}_${originalName}`;
    
    // Upload the file
    const result = await objectStore.uploadFromBuffer(
      processedBuffer,
      `${folder}/${filename}`,
      {
        contentType: req.file.mimetype,
        metadata: {
          originalname: req.file.originalname,
          size: String(req.file.size),
          processed: 'true'
        }
      }
    );
    
    // Get the public URL
    const url = result.url;
    const objectKey = result.objectKey;
    
    // Create absolute URL for client
    const absoluteUrl = req.protocol + '://' + req.get('host') + url;
    
    // Send response with both relative and absolute URLs
    sendResponse(res, {
      url, // Relative URL
      absoluteUrl, // Absolute URL
      objectKey,
      originalname: req.file.originalname,
      size: req.file.size,
    });
  })
);

/**
 * Product Image Upload Route - Temporary Storage
 * 
 * Handles multiple file uploads for product images during the product creation process.
 * Stores images in temporary location until the product is created.
 */
router.post(
  '/products/images/temp',
  isAuthenticated,
  upload.array('images', 10),
  catchErrors(async (req: Request, res: Response) => {
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
          width: 1200,
          height: 1200,
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
        
        // Create absolute URL for client
        const absoluteUrl = req.protocol + '://' + req.get('host') + result.url;
        
        return {
          id: index, // Temp ID for client reference
          url: result.url, // Relative URL
          absoluteUrl, // Absolute URL
          objectKey: result.objectKey,
          filename: file.originalname,
          size: file.size,
        };
      } catch (error) {
        console.error(`Error processing image ${index}:`, error);
        return {
          id: index,
          error: error instanceof Error ? error.message : 'Unknown error',
          filename: file.originalname,
        };
      }
    }));
    
    // Check if any files failed to upload
    const failedUploads = uploadResults.filter(result => 'error' in result);
    
    if (failedUploads.length > 0 && failedUploads.length === files.length) {
      // All uploads failed
      return sendError(res, 'All image uploads failed', 500);
    }
    
    // Send response with success=true even if some uploads failed
    sendResponse(
      res,
      {
        files: uploadResults,
        totalUploaded: uploadResults.length - failedUploads.length,
        totalFailed: failedUploads.length,
      },
      200,
      failedUploads.length > 0
        ? `${failedUploads.length} of ${files.length} images failed to upload`
        : 'All images uploaded successfully'
    );
  })
);

/**
 * Move images from temporary to permanent storage
 * 
 * Used after a product is created to move images from temp to the product folder
 */
router.post(
  '/products/images/move',
  isAuthenticated,
  catchErrors(async (req: Request, res: Response) => {
    const { sourceKeys, productId, productName, categoryId, catalogId } = req.body;
    
    if (!sourceKeys || !Array.isArray(sourceKeys) || sourceKeys.length === 0) {
      return sendError(res, 'No source keys provided', 400);
    }
    
    if (!productId) {
      return sendError(res, 'Product ID is required', 400);
    }
    
    // Get catalog and category info for proper path structure
    const catalog = catalogId ? await storage.getCatalogById(catalogId) : null;
    const category = categoryId ? await storage.getCategoryById(categoryId) : null;
    
    // Get supplier from catalog
    const supplier = catalog?.supplierId 
      ? await storage.getSupplierById(catalog.supplierId)
      : null;
    
    // Sanitized names for path
    const supplierName = supplier?.name || 'unknown-supplier';
    const catalogName = catalog?.name || 'unknown-catalog';
    const categoryName = category?.name || 'uncategorized';
    const sanitizedProductName = productName?.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() || 'product';
    
    // Move each file
    const moveResults = await Promise.all(sourceKeys.map(async (sourceKey: string, index: number) => {
      try {
        // Move file to final location
        const result = await objectStore.moveToFinalLocation(
          sourceKey,
          supplierName,
          catalogName,
          categoryName,
          sanitizedProductName,
          productId.toString()
        );
        
        // Create product image record
        const imageRecord = await storage.createProductImage({
          productId,
          url: result.url,
          objectKey: result.objectKey,
          isMain: index === 0, // First image is main by default
          sortOrder: index,
        });
        
        // Create absolute URL for client
        const absoluteUrl = req.protocol + '://' + req.get('host') + result.url;
        
        return {
          id: imageRecord.id,
          url: result.url,
          absoluteUrl,
          objectKey: result.objectKey,
          isMain: imageRecord.isMain,
        };
      } catch (error) {
        console.error(`Error moving image ${sourceKey}:`, error);
        return {
          sourceKey,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }));
    
    // Check if any files failed to move
    const failedMoves = moveResults.filter(result => 'error' in result);
    
    if (failedMoves.length > 0 && failedMoves.length === sourceKeys.length) {
      // All moves failed
      return sendError(res, 'All image moves failed', 500);
    }
    
    // Send response
    sendResponse(
      res,
      {
        images: moveResults.filter(result => !('error' in result)),
        failedMoves,
        totalMoved: moveResults.length - failedMoves.length,
        totalFailed: failedMoves.length,
      },
      200,
      failedMoves.length > 0
        ? `${failedMoves.length} of ${sourceKeys.length} images failed to move`
        : 'All images moved successfully'
    );
  })
);

/**
 * Validate image before upload
 * 
 * Used to check if an image meets requirements before upload
 */
router.post(
  '/images/validate',
  isAuthenticated,
  upload.single('image'),
  catchErrors(async (req: Request, res: Response) => {
    if (!req.file) {
      return sendError(res, 'No image file provided', 400);
    }
    
    // Validate the image
    const validationResult = await objectStore.validateImage(
      req.file.buffer,
      req.file.originalname
    );
    
    // Return validation result
    sendResponse(res, {
      valid: validationResult.valid,
      validation: validationResult,
      recommendations: validationResult.valid 
        ? [] 
        : [
            "Ensure image dimensions are at least 200x200 pixels",
            "Use JPG, PNG or WebP format only",
            "Keep file size under 5MB",
            "Recommended dimensions are 1200x1200 pixels"
          ]
    });
  })
);

// Universal file serving endpoint
router.get('/files/:path(*)', catchErrors(async (req: Request, res: Response) => {
  const filePath = req.params.path;
  
  if (!filePath) {
    return sendError(res, 'No file path provided', 400);
  }
  
  try {
    // Get file from storage
    const { data, contentType } = await objectStore.getFileAsBuffer(filePath);
    
    // Set content type header
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    
    // Set cache control headers
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
    
    // Send file
    res.send(data);
  } catch (error) {
    console.error(`Error serving file ${filePath}:`, error);
    return sendError(res, 'File not found', 404);
  }
}));

export default router;