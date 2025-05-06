import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/product/product-card';
import type { Product } from '@shared/schema';

const FeaturedProductsSection = () => {
  const [page, setPage] = useState(1);
  const limit = 10;
  
  const { data: featuredProducts, isLoading, isFetching } = useQuery<Product[]>({
    queryKey: ['/api/featured-products', { limit, offset: (page - 1) * limit }],
  });
  
  const loadMore = () => {
    setPage(prev => prev + 1);
  };
  
  return (
    <section id="featuredProducts" className="mb-8">
      <h2 className="text-xl font-bold mb-4">Featured Products</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
        ) : (
          featuredProducts?.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isFlashDeal={false}
              showAddToCart={true}
            />
          ))
        )}
      </div>
      
      <div className="flex justify-center mt-6">
        <Button 
          variant="outline"
          className="border-[#FF69B4] text-[#FF69B4] hover:bg-[#FF69B4] hover:text-white"
          onClick={loadMore}
          disabled={isFetching}
        >
          {isFetching ? 'Loading...' : 'Load More Products'}
        </Button>
      </div>
    </section>
  );
};

export default FeaturedProductsSection;
