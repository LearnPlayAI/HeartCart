import { Router, Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { objectStorageService as objectStore, STORAGE_FOLDERS } from './objectstore';
import { isAdmin } from './auth';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit for high-res banners
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Responsive sizes for banner images
const BANNER_SIZES = [
  { width: 480, suffix: 'mobile' },
  { width: 768, suffix: 'tablet' },
  { width: 1280, suffix: 'desktop' },
  { width: 1920, suffix: 'hd' },
  { width: 2560, suffix: '4k' }
];

// Recommended aspect ratios
const RECOMMENDED_RATIOS = [
  { ratio: 21 / 9, name: '21:9 (Cinematic)', min: 2.3, max: 2.35 },
  { ratio: 16 / 9, name: '16:9 (Wide)', min: 1.75, max: 1.8 }
];

interface ImageVariant {
  url: string;
  width: number;
  height: number;
  size: number;
  suffix: string;
}

interface BannerUploadResult {
  variants: ImageVariant[];
  originalWidth: number;
  originalHeight: number;
  aspectRatio: number;
  recommendedRatio: string;
  bannerId: string;
}

/**
 * Upload and process banner image
 * POST /api/banners/upload
 */
router.post('/upload', isAdmin, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { buffer, mimetype } = file;
    const bannerId = req.body.bannerId || `banner-${Date.now()}`;
    
    // Get image metadata
    const metadata = await sharp(buffer).metadata();
    const { width: originalWidth = 0, height: originalHeight = 0 } = metadata;
    
    if (!originalWidth || !originalHeight) {
      return res.status(400).json({
        success: false,
        message: 'Could not determine image dimensions'
      });
    }

    // Calculate aspect ratio
    const aspectRatio = originalWidth / originalHeight;
    
    // Find the closest recommended ratio
    let recommendedRatio = 'Custom';
    for (const rec of RECOMMENDED_RATIOS) {
      if (aspectRatio >= rec.min && aspectRatio <= rec.max) {
        recommendedRatio = rec.name;
        break;
      }
    }
    
    // Warn if aspect ratio is not ideal
    const isIdealRatio = recommendedRatio !== 'Custom';
    
    console.log(`Processing banner image: ${originalWidth}x${originalHeight} (${aspectRatio.toFixed(2)}:1) - ${recommendedRatio}`);
    
    // Delete old banner images if they exist
    try {
      const oldBannerPrefix = `${STORAGE_FOLDERS.BANNERS}/${bannerId}/`;
      console.log(`Checking for old banner images at: ${oldBannerPrefix}`);
      
      // List all objects with this prefix
      const listResult = await objectStore.listFiles(oldBannerPrefix);
      
      if (listResult && listResult.objects && listResult.objects.length > 0) {
        console.log(`Found ${listResult.objects.length} old banner images to delete`);
        
        // Delete each old file
        for (const objectKey of listResult.objects) {
          try {
            await objectStore.deleteFile(objectKey);
            console.log(`Deleted old banner file: ${objectKey}`);
          } catch (deleteError) {
            console.error(`Error deleting old file ${objectKey}:`, deleteError);
          }
        }
      }
    } catch (cleanupError) {
      console.error('Error cleaning up old banner images:', cleanupError);
      // Continue with upload even if cleanup fails
    }
    
    // Generate responsive variants
    const variants: ImageVariant[] = [];
    const baseFilename = `banner-${Date.now()}`;
    
    for (const size of BANNER_SIZES) {
      try {
        // Calculate height to maintain aspect ratio
        const targetHeight = Math.round(size.width / aspectRatio);
        
        // Process image with sharp
        const processedBuffer = await sharp(buffer)
          .resize(size.width, targetHeight, {
            fit: 'cover',
            position: 'center'
          })
          .webp({ quality: 85 })
          .toBuffer();
        
        // Build object key
        const filename = `${baseFilename}-${size.suffix}.webp`;
        const objectKey = `${STORAGE_FOLDERS.BANNERS}/${bannerId}/${filename}`;
        
        // Upload to object storage
        const url = await objectStore.uploadFromBuffer(objectKey, processedBuffer, {
          contentType: 'image/webp',
          cacheControl: 'public, max-age=31536000' // 1 year cache for banners
        });
        
        variants.push({
          url,
          width: size.width,
          height: targetHeight,
          size: processedBuffer.length,
          suffix: size.suffix
        });
        
        console.log(`Generated ${size.suffix} variant: ${size.width}x${targetHeight} (${(processedBuffer.length / 1024).toFixed(1)}KB)`);
      } catch (variantError) {
        console.error(`Error generating ${size.suffix} variant:`, variantError);
        // Continue with other variants
      }
    }
    
    if (variants.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate image variants'
      });
    }
    
    // Build response
    const result: BannerUploadResult = {
      variants,
      originalWidth,
      originalHeight,
      aspectRatio,
      recommendedRatio,
      bannerId
    };
    
    res.json({
      success: true,
      data: result,
      warning: !isIdealRatio ? `Image aspect ratio is ${aspectRatio.toFixed(2)}:1. Recommended: 21:9 or 16:9 for best appearance.` : undefined
    });
    
  } catch (error) {
    console.error('Error uploading banner:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading banner image',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Delete banner images
 * DELETE /api/banners/:bannerId
 */
router.delete('/:bannerId', isAdmin, async (req: Request, res: Response) => {
  try {
    const { bannerId } = req.params;
    
    // Delete all banner images for this ID
    const bannerPrefix = `${STORAGE_FOLDERS.BANNERS}/${bannerId}/`;
    const listResult = await objectStore.listFiles(bannerPrefix);
    
    if (listResult && listResult.objects && listResult.objects.length > 0) {
      for (const objectKey of listResult.objects) {
        await objectStore.deleteFile(objectKey);
      }
      
      res.json({
        success: true,
        message: `Deleted ${listResult.objects.length} banner files`
      });
    } else {
      res.json({
        success: true,
        message: 'No banner files found to delete'
      });
    }
  } catch (error) {
    console.error('Error deleting banner:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting banner images',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
