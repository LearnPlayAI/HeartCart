/**
 * File Manager Utility
 * 
 * Provides functions for handling file uploads, validations,
 * and image processing integrated with the backend storage.
 */

import axios from 'axios';

// Types
export interface FileUploadOptions {
  bucket?: string;
  folder?: string;
  generateUniqueName?: boolean;
  overwrite?: boolean;
  metadata?: Record<string, string>;
  responseType?: 'json' | 'text';
}

export interface FileUploadResponse {
  success: boolean;
  url: string;
  objectKey: string;
  message?: string;
  error?: string;
}

export interface FileDeleteResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Upload a file to the server's object storage
 */
export const uploadFile = async (file: File, options: FileUploadOptions = {}): Promise<FileUploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  
  // Add options to formData
  if (options.bucket) {
    formData.append('bucket', options.bucket);
  }
  
  if (options.folder) {
    formData.append('folder', options.folder);
  }
  
  if (options.generateUniqueName !== undefined) {
    formData.append('generateUniqueName', options.generateUniqueName.toString());
  }
  
  if (options.overwrite !== undefined) {
    formData.append('overwrite', options.overwrite.toString());
  }
  
  if (options.metadata) {
    formData.append('metadata', JSON.stringify(options.metadata));
  }
  
  try {
    const response = await axios.post('/api/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return {
      success: false,
      url: '',
      objectKey: '',
      error: error.response?.data?.error || 'Failed to upload file',
    };
  }
};

/**
 * Delete a file from the server's object storage
 */
export const deleteFile = async (objectKey: string, bucket?: string): Promise<FileDeleteResponse> => {
  try {
    const response = await axios.delete('/api/files/delete', {
      data: {
        objectKey,
        bucket,
      },
    });
    
    return response.data;
  } catch (error: any) {
    console.error('Error deleting file:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to delete file',
    };
  }
};

/**
 * Validate file type against allowed extensions
 */
export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
  return allowedTypes.includes(fileExtension);
};

/**
 * Validate file size against maximum size in bytes
 */
export const validateFileSize = (file: File, maxSizeBytes: number): boolean => {
  return file.size <= maxSizeBytes;
};

/**
 * Checks if a file is an image
 */
export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};

/**
 * Converts a File object to a base64 string
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

/**
 * Converts a base64 string to a Blob object
 */
export const base64ToBlob = (base64: string, mimeType: string): Blob => {
  const byteString = atob(base64.split(',')[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  
  return new Blob([ab], { type: mimeType });
};

/**
 * Ensures a URL is properly formatted, handling both relative and absolute URLs
 */
export const ensureValidImageUrl = (url: string): string => {
  if (!url) return '';
  
  // If it's already an absolute URL, return it as is
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  
  // If it's a relative URL starting with a slash, add the base URL
  if (url.startsWith('/')) {
    return `${window.location.origin}${url}`;
  }
  
  // Otherwise, assume it's a relative URL without a leading slash
  return `${window.location.origin}/${url}`;
};

/**
 * Remove background from an image using the backend AI service
 */
export const removeImageBackground = async (imageUrl: string): Promise<string | null> => {
  try {
    const response = await axios.post('/api/images/remove-background', {
      imageUrl,
    });
    
    if (response.data.success) {
      return response.data.imageUrl;
    }
    
    console.error('Background removal failed:', response.data.message);
    return null;
  } catch (error) {
    console.error('Error removing background:', error);
    return null;
  }
};

/**
 * Upload multiple files with progress tracking
 */
export const uploadMultipleFiles = async (
  files: File[],
  options: FileUploadOptions = {},
  onProgress?: (progress: number) => void
): Promise<FileUploadResponse[]> => {
  const results: FileUploadResponse[] = [];
  let completed = 0;
  
  for (const file of files) {
    try {
      const result = await uploadFile(file, options);
      results.push(result);
      
      completed++;
      if (onProgress) {
        onProgress((completed / files.length) * 100);
      }
    } catch (error) {
      results.push({
        success: false,
        url: '',
        objectKey: '',
        error: 'Failed to upload file',
      });
      
      completed++;
      if (onProgress) {
        onProgress((completed / files.length) * 100);
      }
    }
  }
  
  return results;
};

/**
 * Generate a thumbnail from an image file
 */
export const generateThumbnail = async (file: File, maxWidth: number = 200, maxHeight: number = 200): Promise<Blob | null> => {
  return new Promise((resolve) => {
    if (!isImageFile(file)) {
      resolve(null);
      return;
    }
    
    const img = new Image();
    img.src = URL.createObjectURL(file);
    
    img.onload = () => {
      // Calculate dimensions while maintaining aspect ratio
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }
      
      // Create canvas and resize image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to blob
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(img.src);
          resolve(blob);
        },
        'image/jpeg',
        0.8
      );
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      resolve(null);
    };
  });
};

/**
 * Get file information
 */
export const getFileInfo = async (objectKey: string, bucket?: string): Promise<any> => {
  try {
    const response = await axios.get('/api/files/info', {
      params: {
        objectKey,
        bucket,
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting file info:', error);
    return { success: false, error: 'Failed to get file info' };
  }
};