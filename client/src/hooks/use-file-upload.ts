/**
 * File Upload Hook
 * 
 * Provides a reusable hook for handling file uploads with
 * drag and drop functionality, progress tracking, and validation.
 */

import { useState, useCallback } from 'react';
import { 
  uploadFile, 
  uploadMultipleFiles, 
  validateFileType, 
  validateFileSize, 
  isImageFile, 
  FileUploadOptions 
} from '@/utils/file-manager';

interface UseFileUploadOptions {
  maxSize?: number; // Maximum file size in bytes
  allowedTypes?: string[]; // Array of allowed file extensions (without dot)
  maxFiles?: number; // Maximum number of files to upload at once
  folder?: string; // Folder to upload to
  bucket?: string; // Bucket to upload to
  generateUniqueName?: boolean; // Whether to generate a unique name for the file
  onSuccess?: (urls: string[], objectKeys: string[]) => void; // Callback on successful upload
  onError?: (error: string) => void; // Callback on error
}

interface UseFileUploadReturn {
  files: File[]; // Current selected files
  fileUrls: string[]; // URLs of uploaded files
  objectKeys: string[]; // Object keys of uploaded files
  isDragging: boolean; // Whether user is currently dragging files
  isUploading: boolean; // Whether files are currently being uploaded
  progress: number; // Upload progress (0-100)
  error: string | null; // Error message if upload failed
  
  handleDragEnter: (e: React.DragEvent<HTMLElement>) => void;
  handleDragLeave: (e: React.DragEvent<HTMLElement>) => void;
  handleDragOver: (e: React.DragEvent<HTMLElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLElement>) => void;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadFiles: (files?: File[]) => Promise<boolean>;
  reset: () => void;
}

export function useFileUpload(options: UseFileUploadOptions = {}): UseFileUploadReturn {
  const {
    maxSize = 5 * 1024 * 1024, // Default: 5MB
    allowedTypes,
    maxFiles = 10,
    folder,
    bucket,
    generateUniqueName = true,
    onSuccess,
    onError
  } = options;
  
  const [files, setFiles] = useState<File[]>([]);
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [objectKeys, setObjectKeys] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  
  const handleDragOver = useCallback((e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);
  
  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, []);
  
  // Handle file selection from input
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  }, []);
  
  // Validate and process files
  const handleFiles = useCallback((newFiles: File[]) => {
    // Clear any previous errors
    setError(null);
    
    // Check file count
    if (maxFiles && newFiles.length > maxFiles) {
      setError(`You can upload a maximum of ${maxFiles} files at once.`);
      if (onError) onError(`You can upload a maximum of ${maxFiles} files at once.`);
      return;
    }
    
    // Validate file size and type
    const invalidFiles = newFiles.filter(file => {
      if (!validateFileSize(file, maxSize)) {
        setError(`File "${file.name}" exceeds the maximum size of ${maxSize / (1024 * 1024)}MB.`);
        return true;
      }
      
      if (allowedTypes && !validateFileType(file, allowedTypes)) {
        setError(`File "${file.name}" has an invalid type. Allowed types: ${allowedTypes.join(', ')}`);
        return true;
      }
      
      return false;
    });
    
    if (invalidFiles.length > 0) {
      if (onError) onError(error || 'Some files are invalid');
      return;
    }
    
    // Store valid files
    setFiles(newFiles);
  }, [maxFiles, maxSize, allowedTypes, onError, error]);
  
  // Upload files
  const uploadFiles = useCallback(async (manualFiles?: File[]): Promise<boolean> => {
    const filesToUpload = manualFiles || files;
    
    if (filesToUpload.length === 0) {
      setError('No files selected for upload.');
      if (onError) onError('No files selected for upload.');
      return false;
    }
    
    setIsUploading(true);
    setProgress(0);
    setError(null);
    
    try {
      const uploadOptions: FileUploadOptions = {
        bucket,
        folder,
        generateUniqueName,
      };
      
      if (filesToUpload.length === 1) {
        // Single file upload
        const result = await uploadFile(filesToUpload[0], uploadOptions);
        
        if (result.success) {
          setFileUrls([result.url]);
          setObjectKeys([result.objectKey]);
          
          if (onSuccess) onSuccess([result.url], [result.objectKey]);
          return true;
        } else {
          throw new Error(result.error || 'Upload failed');
        }
      } else {
        // Multiple files upload
        const results = await uploadMultipleFiles(
          filesToUpload,
          uploadOptions,
          (progress) => setProgress(progress)
        );
        
        const successfulUploads = results.filter(result => result.success);
        
        if (successfulUploads.length > 0) {
          const urls = successfulUploads.map(result => result.url);
          const keys = successfulUploads.map(result => result.objectKey);
          
          setFileUrls(urls);
          setObjectKeys(keys);
          
          if (onSuccess) onSuccess(urls, keys);
          
          if (successfulUploads.length < filesToUpload.length) {
            setError(`${filesToUpload.length - successfulUploads.length} files failed to upload.`);
            if (onError) onError(`${filesToUpload.length - successfulUploads.length} files failed to upload.`);
          }
          
          return true;
        } else {
          throw new Error('All uploads failed');
        }
      }
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred during upload';
      setError(errorMessage);
      if (onError) onError(errorMessage);
      return false;
    } finally {
      setIsUploading(false);
    }
  }, [files, bucket, folder, generateUniqueName, onSuccess, onError]);
  
  // Reset all state
  const reset = useCallback(() => {
    setFiles([]);
    setFileUrls([]);
    setObjectKeys([]);
    setIsDragging(false);
    setIsUploading(false);
    setProgress(0);
    setError(null);
  }, []);
  
  return {
    files,
    fileUrls,
    objectKeys,
    isDragging,
    isUploading,
    progress,
    error,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFileSelect,
    uploadFiles,
    reset,
  };
}