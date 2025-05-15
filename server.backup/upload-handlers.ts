import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import { objectStorageService as objectStore, STORAGE_FOLDERS } from './objectstore';

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
 * Sanitize a filename by replacing spaces with hyphens and removing special characters
 * 
 * This is the central sanitization function used across the application
 * to ensure consistent file naming conventions.
 */
function sanitizeFilename(filename: string): string {
  if (!filename) return '';
  
  // Extract file extension
  const lastDotIndex = filename.lastIndexOf('.');
  const extension = lastDotIndex !== -1 ? filename.slice(lastDotIndex) : '';
  const baseName = lastDotIndex !== -1 ? filename.slice(0, lastDotIndex) : filename;
  
  // Replace spaces with hyphens
  let sanitizedBase = baseName.replace(/\s+/g, '-');
  
  // Remove other problematic characters, but preserve hyphens
  sanitizedBase = sanitizedBase.replace(/[^a-zA-Z0-9-_.]/g, '');
  
  // Combine sanitized base name with original extension
  const sanitized = sanitizedBase + extension;
  
  // Log sanitization results for debugging
  if (sanitized !== filename) {
    console.log(`Sanitized filename: "${filename}" → "${sanitized}"`);
  }
  
  return sanitized;
}

/**
 * Upload temporary product images
 * This handles images during product creation before a product ID exists
 */
