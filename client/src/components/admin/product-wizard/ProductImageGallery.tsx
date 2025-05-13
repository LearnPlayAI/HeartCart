/**
 * ProductImageGallery Component
 * 
 * A reusable gallery component for displaying product images.
 * It handles different layouts and provides a consistent interface
 * for displaying multiple product images.
 */

import React from 'react';
import ProductImage from './ProductImage';
import { cn } from '@/lib/utils';

export interface ProductImageGalleryProps {
  images: any[]; // Array of image objects or URLs
  mainImageIndex?: number | null;
  layout?: 'grid' | 'list' | 'carousel';
  columns?: 1 | 2 | 3 | 4;
  aspectRatio?: 'square' | '4/3' | '16/9' | 'auto';
  className?: string;
  imageSize?: 'sm' | 'md' | 'lg';
  onImageClick?: (image: any, index: number) => void;
  showBadges?: boolean;
  emptyState?: React.ReactNode;
}

const ProductImageGallery: React.FC<ProductImageGalleryProps> = ({
  images = [],
  mainImageIndex,
  layout = 'grid',
  columns = 3,
  aspectRatio = 'square',
  className = '',
  imageSize = 'md',
  onImageClick,
  showBadges = false,
  emptyState,
}) => {
  // Handle empty images array
  if (!images || images.length === 0) {
    if (emptyState) {
      return <>{emptyState}</>;
    }
    
    return (
      <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-md text-muted-foreground">
        <p>No images available</p>
      </div>
    );
  }
  
  // Generate grid columns class based on columns prop
  const gridColumnsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
  }[columns];
  
  // Determine layout component to render
  const renderLayout = () => {
    switch (layout) {
      case 'list':
        return (
          <div className="space-y-4">
            {images.map((image, index) => (
              <ProductImage
                key={index}
                image={image}
                index={index}
                mainImageIndex={mainImageIndex}
                aspectRatio={aspectRatio}
                size={imageSize}
                showBadge={showBadges}
                onClick={onImageClick ? () => onImageClick(image, index) : undefined}
              />
            ))}
          </div>
        );
        
      case 'carousel':
        // Simple carousel, can be enhanced with proper carousel components
        return (
          <div className="flex overflow-x-auto space-x-4 pb-2">
            {images.map((image, index) => (
              <div key={index} className="flex-shrink-0 w-48">
                <ProductImage
                  image={image}
                  index={index}
                  mainImageIndex={mainImageIndex}
                  aspectRatio={aspectRatio}
                  size={imageSize}
                  showBadge={showBadges}
                  onClick={onImageClick ? () => onImageClick(image, index) : undefined}
                />
              </div>
            ))}
          </div>
        );
        
      case 'grid':
      default:
        return (
          <div className={cn('grid gap-4', gridColumnsClass)}>
            {images.map((image, index) => (
              <ProductImage
                key={index}
                image={image}
                index={index}
                mainImageIndex={mainImageIndex}
                aspectRatio={aspectRatio}
                size={imageSize}
                showBadge={showBadges}
                onClick={onImageClick ? () => onImageClick(image, index) : undefined}
              />
            ))}
          </div>
        );
    }
  };
  
  return (
    <div className={className}>
      {renderLayout()}
    </div>
  );
};

export default ProductImageGallery;