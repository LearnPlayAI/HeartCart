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
      // Process each file (can be made into a batch operation)
      for (const file of acceptedFiles) {
        // Create object URL for preview
        const previewUrl = URL.createObjectURL(file);
        
        // In a real implementation, you'd upload to server here
        // For now, we'll just simulate that by adding to state
        
        // Create a placeholder image object
        const newImage: UploadedImage = {
          url: previewUrl,
          isMain: productData.uploadedImages.length === 0, // First image is main by default
          file,
          order: productData.uploadedImages.length
        };
        
        // Add to state
        dispatch({
          type: WizardActionType.ADD_UPLOADED_IMAGE,
          payload: newImage
        });
        
        // In a real implementation, you would have API call like:
        // const formData = new FormData();
        // formData.append('image', file);
        // const response = await fetch('/api/product-images/upload', { method: 'POST', body: formData });
        // const { id, url } = await response.json();
        // Then update state with real server data
      }
      
      toast({
        title: "Images uploaded",
        description: `${acceptedFiles.length} image${acceptedFiles.length !== 1 ? 's' : ''} added to product`,
      });
    } catch (error) {
      console.error('Error uploading images:', error);
      toast({
        title: "Upload failed",
        description: "There was a problem uploading your images",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  }, [dispatch, productData.uploadedImages, toast]);
  
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
      // In a real implementation, you would call an API to remove the background
      // For now, we'll just simulate the process with a delay
      
      // Simulating API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Background removed",
        description: "AI has processed the image and removed the background"
      });
      
      // In reality, you would update the image with the new processed version
      // For now, we'll just mark it as processed
      const updatedImages = productData.uploadedImages.map(img => {
        if ((typeof imageIdOrUrl === 'number' && img.id === imageIdOrUrl) || 
            (typeof imageIdOrUrl === 'string' && img.url === imageIdOrUrl)) {
          return {
            ...img,
            metadata: { ...img.metadata, backgroundRemoved: true }
          };
        }
        return img;
      });
      
      dispatch({
        type: WizardActionType.REORDER_IMAGES,
        payload: updatedImages
      });
    } catch (error) {
      console.error('Error removing background:', error);
      toast({
        title: "Process failed",
        description: "There was a problem removing the background",
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
                                  src={image.url} 
                                  alt="Product" 
                                  className="w-full h-40 object-cover"
                                />
                                
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
              <p>The image with the star icon is the main product image that will be displayed in product listings.</p>
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