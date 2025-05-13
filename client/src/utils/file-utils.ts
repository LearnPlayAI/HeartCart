/**
 * File Utility Functions
 * 
 * This module provides standardized utility functions for file handling
 * across the application. Functions include filename sanitization,
 * file validation, content type determination, and URL encoding.
 */

/**
 * Sanitizes a filename by removing invalid characters and replacing spaces
 * @param filename - The original filename to sanitize
 * @returns Sanitized filename safe for storage and URLs
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return '';
  
  // First replace any path-traversal characters
  let sanitized = filename.replace(/(\.\.|\/|\\)/g, '');
  
  // Replace spaces with hyphens and remove other unsafe characters
  sanitized = sanitized
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9.\-_]/g, '');
  
  // Ensure we don't have multiple consecutive hyphens
  sanitized = sanitized.replace(/-+/g, '-');
  
  // Ensure filename doesn't start or end with a hyphen
  sanitized = sanitized.replace(/^-|-$/g, '');
  
  // Limit filename length to prevent issues with storage systems
  if (sanitized.length > 200) {
    const extension = getFileExtension(sanitized);
    sanitized = sanitized.substring(0, 195 - extension.length) + extension;
  }
  
  return sanitized;
}

/**
 * Extracts the file extension from a filename
 * @param filename - The filename to extract extension from
 * @returns The extracted file extension including the dot (e.g. ".jpg")
 */
export function getFileExtension(filename: string): string {
  if (!filename) return '';
  
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) return '';
  
  return filename.substring(lastDotIndex).toLowerCase();
}

/**
 * Checks if a filename has one of the allowed extensions
 * @param filename - The filename to check
 * @param allowedExtensions - Array of allowed extensions (e.g. ['.jpg', '.png'])
 * @returns Boolean indicating if the file has an allowed extension
 */
export function hasAllowedExtension(filename: string, allowedExtensions: string[]): boolean {
  if (!filename || !allowedExtensions?.length) return false;
  
  const extension = getFileExtension(filename);
  return allowedExtensions.includes(extension.toLowerCase());
}

/**
 * Checks if a file is an image based on its extension
 * @param filename - The filename to check
 * @returns Boolean indicating if the file is an image
 */
export function isImageFile(filename: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
  return hasAllowedExtension(filename, imageExtensions);
}

/**
 * Generates a unique filename to avoid collisions
 * @param filename - The original filename
 * @returns A unique filename with timestamp added
 */
export function generateUniqueFilename(filename: string): string {
  if (!filename) return '';
  
  const timestamp = Date.now();
  const extension = getFileExtension(filename);
  const baseName = filename.substring(0, filename.length - extension.length);
  
  return `${sanitizeFilename(baseName)}-${timestamp}${extension}`;
}

/**
 * Determines the content type (MIME type) from a filename
 * @param filename - The filename to analyze
 * @returns The content type or 'application/octet-stream' if unknown
 */
export function getContentTypeFromFilename(filename: string): string {
  if (!filename) return 'application/octet-stream';
  
  const extension = getFileExtension(filename).toLowerCase();
  
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp',
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.doc': 'application/msword',
    '.xls': 'application/vnd.ms-excel',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript'
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
}

/**
 * Validates image URL format and ensures proper URL encoding
 * Also handles relative URL paths correctly
 * @param url - The image URL to validate/encode
 * @returns Properly formatted and encoded URL
 */
export function ensureValidImageUrl(url: string): string {
  if (!url) return '';
  
  // If the URL is already a data URL, return it as is
  if (url.startsWith('data:')) {
    return url;
  }
  
  // For relative URLs (no protocol), just ensure the path is properly encoded
  if (!url.match(/^(https?:\/\/|\/)/)) {
    // Add leading slash for relative URLs that don't have one
    url = url.startsWith('/') ? url : `/${url}`;
  }
  
  try {
    // Parse URL to get parts
    const urlObj = new URL(url, window.location.origin);
    
    // Ensure the path is properly encoded
    urlObj.pathname = urlObj.pathname
      .split('/')
      .map(segment => encodeURIComponent(decodeURIComponent(segment)))
      .join('/');
    
    return urlObj.toString();
  } catch (error) {
    // If URL parsing fails, do basic encoding as a fallback
    return url
      .split('/')
      .map((part, index) => {
        // Don't encode protocol or domain parts
        if (index < 3 && url.startsWith('http')) return part;
        return encodeURIComponent(decodeURIComponent(part));
      })
      .join('/');
  }
}

/**
 * Calculates human-readable file size
 * @param bytes - File size in bytes
 * @param decimals - Number of decimal places to show
 * @returns Human-readable size string (e.g. "1.5 MB")
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Creates object storage paths for files based on type and ID
 * @param type - The type of object (e.g. 'product', 'category', 'user')
 * @param id - The ID of the object
 * @param filename - The filename to store
 * @returns Standardized object storage path
 */
export function createObjectStoragePath(type: string, id: number | string, filename: string): string {
  const sanitizedType = type.replace(/[^a-z0-9]/gi, '').toLowerCase();
  const sanitizedFilename = sanitizeFilename(filename);
  
  return `${sanitizedType}/${id}/${sanitizedFilename}`;
}

/**
 * Extracts filename from a path or URL
 * @param path - The full path or URL
 * @returns The extracted filename
 */
export function extractFilenameFromPath(path: string): string {
  if (!path) return '';
  
  // Remove query string if present
  const pathWithoutQuery = path.split('?')[0];
  
  // Get the part after the last slash
  const parts = pathWithoutQuery.split('/');
  return parts[parts.length - 1];
}