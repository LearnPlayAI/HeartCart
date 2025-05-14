import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { useDropzone } from 'react-dropzone';
import { Loader2, X, Upload, ImagePlus, Star, StarOff } from 'lucide-react';
import { ProductDraft } from '../ProductWizard';

// Validation schema for the image step
const imageSchema = z.object({
  imageUrls: z.array(z.string()),
  imageObjectKeys: z.array(z.string()),
  mainImageIndex: z.number().int().min(0),
});

type ImageFormValues = z.infer<typeof imageSchema>;

interface ProductImagesStepProps {
  draft: ProductDraft;
  onSave: (data: any) => void;
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
      mainImageIndex: draft.mainImageIndex || 0,
    },
  });

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
      
      toast({
        title: 'Images Uploaded',
        description: `Successfully uploaded ${data.data.imageUrls.length - (draft.imageUrls?.length || 0)} image(s)`,
      });
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
      
      toast({
        title: 'Image Deleted',
        description: 'Successfully deleted image',
      });
    },
    onError: (error) => {
      toast({
        title: 'Deletion Failed',
        description: `Failed to delete image: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
    onSave(data);
  };

  // Set an image as the main image
  const setMainImage = (index: number) => {
    form.setValue('mainImageIndex', index);
    // Trigger form save automatically when main image is changed
    form.handleSubmit(onSubmit)();
  };

  // Delete an image
  const handleDeleteImage = (index: number) => {
    deleteImageMutation.mutate(index);
  };

  const imageUrls = form.watch('imageUrls');
  const mainImageIndex = form.watch('mainImageIndex');

  return (
    <Card>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div 
                {...getRootProps()} 
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDraggingOver || isDragActive 
                    ? 'border-primary bg-primary/10' 
                    : 'border-gray-300 hover:border-primary hover:bg-gray-50'
                }`}
              >
                <input {...getInputProps()} />
                
                <div className="flex flex-col items-center justify-center space-y-4">
                  <Upload className="h-12 w-12 text-gray-400" />
                  <div className="space-y-2">
                    <p className="text-lg font-medium">Drag and drop images here</p>
                    <p className="text-sm text-gray-500">
                      or click to select files from your computer
                    </p>
                    <p className="text-xs text-gray-400">
                      Accepted file types: JPG, PNG, GIF, WEBP (max 5MB)
                    </p>
                  </div>
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={e => e.stopPropagation()}
                  >
                    <ImagePlus className="mr-2 h-4 w-4" />
                    Select Images
                  </Button>
                </div>
              </div>

              {/* Image Preview Grid */}
              {imageUrls && imageUrls.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-6">
                  {imageUrls.map((url, index) => (
                    <div 
                      key={index} 
                      className={`relative group rounded-lg overflow-hidden border ${
                        index === mainImageIndex ? 'border-primary ring-2 ring-primary' : 'border-gray-200'
                      }`}
                    >
                      <img 
                        src={url} 
                        alt={`Product image ${index + 1}`} 
                        className="w-full h-32 object-cover"
                      />
                      
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="flex flex-col items-center space-y-2">
                          {index === mainImageIndex ? (
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className="text-yellow-400 hover:text-yellow-300"
                              disabled
                            >
                              <Star className="h-5 w-5 fill-yellow-400" />
                            </Button>
                          ) : (
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className="text-white hover:text-yellow-400"
                              onClick={() => setMainImage(index)}
                            >
                              <StarOff className="h-5 w-5" />
                            </Button>
                          )}
                          
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="text-white hover:text-red-400"
                            onClick={() => handleDeleteImage(index)}
                            disabled={deleteImageMutation.isPending}
                          >
                            <X className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                      
                      {index === mainImageIndex && (
                        <div className="absolute top-2 left-2 bg-primary text-white px-2 py-1 rounded-md text-xs">
                          Main
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg">
                  <p>No images uploaded yet</p>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={isLoading || uploadingImages || deleteImageMutation.isPending}
              >
                {(isLoading || uploadingImages || deleteImageMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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