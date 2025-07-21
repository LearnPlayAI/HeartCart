import React from 'react';
import { Link } from 'wouter';

type LogoProps = {
  className?: string;
};

const Logo: React.FC<LogoProps> = ({ className = 'h-12 w-auto' }) => {
  return (
    <Link href="/" className="flex items-center">
      <img 
        src="/site_files/CompanyLogo.jpg" 
        alt="HeartCart Logo" 
        className={className} 
      />
    </Link>
  );
};

export default Logo;
