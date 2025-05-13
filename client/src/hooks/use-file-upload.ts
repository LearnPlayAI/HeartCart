/**
 * useFileUpload Hook
 * 
 * A custom hook for managing file uploads in the application.
 * Provides functionality for selecting, validating, previewing, and uploading files.
 */

import { useState, useEffect, useCallback } from 'react';
import { formatFileSize, hasAllowedExtension, isImageFile } from '@/utils/file-utils';
import { createObjectURL } from '@/utils/file-manager';
import { useToast } from '@/hooks/use-toast';

type FileUploadErrors = {
  [key: string]: string;
};

interface FilePreview {
  file: File;
  preview: string;
  objectKey?: string;
  isMain: boolean;
  order: number;
  metadata?: Record<string, any>;
}

interface FileUploadOptions {
  maxFiles?: number;
  maxSizeMB?: number;
  allowedExtensions?: string[];
  endpoint: string;
  additionalData?: Record<string, any>;
  onSuccess?: (uploadedFiles: FileUploadResult[]) => void;
  onError?: (error: any) => void;
}

export interface FileUploadResult {
  url: string;
  objectKey: string;
  isMain: boolean;
  order: number;
  metadata?: Record<string, any>;
}

/**
 * Custom hook for managing file uploads with previews and validation
 */
