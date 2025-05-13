/**
 * Image Utility Functions
 * 
 * This module provides utility functions for handling product images consistently
 * across the application, including URL validation, fallbacks, and formatting.
 */

/**
 * Ensures a valid image URL is provided, with fallbacks
 * 
 * @param image The image object or URL string
 * @param fallbackUrl Optional fallback URL if the image cannot be displayed
 * @returns A valid image URL
 */
export const ensureValidImageUrl = (
  image: string | { url?: string; objectKey?: string } | null | undefined,
  fallbackUrl: string = '/placeholder-product.png'
): string => {
  // Handle null/undefined cases
  if (!image) return fallbackUrl;
  
  // Handle string case (direct URL)
  if (typeof image === 'string') return image;
  
  // Handle object case
  if (image.url) return image.url;
  
  // Fallback to placeholder
  return fallbackUrl;
};

/**
 * Get an appropriate alt text for an image
 * 
 * @param image The image object
 * @param defaultText Default alt text
 * @returns Appropriate alt text for the image
 */
export const getImageAlt = (
  image: { 
    metadata?: { alt?: string; originalname?: string; } | null;
    alt?: string;
    originalname?: string;
  } | null | undefined,
  defaultText: string = 'Product image'
): string => {
  if (!image) return defaultText;
  
  // Try to get alt text from various possible locations
  return image.metadata?.alt || 
         image.alt || 
         image.metadata?.originalname || 
         image.originalname ||
         defaultText;
};

/**
 * Determines if an image is the main product image
 * 
 * @param image The image object
 * @param index The index of the image in the array
 * @param mainImageIndex The index of the main image
 * @returns True if this is the main product image
 */
export const isMainImage = (
  image: { isMain?: boolean } | null | undefined,
  index: number,
  mainImageIndex?: number | null
): boolean => {
  // If image has an isMain property, use that
  if (image && typeof image.isMain === 'boolean') {
    return image.isMain;
  }
  
  // Otherwise, compare index with mainImageIndex
  return mainImageIndex !== undefined && mainImageIndex !== null && 
         index === mainImageIndex;
};

/**
 * Formats the image class based on whether it's the main image
 * 
 * @param isMain Whether this is the main image
 * @param baseClass Base class for the image container
 * @param mainClass Additional class for main images
 * @returns The formatted class string
 */
export const getImageContainerClass = (
  isMain: boolean,
  baseClass: string = 'border rounded-md overflow-hidden',
  mainClass: string = 'ring-2 ring-primary'
): string => {
  return isMain ? `${baseClass} ${mainClass}` : baseClass;
};