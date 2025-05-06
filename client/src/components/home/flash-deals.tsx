import React from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import ProductCard from '@/components/product/product-card';
import { useCountdown } from '@/hooks/use-countdown';
import type { Product } from '@shared/schema';

const FlashDealsSection = () => {
  // Set end time for the flash deals - 5 hours from now
  // Using React.useMemo to prevent creating a new date on every render
  const endTime = React.useMemo(() => {
    const date = new Date();
    date.setHours(date.getHours() + 5);
    return date;
  }, []);
  
  const { timeRemaining, formattedTime } = useCountdown(endTime);
  
  const { data: flashDeals, isLoading } = useQuery<Product[]>({
    queryKey: ['/api/flash-deals'],
  });
  
  return (
    <section className="mb-8 bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-gradient-to-r from-[#FF69B4] to-[#FF1493] p-4 flex justify-between items-center">
        <h2 className="text-white text-xl font-bold flex items-center">
          <Zap className="mr-2" /> Flash Deals
        </h2>
        <div className="flex items-center space-x-1 bg-white/20 px-3 py-1 rounded-full">
          <span className="text-white text-xs">Ends in:</span>
          <div className="countdown-timer text-white font-mono font-bold text-sm">
            {formattedTime}
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
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
          ) : (
            flashDeals?.map((product) => {
              // Using product ID for deterministic soldPercentage to avoid re-renders 
              const soldPercentage = React.useMemo(() => {
                // Using product.id to generate a consistent sold percentage for a product
                return Math.floor((product.id * 17) % 100);
              }, [product.id]);
              
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  isFlashDeal={true}
                  soldPercentage={soldPercentage}
                />
              );
            })
          )}
        </div>
      </div>
      
      <div className="p-3 border-t border-gray-200 flex justify-center">
        <Link href="/flash-deals">
          <a className="text-[#FF69B4] font-medium hover:underline flex items-center">
            View all deals 
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </a>
        </Link>
      </div>
    </section>
  );
};

export default FlashDealsSection;
