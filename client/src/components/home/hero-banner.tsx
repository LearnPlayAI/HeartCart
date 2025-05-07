import React from 'react';
import { Link } from 'wouter';

const HeroBanner = () => {
  return (
    <div className="mb-6 overflow-hidden rounded-lg shadow-lg">
      <Link href="#featuredProducts">
        <img 
          src="https://pixabay.com/get/gb47b8ae03c6c165b68ea2fccd521e0e3b59ebabf25fff4011c1aa806e22ea98356f4ef816b54073043fab898c9d06f4c01f3e7f6ba14dcadfb0d1567bc35a92f_1280.jpg" 
          alt="South African products showcase" 
          className="w-full h-auto object-cover"
        />
      </Link>
    </div>
  );
};

export default HeroBanner;
