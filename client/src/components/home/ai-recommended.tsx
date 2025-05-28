import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bot } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { Link } from 'wouter';
import type { Product } from '@shared/schema';

type AiRecommendationResponse = {
  products: Product[];
  reason: string;
  timestamp: string;
};

// Define the standardized API response types
interface ApiRecommendationResponse {
  success: boolean;
  data: AiRecommendationResponse;
}

interface ApiFeaturedResponse {
  success: boolean;
  data: Product[];
}

const AIRecommendedProducts = () => {
  const { data: recommendationsResponse, isLoading, error } = useQuery<ApiRecommendationResponse>({
    queryKey: ['/api/recommendations'],
    // Return empty array on 401 (not authenticated)
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Extract the recommendations from the standardized response
  const recommendations = recommendationsResponse?.data;
  
  // Fallback products if AI recommendations fail or user is not authenticated
  const { data: fallbackResponse } = useQuery<ApiFeaturedResponse>({
    queryKey: ['/api/featured-products', { limit: 4 }],
    enabled: !!error || !recommendations || recommendations?.products.length === 0,
  });
  
  // Extract the fallback products from the standardized response
  const fallbackProducts = fallbackResponse?.data || [];
  
  const productsToShow = recommendations?.products.length ? recommendations.products : fallbackProducts;
  
  return (
    <section className="mb-4 md:mb-8 bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-gradient-to-r from-[#FF69B4] to-[#FF1493] p-4">
        <div className="flex items-center">
          <h2 className="text-white text-xl font-bold flex-1">Recommended For You</h2>
          <span className="text-xs bg-white/20 text-white px-2 py-1 rounded-full flex items-center">
            <Bot className="mr-1 h-3 w-3" /> AI Powered
          </span>
        </div>
      </div>
      <div className="p-4 bg-[#ff68b32e]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {isLoading ? (
          // Show skeleton loaders while loading
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <Skeleton className="h-40 rounded-t-lg" />
              <CardContent className="p-3">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-4 w-5/6" />
              </CardContent>
            </Card>
          ))
        ) : productsToShow?.length ? (
          productsToShow.map((product) => (
            <Link 
              key={product.id} 
              href={`/product/${product.slug}`}
              className="product-card bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="relative">
                <img 
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-40 object-cover"
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
              <div className="p-3">
                <h3 className="text-sm font-medium text-gray-800 mb-1 line-clamp-2">
                  {product.name}
                </h3>
                <div className="flex items-baseline mb-2">
                  <span className="text-[#FF69B4] font-bold">
                    {product.salePrice 
                      ? formatCurrency(product.salePrice) 
                      : formatCurrency(product.price)}
                  </span>
                  {product.salePrice && (
                    <span className="text-gray-500 text-xs ml-1 line-through">
                      {formatCurrency(product.price)}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  <div className="flex items-center">
                    <Bot className="text-[#FF69B4] mr-1 h-3 w-3" />
                    {recommendations?.reason || 'Based on your browsing'}
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-4 py-8 text-center text-gray-500">
            Sign in to see personalized recommendations
          </div>
        )}
        </div>
      </div>
    </section>
  );
};

export default AIRecommendedProducts;
