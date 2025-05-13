/**
 * File Upload Hook
 * 
 * Custom hook to handle file uploads to the Replit Object Store.
 * Provides functions for uploading, removing backgrounds, and tracking upload state.
 */

import { useState, useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';

interface UploadResult {
  url: string;
  objectKey: string;
}

export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Upload a file to the server
   * 
   * @param file The file to upload
   * @param folder Optional folder path within the storage bucket
   * @returns Promise with the URL and object key of the uploaded file
   */
  const uploadFile = useCallback(async (file: File, folder: string = ''): Promise<UploadResult> => {
    setIsUploading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      if (folder) {
        formData.append('folder', folder);
      }
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Upload failed');
      }
      
      // Handle both response formats (with data field or direct properties)
      if (data.data && data.data.url) {
        // New standardized format
        return {
          url: data.data.url,
          objectKey: data.data.objectKey
        };
      } else if (data.url) {
        // Legacy direct format
        return {
          url: data.url,
          objectKey: data.objectKey
        };
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  /**
   * Remove the background from an image using the AI service
   * 
   * @param imageUrl URL of the image to process
   * @returns Promise with the URL of the processed image
   */
  const removeBackground = useCallback(async (imageUrl: string): Promise<string> => {
    setIsUploading(true);
    setError(null);
    
    try {
      const response = await apiRequest('/api/ai/remove-background', {
        method: 'POST',
        body: JSON.stringify({ imageUrl }),
      });
      
      if (!response.success) {
        throw new Error(response.message || 'Background removal failed');
      }
      
      return response.data.processedImageUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Background removal failed');
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  /**
   * Delete a file from the server
   * 
   * @param objectKey The object key of the file to delete
   * @returns Promise with success indicator
   */
  const deleteFile = useCallback(async (objectKey: string): Promise<boolean> => {
    setIsUploading(true);
    setError(null);
    
    try {
      const response = await apiRequest('/api/files/delete', {
        method: 'POST',
        body: JSON.stringify({ objectKey }),
      });
      
      if (!response.success) {
        throw new Error(response.message || 'Delete failed');
      }
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  return {
    uploadFile,
    removeBackground,
    deleteFile,
    isUploading,
    error,
    clearError: () => setError(null)
  };
}