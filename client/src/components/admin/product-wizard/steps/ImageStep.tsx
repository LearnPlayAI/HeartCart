/**
 * ImageStep Component
 * 
 * This component handles the second step of the product wizard,
 * allowing users to upload and manage product images.
 */

import React, { useEffect, useState } from 'react';
import { useProductWizardContext } from '../context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useFileUpload } from '@/hooks/use-file-upload';
import { 
  StorageBucket, 
  deleteFile, 
  getObjectUrl,
  removeImageBackground 
} from '@/utils/file-manager';
import { 
  Upload, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  MoveRight, 
  ArrowLeft,
  Trash2,
  ArrowUpDown,
  ImageIcon,
  Loader2 
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

// Local interface for image display
interface ProductImage {
  url: string;
  objectKey: string;
  isMain: boolean;
  hasBgRemoved: boolean;
  bgRemovedUrl?: string;
  bgRemovedObjectKey?: string;
}

const ImageStep: React.FC = () => {
  const { toast } = useToast();
  const { 
    state, 
    updateField, 
    validateStep, 
    markStepComplete,
    currentStep,
    goToStep,
    imageOperationInProgress,
    setImageOperationInProgress
  } = useProductWizardContext();
  
  // Local state for images
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [processingImageIndex, setProcessingImageIndex] = useState<number | null>(null);
  
  // Set up file upload hook
  const fileUpload = useFileUpload({
    bucket: StorageBucket.PRODUCTS,
    maxFiles: 10,
    onUploadSuccess: (objectKey, url) => {
      // Add the new image to local state
      setProductImages(prev => [
        ...prev,
        {
          url,
          objectKey,
          isMain: prev.length === 0, // Make the first image the main image by default
          hasBgRemoved: false,
        }
      ]);
    },
    onUploadError: (error) => {
      toast({
        title: 'Upload Error',
        description: error,
        variant: 'destructive',
      });
    }
  });
  
  // Initialize from context state if images exist
  useEffect(() => {
    if (state.imageUrls.length > 0 && state.imageObjectKeys.length > 0) {
      const images: ProductImage[] = state.imageUrls.map((url, index) => ({
        url,
        objectKey: state.imageObjectKeys[index],
        isMain: state.mainImageIndex === index,
        hasBgRemoved: false, // This would need to be stored in state if we want to preserve it
        bgRemovedUrl: undefined,
        bgRemovedObjectKey: undefined,
      }));
      
      setProductImages(images);
    }
  }, [state.imageUrls, state.imageObjectKeys, state.mainImageIndex]);
  
  // Remove image from the list
  const handleRemoveImage = async (index: number) => {
    try {
      setImageOperationInProgress(true);
      const imageToRemove = productImages[index];
      
      // Attempt to delete the file from storage
      await deleteFile(imageToRemove.objectKey);
      
      // If this image has a background removed version, delete that too
      if (imageToRemove.hasBgRemoved && imageToRemove.bgRemovedObjectKey) {
        await deleteFile(imageToRemove.bgRemovedObjectKey);
      }
      
      // Remove from local state
      const newImages = [...productImages];
      newImages.splice(index, 1);
      
      // If we removed the main image, set a new main image if available
      if (imageToRemove.isMain && newImages.length > 0) {
        newImages[0].isMain = true;
      }
      
      setProductImages(newImages);
      
      toast({
        title: 'Image Removed',
        description: 'The image has been removed successfully.',
      });
    } catch (error) {
      console.error('Error removing image:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove the image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setImageOperationInProgress(false);
    }
  };
  
  // Set an image as the main product image
  const handleSetMainImage = (index: number) => {
    setProductImages(prev => 
      prev.map((img, i) => ({
        ...img,
        isMain: i === index,
      }))
    );
  };
  
  // Remove background from an image
  const handleRemoveBackground = async (index: number) => {
    try {
      setProcessingImageIndex(index);
      setImageOperationInProgress(true);
      
      const imageToProcess = productImages[index];
      
      // If already has background removed, just toggle between views
      if (imageToProcess.hasBgRemoved && imageToProcess.bgRemovedUrl) {
        const newImages = [...productImages];
        newImages[index] = {
          ...newImages[index],
          hasBgRemoved: !newImages[index].hasBgRemoved,
        };
        setProductImages(newImages);
        setProcessingImageIndex(null);
        return;
      }
      
      toast({
        title: 'Processing Image',
        description: 'Removing background. This may take a moment...',
      });
      
      // Make API request to remove background
      const result = await removeImageBackground(imageToProcess.objectKey);
      
      if (result.success && result.objectKey && result.url) {
        // Update the image in local state
        const newImages = [...productImages];
        newImages[index] = {
          ...newImages[index],
          hasBgRemoved: true,
          bgRemovedUrl: result.url,
          bgRemovedObjectKey: result.objectKey,
        };
        
        setProductImages(newImages);
        
        toast({
          title: 'Background Removed',
          description: 'The image background has been removed successfully.',
        });
      } else {
        throw new Error(result.error || 'Failed to remove background');
      }
    } catch (error: any) {
      console.error('Error removing background:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove the background. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessingImageIndex(null);
      setImageOperationInProgress(false);
    }
  };
  
  // Handle drag and drop reordering
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(productImages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Preserve the main image flag
    const mainImageIndex = productImages.findIndex(img => img.isMain);
    const newMainImageIndex = items.findIndex(img => img === productImages[mainImageIndex]);
    
    const updatedItems = items.map((item, index) => ({
      ...item,
      isMain: index === newMainImageIndex,
    }));
    
    setProductImages(updatedItems);
  };
  
  // Save and continue to the next step
  const handleContinue = () => {
    // Update context with current image state
    updateField('imageUrls', productImages.map(img => img.url));
    updateField('imageObjectKeys', productImages.map(img => img.objectKey));
    updateField('mainImageIndex', productImages.findIndex(img => img.isMain));
    
    // Mark this step as completed
    if (validateStep(currentStep)) {
      markStepComplete(currentStep);
      goToStep('additional-info');
    }
  };
  
  // Go back to the previous step
  const handleBack = () => {
    goToStep('basic-info');
  };
  
  return (
    <div className="image-step">
      <h2 className="text-2xl font-semibold mb-6">Product Images</h2>
      
      <div className="mb-8">
        <div 
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            fileUpload.isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          }`}
          onDragOver={fileUpload.handleDragOver}
          onDragLeave={fileUpload.handleDragLeave}
          onDrop={fileUpload.handleDrop}
          onClick={fileUpload.openFileDialog}
        >
          <div className="flex flex-col items-center justify-center space-y-4 cursor-pointer">
            <Upload className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="text-lg font-medium">
                Drop your product images here or <span className="text-primary">click to browse</span>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Accepts JPG, PNG, WebP up to 10MB
              </p>
            </div>
          </div>
          
          <input
            type="file"
            ref={fileUpload.fileInputRef}
            className="hidden"
            accept="image/*"
            multiple
            onChange={fileUpload.handleFileInputChange}
          />
        </div>
        
        {fileUpload.isUploading && (
          <div className="mt-4">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span>Uploading... {fileUpload.uploadProgress}%</span>
            </div>
            <div className="mt-2 w-full bg-muted rounded-full">
              <div 
                className="bg-primary h-2 rounded-full" 
                style={{ width: `${fileUpload.uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}
        
        {fileUpload.errors.length > 0 && (
          <div className="mt-4 p-4 border border-destructive/50 bg-destructive/10 rounded-lg">
            <h3 className="font-medium text-destructive flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              Upload Errors
            </h3>
            <ul className="mt-2 space-y-1 text-sm">
              {fileUpload.errors.map((error, i) => (
                <li key={i} className="text-destructive/90">{error}</li>
              ))}
            </ul>
            <Button 
              variant="outline" 
              className="mt-2" 
              size="sm"
              onClick={fileUpload.clearErrors}
            >
              Clear Errors
            </Button>
          </div>
        )}
      </div>
      
      {/* Image Gallery */}
      {productImages.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Product Images</h3>
          
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Drag and drop to reorder images. The image with the check mark will be used as the main product image.
            </p>
          </div>
          
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="product-images" direction="horizontal">
              {(provided) => (
                <div 
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                >
                  {productImages.map((image, index) => (
                    <Draggable key={image.objectKey} draggableId={image.objectKey} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                        >
                          <Card className={`overflow-hidden ${image.isMain ? 'ring-2 ring-primary' : ''}`}>
                            <div className="relative pb-[100%]">
                              <img 
                                src={image.hasBgRemoved && image.bgRemovedUrl ? image.bgRemovedUrl : image.url} 
                                alt={`Product ${index + 1}`} 
                                className="absolute top-0 left-0 w-full h-full object-contain"
                              />
                              
                              {/* Main indicator */}
                              {image.isMain && (
                                <div className="absolute top-2 left-2 bg-primary text-white p-1 rounded-full">
                                  <CheckCircle2 className="h-4 w-4" />
                                </div>
                              )}
                              
                              {/* Background removed indicator */}
                              {image.hasBgRemoved && (
                                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs py-1 px-2 rounded-md">
                                  BG Removed
                                </div>
                              )}
                            </div>
                            
                            <CardContent className="p-3">
                              <div className="flex flex-wrap gap-2">
                                {/* Set as main image */}
                                {!image.isMain && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleSetMainImage(index)}
                                    title="Set as main image"
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </Button>
                                )}
                                
                                {/* Remove background */}
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleRemoveBackground(index)}
                                  disabled={processingImageIndex === index || imageOperationInProgress}
                                  title={image.hasBgRemoved ? "Toggle background" : "Remove background"}
                                >
                                  {processingImageIndex === index ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <ImageIcon className="h-4 w-4" />
                                  )}
                                </Button>
                                
                                {/* Drag handle */}
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="cursor-grab"
                                  title="Drag to reorder"
                                >
                                  <ArrowUpDown className="h-4 w-4" />
                                </Button>
                                
                                {/* Delete image */}
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => handleRemoveImage(index)}
                                  disabled={imageOperationInProgress}
                                  title="Delete image"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
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
      
      {/* Step navigation */}
      <div className="mt-8 flex justify-between border-t pt-6">
        <Button 
          variant="outline" 
          onClick={handleBack}
          disabled={imageOperationInProgress}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Basic Info
        </Button>
        
        <Button 
          onClick={handleContinue}
          disabled={imageOperationInProgress}
        >
          Continue to Additional Info
          <MoveRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ImageStep;