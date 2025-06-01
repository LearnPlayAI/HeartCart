import React from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Zap, Clock, Tag } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ProductCard from '@/components/product/product-card';
import type { Product } from '@shared/schema';

interface PromotionProduct {
  id: number;
  productId: number;
  promotionId: number;
  discountOverride?: number;
  createdAt: string;
  product: Product;
}

interface Promotion {
  id: number;
  promotionName: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PromotionWithProducts extends Promotion {
  products: PromotionProduct[];
}

const FlashDealsSection = () => {
  // Fetch active promotions with their products
  interface ApiResponse {
    success: boolean;
    data: PromotionWithProducts[];
  }
  
  const { data: response, isLoading, error, refetch } = useQuery<ApiResponse>({
    queryKey: ['/api/promotions/active-with-products'],
  });
  
  // Extract active promotions and their products
  const activePromotions = response?.success ? response.data : [];
  const allPromotionProducts = activePromotions.flatMap(promo => 
    promo.products?.map(pp => ({
      ...pp.product,
      promotionName: promo.promotionName,
      promotionDiscount: pp.discountOverride || promo.discountValue,
      promotionDiscountType: promo.discountType,
      promotionEndDate: promo.endDate
    })) || []
  );
  
  // Calculate countdown timer for promotions
  const getTimeRemaining = (endDate: string) => {
    const now = new Date().getTime();
    const end = new Date(endDate).getTime();
    const timeLeft = end - now;
    
    if (timeLeft <= 0) return null;
    
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours, minutes };
  };

  // Handle error state gracefully
  React.useEffect(() => {
    if (error) {
      console.error('Error fetching active promotions:', error);
    }
  }, [error]);

  // Don't render if no promotions available
  if (!isLoading && allPromotionProducts.length === 0) {
    return null;
  }
  
  return (
    <section className="mb-4 md:mb-8 bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-gradient-to-r from-[#FF69B4] to-[#FF1493] p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white text-xl font-bold flex items-center">
            <Zap className="mr-2" /> Special Deals
            {activePromotions.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-white/20 text-white">
                {activePromotions.length} active promotion{activePromotions.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </h2>
          {activePromotions.length > 0 && (
            <Link href="/promotions" className="text-white/80 hover:text-white text-sm">
              View all promotions →
            </Link>
          )}
        </div>
        {activePromotions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {activePromotions.slice(0, 3).map(promo => {
              const timeLeft = getTimeRemaining(promo.endDate);
              return (
                <div key={promo.id} className="flex items-center text-white/90 text-sm">
                  <Tag className="w-3 h-3 mr-1" />
                  <span className="mr-2">{promo.promotionName}</span>
                  {timeLeft && (
                    <div className="flex items-center text-xs bg-white/20 px-2 py-1 rounded">
                      <Clock className="w-3 h-3 mr-1" />
                      {timeLeft.hours}h {timeLeft.minutes}m left
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="p-4 bg-[#ff68b32e]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {isLoading ? (
            // Show skeleton loaders while loading
            (Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="h-64 animate-pulse bg-gray-100">
                <div className="h-36 bg-gray-200 rounded-t-lg"></div>
                <div className="p-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </Card>
            )))
          ) : error ? (
            // Show error state
            (<div className="col-span-full py-8 text-center">
              <div className="text-red-500 mb-2">Failed to load promotional deals</div>
              <button 
                className="px-4 py-2 rounded-md border border-[#FF69B4] text-[#FF69B4] hover:bg-[#FF69B4] hover:text-white transition-colors"
                onClick={() => refetch()}
              >
                Retry
              </button>
            </div>)
          ) : allPromotionProducts.length > 0 ? (
            // Show promotion products
            (allPromotionProducts.slice(0, 8).map((product: any) => {
              const soldPercentage = Math.floor((product.id * 17) % 100);
              
              return (
                <div key={`${product.id}-${product.promotionName}`} className="relative">
                  <ProductCard
                    product={product}
                    isFlashDeal={true}
                    soldPercentage={soldPercentage}
                    showAddToCart={true}
                  />
                  {/* Promotion discount badge */}
                  <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 text-xs font-bold rounded-full shadow-lg z-10">
                    {product.promotionDiscountType === 'percentage' 
                      ? `${product.promotionDiscount}% OFF`
                      : `${product.promotionDiscount}% OFF`
                    }
                  </div>
                  {/* Promotion name tag */}
                  <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 text-xs rounded shadow-lg z-10">
                    {product.promotionName}
                  </div>
                  {/* Time remaining indicator - moved to bottom right corner */}
                  {(() => {
                    const timeLeft = getTimeRemaining(product.promotionEndDate);
                    return timeLeft && (
                      <div className="absolute bottom-2 right-2 bg-orange-500 text-white px-2 py-1 text-xs rounded shadow-lg z-10 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {timeLeft.hours}h {timeLeft.minutes}m
                      </div>
                    );
                  })()}
                </div>
              );
            }))
          ) : (
            // Show empty state
            (<div className="col-span-full text-center py-8">
              <div className="text-gray-500 mb-2">No promotional deals available at the moment</div>
              <div className="text-sm text-gray-400">Check back later for exciting deals!</div>
            </div>)
          )}
        </div>
      </div>
      <div className="p-3 border-t border-gray-200 flex justify-center">
        <Link href="/promotions" className="text-[#FF69B4] font-medium hover:underline flex items-center">
          View all promotions 
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </Link>
      </div>
    </section>
  );
};

export default FlashDealsSection;
