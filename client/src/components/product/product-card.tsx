import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Star, StarHalf, Eye, ShoppingCart, ImageOff, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/use-cart';
import { formatCurrency, calculateDiscount } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import QuickViewModal from './quick-view-modal';
import { Badge } from '@/components/ui/badge';
import type { Product } from '@shared/schema';
import { ensureValidImageUrl } from '@/utils/file-manager';
import { useCountdown } from '@/hooks/use-countdown';

// Flash Deal Timer Component 
const FlashDealTimer = ({ endDate }: { endDate: Date }) => {
  const { humanReadableTime } = useCountdown(endDate);
  
  return (
    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
      {humanReadableTime}
    </span>
  );
};

// Time Left Progress Bar Component
const TimeLeftProgressBar = ({ product }: { product: Product }) => {
  // Safety check for required fields - use specialSaleEnd for special deals
  if (!product.specialSaleEnd) {
    return null;
  }
  
  const { timeRemaining, isExpired } = useCountdown(new Date(product.specialSaleEnd));
  
  // Calculate progress based on actual deal duration using product's start and end dates
  const dealStartDate = product.specialSaleStart ? new Date(product.specialSaleStart) : new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
  const dealEndDate = new Date(product.specialSaleEnd);
  const totalDealDuration = dealEndDate.getTime() - dealStartDate.getTime();
  const timeRemaining_ms = timeRemaining.total;
  
  // Calculate percentage of time remaining (100% = full time left, 0% = expired)
  const progressPercentage = Math.max(0, Math.min(100, (timeRemaining_ms / totalDealDuration) * 100));
  
  if (isExpired) {
    return (
      <div className="w-full">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Deal Expired</span>
          <span>0%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div className="bg-gray-400 h-1.5 rounded-full w-0"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>Time Left</span>
        <span>{Math.round(progressPercentage)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div 
          className="bg-gradient-to-r from-red-500 to-[#FF69B4] h-1.5 rounded-full transition-all duration-1000" 
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
    </div>
  );
};

type ProductCardProps = {
  product: Product;
  isFlashDeal?: boolean;
  soldPercentage?: number;
  showAddToCart?: boolean;
};

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isFlashDeal = false,
  soldPercentage,
  showAddToCart = false,
}) => {
  const { addItem } = useCart();
  const { toast } = useToast();
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const discount = product.salePrice
    ? calculateDiscount(product.price, product.salePrice)
    : 0;
  
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      addItem({
        productId: product.id,
        quantity: 1
      });
      
      toast({
        title: "Added to cart",
        description: `${product.name} has been added to your cart.`,
        duration: 2000,
      });
    } catch (error) {
      console.error('Error adding item to cart:', error);
      
      toast({
        title: "Failed to add to cart",
        description: "There was a problem adding this item to your cart. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };
  
  const renderStars = (rating: number | null = 0) => {
    const stars = [];
    const actualRating = rating || 0;
    const fullStars = Math.floor(actualRating);
    const hasHalfStar = actualRating % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={`star-${i}`} className="fill-yellow-400 text-yellow-400 w-3 h-3" />);
    }
    
    if (hasHalfStar) {
      stars.push(<StarHalf key="half-star" className="fill-yellow-400 text-yellow-400 w-3 h-3" />);
    }
    
    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-star-${i}`} className="text-yellow-400 w-3 h-3" />);
    }
    
    return stars;
  };
  
  // All product cards will use a consistent design based on the Featured Products style
  return (
    <div className="product-card bg-white rounded-lg shadow-sm overflow-hidden min-w-[240px]">
      <Link href={`/product/id/${product.id}`} className="block relative">
        {imageError ? (
          <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
            <ImageOff className="w-10 h-10 text-gray-400" />
          </div>
        ) : (
          <div className="relative">
            <img 
              src={product.imageUrl ? ensureValidImageUrl(product.imageUrl) : (product.originalImageObjectKey ? ensureValidImageUrl(product.originalImageObjectKey) : '')} 
              alt={product.name || 'Product image'} 
              className="w-full h-48 object-cover"
              onError={() => setImageError(true)}
            />
            
            {/* Discount Badge - positioned in lower right */}
            {product.discountLabel && (
              <div className="absolute bottom-2 right-2">
                <Badge 
                  className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded-md shadow-sm"
                >
                  {product.discountLabel}
                </Badge>
              </div>
            )}
          </div>
        )}
        
        <div className="p-3">
          <h3 className="text-sm font-medium text-gray-800 line-clamp-2 h-10">
            {product.name}
          </h3>
          
          <div className="flex items-baseline mt-1">
            <span className="text-[#FF69B4] font-bold text-lg">
              {formatCurrency(product.salePrice || product.price)}
            </span>
            {product.salePrice && (
              <span className="text-gray-500 text-xs ml-1 line-through">
                {formatCurrency(product.price)}
              </span>
            )}
            {discount > 0 && (
              <span className="ml-2 text-xs bg-[#FF69B4]/10 text-[#FF69B4] px-1 rounded">
                -{discount}%
              </span>
            )}
          </div>
          
          {isFlashDeal && (
            <div className="mt-2 mb-1">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="bg-[#FF69B4]/10 text-[#FF69B4] border-[#FF69B4]/30 flex items-center gap-1 px-2 py-0.5">
                  <Zap className="h-3 w-3" />
                  <span className="text-xs">Special Deal</span>
                </Badge>
                {product.flashDealEnd && (
                  <FlashDealTimer endDate={new Date(product.flashDealEnd)} />
                )}
              </div>
              {product.flashDealEnd && (
                <TimeLeftProgressBar product={product} />
              )}
            </div>
          )}
          
          {!isFlashDeal && (
            <div className="flex items-center mt-1 mb-1">
              <div className="flex text-yellow-400 text-xs">
                {renderStars(product.rating)}
              </div>
              <span className="text-xs text-gray-500 ml-1">
                {product.rating ? product.rating.toFixed(1) : "0.0"} ({product.reviewCount || 0})
              </span>
            </div>
          )}
        </div>
      </Link>
      <div className="px-3 pb-3 flex flex-col gap-2">
        {showAddToCart && (
          <Button 
            className="w-full bg-[#FF69B4] hover:bg-[#FF1493] text-white py-1.5 rounded-full text-sm font-medium transition-colors duration-200"
            onClick={handleAddToCart}
          >
            <ShoppingCart className="h-4 w-4 mr-1" />
            Add to Cart
          </Button>
        )}
        
        <Button
          variant="outline"
          className="w-full rounded-full text-sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setQuickViewOpen(true);
          }}
        >
          <Eye className="h-4 w-4 mr-1" />
          Quick View
        </Button>
      </div>
      {/* Quick View Modal */}
      <QuickViewModal
        open={quickViewOpen}
        onOpenChange={setQuickViewOpen}
        productId={product.id}
      />
    </div>
  );
};

export default ProductCard;
