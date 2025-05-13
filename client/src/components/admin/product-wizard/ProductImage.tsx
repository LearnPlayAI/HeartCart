/**
 * ProductImage Component
 * 
 * A standardized component for displaying product images consistently across the application.
 * This ensures all product images have consistent styling, error handling, and fallbacks.
 */

import React, { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { ensureValidImageUrl, getImageAlt, getImageContainerClass, isMainImage } from '../../../utils/image-utils';
import { cn } from '@/lib/utils';

export interface ProductImageProps {
  image: any; // Image object or URL
  index?: number;
  mainImageIndex?: number | null;
  className?: string;
  containerClassName?: string;
  aspectRatio?: 'square' | '4/3' | '16/9' | 'auto';
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
  size?: 'sm' | 'md' | 'lg';
  onLoad?: () => void;
  onError?: (error: any) => void;
  onClick?: () => void;
  showBadge?: boolean;
}

const ProductImage: React.FC<ProductImageProps> = ({
  image,
  index = 0,
  mainImageIndex,
  className = '',
  containerClassName = '',
  aspectRatio = 'square',
  objectFit = 'cover',
  size = 'md',
  onLoad,
  onError,
  onClick,
  showBadge = false,
}) => {
  const [imageError, setImageError] = useState(false);
  
  // Determine if this is the main image
  const main = isMainImage(image, index, mainImageIndex);
  
  // Get a valid image URL
  const imageUrl = ensureValidImageUrl(image);
  
  // Get appropriate alt text
  const altText = getImageAlt(image, `Product image ${index + 1}`);
  
  // Build CSS classes
  const aspectRatioClass = {
    'square': 'aspect-square',
    '4/3': 'aspect-[4/3]',
    '16/9': 'aspect-[16/9]',
    'auto': '',
  }[aspectRatio];
  
  const objectFitClass = {
    'cover': 'object-cover',
    'contain': 'object-contain',
    'fill': 'object-fill',
    'none': '',
  }[objectFit];
  
  const sizeClass = {
    'sm': 'h-24 w-24',
    'md': 'h-40 w-full',
    'lg': 'h-64 w-full',
  }[size];
  
  const containerClass = getImageContainerClass(
    main, 
    cn('relative', aspectRatioClass, containerClassName),
    'ring-2 ring-primary'
  );
  
  // Handle image load event
  const handleLoad = () => {
    console.log(`Image loaded successfully: ${imageUrl}`);
    if (onLoad) onLoad();
  };
  
  // Handle image error event
  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error('Failed to load image:', imageUrl);
    setImageError(true);
    if (onError) onError(e);
  };
  
  return (
    <div 
      className={containerClass} 
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {imageError ? (
        <div className="flex items-center justify-center h-full w-full bg-muted">
          <ImageIcon className="h-10 w-10 text-muted-foreground" />
        </div>
      ) : (
        <>
          <img
            src={imageUrl}
            alt={altText}
            className={cn('w-full h-full', objectFitClass, sizeClass, className)}
            onLoad={handleLoad}
            onError={handleError}
          />
          
          {showBadge && main && (
            <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
              Main
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProductImage;