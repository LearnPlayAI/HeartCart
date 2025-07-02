import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star, ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import ProductCard from '@/components/product/product-card';
import { Link } from 'wouter';
import { useProductListingScroll } from '@/hooks/use-scroll-management';
import type { Product } from '@shared/schema';

interface ApiResponse {
  success: boolean;
  data: Product[];
}

function FeaturedPage() {
  useProductListingScroll();
  
  // Fetch ALL featured products without pagination
  const { data: response, isLoading, error, refetch } = useQuery<ApiResponse>({
    queryKey: ['/api/featured-products/all'], // Different endpoint to get all featured products
    staleTime: 0, // No cache - always fetch fresh data
    gcTime: 0, // Don't keep in cache when component unmounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Always refetch on mount
  });
  
  const featuredProducts = response?.success ? response.data : [];

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
              <Star className="h-8 w-8 mr-3" />
              <div>
                <h1 className="text-3xl font-bold">Featured Products</h1>
                <p className="text-lg opacity-90">Loading our handpicked favorites...</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Loading Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 12 }).map((_, index) => (
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
              <Star className="h-8 w-8 mr-3" />
              <div>
                <h1 className="text-3xl font-bold">Featured Products</h1>
                <p className="text-lg opacity-90">Failed to load featured products</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Error Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-8">
            <div className="text-red-500 mb-2">Failed to load featured products</div>
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
      {/* Featured products header section */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center mb-4">
            <Link href="/" className="flex items-center text-white hover:text-gray-200 mr-4">
              <ArrowLeft className="h-5 w-5 mr-1" />
              Back to Home
            </Link>
          </div>
          <h2 className="text-2xl font-bold mb-2 flex items-center">
            <Star className="mr-2 text-[#FF69B4]" />
            Featured Products
          </h2>
          <p className="text-white/80">
            Our handpicked selection of {featuredProducts.length} premium products
          </p>
        </div>
      </div>
      
      {/* Products grid */}
      <div className="p-4 bg-[#ff68b32e]">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {featuredProducts.length > 0 ? (
              // Show featured products
              (featuredProducts.map((product: any) => {
                return (
                  <div key={product.id} className="relative">
                    <ProductCard
                      product={product}
                      isFlashDeal={false}
                      showAddToCart={true}
                    />
                  </div>
                );
              }))
            ) : (
              // Show empty state
              (<div className="col-span-full text-center py-8">
                <div className="text-gray-500 mb-2">No featured products available at the moment</div>
                <div className="text-sm text-gray-400">Check back later for our handpicked favorites!</div>
              </div>)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FeaturedPage;