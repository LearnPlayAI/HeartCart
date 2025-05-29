import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/product/product-card';
import type { Product } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import type { StandardApiResponse } from '@/types/api';

const FeaturedProductsSection = () => {
  const [page, setPage] = useState(1);
  const limit = 10;
  const { toast } = useToast();
  
  const { data: response, isLoading, isFetching, error, refetch } = useQuery<StandardApiResponse<Product[]>>({
    queryKey: ['/api/featured-products', { limit, offset: (page - 1) * limit }],
  });
  
  // Extract the featured products from the standardized response
  const featuredProducts = response?.success ? response.data : [];
  
  // Handle error state gracefully
  useEffect(() => {
    if (error) {
      console.error('Error fetching featured products:', error);
      toast({
        title: "Error loading featured products",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    }
  }, [error, toast]);
  
  const loadMore = () => {
    setPage(prev => prev + 1);
  };
  
  return (
    <section id="featuredProducts" className="mb-4 md:mb-8 bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-gradient-to-r from-[#FF69B4] to-[#FF1493] p-4">
        <h2 className="text-white text-xl font-bold flex items-center">
          Featured Products
        </h2>
      </div>
      <div className="p-4 bg-[#ff68b32e]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {isLoading ? (
            // Show skeleton loaders while loading
            Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                <div className="h-48 bg-gray-200"></div>
                <div className="p-3">
                  <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-full mt-2"></div>
                </div>
              </div>
            ))
          ) : error ? (
            // Show error state
            <div className="col-span-full py-8 text-center">
              <div className="text-red-500 mb-2">Failed to load featured products</div>
              <Button 
                variant="outline"
                className="border-[#FF69B4] text-[#FF69B4] hover:bg-[#FF69B4] hover:text-white"
                onClick={() => refetch()}
              >
                Retry
              </Button>
            </div>
          ) : featuredProducts.length === 0 ? (
            // Show empty state
            <div className="col-span-full py-8 text-center text-gray-500">
              No featured products available at the moment
            </div>
          ) : (
            // Show products
            featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isFlashDeal={false}
                showAddToCart={true}
              />
            ))
          )}
        </div>
      </div>
      {!isLoading && !error && featuredProducts.length > 0 && (
        <div className="p-3 border-t border-gray-200 flex justify-center">
          <Button 
            variant="outline"
            className="border-[#FF69B4] text-[#FF69B4] hover:bg-[#FF69B4] hover:text-white"
            onClick={loadMore}
            disabled={isFetching}
          >
            {isFetching ? 'Loading...' : 'Load More Products'}
          </Button>
        </div>
      )}
    </section>
  );
};

export default FeaturedProductsSection;
