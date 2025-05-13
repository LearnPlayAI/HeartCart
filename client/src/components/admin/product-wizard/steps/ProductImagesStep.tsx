/**
 * Product Images Step
 * 
 * This component implements Step 2 of the product wizard,
 * allowing the user to upload, manage, and organize product images.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useProductWizardContext } from '../context';
import { WizardActionType, UploadedImage } from '../types';
import { useDropzone } from 'react-dropzone';
import { Loader2, Plus, XCircle, StarIcon, Upload, ImageIcon, Trash2 } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ProductImagesStepProps {
  className?: string;
}

/**
 * Helper function to ensure image URLs are correctly formatted
 * Handles both object store URLs and API-returned URLs
 */
const ensureValidImageUrl = (image: UploadedImage): string => {
  if (!image.url && !image.objectKey) {
    console.warn('Image missing URL and objectKey:', image);
    return '';
  }
  
  // When we have a file object (client-side), create an object URL
  if (image.file) {
    // Return existing URL if already created
    if (image.url && image.url.startsWith('blob:')) {
      return image.url;
    }
    return URL.createObjectURL(image.file);
  }
  
  // If URL is already absolute (starts with http), return as is
  if (image.url && image.url.startsWith('http')) {
    return image.url;
  }
  
  // Direct access to Object Store URLs using objectKey (preferred method)
  if (image.objectKey) {
    // For temp/pending uploads, construct URL with proper encoding
    if (image.objectKey.includes('temp/pending/')) {
      // The objectKey should follow the pattern: temp/pending/timestamp_randomprefix_filename.jpg
      const parts = image.objectKey.split('/');
      if (parts.length >= 3) {
        // Get all parts after 'temp/pending/'
        const filenameWithTimestamp = parts.slice(2).join('/');
        
        // Log the attempt for debugging
        console.log("Image details:", image);
        console.log("Retrying with properly encoded temp URL format:", `/api/files/temp/pending/${encodeURIComponent(filenameWithTimestamp)}`);
        
        // Construct proper URL for API access with proper encoding
        return `/api/files/temp/pending/${encodeURIComponent(filenameWithTimestamp)}`;
      }
    }
    
    // For product-specific images (products/${productId}/${filename})
    if (image.objectKey.startsWith('products/')) {
      const parts = image.objectKey.split('/');
      if (parts.length >= 3) {
        const productId = parts[1];
        // Join all remaining parts to handle filenames with spaces
        const filename = parts.slice(2).join('/');
        
        console.log("Using product URL format:", `/api/files/products/${productId}/${encodeURIComponent(filename)}`);
        
        return `/api/files/products/${productId}/${encodeURIComponent(filename)}`;
      }
    }
    
    // Fallback: encode each path segment separately
    const pathSegments = image.objectKey.split('/');
    const encodedPath = pathSegments.map(segment => encodeURIComponent(segment)).join('/');
    
    console.log("Using fallback encoded path:", `/api/files/${encodedPath}`);
    
    return `/api/files/${encodedPath}`;
  }
  
  // Handle relative API URLs (/api/files/...)
  if (image.url && image.url.startsWith('/api/files/')) {
    try {
      // Parse the URL and encode each path segment
      const urlParts = image.url.split('/').filter(part => part.length > 0);
      
      // Reconstruct with proper encoding for segments after /api/files/
      if (urlParts.length >= 2 && urlParts[0] === 'api' && urlParts[1] === 'files') {
        const apiBase = `/${urlParts[0]}/${urlParts[1]}`;
        const remainingParts = urlParts.slice(2);
        const encodedParts = remainingParts.map(part => encodeURIComponent(part));
        
        const encodedUrl = `${apiBase}/${encodedParts.join('/')}`;
        console.log("Encoded API URL:", encodedUrl);
        
        return encodedUrl;
      }
    } catch (error) {
      console.error("Error encoding URL parts:", error);
    }
  }
  
  // Special case for temp images
  if (image.url && image.url.includes('/temp/pending/')) {
    try {
      const urlObj = new URL(image.url, window.location.origin);
      const pathParts = urlObj.pathname.split('/');
      
      // Extract the filename with timestamp prefix (last part)
      if (pathParts.length > 0) {
        const filename = pathParts[pathParts.length - 1];
        console.log("Extracted filename from URL:", filename);
        return `/api/files/temp/pending/${encodeURIComponent(filename)}`;
      }
    } catch (error) {
      console.error("Error handling temp URL:", error);
    }
  }
  
  // If URL starts with /, it's a relative path
  if (image.url && image.url.startsWith('/')) {
    // For other relative paths, encode the segments
    try {
      const segments = image.url.split('/').filter(s => s.length > 0);
      const encodedSegments = segments.map(segment => encodeURIComponent(segment));
      return `/${encodedSegments.join('/')}`;
    } catch (error) {
      console.error("Error encoding relative URL:", error);
      return image.url;
    }
  }
  
  // If we get here and image has a URL, try to load it
  if (image.url) {
    console.log("Using original URL as fallback:", image.url);
    return image.url;
  }
  
  // Last resort fallback
  console.error("Failed to generate valid image URL:", image);
  return '';
}

