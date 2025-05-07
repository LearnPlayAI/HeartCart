import sharp from 'sharp';
import { ObjectStorageService, FileMetadata } from './objectstore';
import path from 'path';
import crypto from 'crypto';

/**
 * Configuration for image resizing operations
 */
interface ResizeOptions {
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  background?: string | { r: number; g: number; b: number; alpha: number };
  position?: 'top' | 'right top' | 'right' | 'right bottom' | 
             'bottom' | 'left bottom' | 'left' | 'left top' | 'centre' | 'center' | 
             'north' | 'northeast' | 'east' | 'southeast' | 
             'south' | 'southwest' | 'west' | 'northwest' | 
             'entropy' | 'attention';
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
}

/**
 * Common image sizes for various use cases
 */
export const THUMBNAIL_SIZES = {
  TINY: { width: 50, height: 50 },
  SMALL: { width: 150, height: 150 },
  MEDIUM: { width: 300, height: 300 },
  LARGE: { width: 600, height: 600 },
  PRODUCT_CARD: { width: 300, height: 300 },
  PRODUCT_DETAIL: { width: 800, height: 800 },
  CATEGORY_THUMB: { width: 100, height: 100 },
  CAROUSEL: { width: 1200, height: 400 },
};

/**
 * Service for image processing and manipulation
 */
export class ImageService {
  private objectStorageService: ObjectStorageService;
  
  constructor(objectStorageService: ObjectStorageService) {
    this.objectStorageService = objectStorageService;
  }
  
  /**
   * Resizes an image from object storage and saves it back
   */
  async resizeImage(
    sourceObjectKey: string,
    options: ResizeOptions,
    targetFolder?: string,
    targetName?: string
  ): Promise<{ objectKey: string, url: string, width: number, height: number }> {
    try {
      // Get the source image as a buffer
      const imageBuffer = await this.objectStorageService.downloadAsBuffer(sourceObjectKey);
      
      // Get metadata of the original image
      const metadata = await this.objectStorageService.getMetadata(sourceObjectKey);
      
      // Determine target path
      const { dir, name, ext } = path.parse(sourceObjectKey);
      
      // Generate a unique name for the resized image if not provided
      const baseName = targetName || `${name}_${options.width}x${options.height || 'auto'}`;
      
      // Use provided format or infer from original
      const format = options.format || this.getFormatFromExtension(ext) || 'jpeg';
      
      // Create file extension from format
      const outputExt = `.${format}`;
      
      // Determine target folder (same as source if not specified)
      const targetDir = targetFolder || dir;
      
      // Construct the target object key
      const targetObjectKey = path.join(targetDir, `${baseName}${outputExt}`);
      
      // Process the image
      let sharpInstance = sharp(imageBuffer);
      
      // Apply resize with options
      sharpInstance = sharpInstance.resize(
        options.width,
        options.height,
        {
          fit: options.fit || 'cover',
          position: options.position || 'centre',
          background: options.background || { r: 255, g: 255, b: 255, alpha: 1 }
        }
      );
      
      // Set format and quality
      if (format === 'jpeg') {
        sharpInstance = sharpInstance.jpeg({ quality: options.quality || 80 });
      } else if (format === 'png') {
        sharpInstance = sharpInstance.png({ quality: options.quality || 80 });
      } else if (format === 'webp') {
        sharpInstance = sharpInstance.webp({ quality: options.quality || 80 });
      } else if (format === 'avif') {
        sharpInstance = sharpInstance.avif({ quality: options.quality || 80 });
      }
      
      // Get the processed buffer
      const outputBuffer = await sharpInstance.toBuffer();
      
      // Get the processed image metadata
      const outputInfo = await sharp(outputBuffer).metadata();
      
      // Prepare metadata
      const newMetadata: FileMetadata = {
        contentType: `image/${format}`,
        ...metadata
      };
      
      // Save to object storage
      await this.objectStorageService.uploadFromBuffer(
        targetObjectKey, 
        outputBuffer, 
        newMetadata
      );
      
      // Generate URL
      const url = this.objectStorageService.getPublicUrl(targetObjectKey);
      
      return {
        objectKey: targetObjectKey,
        url,
        width: outputInfo.width || 0,
        height: outputInfo.height || 0
      };
    } catch (error: any) {
      console.error('Error resizing image:', error);
      throw new Error(`Failed to resize image: ${error.message}`);
    }
  }
  
