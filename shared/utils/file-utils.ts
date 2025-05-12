/**
 * File Utilities for TeeMeYou
 * 
 * This module provides utility functions for handling files,
 * including sanitizing filenames and validating file types.
 */

/**
 * Sanitize a filename to ensure it's safe for storage and URLs
 * - Removes illegal characters
 * - Replaces spaces with hyphens
 * - Ensures filename is URL-safe
 * 
 * @param filename Original filename
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return '';
  
  // Replace spaces with hyphens
  let sanitized = filename.replace(/\s+/g, '-');
  
  // Remove any characters that aren't alphanumeric, hyphens, underscores, or periods
  // This keeps the extension intact while removing problematic characters
  sanitized = sanitized.replace(/[^a-zA-Z0-9\-_\.]/g, '');
  
  // Ensure we don't have consecutive hyphens or underscores
  sanitized = sanitized.replace(/[-_]{2,}/g, '-');
  
  // Ensure filename doesn't start or end with a hyphen or underscore
  sanitized = sanitized.replace(/^[-_]+|[-_]+$/g, '');
  
  return sanitized;
}

/**
 * Check if a file has an allowed extension
 * 
 * @param filename Filename to check
 * @param allowedExtensions Array of allowed extensions (without the dot)
 * @returns Boolean indicating if the file extension is allowed
 */
export function hasAllowedExtension(filename: string, allowedExtensions: string[]): boolean {
  if (!filename) return false;
  
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  return allowedExtensions.includes(extension);
}

/**
 * Validate if a file is an image
 * 
 * @param filename Filename to check
 * @returns Boolean indicating if the file is an image
 */
export function isImageFile(filename: string): boolean {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
  return hasAllowedExtension(filename, imageExtensions);
}

/**
 * Generate a unique filename to prevent overwrites
 * Uses timestamp and random string to ensure uniqueness
 * 
 * @param originalFilename Original filename
 * @returns Unique filename with preserved extension
 */
export function generateUniqueFilename(originalFilename: string): string {
  const sanitized = sanitizeFilename(originalFilename);
  
  if (!sanitized) return '';
  
  // Split filename and extension
  const parts = sanitized.split('.');
  const extension = parts.length > 1 ? parts.pop() : '';
  const filename = parts.join('.');
  
  // Add timestamp and random string
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  
  return `${filename}-${timestamp}-${randomString}${extension ? `.${extension}` : ''}`;
}

/**
 * Get content type (MIME type) based on file extension
 * 
 * @param filename Filename to check
 * @returns MIME type string or null if not recognized
 */
export function getContentTypeFromFilename(filename: string): string | null {
  if (!filename) return null;
  
  const extension = filename.split('.').pop()?.toLowerCase();
  if (!extension) return null;
  
  const mimeTypes: Record<string, string> = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'bmp': 'image/bmp',
    
    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    
    // Archives
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    'tar': 'application/x-tar',
    'gz': 'application/gzip',
    
    // Text
    'txt': 'text/plain',
    'csv': 'text/csv',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'text/javascript',
    
    // Other
    'json': 'application/json',
    'xml': 'application/xml'
  };
  
  return mimeTypes[extension] || null;
}

/**
 * Ensure a valid image URL by properly encoding the URL
 * Handles spaces, special characters, and other URL encoding issues
 * 
 * @param url Original image URL
 * @returns Properly encoded URL
 */
export function ensureValidImageUrl(url: string): string {
  if (!url) return '';
  
  try {
    // If URL already has a protocol, parse it properly
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const parsedUrl = new URL(url);
      return parsedUrl.toString();
    }
    
    // If it's a relative URL, encode the path components but preserve slashes
    return url.split('/').map(segment => encodeURIComponent(segment)).join('/');
  } catch (error) {
    // If URL parsing fails, do a simple encoding
    return encodeURI(url);
  }
}