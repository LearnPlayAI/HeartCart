/**
 * Image Step Component for Product Wizard
 * 
 * This component handles the image upload, preview, and management
 * for the product creation process.
 */

import { useState } from 'react';
import { useProductWizardContext } from '../context';
import { ContextualHelp } from '../contextual-help';
import { 
  ArrowLeftCircle, 
  ArrowRightCircle, 
  X, 
  Upload, 
  Check, 
  GripVertical,
  Star,
  StarOff, 
  ImagePlus,
  Trash2,
  RotateCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { DropZone } from '@/components/ui/drop-zone';
import { 
  Card, 
  CardContent,
  CardFooter
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type FileUploadStatus = {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  previewUrl?: string;
  objectKey?: string;
};

export const ImageStep = () => {
  const { 
    state, 
    updateState, 
    goToPreviousStep, 
    goToNextStep,
    validateStep,
    errors,
    isSubmitting
  } = useProductWizardContext();
  
  const { toast } = useToast();
  const [uploadQueue, setUploadQueue] = useState<FileUploadStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // Handle drag and drop reordering
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    // Update the temporary image paths (for previews)
    const reorderedPaths = [...state.tempImagePaths];
    const [movedPath] = reorderedPaths.splice(sourceIndex, 1);
    reorderedPaths.splice(destinationIndex, 0, movedPath);
    
    // Update the image URLs (for saved images)
    const reorderedUrls = [...state.imageUrls];
    if (sourceIndex < reorderedUrls.length) {
      const [movedUrl] = reorderedUrls.splice(sourceIndex, 1);
      // If destination is beyond the current length, just append
      if (destinationIndex < reorderedUrls.length) {
        reorderedUrls.splice(destinationIndex, 0, movedUrl);
      } else {
        reorderedUrls.push(movedUrl);
      }
    }
    
    // Update the main image index if necessary
    let newMainIndex = state.mainImageIndex;
    if (sourceIndex === state.mainImageIndex) {
      // If we moved the main image, its new position is the destination index
      newMainIndex = destinationIndex;
    } else if (
      (sourceIndex < state.mainImageIndex && destinationIndex >= state.mainImageIndex) ||
      (sourceIndex > state.mainImageIndex && destinationIndex <= state.mainImageIndex)
    ) {
      // If we moved an image across the main image, adjust the main image index
      newMainIndex = sourceIndex < state.mainImageIndex ? state.mainImageIndex - 1 : state.mainImageIndex + 1;
    }
    
    updateState({ 
      tempImagePaths: reorderedPaths,
      imageUrls: reorderedUrls,
      mainImageIndex: newMainIndex 
    });
  };

  // Set an image as the main image
  const handleSetMainImage = (index: number) => {
    updateState({ mainImageIndex: index });
    toast({
      title: "Main Image Updated",
      description: "This image will be displayed as the primary product image.",
      variant: "default",
    });
  };

  // Remove an image
  const handleRemoveImage = (index: number) => {
    const newTempPaths = [...state.tempImagePaths];
    const newImageUrls = [...state.imageUrls];
    
    // Remove the image from the appropriate array
    if (index < newImageUrls.length) {
      newImageUrls.splice(index, 1);
    }
    if (index < newTempPaths.length) {
      newTempPaths.splice(index, 1);
    }
    
    // Adjust the main image index if needed
    let newMainIndex = state.mainImageIndex;
    if (index === state.mainImageIndex) {
      // If we're removing the main image, set the first available image as main
      newMainIndex = newTempPaths.length > 0 ? 0 : -1;
    } else if (index < state.mainImageIndex) {
      // If we're removing an image before the main image, decrement the main image index
      newMainIndex = state.mainImageIndex - 1;
    }
    
    updateState({ 
      tempImagePaths: newTempPaths, 
      imageUrls: newImageUrls,
      mainImageIndex: newMainIndex
    });
    
    toast({
      title: "Image Removed",
      description: "The image has been removed from this product.",
      variant: "default",
    });
  };

  // Handle file drops from the DropZone component
  const handleFilesDrop = async (files: File[]) => {
    // Check if we've reached the maximum number of images (10)
    const currentCount = state.tempImagePaths.length;
    if (currentCount + files.length > 10) {
      toast({
        title: "Too many images",
        description: `You can only upload up to 10 images. ${10 - currentCount} slots remaining.`,
        variant: "destructive",
      });
      
      // Take only as many files as we can still accommodate
      files = files.slice(0, 10 - currentCount);
      if (files.length === 0) return;
    }
    
    // Create preview URLs and add files to upload queue
    const newUploads = files.map(file => {
      const id = Math.random().toString(36).substring(2, 9);
      return {
        id,
        file,
        progress: 0,
        status: 'pending' as const,
        previewUrl: URL.createObjectURL(file)
      };
    });
    
    setUploadQueue(prev => [...prev, ...newUploads]);
    
    // Start upload process
    setIsUploading(true);
    
    // Simulate file uploads with a delay (in a real app, this would be an actual API call)
    for (const upload of newUploads) {
      // Add the preview to the state immediately
      updateState({
        tempImagePaths: [...state.tempImagePaths, upload.previewUrl!]
      });
      
      // Start simulated upload
      await simulateFileUpload(upload);
    }
    
    setIsUploading(false);
  };
  
  // Simulate file upload process
  const simulateFileUpload = async (upload: FileUploadStatus) => {
    // Update status to uploading
    setUploadQueue(prev => 
      prev.map(item => item.id === upload.id ? { ...item, status: 'uploading' } : item)
    );
    
    try {
      // In a real application, this would be an actual API call to upload the file
      // For the simulation, we'll just create a 3-second delay with progress updates
      for (let progress = 0; progress <= 100; progress += 10) {
        setUploadQueue(prev => 
          prev.map(item => 
            item.id === upload.id ? { ...item, progress } : item
          )
        );
        
        // Add a delay to simulate network latency
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      // After successful upload, update status
      setUploadQueue(prev => 
        prev.map(item => 
          item.id === upload.id ? { 
            ...item, 
            status: 'success',
            objectKey: `uploads/products/${Date.now()}-${upload.file.name}`,
            progress: 100 
          } : item
        )
      );
      
      // In a real app, we would add the real image URL from the server response
      updateState({
        imageUrls: [...state.imageUrls, upload.previewUrl!]
      });
      
      // If this is the first image, set it as the main image
      if (state.mainImageIndex === -1) {
        updateState({ mainImageIndex: 0 });
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      setUploadQueue(prev => 
        prev.map(item => 
          item.id === upload.id ? { 
            ...item, 
            status: 'error',
            error: 'Failed to upload file. Please try again.' 
          } : item
        )
      );
      
      // Remove the preview from the state
      updateState({
        tempImagePaths: state.tempImagePaths.filter(path => path !== upload.previewUrl)
      });
      
      toast({
        title: "Upload Failed",
        description: "There was a problem uploading your image. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Clear a completed or failed upload from the queue
  const handleClearUpload = (id: string) => {
    setUploadQueue(prev => prev.filter(item => item.id !== id));
  };
  
  // Handle form submission to go to next step
  const handleContinue = () => {
    if (validateStep('images')) {
      goToNextStep();
    }
  };

  // Get image sources from both temp paths and uploaded URLs
  const getImageSources = () => {
    return [...state.imageUrls, ...state.tempImagePaths.filter(
      // Only include temp paths that aren't already in imageUrls
      path => !state.imageUrls.includes(path)
    )];
  };

  const imageSources = getImageSources();
  
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Product Images</h2>
        <p className="text-muted-foreground">
          Upload high-quality images of your product. The first image or the one marked as primary will be featured prominently.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Image upload area */}
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-base font-medium">Upload Images</Label>
              <ContextualHelp fieldId="product-images" />
            </div>
            
            <DropZone 
              onFilesDrop={handleFilesDrop}
              accept="image/*"
              maxFiles={10 - imageSources.length}
              maxSize={5} // 5MB
              disabled={isUploading || isSubmitting || imageSources.length >= 10}
              className="h-64 flex flex-col items-center justify-center"
            >
              <div className="flex flex-col items-center gap-2 p-4 text-center">
                <Upload className="h-10 w-10 text-muted-foreground" />
                <h3 className="font-medium">Drag & drop product images here</h3>
                <p className="text-sm text-muted-foreground">
                  {imageSources.length < 10 
                    ? `Upload up to ${10 - imageSources.length} more images (max 5MB each)` 
                    : "Maximum number of images reached"}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  disabled={isUploading || isSubmitting || imageSources.length >= 10}
                >
                  <ImagePlus className="mr-2 h-4 w-4" />
                  Browse files
                </Button>
              </div>
            </DropZone>
            
            {errors.imageUrls && (
              <p className="text-sm text-red-500 mt-2">{errors.imageUrls}</p>
            )}
            
            {/* Upload Queue */}
            {uploadQueue.length > 0 && (
              <div className="mt-4 space-y-3">
                <h3 className="font-medium">Upload Progress</h3>
                <div className="space-y-2">
                  {uploadQueue.map((item) => (
                    <div key={item.id} className="bg-muted p-3 rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <div className="text-sm font-medium truncate max-w-[180px]">
                          {item.file.name}
                        </div>
                        {item.status === 'error' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleClearUpload(item.id)}
                            className="h-6 w-6 p-0 text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        {item.status === 'success' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleClearUpload(item.id)}
                            className="h-6 w-6 p-0 text-primary"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <Progress 
                        value={item.progress} 
                        className={cn(
                          item.status === 'error' && "text-red-500", 
                          item.status === 'success' && "text-green-500"
                        )}
                      />
                      {item.status === 'error' && (
                        <p className="text-xs text-red-500 mt-1">{item.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Image gallery and ordering */}
        <div className="lg:col-span-3">
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Product Gallery</Label>
              <p className="text-sm text-muted-foreground">
                {imageSources.length} / 10 images
              </p>
            </div>
            
            {imageSources.length === 0 ? (
              <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                <p className="text-muted-foreground">
                  No images added yet. Upload at least one image for your product.
                </p>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="product-images" direction="horizontal">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="grid grid-cols-2 sm:grid-cols-3 gap-3"
                    >
                      {imageSources.map((src, index) => (
                        <Draggable key={src} draggableId={src} index={index}>
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={cn(
                                "overflow-hidden border",
                                snapshot.isDragging && "shadow-lg",
                                index === state.mainImageIndex && "ring-2 ring-primary"
                              )}
                            >
                              <div className="aspect-square relative">
                                <img
                                  src={src}
                                  alt={`Product image ${index + 1}`}
                                  className="object-cover w-full h-full"
                                />
                                {index === state.mainImageIndex && (
                                  <div className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded-md">
                                    Main
                                  </div>
                                )}
                                <div
                                  {...provided.dragHandleProps}
                                  className="absolute top-2 right-2 p-1 bg-background/80 rounded-md cursor-grab"
                                >
                                  <GripVertical className="h-4 w-4" />
                                </div>
                              </div>
                              <CardFooter className="p-2 gap-1 flex justify-between">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleSetMainImage(index)}
                                      disabled={index === state.mainImageIndex}
                                      className="h-8 w-8"
                                    >
                                      {index === state.mainImageIndex ? (
                                        <Star className="h-4 w-4 text-amber-500" />
                                      ) : (
                                        <StarOff className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Set as main image</p>
                                  </TooltipContent>
                                </Tooltip>
                                
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleRemoveImage(index)}
                                      className="h-8 w-8 text-red-500"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Remove image</p>
                                  </TooltipContent>
                                </Tooltip>
                              </CardFooter>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
            
            <p className="text-sm text-muted-foreground mt-2">
              Drag and drop to reorder images. Click the star icon to set the main product image.
            </p>
          </div>
        </div>
      </div>
      
      <Separator />
      
      {/* Navigation buttons */}
      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={goToPreviousStep}
          className="flex items-center gap-2"
        >
          <ArrowLeftCircle className="h-4 w-4" />
          <span>Back to Basics</span>
        </Button>
        
        <Button
          type="button"
          onClick={handleContinue}
          className="flex items-center gap-2"
          disabled={imageSources.length === 0}
        >
          <span>Continue to Details</span>
          <ArrowRightCircle className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ImageStep;