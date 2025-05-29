/**
 * ProductImagesStep Component (Refactored)
 * 
 * This component implements Step 2 of the product wizard using the new file handling utilities,
 * allowing the user to upload, manage, and organize product images with better reliability and performance.
 */

import React, { useEffect } from 'react';
import { useProductWizard } from '../context';
import { WizardActionType } from '../types';
import { useDropzone } from 'react-dropzone';
import { Loader2, Plus, XCircle, Star, Upload, ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// Import the new file handling utilities
import { useFileUpload } from '@/hooks/use-file-upload';
import { UPLOAD_ENDPOINTS, ensureValidImageUrl } from '@/utils/file-manager';

interface ProductImagesStepProps {
  className?: string;
}

export const ProductImagesStepRefactored: React.FC<ProductImagesStepProps> = ({ className }) => {
  const { state, dispatch } = useProductWizard();
  const { productData } = state;
  const { toast } = useToast();
  
  // Initialize file upload hook with appropriate configuration
  const fileUpload = useFileUpload({
    maxFiles: 10, // Allow up to 10 product images
    maxSizeMB: 5, // 5MB max file size
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    endpoint: productData.id 
      ? UPLOAD_ENDPOINTS.PRODUCT_IMAGES(productData.id)
      : UPLOAD_ENDPOINTS.PRODUCT_TEMP,
    additionalData: productData.id ? { productId: productData.id } : undefined,
    initialImages: productData.uploadedImages
  });
  
  // Sync local state with wizard context when images change
  useEffect(() => {
    if (fileUpload.images.length > 0 && !fileUpload.isUploading) {
      // First update the main image flag
      const mainImageIndex = fileUpload.mainImageIndex;
      if (mainImageIndex >= 0 && mainImageIndex < fileUpload.images.length) {
        const mainImage = fileUpload.images[mainImageIndex];
        
        dispatch({
          type: WizardActionType.SET_MAIN_IMAGE,
          payload: mainImage.id || mainImage.url
        });
      }
      
      // Then ensure all images are in context
      fileUpload.images.forEach(image => {
        // Check if this image already exists in the wizard context
        const existingImageIndex = productData.uploadedImages.findIndex(img => 
          (img.id && img.id === image.id) || 
          (img.url && img.url === image.url) ||
          (img.objectKey && img.objectKey === image.objectKey)
        );
        
        if (existingImageIndex === -1) {
          // Add new image to context
          dispatch({
            type: WizardActionType.ADD_UPLOADED_IMAGE,
            payload: image
          });
        }
      });
      
      // Remove any images that were deleted locally
      productData.uploadedImages.forEach(contextImage => {
        const stillExists = fileUpload.images.some(img => 
          (img.id && contextImage.id && img.id === contextImage.id) || 
          (img.url && contextImage.url && img.url === contextImage.url) ||
          (img.objectKey && contextImage.objectKey && img.objectKey === contextImage.objectKey)
        );
        
        if (!stillExists) {
          dispatch({
            type: WizardActionType.REMOVE_UPLOADED_IMAGE,
            payload: contextImage.id || contextImage.url || contextImage.objectKey || ''
          });
        }
      });
    }
  }, [fileUpload.images, fileUpload.mainImageIndex, dispatch, productData.uploadedImages, fileUpload.isUploading]);
  
  // Setup dropzone for file selection
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/gif': ['.gif']
    },
    maxSize: 5 * 1024 * 1024, // 5MB limit
    onDrop: (acceptedFiles) => {
      fileUpload.addFiles(acceptedFiles);
    }
  });
  
  // Handle drag and drop reordering
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const fromIndex = result.source.index;
    const toIndex = result.destination.index;
    
    fileUpload.reorderImages(fromIndex, toIndex);
  };
  
  // Handle deleting an image
  const handleDeleteImage = (index: number) => {
    fileUpload.removeFile(index);
    
    
  };
  
  // Handle setting an image as the main image
  const handleSetMainImage = (index: number) => {
    fileUpload.setMainImage(index);
    
    
  };
  
  // Upload all pending images
  const handleUploadImages = async () => {
    try {
      await fileUpload.uploadAllFiles();
      
      
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload images",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle>Product Images</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Dropzone for file uploads */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 cursor-pointer flex flex-col items-center justify-center transition-colors ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-sm text-center text-muted-foreground">
              {isDragActive ? (
                "Drop the images here..."
              ) : (
                "Drag and drop product images here, or click to select files"
              )}
            </p>
            <p className="text-xs text-center text-muted-foreground mt-1">
              Up to 10 images, maximum 5MB each (JPG, PNG, WebP, GIF)
            </p>
          </div>
          
          {/* Error display */}
          {Object.entries(fileUpload.errors).length > 0 && (
            <div className="mt-4 p-3 bg-destructive/10 rounded-md">
              <h4 className="font-medium text-destructive">Upload Errors:</h4>
              <ul className="mt-1 list-disc list-inside text-sm">
                {Object.entries(fileUpload.errors).map(([key, error]) => (
                  <li key={key} className="text-destructive">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Image gallery */}
          {fileUpload.previews.length > 0 ? (
            <div className="mt-6">
              <h3 className="font-medium mb-2">Product Images ({fileUpload.previews.length})</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Drag to reorder images. The first image will be the main product image.
              </p>
              
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="product-images" direction="horizontal">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                    >
                      {fileUpload.previews.map((previewUrl, index) => (
                        <Draggable
                          key={`image-${index}`}
                          draggableId={`image-${index}`}
                          index={index}
                        >
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="relative border rounded-md overflow-hidden aspect-square group"
                            >
                              {/* Loading indicator */}
                              {fileUpload.isUploading && (
                                <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                              )}
                              
                              {/* Image preview */}
                              <img
                                src={ensureValidImageUrl(previewUrl)}
                                alt={`Product image ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                              
                              {/* Main image indicator */}
                              {index === fileUpload.mainImageIndex && (
                                <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs rounded-full px-2 py-1 flex items-center">
                                  <Star className="h-3 w-3 mr-1" />
                                  <span>Main</span>
                                </div>
                              )}
                              
                              {/* Image actions */}
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8 bg-white"
                                  onClick={() => handleSetMainImage(index)}
                                  disabled={index === fileUpload.mainImageIndex}
                                >
                                  <Star className="h-4 w-4" />
                                </Button>
                                
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="destructive"
                                      className="h-8 w-8"
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Remove Image</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to remove this image? This cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteImage(index)}
                                      >
                                        Remove
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          ) : (
            <div className="mt-6 border rounded-md p-8 flex flex-col items-center justify-center text-muted-foreground">
              <ImageIcon className="h-12 w-12 mb-2" />
              <p>No product images added yet</p>
              <p className="text-sm mt-1">Add at least one image of your product</p>
            </div>
          )}
        </CardContent>
        
        {/* Upload button for manual upload control */}
        {fileUpload.images.some(img => img.file) && (
          <CardFooter>
            <Button
              onClick={handleUploadImages}
              disabled={fileUpload.isUploading}
              className="ml-auto"
            >
              {fileUpload.isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Images
                </>
              )}
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};