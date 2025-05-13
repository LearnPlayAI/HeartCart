/**
 * Image Step Component
 * 
 * Handles the collection and management of product images,
 * including upload, deletion, and setting the main image.
 */

import React, { useEffect, useState } from 'react';
import { useProductWizardContext } from '../context';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { ImageIcon, StarIcon, TrashIcon, UploadIcon, InfoIcon, Settings2Icon, XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  uploadFile,
  uploadMultipleFiles,
  deleteFile,
  ensureValidImageUrl,
  removeImageBackground
} from '@/utils/file-manager';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

const ImageStep: React.FC = () => {
  const { toast } = useToast();
  const { 
    state, 
    updateField, 
    markStepComplete, 
    validateStep,
    imageOperationInProgress,
    setImageOperationInProgress
  } = useProductWizardContext();
  
  // Local state for drag-and-drop zone
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<number | null>(null);
  const [bgRemovalDialogOpen, setBgRemovalDialogOpen] = useState(false);
  const [imageForBgRemoval, setImageForBgRemoval] = useState<number | null>(null);
  const [isProcessingBgRemoval, setIsProcessingBgRemoval] = useState(false);

  // Auto-validate on mount to check for required images
  useEffect(() => {
    const isValid = validateStep('images');
    if (isValid) {
      markStepComplete('images');
    }
  }, [validateStep, markStepComplete]);

  // Validate when images change
  useEffect(() => {
    const isValid = validateStep('images');
    if (isValid) {
      markStepComplete('images');
    }
  }, [state.imageUrls, state.imageObjectKeys, validateStep, markStepComplete]);
  
  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    await uploadFiles(Array.from(files));
    // Clear the input
    e.target.value = '';
  };
  
  // Handle drag events
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  // Handle drop
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await uploadFiles(Array.from(e.dataTransfer.files));
    }
  };
  
  // Upload files
  const uploadFiles = async (files: File[]) => {
    // Filter for image files only
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      toast({
        title: 'Invalid files',
        description: 'Please select only image files (png, jpg, jpeg, gif, webp).',
        variant: 'destructive',
      });
      return;
    }
    
    setIsUploading(true);
    setImageOperationInProgress(true);
    setUploadProgress(0);
    
    try {
      const results = await uploadMultipleFiles(
        imageFiles,
        {
          bucket: 'products',
          folder: state.productId ? `product-${state.productId}` : 'temp-uploads',
          generateUniqueName: true,
        },
        (progress) => {
          setUploadProgress(progress);
        }
      );
      
      // Filter successful uploads
      const successfulUploads = results.filter(r => r.success);
      
      if (successfulUploads.length === 0) {
        toast({
          title: 'Upload failed',
          description: 'Failed to upload images. Please try again.',
          variant: 'destructive',
        });
        return;
      }
      
      // Update image arrays
      const newImageUrls = [...state.imageUrls];
      const newImageObjectKeys = [...state.imageObjectKeys];
      
      successfulUploads.forEach(upload => {
        newImageUrls.push(upload.url);
        newImageObjectKeys.push(upload.objectKey);
      });
      
      // If this is the first image, set it as main
      if (state.imageUrls.length === 0 && successfulUploads.length > 0) {
        updateField('mainImageIndex', 0);
      }
      
      updateField('imageUrls', newImageUrls);
      updateField('imageObjectKeys', newImageObjectKeys);
      
      toast({
        title: 'Upload successful',
        description: `Successfully uploaded ${successfulUploads.length} image${successfulUploads.length > 1 ? 's' : ''}.`,
      });
      
      // Log any failures
      const failures = results.filter(r => !r.success);
      if (failures.length > 0) {
        console.error('Failed uploads:', failures);
        toast({
          title: 'Some uploads failed',
          description: `${failures.length} image${failures.length > 1 ? 's' : ''} failed to upload.`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload error',
        description: 'An error occurred during upload. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setImageOperationInProgress(false);
    }
  };
  
  // Set main image
  const handleSetMainImage = (index: number) => {
    updateField('mainImageIndex', index);
    toast({
      title: 'Main image updated',
      description: 'The selected image has been set as the main product image.',
    });
  };
  
  // Open delete dialog
  const openDeleteDialog = (index: number) => {
    setImageToDelete(index);
    setDeleteDialogOpen(true);
  };
  
  // Confirm delete
  const confirmDelete = async () => {
    if (imageToDelete === null) return;
    
    setImageOperationInProgress(true);
    try {
      const objectKey = state.imageObjectKeys[imageToDelete];
      if (objectKey) {
        await deleteFile(objectKey, 'products');
      }
      
      const newImageUrls = [...state.imageUrls];
      const newImageObjectKeys = [...state.imageObjectKeys];
      
      newImageUrls.splice(imageToDelete, 1);
      newImageObjectKeys.splice(imageToDelete, 1);
      
      // Update main image index if needed
      let newMainImageIndex = state.mainImageIndex;
      if (state.mainImageIndex === imageToDelete) {
        // If we deleted the main image, set the first image as main
        newMainImageIndex = newImageUrls.length > 0 ? 0 : -1;
      } else if (state.mainImageIndex > imageToDelete) {
        // If we deleted an image before the main image, adjust the index
        newMainImageIndex--;
      }
      
      updateField('imageUrls', newImageUrls);
      updateField('imageObjectKeys', newImageObjectKeys);
      updateField('mainImageIndex', newMainImageIndex);
      
      toast({
        title: 'Image deleted',
        description: 'The image has been successfully deleted.',
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Delete failed',
        description: 'Failed to delete the image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setImageToDelete(null);
      setImageOperationInProgress(false);
    }
  };
  
  // Open background removal dialog
  const openBgRemovalDialog = (index: number) => {
    setImageForBgRemoval(index);
    setBgRemovalDialogOpen(true);
  };
  
  // Process background removal
  const processBgRemoval = async () => {
    if (imageForBgRemoval === null) return;
    
    setIsProcessingBgRemoval(true);
    setImageOperationInProgress(true);
    
    try {
      const imageUrl = state.imageUrls[imageForBgRemoval];
      const result = await removeImageBackground(imageUrl);
      
      if (result) {
        // Update the image URL with the processed one
        const newImageUrls = [...state.imageUrls];
        newImageUrls[imageForBgRemoval] = result;
        updateField('imageUrls', newImageUrls);
        
        toast({
          title: 'Background removed',
          description: 'The image background has been successfully removed.',
        });
      } else {
        toast({
          title: 'Processing failed',
          description: 'Failed to remove the image background. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Background removal error:', error);
      toast({
        title: 'Processing error',
        description: 'An error occurred while processing the image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBgRemovalDialogOpen(false);
      setImageForBgRemoval(null);
      setIsProcessingBgRemoval(false);
      setImageOperationInProgress(false);
    }
  };
  
  return (
    <div className="product-wizard-images space-y-6">
      <h2 className="text-2xl font-bold">Product Images</h2>
      <p className="text-muted-foreground">
        Upload and manage the images for your product. The first image will be used as the main product image.
      </p>
      
      {/* Image Upload Zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center space-y-4 transition-colors",
          dragActive ? "border-primary bg-primary/5" : "border-border",
          imageOperationInProgress ? "opacity-50 pointer-events-none" : ""
        )}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center space-y-4">
          <ImageIcon size={48} className="text-muted-foreground" />
          
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Drag images here or click to upload</h3>
            <p className="text-sm text-muted-foreground">
              Support for JPG, PNG, WebP and GIF. Maximum size 5MB per image.
            </p>
          </div>
          
          <Button
            onClick={() => document.getElementById('product-image-upload')?.click()}
            className="mt-4"
            disabled={imageOperationInProgress || isUploading}
          >
            {isUploading ? (
              <>Uploading...</>
            ) : (
              <>
                <UploadIcon className="mr-2 h-4 w-4" />
                Upload Images
              </>
            )}
          </Button>
          
          <input
            type="file"
            id="product-image-upload"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
        
        {isUploading && (
          <div className="mt-4 space-y-2">
            <Progress value={uploadProgress} />
            <p className="text-sm text-muted-foreground">
              Uploading {uploadProgress.toFixed(0)}%
            </p>
          </div>
        )}
      </div>
      
      {/* Product Images Grid */}
      {state.imageUrls.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Product Images ({state.imageUrls.length})</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {state.imageUrls.map((url, index) => (
              <Card 
                key={index}
                className={cn(
                  "relative group overflow-hidden border",
                  index === state.mainImageIndex ? "border-primary" : "border-border"
                )}
              >
                <CardContent className="p-0">
                  <div className="relative pt-[100%]">
                    <img
                      src={ensureValidImageUrl(url)}
                      alt={`Product image ${index + 1}`}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    
                    {/* Image Controls */}
                    <div className="absolute inset-0 flex flex-col justify-between p-2 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Top Controls */}
                      <div className="flex justify-between">
                        {index === state.mainImageIndex && (
                          <div className="bg-primary text-white text-xs py-1 px-2 rounded-md flex items-center">
                            <StarIcon className="h-3 w-3 mr-1" /> Main
                          </div>
                        )}
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8 rounded-full bg-black/60 text-white hover:bg-black/80"
                              disabled={imageOperationInProgress}
                            >
                              <Settings2Icon className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {index !== state.mainImageIndex && (
                              <DropdownMenuItem onClick={() => handleSetMainImage(index)}>
                                <StarIcon className="h-4 w-4 mr-2" />
                                <span>Set as main image</span>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => openBgRemovalDialog(index)}>
                              <ImageIcon className="h-4 w-4 mr-2" />
                              <span>Remove background</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => openDeleteDialog(index)}
                              className="text-red-500 focus:text-red-500"
                            >
                              <TrashIcon className="h-4 w-4 mr-2" />
                              <span>Delete image</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      {/* Bottom Controls */}
                      <div className="flex justify-end">
                        {index !== state.mainImageIndex && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="bg-white/90 hover:bg-white"
                            onClick={() => handleSetMainImage(index)}
                            disabled={imageOperationInProgress}
                          >
                            <StarIcon className="h-3.5 w-3.5 mr-1.5" />
                            <span>Set as main</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product Image</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this image? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={imageOperationInProgress}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={imageOperationInProgress}
              className="bg-red-500 hover:bg-red-600"
            >
              {imageOperationInProgress ? 'Deleting...' : 'Delete Image'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Background Removal Dialog */}
      <Dialog open={bgRemovalDialogOpen} onOpenChange={setBgRemovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Image Background</DialogTitle>
            <DialogDescription>
              This will process the image to remove its background, creating a transparent version.
            </DialogDescription>
          </DialogHeader>
          
          {imageForBgRemoval !== null && (
            <div className="my-4 flex justify-center">
              <img
                src={ensureValidImageUrl(state.imageUrls[imageForBgRemoval])}
                alt="Image for background removal"
                className="max-h-[200px] max-w-full object-contain rounded-md border"
              />
            </div>
          )}
          
          <Alert className="mt-4">
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              Background removal works best with product images that have a clear subject and relatively simple backgrounds.
            </AlertDescription>
          </Alert>
          
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setBgRemovalDialogOpen(false)}
              disabled={isProcessingBgRemoval}
            >
              Cancel
            </Button>
            <Button
              onClick={processBgRemoval}
              disabled={isProcessingBgRemoval}
            >
              {isProcessingBgRemoval ? (
                <>Processing...</>
              ) : (
                <>Remove Background</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImageStep;