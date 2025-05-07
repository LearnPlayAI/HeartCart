import sharp from 'sharp';
import path from 'path';
import { objectStore, STORAGE_FOLDERS } from './object-store';

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
  TINY: { width: 80, height: 80, fit: 'cover' as const },
  SMALL: { width: 150, height: 150, fit: 'cover' as const },
  MEDIUM: { width: 300, height: 300, fit: 'cover' as const },
  LARGE: { width: 600, height: 600, fit: 'cover' as const },
  CARD: { width: 400, height: 300, fit: 'cover' as const },
  BANNER: { width: 1200, height: 400, fit: 'cover' as const },
  PREVIEW: { width: 800, height: 600, fit: 'contain' as const }
};

/**
 * Service for image processing and manipulation
 */
export class ImageService {
  /**
   * Process image with Sharp and return buffer
   */
  async processImage(
    imageBuffer: Buffer,
    options: ResizeOptions
  ): Promise<{ data: Buffer; info: sharp.OutputInfo }> {
    let sharpInstance = sharp(imageBuffer);
    
    // Apply resize if width or height is specified
    if (options.width || options.height) {
      sharpInstance = sharpInstance.resize({
        width: options.width,
        height: options.height,
        fit: options.fit || 'cover',
        position: options.position || 'center',
        background: options.background || { r: 255, g: 255, b: 255, alpha: 1 }
      });
    }
    
    // Convert to specified format if requested
    if (options.format) {
      if (options.format === 'jpeg') {
        sharpInstance = sharpInstance.jpeg({ quality: options.quality || 80 });
      } else if (options.format === 'png') {
        sharpInstance = sharpInstance.png({ quality: options.quality || 80 });
      } else if (options.format === 'webp') {
        sharpInstance = sharpInstance.webp({ quality: options.quality || 80 });
      } else if (options.format === 'avif') {
        sharpInstance = sharpInstance.avif({ quality: options.quality || 50 });
      }
    }
    
    // Process the image and return buffer
    const { data, info } = await sharpInstance.toBuffer({ resolveWithObject: true });
    return { data, info };
  }
  
  /**
   * Create multiple sizes of an image for responsive display
   */
  async createResponsiveImages(
    objectKey: string,
    sizes = [THUMBNAIL_SIZES.SMALL, THUMBNAIL_SIZES.MEDIUM, THUMBNAIL_SIZES.LARGE]
  ): Promise<Record<string, string>> {
    // Get the image as a buffer
    const { data: imageBuffer } = await objectStore.getFileAsBuffer(objectKey);
    
    const responsiveUrls: Record<string, string> = {};
    const filename = path.basename(objectKey);
    const filenameWithoutExt = path.basename(filename, path.extname(filename));
    
    // Generate each size and upload
    for (const [sizeKey, sizeOptions] of Object.entries(sizes)) {
      try {
        // Process the image
        const { data: resizedImageBuffer, info } = await this.processImage(
          imageBuffer,
          { ...sizeOptions, format: 'webp' }
        );
        
        // Create a unique key for this size
        const newObjectKey = `${STORAGE_FOLDERS.THUMBNAILS}/${filenameWithoutExt}_${sizeKey.toLowerCase()}.webp`;
        
        // Upload the resized image
        const url = await objectStore.uploadFromBuffer(newObjectKey, resizedImageBuffer, {
          contentType: 'image/webp',
          cacheControl: 'public, max-age=31536000' // Cache for 1 year
        });
        
        // Store the URL for this size
        responsiveUrls[sizeKey.toLowerCase()] = url;
      } catch (error) {
        console.error(`Error creating ${sizeKey} version of ${objectKey}:`, error);
        // Continue with other sizes even if one fails
      }
    }
    
    return responsiveUrls;
  }
  
  /**
   * Generate thumbnails for an image
   */
  async generateThumbnails(
    objectKey: string,
    sizes = Object.values(THUMBNAIL_SIZES)
  ): Promise<Record<string, string>> {
    return this.createResponsiveImages(objectKey, sizes);
  }
  
  /**
   * Optimize an image for web display
   */
  async optimizeImage(
    objectKey: string,
    options: { quality?: number; format?: 'jpeg' | 'png' | 'webp' | 'avif' }
  ): Promise<{ objectKey: string; url: string; size: number }> {
    // Get the image as a buffer
    const { data: imageBuffer } = await objectStore.getFileAsBuffer(objectKey);
    
    // Process the image
    const format = options.format || 'webp'; // Default to WebP for best compression
    const quality = options.quality || 80;
    
    const { data: optimizedBuffer, info } = await this.processImage(imageBuffer, { 
      format, 
      quality
    });
    
    // Create a unique key for the optimized image
    const filename = path.basename(objectKey);
    const filenameWithoutExt = path.basename(filename, path.extname(filename));
    const newObjectKey = `${STORAGE_FOLDERS.OPTIMIZED}/${filenameWithoutExt}.${format}`;
    
    // Upload the optimized image
    const url = await objectStore.uploadFromBuffer(newObjectKey, optimizedBuffer, {
      contentType: this.getContentTypeFromFormat(format),
      cacheControl: 'public, max-age=31536000' // Cache for 1 year
    });
    
    return {
      objectKey: newObjectKey,
      url,
      size: info.size
    };
  }
  
  /**
   * Resize an image with custom dimensions
   */
  async resizeImage(
    objectKey: string,
    options: ResizeOptions
  ): Promise<{ objectKey: string; url: string; width: number; height: number; size: number }> {
    // Get the image as a buffer
    const { data: imageBuffer } = await objectStore.getFileAsBuffer(objectKey);
    
    // Process the image
    const { data: resizedBuffer, info } = await this.processImage(imageBuffer, options);
    
    // Create a unique key for the resized image
    const filename = path.basename(objectKey);
    const filenameWithoutExt = path.basename(filename, path.extname(filename));
    const format = options.format || 'webp';
    const dimensions = `${options.width || 'auto'}x${options.height || 'auto'}`;
    const newObjectKey = `${STORAGE_FOLDERS.OPTIMIZED}/${filenameWithoutExt}_${dimensions}.${format}`;
    
    // Upload the resized image
    const url = await objectStore.uploadFromBuffer(newObjectKey, resizedBuffer, {
      contentType: this.getContentTypeFromFormat(format),
      cacheControl: 'public, max-age=31536000' // Cache for 1 year
    });
    
    return {
      objectKey: newObjectKey,
      url,
      width: info.width,
      height: info.height,
      size: info.size
    };
  }
  
  /**
   * Get content type from format
   */
  private getContentTypeFromFormat(format: string): string {
    switch (format.toLowerCase()) {
      case 'jpeg':
      case 'jpg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      case 'avif':
        return 'image/avif';
      default:
        return 'image/jpeg';
    }
  }
}

// Export a singleton instance
export const imageService = new ImageService();