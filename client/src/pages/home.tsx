import React from 'react';
import HeroBanner from '@/components/home/hero-banner';
import FlashDealsSection from '@/components/home/flash-deals';
import CategoriesShowcase from '@/components/home/categories-showcase';
import FeaturedProductsSection from '@/components/home/featured-products';
import AIRecommendedProducts from '@/components/home/ai-recommended';
import AppBanner from '@/components/home/app-banner';
import InstallBanner from '@/components/pwa/install-banner';
import { Helmet } from 'react-helmet';

const Home = () => {
  return (
    <>
      <Helmet>
        <title>TEE ME YOU - Shop South African Products</title>
        <meta name="description" content="Discover unique products from local South African suppliers at unbeatable prices. Shop now for exclusive deals!" />
      </Helmet>
      
      <div className="container mx-auto px-4 py-4">
        <InstallBanner />
        <HeroBanner />
        <FlashDealsSection />
        <CategoriesShowcase />
        <FeaturedProductsSection />
        <AIRecommendedProducts />
        <AppBanner />
      </div>
    </>
  );
};

export default Home;
