/**
 * Example Product Images Step using the new file handling system
 * 
 * This component demonstrates how to use the new useFileUpload hook
 * for managing product images in the product wizard.
 */

import React, { useEffect } from 'react';
import { useProductWizard } from '../context';
import { WizardActionType } from '../types';
import { useDropzone } from 'react-dropzone';
import { Loader2, Plus, XCircle, Star, Upload, ImageIcon, ArrowLeft, ArrowRight } from 'lucide-react';
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

// Import the new file upload hook
import { useFileUpload } from '@/hooks/use-file-upload';
import { UPLOAD_ENDPOINTS } from '@/utils/file-manager';

interface ProductImagesStepProps {
  className?: string;
}

export const ExampleProductImagesStep: React.FC<ProductImagesStepProps> = ({ className }) => {
  const { state, dispatch } = useProductWizard();
  const { productData } = state;
  const { toast } = useToast();
  
  // Initialize the file upload hook with appropriate options
  const fileUpload = useFileUpload({
    maxFiles: 10,
    maxSizeMB: 5,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    endpoint: productData.id 
      ? UPLOAD_ENDPOINTS.PRODUCT_IMAGES(productData.id)
      : UPLOAD_ENDPOINTS.PRODUCT_TEMP,
    additionalData: productData.id ? { productId: productData.id } : undefined,
    initialImages: productData.uploadedImages
  });
  
  // Update wizard state when images change
  useEffect(() => {
    if (fileUpload.images.length > 0 && !fileUpload.isUploading) {
      // First sync the main image
      const mainImageIndex = fileUpload.mainImageIndex;
      if (mainImageIndex >= 0 && mainImageIndex < fileUpload.images.length) {
        const mainImage = fileUpload.images[mainImageIndex];
        
        // Set this image as main in the context
        dispatch({
          type: WizardActionType.SET_MAIN_IMAGE,
          payload: mainImage.id || mainImage.url
        });
      }
      
      // Then update all images in the context
      fileUpload.images.forEach(image => {
        // Check if this image already exists in context
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
    }
  }, [fileUpload.images, fileUpload.mainImageIndex, fileUpload.isUploading, dispatch, productData.uploadedImages]);
  
  // Configure react-dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/gif': ['.gif'],
    },
    maxSize: 5 * 1024 * 1024, // 5MB limit
    onDrop: (acceptedFiles) => {
      fileUpload.addFiles(acceptedFiles);
    }
  });
  
  // Handle drag-and-drop reordering
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const fromIndex = result.source.index;
    const toIndex = result.destination.index;
    
    fileUpload.reorderImages(fromIndex, toIndex);
  };
  
  // Handle image deletion
  const handleDeleteImage = (index: number) => {
    fileUpload.removeFile(index);
    toast({
      title: "Image removed",
      description: "The image has been removed from the product"
    });
  };
  
  // Handle setting an image as the main image
  const handleSetMainImage = (index: number) => {
    fileUpload.setMainImage(index);
    toast({
      title: "Main image set",
      description: "The selected image is now the main product image"
    });
  };
  
  // Handle upload of all images to server (for manual upload button)
  const handleUploadImages = async () => {
    try {
      await fileUpload.uploadAllFiles();
      toast({
        title: "Images uploaded",
        description: "All images have been successfully uploaded"
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload images",
        variant: "destructive"
      });
    }
  };
  
  // Render the component
  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle>Product Images</CardTitle>
        </CardHeader>
        
        <CardContent>
          {/* File Upload Area */}
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
                "Drop images here..."
              ) : (
                "Drag 'n' drop images here, or click to select files"
              )}
            </p>
            <p className="text-xs text-center text-muted-foreground mt-1">
              Max 10 images, 5MB each (JPG, PNG, WebP, GIF)
            </p>
          </div>
          
          {/* Error Messages */}
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
          
          {/* Uploaded Images Preview */}
          {fileUpload.previews.length > 0 && (
            <div className="mt-6">
              <h3 className="font-medium mb-3">Product Images ({fileUpload.previews.length})</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Drag to reorder. The first image will be the main product image.
              </p>
              
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="product-images" direction="horizontal">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 min-h-[120px]"
                    >
                      {fileUpload.previews.map((preview, index) => (
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
                              className="relative rounded-md overflow-hidden border border-border aspect-square group"
                            >
                              {fileUpload.isUploading && (
                                <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                              )}
                              
                              <img
                                src={preview}
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
                              
                              {/* Image controls */}
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                <div className="flex gap-2">
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
                                          Are you sure you want to remove this image? This action cannot be undone.
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
                                
                                {/* Reorder buttons for better accessibility */}
                                <div className="flex gap-2 mt-2">
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-8 w-8 bg-white"
                                    onClick={() => fileUpload.reorderImages(index, Math.max(0, index - 1))}
                                    disabled={index === 0}
                                  >
                                    <ArrowLeft className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-8 w-8 bg-white"
                                    onClick={() => fileUpload.reorderImages(index, Math.min(fileUpload.previews.length - 1, index + 1))}
                                    disabled={index === fileUpload.previews.length - 1}
                                  >
                                    <ArrowRight className="h-4 w-4" />
                                  </Button>
                                </div>
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
          )}
        </CardContent>
        
        {/* Manual Upload Button */}
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