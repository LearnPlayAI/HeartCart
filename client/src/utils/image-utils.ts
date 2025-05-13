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
  image: any,
  fallbackUrl: string = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNFNUU3RUIiLz48cGF0aCBkPSJNMTAwIDc0QzkxLjcxNTcgNzQgODUgODAuNzE1NyA4NSA4OUM4NSA5Ny4yODQzIDkxLjcxNTcgMTA0IDEwMCAxMDRDMTA4LjI4NCAxMDQgMTE1IDk3LjI4NDMgMTE1IDg5QzExNSA4MC43MTU3IDEwOC4yODQgNzQgMTAwIDc0WiIgZmlsbD0iIzk0YTNiOCIvPjxwYXRoIGQ9Ik0xNTUgMTI2LjVDMTU1IDEzMy40MDQgMTQ3LjYyOCAxMzkgMTM4LjUgMTM5QzEyOS4zNzIgMTM5IDEyMiAxMzMuNDA0IDEyMiAxMjYuNUMxMjIgMTE5LjU5NiAxMjkuMzcyIDExNCAxMzguNSAxMTRDMTQ3LjYyOCAxMTQgMTU1IDExOS41OTYgMTU1IDEyNi41WiIgZmlsbD0iIzk0YTNiOCIvPjxwYXRoIGQ9Ik0xNjggMTQ0LjVDMTU1LjUyMSAxMzguODg4IDEzNy42MjggMTM1IDEyNyAxMzVDMTExLjUzNiAxMzUgOTguODkzNiAxMzcuMDUzIDkwIDE0MC41IiBzdHJva2U9IiM5NGEzYjgiIHN0cm9rZS13aWR0aD0iMTAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjwvc3ZnPg=='
): string => {
  if (!image) {
    return fallbackUrl;
  }
  
  // If image is a string, handle it directly
  if (typeof image === 'string') {
    if (image.startsWith('data:')) {
      return image; // Data URLs are already valid
    }
    
    // Ensure URL has the correct origin if it's a relative path
    if (image.startsWith('/')) {
      return window.location.origin + image;
    }
    
    return image; // Assume it's a valid absolute URL
  }
  
  // If image is an object, try to extract the URL
  if (typeof image === 'object') {
    // Handle common image object formats
    if (image.url) {
      return ensureValidImageUrl(image.url, fallbackUrl);
    }
    
    if (image.src) {
      return ensureValidImageUrl(image.src, fallbackUrl);
    }
    
    if (image.imageUrl) {
      return ensureValidImageUrl(image.imageUrl, fallbackUrl);
    }
  }
  
  // If we can't determine a valid URL, return the fallback
  console.warn('Unable to determine valid image URL:', image);
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
  image: any,
  defaultText: string = 'Product image'
): string => {
  if (!image) {
    return defaultText;
  }
  
  // If image is an object, try to extract alt text
  if (typeof image === 'object') {
    if (image.alt) return image.alt;
    if (image.altText) return image.altText;
    if (image.description) return image.description;
    if (image.name) return image.name;
    if (image.title) return image.title;
  }
  
  return defaultText;
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
  image: any,
  index: number,
  mainImageIndex?: number | null
): boolean => {
  // First check if the index matches the main image index
  if (typeof mainImageIndex === 'number' && index === mainImageIndex) {
    return true;
  }
  
  // Then check if the image object has an isMain property
  if (image && typeof image === 'object' && 'isMain' in image) {
    return Boolean(image.isMain);
  }
  
  // Default to false if we can't determine
  return false;
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
  baseClass: string,
  mainClass: string
): string => {
  return isMain ? `${baseClass} ${mainClass}` : baseClass;
};