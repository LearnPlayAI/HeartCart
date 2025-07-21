import React from 'react';
import HeroBanner from '@/components/home/hero-banner';
import FlashDealsSection from '@/components/home/flash-deals';
import FeaturedProductsSection from '@/components/home/featured-products';
import AIRecommendedProducts from '@/components/home/ai-recommended';
import { CategorySidebar } from '@/components/ui/category-sidebar';
import { CategorySidebarDrawer } from '@/components/ui/category-sidebar-drawer';
import { Helmet } from 'react-helmet';
import { useLocation } from 'wouter';
import { AlertCircle } from 'lucide-react';
import { useProductListingScroll } from '@/hooks/use-scroll-management';
import ContextualInstallPrompts from '@/components/pwa/ContextualInstallPrompts';

const Home = () => {
  const [, setLocation] = useLocation();
  useProductListingScroll();

  return (
    <>
      <Helmet>
        <title>HeartCart - Shop South African Products</title>
        <meta name="description" content="Discover unique products from local South African suppliers at unbeatable prices. Shop now for exclusive deals!" />
      </Helmet>
      
      <div className="container mx-auto px-4 py-2">
        
        <HeroBanner />
        
        {/* Mobile Category Drawer - Shown only on mobile */}
        <div className="block md:hidden mb-2">
          <CategorySidebarDrawer />
        </div>
        
        {/* Desktop Layout with Sidebar */}
        <div className="flex flex-col md:flex-row gap-2 md:gap-6 mt-1 md:mt-2">
          {/* Category Sidebar - Hidden on mobile */}
          <div className="hidden md:block w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-md overflow-hidden sticky top-20 h-[calc(100vh-8rem)] flex flex-col">
              <div className="bg-gradient-to-r from-[#FF69B4] to-[#FF1493] p-4 flex-shrink-0">
                <h2 className="text-white text-lg font-bold">Categories</h2>
              </div>
              <div className="p-4 bg-[#ff68b32e] flex-1 min-h-0 overflow-y-auto">
                <CategorySidebar 
                  className="border-none p-0" 
                  isFilterMode={true}
                  onCategoryFilter={(categoryId, includeChildren) => {
                    // Navigate to products page with category filter using React Router
                    const params = new URLSearchParams();
                    if (categoryId) {
                      params.set('categoryId', categoryId.toString());
                      if (includeChildren) {
                        params.set('includeChildren', 'true');
                      }
                    }
                    setLocation(`/products?${params.toString()}`);
                  }}
                />
              </div>
            </div>
          </div>
          
          {/* Main Content */}
          <div className="flex-1">
            <FlashDealsSection />
            <FeaturedProductsSection />
            <AIRecommendedProducts />
            
            {/* PWA Install Prompt for General Context */}
            <div className="mt-8">
              <ContextualInstallPrompts 
                context="general" 
                className="max-w-4xl mx-auto"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
