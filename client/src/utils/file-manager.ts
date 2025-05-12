/**
 * File Manager Utility
 * 
 * A centralized utility for handling file operations in the application.
 * This includes URL management, image transformations, and file uploads.
 */

import { UploadedImage } from '../components/admin/product-wizard/types';

// File storage root folders
export const STORAGE_FOLDERS = {
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  SUPPLIERS: 'suppliers',
  CATALOGS: 'catalogs',
  TEMP: 'temp',
  OPTIMIZED: 'optimized',
  THUMBNAILS: 'thumbnails'
};

// Upload endpoints
export const UPLOAD_ENDPOINTS = {
  PRODUCT_TEMP: '/api/upload/products/images/temp',
  PRODUCT_IMAGES: (productId: number | string) => `/api/upload/products/${productId}/images`,
  CATEGORY_IMAGES: '/api/upload/categories/images',
  SUPPLIER_LOGO: '/api/upload/suppliers/logo',
  CATALOG_COVER: '/api/upload/catalogs/cover'
};

// API base URL for files
export const API_FILES_BASE = '/api/files';

/**
 * Sanitize a filename by replacing spaces with hyphens and removing special characters
 * 
 * This is the central sanitization function used across the application.
 * IMPORTANT: This function should remain synchronized with the server-side version
 * in upload-handlers.ts to ensure consistent behavior.
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return '';
  
  // Extract file extension to preserve it
  const lastDotIndex = filename.lastIndexOf('.');
  const extension = lastDotIndex !== -1 ? filename.slice(lastDotIndex) : '';
  const baseName = lastDotIndex !== -1 ? filename.slice(0, lastDotIndex) : filename;
  
  // Replace spaces with hyphens
  let sanitizedBase = baseName.replace(/\s+/g, '-');
  
  // Remove other problematic characters, but preserve hyphens, underscores, periods
  sanitizedBase = sanitizedBase.replace(/[^a-zA-Z0-9-_.]/g, '');
  
  // Combine sanitized base name with original extension
  const sanitized = sanitizedBase + extension;
  
  // Silently sanitize the filename without logging
  // Sanitization creates consistent filenames without spaces or special characters
  
  return sanitized;
}

/**
 * Create a File object with a sanitized filename
 */
export function createFileWithSanitizedName(file: File): File {
  const sanitizedName = sanitizeFilename(file.name);
  
  // If the name is already sanitized, return the original
  if (sanitizedName === file.name) {
    return file;
  }
  
  // Create a new File object with the sanitized name
  // We need to use the File constructor to change the filename
  return new File([file], sanitizedName, { type: file.type });
}

/**
 * Process an array of File objects into FormData for upload
 * Sanitizes filenames before upload by replacing spaces with hyphens
 */
export function prepareFilesFormData(
  files: File[], 
  additionalData?: Record<string, string | number | boolean>
): FormData {
  const formData = new FormData();
  
  // Sanitize filenames and append to form data
  files.forEach(file => {
    // Create a new file with sanitized name
    const sanitizedFile = createFileWithSanitizedName(file);
    
    // Silently sanitize filenames without logging
    
    formData.append('images', sanitizedFile);
  });
  
  // Add any additional data
  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, String(value));
    });
  }
  
  return formData;
}

/**
 * Upload multiple files to the server
 * @returns Array of uploaded image metadata
 */
export async function uploadFiles(
  files: File[], 
  endpoint: string,
  additionalData?: Record<string, string | number | boolean>
): Promise<UploadedImage[]> {
  if (files.length === 0) {
    return [];
  }
  
  // Prepare form data with files and any additional data
  const formData = prepareFilesFormData(files, additionalData);
  
  // Upload the files
  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    throw new Error(`Upload failed with status: ${response.status}`);
  }
  
  const result = await response.json();
  
  if (!result.success || !Array.isArray(result.files)) {
    throw new Error('Invalid server response format');
  }
  
  // Map the API response to our UploadedImage format
  return result.files.map((file: any, index: number) => ({
    id: file.id, // Use ID from server if available
    url: file.url, // URL for accessing the file via API
    objectKey: file.objectKey, // Storage path to the file
    isMain: false, // Default to false, caller can update as needed
    order: index,
    metadata: {
      size: file.size,
      width: file.width,
      height: file.height,
      originalname: file.originalname || file.filename,
    }
  }));
}

/**
 * Create a local object URL for a file object (browser-only)
 */
export function createLocalImageUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Revoke a local object URL to prevent memory leaks
 */
