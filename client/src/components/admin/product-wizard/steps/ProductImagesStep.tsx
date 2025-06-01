import React, { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useDropzone } from 'react-dropzone';
import { Loader2, X, Upload, ImagePlus, Star, StarOff, MoveVertical, AlertCircle, ExternalLink, Download } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { ensureValidImageUrl } from '@/utils/file-manager';
import { ProductDraft } from '../ProductWizard';
import { AIImageDownloader } from '../components/AIImageDownloader';

// Validation schema for the image step
const imageSchema = z.object({
  imageUrls: z.array(z.string()),
  imageObjectKeys: z.array(z.string()),
  mainImageIndex: z.number().int().min(0).optional().default(0),
  supplierUrl: z.string().optional(),
});

type ImageFormValues = z.infer<typeof imageSchema>;

interface ProductImagesStepProps {
  draft: ProductDraft;
  onSave: (data: any, autoAdvance?: boolean) => void;
  isLoading: boolean;
}

export const ProductImagesStep: React.FC<ProductImagesStepProps> = ({ draft, onSave, isLoading }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadingImages, setUploadingImages] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  
  // Initialize form with draft values
  const form = useForm<ImageFormValues>({
    resolver: zodResolver(imageSchema),
    defaultValues: {
      imageUrls: draft.imageUrls || [],
      imageObjectKeys: draft.imageObjectKeys || [],
      mainImageIndex: draft.mainImageIndex ?? 0,
      supplierUrl: draft.supplierUrl || '',
    },
  });

  // Reset form when draft data is fully loaded (similar to BasicInfoStep pattern)
  useEffect(() => {
    if (draft && draft.id) {
      form.reset({
        imageUrls: draft.imageUrls || [],
        imageObjectKeys: draft.imageObjectKeys || [],
        mainImageIndex: draft.mainImageIndex ?? 0,
        supplierUrl: draft.supplierUrl || '',
      });
    }
  }, [draft, form]);

  // Mutation to upload images
  const uploadImagesMutation = useMutation({
    mutationFn: async (files: File[]) => {
      if (!draft.id) {
        throw new Error('No draft ID available');
      }
      
      setUploadingImages(true);
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('images', file);
      });
      
      const response = await apiRequest(
        'POST',
        `/api/product-drafts/${draft.id}/images`,
        formData,
        { isFormData: true }
      );
      return response.json();
    },
    onSuccess: (data) => {
      setUploadingImages(false);
      // Update the form values with the new images
      form.setValue('imageUrls', data.data.imageUrls);
      form.setValue('imageObjectKeys', data.data.imageObjectKeys);
      
      // If this is the first image, set it as the main image
      if (data.data.imageUrls.length === 1) {
        form.setValue('mainImageIndex', 0);
      }
      
      // Invalidate the draft query to refresh the draft data
      queryClient.invalidateQueries({ queryKey: ['/api/product-drafts', draft.id] });
      
      
    },
    onError: (error) => {
      setUploadingImages(false);
      toast({
        title: 'Upload Failed',
        description: `Failed to upload images: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  // Mutation to delete an image
  const deleteImageMutation = useMutation({
    mutationFn: async (imageIndex: number) => {
      if (!draft.id) {
        throw new Error('No draft ID available');
      }
      
      const response = await apiRequest(
        'DELETE',
        `/api/product-drafts/${draft.id}/images/${imageIndex}`
      );
      return response.json();
    },
    onSuccess: (data) => {
      // Update the form values with the remaining images
      form.setValue('imageUrls', data.data.imageUrls);
      form.setValue('imageObjectKeys', data.data.imageObjectKeys);
      
      // If we deleted the main image or any image before it, adjust the main image index
      if (data.data.mainImageIndex !== form.getValues('mainImageIndex')) {
        form.setValue('mainImageIndex', data.data.mainImageIndex);
      }
      
      // Invalidate the draft query to refresh the draft data
      queryClient.invalidateQueries({ queryKey: ['/api/product-drafts', draft.id] });
      
      
    },
    onError: (error) => {
      toast({
        title: 'Deletion Failed',
        description: `Failed to delete image: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  // Mutation to reorder images
  const reorderImagesMutation = useMutation({
    mutationFn: async (imageIndexes: number[]) => {
      if (!draft.id) {
        throw new Error('No draft ID available');
      }
      
      const response = await apiRequest(
        'POST',
        `/api/product-drafts/${draft.id}/images/reorder`,
        { imageIndexes }
      );
      return response.json();
    },
    onSuccess: (data) => {
      // Update the form values with the reordered images
      form.setValue('imageUrls', data.data.imageUrls);
      form.setValue('imageObjectKeys', data.data.imageObjectKeys);
      form.setValue('mainImageIndex', data.data.mainImageIndex);
      
      // Invalidate the draft query to refresh the draft data
      queryClient.invalidateQueries({ queryKey: ['/api/product-drafts', draft.id] });
      
      
    },
    onError: (error) => {
      toast({
        title: 'Reordering Failed',
        description: `Failed to reorder images: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  // Dropzone setup
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      
      // Validate file types and sizes
      const validFiles = acceptedFiles.filter(file => {
        if (!file.type.startsWith('image/')) {
          toast({
            title: 'Invalid File Type',
            description: `${file.name} is not an image file`,
            variant: 'destructive',
          });
          return false;
        }
        
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
          toast({
            title: 'File Too Large',
            description: `${file.name} exceeds the 5MB size limit`,
            variant: 'destructive',
          });
          return false;
        }
        
        return true;
      });
      
      if (validFiles.length > 0) {
        uploadImagesMutation.mutate(validFiles);
      }
    },
    [uploadImagesMutation, toast]
  );
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    onDragEnter: () => setIsDraggingOver(true),
    onDragLeave: () => setIsDraggingOver(false),
    onDropAccepted: () => setIsDraggingOver(false),
    onDropRejected: () => setIsDraggingOver(false),
  });

  // Handle form submission
  const onSubmit = (data: ImageFormValues) => {
    onSave(data, true);
  };

  // Set an image as the main image
  const setMainImage = (index: number) => {
    form.setValue('mainImageIndex', index);
    // Save the change without auto-advancing to next step
    const formData = form.getValues();
    onSave(formData, false);
  };

  // Delete an image
  const handleDeleteImage = (index: number) => {
    deleteImageMutation.mutate(index);
  };

  // Handle drag and drop reordering
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const { source, destination } = result;
    const imageUrls = form.getValues('imageUrls');
    
    if (source.index === destination.index) return;
    
    // Create an array of indexes in their new order
    const imageIndexes = Array.from({ length: imageUrls.length }, (_, i) => i);
    const [removed] = imageIndexes.splice(source.index, 1);
    imageIndexes.splice(destination.index, 0, removed);
    
    // Send the new order to the server
    reorderImagesMutation.mutate(imageIndexes);
  };

  // Handle AI images downloaded from the new component
  const handleImagesDownloaded = (downloadedImages: any[]) => {
    // Update the form with the new images
    const currentImageUrls = form.getValues('imageUrls');
    const currentObjectKeys = form.getValues('imageObjectKeys');
    
    const newImageUrls = [...currentImageUrls, ...downloadedImages.map((img: any) => img.url)];
    const newObjectKeys = [...currentObjectKeys, ...downloadedImages.map((img: any) => img.objectKey || '')];
    
    form.setValue('imageUrls', newImageUrls);
    form.setValue('imageObjectKeys', newObjectKeys);
    
    // Set first image as main if no main image exists
    if (currentImageUrls.length === 0) {
      form.setValue('mainImageIndex', 0);
    }

    // Auto-save the changes
    const formData = form.getValues();
    onSave(formData, false);
    
    // Invalidate queries to refresh the data
    queryClient.invalidateQueries({ queryKey: [`/api/product-drafts/${draft.id}`] });
  };

  const imageUrls = form.watch('imageUrls');
  const mainImageIndex = form.watch('mainImageIndex');

  return (
    <Card>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              {/* AI Image Downloader Component with Preview Modal */}
              <AIImageDownloader
                onImagesDownloaded={handleImagesDownloaded}
                productId={draft.id}
                className="mt-4"
              />

              {/* Manual Supplier URL Input */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <FormField
                  control={form.control}
                  name="supplierUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">
                        Supplier URL (Optional)
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            placeholder="https://supplier-website.com/product-page"
                            className={field.value ? "pr-10" : ""}
                          />
                          {field.value && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(field.value, '_blank')}
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100"
                            >
                              <ExternalLink className="h-4 w-4 text-gray-500" />
                            </Button>
                          )}
                        </div>
                      </FormControl>
                      <p className="text-xs text-gray-500">
                        Add or edit the supplier's product page URL for easy reference when sourcing images
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div 
                {...getRootProps()} 
                className={`border-2 border-dashed rounded-lg p-4 sm:p-8 text-center transition-colors ${
                  isDraggingOver || isDragActive 
                    ? 'border-primary bg-primary/10' 
                    : 'border-gray-300 hover:border-primary hover:bg-gray-50'
                }`}
              >
                <input {...getInputProps()} />
                
                <div className="flex flex-col items-center justify-center space-y-3 sm:space-y-4">
                  <Upload className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400" />
                  <div className="space-y-1 sm:space-y-2">
                    <p className="text-base sm:text-lg font-medium">Drag and drop images here</p>
                    <p className="text-xs sm:text-sm text-gray-500">
                      or tap to select files
                    </p>
                    <p className="text-xs text-gray-400 hidden sm:block">
                      Accepted file types: JPG, PNG, GIF, WEBP (max 5MB)
                    </p>
                  </div>
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={(e) => {
                      e.stopPropagation();
                      // Trigger the file input click
                      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
                      if (fileInput) {
                        fileInput.click();
                      }
                    }}
                    className="h-8 px-3 sm:h-10 sm:px-4 text-xs sm:text-sm"
                  >
                    <ImagePlus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    Select Images
                  </Button>
                </div>
              </div>

              {/* Image Preview Grid with Drag and Drop - Mobile Optimized */}
              {imageUrls && imageUrls.length > 0 ? (
                <>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-1">
                    <MoveVertical className="h-4 w-4" />
                    <span>Drag images to reorder them. The first image will be used as the main product image.</span>
                  </div>
                  
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="product-images" direction="horizontal" type="image">
                      {(provided) => (
                        <div 
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4 mt-4 sm:mt-1"
                        >
                          {imageUrls.map((url, index) => (
                            <Draggable key={index.toString()} draggableId={index.toString()} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`relative group rounded-lg overflow-hidden border ${
                                    snapshot.isDragging ? 'border-primary ring-1 ring-primary shadow-md' : 
                                    index === mainImageIndex ? 'border-primary ring-2 ring-primary' : 'border-gray-200'
                                  }`}
                                  style={{
                                    ...provided.draggableProps.style,
                                    height: snapshot.isDragging ? 'auto' : undefined
                                  }}
                                >
                                  <img 
                                    src={ensureValidImageUrl(url)} 
                                    alt={`Product image ${index + 1}`} 
                                    className="w-full h-24 sm:h-32 object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNFRUVFRUUiLz48cGF0aCBkPSJNNzQgODZINjJWMTE0SDc0VjEzMEgxMjZWMTE0SDEzOFY4NkgxMjZWNzBINzRWODZaTTc0IDg2SDEyNlYxMTRINzRWODZaIiBmaWxsPSIjQUFBQUFBIi8+PC9zdmc+';
                                    }}
                                  />
                                  
                                  {/* Overlay controls - visible on hover/touch */}
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <div className="flex flex-row sm:flex-col items-center space-x-2 sm:space-x-0 sm:space-y-2">
                                      {index === mainImageIndex ? (
                                        <Button 
                                          type="button" 
                                          variant="ghost" 
                                          size="sm" 
                                          className="text-yellow-400 hover:text-yellow-300 h-8 w-8 p-1 sm:h-9 sm:w-9 sm:p-2"
                                          disabled
                                        >
                                          <Star className="h-5 w-5 fill-yellow-400" />
                                        </Button>
                                      ) : (
                                        <Button 
                                          type="button" 
                                          variant="ghost" 
                                          size="sm" 
                                          className="text-white hover:text-yellow-400 h-8 w-8 p-1 sm:h-9 sm:w-9 sm:p-2"
                                          onClick={() => setMainImage(index)}
                                        >
                                          <StarOff className="h-5 w-5" />
                                        </Button>
                                      )}
                                      
                                      <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="sm" 
                                        className="text-white hover:text-red-400 h-8 w-8 p-1 sm:h-9 sm:w-9 sm:p-2"
                                        onClick={() => handleDeleteImage(index)}
                                        disabled={deleteImageMutation.isPending}
                                      >
                                        <X className="h-5 w-5" />
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  {/* Always visible badge for main image */}
                                  {index === mainImageIndex && (
                                    <div className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-primary text-white px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md text-[10px] sm:text-xs">
                                      Main
                                    </div>
                                  )}
                                  
                                  {/* Order number badge */}
                                  <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 bg-black/70 text-white px-1.5 py-0.5 rounded-md text-[10px]">
                                    {index + 1}
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
                  
                  {/* Validation warnings */}
                  {imageUrls.length === 0 && (
                    <div className="flex items-center space-x-2 text-amber-600 text-sm mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <span>Your product should have at least one image</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-6 sm:py-10 text-gray-500 bg-gray-50 rounded-lg text-sm">
                  <p>No images uploaded yet</p>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-4 sm:mt-6">
              <Button 
                type="submit" 
                disabled={isLoading || uploadingImages || deleteImageMutation.isPending || reorderImagesMutation.isPending}
                className="h-9 w-full sm:w-auto sm:h-10 text-sm sm:text-base"
              >
                {(isLoading || uploadingImages || deleteImageMutation.isPending || reorderImagesMutation.isPending) && (
                  <Loader2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                )}
                Save & Continue
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default ProductImagesStep;