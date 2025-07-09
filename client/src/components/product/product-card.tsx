import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Star, StarHalf, Eye, ShoppingCart, ImageOff, Zap, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/use-cart';
import { formatCurrency, calculateDiscount } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import QuickViewModal from './quick-view-modal';
import DisclaimersModal from './disclaimers-modal';
import { Badge } from '@/components/ui/badge';
import type { Product } from '@shared/schema';
import { ensureValidImageUrl } from '@/utils/file-manager';
import { useCountdown } from '@/hooks/use-countdown';
import { FavouriteHeart } from '@/components/FavouriteHeart';
import { useAuth } from '@/hooks/use-auth';
import { 
  calculateProductPricing, 
  getCartPrice, 
  isPromotionActive, 
  getPromotionTimeRemaining,
  type PromotionInfo 
} from '@/utils/pricing';

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
        <span>{timeRemaining.days}d, {timeRemaining.hours}h</span>
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

// Promotion Time Left Progress Bar Component - for promotional deals
const PromotionTimeLeftProgressBar = ({ endDate }: { endDate: string | null }) => {
  // Safety check for required fields
  if (!endDate) {
    return null;
  }
  
  const { timeRemaining, isExpired } = useCountdown(new Date(endDate));
  
  // Calculate progress based on estimated promotion duration (assume 7 days for promotions)
  const promotionDuration = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  const timeRemaining_ms = timeRemaining.total;
  
  // Calculate percentage of time remaining (100% = full time left, 0% = expired)
  const progressPercentage = Math.max(0, Math.min(100, (timeRemaining_ms / promotionDuration) * 100));
  
  if (isExpired) {
    return (
      <div className="w-full">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Promotion Expired</span>
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
        <span>{timeRemaining.days}d, {timeRemaining.hours}h</span>
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
  promotionInfo?: PromotionInfo;
};

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isFlashDeal = false,
  soldPercentage,
  showAddToCart = false,
  promotionInfo,
}) => {
  const { addItem } = useCart();
  const { toast } = useToast();
  const { user } = useAuth();
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  // disclaimersModalOpen state removed - disclaimer now shown during checkout process only
  // pendingCartItem state removed - disclaimer now shown during checkout process only
  
  // Calculate unified pricing using centralized logic
  const pricing = calculateProductPricing(
    Number(product.price) || 0,
    product.salePrice ? Number(product.salePrice) : null,
    promotionInfo
  );

  // Get the correct cart price
  const cartPrice = getCartPrice(
    Number(product.price) || 0,
    product.salePrice ? Number(product.salePrice) : null,
    promotionInfo
  );
  
  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      // Check if product has required attributes by fetching attributes
      const attributesResponse = await fetch(`/api/product-attributes/product/${product.id}/attributes`);
      const attributesData = await attributesResponse.json();
      
      if (attributesData.success && attributesData.data.length > 0) {
        // Check if any attributes are required
        const hasRequiredAttributes = attributesData.data.some((attr: any) => attr.isRequired);
        
        if (hasRequiredAttributes) {
          // Open quick view modal instead of adding directly to cart
          setQuickViewOpen(true);
          
          return;
        }
      }
      
      // If no required attributes, add item directly to cart (no disclaimers modal)
      addItem({
        productId: product.id,
        quantity: 1,
        itemPrice: cartPrice,
        attributeSelections: {}
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

  // handleAcceptDisclaimers removed - disclaimer now shown during checkout process only
  
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
    <div data-product-id={product.id} className="product-card bg-white rounded-lg shadow-sm overflow-hidden w-full max-w-sm mx-auto">
      <Link href={`/product/id/${product.id}`} className="block relative" onClick={(event) => {
        // Save complete application state before navigating from grid view
        const urlParams = new URLSearchParams(window.location.search);
        const currentPage = parseInt(urlParams.get('page') || '1');
        
        // Try to get existing filter state from the parent page first (more reliable)
        const existingState = (window as any).productListingCurrentState || {};
        
        // Get current filter state from URL and localStorage as fallback
        const categoryId = existingState?.categoryId || urlParams.get('categoryId') || 'null';
        const searchQuery = existingState?.searchQuery || urlParams.get('search') || '';
        const sortBy = existingState?.sortBy || urlParams.get('sort') || 'newest';
        const viewMode = existingState?.viewMode || localStorage.getItem('productListingViewMode') || 'grid';
        
        // Create comprehensive state object preserving current filters
        const state = {
          page: currentPage,
          categoryId,
          searchQuery,
          sortBy,
          viewMode,
          priceRange: existingState?.priceRange || [0, 5000],
          ratingFilter: existingState?.ratingFilter || null,
          filters: existingState?.filters || {},
          attributeFilters: existingState?.attributeFilters || [],
          selectedCategory: existingState?.selectedCategory || null
        };
        
        // Save complete state to sessionStorage
        sessionStorage.setItem('productListingState', JSON.stringify(state));
        
        // Save scroll position relative to this product
        const productElement = (event.currentTarget as HTMLElement).closest('[data-product-id]') as HTMLElement;
        if (productElement) {
          const rect = productElement.getBoundingClientRect();
          const relativePosition = rect.top + window.scrollY;
          sessionStorage.setItem('productListingScrollPosition', relativePosition.toString());
          sessionStorage.setItem('productListingTargetProduct', product.id.toString());
          console.log('Saved complete state on product click (grid):', { 
            ...state,
            scroll: relativePosition, 
            productId: product.id 
          });
        } else {
          sessionStorage.setItem('productListingScrollPosition', window.scrollY.toString());
          console.log('Saved complete state on product click (grid fallback):', { ...state, scroll: window.scrollY });
        }
      }}>
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
            
            {/* Favourite Heart - positioned at bottom left */}
            <div className="absolute bottom-2 left-2">
              <FavouriteHeart
                productId={product.id}
                userId={user?.id}
                className="bg-white/80 backdrop-blur-sm"
                size={18}
              />
            </div>
            
            {/* Promotional overlays */}
            {promotionInfo && (
              <>
                {/* Time remaining indicator - top left of image */}
                {(() => {
                  const timeLeft = getPromotionTimeRemaining(promotionInfo.promotionEndDate);
                  return timeLeft && (
                    <div className="absolute top-2 left-2 bg-orange-500 text-white px-2 py-1 text-xs rounded shadow-lg z-10 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {timeLeft.days > 0 
                        ? `${timeLeft.days}d ${timeLeft.hours}h`
                        : `${timeLeft.hours}h ${timeLeft.minutes}m`
                      }
                    </div>
                  );
                })()}
                
                {/* Promotion name tag - top right */}
                <div className="absolute top-2 right-2 bg-[#FF1493] text-white px-2 py-1 text-xs rounded shadow-lg z-10">
                  {promotionInfo.promotionName}
                </div>
                
                {/* Promotion discount badge - bottom right */}
                <div className="absolute bottom-2 right-2 bg-red-500 text-white px-2 py-1 text-xs font-bold rounded-full shadow-lg z-10">
                  EXTRA {pricing.extraPromotionalDiscount || Math.round(parseFloat(String(promotionInfo.promotionDiscount)))}% OFF!
                </div>
              </>
            )}

            {/* Regular discount badge - positioned in lower right when no promotion */}
            {!promotionInfo && product.discountLabel && (
              <div className="absolute bottom-2 right-2">
                <Badge 
                  className="inline-flex items-center border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent hover:bg-blue-600 text-white text-xs px-2 py-1 rounded-md shadow-sm bg-[#1ac20c]"
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
          
          <div className="flex items-start justify-between mt-1">
            <div className="flex flex-col">
              {/* Display calculated price */}
              <span className="text-[#FF69B4] font-bold text-lg">
                {formatCurrency(pricing.displayPrice)}
              </span>
              
              {/* Show original price crossed out when there's a discount */}
              {pricing.hasDiscount && (
                <span className="text-gray-500 text-xs line-through">
                  {formatCurrency(pricing.originalPrice)}
                </span>
              )}
            </div>
            
            <div className="ml-2 flex flex-col gap-1">
              {/* Discount Percentage Badge */}
              {pricing.hasDiscount && (
                <Badge className="bg-[#FF69B4] hover:bg-[#FF1493] text-white text-xs px-2 py-1 rounded-md font-medium">
                  {pricing.discountPercentage}% OFF
                </Badge>
              )}
              
              {/* Inactive Badge - Only visible to admins */}
              {user?.role === 'admin' && product.isActive === false && (
                <Badge className="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded-md font-medium">
                  INACTIVE
                </Badge>
              )}
            </div>
          </div>
          
          {isFlashDeal && (
            <div className="mt-2 mb-1">
              {/* Show countdown for promotional products or products with special sale end */}
              {(promotionInfo?.promotionEndDate || product.specialSaleEnd) && (
                <PromotionTimeLeftProgressBar 
                  endDate={promotionInfo?.promotionEndDate || product.specialSaleEnd} 
                />
              )}
            </div>
          )}
          
          {/* Always show rating and reviews for all product cards */}
          <div className="flex items-center mt-1 mb-1">
            <div className="flex text-yellow-400 text-xs">
              {renderStars(product.rating)}
            </div>
            <span className="text-xs text-gray-500 ml-1">
              {product.rating ? product.rating.toFixed(1) : "0.0"} ({product.reviewCount || 0})
            </span>
          </div>
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
      
      {/* Disclaimers Modal */}
      <DisclaimersModal
        open={disclaimersModalOpen}
        onOpenChange={setDisclaimersModalOpen}
        onAccept={handleAcceptDisclaimers}
        productName={product.name}
      />
    </div>
  );
};

export default ProductCard;
