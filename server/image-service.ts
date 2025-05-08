import sharp from 'sharp';
import path from 'path';
import { objectStore, STORAGE_FOLDERS } from './object-store';
import { NotFoundError, ValidationError } from './errors';

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
 * Image validation constants
 */
export const IMAGE_VALIDATION = {
  MAX_SIZE_BYTES: 5 * 1024 * 1024, // 5MB maximum file size
  MIN_DIMENSIONS: { width: 200, height: 200 },
  RECOMMENDED_DIMENSIONS: { width: 1200, height: 1200 },
  ALLOWED_FORMATS: ['jpeg', 'jpg', 'png', 'webp'],
  QUALITY_THRESHOLD: 70 // Minimum quality score (0-100)
};

/**
 * Image validation results interface
 */
export interface ImageValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  details: {
    format?: string;
    size?: number;
    dimensions?: { width: number; height: number };
    qualityScore?: number;
  };
}

/**
 * Service for image processing and manipulation
 */
export class ImageService {
  /**
   * Validate an image file buffer
   */
  async validateImage(
    buffer: Buffer, 
    filename: string
  ): Promise<ImageValidationResult> {
    const result: ImageValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      details: {}
    };
    
    // Validate file size
    const fileSize = buffer.length;
    result.details.size = fileSize;
    
    if (fileSize > IMAGE_VALIDATION.MAX_SIZE_BYTES) {
      result.valid = false;
      result.errors.push(`File size exceeds maximum allowed (${(IMAGE_VALIDATION.MAX_SIZE_BYTES / (1024 * 1024)).toFixed(1)}MB)`);
    }
    
    // Get file extension and validate format
    const ext = path.extname(filename).toLowerCase().replace('.', '');
    result.details.format = ext;
    
    if (!IMAGE_VALIDATION.ALLOWED_FORMATS.includes(ext)) {
      result.valid = false;
      result.errors.push(`File format "${ext}" is not supported. Allowed formats: ${IMAGE_VALIDATION.ALLOWED_FORMATS.join(', ')}`);
    }
    
    try {
      // Use sharp to get image metadata
      const metadata = await sharp(buffer).metadata();
      
      // Validate dimensions
      if (metadata.width && metadata.height) {
        result.details.dimensions = {
          width: metadata.width,
          height: metadata.height
        };
        
        if (metadata.width < IMAGE_VALIDATION.MIN_DIMENSIONS.width || 
            metadata.height < IMAGE_VALIDATION.MIN_DIMENSIONS.height) {
          result.valid = false;
          result.errors.push(`Image dimensions (${metadata.width}x${metadata.height}) are below minimum required (${IMAGE_VALIDATION.MIN_DIMENSIONS.width}x${IMAGE_VALIDATION.MIN_DIMENSIONS.height})`);
        }
        
        if (metadata.width < IMAGE_VALIDATION.RECOMMENDED_DIMENSIONS.width || 
            metadata.height < IMAGE_VALIDATION.RECOMMENDED_DIMENSIONS.height) {
          result.warnings.push(`Image dimensions (${metadata.width}x${metadata.height}) are below recommended (${IMAGE_VALIDATION.RECOMMENDED_DIMENSIONS.width}x${IMAGE_VALIDATION.RECOMMENDED_DIMENSIONS.height})`);
        }
      } else {
        result.valid = false;
        result.errors.push('Unable to determine image dimensions');
      }
      
      // Estimate image quality (basic implementation)
      // For a real implementation, use a proper image quality assessment library
      const qualityScore = this.estimateImageQuality(buffer, metadata);
      result.details.qualityScore = qualityScore;
      
      if (qualityScore < IMAGE_VALIDATION.QUALITY_THRESHOLD) {
        result.warnings.push(`Image quality score (${qualityScore}) is below recommended threshold (${IMAGE_VALIDATION.QUALITY_THRESHOLD})`);
      }
      
    } catch (error) {
      result.valid = false;
      result.errors.push(`Invalid image file: ${error.message || 'Unknown error processing image'}`);
    }
    
    return result;
  }
  
  /**
   * Validate an image in the Object Store
   */
  async validateStoredImage(objectKey: string): Promise<ImageValidationResult> {
    try {
      // Check if file exists
      const exists = await objectStore.exists(objectKey);
      if (!exists) {
        throw new NotFoundError(`Image not found in Object Store: ${objectKey}`);
      }
      
      // Get the file
      const { data: buffer } = await objectStore.getFileAsBuffer(objectKey);
      
      // Perform validation
      return this.validateImage(buffer, path.basename(objectKey));
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      return {
        valid: false,
        errors: [`Failed to validate image: ${error.message || 'Unknown error'}`],
        warnings: [],
        details: {}
      };
    }
  }
  
  /**
   * Estimate image quality (simplified implementation)
   * This is a basic approach - a real implementation would use more sophisticated algorithms
   */
  private estimateImageQuality(buffer: Buffer, metadata: sharp.Metadata): number {
    // A simple heuristic based on file size relative to dimensions
    // This is a very basic placeholder - real quality assessment is much more complex
    if (!metadata.width || !metadata.height || !metadata.format) {
      return 50; // Default middle score if we can't calculate
    }
    
    const totalPixels = metadata.width * metadata.height;
    const bitsPerPixel = (buffer.length * 8) / totalPixels;
    
    // Very naive quality scoring based on bits per pixel
    // This is just a placeholder - real image quality assessment should use
    // more sophisticated algorithms considering compression artifacts, noise, etc.
    let qualityScore = 0;
    
    switch (metadata.format.toLowerCase()) {
      case 'jpeg':
      case 'jpg':
        // For JPEG, higher bpp generally means better quality
        qualityScore = Math.min(100, Math.max(0, bitsPerPixel * 4));
        break;
      case 'png':
        // PNGs are lossless so generally higher quality
        qualityScore = Math.min(100, Math.max(70, bitsPerPixel * 2));
        break;
      case 'webp':
        // WebP similar scoring to JPEG but with better efficiency
        qualityScore = Math.min(100, Math.max(0, bitsPerPixel * 5));
        break;
      default:
        qualityScore = 50; // Default middle score for unknown formats
    }
    
    return Math.round(qualityScore);
  }

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