export function revokeLocalImageUrl(url: string): void {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

/**
 * Ensures a valid image URL for display
 * This is a centralized function used across components to consistently handle image URLs
 */
export function ensureValidImageUrl(image: UploadedImage | string): string {
  // Handle string URLs directly (simplified use case)
  if (typeof image === 'string') {
    return formatUrlPath(image);
  }
  
  // Handle UploadedImage objects (full featured case)
  if (!image.url && !image.objectKey) {
    return '';
  }
  
  // When we have a file object (client-side), create an object URL
  if (image.file) {
    // Return existing URL if already created
    if (image.url && image.url.startsWith('blob:')) {
      return image.url;
    }
    return URL.createObjectURL(image.file);
  }
  
  // If URL is already absolute (starts with http), return as is
  if (image.url && image.url.startsWith('http')) {
    return image.url;
  }
  
  // Direct access to Object Store URLs using objectKey (preferred method)
  if (image.objectKey) {
    return formatObjectKeyPath(image.objectKey);
  }
  
  // Use image URL as fallback with proper encoding
  if (image.url) {
    return formatUrlPath(image.url);
  }
  
  return '';
}

/**
 * Format an object key path into a proper API URL with encoding
 */
export function formatObjectKeyPath(objectKey: string): string {
  if (!objectKey) {
    return '';
  }
  
  // Handle temp folder paths
  if (objectKey.includes(`${STORAGE_FOLDERS.TEMP}/`)) {
    const parts = objectKey.split('/');
    
    // Special handling for temp/pending folder (used for batch uploads)
    if (parts.length >= 3 && parts[1] === 'pending') {
      // This is a special case for the 'pending' folder before products are created
      const filename = parts[2]; // Just get the filename
      
      // Ensure we're not double-encoding paths with already encoded components
      const safeFilename = filename.includes('%') ? filename : encodeURIComponent(filename);
      return `${API_FILES_BASE}/${STORAGE_FOLDERS.TEMP}/pending/${safeFilename}`;
    }
    
    if (parts.length >= 3) {
      // Get all parts after 'temp/{id}/'
      const productId = parts[1];
      const filename = parts.slice(2).join('/');
      
      // Ensure we're not double-encoding paths with already encoded components
      const safeFilename = filename.includes('%') ? filename : encodeURIComponent(filename);
      return `${API_FILES_BASE}/${STORAGE_FOLDERS.TEMP}/${productId}/${safeFilename}`;
    }
  }
  
  // Handle product specific paths
  if (objectKey.startsWith(`${STORAGE_FOLDERS.PRODUCTS}/`)) {
    const parts = objectKey.split('/');
    if (parts.length >= 3) {
      const productId = parts[1];
      // Join all remaining parts to handle filenames with folders
      const filename = parts.slice(2).join('/');
      
      // Ensure we're not double-encoding paths with already encoded components
      const safeFilename = filename.includes('%') ? filename : encodeURIComponent(filename);
      return `${API_FILES_BASE}/${STORAGE_FOLDERS.PRODUCTS}/${productId}/${safeFilename}`;
    }
  }
  
  // Generic object key handling
  const pathSegments = objectKey.split('/');
  const encodedPath = pathSegments.map(segment => {
    // Ensure we're not double-encoding paths with already encoded components
    return segment.includes('%') ? segment : encodeURIComponent(segment);
  }).join('/');
  
  return `${API_FILES_BASE}/${encodedPath}`;
}

/**
 * Format a URL path with proper encoding
 */
export function formatUrlPath(url: string): string {
  if (!url) return '';
  
  // Handle already absolute URLs
  if (url.startsWith('http') || url.startsWith('blob:')) {
    return url;
  }
  
  // Handle API files URLs
  if (url.startsWith('/api/files/')) {
    try {
      // Don't re-encode URLs that already contain encoded components (%)
      if (url.includes('%')) {
        return url;
      }
      
      const urlParts = url.split('/');
      
      // Special handling for temp folder with file upload paths
      if (url.includes('/temp/pending/')) {
        // Special case for pending uploads (before product ID exists)
        const pendingPathRegex = /^\/api\/files\/temp\/pending\/(.*)/;
        const pendingMatch = url.match(pendingPathRegex);
        
        if (pendingMatch && pendingMatch[1]) {
          const filename = pendingMatch[1];
          // Only encode if not already encoded
          const encodedFilename = filename.includes('%') ? filename : encodeURIComponent(filename);
          return `/api/files/temp/pending/${encodedFilename}`;
        }
        
        // Fallback for other formats - handle timestamp_randomstring_filename pattern
        const parts = url.split('/');
        const lastPart = parts[parts.length - 1];
        
        // Check if this is the filename part (should contain timestamp prefix)
        if (lastPart && lastPart.includes('_')) {
          // We need to encode just the filename portion
          const prefix = parts.slice(0, parts.length - 1).join('/');
          const encodedLastPart = encodeURIComponent(lastPart);
          return `${prefix}/${encodedLastPart}`;
        }
      }
      
      // Standard API files URL handling
      // Reconstruct with proper encoding for segments after /api/files/
      if (urlParts.length >= 3 && urlParts[1] === 'api' && urlParts[2] === 'files') {
        const apiBase = `/${urlParts[1]}/${urlParts[2]}`;
        const remainingParts = urlParts.slice(3);
        const encodedParts = remainingParts.map(part => encodeURIComponent(part));
        return `${apiBase}/${encodedParts.join('/')}`;
      }
    } catch (error) {
      // Silent error, return the original URL in case of any issues
      return url;
    }
  }
  
  // For other relative paths, encode all segments
  try {
    const segments = url.split('/').filter(s => s.length > 0);
    const encodedSegments = segments.map(segment => {
      // Don't re-encode segments that already have encoded characters
      return segment.includes('%') ? segment : encodeURIComponent(segment);
    });
    return `/${encodedSegments.join('/')}`;
  } catch (error) {
    return url;
  }
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * Check if a file is an image based on its extension
 */
export function isImageFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
}

/**
 * Generate a timestamp-based filename to prevent collisions
 */
export function generateUniqueFilename(originalFilename: string): string {
  const timestamp = Date.now();
  const randomPart = Math.floor(Math.random() * 1000000);
  const ext = getFileExtension(originalFilename);
  const sanitizedName = originalFilename
    .split('.')[0]
    .replace(/[^a-zA-Z0-9]/g, '-')
    .substring(0, 20);
  
  return `${timestamp}-${randomPart}-${sanitizedName}.${ext}`;
}

/**
 * Validate file size
 * @param file File to validate
 * @param maxSizeMB Maximum size in MB
 */
export function validateFileSize(file: File, maxSizeMB: number = 5): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

/**
 * Cleanup function that should be called when component unmounts
 * to prevent memory leaks from local object URLs
 */
export function cleanupLocalImageUrls(images: UploadedImage[]): void {
  images.forEach(image => {
    if (image.url && image.url.startsWith('blob:')) {
      revokeLocalImageUrl(image.url);
    }
  });
}