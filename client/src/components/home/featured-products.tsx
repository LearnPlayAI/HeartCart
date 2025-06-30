import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/product/product-card';
import type { Product } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import type { StandardApiResponse } from '@/types/api';

const FeaturedProductsSection = () => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const limit = 12;
  const { toast } = useToast();
  
  const { data: response, isLoading, isFetching, error, refetch } = useQuery<StandardApiResponse<Product[]>>({
    queryKey: ['/api/featured-products', page, limit, Date.now()], // Add timestamp to force fresh data
    queryFn: async () => {
      const offset = (page - 1) * limit;
      const url = `/api/featured-products?limit=${limit}&offset=${offset}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch featured products');
      return res.json();
    },
    staleTime: 0, // Never use stale data
    gcTime: 0, // Don't cache at all
    refetchOnWindowFocus: false,
    refetchOnMount: 'always',
  });
  
  // Fetch active promotions to check if featured products are promotional
  const { data: promotionsResponse } = useQuery<StandardApiResponse<any[]>>({
    queryKey: ['/api/promotions/active-with-products'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
  
  // Extract current page products and handle pagination
  const currentPageProducts = response?.success ? response.data : [];
  
  // Update products list when new data arrives
  useEffect(() => {
    console.log('Products update effect:', { page, currentPageProducts: currentPageProducts?.length, limit });
    
    if (currentPageProducts && currentPageProducts.length > 0) {
      if (page === 1) {
        // First page: replace all products
        console.log('Setting first page products:', currentPageProducts.length);
        setAllProducts(currentPageProducts);
      } else {
        // Subsequent pages: append new products, avoiding duplicates
        setAllProducts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newProducts = currentPageProducts.filter(p => !existingIds.has(p.id));
          console.log('Appending products:', { existing: prev.length, new: newProducts.length, total: prev.length + newProducts.length });
          return [...prev, ...newProducts];
        });
      }
      
      // Check if we have more products to load
      const hasMore = currentPageProducts.length === limit;
      console.log('Has more products:', hasMore, 'received:', currentPageProducts.length, 'limit:', limit);
      setHasMoreProducts(hasMore);
    } else if (page > 1) {
      // No more products available
      console.log('No more products available for page:', page);
      setHasMoreProducts(false);
    }
  }, [currentPageProducts, page, limit]);
  
  // Reset pagination when component mounts
  useEffect(() => {
    setPage(1);
    setAllProducts([]);
    setHasMoreProducts(true);
  }, []);
  
  // Create a map of product promotions for quick lookup
  const activePromotions = promotionsResponse?.success ? promotionsResponse.data : [];
  const productPromotions = new Map();
  
  activePromotions?.forEach(promo => {
    promo.products?.forEach((pp: any) => {
      productPromotions.set(pp.productId, {
        promotionName: promo.promotionName,
        promotionDiscount: pp.additionalDiscountPercentage || pp.discountOverride || promo.discountValue,
        promotionDiscountType: promo.discountType,
        promotionEndDate: promo.endDate,
        promotionalPrice: pp.promotionalPrice ? Number(pp.promotionalPrice) : null
      });
    });
  });
  
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
  
  const loadMore = useCallback(() => {
    if (!isFetching && hasMoreProducts) {
      console.log('Loading more products, current page:', page, 'current products:', allProducts.length);
      setPage(prev => prev + 1);
    }
  }, [isFetching, hasMoreProducts, page, allProducts.length]);
  
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
          ) : allProducts.length === 0 ? (
            // Show empty state
            <div className="col-span-full py-8 text-center text-gray-500">
              No featured products available at the moment
            </div>
          ) : (
            // Show products
            allProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isFlashDeal={false}
                showAddToCart={true}
                promotionInfo={productPromotions.get(product.id)}
              />
            ))
          )}
        </div>
      </div>
      {!isLoading && !error && allProducts.length > 0 && hasMoreProducts && (
        <div className="p-3 border-t border-gray-200 flex justify-center">
          <Button 
            variant="outline"
            className="border-[#FF69B4] text-[#FF69B4] hover:bg-[#FF69B4] hover:text-white disabled:opacity-50"
            onClick={loadMore}
            disabled={isFetching || !hasMoreProducts}
          >
            {isFetching ? 'Loading...' : hasMoreProducts ? 'Load More Products' : 'No More Products'}
          </Button>
        </div>
      )}
    </section>
  );
};

export default FeaturedProductsSection;
