import React from 'react';
import { Link } from 'wouter';
import logoImage from '@assets/CompanyLogo.jpg';

type LogoProps = {
  className?: string;
};

const Logo: React.FC<LogoProps> = ({ className = 'h-12 w-auto' }) => {
  return (
    <Link href="/" className="flex items-center">
      <img 
        src={logoImage} 
        alt="TEE ME YOU Logo" 
        className={className} 
      />
    </Link>
  );
};

export default Logo;
