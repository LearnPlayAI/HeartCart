/**
 * Image Step Component
 * 
 * Handles image uploads, previews, management, and reordering for the product wizard.
 * Uses the useFileUpload hook for consistent file handling.
 */

import React, { useEffect, useState } from 'react';
import { useProductWizardContext } from '../context';
import { useFileUpload, FileUploadResult } from '@/hooks/use-file-upload';
import { UPLOAD_ENDPOINTS, ensureValidImageUrl } from '@/utils/file-manager';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { DropZone } from '@/components/ui/drop-zone';
import { 
  Card,
  CardContent
} from '@/components/ui/card';
import { 
  Button,
  buttonVariants
} from '@/components/ui/button';
import {
  Trash2,
  UploadCloud,
  ImageIcon,
  Star,
  StarIcon,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  GripVertical,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const ImageStep: React.FC = () => {
  const { state, updateField, markStepComplete } = useProductWizardContext();
  const { toast } = useToast();
  
  // Initialize file upload hook
  const {
    selectedFiles,
    addFiles,
    removeFile,
    setMainImage,
    reorderImages,
    uploadAllFiles,
    clearFiles,
    isUploading,
    progress,
    error
  } = useFileUpload({
    maxFiles: 10,
    maxSizeMB: 5,
    endpoint: state.productId 
      ? UPLOAD_ENDPOINTS.PRODUCT(state.productId)
      : UPLOAD_ENDPOINTS.PRODUCT_TEMP,
    additionalData: state.productId ? { productId: state.productId } : {},
    onSuccess: (results) => handleUploadSuccess(results)
  });
  
  // Existing images from the product
  const [existingImages, setExistingImages] = useState<{
    url: string;
    objectKey: string;
    isMain: boolean;
    order: number;
  }[]>([]);
  
  // Load existing images on component mount
  useEffect(() => {
    if (state.imageUrls.length > 0 && state.imageObjectKeys.length > 0) {
      const images = state.imageUrls.map((url, index) => ({
        url: ensureValidImageUrl(url),
        objectKey: state.imageObjectKeys[index] || '',
        isMain: index === state.mainImageIndex,
        order: index
      }));
      setExistingImages(images);
    }
  }, [state.imageUrls, state.imageObjectKeys, state.mainImageIndex]);
  
  // Handle upload success
  const handleUploadSuccess = (results: FileUploadResult[]) => {
    if (!results.length) return;
    
    // Update the wizard state with the uploaded files
    const newUrls = results.map(result => result.url);
    const newObjectKeys = results.map(result => result.objectKey);
    
    // Find the main image index from the results
    const mainImageIndex = results.findIndex(result => result.isMain);
    
    updateField('imageUrls', [...state.imageUrls, ...newUrls]);
    
    if (state.productId) {
      // For existing products, add to regular image keys
      updateField('imageObjectKeys', [...state.imageObjectKeys, ...newObjectKeys]);
    } else {
      // For new products, add to temp image keys
      updateField('tempImageObjectKeys', [...state.tempImageObjectKeys, ...newObjectKeys]);
    }
    
    // If there's a main image defined, update the main image index
    if (mainImageIndex !== -1) {
      updateField('mainImageIndex', state.imageUrls.length + mainImageIndex);
    } else if (state.imageUrls.length === 0 && newUrls.length > 0) {
      // If there were no images before and we're adding the first one, make it the main image
      updateField('mainImageIndex', 0);
    }
    
    // Mark step as complete
    markStepComplete('images');
    
    // Clear the file list for the next batch
    clearFiles();
    
    toast({
      title: 'Images uploaded successfully',
      description: `${results.length} image${results.length !== 1 ? 's' : ''} uploaded.`,
    });
  };
  
  // Handle drag and drop reordering
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    if (sourceIndex === destinationIndex) return;
    
    // If we're reordering existing images
    if (result.source.droppableId === 'existing-images' && 
        result.destination.droppableId === 'existing-images') {
      
      // Create a new array with the reordered images
      const reorderedImages = [...existingImages];
      const [removed] = reorderedImages.splice(sourceIndex, 1);
      reorderedImages.splice(destinationIndex, 0, removed);
      
      // Update order property for all images
      reorderedImages.forEach((image, index) => {
        image.order = index;
      });
      
      // Update the existing images state
      setExistingImages(reorderedImages);
      
      // Update the wizard state
      const newUrls = reorderedImages.map(img => img.url);
      const newObjectKeys = reorderedImages.map(img => img.objectKey);
      
      // Find the main image index
      const mainImageIndex = reorderedImages.findIndex(img => img.isMain);
      
      updateField('imageUrls', newUrls);
      updateField('imageObjectKeys', newObjectKeys);
      updateField('mainImageIndex', mainImageIndex !== -1 ? mainImageIndex : 0);
    }
    // If we're reordering pending upload images
    else if (result.source.droppableId === 'upload-preview' && 
             result.destination.droppableId === 'upload-preview') {
      reorderImages(sourceIndex, destinationIndex);
    }
  };
  
  // Make an image the main image
  const handleSetMainImage = (index: number, isExisting: boolean = false) => {
    if (isExisting) {
      // Update main image for existing images
      const updatedImages = existingImages.map((img, i) => ({
        ...img,
        isMain: i === index
      }));
      
      setExistingImages(updatedImages);
      updateField('mainImageIndex', index);
    } else {
      // For new images, use the hook's function
      setMainImage(index);
    }
  };
  
  // Delete an image
  const handleDeleteImage = (index: number, isExisting: boolean = false) => {
    if (isExisting) {
      // Remove from existing images
      const removedImage = existingImages[index];
      const updatedImages = existingImages.filter((_, i) => i !== index);
      
      // Update order property for all remaining images
      updatedImages.forEach((image, i) => {
        image.order = i;
      });
      
      // If we removed the main image, make the first remaining image the main one
      if (removedImage.isMain && updatedImages.length > 0) {
        updatedImages[0].isMain = true;
      }
      
      setExistingImages(updatedImages);
      
      // Update the wizard state
      const newUrls = updatedImages.map(img => img.url);
      const newObjectKeys = updatedImages.map(img => img.objectKey);
      
      // Find the main image index
      const mainImageIndex = updatedImages.findIndex(img => img.isMain);
      
      updateField('imageUrls', newUrls);
      updateField('imageObjectKeys', newObjectKeys);
      updateField('mainImageIndex', mainImageIndex !== -1 ? mainImageIndex : 0);
    } else {
      // Remove from pending uploads
      removeFile(index);
    }
  };
  
  // Handle file selection
  const handleFilesSelected = (files: File[]) => {
    addFiles(files);
  };
  
  // Handle upload button click
  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: 'No files selected',
        description: 'Please add some images before uploading.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      await uploadAllFiles();
    } catch (err) {
      console.error('Error uploading files:', err);
      toast({
        title: 'Upload failed',
        description: 'There was an error uploading your images. Please try again.',
        variant: 'destructive'
      });
    }
  };
  
  return (
    <div className="product-wizard-image-step space-y-6">
      <h2 className="text-2xl font-bold">Product Images</h2>
      <p className="text-muted-foreground">
        Add up to 10 high-quality images of your product. The first image will be used as the main product image.
      </p>
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <DragDropContext onDragEnd={handleDragEnd}>
        {/* Existing images section */}
        {existingImages.length > 0 && (
          <div className="existing-images mb-8">
            <h3 className="text-lg font-semibold mb-4">Existing Images</h3>
            
            <Droppable droppableId="existing-images" direction="horizontal">
              {(provided) => (
                <div 
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {existingImages.map((image, index) => (
                    <Draggable 
                      key={`existing-${image.objectKey}`} 
                      draggableId={`existing-${image.objectKey}`} 
                      index={index}
                    >
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="relative group"
                        >
                          <Card className={cn(
                            "overflow-hidden border-2",
                            image.isMain ? "border-primary" : "border-muted hover:border-muted-foreground/50"
                          )}>
                            <div className="absolute top-2 right-2 z-10 space-x-1">
                              <Button 
                                variant="secondary" 
                                size="icon" 
                                className="h-8 w-8 opacity-80 hover:opacity-100"
                                onClick={() => handleDeleteImage(index, true)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <div 
                              {...provided.dragHandleProps} 
                              className="absolute top-2 left-2 z-10 cursor-move"
                            >
                              <GripVertical className="h-5 w-5 text-white drop-shadow-md opacity-70 hover:opacity-100" />
                            </div>
                            
                            <div className="relative pt-[100%]">
                              <img 
                                src={image.url}
                                alt={`Product image ${index + 1}`}
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                            </div>
                            
                            <div className="p-2 bg-muted/40 flex justify-between items-center">
                              <Badge variant={image.isMain ? "default" : "outline"} className="font-normal">
                                {image.isMain ? (
                                  <><Star className="h-3 w-3 mr-1" /> Main Image</>
                                ) : (
                                  <>Image {index + 1}</>
                                )}
                              </Badge>
                              
                              {!image.isMain && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 px-2"
                                  onClick={() => handleSetMainImage(index, true)}
                                >
                                  Set as Main
                                </Button>
                              )}
                            </div>
                          </Card>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
            
            <Separator className="my-8" />
          </div>
        )}
        
        {/* Image upload section */}
        <div className="upload-section">
          <h3 className="text-lg font-semibold mb-4">Add New Images</h3>
          
          <DropZone
            onFilesDrop={handleFilesSelected}
            accept={{ 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif'] }}
            maxFiles={10 - existingImages.length}
            maxSize={5 * 1024 * 1024} // 5MB
          >
            <div className="flex flex-col items-center justify-center p-4">
              <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">
                Drag and drop images here or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG, WEBP or GIF, up to 5MB
              </p>
            </div>
          </DropZone>
          
          {/* Upload preview */}
          {selectedFiles.length > 0 && (
            <div className="upload-preview mt-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-base font-medium">Selected Images</h4>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFiles}
                    disabled={isUploading}
                  >
                    Clear All
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleUpload}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="h-4 w-4 mr-2" />
                        Upload All
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              {isUploading && (
                <Progress value={progress} className="mb-4" />
              )}
              
              <Droppable droppableId="upload-preview" direction="horizontal">
                {(provided) => (
                  <div 
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    {selectedFiles.map((file, index) => (
                      <Draggable 
                        key={`preview-${index}`} 
                        draggableId={`preview-${index}`} 
                        index={index}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="relative group"
                          >
                            <Card className={cn(
                              "overflow-hidden border-2",
                              file.isMain ? "border-primary" : "border-muted hover:border-muted-foreground/50"
                            )}>
                              <div className="absolute top-2 right-2 z-10 space-x-1">
                                <Button 
                                  variant="secondary" 
                                  size="icon" 
                                  className="h-8 w-8 opacity-80 hover:opacity-100"
                                  onClick={() => handleDeleteImage(index)}
                                  disabled={isUploading}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              <div 
                                {...provided.dragHandleProps} 
                                className="absolute top-2 left-2 z-10 cursor-move"
                              >
                                <GripVertical className="h-5 w-5 text-white drop-shadow-md opacity-70 hover:opacity-100" />
                              </div>
                              
                              <div className="relative pt-[100%]">
                                <img 
                                  src={file.preview}
                                  alt={`Preview ${index + 1}`}
                                  className="absolute inset-0 w-full h-full object-cover"
                                />
                              </div>
                              
                              <div className="p-2 bg-muted/40 flex justify-between items-center">
                                <Badge variant={file.isMain ? "default" : "outline"} className="font-normal">
                                  {file.isMain ? (
                                    <><Star className="h-3 w-3 mr-1" /> Main Image</>
                                  ) : (
                                    <>Image {index + 1}</>
                                  )}
                                </Badge>
                                
                                {!file.isMain && !isUploading && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 px-2"
                                    onClick={() => handleSetMainImage(index)}
                                  >
                                    Set as Main
                                  </Button>
                                )}
                              </div>
                            </Card>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          )}
        </div>
      </DragDropContext>
      
      {selectedFiles.length === 0 && existingImages.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No images yet</AlertTitle>
          <AlertDescription>
            You haven't added any images to this product yet. While images are optional, products with high-quality images perform better.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ImageStep;