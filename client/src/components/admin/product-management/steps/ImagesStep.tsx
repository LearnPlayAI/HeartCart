/**
 * Images Step
 * 
 * This component handles the product image management,
 * including uploading, reordering, and selecting a main image.
 */

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Image,
  Upload,
  X,
  ArrowUp,
  Star,
  Loader2,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDraftContext } from '../DraftContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Component props
interface ImagesStepProps {
  onNext: () => void;
}

export function ImagesStep({ onNext }: ImagesStepProps) {
  const { toast } = useToast();
  const { draft, updateDraft, saveDraft, loading } = useDraftContext();
  const queryClient = useQueryClient();
  const [images, setImages] = useState<string[]>([]);
  const [mainImageIndex, setMainImageIndex] = useState<number | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Initialize component state from draft
  useEffect(() => {
    if (draft) {
      setImages(draft.imageUrls || []);
      setMainImageIndex(draft.mainImageIndex !== undefined ? draft.mainImageIndex : null);
    }
  }, [draft]);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      if (!draft?.id) throw new Error('No draft ID found');
      
      formData.append('draftId', draft.id.toString());
      files.forEach(file => {
        formData.append('images', file);
      });
      
      return apiRequest('/api/product-drafts/images/upload', {
        method: 'POST',
        body: formData,
      });
    },
    onSuccess: (data) => {
      if (data.success) {
        const newImageUrls = [...images, ...data.data.imageUrls];
        setImages(newImageUrls);
        
        updateDraft({
          imageUrls: newImageUrls,
          mainImageIndex: mainImageIndex === null && newImageUrls.length > 0 ? 0 : mainImageIndex,
        });
        
        saveDraft();
        
        // Update main image if this is the first upload
        if (mainImageIndex === null && newImageUrls.length > 0) {
          setMainImageIndex(0);
        }
        
        setUploadingFiles([]);
        setUploadProgress({});
        
        toast({
          title: 'Upload Complete',
          description: `Successfully uploaded ${data.data.imageUrls.length} image(s)`,
        });
      }
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: 'There was a problem uploading your images. Please try again.',
        variant: 'destructive',
      });
      setUploadingFiles([]);
      setUploadProgress({});
    },
  });
  
  // Delete image mutation
  const deleteImageMutation = useMutation({
    mutationFn: async (index: number) => {
      if (!draft?.id) throw new Error('No draft ID found');
      
      return apiRequest(`/api/product-drafts/${draft.id}/images/${index}`, {
        method: 'DELETE',
      });
    },
    onSuccess: (_, index) => {
      const newImages = [...images];
      newImages.splice(index, 1);
      setImages(newImages);
      
      // Update main image if needed
      if (mainImageIndex === index) {
        // If deleted main image, set the first image as main or null if no images
        const newMainIndex = newImages.length > 0 ? 0 : null;
        setMainImageIndex(newMainIndex);
        updateDraft({
          imageUrls: newImages,
          mainImageIndex: newMainIndex,
        });
      } else if (mainImageIndex !== null && mainImageIndex > index) {
        // Adjust main image index if it comes after the deleted image
        const newMainIndex = mainImageIndex - 1;
        setMainImageIndex(newMainIndex);
        updateDraft({
          imageUrls: newImages,
          mainImageIndex: newMainIndex,
        });
      } else {
        // No change to main image index needed
        updateDraft({
          imageUrls: newImages,
        });
      }
      
      saveDraft();
      
      toast({
        title: 'Image Removed',
        description: 'The image has been removed from the product.',
      });
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast({
        title: 'Removal Failed',
        description: 'There was a problem removing the image. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  // Reorder images mutation
  const reorderImageMutation = useMutation({
    mutationFn: async ({ index, direction }: { index: number; direction: 'up' | 'down' }) => {
      if (!draft?.id) throw new Error('No draft ID found');
      
      return apiRequest(`/api/product-drafts/${draft.id}/images/reorder`, {
        method: 'POST',
        body: JSON.stringify({
          fromIndex: index,
          toIndex: direction === 'up' ? index - 1 : index + 1,
        }),
      });
    },
    onSuccess: (_, { index, direction }) => {
      const newImages = [...images];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      
      // Swap images
      [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
      setImages(newImages);
      
      // Update main image index if needed
      let newMainIndex = mainImageIndex;
      if (mainImageIndex === index) {
        newMainIndex = newIndex;
      } else if (mainImageIndex === newIndex) {
        newMainIndex = index;
      }
      
      setMainImageIndex(newMainIndex);
      updateDraft({
        imageUrls: newImages,
        mainImageIndex: newMainIndex,
      });
      
      saveDraft();
    },
    onError: (error) => {
      console.error('Reorder error:', error);
      toast({
        title: 'Reorder Failed',
        description: 'There was a problem reordering the images. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  // Set main image mutation
  const setMainImageMutation = useMutation({
    mutationFn: async (index: number) => {
      if (!draft?.id) throw new Error('No draft ID found');
      
      return apiRequest(`/api/product-drafts/${draft.id}/images/main`, {
        method: 'POST',
        body: JSON.stringify({
          mainImageIndex: index,
        }),
      });
    },
    onSuccess: (_, index) => {
      setMainImageIndex(index);
      updateDraft({
        mainImageIndex: index,
      });
      
      saveDraft();
      
      toast({
        title: 'Main Image Set',
        description: 'The main product image has been updated.',
      });
    },
    onError: (error) => {
      console.error('Set main image error:', error);
      toast({
        title: 'Update Failed',
        description: 'There was a problem setting the main image. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  // Handle file drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Filter for only image files
    const imageFiles = acceptedFiles.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      toast({
        title: 'Invalid Files',
        description: 'Please upload only image files (JPEG, PNG, etc.).',
        variant: 'destructive',
      });
      return;
    }
    
    setUploadingFiles(imageFiles);
    setIsProcessing(true);
    
    // Initialize progress for each file
    const initialProgress: { [key: string]: number } = {};
    imageFiles.forEach(file => {
      initialProgress[file.name] = 0;
    });
    setUploadProgress(initialProgress);
    
    // Start upload
    uploadMutation.mutate(imageFiles);
  }, [uploadMutation, toast, images]);
  
  // Configure dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
    },
    disabled: loading || uploadMutation.isPending,
  });
  
  // Handle delete image
  const handleDeleteImage = (index: number) => {
    if (window.confirm('Are you sure you want to remove this image?')) {
      deleteImageMutation.mutate(index);
    }
  };
  
  // Handle reorder image
  const handleReorderImage = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index > 0) || 
      (direction === 'down' && index < images.length - 1)
    ) {
      reorderImageMutation.mutate({ index, direction });
    }
  };
  
  // Handle set main image
  const handleSetMainImage = (index: number) => {
    if (mainImageIndex !== index) {
      setMainImageMutation.mutate(index);
    }
  };
  
  // Handle continue to next step
  const handleContinue = async () => {
    if (images.length === 0) {
      if (window.confirm('Are you sure you want to continue without adding any product images?')) {
        onNext();
      }
    } else {
      onNext();
    }
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Product Images</h2>
        <p className="text-muted-foreground">
          Upload and manage product images. The first image or starred image will be the main product image.
        </p>
      </div>
      
      <Separator className="my-6" />
      
      <Card>
        <CardContent className="pt-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-md p-10 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-3">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="font-medium">Drag & drop images here, or click to browse</span>
                <span className="text-sm text-muted-foreground">
                  Supports: JPEG, PNG, WebP (max 5MB each)
                </span>
              </div>
            </div>
          </div>
          
          {/* Upload progress */}
          {uploadingFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="font-medium">Uploading {uploadingFiles.length} file(s)...</h3>
              {uploadingFiles.map((file, index) => (
                <div key={`${file.name}-${index}`} className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm truncate flex-1">{file.name}</span>
                  <span className="text-sm">{uploadProgress[file.name] || 0}%</span>
                </div>
              ))}
            </div>
          )}
          
          {/* Image gallery */}
          {images.length > 0 && (
            <div className="mt-6">
              <h3 className="font-medium mb-3">Product Images</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {images.map((imageUrl, index) => (
                  <div 
                    key={index} 
                    className={`relative group border rounded-md overflow-hidden ${
                      mainImageIndex === index ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    <div className="relative aspect-square">
                      <img 
                        src={imageUrl} 
                        alt={`Product ${index + 1}`} 
                        className="object-cover w-full h-full"
                      />
                      
                      {/* Image is main indicator */}
                      {mainImageIndex === index && (
                        <div className="absolute top-2 left-2 bg-primary text-primary-foreground rounded-full p-1">
                          <Star className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    
                    {/* Image actions */}
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="secondary"
                                size="icon"
                                onClick={() => handleSetMainImage(index)}
                                disabled={mainImageIndex === index}
                              >
                                <Star className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Set as main image</p>
                            </TooltipContent>
                          </Tooltip>
                          
                          {index > 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="secondary"
                                  size="icon"
                                  onClick={() => handleReorderImage(index, 'up')}
                                >
                                  <ArrowUp className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Move up</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => handleDeleteImage(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Remove image</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {images.length === 0 && !uploadingFiles.length && (
            <div className="mt-6 flex flex-col items-center text-center p-6 border border-dashed rounded-md">
              <Image className="h-10 w-10 text-muted-foreground mb-2" />
              <h3 className="font-medium">No images yet</h3>
              <p className="text-sm text-muted-foreground">
                Upload images to showcase your product to customers
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center text-sm text-muted-foreground">
          <Info className="h-4 w-4 mr-1" />
          {images.length === 0 ? (
            <span>Your product will be created without images</span>
          ) : (
            <span>{images.length} image(s) added</span>
          )}
        </div>
        
        <Button
          onClick={handleContinue}
          disabled={loading || uploadMutation.isPending || deleteImageMutation.isPending}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}