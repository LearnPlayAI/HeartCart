/**
 * File Manager Utility
 * 
 * Provides functions for handling file uploads, processing, and storage
 * using Replit Object Store. This implements the central file management
 * system for the application.
 */

import axios from 'axios';

// Define storage buckets for organizing files
export enum StorageBucket {
  PRODUCTS = 'products',
  CATEGORIES = 'categories',
  CATALOGS = 'catalogs',
  SUPPLIER_LOGOS = 'supplier-logos',
  THUMBNAILS = 'thumbnails',
  TEMP = 'temp'
}

// Allowed file types
export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif'];
export const ALLOWED_DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt'];

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif'
];

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain'
];

// File size limits
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024; // 20MB

/**
 * Interface for file metadata
 */
export interface FileMetadata {
  originalName: string;
  contentType: string;
  size: number;
  bucket: string;
  objectKey: string;
  uploadDate: string;
  publicUrl?: string;
  additionalData?: Record<string, any>;
}

/**
 * Interface for upload result
 */
export interface UploadResult {
  success: boolean;
  objectKey?: string;
  url?: string;
  error?: string;
  metadata?: FileMetadata;
}

/**
 * Generate a safe filename for storage
 * Removes special characters, replaces spaces with underscores, and adds a timestamp
 */
export function generateSafeFilename(originalFilename: string): string {
  // Extract the extension
  const lastDotIndex = originalFilename.lastIndexOf('.');
  const extension = lastDotIndex !== -1 ? originalFilename.slice(lastDotIndex) : '';
  let basename = lastDotIndex !== -1 ? originalFilename.slice(0, lastDotIndex) : originalFilename;
  
  // Sanitize the basename - remove special chars, and replace spaces with underscores
  basename = basename
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_{2,}/g, '_'); // Replace multiple underscores with a single one
  
  // Add timestamp to avoid naming conflicts
  const timestamp = Date.now();
  return `${basename}_${timestamp}${extension}`;
}

/**
 * Generate a unique object key for a file in a specific bucket
 */
export function generateObjectKey(filename: string, bucket: StorageBucket): string {
  const safeFilename = generateSafeFilename(filename);
  return `${bucket}/${safeFilename}`;
}

/**
 * Check if a file is an image based on its MIME type
 */
export function isImage(file: File): boolean {
  return ALLOWED_IMAGE_MIME_TYPES.includes(file.type);
}

/**
 * Check if a file is a document based on its MIME type
 */
export function isDocument(file: File): boolean {
  return ALLOWED_DOCUMENT_MIME_TYPES.includes(file.type);
}

/**
 * Check if a file is too large based on its type
 */
export function isFileTooLarge(file: File): boolean {
  if (isImage(file)) {
    return file.size > MAX_IMAGE_SIZE;
  }
  if (isDocument(file)) {
    return file.size > MAX_DOCUMENT_SIZE;
  }
  return true; // If not an image or document, consider it too large
}

/**
 * Upload a file to the server
 */
export async function uploadFile(
  file: File, 
  bucket: StorageBucket,
  additionalMetadata?: Record<string, any>
): Promise<UploadResult> {
  try {
    // Validate file before uploading
    if (!isImage(file) && !isDocument(file)) {
      return {
        success: false,
        error: 'Unsupported file type. Please upload an image or document.'
      };
    }
    
    if (isFileTooLarge(file)) {
      return {
        success: false,
        error: `File is too large. Maximum size for ${isImage(file) ? 'images' : 'documents'} is ${isImage(file) ? MAX_IMAGE_SIZE / (1024 * 1024) : MAX_DOCUMENT_SIZE / (1024 * 1024)}MB.`
      };
    }
    
    // Create a FormData object
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);
    
    // Add additional metadata if provided
    if (additionalMetadata) {
      formData.append('metadata', JSON.stringify(additionalMetadata));
    }
    
    // Make the API request
    const response = await axios.post('/api/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        // You can track upload progress here if needed
        // const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
      }
    });
    
    if (response.data && response.data.success) {
      return {
        success: true,
        objectKey: response.data.objectKey,
        url: response.data.url,
        metadata: response.data.metadata
      };
    } else {
      throw new Error(response.data?.error || 'Upload failed');
    }
    
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload file. Please try again.'
    };
  }
}

/**
 * Delete a file from the server
 */
