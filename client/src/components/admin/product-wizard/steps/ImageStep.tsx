/**
 * Product Images Step
 * 
 * This component implements Step 2 of the product wizard,
 * allowing users to upload, manage, and organize product images.
 * It leverages the enhanced file handling utilities for image uploads.
 */

import React, { useState, useCallback } from 'react';
import { useProductWizard } from '../context';
import { WizardActionType, UploadedImage } from '../types';
import { Loader2, Upload, X, Trash2, ArrowDownUp, Star, Info, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { sanitizeFilename, hasAllowedExtension } from '@/utils/file-utils';

// UI components
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ContextualHelp, ExtendedHelpCard } from '../contextual-help';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

// Import drag and drop utilities from hello-pangea/dnd
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

// Configuration for image uploads
const MAX_FILE_SIZE_MB = 5;
const ALLOWED_IMAGE_TYPES = ['.jpg', '.jpeg', '.png', '.webp'];

interface ImageStepProps {
  className?: string;
}

export const ImageStep: React.FC<ImageStepProps> = ({ className }) => {
  const { state, dispatch } = useProductWizard();
  const { productData, catalogId } = state;
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  
  // Handle image uploads
  const handleFileChange = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    // Convert FileList to array for easier processing
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];
    
    // Validate each file
    for (const file of fileArray) {
      // Check file size
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        invalidFiles.push(`${file.name} (exceeds ${MAX_FILE_SIZE_MB}MB)`);
        continue;
      }
      
      // Sanitize and check file extension
      const sanitizedName = sanitizeFilename(file.name);
      if (!hasAllowedExtension(sanitizedName, ALLOWED_IMAGE_TYPES)) {
        invalidFiles.push(`${file.name} (invalid file type)`);
        continue;
      }
      
      validFiles.push(file);
    }
    
    // Show error if there are invalid files
    if (invalidFiles.length > 0) {
      toast({
        title: "Some files were not uploaded",
        description: (
          <div className="mt-2">
            <p>The following files could not be uploaded:</p>
            <ul className="list-disc pl-4 mt-1">
              {invalidFiles.map((filename, i) => (
                <li key={i} className="text-sm">{filename}</li>
              ))}
            </ul>
          </div>
        ),
        variant: "destructive",
      });
    }
    
    // Process valid files
    if (validFiles.length > 0) {
      // Create a FormData object for the uploads
      const formData = new FormData();
      
      // Add catalog ID if available
      if (catalogId) {
        formData.append('catalogId', catalogId.toString());
      }
      
      // Add all valid files
      validFiles.forEach(file => {
        formData.append('files', file);
      });
      
      // Upload the files
      try {
        const uploadStartTime = Date.now();
        const response = await fetch('/api/product-images/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error?.message || 'Upload failed');
        }
        
        // Calculate approximate upload speed for user feedback
        const uploadEndTime = Date.now();
        const uploadDuration = (uploadEndTime - uploadStartTime) / 1000; // in seconds
        const totalSizeMB = validFiles.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024);
        const speedMBps = totalSizeMB / uploadDuration;
        
        // Process the uploaded files
        const uploadedImages = result.data.map((image: any, index: number) => {
          return {
            url: image.url,
            objectKey: image.objectKey,
            isMain: productData.uploadedImages.length === 0 && index === 0, // First image is main if no images exist
            order: productData.uploadedImages.length + index,
            metadata: {
              size: validFiles[index]?.size,
              alt: validFiles[index]?.name.split('.')[0] // Use filename as alt text initially
            }
          } as UploadedImage;
        });
        
        // Add the uploaded images to the wizard state
        uploadedImages.forEach(image => {
          dispatch({
            type: WizardActionType.ADD_UPLOADED_IMAGE,
            payload: image
          });
        });
        
        // Display success message with upload statistics
        toast({
          title: `${uploadedImages.length} ${uploadedImages.length === 1 ? 'image' : 'images'} uploaded`,
          description: `Upload speed: ${speedMBps.toFixed(2)} MB/s`,
          variant: "default",
        });
      } catch (error) {
        console.error('Upload error:', error);
        toast({
          title: "Upload failed",
          description: error instanceof Error ? error.message : "An unexpected error occurred",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
        setUploadProgress(100);
        
        // Reset progress after a delay for UI smoothness
        setTimeout(() => setUploadProgress(0), 500);
      }
    } else {
      setIsUploading(false);
    }
  }, [dispatch, toast, productData.uploadedImages, catalogId]);
  
  // Handle drag-and-drop events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files);
    }
  }, [handleFileChange]);
  
  // Set an image as the main product image
  const setAsMainImage = useCallback((index: number) => {
    dispatch({
      type: WizardActionType.SET_MAIN_IMAGE,
      payload: index
    });
  }, [dispatch]);
  
  // Remove an image
  const removeImage = useCallback((index: number) => {
    dispatch({
      type: WizardActionType.REMOVE_UPLOADED_IMAGE,
      payload: index
    });
  }, [dispatch]);
  
  // Handle image reordering via drag and drop
  const handleDragEnd = useCallback((result: any) => {
    if (!result.destination) return;
    
    dispatch({
      type: WizardActionType.REORDER_IMAGES,
      payload: {
        sourceIndex: result.source.index,
        destinationIndex: result.destination.index
      }
    });
  }, [dispatch]);
  
  // Update image alt text
  const updateImageAlt = useCallback((index: number, alt: string) => {
    const updatedImage = { 
      ...productData.uploadedImages[index],
      metadata: {
        ...productData.uploadedImages[index].metadata,
        alt
      }
    };
    
    // Remove and add the image to update it
    dispatch({
      type: WizardActionType.REMOVE_UPLOADED_IMAGE,
      payload: index
    });
    
    dispatch({
      type: WizardActionType.ADD_UPLOADED_IMAGE,
      payload: {
        ...updatedImage,
        order: index // Preserve the original order
      }
    });
    
    // Reapply main image status if needed
    if (updatedImage.isMain) {
      dispatch({
        type: WizardActionType.SET_MAIN_IMAGE,
        payload: index
      });
    }
  }, [dispatch, productData.uploadedImages]);
  
  // Helper to determine if we have a main image
  const hasMainImage = productData.uploadedImages.some(img => img.isMain);
  
  return (
    <div className={className}>
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Product Images</h2>
        <p className="text-muted-foreground">
          Upload and manage your product images. You can upload multiple images and set one as the main image.
        </p>
      </div>
      
      {/* Image Upload Area */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Upload Product Images</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Drag and drop area */}
          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-border'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center gap-2">
              <Upload size={40} className="text-muted-foreground" />
              
              <div className="mt-2 mb-4">
                <h3 className="text-lg font-medium">Drag and drop your images here</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Supported formats: {ALLOWED_IMAGE_TYPES.join(', ')} (Max: {MAX_FILE_SIZE_MB}MB per image)
                </p>
              </div>
              
              <span className="text-muted-foreground mb-2">- or -</span>
              
              <Input
                type="file"
                accept={ALLOWED_IMAGE_TYPES.join(',')}
                onChange={(e) => handleFileChange(e.target.files)}
                multiple
                className="max-w-sm"
                disabled={isUploading}
                id="image-upload"
              />
              
              <label htmlFor="image-upload">
                <Button 
                  type="button" 
                  className="mt-2"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading... {uploadProgress > 0 && `${uploadProgress}%`}
                    </>
                  ) : (
                    'Select Files'
                  )}
                </Button>
              </label>
            </div>
          </div>
          
          <ExtendedHelpCard title="Image Best Practices" className="mt-4">
            <ul className="list-disc pl-4 space-y-1">
              <li>Upload high-quality images with a clean background for the best presentation</li>
              <li>Include multiple angles to showcase your product thoroughly</li>
              <li>Maintain a consistent aspect ratio for all product images (recommended: 1:1 square)</li>
              <li>The first image you upload will be set as the main product image by default</li>
            </ul>
          </ExtendedHelpCard>
        </CardContent>
      </Card>
      
      {/* Image Gallery */}
      <Card>
        <CardHeader>
          <CardTitle>Product Image Gallery</CardTitle>
        </CardHeader>
        <CardContent>
          {productData.uploadedImages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Info size={36} className="mx-auto mb-2" />
              <p>No images have been uploaded yet. Images are required to create a product.</p>
            </div>
          ) : (
            <>
              {!hasMainImage && (
                <Alert variant="warning" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>No main image selected</AlertTitle>
                  <AlertDescription>
                    Please select a main image for your product. This will be the primary image shown to customers.
                  </AlertDescription>
                </Alert>
              )}
              
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="image-gallery" direction="horizontal">
                  {(provided) => (
                    <div 
                      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                    >
                      {productData.uploadedImages
                        .sort((a, b) => a.order - b.order)
                        .map((image, index) => (
                          <Draggable key={image.url} draggableId={image.url} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`relative rounded-lg border overflow-hidden group ${
                                  image.isMain ? 'ring-2 ring-primary' : ''
                                }`}
                              >
                                {/* Badge for main image */}
                                {image.isMain && (
                                  <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-semibold py-1 px-2 rounded-full flex items-center">
                                    <Star className="h-3 w-3 mr-1" />
                                    Main
                                  </div>
                                )}
                                
                                {/* Image */}
                                <div className="aspect-square relative overflow-hidden">
                                  <img 
                                    src={image.url} 
                                    alt={image.metadata?.alt || 'Product image'} 
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                
                                {/* Image actions overlay */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  {!image.isMain && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => setAsMainImage(index)}
                                          >
                                            <Star className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Set as main image</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                  
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          onClick={() => removeImage(index)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Remove image</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="cursor-grab"
                                        >
                                          <ArrowDownUp className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Drag to reorder</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                                
                                {/* Image metadata form */}
                                <div className="p-2 bg-card">
                                  <Input
                                    placeholder="Image description (alt text)"
                                    value={image.metadata?.alt || ''}
                                    onChange={(e) => updateImageAlt(index, e.target.value)}
                                    className="text-xs"
                                  />
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};