import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, Tag, Zap, ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import ProductCard from '@/components/product/product-card';
import { Link } from 'wouter';
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

// Calculate countdown timer for promotions (same as flash-deals)
const getTimeRemaining = (endDate: string) => {
  const now = new Date().getTime();
  const end = new Date(endDate).getTime();
  const timeLeft = end - now;
  
  if (timeLeft <= 0) return null;
  
  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  
  return { days, hours, minutes };
};

function PromotionsPage() {
  // Fetch active promotions with their products using the exact same API as flash deals
  interface ApiResponse {
    success: boolean;
    data: PromotionWithProducts[];
  }
  
  const { data: response, isLoading, error, refetch } = useQuery<ApiResponse>({
    queryKey: ['/api/promotions/active-with-products'],
    staleTime: 0, // No cache - always fetch fresh promotional data
    gcTime: 0, // Don't keep in cache when component unmounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Always refetch on mount
  });
  
  // Extract active promotions and their products (same as flash-deals)
  const activePromotions = response?.success ? response.data : [];
  const allPromotionProducts = activePromotions.flatMap(promo => 
    promo.products?.map(pp => ({
      ...pp.product,
      salePrice: pp.promotionalPrice || pp.product?.salePrice || 0,
      originalSalePrice: pp.product?.salePrice || 0,
      promotionName: promo.promotionName,
      promotionDiscount: pp.discountOverride || promo.discountValue,
      promotionDiscountType: promo.discountType,
      promotionEndDate: promo.endDate,
      extraDiscountPercentage: pp.additionalDiscountPercentage || 0,
      promotionalPrice: pp.promotionalPrice
    })) || []
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-[#FF69B4] to-[#FF1493] text-white">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center mb-4">
              <Link href="/" className="flex items-center text-white hover:text-gray-200 mr-4">
                <ArrowLeft className="h-5 w-5 mr-1" />
                Back to Home
              </Link>
            </div>
            <div className="flex items-center">
              <Zap className="h-8 w-8 mr-3" />
              <div>
                <h1 className="text-3xl font-bold">All Promotions</h1>
                <p className="text-lg opacity-90">Loading amazing deals...</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Loading Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <Card key={index} className="h-64 animate-pulse bg-gray-100">
                <div className="h-36 bg-gray-200 rounded-t-lg"></div>
                <div className="p-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-[#FF69B4] to-[#FF1493] text-white">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center mb-4">
              <Link href="/" className="flex items-center text-white hover:text-gray-200 mr-4">
                <ArrowLeft className="h-5 w-5 mr-1" />
                Back to Home
              </Link>
            </div>
            <div className="flex items-center">
              <Zap className="h-8 w-8 mr-3" />
              <div>
                <h1 className="text-3xl font-bold">All Promotions</h1>
                <p className="text-lg opacity-90">Failed to load promotions</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Error Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-8">
            <div className="text-red-500 mb-2">Failed to load promotional deals</div>
            <button 
              className="px-4 py-2 rounded-md border border-[#FF69B4] text-[#FF69B4] hover:bg-[#FF69B4] hover:text-white transition-colors"
              onClick={() => refetch()}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section - identical to flash deals */}
      <div className="bg-gradient-to-r from-[#FF69B4] to-[#FF1493] text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center mb-4">
            <Link href="/" className="flex items-center text-white hover:text-gray-200 mr-4">
              <ArrowLeft className="h-5 w-5 mr-1" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>

      {/* Promotions header section with timer - identical to flash deals */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-6">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            <Zap className="mr-2 text-[#FF69B4]" />
            Active Promotions
          </h2>
          
          {/* Show active promotion timers - identical to flash deals */}
          {activePromotions.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {activePromotions.map((promo) => {
                const timeLeft = getTimeRemaining(promo.endDate);
                return (
                  <div key={promo.id} className="flex items-center text-white/90 text-sm">
                    <Tag className="w-3 h-3 mr-1" />
                    <span className="mr-2 bg-black text-white px-2 py-1 rounded">{promo.promotionName}</span>
                    {timeLeft && (
                      <div className="flex items-center text-xs bg-orange-500 text-white px-2 py-1 rounded">
                        <Clock className="w-3 h-3 mr-1" />
                        {timeLeft.days > 0 
                          ? `${timeLeft.days}d ${timeLeft.hours}h left`
                          : `${timeLeft.hours}h ${timeLeft.minutes}m left`
                        }
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Products grid - EXACTLY the same as flash deals */}
      <div className="p-4 bg-[#ff68b32e]">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {allPromotionProducts.length > 0 ? (
              // Show promotion products - identical logic to flash deals
              allPromotionProducts.map((product: any) => {
                const soldPercentage = Math.floor((product.id * 17) % 100);
                
                return (
                  <div key={`${product.id}-${product.promotionName}`} className="relative">
                    <ProductCard
                      product={product}
                      isFlashDeal={true}
                      soldPercentage={soldPercentage}
                      showAddToCart={true}
                      promotionInfo={{
                        promotionName: product.promotionName,
                        promotionDiscount: product.extraDiscountPercentage || product.promotionDiscount,
                        promotionDiscountType: product.promotionDiscountType,
                        promotionEndDate: product.promotionEndDate,
                        promotionalPrice: product.promotionalPrice
                      }}
                    />
                  </div>
                );
              })
            ) : (
              // Show empty state - identical to flash deals
              <div className="col-span-full text-center py-8">
                <div className="text-gray-500 mb-2">No promotional deals available at the moment</div>
                <div className="text-sm text-gray-400">Check back later for exciting deals!</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PromotionsPage;