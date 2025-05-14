/**
 * Images Step Component
 * 
 * This component manages the product image uploads, reordering, and selection.
 * It integrates directly with the Replit Object Store via the draft context.
 */

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@hello-pangea/dnd';
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from '@hello-pangea/dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDraft } from '../DraftContext';
import { 
  Loader2, 
  Image as ImageIcon, 
  Upload, 
  X, 
  Star,
  AlertCircle,
  MoveHorizontal,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Define maximum allowed file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Sortable image item component
interface SortableImageProps {
  id: string;
  url: string;
  index: number;
  isMain: boolean;
  onDelete: () => void;
  onSetAsMain: () => void;
}

const SortableImage: React.FC<SortableImageProps> = ({ 
  id, 
  url, 
  index, 
  isMain, 
  onDelete, 
  onSetAsMain 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });
  
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  };
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group rounded-md overflow-hidden border border-border",
        "w-[150px] h-[150px] flex items-center justify-center bg-muted",
        isMain && "ring-2 ring-primary"
      )}
      {...attributes}
      {...listeners}
    >
      <img 
        src={url} 
        alt={`Product image ${index + 1}`} 
        className="w-full h-full object-cover" 
      />
      
      {/* Overlay with actions */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
        <div className="flex gap-1">
          <Button 
            variant="ghost" 
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          
          {!isMain && (
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={onSetAsMain}
            >
              <Star className="h-4 w-4" />
            </Button>
          )}
          
          <Button 
            variant="ghost" 
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20 cursor-move"
          >
            <MoveHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Main indicator */}
      {isMain && (
        <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
          <Star className="h-3 w-3" />
        </div>
      )}
    </div>
  );
};

const ImagesStep: React.FC = () => {
  const { draft, draftLoading, uploadImages, removeImage, reorderImages, setMainImage } = useDraft();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Setup DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );
  
  // Setup dropzone for file uploads
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setError(null);
    
    // Check if files are valid
    const invalidFile = acceptedFiles.find(file => !file.type.startsWith('image/'));
    if (invalidFile) {
      setError('Only image files are allowed.');
      return;
    }
    
    // Check file sizes
    const oversizedFile = acceptedFiles.find(file => file.size > MAX_FILE_SIZE);
    if (oversizedFile) {
      setError(`File size exceeds 5MB limit: ${oversizedFile.name}`);
      return;
    }
    
    try {
      setUploading(true);
      await uploadImages(acceptedFiles);
    } catch (err) {
      console.error('Error uploading images:', err);
      setError('Failed to upload images. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [uploadImages]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxSize: MAX_FILE_SIZE
  });
  
  // Handle reordering
  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      const oldIndex = draft?.imageUrls?.findIndex((_, i) => `image-${i}` === active.id) ?? -1;
      const newIndex = draft?.imageUrls?.findIndex((_, i) => `image-${i}` === over.id) ?? -1;
      
      if (oldIndex >= 0 && newIndex >= 0) {
        const newOrder = Array.from({ length: draft?.imageUrls?.length || 0 }, (_, i) => i);
        const reordered = arrayMove(newOrder, oldIndex, newIndex);
        await reorderImages(reordered);
      }
    }
  };
  
  // Handle image deletion
  const handleDeleteImage = async (index: number) => {
    try {
      await removeImage(index);
    } catch (err) {
      console.error('Error removing image:', err);
      setError('Failed to remove image. Please try again.');
    }
  };
  
  // Handle setting main image
  const handleSetMainImage = async (index: number) => {
    try {
      await setMainImage(index);
    } catch (err) {
      console.error('Error setting main image:', err);
      setError('Failed to set main image. Please try again.');
    }
  };
  
  if (draftLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  
  const imageUrls = draft?.imageUrls || [];
  const mainImageIndex = draft?.mainImageIndex || 0;
  
  return (
    <div className="space-y-6">
      {/* Image drop zone */}
      <Card className="border border-dashed">
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
              isDragActive 
                ? "border-primary bg-primary/10" 
                : "border-input hover:border-primary/50 hover:bg-accent"
            )}
          >
            <input {...getInputProps()} />
            
            <div className="flex flex-col items-center justify-center space-y-2 py-4">
              <Upload className="h-10 w-10 text-muted-foreground mb-2" />
              
              <h3 className="text-lg font-medium">
                {isDragActive ? 'Drop images here' : 'Drag and drop product images'}
              </h3>
              
              <p className="text-sm text-muted-foreground max-w-md">
                Upload up to 10 images in JPG, PNG, or WebP format. 
                Maximum file size: 5MB. The first image will be the main product image.
              </p>
              
              <Button 
                type="button" 
                variant="secondary" 
                className="mt-4"
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Select Images
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Error message */}
      {error && (
        <div className="bg-destructive/10 text-destructive rounded-md p-3 flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Image preview and sorting */}
      {imageUrls.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Product Images</h3>
          <p className="text-sm text-muted-foreground">
            Drag to reorder images. The first image will be the main product image shown in listings.
          </p>
          
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={imageUrls.map((_, i) => `image-${i}`)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="flex flex-wrap gap-4 mt-4">
                {imageUrls.map((url, index) => (
                  <SortableImage
                    key={`image-${index}`}
                    id={`image-${index}`}
                    url={url}
                    index={index}
                    isMain={index === mainImageIndex}
                    onDelete={() => handleDeleteImage(index)}
                    onSetAsMain={() => handleSetMainImage(index)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          
          <div className="mt-4 text-sm text-muted-foreground">
            <p>
              <Star className="h-3 w-3 inline-block mr-1" />
              The image with the star is the main product image.
            </p>
          </div>
        </div>
      )}
      
      {imageUrls.length === 0 && !uploading && (
        <div className="text-center p-6 bg-muted rounded-md">
          <ImageIcon className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <h3 className="text-lg font-medium">No Images Yet</h3>
          <p className="text-sm text-muted-foreground">
            Add product images to enhance your listing. Products with clear images sell better.
          </p>
        </div>
      )}
    </div>
  );
};

export default ImagesStep;