export const useFileUpload = ({
  maxFiles = 5,
  maxSizeMB = 5,
  allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
  endpoint,
  additionalData = {},
  onSuccess,
  onError
}: FileUploadOptions) => {
  const [selectedFiles, setSelectedFiles] = useState<FilePreview[]>([]);
  const [results, setResults] = useState<FileUploadResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  
  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      selectedFiles.forEach(preview => {
        if (preview.preview.startsWith('blob:')) {
          URL.revokeObjectURL(preview.preview);
        }
      });
    };
  }, [selectedFiles]);
  
  /**
   * Validate files before adding them to the selection
   */
  const validateFiles = useCallback((files: File[]): { valid: File[], errors: FileUploadErrors } => {
    const validFiles: File[] = [];
    const errors: FileUploadErrors = {};
    
    files.forEach(file => {
      // Check file size
      if (file.size > maxSizeMB * 1024 * 1024) {
        errors[file.name] = `File size exceeds ${maxSizeMB}MB limit. This file is ${formatFileSize(file.size)}.`;
        return;
      }
      
      // Check file extension
      if (!hasAllowedExtension(file.name, allowedExtensions)) {
        errors[file.name] = `File type not allowed. Allowed types: ${allowedExtensions.join(', ')}`;
        return;
      }
      
      validFiles.push(file);
    });
    
    return { valid: validFiles, errors };
  }, [maxSizeMB, allowedExtensions]);
  
  /**
   * Add files to the selection
   */
  const addFiles = useCallback((files: File[]) => {
    if (!files.length) return;
    
    const { valid, errors } = validateFiles(files);
    
    // Show errors if any
    if (Object.keys(errors).length > 0) {
      Object.values(errors).forEach(errorMsg => {
        toast({
          title: 'File validation error',
          description: errorMsg,
          variant: 'destructive'
        });
      });
    }
    
    // Check if adding these files would exceed the maximum
    if (selectedFiles.length + valid.length > maxFiles) {
      toast({
        title: 'Too many files',
        description: `You can upload a maximum of ${maxFiles} files.`,
        variant: 'destructive'
      });
      
      // Only add up to the maximum
      const remainingSlots = Math.max(0, maxFiles - selectedFiles.length);
      valid.splice(remainingSlots);
    }
    
    // Add valid files to the selection
    setSelectedFiles(prev => [
      ...prev,
      ...valid.map((file, index) => ({
        file,
        preview: createObjectURL(file).url,
        isMain: prev.length === 0 && index === 0, // First file is main by default
        order: prev.length + index,
        metadata: {
          originalname: file.name
        }
      }))
    ]);
  }, [selectedFiles, validateFiles, maxFiles, toast]);
  
  /**
   * Remove a file from the selection
   */
  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => {
      const newFiles = [...prev];
      
      // If removing the main image, set the first remaining image as main
      if (newFiles[index]?.isMain && newFiles.length > 1) {
        const nextIndex = index === 0 ? 1 : 0;
        newFiles[nextIndex].isMain = true;
      }
      
      // Clean up the object URL
      if (newFiles[index]?.preview.startsWith('blob:')) {
        URL.revokeObjectURL(newFiles[index].preview);
      }
      
      // Remove the file
      newFiles.splice(index, 1);
      
      // Update order numbers
      newFiles.forEach((file, i) => {
        file.order = i;
      });
      
      return newFiles;
    });
  }, []);
  
  /**
   * Set a file as the main image
   */
  const setMainImage = useCallback((index: number) => {
    setSelectedFiles(prev => {
      const newFiles = [...prev];
      
      // Update isMain status for all files
      newFiles.forEach((file, i) => {
        file.isMain = i === index;
      });
      
      return newFiles;
    });
  }, []);
  
  /**
   * Reorder the files
   */
  const reorderImages = useCallback((sourceIndex: number, destinationIndex: number) => {
    setSelectedFiles(prev => {
      const newFiles = [...prev];
      const [removed] = newFiles.splice(sourceIndex, 1);
      newFiles.splice(destinationIndex, 0, removed);
      
      // Update order numbers
      newFiles.forEach((file, i) => {
        file.order = i;
      });
      
      return newFiles;
    });
  }, []);
  
  /**
   * Upload all selected files
   */
  const uploadAllFiles = useCallback(async (): Promise<FileUploadResult[]> => {
    if (selectedFiles.length === 0) {
      setError('No files selected for upload');
      return [];
    }
    
    setIsUploading(true);
    setProgress(0);
    setError(null);
    
    try {
      const uploadPromises = selectedFiles.map(async (filePreview, index) => {
        const formData = new FormData();
        formData.append('file', filePreview.file);
        formData.append('isMain', filePreview.isMain ? 'true' : 'false');
        formData.append('order', filePreview.order.toString());
        
        // Add any additional data to the form
        Object.entries(additionalData).forEach(([key, value]) => {
          formData.append(key, value?.toString() || '');
        });
        
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Update progress
        setProgress(prev => prev + (100 / selectedFiles.length));
        
        return result.data;
      });
      
      // Wait for all uploads to complete
      const uploadResults = await Promise.all(uploadPromises);
      setResults(uploadResults);
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess(uploadResults);
      }
      
      return uploadResults;
    } catch (err: any) {
      setError(err.message || 'Failed to upload files');
      
      // Call error callback if provided
      if (onError) {
        onError(err);
      }
      
      toast({
        title: 'Upload failed',
        description: err.message || 'Failed to upload files',
        variant: 'destructive'
      });
      
      return [];
    } finally {
      setIsUploading(false);
    }
  }, [selectedFiles, endpoint, additionalData, onSuccess, onError, toast]);
  
  /**
   * Upload a single file
   */
  const uploadFile = useCallback(async (file: File, isMain: boolean = false, orderPosition: number = 0): Promise<FileUploadResult | null> => {
    setIsUploading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('isMain', isMain ? 'true' : 'false');
      formData.append('order', orderPosition.toString());
      
      // Add any additional data to the form
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value?.toString() || '');
      });
      
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.data;
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
      
      if (onError) {
        onError(err);
      }
      
      toast({
        title: 'Upload failed',
        description: err.message || 'Failed to upload file',
        variant: 'destructive'
      });
      
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [endpoint, additionalData, onError, toast]);
  
  /**
   * Clear all selected files
   */
  const clearFiles = useCallback(() => {
    selectedFiles.forEach(preview => {
      if (preview.preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview.preview);
      }
    });
    
    setSelectedFiles([]);
    setResults([]);
    setError(null);
  }, [selectedFiles]);
  
  return {
    addFiles,
    removeFile,
    setMainImage,
    reorderImages,
    uploadAllFiles,
    uploadFile,
    clearFiles,
    selectedFiles,
    isUploading,
    progress,
    error,
    results,
    images: selectedFiles.map(f => f.file),
    previews: selectedFiles.map(f => f.preview),
    mainImage: selectedFiles.find(f => f.isMain)?.file || null,
    mainPreview: selectedFiles.find(f => f.isMain)?.preview || '',
  };
};