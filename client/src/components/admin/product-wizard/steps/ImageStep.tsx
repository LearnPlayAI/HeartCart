/**
 * ImageStep Component
 * 
 * This component handles the image management step of the product creation wizard,
 * allowing users to upload, reorder, and set a main product image.
 */

import React, { useState, useCallback, useRef } from 'react';
import { useProductWizardContext } from '../context';
import { useToast } from '@/hooks/use-toast';
import { formatFileSize } from '@/utils/format';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  UploadIcon, 
  ImageIcon, 
  Trash2Icon, 
  StarIcon, 
  AlertCircleIcon, 
  Loader2Icon,
  MoveVerticalIcon,
  AlertTriangleIcon
} from 'lucide-react';

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed file types
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function ImageStep() {
  const { state, addImage, removeImage, setMainImage, reorderImages, markStepComplete } = useProductWizardContext();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // Trigger file input click
  const handleSelectFiles = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Handle file input change
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Upload each file
    for (let i = 0; i < files.length; i++) {
      await uploadFile(files[i]);
    }
    
    // Clear the input for future uploads
    e.target.value = '';
  };
  
  // Handle drag and drop
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    
    // Upload each file
    for (let i = 0; i < files.length; i++) {
      await uploadFile(files[i]);
    }
  };
  
  // Upload a file
  const uploadFile = async (file: File) => {
    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: `Only JPEG, PNG, WebP, and GIF images are allowed.`,
        variant: 'destructive',
      });
      return;
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'File too large',
        description: `Maximum file size is ${formatFileSize(MAX_FILE_SIZE)}.`,
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'products');
      
      // Upload file
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload image');
      }
      
      // Get upload result
      const result = await response.json();
      
      // Add image to state
      addImage(result.url, result.objectKey);
      
      // Mark step as complete
      markStepComplete('images');
      
      // Show success toast
      toast({
        title: 'Image uploaded',
        description: `${file.name} has been uploaded successfully.`,
      });
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };
  
  // Handle image reordering with drag and drop
  const handleImageDragStart = (index: number) => {
    setDraggingIndex(index);
  };
  
  const handleImageDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };
  
  const handleImageDragEnd = () => {
    if (draggingIndex !== null && dragOverIndex !== null && draggingIndex !== dragOverIndex) {
      // Create a new order array
      const newOrder: number[] = Array.from({ length: state.imageUrls.length }, (_, i) => i);
      
      // Remove dragging item
      const dragItem = newOrder.splice(draggingIndex, 1)[0];
      
      // Insert at new position
      newOrder.splice(dragOverIndex, 0, dragItem);
      
      // Update image order
      reorderImages(newOrder);
    }
    
    setDraggingIndex(null);
    setDragOverIndex(null);
  };
  
  // Set as main image
  const handleSetMainImage = (index: number) => {
    setMainImage(index);
  };
  
  // Remove image
  const handleRemoveImage = (index: number) => {
    removeImage(index);
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Product Images</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drag and drop area */}
          <div
            className="border-2 border-dashed rounded-md p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleSelectFiles}
          >
            <div className="flex flex-col items-center justify-center gap-2">
              <UploadIcon className="h-10 w-10 text-muted-foreground" />
              <h3 className="font-medium">Drag and drop images here</h3>
              <p className="text-sm text-muted-foreground">
                Or click to browse your files
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Supported formats: JPEG, PNG, WebP, GIF. Max size: {formatFileSize(MAX_FILE_SIZE)}
              </p>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept={ALLOWED_FILE_TYPES.join(',')}
              onChange={handleFileInputChange}
              multiple
            />
          </div>
          
          {/* Upload progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center">
                <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                <span>Uploading...</span>
              </div>
              <div className="bg-muted h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}
          
          {/* Uploaded images */}
          {state.imageUrls.length > 0 ? (
            <div className="space-y-4">
              <h3 className="font-medium">Uploaded Images ({state.imageUrls.length})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {state.imageUrls.map((url, index) => (
                  <div
                    key={url}
                    draggable
                    onDragStart={() => handleImageDragStart(index)}
                    onDragOver={(e) => handleImageDragOver(e, index)}
                    onDragEnd={handleImageDragEnd}
                    className={`
                      relative rounded-md overflow-hidden border shadow-sm group
                      ${index === draggingIndex ? 'opacity-50' : ''}
                      ${index === dragOverIndex ? 'border-primary' : ''}
                      ${index === state.mainImageIndex ? 'ring-2 ring-primary' : ''}
                    `}
                  >
                    <div className="aspect-square bg-muted/20">
                      <img 
                        src={url} 
                        alt={`Product image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {/* Image overlay with actions */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity duration-200">
                      <div className="flex gap-2 mb-2">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="w-8 h-8 rounded-full"
                          onClick={() => handleSetMainImage(index)}
                          disabled={index === state.mainImageIndex}
                        >
                          <StarIcon className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="w-8 h-8 rounded-full"
                          onClick={() => handleRemoveImage(index)}
                        >
                          <Trash2Icon className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="opacity-70 text-white text-xs flex items-center">
                        <MoveVerticalIcon className="h-3 w-3 mr-1" />
                        <span>Drag to reorder</span>
                      </div>
                    </div>
                    
                    {/* Main image indicator */}
                    {index === state.mainImageIndex && (
                      <div className="absolute top-1 left-1">
                        <Badge variant="secondary" className="bg-primary text-primary-foreground text-xs">
                          Main
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <Alert variant="default" className="bg-muted/40">
                <AlertTriangleIcon className="h-4 w-4" />
                <AlertDescription>
                  The image marked as "Main" will be used as the primary product image in listings, 
                  search results, and the product details page.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="text-center py-8">
              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">No images uploaded yet</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between flex-wrap">
          <p className="text-sm text-muted-foreground">
            {state.imageUrls.length === 0 ? (
              'Images are optional but recommended for better product presentation.'
            ) : (
              `${state.imageUrls.length} image${state.imageUrls.length !== 1 ? 's' : ''} uploaded.`
            )}
          </p>
          <Button
            variant="outline"
            onClick={handleSelectFiles}
            disabled={isUploading}
            className="gap-1"
          >
            <UploadIcon className="h-4 w-4" />
            <span>Upload More</span>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}