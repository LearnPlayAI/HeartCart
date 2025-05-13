/**
 * ImageStep Component
 * 
 * This component handles the image management step of the product creation wizard,
 * allowing users to upload, reorder, and set a main product image.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
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
import ProductImage from '../ProductImage';
import ProductImageGallery from '../ProductImageGallery';

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed file types
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function ImageStep() {
  const { state, addImage, removeImage, setMainImage, reorderImages, markStepComplete } = useProductWizardContext();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Debug log current images
  useEffect(() => {
    console.log('ImageStep state:', {
      imageCount: state.imageUrls.length,
      imageUrls: state.imageUrls,
      imageObjectKeys: state.imageObjectKeys,
      mainImageIndex: state.mainImageIndex
    });
    
    // Check all images for loadability
    if (state.imageUrls.length > 0) {
      state.imageUrls.forEach((url, index) => {
        const img = new Image();
        img.onload = () => console.log(`Image ${index} loaded successfully:`, url);
        img.onerror = () => console.error(`Image ${index} failed to load:`, url);
        img.src = url.startsWith('http') ? url : window.location.origin + url;
      });
    }
  }, [state.imageUrls, state.imageObjectKeys, state.mainImageIndex]);
  
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
    
    // Progress interval reference for cleanup
    let progressInterval: any = null;
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      console.log('Starting upload for file:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      // Update progress (simulated for small files since it's so fast)
      progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 5, 90));
      }, 100);
      
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'products');
      
      // Upload file
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      // Clear progress interval
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      
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
      
      console.log('Upload response status:', response.status);
      
      // Safely try to parse JSON response
      let result;
      try {
        result = await response.json();
        console.log('Upload API response:', result);
      } catch (jsonError) {
        console.error('Error parsing response:', jsonError);
        const responseText = await response.text();
        console.error('Response text:', responseText.substring(0, 200) + '...');
        throw new Error('Invalid response format from server');
      }
      
      // Extract image URL and object key from various response formats
      let imageUrl = '';
      let objectKey = '';
      
      // Handle different response formats
      if (result.data && result.data.url) {
        // Format 1: Data object with url field
        imageUrl = result.data.url;
        objectKey = result.data.objectKey || '';
        console.log('Using image URL from data.url');
      } else if (result.absoluteUrl) {
        // Format 2: Direct absoluteUrl field
        imageUrl = result.absoluteUrl;
        objectKey = result.objectKey || '';
        console.log('Using image URL from absoluteUrl');
      } else if (result.url) {
        // Format 3: Direct url field
        imageUrl = result.url;
        objectKey = result.objectKey || '';
        console.log('Using image URL from url field');
      } else if (result.files && result.files.length > 0) {
        // Format 4: Files array
        const fileInfo = result.files[0];
        imageUrl = fileInfo.absoluteUrl || fileInfo.path || '';
        objectKey = fileInfo.objectKey || '';
        console.log('Using image URL from files array');
      } else {
        console.error('Unexpected response format:', result);
        throw new Error('The server response did not contain a valid image URL');
      }
      
      // Ensure URL is absolute
      if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
        // Ensure it has a leading slash
        if (!imageUrl.startsWith('/')) {
          imageUrl = '/' + imageUrl;
        }
        // Add origin
        imageUrl = window.location.origin + imageUrl;
      }
      
      console.log('Processed image URL:', imageUrl);
      console.log('Object key:', objectKey);
      
      if (!imageUrl) {
        throw new Error('No valid image URL found in server response');
      }
      
      // Preload the image to verify it loads correctly
      const imgTest = new Image();
      
      // Create a promise for image loading
      const imageLoadPromise = new Promise((resolve, reject) => {
        imgTest.onload = () => {
          console.log('Image preload successful');
          resolve(true);
        };
        
        imgTest.onerror = (err) => {
          console.error('Image preload failed:', err);
          reject(new Error('The uploaded image could not be loaded. Server may be processing it.'));
        };
        
        // Set a timeout in case the image loading gets stuck
        setTimeout(() => {
          if (!imgTest.complete) {
            reject(new Error('Image loading timed out'));
          }
        }, 5000);
      });
      
      // Start loading the image
      imgTest.src = imageUrl;
      
      try {
        // Wait for image to load or fail
        await imageLoadPromise;
        
        // Image loaded successfully, now add it to the state
        addImage(imageUrl, objectKey);
        
        // Mark step as complete
        markStepComplete('images');
        
        // Show success toast
        toast({
          title: 'Image uploaded',
          description: `${file.name} has been uploaded successfully.`,
        });
      } catch (imgError) {
        // The image failed to load after uploading
        console.error('Error verifying uploaded image:', imgError);
        
        // Try a workaround: Add the image anyway with a delay
        console.log('Adding image anyway, even though preloading failed');
        addImage(imageUrl, objectKey);
        
        toast({
          title: 'Image uploaded',
          description: 'Image uploaded but preview may be delayed.',
          variant: 'default',
        });
      }
    } catch (error) {
      // Clear progress interval if it's still running
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(100);
      // Reset progress after a brief delay to show completion
      setTimeout(() => setUploadProgress(0), 500);
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
                      {/* Enhanced image loading with multiple fallback strategies */}
                      <img 
                        key={`img-${index}-${Date.now()}`} // Force re-render on changes
                        src={url.startsWith('http') ? url : window.location.origin + url} 
                        alt={`Product image ${index + 1}`}
                        className="w-full h-full object-cover"
                        onLoad={(e) => {
                          console.log('Image loaded successfully:', (e.target as HTMLImageElement).src);
                        }}
                        onError={(e) => {
                          console.error('Image failed to load:', (e.target as HTMLImageElement).src);
                          
                          const target = e.target as HTMLImageElement;
                          const currentSrc = target.src;
                          const originalUrl = url;
                          
                          // Keep track of attempts to prevent loops
                          const attemptCount = parseInt(target.dataset.attempts || '0', 10) + 1;
                          target.dataset.attempts = attemptCount.toString();
                          
                          if (attemptCount > 3) {
                            // Too many attempts, use fallback
                            console.log('Too many attempts, using fallback image');
                            target.onerror = null; // Prevent infinite loop
                            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNFNUU3RUIiLz48cGF0aCBkPSJNMTAwIDc0QzkxLjcxNTcgNzQgODUgODAuNzE1NyA4NSA4OUM4NSA5Ny4yODQzIDkxLjcxNTcgMTA0IDEwMCAxMDRDMTA4LjI4NCAxMDQgMTE1IDk3LjI4NDMgMTE1IDg5QzExNSA4MC43MTU3IDEwOC4yODQgNzQgMTAwIDc0WiIgZmlsbD0iIzk0YTNiOCIvPjxwYXRoIGQ9Ik0xNTUgMTI2LjVDMTU1IDEzMy40MDQgMTQ3LjYyOCAxMzkgMTM4LjUgMTM5QzEyOS4zNzIgMTM5IDEyMiAxMzMuNDA0IDEyMiAxMjYuNUMxMjIgMTE5LjU5NiAxMjkuMzcyIDExNCAxMzguNSAxMTRDMTQ3LjYyOCAxMTQgMTU1IDExOS41OTYgMTU1IDEyNi41WiIgZmlsbD0iIzk0YTNiOCIvPjxwYXRoIGQ9Ik0xNjggMTQ0LjVDMTU1LjUyMSAxMzguODg4IDEzNy42MjggMTM1IDEyNyAxMzVDMTExLjUzNiAxMzUgOTguODkzNiAxMzcuMDUzIDkwIDE0MC41IiBzdHJva2U9IiM5NGEzYjgiIHN0cm9rZS13aWR0aD0iMTAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjwvc3ZnPg==';
                            return;
                          }
                          
                          // Try different URL formats based on attempt number
                          switch (attemptCount) {
                            case 1:
                              // First attempt: Try with /temp/ direct URL if original is /api/files/temp
                              if (originalUrl.includes('/api/files/temp')) {
                                const fileName = originalUrl.split('/').pop();
                                if (fileName) {
                                  console.log('Attempt 1: Trying direct temp URL format');
                                  target.src = `${window.location.origin}/temp/${fileName}`;
                                  return;
                                }
                              }
                              // If we can't do the temp conversion, fall through to next attempt
                              
                            case 2:
                              // Second attempt: Try removing origin and adding it again
                              // This fixes issues when the URL already has origin in it
                              {
                                console.log('Attempt 2: Trying with reconstructed URL');
                                let path = originalUrl;
                                
                                // Strip any potential origin
                                const originPattern = new RegExp(`^${window.location.origin}`);
                                path = path.replace(originPattern, '');
                                
                                // Ensure it starts with a slash
                                if (!path.startsWith('/')) {
                                  path = '/' + path;
                                }
                                
                                target.src = window.location.origin + path;
                                return;
                              }
                              
                            case 3:
                              // Third attempt: Try direct object key URL format (for compatibility with older code)
                              if (state.imageObjectKeys[index]) {
                                console.log('Attempt 3: Trying with object key format');
                                const objectKey = state.imageObjectKeys[index];
                                target.src = `${window.location.origin}/api/files/${objectKey}`;
                                return;
                              }
                              break;
                              
                            default:
                              // Use fallback for all other cases
                              target.onerror = null;
                              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNFNUU3RUIiLz48cGF0aCBkPSJNMTAwIDc0QzkxLjcxNTcgNzQgODUgODAuNzE1NyA4NSA4OUM4NSA5Ny4yODQzIDkxLjcxNTcgMTA0IDEwMCAxMDRDMTA4LjI4NCAxMDQgMTE1IDk3LjI4NDMgMTE1IDg5QzExNSA4MC43MTU3IDEwOC4yODQgNzQgMTAwIDc0WiIgZmlsbD0iIzk0YTNiOCIvPjxwYXRoIGQ9Ik0xNTUgMTI2LjVDMTU1IDEzMy40MDQgMTQ3LjYyOCAxMzkgMTM4LjUgMTM5QzEyOS4zNzIgMTM5IDEyMiAxMzMuNDA0IDEyMiAxMjYuNUMxMjIgMTE5LjU5NiAxMjkuMzcyIDExNCAxMzguNSAxMTRDMTQ3LjYyOCAxMTQgMTU1IDExOS41OTYgMTU1IDEyNi41WiIgZmlsbD0iIzk0YTNiOCIvPjxwYXRoIGQ9Ik0xNjggMTQ0LjVDMTU1LjUyMSAxMzguODg4IDEzNy42MjggMTM1IDEyNyAxMzVDMTExLjUzNiAxMzUgOTguODkzNiAxMzcuMDUzIDkwIDE0MC41IiBzdHJva2U9IiM5NGEzYjgiIHN0cm9rZS13aWR0aD0iMTAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjwvc3ZnPg==';
                          }
                        }}
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