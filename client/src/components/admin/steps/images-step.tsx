import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import ProductImageUploader from '../product-image-uploader';
import ProductImageManager from '../product-image-manager';

interface ImagesStepProps {
  productId?: number;
  uploadedImages: any[];
  setUploadedImages: (images: any[]) => void;
}

export function ImagesStep({ 
  productId, 
  uploadedImages, 
  setUploadedImages 
}: ImagesStepProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  // Fetch product images if editing
  useEffect(() => {
    const fetchProductImages = async () => {
      if (!productId) return;
      
      try {
        const res = await fetch(`/api/products/${productId}/images`);
        if (!res.ok) throw new Error('Failed to fetch product images');
        const images = await res.json();
        setUploadedImages(images);
        setImageLoaded(true);
      } catch (error) {
        console.error('Error fetching product images:', error);
      }
    };
    
    if (productId && !imageLoaded) {
      fetchProductImages();
    }
  }, [productId, setUploadedImages, imageLoaded]);

  return (
    <div className="space-y-6">
      <div className="bg-pink-50 dark:bg-pink-900/10 p-4 rounded-lg border border-pink-100 dark:border-pink-900/30 mb-6">
        <h3 className="text-lg font-medium text-pink-800 dark:text-pink-300 mb-2">Product Images</h3>
        <p className="text-sm text-pink-700 dark:text-pink-400">
          Upload high-quality images of your product. You can add multiple images, remove backgrounds, and set a main product image.
        </p>
      </div>

      {productId ? (
        <>
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Current Images</h3>
            <p className="text-sm text-gray-500">Manage your product images</p>
            <ProductImageManager productId={productId} />
          </div>
          
          <div className="space-y-2 pt-6 border-t">
            <h3 className="text-lg font-medium">Upload New Images</h3>
            <p className="text-sm text-gray-500">Add more images to your product</p>
            <ProductImageUploader 
              productId={productId}
              onUploadComplete={() => {
                queryClient.invalidateQueries({ queryKey: [`/api/products/${productId}/images`] });
              }}
            />
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="border rounded-md p-4 bg-zinc-50 dark:bg-zinc-900">
            <h3 className="text-md font-medium mb-2">Image Upload</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              After saving the basic product information, you'll be able to upload and manage product images.
            </p>
            <div className="bg-zinc-200 dark:bg-zinc-800 rounded-md p-10 flex items-center justify-center">
              <p className="text-zinc-500 dark:text-zinc-400 text-center">
                Please save the product first to upload images
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}