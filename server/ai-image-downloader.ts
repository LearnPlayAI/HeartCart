/**
 * AI Image Downloader Service
 * 
 * Downloads product images from supplier URLs and processes them for upload
 */

import axios from 'axios';
import FormData from 'form-data';
import { Readable } from 'stream';
import { logger } from './logger';
import { Client } from '@replit/object-storage';
import sharp from 'sharp';

interface DownloadedImage {
  url: string;
  objectKey: string;
  filename: string;
  size: number;
  contentType: string;
}

interface ImageDownloadResult {
  success: boolean;
  images: DownloadedImage[];
  errors: string[];
}

export class AIImageDownloader {
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  private static readonly TIMEOUT = 30000; // 30 seconds
  private static objectStore = new Client();

  /**
   * Extract image URLs from a supplier webpage
   */
  static async extractImagesFromUrl(supplierUrl: string): Promise<string[]> {
    try {
      const response = await axios.get(supplierUrl, {
        timeout: this.TIMEOUT,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        }
      });

      const html = response.data;
      const imageUrls: string[] = [];

      // Extract image URLs using regex patterns
      const patterns = [
        // Standard img tags
        /<img[^>]+src=["']([^"']+)["'][^>]*>/gi,
        // Product image specific patterns
        /data-src=["']([^"']+\.(?:jpg|jpeg|png|webp|gif))["']/gi,
        /data-lazy-src=["']([^"']+\.(?:jpg|jpeg|png|webp|gif))["']/gi,
        // Background images in CSS
        /background-image:\s*url\(["']?([^"')]+\.(?:jpg|jpeg|png|webp|gif))["']?\)/gi,
      ];

      patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(html)) !== null) {
          let imageUrl = match[1];
          
          // Convert relative URLs to absolute
          if (imageUrl.startsWith('//')) {
            imageUrl = 'https:' + imageUrl;
          } else if (imageUrl.startsWith('/')) {
            const baseUrl = new URL(supplierUrl).origin;
            imageUrl = baseUrl + imageUrl;
          } else if (!imageUrl.startsWith('http')) {
            const baseUrl = supplierUrl.substring(0, supplierUrl.lastIndexOf('/') + 1);
            imageUrl = baseUrl + imageUrl;
          }

          // Filter out small icons and non-product images
          if (this.isLikelyProductImage(imageUrl)) {
            imageUrls.push(imageUrl);
          }
        }
      });

      // Remove duplicates and return
      return [...new Set(imageUrls)];
    } catch (error) {
      logger.error('Error extracting images from URL:', error);
      return [];
    }
  }

  /**
   * Download images from URLs and upload using the same mechanism as manual uploads
   */
  static async downloadImages(imageUrls: string[], productId?: number): Promise<ImageDownloadResult> {
    const result: ImageDownloadResult = {
      success: true,
      images: [],
      errors: []
    };

    if (!productId) {
      result.success = false;
      result.errors.push('Product ID is required for image uploads');
      return result;
    }

    // Further filter and deduplicate URLs before processing
    const filteredUrls = this.filterAndDeduplicateUrls(imageUrls);
    
    for (const imageUrl of filteredUrls.slice(0, 8)) { // Limit to 8 high-quality images
      try {
        const downloadedImage = await this.downloadSingleImage(imageUrl, productId);
        if (downloadedImage) {
          result.images.push(downloadedImage);
        }
      } catch (error) {
        const errorMessage = `Failed to download ${imageUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMessage);
        logger.error(errorMessage, error);
      }
    }

    if (result.images.length === 0 && result.errors.length > 0) {
      result.success = false;
    }

    return result;
  }

  /**
   * Download a single image from URL
   */
  private static async downloadSingleImage(imageUrl: string, productId?: number): Promise<DownloadedImage | null> {
    try {
      // Download the image
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: this.TIMEOUT,
        maxContentLength: this.MAX_FILE_SIZE,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        }
      });

      const buffer = Buffer.from(response.data);
      const contentType = response.headers['content-type'] || 'image/jpeg';

      // Validate content type
      if (!this.ALLOWED_TYPES.includes(contentType.toLowerCase())) {
        throw new Error(`Unsupported image type: ${contentType}`);
      }

      // Validate file size
      if (buffer.length > this.MAX_FILE_SIZE) {
        throw new Error(`File too large: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`);
      }

      // Generate filename
      const urlParts = new URL(imageUrl);
      const originalFilename = urlParts.pathname.split('/').pop() || 'downloaded-image.jpg';
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const sanitizedName = originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `ai_downloaded_${timestamp}_${randomString}_${sanitizedName}`;

      // Use the same storage path as manual uploads for product drafts
      const folder = `dmc-wholesale/main/${productId}`;
      const objectKey = `${folder}/${filename}`;

      // Upload the image directly without processing
      const uploadResult = await AIImageDownloader.objectStore.uploadFromBytes(objectKey, buffer, {
        contentType,
        metadata: {
          originalUrl: imageUrl,
          downloadedAt: new Date().toISOString(),
          source: 'ai-downloader'
        }
      });

      if ('err' in uploadResult && uploadResult.err) {
        throw new Error(`Upload failed: ${uploadResult.err}`);
      }

      // Get the public URL
      const publicUrl = `/api/files/${objectKey}`;

      const result = {
        url: publicUrl,
        objectKey,
        filename,
        size: buffer.length,
        contentType
      };

      logger.info('Successfully downloaded and uploaded AI image', {
        originalUrl: imageUrl,
        objectKey,
        publicUrl,
        productId,
        fileSize: buffer.length
      });

      return result;

    } catch (error) {
      logger.error(`Error downloading image from ${imageUrl}:`, error);
      throw error;
    }
  }

  /**
   * Filter and deduplicate image URLs to prioritize best quality product images
   */
  private static filterAndDeduplicateUrls(imageUrls: string[]): string[] {
    const seen = new Set<string>();
    const filtered: string[] = [];
    
    // Sort URLs by quality indicators - prioritize larger sizes and main product images
    const sortedUrls = imageUrls.sort((a, b) => {
      const aScore = this.getImageQualityScore(a);
      const bScore = this.getImageQualityScore(b);
      return bScore - aScore; // Higher score first
    });
    
    for (const url of sortedUrls) {
      // Remove query parameters for deduplication (same image with different sizes)
      const baseUrl = url.split('?')[0];
      const fileName = baseUrl.split('/').pop() || '';
      
      if (!seen.has(fileName) && !seen.has(baseUrl)) {
        seen.add(fileName);
        seen.add(baseUrl);
        filtered.push(url);
      }
    }
    
    return filtered;
  }

  /**
   * Score image URLs by quality indicators
   */
  private static getImageQualityScore(imageUrl: string): number {
    const url = imageUrl.toLowerCase();
    let score = 0;
    
    // Prefer larger image sizes
    if (url.includes('1500') || url.includes('1200')) score += 10;
    else if (url.includes('1000') || url.includes('800')) score += 8;
    else if (url.includes('600') || url.includes('700')) score += 6;
    else if (url.includes('400') || url.includes('500')) score += 4;
    
    // Prefer main product image indicators
    if (url.includes('main') || url.includes('primary')) score += 8;
    if (url.includes('product') || url.includes('item')) score += 6;
    if (url.includes('gallery') || url.includes('detail')) score += 4;
    
    // Penalize potential duplicates or low-quality indicators
    if (url.includes('thumb') || url.includes('small')) score -= 5;
    if (url.includes('copy') || url.includes('duplicate')) score -= 3;
    
    return score;
  }

  /**
   * Check if URL is likely a product image (not icon, logo, etc.)
   */
  private static isLikelyProductImage(imageUrl: string): boolean {
    const url = imageUrl.toLowerCase();
    
    // Skip obvious non-product images with more comprehensive patterns
    const skipPatterns = [
      'logo', 'icon', 'favicon', 'banner', 'header', 'footer',
      'button', 'arrow', 'sprite', 'thumb', 'avatar', 'profile',
      'social', 'payment', 'badge', 'award', 'cert', 'nav',
      'menu', 'search', 'cart', 'checkout', 'ui', 'interface',
      'promo', 'deal', 'week', 'sale', 'discount', 'offer',
      'brand', 'company', 'about', 'contact', 'support',
      'mastercard', 'visa', 'paypal', 'absa', 'nedbank',
      'secure', 'ssl', 'verified', 'guarantee', 'warranty',
      'shipping', 'delivery', 'return', 'policy', 'terms',
      'background', 'bg', 'pattern', 'texture', 'gradient',
      'decorative', 'ornament', 'border', 'frame', 'divider'
    ];

    if (skipPatterns.some(pattern => url.includes(pattern))) {
      return false;
    }

    // Skip very small images (likely icons or thumbnails)
    const sizeExclusions = [
      '16x16', '32x32', '64x64', '100x100', '150x150',
      'small', 'mini', 'tiny', 'xs', 'sm'
    ];

    if (sizeExclusions.some(pattern => url.includes(pattern))) {
      return false;
    }

    // Only allow images that have strong product indicators
    const strongProductPatterns = [
      'product', 'item', 'gallery', 'detail', 'zoom',
      'large', 'big', 'full', 'main', 'primary',
      // Size indicators for larger product images
      '400', '500', '600', '700', '800', '1000', '1200', '1500'
    ];

    // Must contain at least one strong product indicator
    return strongProductPatterns.some(pattern => url.includes(pattern));
  }
}