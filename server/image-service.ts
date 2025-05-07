import sharp from 'sharp';
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
  SMALL: { width: 150, height: 150, fit: 'cover' as const },
  MEDIUM: { width: 300, height: 300, fit: 'cover' as const },
  LARGE: { width: 600, height: 600, fit: 'cover' as const },
  PRODUCT_MAIN: { width: 800, height: 800, fit: 'contain' as const },
  GALLERY: { width: 1200, height: 1200, fit: 'inside' as const },
  BANNER: { width: 1920, height: 480, fit: 'cover' as const }
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
  ): Promise<Buffer> {
    try {
      let processor = sharp(imageBuffer);
      
      // Apply resize if width or height is specified
      if (options.width || options.height) {
        processor = processor.resize({
          width: options.width,
          height: options.height,
          fit: options.fit || 'cover',
          position: options.position,
          background: options.background
        });
      }
      
      // Apply format based on requested format
      if (options.format === 'jpeg') {
        processor = processor.jpeg({ 
          quality: options.quality || 85, 
          progressive: true 
        });
      } else if (options.format === 'png') {
        processor = processor.png({ 
          quality: options.quality || 90
        });
      } else if (options.format === 'webp') {
        processor = processor.webp({ 
          quality: options.quality || 85
        });
      } else if (options.format === 'avif') {
        processor = processor.avif({ 
          quality: options.quality || 80
        });
      }
      
      // Generate the output buffer
      return processor.toBuffer();
    } catch (error) {
      console.error('Error processing image:', error);
      throw error;
    }
  }
  
  /**
   * Create multiple sizes of an image for responsive display
   */
  async createResponsiveImages(
    originalKey: string,
    sizes: Record<string, ResizeOptions>
  ): Promise<Record<string, string>> {
    try {
      // Get the original image
      const { data: originalBuffer } = await objectStore.getFileAsBuffer(originalKey);
      
      // Extract folder and filename from the original key
      const parts = originalKey.split('/');
      const filename = parts.pop() || '';
      const folder = parts.join('/');
      
      // Store results
      const urls: Record<string, string> = {};
      
      // Process each size
      for (const [sizeName, options] of Object.entries(sizes)) {
        const buffer = await this.processImage(originalBuffer, options);
        
        // Create a variant in the same folder with size prefix
        const extension = options.format ? `.${options.format}` : filename.includes('.') ? 
          filename.slice(filename.lastIndexOf('.')) : '.jpg';
        
        const sizeKey = `${folder}/${sizeName.toLowerCase()}_${filename.replace(/\.[^.]+$/, '')}${extension}`;
        
        // Upload the resized image
        const contentType = this.getContentTypeFromFormat(options.format || extension.slice(1));
        urls[sizeName] = await objectStore.uploadBuffer(sizeKey, buffer, {
          contentType,
          cacheControl: 'public, max-age=86400'
        });
      }
      
      return urls;
    } catch (error) {
      console.error('Error creating responsive images:', error);
      throw error;
    }
  }
  
  /**
   * Generate thumbnails for an image
   */
  async generateThumbnails(
    originalKey: string
  ): Promise<{
    small: string;
    medium: string;
    large: string;
  }> {
    const sizes = {
      'small': THUMBNAIL_SIZES.SMALL,
      'medium': THUMBNAIL_SIZES.MEDIUM,
      'large': THUMBNAIL_SIZES.LARGE
    };
    
    const results = await this.createResponsiveImages(originalKey, sizes);
    
    return {
      small: results.small,
      medium: results.medium,
      large: results.large
    };
  }
  
  /**
   * Get content type from format
   */
  private getContentTypeFromFormat(format: string): string {
    const formatMap: Record<string, string> = {
      'jpeg': 'image/jpeg',
      'jpg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
      'avif': 'image/avif',
      'gif': 'image/gif',
      'svg': 'image/svg+xml'
    };
    
    return formatMap[format.toLowerCase()] || 'application/octet-stream';
  }
}

// Export a singleton instance
export const imageService = new ImageService();