export const ProductImagesStep: React.FC<ProductImagesStepProps> = ({ className }) => {
  const { 
    state, 
    addImage, 
    removeImage, 
    setMainImage, 
    reorderImages, 
    setField 
  } = useProductWizardContext();
  const { toast } = useToast();
  
  // Create a local state for the uploaded images
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteImageId, setDeleteImageId] = useState<string | number | null>(null);
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [isLoadingExistingImages, setIsLoadingExistingImages] = useState(false);
  
  // Function to fetch images for an existing product
  const fetchExistingProductImages = useCallback(async (productId: number) => {
    if (!productId) return;
    
    setIsLoadingExistingImages(true);
    
    try {
      const response = await fetch(`/api/products/${productId}/images`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch product images: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && Array.isArray(result.data)) {
        console.log('Successfully fetched existing product images:', result.data);
        
        // Convert the API response to our UploadedImage format
        const existingImages: UploadedImage[] = result.data.map((image: any, index: number) => {
          const newImage: UploadedImage = {
            id: typeof image.id === 'number' ? image.id : index,
            url: image.imageUrl || image.url || '',
            objectKey: image.objectKey || '',
            isMain: image.isMain || index === 0,
            order: image.displayOrder || index,
            metadata: {
              size: image.size || 0,
              width: image.width,
              height: image.height,
              backgroundRemoved: image.backgroundRemoved || false,
              alt: image.altText || '',
              processedAt: image.processedAt
            }
          };
          return newImage;
        });
        
        // Sort images by order/displayOrder
        existingImages.sort((a: UploadedImage, b: UploadedImage) => a.order - b.order);
        
        // Find the main image index
        const mainImageIndex = existingImages.findIndex((img: UploadedImage) => img.isMain);
        
        // If no main image is marked, use the first one
        if (mainImageIndex === -1 && existingImages.length > 0) {
          existingImages[0].isMain = true;
        }
        
        // Update both local state and context
        setUploadedImages(existingImages);
        
        // Extract URLs and objectKeys for the context
        const imageUrls = existingImages.map((img: UploadedImage) => img.url);
        const imageObjectKeys = existingImages.map((img: UploadedImage) => img.objectKey || '');
        
        // Update the context state with these images
        setField('imageUrls', imageUrls);
        setField('imageObjectKeys', imageObjectKeys);
        setField('mainImageIndex', Math.max(0, mainImageIndex));
        
        console.log('Updated context with fetched images:', {
          imageUrls,
          imageObjectKeys,
          mainImageIndex: Math.max(0, mainImageIndex)
        });
      } else {
        throw new Error('Invalid server response format');
      }
    } catch (error) {
      console.error('Error fetching product images:', error);
      toast({
        title: "Failed to load product images",
        description: error instanceof Error ? error.message : "There was an unexpected error loading images",
        variant: "destructive"
      });
    } finally {
      setIsLoadingExistingImages(false);
    }
  }, [setField, toast]);
  
  // Initialize images - either from state or by fetching for existing products
  useEffect(() => {
    // If product ID exists, fetch images from the API directly
    if (state.productId) {
      console.log('Product is in edit mode, fetching images for product ID:', state.productId);
      fetchExistingProductImages(state.productId);
    } 
    // Otherwise, initialize from context state if available
    else if (state.imageUrls && state.imageUrls.length > 0) {
      const imageUrls = state.imageUrls || [];
      const imageObjectKeys = state.imageObjectKeys || [];
      const mainImageIndex = state.mainImageIndex || 0;
      
      console.log('Initializing uploaded images from state for new product:', {
        imageUrls,
        imageObjectKeys,
        mainImageIndex
      });
      
      // Convert the imageUrls and imageObjectKeys to uploadedImages format
      const newUploadedImages: UploadedImage[] = imageUrls.map((url: string, index: number) => ({
        id: index, // use a number instead of string
        url: url,
        objectKey: imageObjectKeys[index] || '',
        isMain: index === mainImageIndex,
        order: index,
        metadata: {
          size: 0,
          width: 0,
          height: 0,
          backgroundRemoved: false,
          alt: url.split('/').pop() || 'image'
        }
      }));
      
      setUploadedImages(newUploadedImages);
    }
  }, [state.productId, state.imageUrls, state.imageObjectKeys, state.mainImageIndex, fetchExistingProductImages]);
  
  // Image upload handler
  const handleImageUpload = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    setIsUploading(true);
    
    try {
      // Check if this is the first upload (no existing images)
      const isFirstUpload = uploadedImages.length === 0;
      let startingOrder = uploadedImages.length;
      
      // Create form data for batch upload
      const formData = new FormData();
      
      // Append productId if we already have one (editing mode)
      if (state.productId) {
        formData.append('productId', state.productId.toString());
      }
      
      // Append each file to the form data
      acceptedFiles.forEach((file: File) => {
        formData.append('images', file);
      });
      
      // Determine the correct endpoint
      // For new products, use the temp upload endpoint
      // For existing products, use the product-specific endpoint
      const endpoint = state.productId 
        ? `/api/upload/products/${state.productId}/images` 
        : '/api/upload/products/images/temp';
      
      console.log('Uploading images to endpoint:', endpoint);
      
      // Upload the files
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.files && Array.isArray(result.files)) {
        // Map the API response to our UploadedImage format
        const newUploadedImages: UploadedImage[] = result.files.map((file: any, index: number) => {
          const newImage: UploadedImage = {
            id: typeof file.id === 'number' ? file.id : index, // Use numeric ID
            url: file.url, // URL for accessing the file via API
            objectKey: file.objectKey, // Storage path to the file
            isMain: isFirstUpload && index === 0, // First image is main if no existing main image
            order: startingOrder + index,
            metadata: {
              size: file.size,
              width: file.width || 0,
              height: file.height || 0,
              backgroundRemoved: file.backgroundRemoved || false,
              alt: file.originalname || file.filename || `Image ${index + 1}`,
              processedAt: file.processedAt || new Date().toISOString()
            }
          };
          console.log('Processing image from API:', file, 'into:', newImage);
          return newImage;
        });
        
        // Update local state
        const updatedImages = [...uploadedImages, ...newUploadedImages];
        setUploadedImages(updatedImages);
        
        // Update context state by adding each image
        for (const image of newUploadedImages) {
          addImage(image.url, image.objectKey || '');
        }
        
        console.log('Successfully uploaded images:', newUploadedImages);
      } else {
        throw new Error('Invalid server response format');
      }
      
      toast({
        title: "Images uploaded",
        description: `${acceptedFiles.length} image${acceptedFiles.length !== 1 ? 's' : ''} added to product`,
      });
    } catch (error) {
      console.error('Error uploading images:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "There was a problem uploading your images",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  }, [dispatch, productData.uploadedImages, productData.id, toast]);
  
  // Set up dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    onDrop: handleImageUpload,
    disabled: isUploading
  });
  
  // Handle image deletion
  const handleDeleteImage = (imageIdOrUrl: string | number) => {
    setDeleteImageId(imageIdOrUrl);
  };
  
  const confirmDeleteImage = () => {
    if (deleteImageId !== null) {
      // Find the image index in our local state
      const imageIndex = uploadedImages.findIndex(img => 
        String(img.id) === String(deleteImageId) || img.url === deleteImageId
      );
      
      if (imageIndex >= 0) {
        // Remove from local state
        const updatedImages = uploadedImages.filter((_, idx) => idx !== imageIndex);
        setUploadedImages(updatedImages);
        
        // Also update the context's imageUrls and imageObjectKeys arrays
        const newImageUrls = updatedImages.map(item => item.url);
        const newImageObjectKeys = updatedImages.map(item => item.objectKey || '');
        
        dispatch({ type: 'SET_FIELD', field: 'imageUrls', value: newImageUrls });
        dispatch({ type: 'SET_FIELD', field: 'imageObjectKeys', value: newImageObjectKeys });
        
        // If we deleted the main image, update the main image index to the first image
        if (imageIndex === state.mainImageIndex) {
          dispatch({ 
            type: 'SET_FIELD', 
            field: 'mainImageIndex', 
            value: updatedImages.length > 0 ? 0 : 0 
          });
          
          // If there are still images, mark the first one as main
          if (updatedImages.length > 0) {
            const newImagesWithMain = updatedImages.map((img, idx) => ({
              ...img,
              isMain: idx === 0
            }));
            setUploadedImages(newImagesWithMain);
          }
        }
        
        toast({
          title: "Image removed",
          description: "The image has been removed from the product"
        });
      }
      
      setDeleteImageId(null);
    }
  };
  
  // Handle setting an image as the main image
  const handleSetMainImage = (imageIdOrUrl: string | number) => {
    // Find the image index in our local state
    const imageIndex = uploadedImages.findIndex(img => 
      String(img.id) === String(imageIdOrUrl) || img.url === imageIdOrUrl
    );
    
    if (imageIndex >= 0) {
      // Update the local state to mark this image as main and others as not main
      const updatedImages = uploadedImages.map((img, idx) => ({
        ...img,
        isMain: idx === imageIndex
      }));
      
      setUploadedImages(updatedImages);
      
      // Also update the context state using the context method
      setMainImage(imageIndex);
      
      toast({
        title: "Main image updated",
        description: "The main product image has been updated"
      });
    }
  };
  
  // Handle image reordering
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    // Use our local state instead of productData
    const items = Array.from(uploadedImages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Update order property for each item
    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index
    }));
    
    // Update local state
    setUploadedImages(updatedItems);
    
    // Also update the context by re-ordering the imageUrls and imageObjectKeys
    const newImageUrls = updatedItems.map(item => item.url);
    const newImageObjectKeys = updatedItems.map(item => item.objectKey || '');
    
    dispatch({ type: 'SET_FIELD', field: 'imageUrls', value: newImageUrls });
    dispatch({ type: 'SET_FIELD', field: 'imageObjectKeys', value: newImageObjectKeys });
    
    // Also determine the new main image index
    const mainImageIndex = updatedItems.findIndex(img => img.isMain);
    if (mainImageIndex >= 0) {
      dispatch({ type: 'SET_FIELD', field: 'mainImageIndex', value: mainImageIndex });
    }
  };
  
  // AI background removal handler
  const handleRemoveBackground = async (imageIdOrUrl: string | number) => {
    // Find the image in our local state
    const image = uploadedImages.find(img => 
      String(img.id) === String(imageIdOrUrl) || img.url === imageIdOrUrl
    );
    
    if (!image) return;
    
    setIsRemovingBackground(true);
    
    try {
      // Extract image URL from the image object
      const imageUrl = image.url;
      
      // Only proceed if we have a valid image URL
      if (!imageUrl) {
        throw new Error('Image URL is missing');
      }
      
      console.log('Processing background removal for image:', imageUrl);
      
      // Call the background removal API
      const response = await fetch('/api/ai/remove-background', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: imageUrl,
          imageId: image.id,
          objectKey: image.objectKey
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Background removal failed');
      }
      
      // Update the image in our local state with the new processed image URL
      const updatedImages = uploadedImages.map(img => {
        if (String(img.id) === String(imageIdOrUrl) || img.url === imageIdOrUrl) {
          return {
            ...img,
            url: result.processedImageUrl || img.url, // Use new URL if available
            objectKey: result.processedObjectKey || img.objectKey, // Use new object key if available
            metadata: { 
              ...img.metadata, 
              backgroundRemoved: true,
              processedAt: new Date().toISOString()
            }
          };
        }
        return img;
      });
      
      // Update the local state
      setUploadedImages(updatedImages);
      
      // Also update the context state with the processed images
      const newImageUrls = updatedImages.map(item => item.url);
      const newImageObjectKeys = updatedImages.map(item => item.objectKey || '');
      
      dispatch({ type: 'SET_FIELD', field: 'imageUrls', value: newImageUrls });
      dispatch({ type: 'SET_FIELD', field: 'imageObjectKeys', value: newImageObjectKeys });
      
      toast({
        title: "Background removed",
        description: "AI has processed the image and removed the background"
      });
    } catch (error) {
      console.error('Error removing background:', error);
      toast({
        title: "Process failed",
        description: error instanceof Error ? error.message : "There was a problem removing the background",
        variant: "destructive"
      });
    } finally {
      setIsRemovingBackground(false);
    }
  };
  
  return (
    <div className={className}>
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Product Images</h2>
        <p className="text-muted-foreground">
          Upload high-quality images of your product. The first image will be used as the main display image.
        </p>
      </div>
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Upload Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-md p-8 text-center cursor-pointer transition-colors ${
                isDragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-gray-300 hover:border-primary'
              }`}
            >
              <input {...getInputProps()} />
              
              <div className="flex flex-col items-center justify-center space-y-3">
                <Upload className="h-10 w-10 text-gray-400" />
                
                {isUploading ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p>Uploading images...</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-medium">
                      {isDragActive ? 'Drop images here' : 'Drag & drop images here'}
                    </p>
                    <p className="text-sm text-gray-500">
                      or click to browse from your device
                    </p>
                    <p className="text-xs text-gray-400">
                      Supports JPG, PNG, GIF, WebP up to 5MB each
                    </p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Manage Product Images</CardTitle>
          </CardHeader>
          <CardContent>
            {uploadedImages.length === 0 ? (
              <div className="text-center py-12 border border-dashed rounded-md">
                <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-muted-foreground">No images uploaded yet</p>
                <p className="text-sm text-gray-400">
                  Upload at least one image for your product
                </p>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="product-images" direction="horizontal">
                  {(provided) => (
                    <div 
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                    >
                      {uploadedImages
                        .sort((a, b) => (a.order || 0) - (b.order || 0))
                        .map((image, index) => (
                          <Draggable 
                            key={image.id || image.url} 
                            draggableId={String(image.id || image.url)} 
                            index={index}
                          >
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`relative border rounded-md overflow-hidden group ${
                                  image.isMain ? 'ring-2 ring-pink-500' : ''
                                }`}
                              >
                                <img 
                                  src={ensureValidImageUrl(image)}
                                  alt={image.metadata?.alt || "Product"} 
                                  className="w-full h-40 object-cover"
                                  onLoad={() => console.log(`Image loaded successfully: ${image.metadata?.originalname || 'Unknown image'}`)}
                                  onError={(e) => {
                                    console.error('Failed to load image:', image.url);
                                    console.log('Image details:', image);
                                    
                                    // Try with direct API access as second attempt
                                    if (image.objectKey) {
                                      // For temp/pending uploads with timestamp and random prefix
                                      if (image.objectKey.includes('temp/pending/')) {
                                        // Extract the full filename with timestamp and random prefix
                                        const parts = image.objectKey.split('/');
                                        if (parts.length >= 3) {
                                          // Get only the third part - the filename portion
                                          const filenameWithPrefix = parts[2];
                                          
                                          // Construct the fully encoded URL for API access
                                          const directUrl = `/api/files/temp/pending/${encodeURIComponent(filenameWithPrefix)}`;
                                          console.log('Retrying with properly encoded temp URL format:', directUrl);
                                          e.currentTarget.src = directUrl;
                                          return;
                                        }
                                      }
                                      
                                      // For product-specific images
                                      if (image.objectKey.startsWith('products/')) {
                                        const parts = image.objectKey.split('/');
                                        if (parts.length >= 3) {
                                          const productId = parts[1];
                                          const filename = parts[2]; // Take just the filename portion
                                          const directUrl = `/api/files/products/${encodeURIComponent(productId)}/${encodeURIComponent(filename)}`;
                                          console.log('Retrying with properly encoded product URL format:', directUrl);
                                          e.currentTarget.src = directUrl;
                                          return;
                                        }
                                      }
                                      
                                      // Fallback: try with a simpler path structure
                                      // Just take the first path component and the last component (filename)
                                      const parts = image.objectKey.split('/');
                                      
                                      // If we have at least a folder and a filename
                                      if (parts.length >= 2) {
                                        const folder = parts[0]; // First segment (folder)
                                        const filename = parts[parts.length - 1]; // Last segment (filename)
                                        
                                        const directUrl = `/api/files/${encodeURIComponent(folder)}/${encodeURIComponent(filename)}`;
                                        console.log('Retrying with simple folder/filename URL format:', directUrl);
                                        e.currentTarget.src = directUrl;
                                      } else {
                                        // Fallback to fully encoded path if the structure is unexpected
                                        const encodedKey = image.objectKey
                                          .split('/')
                                          .map(part => encodeURIComponent(part))
                                          .join('/');
                                          
                                        const directUrl = `/api/files/${encodedKey}`;
                                        console.log('Retrying with fully encoded URL:', directUrl);
                                        e.currentTarget.src = directUrl;
                                      }
                                      
                                      // Add error handler for this second attempt
                                      e.currentTarget.onerror = (secondErr) => {
                                        console.error('All URL formats failed for image:', image.objectKey);
                                        const img = secondErr.currentTarget as HTMLImageElement;
                                        img.classList.add('hidden');
                                        const fallbackElement = img.parentElement?.querySelector('.fallback-display');
                                        if (fallbackElement) {
                                          fallbackElement.classList.remove('hidden');
                                        }
                                      };
                                      
                                      return;
                                    }
                                    
                                    // Add fallback display if all retries fail or no objectKey
                                    e.currentTarget.classList.add('hidden');
                                    const fallbackElement = e.currentTarget.parentElement?.querySelector('.fallback-display');
                                    if (fallbackElement) {
                                      fallbackElement.classList.remove('hidden');
                                    }
                                  }}
                                />
                                
                                {/* Fallback icon when image fails to load */}
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 hidden fallback-display">
                                  <ImageIcon className="h-12 w-12 text-gray-400" />
                                </div>
                                
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
                                  <div className="flex space-x-2">
                                    {!image.isMain && (
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => handleSetMainImage(image.id || image.url)}
                                        title="Set as main image"
                                      >
                                        <StarIcon className="h-4 w-4" />
                                      </Button>
                                    )}
                                    
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => handleRemoveBackground(image.id || image.url)}
                                      disabled={isRemovingBackground}
                                      title="Remove background (AI)"
                                    >
                                      {isRemovingBackground ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <ImageIcon className="h-4 w-4" />
                                      )}
                                    </Button>
                                    
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleDeleteImage(image.id || image.url)}
                                      title="Delete image"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                
                                {image.isMain && (
                                  <div className="absolute top-2 left-2 bg-pink-500 text-white text-xs py-1 px-2 rounded-md">
                                    Main Image
                                  </div>
                                )}
                                
                                {image.metadata?.backgroundRemoved && (
                                  <div className="absolute bottom-2 left-2 bg-blue-500 text-white text-xs py-1 px-2 rounded-md">
                                    AI Enhanced
                                  </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
            
            <div className="mt-4 text-sm text-gray-500">
              <p>Drag and drop images to reorder them.</p>
              <p>Click the <StarIcon className="h-3 w-3 inline" /> button on any image to set it as the main product image.</p>
              <p>The first image uploaded is automatically set as the main image if no main image exists.</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteImageId !== null} onOpenChange={() => setDeleteImageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this image? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteImage}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProductImagesStep;