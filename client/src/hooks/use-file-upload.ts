/**
 * Custom hook for handling file uploads with drag-and-drop functionality
 */

import { useState, useRef, useCallback } from 'react';
import { StorageBucket, uploadFile } from '@/utils/file-manager';

interface UseFileUploadOptions {
  bucket: StorageBucket;
  maxFiles?: number;
  acceptedFileTypes?: string[];
  additionalMetadata?: Record<string, any>;
  onUploadSuccess?: (objectKey: string, url: string) => void;
  onUploadError?: (error: string) => void;
}

interface FileUploadState {
  isDragging: boolean;
  isUploading: boolean;
  uploadProgress: number;
  files: File[];
  previews: string[];
  uploadedObjectKeys: string[];
  uploadedUrls: string[];
  errors: string[];
}

/**
 * Custom hook for handling file uploads with drag-and-drop functionality
 */
export function useFileUpload({
  bucket,
  maxFiles = 5,
  acceptedFileTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  additionalMetadata = {},
  onUploadSuccess,
  onUploadError
}: UseFileUploadOptions) {
  // State for drag and drop interactions
  const [state, setState] = useState<FileUploadState>({
    isDragging: false,
    isUploading: false,
    uploadProgress: 0,
    files: [],
    previews: [],
    uploadedObjectKeys: [],
    uploadedUrls: [],
    errors: []
  });
  
  // Ref for file input element
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Event handlers for drag and drop
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setState(prev => ({ ...prev, isDragging: true }));
    }
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setState(prev => ({ ...prev, isDragging: false }));
  }, []);
  
  // Process the files
  const processFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    // Reset upload progress
    setState(prev => ({
      ...prev,
      isUploading: true,
      uploadProgress: 0
    }));
    
    // Convert FileList to array
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const newErrors: string[] = [];
    
    // Validate files
    for (const file of fileArray) {
      // Check file type
      if (acceptedFileTypes.length > 0 && !acceptedFileTypes.includes(file.type)) {
        newErrors.push(`File "${file.name}" has an unsupported type. Accepted types: ${acceptedFileTypes.join(', ')}`);
        continue;
      }
      
      validFiles.push(file);
      
      // Check maximum files
      if (validFiles.length > maxFiles) {
        newErrors.push(`Maximum of ${maxFiles} files allowed. Additional files will be ignored.`);
        break;
      }
    }
    
    // If there are validation errors, show them and stop the process
    if (newErrors.length > 0) {
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, ...newErrors],
        isUploading: false
      }));
      
      // Call the error callback with the first error
      if (onUploadError && newErrors.length > 0) {
        onUploadError(newErrors[0]);
      }
      
      return;
    }
    
    // Process valid files
    const filesToProcess = validFiles.slice(0, maxFiles);
    
    // Set the files in state
    setState(prev => ({
      ...prev,
      files: [...prev.files, ...filesToProcess]
    }));
    
    // Upload files one by one
    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      
      // Update progress
      setState(prev => ({
        ...prev,
        uploadProgress: Math.round((i / filesToProcess.length) * 100)
      }));
      
      try {
        // Upload file
        const result = await uploadFile(file, bucket, additionalMetadata);
        
        if (result.success && result.objectKey && result.url) {
          // Add to uploaded list
          setState(prev => ({
            ...prev,
            uploadedObjectKeys: [...prev.uploadedObjectKeys, result.objectKey!],
            uploadedUrls: [...prev.uploadedUrls, result.url!]
          }));
          
          // Call success callback
          if (onUploadSuccess) {
            onUploadSuccess(result.objectKey, result.url);
          }
        } else {
          // Add error
          const errorMessage = result.error || `Failed to upload file "${file.name}"`;
          setState(prev => ({
            ...prev,
            errors: [...prev.errors, errorMessage]
          }));
          
          // Call error callback
          if (onUploadError) {
            onUploadError(errorMessage);
          }
        }
      } catch (error: any) {
        // Handle unexpected errors
        const errorMessage = error.message || `Unexpected error uploading "${file.name}"`;
        setState(prev => ({
          ...prev,
          errors: [...prev.errors, errorMessage]
        }));
        
        // Call error callback
        if (onUploadError) {
          onUploadError(errorMessage);
        }
      }
    }
    
    // Complete the upload process
    setState(prev => ({
      ...prev,
      isUploading: false,
      uploadProgress: 100
    }));
  }, [acceptedFileTypes, additionalMetadata, bucket, maxFiles, onUploadError, onUploadSuccess]);
  
  // Handle drop event
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    setState(prev => ({ ...prev, isDragging: false }));
    
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);
  
  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    
    // Reset the input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFiles]);
  
  // Handle click to open file dialog
  const openFileDialog = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [fileInputRef]);
  
  // Clear all errors
  const clearErrors = useCallback(() => {
    setState(prev => ({ ...prev, errors: [] }));
  }, []);
  
  // Reset the upload state
  const reset = useCallback(() => {
    setState({
      isDragging: false,
      isUploading: false,
      uploadProgress: 0,
      files: [],
      previews: [],
      uploadedObjectKeys: [],
      uploadedUrls: [],
      errors: []
    });
  }, []);
  
  return {
    // State
    isDragging: state.isDragging,
    isUploading: state.isUploading,
    uploadProgress: state.uploadProgress,
    files: state.files,
    previews: state.previews,
    uploadedObjectKeys: state.uploadedObjectKeys,
    uploadedUrls: state.uploadedUrls,
    errors: state.errors,
    
    // Refs
    fileInputRef,
    
    // Event handlers
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileInputChange,
    openFileDialog,
    clearErrors,
    reset
  };
}