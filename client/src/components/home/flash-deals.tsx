import React from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import ProductCard from '@/components/product/product-card';
import type { Product } from '@shared/schema';

const FlashDealsSection = () => {
  // Define the standardized API response type
  interface ApiResponse {
    success: boolean;
    data: Product[];
  }
  
  const { data: response, isLoading, error } = useQuery<ApiResponse>({
    queryKey: ['/api/flash-deals'],
  });
  
  // Extract the flash deals from the standardized response
  const flashDeals = response?.success ? response.data : [];
  
  // Handle error state gracefully
  React.useEffect(() => {
    if (error) {
      console.error('Error fetching flash deals:', error);
    }
  }, [error]);
  
  return (
    <section className="mb-4 md:mb-8 bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-gradient-to-r from-[#FF69B4] to-[#FF1493] p-4">
        <h2 className="text-white text-xl font-bold flex items-center">
          <Zap className="mr-2" /> Special Deals
        </h2>
      </div>
      
      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {isLoading ? (
            // Show skeleton loaders while loading
            Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="h-64 animate-pulse bg-gray-100">
                <div className="h-36 bg-gray-200 rounded-t-lg"></div>
                <div className="p-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </Card>
            ))
          ) : error ? (
            // Show error state
            <div className="col-span-full py-8 text-center">
              <div className="text-red-500 mb-2">Failed to load flash deals</div>
              <button 
                className="px-4 py-2 rounded-md border border-[#FF69B4] text-[#FF69B4] hover:bg-[#FF69B4] hover:text-white transition-colors"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </div>
          ) : flashDeals.length > 0 ? (
            // Show flash deals
            flashDeals.map((product) => {
              // Using product ID for deterministic soldPercentage to avoid re-renders
              // Calculate sold percentage directly without useMemo (to avoid hooks order issues)
              const soldPercentage = Math.floor((product.id * 17) % 100);
              
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  isFlashDeal={true}
                  soldPercentage={soldPercentage}
                />
              );
            })
          ) : (
            // Show empty state
            <div className="col-span-full text-center py-8">
              <div className="text-gray-500 mb-2">No flash deals available at the moment</div>
              <div className="text-sm text-gray-400">Check back later for exciting deals!</div>
            </div>
          )}
        </div>
      </div>
      
      <div className="p-3 border-t border-gray-200 flex justify-center">
        <Link href="/flash-deals" className="text-[#FF69B4] font-medium hover:underline flex items-center">
          View all deals 
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </Link>
      </div>
    </section>
  );
};

export default FlashDealsSection;
