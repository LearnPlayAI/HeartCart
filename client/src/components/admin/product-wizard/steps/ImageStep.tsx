/**
 * ImageStep Component
 * 
 * This component handles the image upload step of the product wizard,
 * allowing users to upload, arrange, and manage product images.
 */

import React, { useState, useCallback } from 'react';
import { useProductWizardContext } from '../context';
import { useFileUpload } from '@/hooks/use-file-upload';
import { useToast } from '@/hooks/use-toast';
import { formatFileSize } from '@/utils/format';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useDropzone } from 'react-dropzone';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, XCircle, Image as ImageIcon, Star, StarOff, Trash2 } from 'lucide-react';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function ImageStep() {
  const { 
    state, 
    updateField, 
    markStepComplete, 
    markStepInProgress,
    setImageOperationInProgress
  } = useProductWizardContext();
  
  const { toast } = useToast();
  const { 
    uploadFile, 
    removeBackground, 
    deleteFile, 
    isUploading, 
    error, 
    clearError 
  } = useFileUpload();
  
  // Local state for image operations
  const [isProcessingBackground, setIsProcessingBackground] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Set the image operation status in the context
  React.useEffect(() => {
    setImageOperationInProgress(isUploading || isProcessingBackground);
    return () => setImageOperationInProgress(false);
  }, [isUploading, isProcessingBackground, setImageOperationInProgress]);
  
  // Handle file upload
  const handleFileUpload = useCallback(async (files: File[]) => {
    if (!files.length) return;
    
    // Mark step as in progress
    markStepInProgress('images');
    
    // Update progress indicator periodically to show activity
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 95) return prev;
        return prev + 5;
      });
    }, 500);
    
    try {
      // Process each file
      for (const file of files) {
        // Validate file
        if (file.size > MAX_FILE_SIZE) {
          toast({
            title: 'File too large',
            description: `Maximum file size is ${formatFileSize(MAX_FILE_SIZE)}`,
            variant: 'destructive',
          });
          continue;
        }
        
        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
          toast({
            title: 'Invalid file type',
            description: 'Only JPEG, PNG, WebP, and GIF images are supported',
            variant: 'destructive',
          });
          continue;
        }
        
        // Upload the file
        const uploadResult = await uploadFile(file, `products/${state.sku || 'new-product'}`);
        
        // Update context with new image
        updateField('imageUrls', [...state.imageUrls, uploadResult.url]);
        updateField('imageObjectKeys', [...state.imageObjectKeys, uploadResult.objectKey]);
        
        // If this is the first image, set it as the main image
        if (state.imageUrls.length === 0) {
          updateField('mainImageIndex', 0);
        }
        
        toast({
          title: 'Image uploaded',
          description: 'Image has been added to the product',
        });
      }
      
      // Mark step as complete if there are images
      if (state.imageUrls.length > 0) {
        markStepComplete('images');
      }
    } catch (err) {
      toast({
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      clearInterval(progressInterval);
      setUploadProgress(0);
    }
  }, [
    state.imageUrls, 
    state.imageObjectKeys, 
    state.sku, 
    uploadFile, 
    updateField, 
    markStepComplete, 
    markStepInProgress,
    toast,
    clearError
  ]);
  
  // Handle background removal
  const handleRemoveBackground = useCallback(async (index: number) => {
    if (isProcessingBackground) return;
    
    setIsProcessingBackground(true);
    
    try {
      const imageUrl = state.imageUrls[index];
      
      toast({
        title: 'Processing image',
        description: 'Removing background from image...',
      });
      
      const processedImageUrl = await removeBackground(imageUrl);
      
      // Update the image URL at the specified index
      const newImageUrls = [...state.imageUrls];
      newImageUrls[index] = processedImageUrl;
      
      updateField('imageUrls', newImageUrls);
      
      toast({
        title: 'Background removed',
        description: 'Image has been processed successfully',
      });
    } catch (err) {
      toast({
        title: 'Processing failed',
        description: err instanceof Error ? err.message : 'Failed to remove background',
        variant: 'destructive',
      });
    } finally {
      setIsProcessingBackground(false);
    }
  }, [
    state.imageUrls, 
    removeBackground, 
    updateField, 
    toast, 
    isProcessingBackground
  ]);
  
  // Handle image deletion
  const handleDeleteImage = useCallback(async (index: number) => {
    try {
      const objectKey = state.imageObjectKeys[index];
      
      // Delete from server
      await deleteFile(objectKey);
      
      // Remove from arrays
      const newUrls = [...state.imageUrls];
      const newKeys = [...state.imageObjectKeys];
      
      newUrls.splice(index, 1);
      newKeys.splice(index, 1);
      
      // Update main image index if needed
      let newMainIndex = state.mainImageIndex;
      if (index === state.mainImageIndex) {
        newMainIndex = newUrls.length > 0 ? 0 : -1;
      } else if (index < state.mainImageIndex) {
        newMainIndex = state.mainImageIndex - 1;
      }
      
      // Update state
      updateField('imageUrls', newUrls);
      updateField('imageObjectKeys', newKeys);
      updateField('mainImageIndex', newMainIndex);
      
      toast({
        title: 'Image deleted',
        description: 'Image has been removed from the product',
      });
    } catch (err) {
      toast({
        title: 'Deletion failed',
        description: err instanceof Error ? err.message : 'Failed to delete image',
        variant: 'destructive',
      });
    }
  }, [
    state.imageUrls, 
    state.imageObjectKeys, 
    state.mainImageIndex, 
    deleteFile, 
    updateField, 
    toast
  ]);
  
  // Handle setting main image
  const handleSetMainImage = useCallback((index: number) => {
    updateField('mainImageIndex', index);
    toast({
      title: 'Main image updated',
      description: 'Main product image has been updated',
    });
  }, [updateField, toast]);
  
  // Drag and drop reordering
  const handleDragEnd = useCallback((result: any) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    // Reorder image URLs and object keys
    const newUrls = [...state.imageUrls];
    const newKeys = [...state.imageObjectKeys];
    
    // Remove from source index and insert at destination
    const [removedUrl] = newUrls.splice(sourceIndex, 1);
    const [removedKey] = newKeys.splice(sourceIndex, 1);
    
    newUrls.splice(destinationIndex, 0, removedUrl);
    newKeys.splice(destinationIndex, 0, removedKey);
    
    // Adjust main image index if needed
    let newMainIndex = state.mainImageIndex;
    if (sourceIndex === state.mainImageIndex) {
      newMainIndex = destinationIndex;
    } else if (
      sourceIndex < state.mainImageIndex && 
      destinationIndex >= state.mainImageIndex
    ) {
      newMainIndex = state.mainImageIndex - 1;
    } else if (
      sourceIndex > state.mainImageIndex && 
      destinationIndex <= state.mainImageIndex
    ) {
      newMainIndex = state.mainImageIndex + 1;
    }
    
    // Update state
    updateField('imageUrls', newUrls);
    updateField('imageObjectKeys', newKeys);
    updateField('mainImageIndex', newMainIndex);
  }, [state.imageUrls, state.imageObjectKeys, state.mainImageIndex, updateField]);
  
  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileUpload,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/gif': ['.gif'],
    },
    maxSize: MAX_FILE_SIZE,
    multiple: true
  });
  
  // Save images and proceed
  const handleSaveImages = () => {
    if (state.imageUrls.length > 0) {
      markStepComplete('images');
      toast({
        title: 'Images saved',
        description: 'Product images have been saved',
      });
    } else {
      // Still allow proceeding without images
      markStepComplete('images');
      toast({
        title: 'No images',
        description: 'Proceeding without product images',
        variant: 'warning',
      });
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <h3 className="text-lg font-medium">Product Images</h3>
        <p className="text-muted-foreground">
          Upload images for your product. The first image will be used as the main product image.
          You can drag and drop to reorder or select a different main image.
        </p>
        
        {/* Upload area */}
        <Card>
          <CardContent className="pt-6">
            <div 
              {...getRootProps()} 
              className={`
                border-2 border-dashed rounded-md p-10 text-center cursor-pointer
                transition-colors
                ${isDragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/20 hover:border-primary/50'
                }
              `}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center space-y-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">
                    {isDragActive 
                      ? 'Drop images here...' 
                      : 'Drag & drop images here, or click to select'
                    }
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPEG, PNG, WebP or GIF (max. {formatFileSize(MAX_FILE_SIZE)})
                  </p>
                </div>
              </div>
            </div>
            
            {isUploading && (
              <div className="mt-4">
                <div className="w-full bg-muted rounded-full h-2.5 mt-2">
                  <div 
                    className="bg-primary h-2.5 rounded-full" 
                    style={{width: `${uploadProgress}%`}}
                  />
                </div>
                <p className="text-sm text-muted-foreground text-center mt-2">
                  Uploading... {uploadProgress}%
                </p>
              </div>
            )}
            
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
        
        {/* Images grid */}
        {state.imageUrls.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <h4 className="font-medium mb-4">Product Images ({state.imageUrls.length})</h4>
              
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="product-images" direction="horizontal">
                  {(provided) => (
                    <div 
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4"
                    >
                      {state.imageUrls.map((url, index) => (
                        <Draggable key={url} draggableId={url} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`
                                relative group rounded-md overflow-hidden border
                                ${index === state.mainImageIndex 
                                  ? 'border-primary ring-2 ring-primary ring-opacity-40' 
                                  : 'border-border'
                                }
                              `}
                            >
                              <div className="relative aspect-square bg-muted">
                                <img 
                                  src={url} 
                                  alt={`Product image ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                                
                                {/* Main image badge */}
                                {index === state.mainImageIndex && (
                                  <div className="absolute top-2 left-2">
                                    <Badge variant="secondary" className="bg-primary text-primary-foreground">
                                      Main
                                    </Badge>
                                  </div>
                                )}
                                
                                {/* Image actions overlay */}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <div className="flex flex-col items-center gap-2">
                                    {/* Main image toggle */}
                                    {index !== state.mainImageIndex ? (
                                      <Button
                                        size="icon"
                                        variant="outline"
                                        className="h-8 w-8 bg-background/80 hover:bg-background"
                                        onClick={() => handleSetMainImage(index)}
                                        title="Set as main image"
                                      >
                                        <Star className="h-4 w-4" />
                                      </Button>
                                    ) : (
                                      <Button
                                        size="icon"
                                        variant="outline"
                                        className="h-8 w-8 bg-primary text-primary-foreground"
                                        disabled
                                        title="Current main image"
                                      >
                                        <StarOff className="h-4 w-4" />
                                      </Button>
                                    )}
                                    
                                    {/* Background removal */}
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      className="h-8 w-8 bg-background/80 hover:bg-background"
                                      onClick={() => handleRemoveBackground(index)}
                                      disabled={isProcessingBackground}
                                      title="Remove background"
                                    >
                                      {isProcessingBackground ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <ImageIcon className="h-4 w-4" />
                                      )}
                                    </Button>
                                    
                                    {/* Delete image */}
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      className="h-8 w-8 bg-background/80 hover:bg-background hover:text-destructive"
                                      onClick={() => handleDeleteImage(index)}
                                      title="Delete image"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
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
              
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-muted-foreground">
                  {state.mainImageIndex >= 0 
                    ? 'Drag images to reorder or click on an image to set as main' 
                    : 'No main image selected'
                  }
                </p>
                <Button
                  variant="secondary"
                  onClick={handleSaveImages}
                  className="ml-auto"
                >
                  {state.imageUrls.length === 0 ? 'Skip Images' : 'Save Images'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}