export async function deleteFile(objectKey: string): Promise<boolean> {
  try {
    const response = await axios.delete(`/api/files/${encodeURIComponent(objectKey)}`);
    return response.data && response.data.success;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

/**
 * Get metadata for a file
 */
export async function getFileMetadata(objectKey: string): Promise<FileMetadata | null> {
  try {
    const response = await axios.get(`/api/files/${encodeURIComponent(objectKey)}/metadata`);
    if (response.data && response.data.success) {
      return response.data.metadata;
    }
    return null;
  } catch (error) {
    console.error('Error getting file metadata:', error);
    return null;
  }
}

/**
 * List files in a bucket
 */
export async function listFiles(
  bucket: StorageBucket, 
  options?: { 
    prefix?: string;
    limit?: number;
    includeMetadata?: boolean;
  }
): Promise<{ files: string[]; metadata?: FileMetadata[] }> {
  try {
    let url = `/api/files/list/${bucket}`;
    const queryParams = new URLSearchParams();
    
    if (options?.prefix) {
      queryParams.append('prefix', options.prefix);
    }
    
    if (options?.limit) {
      queryParams.append('limit', options.limit.toString());
    }
    
    if (options?.includeMetadata) {
      queryParams.append('includeMetadata', 'true');
    }
    
    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }
    
    const response = await axios.get(url);
    
    if (response.data && response.data.success) {
      return {
        files: response.data.files,
        metadata: response.data.metadata
      };
    }
    
    return { files: [] };
  } catch (error) {
    console.error('Error listing files:', error);
    return { files: [] };
  }
}

/**
 * Remove the background from an image
 */
export async function removeImageBackground(objectKey: string): Promise<UploadResult> {
  try {
    const response = await axios.post('/api/files/remove-background', {
      objectKey
    });
    
    if (response.data && response.data.success) {
      return {
        success: true,
        objectKey: response.data.objectKey,
        url: response.data.url
      };
    } else {
      throw new Error(response.data?.error || 'Failed to remove background');
    }
  } catch (error: any) {
    console.error('Error removing background:', error);
    return {
      success: false,
      error: error.message || 'Failed to remove background. Please try again.'
    };
  }
}

/**
 * Convert a file to a data URL for preview
 */
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Get a full URL for an object in the store
 */
export function getObjectUrl(objectKey: string): string {
  // Base URL for the object store
  return `/api/files/${encodeURIComponent(objectKey)}`;
}

/**
 * Move a file from one bucket to another
 */
export async function moveFile(
  sourceObjectKey: string,
  destinationBucket: StorageBucket
): Promise<UploadResult> {
  try {
    const response = await axios.post('/api/files/move', {
      sourceObjectKey,
      destinationBucket
    });
    
    if (response.data && response.data.success) {
      return {
        success: true,
        objectKey: response.data.objectKey,
        url: response.data.url
      };
    } else {
      throw new Error(response.data?.error || 'Failed to move file');
    }
  } catch (error: any) {
    console.error('Error moving file:', error);
    return {
      success: false,
      error: error.message || 'Failed to move file. Please try again.'
    };
  }
}

/**
 * Ensure an image URL is valid and accessible
 */
export function ensureValidImageUrl(url: string): string {
  // Check if URL is already absolute
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Check if this is an object key
  if (url.includes('/')) {
    return getObjectUrl(url);
  }
  
  // Fallback to a placeholder
  return url;
}

/**
 * Handle image optimization (resize, compress, etc.)
 */
export async function optimizeImage(
  objectKey: string, 
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'jpeg' | 'png' | 'webp';
  }
): Promise<UploadResult> {
  try {
    const response = await axios.post('/api/files/optimize', {
      objectKey,
      ...options
    });
    
    if (response.data && response.data.success) {
      return {
        success: true,
        objectKey: response.data.objectKey,
        url: response.data.url
      };
    } else {
      throw new Error(response.data?.error || 'Failed to optimize image');
    }
  } catch (error: any) {
    console.error('Error optimizing image:', error);
    return {
      success: false,
      error: error.message || 'Failed to optimize image. Please try again.'
    };
  }
}

/**
 * Generate a thumbnail for an image
 */
export async function generateThumbnail(
  objectKey: string,
  options: {
    width: number;
    height: number;
  }
): Promise<UploadResult> {
  try {
    const response = await axios.post('/api/files/thumbnail', {
      objectKey,
      ...options
    });
    
    if (response.data && response.data.success) {
      return {
        success: true,
        objectKey: response.data.objectKey,
        url: response.data.url
      };
    } else {
      throw new Error(response.data?.error || 'Failed to generate thumbnail');
    }
  } catch (error: any) {
    console.error('Error generating thumbnail:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate thumbnail. Please try again.'
    };
  }
}