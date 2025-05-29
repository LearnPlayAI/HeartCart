/**
 * Images Step
 * 
 * This component handles product image management,
 * including uploading, reordering, and setting the main image.
 */

import { useState, useCallback } from 'react';
import { useDraftContext } from '../DraftContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { debounce } from '@/lib/utils';
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  Star,
  MoveLeft, 
  MoveRight,
  Loader2 
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface ImagesStepProps {
  onNext: () => void;
}

export function ImagesStep({ onNext }: ImagesStepProps) {
  const { draft, updateDraft, saveDraft } = useDraftContext();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Auto-save with debounce
  const debouncedSave = debounce(async () => {
    try {
      await saveDraft();
    } catch (err) {
      console.error('Failed to auto-save draft:', err);
    }
  }, 1500);
  
  // Upload image mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return apiRequest('/api/upload/product-image', {
        method: 'POST',
        body: formData,
        isFormData: true,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        },
      });
    },
    onSuccess: (response) => {
      if (response.success && response.data?.url) {
        const currentUrls = draft?.imageUrls || [];
        const updatedUrls = [...currentUrls, response.data.url];
        
        updateDraft({ 
          imageUrls: updatedUrls,
          // Set as main image if this is the first image
          mainImageIndex: currentUrls.length === 0 ? 0 : draft?.mainImageIndex
        });
        
        debouncedSave();
        
        
      }
    },
    onError: (error) => {
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Could not upload the image.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setUploading(false);
      setUploadProgress(0);
    }
  });
  
  // Handle file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please upload an image file (JPEG, PNG, etc.).',
        variant: 'destructive',
      });
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Maximum file size is 5MB.',
        variant: 'destructive',
      });
      return;
    }
    
    // Upload the file
    setUploading(true);
    
    const formData = new FormData();
    formData.append('image', file);
    formData.append('productId', draft?.id?.toString() || 'draft');
    
    uploadMutation.mutate(formData);
    
    // Reset input value to allow selecting the same file again
    event.target.value = '';
  }, [draft, toast, uploadMutation]);
  
  // Set main image
  const setMainImage = (index: number) => {
    updateDraft({ mainImageIndex: index });
    debouncedSave();
  };
  
  // Remove image
  const removeImage = (index: number) => {
    if (!draft?.imageUrls) return;
    
    const newImageUrls = [...draft.imageUrls];
    newImageUrls.splice(index, 1);
    
    // Update main image index if needed
    let newMainIndex = draft.mainImageIndex;
    if (newImageUrls.length === 0) {
      newMainIndex = null;
    } else if (index === draft.mainImageIndex) {
      newMainIndex = 0;
    } else if (draft.mainImageIndex !== null && index < draft.mainImageIndex) {
      newMainIndex = draft.mainImageIndex - 1;
    }
    
    updateDraft({
      imageUrls: newImageUrls,
      mainImageIndex: newMainIndex
    });
    
    debouncedSave();
  };
  
  // Move image
  const moveImage = (index: number, direction: 'left' | 'right') => {
    if (!draft?.imageUrls || draft.imageUrls.length < 2) return;
    
    const newImageUrls = [...draft.imageUrls];
    
    if (direction === 'left' && index > 0) {
      // Swap with the previous image
      [newImageUrls[index], newImageUrls[index - 1]] = [newImageUrls[index - 1], newImageUrls[index]];
      
      // Update main image index if needed
      let newMainIndex = draft.mainImageIndex;
      if (index === draft.mainImageIndex) {
        newMainIndex = index - 1;
      } else if (index - 1 === draft.mainImageIndex) {
        newMainIndex = index;
      }
      
      updateDraft({
        imageUrls: newImageUrls,
        mainImageIndex: newMainIndex
      });
      
    } else if (direction === 'right' && index < newImageUrls.length - 1) {
      // Swap with the next image
      [newImageUrls[index], newImageUrls[index + 1]] = [newImageUrls[index + 1], newImageUrls[index]];
      
      // Update main image index if needed
      let newMainIndex = draft.mainImageIndex;
      if (index === draft.mainImageIndex) {
        newMainIndex = index + 1;
      } else if (index + 1 === draft.mainImageIndex) {
        newMainIndex = index;
      }
      
      updateDraft({
        imageUrls: newImageUrls,
        mainImageIndex: newMainIndex
      });
    }
    
    debouncedSave();
  };
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Product Images</h2>
      <p className="text-muted-foreground">
        Upload and manage product images. The first image will be used as the main product image in listings.
      </p>
      
      <Card>
        <CardContent className="pt-6">
          {/* Image Upload */}
          <div className="space-y-4">
            <Label htmlFor="image-upload">Upload Product Images</Label>
            <div className="flex flex-col items-center p-6 border-2 border-dashed rounded-md cursor-pointer hover:border-primary">
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
              <label htmlFor="image-upload" className="cursor-pointer text-center">
                {uploading ? (
                  <div className="space-y-2 flex flex-col items-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p>Uploading... {uploadProgress}%</p>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary" 
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 flex flex-col items-center">
                    <Upload className="h-10 w-10 text-muted-foreground" />
                    <p>Drag and drop or click to upload</p>
                    <p className="text-xs text-muted-foreground">JPG, PNG or GIF (max 5MB)</p>
                  </div>
                )}
              </label>
            </div>
          </div>
          
          {/* Image Gallery */}
          <div className="mt-8">
            <h3 className="text-lg font-medium mb-4">Product Images</h3>
            
            {(!draft?.imageUrls || draft.imageUrls.length === 0) ? (
              <div className="text-center p-8 border rounded-md">
                <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">No images uploaded yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {draft.imageUrls.map((url, index) => (
                  <div 
                    key={index} 
                    className={`relative rounded-md overflow-hidden border-2 ${
                      index === draft.mainImageIndex ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    <div className="aspect-square relative group">
                      <img 
                        src={url} 
                        alt={`Product image ${index + 1}`} 
                        className="object-cover w-full h-full"
                      />
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex flex-col gap-2">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => setMainImage(index)}
                            disabled={index === draft.mainImageIndex}
                            title="Set as main image"
                          >
                            <Star className={`h-4 w-4 ${
                              index === draft.mainImageIndex ? 'text-yellow-400 fill-yellow-400' : ''
                            }`} />
                          </Button>
                          
                          <div className="flex gap-1">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              onClick={() => moveImage(index, 'left')}
                              disabled={index === 0}
                              title="Move left"
                            >
                              <MoveLeft className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              onClick={() => moveImage(index, 'right')}
                              disabled={index === draft.imageUrls.length - 1}
                              title="Move right"
                            >
                              <MoveRight className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <Button 
                            variant="destructive" 
                            size="icon" 
                            onClick={() => removeImage(index)}
                            title="Remove image"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    {index === draft.mainImageIndex && (
                      <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-md">
                        Main
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}