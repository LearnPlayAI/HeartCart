/**
 * File Utilities Module
 * 
 * Provides utility functions for handling files, filenames, and file URLs
 * throughout the application.
 */

/**
 * Sanitize a filename to remove any invalid characters
 * to ensure compatibility with various systems and object stores
 */
export const sanitizeFilename = (filename: string): string => {
  if (!filename) return '';
  
  // Replace any character that's not alphanumeric, dot, hyphen, or underscore
  return filename
    .replace(/[^\w.-]/g, '-') // Replace invalid characters with hyphens
    .replace(/\.{2,}/g, '.') // Replace multiple dots with a single dot
    .replace(/^[.-]+|[.-]+$/g, '') // Remove leading/trailing dots and hyphens
    .toLowerCase(); // Convert to lowercase for consistency
};

/**
 * Check if a file has an allowed extension
 */
export const hasAllowedExtension = (
  filename: string, 
  allowedExtensions: string[] = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
): boolean => {
  if (!filename) return false;
  
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  return allowedExtensions.includes(extension);
};

/**
 * Check if a file is an image based on its extension
 */
export const isImageFile = (filename: string): boolean => {
  return hasAllowedExtension(filename, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'tif']);
};

/**
 * Generate a unique filename by adding a timestamp
 */
export const generateUniqueFilename = (filename: string): string => {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 10);
  
  const parts = filename.split('.');
  const extension = parts.pop() || '';
  const baseName = parts.join('.');
  
  return `${baseName}_${timestamp}_${randomStr}.${extension}`;
};

/**
 * Get content type from filename
 */
export const getContentTypeFromFilename = (filename: string): string => {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  
  const contentTypeMap: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'txt': 'text/plain',
    'csv': 'text/csv',
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    'mp4': 'video/mp4',
    'mp3': 'audio/mpeg',
  };
  
  return contentTypeMap[extension] || 'application/octet-stream';
};

/**
 * Calculate file size in readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Encode a filename for use in URLs
 */
export const encodeFileUrl = (filename: string): string => {
  // Split the path to encode each part separately
  const parts = filename.split('/');
  const encodedParts = parts.map(part => encodeURIComponent(part));
  
  return encodedParts.join('/');
};

/**
 * Ensure a file URL is valid and properly encoded
 */
export const ensureValidImageUrl = (url: string): string => {
  if (!url) return '';
  
  // If it's already a data URL, return as is
  if (url.startsWith('data:')) {
    return url;
  }
  
  // If it's not an absolute URL (no protocol), assume it's a relative path
  if (!url.match(/^(https?:)?\/\//)) {
    // Don't double-encode URLs that already have encoded parts
    if (!url.includes('%')) {
      // Handle API endpoint paths specifically for files
      if (url.startsWith('/api/files/')) {
        const basePath = '/api/files/';
        const filePath = url.substring(basePath.length);
        return `${basePath}${encodeFileUrl(filePath)}`;
      }
      
      return encodeFileUrl(url);
    }
  }
  
  return url;
};

/**
 * Convert a data URL to a File object
 */
export const dataURLtoFile = (dataurl: string, filename: string): File => {
  // Extract the content type and base64 data
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || '';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  // Convert to Uint8Array
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  // Create a File object
  return new File([u8arr], sanitizeFilename(filename), { type: mime });
};

/**
 * Create a File object from a URL (fetches the content)
 */
export const urlToFile = async (url: string, filename: string): Promise<File> => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new File([blob], sanitizeFilename(filename), { type: blob.type });
};