import React from 'react';
import HeroBanner from '@/components/home/hero-banner';
import FlashDealsSection from '@/components/home/flash-deals';
import FeaturedProductsSection from '@/components/home/featured-products';
import AIRecommendedProducts from '@/components/home/ai-recommended';
import AppBanner from '@/components/home/app-banner';
import InstallBanner from '@/components/pwa/install-banner';
import { CategorySidebar } from '@/components/ui/category-sidebar';
import { CategorySidebarDrawer } from '@/components/ui/category-sidebar-drawer';
import { Helmet } from 'react-helmet';

const Home = () => {
  return (
    <>
      <Helmet>
        <title>TEE ME YOU - Shop South African Products</title>
        <meta name="description" content="Discover unique products from local South African suppliers at unbeatable prices. Shop now for exclusive deals!" />
      </Helmet>
      
      <div className="container mx-auto px-4 py-2">
        <InstallBanner />
        <HeroBanner />
        
        {/* Mobile Category Drawer - Shown only on mobile */}
        <div className="block md:hidden mb-2">
          <CategorySidebarDrawer />
        </div>
        
        {/* Desktop Layout with Sidebar */}
        <div className="flex flex-col md:flex-row gap-2 md:gap-6 mt-1 md:mt-2">
          {/* Category Sidebar - Hidden on mobile */}
          <div className="hidden md:block w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-md p-4 sticky top-20">
              <h2 className="text-lg font-bold mb-4">Categories</h2>
              <CategorySidebar className="border-none p-0" />
            </div>
          </div>
          
          {/* Main Content */}
          <div className="flex-1">
            <FlashDealsSection />
            <FeaturedProductsSection />
            <AIRecommendedProducts />
            <AppBanner />
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
