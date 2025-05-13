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
        // Try to get error message from response if it's JSON
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to upload image');
        } catch (jsonError) {
          // If response is not JSON, use status text or a generic message
          throw new Error(`Upload failed: ${response.statusText || 'Server error'}`);
        }
      }
      
      // Safely try to parse JSON response
      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        console.error('Error parsing response:', jsonError);
        const responseText = await response.text();
        console.error('Response text:', responseText.substring(0, 200) + '...');
        throw new Error('Invalid response format from server');
      }
      
      // Add image to state - handle both response formats for backwards compatibility
      if (result.data && result.data.url) {
        // New standardized format
        addImage(result.data.url, result.data.objectKey);
      } else {
        // Legacy format
        addImage(result.url, result.objectKey);
      }
      
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
    <div className="wizard-step">
      <h3 className="text-2xl font-semibold mb-4 text-[#FF69B4]">Product Images</h3>
      <Card className="bg-white border-[#E5E7EB] shadow-sm">
        <CardContent className="pt-6 space-y-4">
          {/* Drag and drop area */}
          <div
            className="image-dropzone border-2 border-dashed border-[#E5E7EB] rounded-md p-8 text-center cursor-pointer hover:bg-[#FFE6F0]/50 hover:border-[#FF69B4]/70 transition-colors"
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleSelectFiles}
          >
            <div className="flex flex-col items-center justify-center gap-2">
              <UploadIcon className="h-10 w-10 text-[#FF69B4]" />
              <h3 className="font-medium text-[#FF69B4]">Drag and drop images here</h3>
              <p className="text-sm text-[#A8E6CF]">
                Or click to browse your files
              </p>
              <p className="text-xs text-[#777777] mt-2">
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
              <div className="flex items-center text-[#A8E6CF]">
                <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                <span>Uploading...</span>
              </div>
              <div className="bg-[#F8F9FA] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#FF69B4] h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}
          
          {/* Uploaded images */}
          {state.imageUrls.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-[#A8E6CF] text-lg">Uploaded Images <span className="text-[#FF69B4] font-bold">({state.imageUrls.length})</span></h3>
                <p className="text-xs text-[#777777]">Drag images to reorder • Click star icon to set as main image</p>
              </div>
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
                      ${index === dragOverIndex ? 'border-[#A8E6CF] border-2' : ''}
                      ${index === state.mainImageIndex ? 'ring-2 ring-[#FF69B4] ring-offset-1' : ''}
                      transition-all duration-200 hover:shadow-md
                    `}
                  >
                    <div className="aspect-square bg-gray-50">
                      <img 
                        src={url} 
                        alt={`Product image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {/* Image overlay with actions */}
                    <div className="absolute inset-0 bg-[#FF69B4]/85 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity duration-200">
                      <div className="flex gap-2 mb-2">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="w-8 h-8 rounded-full bg-white hover:bg-[#A8E6CF] hover:text-white transition-colors duration-200"
                          onClick={() => handleSetMainImage(index)}
                          disabled={index === state.mainImageIndex}
                        >
                          <StarIcon className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="w-8 h-8 rounded-full bg-white text-[#FF6B6B] hover:bg-[#FF6B6B] hover:text-white transition-colors duration-200"
                          onClick={() => handleRemoveImage(index)}
                        >
                          <Trash2Icon className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="opacity-90 text-white text-xs flex items-center mt-1">
                        {index === state.mainImageIndex ? (
                          <>
                            <StarIcon className="h-3 w-3 mr-1" />
                            <span>Main image</span>
                          </>
                        ) : (
                          <>
                            <MoveVerticalIcon className="h-3 w-3 mr-1" />
                            <span>Click star to set as main</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Main image indicator */}
                    {index === state.mainImageIndex && (
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-[#A8E6CF] text-white text-xs shadow-sm flex items-center gap-1">
                          <StarIcon className="h-3 w-3" /> Main
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <Alert variant="default" className="bg-[#F8F9FA] border border-[#E5E7EB]">
                <AlertTriangleIcon className="h-4 w-4 text-[#A8E6CF]" />
                <AlertDescription className="text-[#333333]">
                  The image marked as "Main" will be used as the primary product image in listings, 
                  search results, and the product details page.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="text-center py-8">
              <ImageIcon className="h-12 w-12 mx-auto text-[#E5E7EB]" />
              <p className="mt-2 text-[#777777]">No images uploaded yet</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between flex-wrap border-t border-[#E5E7EB] bg-[#F8F9FA]">
          <p className="text-sm text-[#777777]">
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
            className="gap-1 bg-white hover:bg-[#FF69B4] hover:text-white border-[#E5E7EB]"
          >
            <UploadIcon className="h-4 w-4" />
            <span>Upload More</span>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}