router.post('/products/images/temp', upload.array('images', 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'No files uploaded'
      });
    }
    
    const results = await Promise.all(files.map(async (file) => {
      const { originalname, buffer, mimetype } = file;
      
      // Sanitize the filename - replace spaces with hyphens
      const sanitizedName = sanitizeFilename(originalname);
      
      // Log the transformation for debugging
      if (sanitizedName !== originalname) {
        console.log(`Sanitized filename: "${originalname}" → "${sanitizedName}"`);
      }
      
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const filename = `${timestamp}_${randomString}_${sanitizedName}`;
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
        originalname, // Keep original name for reference
        filename
      };
    }));
    
    res.json({ success: true, files: results });
  } catch (error) {
    console.error('Error uploading temp images:', error);
    
    // Ensure we always return JSON, not HTML error pages
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
      return res.status(400).json({ 
        success: false, 
        message: 'No files uploaded' 
      });
    }
    
    if (isNaN(productId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid product ID' 
      });
    }
    
    // Import storage for database operations
    const { storage } = await import('./storage');
    
    // Check if any existing images for this product
    const existingImages = await storage.getProductImages(productId);
    const hasExistingImages = existingImages && existingImages.length > 0;
    
    const results = await Promise.all(files.map(async (file, index) => {
      const { originalname, buffer, mimetype } = file;
      
      // Sanitize the filename - replace spaces with hyphens
      const sanitizedName = sanitizeFilename(originalname);
      
      // Log the transformation for debugging
      if (sanitizedName !== originalname) {
        console.log(`Sanitized filename: "${originalname}" → "${sanitizedName}"`);
      }
      
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const filename = `${timestamp}_${randomString}_${sanitizedName}`;
      
      // Upload directly to product folder
      const { url, objectKey } = await objectStore.uploadProductImage(
        productId,
        buffer,
        filename,
        mimetype
      );
      
      // Determine if this should be the main image
      // First image is main if no existing images, otherwise not main
      const isMain = !hasExistingImages && index === 0;
      
      try {
        // Create the product image record in the database
        await storage.createProductImage({
          productId,
          url,
          objectKey,
          isMain
          // Removed alt field as it doesn't exist in the database
        });
        
        console.log(`Successfully created product image record for ${objectKey}`);
      } catch (dbError) {
        console.error(`Failed to create product image record for ${objectKey}:`, dbError);
        // We don't throw here to allow other files to be processed
      }
      
      return {
        url,
        objectKey,
        originalname, // Keep original name for reference
        filename,
        isMain
      };
    }));
    
    res.json({ success: true, files: results });
  } catch (error) {
    console.error('Error uploading product images:', error);
    
    // Ensure we always return JSON, not HTML error pages
    res.status(500).json({ 
      success: false, 
      message: 'Error uploading images',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Move a temporary file to a permanent location
 * Note: When working with existing file paths in Object Storage, we don't need to
 * re-sanitize the filenames since they would have been sanitized during the initial upload.
 */
router.post('/products/images/move', async (req: Request, res: Response) => {
  try {
    const { 
      sourceKey, 
      productId, 
      isMain = false,
      supplierName,
      catalogName,
      categoryName,
      productName
    } = req.body;
    
    if (!sourceKey || !productId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Source key and product ID are required' 
      });
    }
    
    // Import storage for database operations
    const { storage } = await import('./storage');
    
    // Get product, supplier, catalog, and category information if not provided
    let finalSupplierName = supplierName;
    let finalCatalogName = catalogName;
    let finalCategoryName = categoryName;
    let finalProductName = productName;
    
    if (!supplierName || !catalogName || !categoryName || !productName) {
      try {
        // Get product details
        const product = await storage.getProductById(parseInt(productId));
        
        if (!product) {
          return res.status(404).json({
            success: false,
            message: 'Product not found'
          });
        }
        
        // Get category info
        let category = null;
        if (product.categoryId) {
          category = await storage.getCategoryById(product.categoryId);
        }
        
        // Get catalog info from product
        const catalog = product.catalogId 
          ? await storage.getCatalogById(product.catalogId)
          : null;
          
        // Get supplier info from catalog
        const supplier = catalog && catalog.supplierId
          ? await storage.getSupplierById(catalog.supplierId)
          : null;
          
        // Set the values with fallbacks
        finalProductName = finalProductName || product.name || 'product';
        finalCategoryName = finalCategoryName || (category ? category.name : 'uncategorized');
        finalCatalogName = finalCatalogName || (catalog ? catalog.name : 'default');
        finalSupplierName = finalSupplierName || (supplier ? supplier.name : 'default');
      } catch (error) {
        console.error('Error fetching product details:', error);
        // Use fallback values if we can't get the real ones
        finalProductName = finalProductName || 'product';
        finalCategoryName = finalCategoryName || 'uncategorized';
        finalCatalogName = finalCatalogName || 'default';
        finalSupplierName = finalSupplierName || 'default';
      }
    }
    
    // Move file from temp to final product folder using the new path structure
    const result = await objectStore.moveToFinalLocation(
      sourceKey,
      finalSupplierName,
      finalCatalogName,
      finalCategoryName,
      finalProductName,
      parseInt(productId)
    );
    
    try {
      // Check if any existing images for this product
      const existingImages = await storage.getProductImages(parseInt(productId));
      const hasExistingImages = existingImages && existingImages.length > 0;
      
      // Create the product image record in the database
      // This will be the main image if it's the first one or if isMain is explicitly set to true
      await storage.createProductImage({
        productId: parseInt(productId),
        url: result.url,
        objectKey: result.objectKey,
        isMain: isMain || !hasExistingImages,
        hasBgRemoved: false
      });
      
      console.log(`Successfully created product image record for ${result.objectKey}`);
    } catch (dbError) {
      console.error(`Failed to create product image record for ${result.objectKey}:`, dbError);
      // We don't throw here to still return the successful file move
    }
    
    res.json({ 
      success: true, 
      url: result.url, 
      objectKey: result.objectKey 
    });
  } catch (error) {
    console.error('Error moving file:', error);
    
    // Ensure we always return JSON, not HTML error pages
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
    
    // Ensure we always return JSON, not HTML error pages
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting file',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * General-purpose single file upload
 * This route handles single file uploads from various parts of the application
 */
router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }
    
    const { originalname, buffer, mimetype } = file;
    const bucket = req.body.bucket || 'general';
    
    // Sanitize the filename
    const sanitizedName = sanitizeFilename(originalname);
    
    // Generate a unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const filename = `${timestamp}_${randomString}_${sanitizedName}`;
    
    // Upload the file based on bucket type
    let result;
    
    if (bucket === 'products') {
      result = await objectStore.uploadTempFile(
        buffer,
        filename,
        'pending',
        mimetype
      );
    } else {
      // Use general upload for other bucket types
      // For v1 compatibility, we'll stick to uploadTempFile for now
      result = await objectStore.uploadTempFile(
        buffer,
        filename,
        bucket,
        mimetype
      );
    }
    
    res.json({ 
      success: true, 
      // Include both formats for backwards compatibility
      url: result.url, 
      objectKey: result.objectKey,
      data: {
        url: result.url,
        objectKey: result.objectKey
      }
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    
    // Ensure we always return JSON, not HTML error pages
    res.status(500).json({ 
      success: false, 
      message: 'Error uploading file',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;