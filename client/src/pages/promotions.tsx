import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, Tag, Zap, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  promotionProducts?: PromotionProduct[];
}

function getTimeRemaining(endDate: string) {
  const end = new Date(endDate).getTime();
  const now = new Date().getTime();
  const timeLeft = end - now;

  if (timeLeft <= 0) return null;

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

function PromotionCard({ promotion }: { promotion: Promotion }) {
  const timeLeft = getTimeRemaining(promotion.endDate);
  const products = promotion.promotionProducts || [];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-[#FF69B4] to-[#FF1493] text-white">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-lg">
            <Tag className="mr-2 w-5 h-5" />
            {promotion.promotionName}
          </CardTitle>
          {timeLeft && (
            <Badge variant="secondary" className="bg-white/20 text-white">
              <Clock className="mr-1 w-3 h-3" />
              {timeLeft}
            </Badge>
          )}
        </div>
        {promotion.description && (
          <p className="text-white/90 text-sm mt-2">{promotion.description}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="secondary" className="bg-white/20 text-white">
            {promotion.discountType === 'percentage' 
              ? `${promotion.discountValue}% OFF` 
              : `R${promotion.discountValue} OFF`
            }
          </Badge>
          <Badge variant="secondary" className="bg-white/20 text-white">
            {products.length} product{products.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.slice(0, 8).map((promotionProduct) => (
              <ProductCard 
                key={promotionProduct.id} 
                product={promotionProduct.product}
                promotionInfo={{
                  promotionName: promotion.promotionName,
                  promotionDiscount: promotion.discountValue,
                  promotionDiscountType: promotion.discountType,
                  promotionEndDate: promotion.endDate,
                  promotionalPrice: promotionProduct.promotionalPrice ? Number(promotionProduct.promotionalPrice) : null
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Zap className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No products in this promotion yet</p>
          </div>
        )}
        
        {products.length > 8 && (
          <div className="mt-4 text-center">
            <Link href={`/promotion/${promotion.id}`}>
              <Button variant="outline" className="w-full">
                View all {products.length} products
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PromotionsPage() {
  const { data: response, isLoading, error } = useQuery<any>({
    queryKey: ['/api/promotions'],
  });

  const promotions = response?.data || [];
  const activePromotions = promotions.filter((promo) => promo.isActive);
  const upcomingPromotions = promotions.filter((promo) => 
    !promo.isActive && new Date(promo.startDate) > new Date()
  );

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <Zap className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">
            Unable to load promotions
          </h2>
          <p className="text-gray-500">
            Please try again later or contact support if the problem persists.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
          <Zap className="mr-3 text-[#FF69B4]" />
          Special Promotions
        </h1>
        <p className="text-gray-600">
          Discover amazing deals and limited-time offers on your favorite products
        </p>
      </div>

      {/* Active Promotions */}
      {activePromotions.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
            <Tag className="mr-2 text-[#FF69B4]" />
            Active Promotions
            <Badge variant="secondary" className="ml-2 bg-[#FF69B4]/10 text-[#FF69B4]">
              {activePromotions.length} active
            </Badge>
          </h2>
          <div className="grid gap-6">
            {activePromotions.map(promotion => (
              <PromotionCard key={promotion.id} promotion={promotion} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Promotions */}
      {upcomingPromotions.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
            <Clock className="mr-2 text-gray-500" />
            Coming Soon
            <Badge variant="secondary" className="ml-2 bg-gray-100 text-gray-600">
              {upcomingPromotions.length} upcoming
            </Badge>
          </h2>
          <div className="grid gap-6">
            {upcomingPromotions.map(promotion => (
              <PromotionCard key={promotion.id} promotion={promotion} />
            ))}
          </div>
        </section>
      )}

      {/* No Promotions State */}
      {promotions.length === 0 && (
        <div className="text-center py-16">
          <Zap className="w-20 h-20 mx-auto mb-6 text-gray-300" />
          <h2 className="text-2xl font-semibold text-gray-600 mb-4">
            No promotions available
          </h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Check back soon for exciting deals and special offers on our products.
          </p>
          <Link href="/">
            <Button className="bg-[#FF69B4] hover:bg-[#FF1493]">
              Continue Shopping
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

export default PromotionsPage;