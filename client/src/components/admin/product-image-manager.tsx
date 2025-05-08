import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, Star, StarOff, Trash2, ImageOff, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductImage } from '@shared/schema';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ProductImageManagerProps = {
  productId: number;
  onBackgroundRemoved?: () => void;
};

const ProductImageManager = ({ productId, onBackgroundRemoved }: ProductImageManagerProps) => {
  const [selectedImage, setSelectedImage] = useState<ProductImage | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();
  
  // Fetch product images
  const { data: images, isLoading } = useQuery({
    queryKey: [`/api/products/${productId}/images`],
    queryFn: async () => {
      const res = await fetch(`/api/products/${productId}/images`);
      if (!res.ok) {
        throw new Error('Failed to fetch product images');
      }
      return res.json() as Promise<ProductImage[]>;
    },
  });
  
  // Set main image mutation
  const setMainMutation = useMutation({
    mutationFn: async (imageId: number) => {
      const res = await apiRequest(
        'PUT',
        `/api/products/${productId}/images/${imageId}/main`,
        {}
      );
      
      const result = await res.json();
      
      // Check if the response follows the standardized format
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to set as main image');
      }
      
      return result.data;
    },
    onSuccess: () => {
      toast({
        title: "Main image updated",
        description: "The main product image has been updated",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/products/${productId}/images`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update main image",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Remove background mutation
  const removeBackgroundMutation = useMutation({
    mutationFn: async (imageId: number) => {
      const res = await apiRequest(
        'PUT',
        `/api/products/images/${imageId}`,
        { hasBgRemoved: true }
      );
      
      const result = await res.json();
      
      // Check if the response follows the standardized format
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to request background removal');
      }
      
      return result.data;
    },
    onSuccess: () => {
      toast({
        title: "Background removal requested",
        description: "The background removal process has been initiated",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/products/${productId}/images`] });
      
      if (onBackgroundRemoved) {
        onBackgroundRemoved();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to request background removal",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete image mutation
  const deleteImageMutation = useMutation({
    mutationFn: async (imageId: number) => {
      const res = await apiRequest(
        'DELETE',
        `/api/products/images/${imageId}`,
        {}
      );
      if (!res.ok) {
        throw new Error('Failed to delete image');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Image deleted",
        description: "The product image has been deleted",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/products/${productId}/images`] });
      setSelectedImage(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete image",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const confirmDeleteImage = () => {
    if (selectedImage) {
      deleteImageMutation.mutate(selectedImage.id);
      setIsDeleteDialogOpen(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!images || images.length === 0) {
    return (
      <div className="text-center p-8 border border-dashed rounded-lg">
        <ImageOff className="h-12 w-12 mx-auto text-gray-400" />
        <p className="mt-2 text-gray-500">No images uploaded yet</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {images.map((image) => (
          <div 
            key={image.id}
            className={`relative rounded-lg border-2 overflow-hidden aspect-square cursor-pointer transition
              ${selectedImage?.id === image.id ? 'border-primary' : 'border-transparent'}
              ${image.isMain ? 'ring-2 ring-amber-500 ring-offset-2' : ''}
            `}
            onClick={() => setSelectedImage(image)}
          >
            <img
              src={image.hasBgRemoved && image.bgRemovedUrl ? image.bgRemovedUrl : image.url}
              alt="Product"
              className="w-full h-full object-cover"
            />
            
            {image.isMain && (
              <div className="absolute top-2 right-2 bg-amber-500 text-white p-1 rounded-full">
                <Star className="h-4 w-4" />
              </div>
            )}
            
            {image.hasBgRemoved && (
              <div className="absolute bottom-2 left-2 bg-purple-500 text-white text-xs px-2 py-1 rounded">
                No BG
              </div>
            )}
          </div>
        ))}
      </div>
      
      {selectedImage && (
        <div className="p-4 border rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Selected Image</h3>
            <div className="text-xs text-gray-500">ID: {selectedImage.id}</div>
          </div>
          
          <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
            <img
              src={selectedImage.hasBgRemoved && selectedImage.bgRemovedUrl ? selectedImage.bgRemovedUrl : selectedImage.url}
              alt="Selected product"
              className="w-full h-full object-contain"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            {!selectedImage.isMain && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMainMutation.mutate(selectedImage.id)}
                disabled={setMainMutation.isPending}
              >
                {setMainMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Star className="h-4 w-4 mr-2" />
                )}
                Set as Main
              </Button>
            )}
            
            {selectedImage.isMain && (
              <Button
                variant="outline"
                size="sm"
                disabled
              >
                <StarOff className="h-4 w-4 mr-2" />
                Current Main Image
              </Button>
            )}
            
            {!selectedImage.hasBgRemoved && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeBackgroundMutation.mutate(selectedImage.id)}
                disabled={removeBackgroundMutation.isPending}
              >
                {removeBackgroundMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Remove Background
              </Button>
            )}
            
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={deleteImageMutation.isPending}
            >
              {deleteImageMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </Button>
          </div>
        </div>
      )}
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the image from the server.
              {selectedImage?.isMain && (
                <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900 rounded text-amber-600 dark:text-amber-400">
                  Warning: You are deleting the main product image.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteImage}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProductImageManager;