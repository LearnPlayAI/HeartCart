import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

const HeroBanner = () => {
  return (
    <div className="mb-6 relative overflow-hidden rounded-lg shadow-lg">
      <img 
        src="https://pixabay.com/get/gb47b8ae03c6c165b68ea2fccd521e0e3b59ebabf25fff4011c1aa806e22ea98356f4ef816b54073043fab898c9d06f4c01f3e7f6ba14dcadfb0d1567bc35a92f_1280.jpg" 
        alt="South African products showcase" 
        className="w-full h-auto object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#FF69B4]/80 to-transparent flex flex-col justify-center px-6">
        <h1 className="text-white text-2xl md:text-4xl font-bold mb-2">Shop South African</h1>
        <p className="text-white text-sm md:text-lg max-w-md mb-4">
          Discover unique products from local suppliers at unbeatable prices!
        </p>
        <Button
          asChild
          className="bg-white text-[#FF69B4] hover:bg-gray-100 transition-colors duration-200 w-max"
        >
          <Link href="#featuredProducts">
            <a>Shop Now</a>
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default HeroBanner;
