/**
 * Product Images Step
 * 
 * This component implements Step 2 of the product wizard,
 * allowing the user to upload, manage, and organize product images.
 */

import React, { useState, useCallback } from 'react';
import { useProductWizard } from '../context';
import { WizardActionType, UploadedImage } from '../types';
import { useDropzone } from 'react-dropzone';
import { Loader2, Plus, XCircle, StarIcon, Upload, ImageIcon, Trash2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { getApiBaseUrl } from '@/lib/api';
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
  if (!image.url) {
    console.warn('Image missing URL:', image);
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
  if (image.url.startsWith('http')) {
    return image.url;
  }
  
  // Direct access to Object Store URLs (this follows the server upload endpoint pattern)
  if (image.objectKey) {
    const baseUrl = getApiBaseUrl();
    
    // Force objectKey to be encoded properly, even if nested
    const encodedKey = image.objectKey
      .split('/')
      .map(part => encodeURIComponent(part))
      .join('/');
    
    if (image.objectKey.includes('temp/pending/')) {
      return `${baseUrl}/api/files/${encodedKey}`;
    } else {
      // This handles products/${tempProductId}/${filename} pattern from the server
      return `${baseUrl}/api/files/${encodedKey}`;
    }
  }
  
  // If URL starts with /, it's a relative path that needs base URL
  if (image.url.startsWith('/')) {
    const baseUrl = getApiBaseUrl();
    
    // Handle direct API paths
    if (image.url.startsWith('/api/files/')) {
      // Split the URL into parts and properly encode the filename
      const urlParts = image.url.split('/');
      const filename = urlParts.pop() || '';
      const path = urlParts.join('/');
      return `${baseUrl}${path}/${encodeURIComponent(filename)}`;
    }
    
    // For other relative paths
    return `${baseUrl}${image.url}`;
  }
  
  // Return whatever URL we have as a fallback
  return image.url;
}

export const ProductImagesStep: React.FC<ProductImagesStepProps> = ({ className }) => {
  const { state, dispatch } = useProductWizard();
  const { productData } = state;
  const { toast } = useToast();
  
  const [isUploading, setIsUploading] = useState(false);
  const [deleteImageId, setDeleteImageId] = useState<string | number | null>(null);
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  
  // Image upload handler
  const handleImageUpload = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    setIsUploading(true);
    
    try {
      // Check if this is the first upload (no existing images)
      const isFirstUpload = productData.uploadedImages.length === 0;
      let startingOrder = productData.uploadedImages.length;
      
      // Create form data for batch upload
      const formData = new FormData();
      
      // Append productId if we already have one (editing mode)
      if (productData.id) {
        formData.append('productId', productData.id.toString());
      }
      
      // Append each file to the form data
      acceptedFiles.forEach(file => {
        formData.append('images', file);
      });
      
      // Determine the correct endpoint
      // For new products, use the temp upload endpoint
      // For existing products, use the product-specific endpoint
      const endpoint = productData.id 
        ? `/api/upload/products/${productData.id}/images` 
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
        const uploadedImages = result.files.map((file, index) => {
          const newImage: UploadedImage = {
            id: file.id, // Use ID from server if available
            url: file.url, // URL for accessing the file via API
            objectKey: file.objectKey, // Storage path to the file
            isMain: isFirstUpload && index === 0, // First image is main if no existing main image
            order: startingOrder + index,
            metadata: {
              size: file.size,
              originalname: file.originalname || file.filename,
            }
          };
          console.log('Processing image from API:', file, 'into:', newImage);
          return newImage;
        });
        
        // Add each uploaded image to state
        uploadedImages.forEach(image => {
          dispatch({
            type: WizardActionType.ADD_UPLOADED_IMAGE,
            payload: image
          });
        });
        
        console.log('Successfully uploaded images:', uploadedImages);
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
      dispatch({
        type: WizardActionType.REMOVE_UPLOADED_IMAGE,
        payload: deleteImageId
      });
      setDeleteImageId(null);
      
      toast({
        title: "Image removed",
        description: "The image has been removed from the product"
      });
    }
  };
  
  // Handle setting an image as the main image
  const handleSetMainImage = (imageIdOrUrl: string | number) => {
    dispatch({
      type: WizardActionType.SET_MAIN_IMAGE,
      payload: imageIdOrUrl
    });
    
    toast({
      title: "Main image updated",
      description: "The main product image has been updated"
    });
  };
  
  // Handle image reordering
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(productData.uploadedImages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Update order property for each item
    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index
    }));
    
    dispatch({
      type: WizardActionType.REORDER_IMAGES,
      payload: updatedItems
    });
  };
  
  // AI background removal handler
  const handleRemoveBackground = async (imageIdOrUrl: string | number) => {
    // Find the image
    const image = productData.uploadedImages.find(img => 
      typeof imageIdOrUrl === 'number' ? img.id === imageIdOrUrl : img.url === imageIdOrUrl
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
      
      // Update the image in the state with the new processed image URL
      const updatedImages = productData.uploadedImages.map(img => {
        if ((typeof imageIdOrUrl === 'number' && img.id === imageIdOrUrl) || 
            (typeof imageIdOrUrl === 'string' && img.url === imageIdOrUrl)) {
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
      
      // Update the state with the processed image
      dispatch({
        type: WizardActionType.REORDER_IMAGES,
        payload: updatedImages
      });
      
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
            {productData.uploadedImages.length === 0 ? (
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
                      {productData.uploadedImages
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
                                      const parts = image.objectKey.split('/');
                                      const filename = parts.pop() || '';
                                      const baseUrl = getApiBaseUrl();
                                      
                                      // First try the server upload endpoint pattern
                                      if (parts.length >= 2 && parts[0] === 'products') {
                                        const tempProductId = parts[1];
                                        const directUrl = `${baseUrl}/api/files/products/${encodeURIComponent(tempProductId)}/${encodeURIComponent(filename)}`;
                                        console.log('Retrying with product URL format:', directUrl);
                                        e.currentTarget.src = directUrl;
                                        return;
                                      }
                                      
                                      // Then try temp/pending pattern
                                      if (image.objectKey.includes('temp/pending')) {
                                        const directUrl = `${baseUrl}/api/files/temp/pending/${encodeURIComponent(filename)}`;
                                        console.log('Retrying with temp URL format:', directUrl);
                                        e.currentTarget.src = directUrl;
                                        return;
                                      }
                                      
                                      // Try with raw objectKey as last resort
                                      const directUrl = `${baseUrl}/api/files/${encodeURIComponent(image.objectKey)}`;
                                      console.log('Retrying with direct objectKey URL:', directUrl);
                                      e.currentTarget.src = directUrl;
                                      
                                      // We'll add the error handler on this second attempt
                                      e.currentTarget.onerror = (secondErr) => {
                                        console.error('All URL formats failed for image');
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