  /**
   * Generate thumbnails for an image at common sizes
   */
  async generateThumbnails(
    sourceObjectKey: string,
    sizes = ['TINY', 'SMALL', 'MEDIUM', 'PRODUCT_CARD']
  ): Promise<Record<string, { objectKey: string, url: string, width: number, height: number }>> {
    const thumbnails: Record<string, { objectKey: string, url: string, width: number, height: number }> = {};
    
    // Generate a thumbnails folder path
    const { dir } = path.parse(sourceObjectKey);
    const thumbnailDir = path.join(dir, 'thumbnails');
    
    // Generate a unique base name to avoid conflicts
    const hash = crypto.createHash('md5').update(sourceObjectKey + Date.now()).digest('hex').substring(0, 8);
    
    // Ensure the thumbnail directory exists
    await this.objectStorageService.createFolder(thumbnailDir);
    
    // Generate each thumbnail size
    for (const sizeName of sizes) {
      const sizeConfig = THUMBNAIL_SIZES[sizeName as keyof typeof THUMBNAIL_SIZES];
      
      if (sizeConfig) {
        const result = await this.resizeImage(
          sourceObjectKey,
          {
            width: sizeConfig.width,
            height: sizeConfig.height,
            fit: 'cover',
            format: 'webp', // Use webp for thumbnails as it's more efficient
            quality: 80
          },
          thumbnailDir,
          `${hash}_${sizeName.toLowerCase()}`
        );
        
        thumbnails[sizeName] = result;
      }
    }
    
    return thumbnails;
  }
  
  /**
   * Optimize an image for web display
   */
  async optimizeImage(
    sourceObjectKey: string,
    options: { quality?: number, format?: 'jpeg' | 'png' | 'webp' | 'avif' } = {}
  ): Promise<{ objectKey: string, url: string, size: number }> {
    try {
      // Get the source image
      const imageBuffer = await this.objectStorageService.downloadAsBuffer(sourceObjectKey);
      
      // Get metadata
      const metadata = await this.objectStorageService.getMetadata(sourceObjectKey);
      const { dir, name, ext } = path.parse(sourceObjectKey);
      
      // Determine format
      const format = options.format || this.getFormatFromExtension(ext) || 'jpeg';
      
      // Quality settings
      const quality = options.quality || 80;
      
      // Process image
      let sharpInstance = sharp(imageBuffer);
      
      // Apply format and quality
      if (format === 'jpeg') {
        sharpInstance = sharpInstance.jpeg({ quality });
      } else if (format === 'png') {
        sharpInstance = sharpInstance.png({ quality });
      } else if (format === 'webp') {
        sharpInstance = sharpInstance.webp({ quality });
      } else if (format === 'avif') {
        sharpInstance = sharpInstance.avif({ quality });
      }
      
      // Generate target object key
      const targetObjectKey = path.join(dir, `${name}_optimized.${format}`);
      
      // Get the processed buffer
      const outputBuffer = await sharpInstance.toBuffer();
      
      // Prepare metadata
      const newMetadata: FileMetadata = {
        contentType: `image/${format}`,
        ...metadata
      };
      
      // Save to object storage
      await this.objectStorageService.uploadFromBuffer(
        targetObjectKey, 
        outputBuffer, 
        newMetadata
      );
      
      // Generate URL
      const url = this.objectStorageService.getPublicUrl(targetObjectKey);
      
      return {
        objectKey: targetObjectKey,
        url,
        size: outputBuffer.length
      };
    } catch (error: any) {
      console.error('Error optimizing image:', error);
      throw new Error(`Failed to optimize image: ${error.message}`);
    }
  }
  
  /**
   * Get image format from file extension
   */
  private getFormatFromExtension(ext: string): 'jpeg' | 'png' | 'webp' | 'avif' | null {
    const normalizedExt = ext.toLowerCase().replace('.', '');
    
    if (normalizedExt === 'jpg' || normalizedExt === 'jpeg') {
      return 'jpeg';
    } else if (normalizedExt === 'png') {
      return 'png';
    } else if (normalizedExt === 'webp') {
      return 'webp';
    } else if (normalizedExt === 'avif') {
      return 'avif';
    }
    
    return null;
  }
}