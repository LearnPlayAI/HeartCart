/**
 * File Upload Hook
 * 
 * Custom React hook for handling file uploads, providing a consistent
 * interface for file validation, upload, and progress tracking.
 * Uses the enhanced file utility functions for validation and sanitization.
 */

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  sanitizeFilename,
  hasAllowedExtension,
  formatFileSize,
  generateUniqueFilename
} from '@/utils/file-utils';

interface FileUploadOptions {
  endpoint: string;
  maxFileSize?: number; // in MB
  allowedExtensions?: string[];
  additionalData?: Record<string, string>;
  autoUpload?: boolean;
  multiple?: boolean;
  onSuccess?: (response: any) => void;
  onError?: (error: Error) => void;
}

interface FileUploadResult {
  isUploading: boolean;
  progress: number;
  error: string | null;
  selectedFiles: File[];
  results: any[];
  selectFiles: (files: FileList | null) => void;
  uploadFiles: () => Promise<void>;
  clearFiles: () => void;
  validateFiles: (files: FileList) => {
    validFiles: File[];
    invalidFiles: { file: File; reason: string }[];
  };
}

/**
 * Custom hook for handling file uploads with validation and progress tracking
 */
export function useFileUpload(options: FileUploadOptions): FileUploadResult {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const { toast } = useToast();

  const {
    endpoint,
    maxFileSize = 5, // Default 5MB
    allowedExtensions = [],
    additionalData = {},
    autoUpload = false,
    multiple = false,
    onSuccess,
    onError
  } = options;

  /**
   * Validates files against size and extension constraints
   */
  const validateFiles = useCallback(
    (files: FileList) => {
      const validFiles: File[] = [];
      const invalidFiles: { file: File; reason: string }[] = [];

      Array.from(files).forEach((file) => {
        // Check file size
        if (file.size > maxFileSize * 1024 * 1024) {
          invalidFiles.push({
            file,
            reason: `File exceeds maximum size (${formatFileSize(file.size)} > ${maxFileSize}MB)`
          });
          return;
        }

        // Check file extension if restrictions are provided
        if (allowedExtensions.length > 0) {
          const sanitizedName = sanitizeFilename(file.name);
          if (!hasAllowedExtension(sanitizedName, allowedExtensions)) {
            invalidFiles.push({
              file,
              reason: `File type not allowed (must be one of: ${allowedExtensions.join(', ')})`
            });
            return;
          }
        }

        validFiles.push(file);
      });

      return { validFiles, invalidFiles };
    },
    [allowedExtensions, maxFileSize]
  );

  /**
   * Handles file selection and optionally triggers upload
   */
  const selectFiles = useCallback(
    (files: FileList | null) => {
      setError(null);

      if (!files || files.length === 0) {
        return;
      }

      const { validFiles, invalidFiles } = validateFiles(files);

      // Handle invalid files by showing an error message
      if (invalidFiles.length > 0) {
        const errorMessages = invalidFiles.map(
          ({ file, reason }) => `${file.name}: ${reason}`
        );

        toast({
          title: 'Some files could not be uploaded',
          description: (
            <div className="mt-2">
              <p>The following files couldn't be uploaded:</p>
              <ul className="list-disc pl-4 mt-1">
                {errorMessages.map((msg, i) => (
                  <li key={i} className="text-sm">{msg}</li>
                ))}
              </ul>
            </div>
          ),
          variant: 'destructive',
        });
      }

      // Update selected files state
      setSelectedFiles((prev) =>
        multiple ? [...prev, ...validFiles] : validFiles.slice(0, 1)
      );

      // Auto-upload if enabled
      if (autoUpload && validFiles.length > 0) {
        const filesToUpload = multiple 
          ? [...selectedFiles, ...validFiles] 
          : validFiles.slice(0, 1);
          
        uploadFilesToServer(filesToUpload);
      }
    },
    [
      multiple,
      autoUpload,
      validateFiles,
      selectedFiles,
      toast
    ]
  );

  /**
   * Core upload function that sends files to the server
   */
  const uploadFilesToServer = useCallback(
    async (filesToUpload: File[]) => {
      if (filesToUpload.length === 0) {
        setError('No files selected for upload');
        return;
      }

      setIsUploading(true);
      setProgress(0);
      setError(null);

      try {
        const formData = new FormData();

        // Append files to form data
        filesToUpload.forEach((file) => {
          // Generate a unique filename to prevent collisions
          const uniqueFilename = generateUniqueFilename(file.name);
          
          // Create a new File object with the unique name
          const renamedFile = new File([file], uniqueFilename, { type: file.type });
          
          formData.append('files', renamedFile);
        });

        // Append any additional data
        Object.entries(additionalData).forEach(([key, value]) => {
          formData.append(key, value);
        });

        // Track upload progress if supported
        const xhr = new XMLHttpRequest();
        xhr.open('POST', endpoint);

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setProgress(percentComplete);
          }
        });

        // Promise wrapper for the XHR request
        const uploadPromise = new Promise<any>((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response = JSON.parse(xhr.responseText);
                resolve(response);
              } catch (e) {
                reject(new Error('Invalid response format'));
              }
            } else {
              let errorMessage = `Upload failed with status ${xhr.status}`;
              try {
                const errorResponse = JSON.parse(xhr.responseText);
                errorMessage = errorResponse.error?.message || errorMessage;
              } catch (e) {
                // Parsing error, use default message
              }
              reject(new Error(errorMessage));
            }
          };

          xhr.onerror = () => {
            reject(new Error('Network error during upload'));
          };

          xhr.onabort = () => {
            reject(new Error('Upload aborted'));
          };
        });

        // Send the request
        xhr.send(formData);

        // Wait for completion
        const response = await uploadPromise;

        // Set results and call success callback
        setResults((prev) => [...prev, ...response.data]);
        if (onSuccess) {
          onSuccess(response);
        }

        return response;
      } catch (error: any) {
        const errorMessage = error?.message || 'Unknown upload error';
        setError(errorMessage);
        
        if (onError) {
          onError(error instanceof Error ? error : new Error(errorMessage));
        }
        
        toast({
          title: 'Upload Failed',
          description: errorMessage,
          variant: 'destructive',
        });
        
        console.error('File upload error:', error);
      } finally {
        setIsUploading(false);
      }
    },
    [endpoint, additionalData, onSuccess, onError, toast]
  );

  /**
   * Public method to trigger file upload
   */
  const uploadFiles = useCallback(async () => {
    await uploadFilesToServer(selectedFiles);
  }, [selectedFiles, uploadFilesToServer]);

  /**
   * Clears all selected files
   */
  const clearFiles = useCallback(() => {
    setSelectedFiles([]);
    setResults([]);
    setError(null);
    setProgress(0);
  }, []);

  return {
    isUploading,
    progress,
    error,
    selectedFiles,
    results,
    selectFiles,
    uploadFiles,
    clearFiles,
    validateFiles
  };
}