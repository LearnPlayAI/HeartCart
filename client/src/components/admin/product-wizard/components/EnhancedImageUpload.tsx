import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
  Upload, 
  X, 
  Star, 
  Image as ImageIcon, 
  Loader2, 
  AlertCircle,
  MoveVertical,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ensureValidImageUrl } from '@/utils/file-manager';

interface ImageItem {
  url: string;
  objectKey: string;
  index: number;
}

interface EnhancedImageUploadProps {
  images: string[];
  objectKeys: string[];
  mainImageIndex: number;
  onImagesChange: (images: string[], objectKeys: string[]) => void;
  onMainImageChange: (index: number) => void;
  onUpload: (files: File[]) => Promise<{ urls: string[], objectKeys: string[] }>;
  isUploading?: boolean;
  maxImages?: number;
}

export const EnhancedImageUpload: React.FC<EnhancedImageUploadProps> = ({
  images,
  objectKeys,
  mainImageIndex,
  onImagesChange,
  onMainImageChange,
  onUpload,
  isUploading = false,
  maxImages = 10
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (images.length + acceptedFiles.length > maxImages) {
      return;
    }

    try {
      const result = await onUpload(acceptedFiles);
      const newImages = [...images, ...result.urls];
      const newObjectKeys = [...objectKeys, ...result.objectKeys];
      onImagesChange(newImages, newObjectKeys);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  }, [images, objectKeys, onUpload, onImagesChange, maxImages]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    multiple: true,
    disabled: isUploading || images.length >= maxImages,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
  });

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newObjectKeys = objectKeys.filter((_, i) => i !== index);
    
    // Adjust main image index if necessary
    let newMainIndex = mainImageIndex;
    if (index === mainImageIndex) {
      newMainIndex = 0; // Set first image as main if main image is removed
    } else if (index < mainImageIndex) {
      newMainIndex = mainImageIndex - 1;
    }
    
    onImagesChange(newImages, newObjectKeys);
    if (newMainIndex !== mainImageIndex) {
      onMainImageChange(newMainIndex);
    }
  };

  const setMainImage = (index: number) => {
    onMainImageChange(index);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const newImages = Array.from(images);
    const newObjectKeys = Array.from(objectKeys);
    const [reorderedImage] = newImages.splice(result.source.index, 1);
    const [reorderedKey] = newObjectKeys.splice(result.source.index, 1);
    
    newImages.splice(result.destination.index, 0, reorderedImage);
    newObjectKeys.splice(result.destination.index, 0, reorderedKey);

    // Update main image index if it was affected by reordering
    let newMainIndex = mainImageIndex;
    if (result.source.index === mainImageIndex) {
      newMainIndex = result.destination.index;
    } else if (result.source.index < mainImageIndex && result.destination.index >= mainImageIndex) {
      newMainIndex = mainImageIndex - 1;
    } else if (result.source.index > mainImageIndex && result.destination.index <= mainImageIndex) {
      newMainIndex = mainImageIndex + 1;
    }

    onImagesChange(newImages, newObjectKeys);
    if (newMainIndex !== mainImageIndex) {
      onMainImageChange(newMainIndex);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div
          {...getRootProps()}
          className={`
            relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300
            ${isDragActive || isDragging 
              ? 'border-blue-500 bg-blue-50 scale-[1.02]' 
              : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
            }
            ${isUploading ? 'pointer-events-none opacity-50' : ''}
            ${images.length >= maxImages ? 'opacity-50 pointer-events-none' : ''}
          `}
        >
          <input {...getInputProps()} />
          
          <div className="flex flex-col items-center gap-4">
            <div className={`
              w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300
              ${isDragActive || isDragging ? 'bg-blue-100' : 'bg-slate-100'}
            `}>
              {isUploading ? (
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              ) : (
                <Upload className={`w-8 h-8 ${isDragActive || isDragging ? 'text-blue-500' : 'text-slate-500'}`} />
              )}
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-800">
                {isUploading ? 'Uploading...' : 'Upload Product Images'}
              </h3>
              <p className="text-sm text-slate-600">
                {isDragActive || isDragging 
                  ? 'Drop images here to upload' 
                  : 'Drag & drop images here, or click to select'
                }
              </p>
              <p className="text-xs text-slate-500">
                {images.length}/{maxImages} images • JPEG, PNG, WebP up to 5MB each
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Image Gallery */}
      {images.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Product Images</h3>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MoveVertical className="w-4 h-4" />
                Drag to reorder
              </div>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="images" direction="horizontal">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="flex gap-4 overflow-x-auto pb-4"
                  >
                    {images.map((imageUrl, index) => (
                      <Draggable key={`${imageUrl}-${index}`} draggableId={`image-${index}`} index={index}>
                        {(provided, snapshot) => (
                          <motion.div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                            className={`
                              relative min-w-[200px] group transition-all duration-300
                              ${snapshot.isDragging ? 'scale-105 shadow-xl' : 'hover:scale-[1.02]'}
                            `}
                          >
                            <Card className="overflow-hidden border-2 transition-all duration-300 hover:shadow-lg">
                              <CardContent className="p-0">
                                <div className="relative aspect-square bg-slate-100">
                                  <img
                                    src={ensureValidImageUrl(imageUrl)}
                                    alt={`Product image ${index + 1}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.src = '/placeholder-image.svg';
                                    }}
                                  />
                                  
                                  {/* Main Image Badge */}
                                  {index === mainImageIndex && (
                                    <Badge className="absolute top-2 left-2 bg-yellow-500 text-white">
                                      <Star className="w-3 h-3 mr-1" />
                                      Main
                                    </Badge>
                                  )}
                                  
                                  {/* Action Buttons */}
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => setPreviewImage(imageUrl)}
                                      className="bg-white/90 hover:bg-white"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                    
                                    {index !== mainImageIndex && (
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => setMainImage(index)}
                                        className="bg-white/90 hover:bg-white"
                                      >
                                        <Star className="w-4 h-4" />
                                      </Button>
                                    )}
                                    
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => removeImage(index)}
                                      className="bg-red-500/90 hover:bg-red-600"
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                                
                                <div className="p-3 bg-white">
                                  <p className="text-xs text-slate-600 text-center">
                                    Image {index + 1}
                                    {index === mainImageIndex && " (Main)"}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        </motion.div>
      )}

      {/* Guidelines */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="bg-blue-50 border border-blue-200 rounded-xl p-4"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-2">
            <h4 className="font-medium text-blue-900">Image Guidelines</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Use high-quality images (minimum 800x800px) for best results</li>
              <li>• The first image will be used as the main product image</li>
              <li>• You can drag images to reorder them</li>
              <li>• Click the star icon to set any image as the main image</li>
              <li>• Supported formats: JPEG, PNG, WebP (max 5MB each)</li>
            </ul>
          </div>
        </div>
      </motion.div>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative max-w-4xl max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={ensureValidImageUrl(previewImage)}
                alt="Preview"
                className="w-full h-full object-contain rounded-lg"
              />
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-4 right-4"
                onClick={() => setPreviewImage(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};