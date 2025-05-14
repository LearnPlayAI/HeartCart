import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Loader2, Save, Upload, Image as ImageIcon, 
  X, AlertTriangle, Star, ChevronsUpDown
} from 'lucide-react';
import { StepComponentProps } from '../types';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  DragDropContext, 
  Droppable, 
  Draggable, 
  DropResult 
} from '@hello-pangea/dnd';

// Schema for images validation
const imagesSchema = z.object({
  removeBackground: z.boolean().default(false),
});

type ImagesFormValues = z.infer<typeof imagesSchema>;

export const StepImages: React.FC<StepComponentProps> = ({ 
  draft, 
  onSave, 
  onNext, 
  isLoading 
}) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [images, setImages] = useState<string[]>(draft.imageUrls || []);
  const [imageObjectKeys, setImageObjectKeys] = useState<string[]>(draft.imageObjectKeys || []);
  const [mainImageIndex, setMainImageIndex] = useState<number>(draft.mainImageIndex || 0);
  
  // Setup form
  const form = useForm<ImagesFormValues>({
    resolver: zodResolver(imagesSchema),
    defaultValues: {
      removeBackground: draft.hasBackgroundRemoved || false,
    },
  });
  
  // Upload image mutation
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'product');
      
      // Determine if we should remove the background
      if (form.getValues('removeBackground')) {
        formData.append('removeBackground', 'true');
      }
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        // Add the new image to our state
        setImages((prev) => [...prev, data.data.url]);
        setImageObjectKeys((prev) => [...prev, data.data.objectKey]);
        
        toast({
          title: 'Image Uploaded',
          description: 'Your image has been uploaded successfully',
        });
      } else {
        toast({
          title: 'Upload Failed',
          description: data.error?.message || 'Failed to upload image',
          variant: 'destructive',
        });
      }
      setIsUploading(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Upload Error',
        description: error.message || 'An error occurred during upload',
        variant: 'destructive',
      });
      setIsUploading(false);
    },
  });
  
  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Upload the first file
    uploadImageMutation.mutate(files[0]);
    
    // Reset the input to allow uploading the same file again
    e.target.value = '';
  };
  
  // Handle removing an image
  const handleRemoveImage = (index: number) => {
    // Remove the image from our state
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImageObjectKeys((prev) => prev.filter((_, i) => i !== index));
    
    // If we removed the main image, set a new main image
    if (index === mainImageIndex) {
      setMainImageIndex(0);
    } else if (index < mainImageIndex) {
      // If we removed an image before the main image, adjust the index
      setMainImageIndex(mainImageIndex - 1);
    }
  };
  
  // Handle setting the main image
  const handleSetMainImage = (index: number) => {
    setMainImageIndex(index);
  };
  
  // Handle drag and drop reordering
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    
    // Reorder images
    const newImages = Array.from(images);
    const [removed] = newImages.splice(sourceIndex, 1);
    newImages.splice(destIndex, 0, removed);
    setImages(newImages);
    
    // Reorder object keys
    const newKeys = Array.from(imageObjectKeys);
    const [removedKey] = newKeys.splice(sourceIndex, 1);
    newKeys.splice(destIndex, 0, removedKey);
    setImageObjectKeys(newKeys);
    
    // Update main image index if needed
    if (mainImageIndex === sourceIndex) {
      setMainImageIndex(destIndex);
    } else if (
      (mainImageIndex > sourceIndex && mainImageIndex <= destIndex) ||
      (mainImageIndex < sourceIndex && mainImageIndex >= destIndex)
    ) {
      // Adjust main image index if it was affected by the move
      if (mainImageIndex > sourceIndex && mainImageIndex <= destIndex) {
        setMainImageIndex(mainImageIndex - 1);
      } else {
        setMainImageIndex(mainImageIndex + 1);
      }
    }
  };
  
  // Handle form submission
  const onSubmit = (data: ImagesFormValues) => {
    // Save the data
    onSave({
      imageUrls: images,
      imageObjectKeys: imageObjectKeys,
      mainImageIndex: mainImageIndex,
      hasBackgroundRemoved: data.removeBackground,
    }, true);
  };
  
  // Handle save without advancing
  const handleSaveOnly = () => {
    onSave({
      imageUrls: images,
      imageObjectKeys: imageObjectKeys,
      mainImageIndex: mainImageIndex,
      hasBackgroundRemoved: form.getValues('removeBackground'),
    }, false);
  };
  
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="flex flex-col">
                <h3 className="text-lg font-medium mb-2">Product Images</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload images for your product. The first image will be used as the main image.
                </p>
                
                {/* Background removal option */}
                <FormField
                  control={form.control}
                  name="removeBackground"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mb-6">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Remove Background</FormLabel>
                        <FormDescription>
                          Automatically remove the background from uploaded images
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isLoading}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                {/* File upload */}
                <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center mb-6">
                  <input
                    type="file"
                    id="image-upload"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isLoading || isUploading}
                  />
                  {isUploading ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                      <p className="text-sm text-muted-foreground">Uploading image...</p>
                    </div>
                  ) : (
                    <>
                      <ImageIcon className="h-10 w-10 text-muted-foreground mb-4" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Drag and drop an image, or click to select a file
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => document.getElementById('image-upload')?.click()}
                        disabled={isLoading || isUploading}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Image
                      </Button>
                    </>
                  )}
                </div>
                
                {/* Image preview and ordering */}
                {images.length > 0 ? (
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Current Images</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      Drag and drop to reorder. Click the star to set as main image.
                    </p>
                    
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId="images" direction="horizontal">
                        {(provided) => (
                          <div 
                            className="grid grid-cols-2 md:grid-cols-4 gap-4"
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                          >
                            {images.map((url, index) => (
                              <Draggable 
                                key={`${url}-${index}`} 
                                draggableId={`${url}-${index}`} 
                                index={index}
                              >
                                {(provided) => (
                                  <div
                                    className={`relative rounded-lg overflow-hidden border-2 ${
                                      index === mainImageIndex ? 'border-primary' : 'border-gray-200'
                                    }`}
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                  >
                                    <div className="relative pt-[100%]">
                                      <img 
                                        src={url} 
                                        alt={`Product image ${index + 1}`}
                                        className="absolute inset-0 w-full h-full object-cover"
                                      />
                                    </div>
                                    
                                    <div className="absolute top-2 right-2 flex space-x-1">
                                      {/* Main image button */}
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant={index === mainImageIndex ? "default" : "outline"}
                                        className="h-7 w-7 rounded-full bg-white"
                                        onClick={() => handleSetMainImage(index)}
                                        disabled={isLoading}
                                      >
                                        <Star className="h-4 w-4" />
                                      </Button>
                                      
                                      {/* Remove button */}
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="outline"
                                        className="h-7 w-7 rounded-full bg-white"
                                        onClick={() => handleRemoveImage(index)}
                                        disabled={isLoading}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    
                                    {/* Drag handle */}
                                    <div 
                                      className="absolute bottom-2 left-2 cursor-grab"
                                      {...provided.dragHandleProps}
                                    >
                                      <ChevronsUpDown className="h-5 w-5 text-white drop-shadow-md" />
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
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg">
                    <AlertTriangle className="h-10 w-10 text-yellow-500 mb-4" />
                    <p className="text-sm text-center text-muted-foreground">
                      No images uploaded yet. Please upload at least one image for your product.
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveOnly}
                disabled={isLoading || isUploading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
              
              <Button 
                type="submit"
                disabled={isLoading || isUploading || images.length === 0}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save & Continue
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};