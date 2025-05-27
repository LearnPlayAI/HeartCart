import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Zap, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { Product } from '../../../shared/schema';
import ProductCard from '@/components/product/product-card';
import { Card } from '@/components/ui/card';

const FlashDealsPage = () => {
  // Define the standardized API response type
  interface ApiResponse {
    success: boolean;
    data: Product[];
  }
  
  const { data: response, isLoading, error } = useQuery<ApiResponse>({
    queryKey: ['/api/flash-deals', { limit: 50 }], // Get more deals for the dedicated page
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
              <h1 className="text-3xl font-bold">Flash Deals</h1>
              <p className="text-lg opacity-90">Limited time offers - Don't miss out!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          // Loading state
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, index) => (
              <Card key={index} className="h-80 animate-pulse bg-gray-100">
                <div className="h-48 bg-gray-200 rounded-t-lg"></div>
                <div className="p-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </Card>
            ))}
          </div>
        ) : error ? (
          // Error state
          <div className="text-center py-16">
            <div className="text-red-500 text-xl mb-4">Failed to load flash deals</div>
            <p className="text-gray-600 mb-6">Something went wrong while fetching the deals. Please try again.</p>
            <button 
              className="px-6 py-3 rounded-md border border-[#FF69B4] text-[#FF69B4] hover:bg-[#FF69B4] hover:text-white transition-colors"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        ) : flashDeals.length > 0 ? (
          // Flash deals content
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                {flashDeals.length} Flash Deal{flashDeals.length !== 1 ? 's' : ''} Available
              </h2>
              <p className="text-gray-600">Hurry up! These deals won't last long.</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {flashDeals.map((product) => {
                // Using product ID for deterministic soldPercentage to avoid re-renders
                const soldPercentage = Math.floor((product.id * 17) % 100);
                
                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isFlashDeal={true}
                    soldPercentage={soldPercentage}
                  />
                );
              })}
            </div>
          </div>
        ) : (
          // Empty state
          <div className="text-center py-16">
            <Zap className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">No Flash Deals Available</h2>
            <p className="text-gray-600 mb-6">Check back later for exciting limited-time offers!</p>
            <Link href="/" className="inline-flex items-center px-6 py-3 rounded-md bg-[#FF69B4] text-white hover:bg-[#FF1493] transition-colors">
              Browse All Products
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlashDealsPage;