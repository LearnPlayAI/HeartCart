/**
 * File Manager Utilities
 * 
 * This module provides centralized utilities for managing file uploads,
 * URL handling, and consistent file operations throughout the application.
 * It integrates with the server's Object Store implementation.
 */

import { ensureValidImageUrl as validateImageUrl } from './file-utils';

/**
 * Endpoints for file uploads to different storage locations
 */
export const UPLOAD_ENDPOINTS = {
  // Temporary storage
  PRODUCT_TEMP: '/api/upload/products/images/temp',
  // Direct product storage
  PRODUCT: (productId: number | string) => `/api/upload/products/${productId}/images`,
  // Category images
  CATEGORY: '/api/upload/categories/images',
  // Supplier logos
  SUPPLIER: '/api/upload/suppliers/images',
  // Catalog cover images
  CATALOG: '/api/upload/catalogs/images',
  // General file uploads
  GENERIC: '/api/upload/files'
};

/**
 * Ensures image URLs are properly formatted and valid
 * Handles both full URLs and object paths
 */
export const ensureValidImageUrl = (url: string | null | undefined): string => {
  if (!url) return '';

  // If it's already a full URL with protocol, validate it
  if (url.startsWith('http')) {
    return validateImageUrl(url);
  }
  
  // If it's a data URL, return as is
  if (url.startsWith('data:')) {
    return url;
  }
  
  // If it's just an object key without /api/files prefix
  if (!url.startsWith('/api/files/') && !url.startsWith('/')) {
    return validateImageUrl(`/api/files/${url}`);
  }
  
  // If it already has the /api/files prefix or is a relative path
  return validateImageUrl(url);
};

/**
 * Get the file path part from an object key
 */
export const getPathFromObjectKey = (objectKey: string): string => {
  // Remove any API prefix if present
  if (objectKey.startsWith('/api/files/')) {
    return objectKey.substring('/api/files/'.length);
  }
  
  return objectKey;
};

/**
 * Creates a permanent object key for product images
 */
export const createProductImageKey = (
  productId: number | string,
  filename: string,
  index: number = 0
): string => {
  const sanitizedFilename = filename.replace(/[^a-z0-9.-]/gi, '-').toLowerCase();
  return `products/${productId}/${index}_${sanitizedFilename}`;
};

/**
 * Creates a temporary object key with a timestamp
 */
export const createTempImageKey = (filename: string): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 10);
  const sanitizedFilename = filename.replace(/[^a-z0-9.-]/gi, '-').toLowerCase();
  return `temp/pending/${timestamp}_${randomString}_${sanitizedFilename}`;
};

/**
 * Extracts the original filename from an object key
 */
export const getOriginalFilenameFromKey = (objectKey: string): string => {
  // Get the last part of the path
  const parts = objectKey.split('/');
  const filename = parts[parts.length - 1];
  
  // If it's a temp file with timestamp and random string, remove those
  if (objectKey.includes('temp/pending/')) {
    const filenameWithoutPrefix = filename.split('_').slice(2).join('_');
    return filenameWithoutPrefix;
  }
  
  // If it's a product file with index, remove the index
  if (objectKey.includes('products/')) {
    const filenameWithoutIndex = filename.split('_').slice(1).join('_');
    return filenameWithoutIndex;
  }
  
  return filename;
};

/**
 * Moves temporary files to permanent storage for a product
 */
export const moveTempFilesToProduct = async (
  productId: number | string,
  tempObjectKeys: string[]
): Promise<{ success: boolean; data: any }> => {
  try {
    const response = await fetch(`/api/move-temp-files/${productId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ objectKeys: tempObjectKeys })
    });

    if (!response.ok) {
      throw new Error(`Failed to move files: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error moving temporary files:', error);
    throw error;
  }
};

/**
 * Deletes files from the Object Store
 */
export const deleteFiles = async (
  objectKeys: string[]
): Promise<{ success: boolean; data: any }> => {
  try {
    const response = await fetch('/api/delete-files', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ objectKeys })
    });

    if (!response.ok) {
      throw new Error(`Failed to delete files: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting files:', error);
    throw error;
  }
};

/**
 * Creates a revocable object URL for a file
 * Returns the URL and a cleanup function
 */
export const createObjectURL = (file: File | Blob): { url: string; revoke: () => void } => {
  const url = URL.createObjectURL(file);
  
  return {
    url,
    revoke: () => URL.revokeObjectURL(url)
  };
};

/**
 * Gets an absolute URL for a file in the Object Store
 */
export const getAbsoluteFileUrl = (objectKey: string): string => {
  // First ensure the object key has the /api/files prefix
  const objectPath = objectKey.startsWith('/api/files/')
    ? objectKey
    : `/api/files/${objectKey}`;
  
  // Then get the absolute URL by combining with the current host
  const baseUrl = window.location.origin;
  const absolutePath = objectPath.startsWith('/')
    ? objectPath
    : `/${objectPath}`;
  
  return `${baseUrl}${absolutePath}`;
};

/**
 * Check if an image exists and is accessible
 */
export const checkImageExists = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Error checking image existence:', error);
    return false;
  }
};