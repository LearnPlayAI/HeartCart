/**
 * useFileUpload Hook
 * 
 * Custom hook for handling file uploads, providing a consistent interface
 * across the application for uploading and managing files.
 */

import { useState, useEffect, useCallback } from 'react';
import { UploadedImage } from '../components/admin/product-wizard/types';
import {
  uploadFiles,
  ensureValidImageUrl,
  validateFileSize,
  cleanupLocalImageUrls,
  createLocalImageUrl,
  UPLOAD_ENDPOINTS
} from '../utils/file-manager';

interface FileUploadState {
  images: UploadedImage[];
  previews: string[];
  isUploading: boolean;
  uploadProgress: Record<string, number>;
  errors: Record<string, string>;
  mainImageIndex: number;
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

interface FileUploadOptions {
  maxFiles?: number;
  maxSizeMB?: number;
  allowedTypes?: string[];
  endpoint?: string;
  additionalData?: Record<string, string | number | boolean>;
  initialImages?: UploadedImage[];
}

const defaultOptions: FileUploadOptions = {
  maxFiles: 5,
  maxSizeMB: 5,
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  endpoint: UPLOAD_ENDPOINTS.PRODUCT_TEMP
};

export function useFileUpload(options?: FileUploadOptions) {
  const {
    maxFiles = defaultOptions.maxFiles,
    maxSizeMB = defaultOptions.maxSizeMB,
    allowedTypes = defaultOptions.allowedTypes,
    endpoint = defaultOptions.endpoint,
    additionalData,
    initialImages = []
  } = options || {};

  const [state, setState] = useState<FileUploadState>({
    images: initialImages,
    // Ensure all URLs are properly encoded
    previews: initialImages.map(img => {
      // Check if we have an image object or string
      const url = typeof img === 'string' ? img : (img.url || '');
      if (url) {
        console.log("Processing image URL:", url);
        // Keep track of URLs for debugging
        return ensureValidImageUrl(img);
      }
      return '';
    }),
    isUploading: false,
    uploadProgress: {},
    errors: {},
    mainImageIndex: initialImages.findIndex(img => img.isMain) || 0
  });

  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  
  // Clean up local image URLs when component unmounts
  useEffect(() => {
    return () => {
      cleanupLocalImageUrls(state.images);
    };
  }, []);
  
  // Add new images (client-side only, doesn't upload yet)
  const addFiles = useCallback((newFiles: File[]) => {
    setState(prev => {
      // Check how many more files we can add
      const availableSlots = (maxFiles || 5) - prev.images.length;
      
      if (availableSlots <= 0) {
        return {
          ...prev,
          errors: {
            ...prev.errors,
            limit: `Maximum of ${maxFiles || 5} files allowed`
          }
        };
      }
      
      // Limit to available slots and validate each file
      const validFiles: File[] = [];
      const newErrors: Record<string, string> = {};
      
      newFiles.slice(0, availableSlots).forEach(file => {
        // Validate file type
        if (allowedTypes && !allowedTypes.includes(file.type)) {
          newErrors[file.name] = `Invalid file type: ${file.type}`;
          return;
        }
        
        // Validate file size
        if (!validateFileSize(file, maxSizeMB)) {
          newErrors[file.name] = `File exceeds maximum size of ${maxSizeMB}MB`;
          return;
        }
        
        validFiles.push(file);
      });
      
      if (validFiles.length === 0) {
        return {
          ...prev,
          errors: {
            ...prev.errors,
            ...newErrors
          }
        };
      }
      
      // Create temporary uploadedImage objects with local URLs for preview
      const newImages: UploadedImage[] = validFiles.map((file, index) => {
        const localUrl = createLocalImageUrl(file);
        return {
          url: localUrl,
          file, // Store the file object for later upload
          isMain: prev.images.length === 0 && index === 0, // First image is main by default if no images exist
          order: prev.images.length + index,
          metadata: {
            size: file.size,
            originalname: file.name
          }
        };
      });
      
      // Create previews for the new images
      const newPreviews = newImages.map(img => img.url);
      
      return {
        ...prev,
        images: [...prev.images, ...newImages],
        previews: [...prev.previews, ...newPreviews],
        errors: {
          ...prev.errors,
          ...newErrors
        }
      };
    });
  }, [maxFiles, maxSizeMB, allowedTypes]);
  
  // Remove an image by index
  const removeFile = useCallback((index: number) => {
    setState(prev => {
      // Cannot remove during upload
      if (prev.isUploading) {
        return prev;
      }
      
      const newImages = [...prev.images];
      const newPreviews = [...prev.previews];
      
      // Get the image being removed
      const removedImage = newImages[index];
      
      // Revoke object URL if it's a local preview
      if (removedImage && removedImage.url && removedImage.url.startsWith('blob:')) {
        URL.revokeObjectURL(removedImage.url);
      }
      
      // Remove the image and preview
      newImages.splice(index, 1);
      newPreviews.splice(index, 1);
      
      // Update main image index if needed
      let newMainIndex = prev.mainImageIndex;
      if (index === prev.mainImageIndex) {
        // If the main image was removed, set first image as main
        newMainIndex = newImages.length > 0 ? 0 : -1;
      } else if (index < prev.mainImageIndex) {
        // If an image before the main image was removed, adjust index
        newMainIndex--;
      }
      
      // Update isMain flag on images if main index changed
      if (newMainIndex !== prev.mainImageIndex) {
        newImages.forEach((img, i) => {
          img.isMain = i === newMainIndex;
        });
      }
      
      return {
        ...prev,
        images: newImages,
        previews: newPreviews,
        mainImageIndex: newMainIndex
      };
    });
  }, []);
  
  // Set an image as the main image
  const setMainImage = useCallback((index: number) => {
    setState(prev => {
      if (index < 0 || index >= prev.images.length || index === prev.mainImageIndex) {
        return prev;
      }
      
      // Update main image flag on all images
      const newImages = prev.images.map((img, i) => ({
        ...img,
        isMain: i === index
      }));
      
      return {
        ...prev,
        images: newImages,
        mainImageIndex: index
      };
    });
  }, []);
  
  // Reorder images via drag and drop
  const reorderImages = useCallback((fromIndex: number, toIndex: number) => {
    setState(prev => {
      // Cannot reorder during upload
      if (prev.isUploading) {
        return prev;
      }
      
      const newImages = [...prev.images];
      const newPreviews = [...prev.previews];
      
      // Move the image from fromIndex to toIndex
      const [movedImage] = newImages.splice(fromIndex, 1);
      newImages.splice(toIndex, 0, movedImage);
      
      // Move the preview as well
      const [movedPreview] = newPreviews.splice(fromIndex, 1);
      newPreviews.splice(toIndex, 0, movedPreview);
      
      // Update order property on all images
      const reorderedImages = newImages.map((img, i) => ({
        ...img,
        order: i
      }));
      
      // Update main image index if needed
      let newMainIndex = prev.mainImageIndex;
      if (fromIndex === prev.mainImageIndex) {
        // Main image was moved
        newMainIndex = toIndex;
      } else if (
        (fromIndex < prev.mainImageIndex && toIndex >= prev.mainImageIndex) ||
        (fromIndex > prev.mainImageIndex && toIndex <= prev.mainImageIndex)
      ) {
        // An image was moved across the main image
        if (fromIndex < prev.mainImageIndex) {
          newMainIndex--;
        } else {
          newMainIndex++;
        }
      }
      
      return {
        ...prev,
        images: reorderedImages,
        previews: newPreviews,
        mainImageIndex: newMainIndex
      };
    });
  }, []);
  
  // Upload all local files to the server
  const uploadAllFiles = useCallback(async (): Promise<UploadedImage[]> => {
    // Find which images need to be uploaded (those with file objects)
    const toUpload = state.images.filter(img => img.file);
    
    if (toUpload.length === 0) {
      // Return existing server-side images
      return state.images.filter(img => !img.file);
    }
    
    setUploadStatus('uploading');
    setState(prev => ({ ...prev, isUploading: true }));
    
    try {
      // Extract the File objects
      const files = toUpload.map(img => img.file!);
      
      // Upload the files and get server-returned metadata
      const uploadedImages = await uploadFiles(files, endpoint!, additionalData);
      
      // Replace local images with server-returned ones, preserving main image flag and order
      const newImages = [...state.images];
      
      // Replace each local image with the corresponding uploaded one
      toUpload.forEach((localImage, index) => {
        const imgIndex = newImages.findIndex(img => img === localImage);
        if (imgIndex >= 0 && index < uploadedImages.length) {
          const serverImage = uploadedImages[index];
          
          // Preserve local metadata
          newImages[imgIndex] = {
            ...serverImage,
            isMain: localImage.isMain,
            order: localImage.order
          };
          
          // Revoke the object URL to prevent memory leaks
          if (localImage.url && localImage.url.startsWith('blob:')) {
            URL.revokeObjectURL(localImage.url);
          }
        }
      });
      
      // Update state with the new images and generate new previews
      setState(prev => ({
        ...prev,
        images: newImages,
        previews: newImages.map(img => ensureValidImageUrl(img)),
        isUploading: false,
        errors: {}
      }));
      
      setUploadStatus('success');
      return newImages;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isUploading: false,
        errors: {
          upload: error instanceof Error ? error.message : 'Upload failed'
        }
      }));
      
      setUploadStatus('error');
      throw error;
    }
  }, [state.images, endpoint, additionalData]);
  
  // Clear all errors
  const clearErrors = useCallback(() => {
    setState(prev => ({
      ...prev,
      errors: {}
    }));
  }, []);
  
  return {
    images: state.images,
    previews: state.previews,
    isUploading: state.isUploading,
    uploadStatus,
    uploadProgress: state.uploadProgress,
    errors: state.errors,
    mainImageIndex: state.mainImageIndex,
    
    // Actions
    addFiles,
    removeFile,
    setMainImage,
    reorderImages,
    uploadAllFiles,
    clearErrors
  };
}