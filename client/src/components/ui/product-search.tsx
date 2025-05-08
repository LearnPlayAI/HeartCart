import React, { useState, FormEvent } from 'react';
import { useLocation } from 'wouter';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ProductSearchProps {
  className?: string;
  variant?: 'default' | 'outlined' | 'minimal';
  size?: 'sm' | 'md' | 'lg';
  placeholder?: string;
  initialQuery?: string;
  onSearch?: (query: string) => void;
}

export function ProductSearch({ 
  className = '',
  variant = 'default',
  size = 'md',
  placeholder = 'Search for products...',
  initialQuery = '',
  onSearch,
}: ProductSearchProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [, navigate] = useLocation();

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;
    
    // If onSearch callback is provided, use it
    if (onSearch) {
      onSearch(trimmedQuery);
      return;
    }
    
    // Otherwise, navigate to search results page
    navigate(`/search?q=${encodeURIComponent(trimmedQuery)}`);
  };

  // Define component styles based on props
  const getContainerStyles = () => {
    const baseStyles = "relative";
    
    if (variant === 'outlined') {
      return `${baseStyles} border border-gray-200 rounded-lg`;
    }
    
    return baseStyles;
  };
  
  const getInputStyles = () => {
    const baseStyles = "w-full pr-10 focus:outline-none focus:ring-2 focus:ring-[#FF69B4] focus:border-transparent";
    
    switch (variant) {
      case 'outlined':
        return `${baseStyles} border-0`;
      case 'minimal':
        return `${baseStyles} border-b border-gray-200 rounded-none px-1`;
      default:
        return `${baseStyles} rounded-full border border-gray-300`;
    }
  };
  
  const getButtonStyles = () => {
    const baseStyles = "absolute right-3 top-1/2 transform -translate-y-1/2 text-[#FF69B4]";
    
    if (variant === 'minimal') {
      return `${baseStyles} right-0`;
    }
    
    return baseStyles;
  };
  
  // Define sizes
  const getInputSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'py-1 text-sm';
      case 'lg':
        return 'py-3 text-base';
      default:
        return 'py-2 text-sm';
    }
  };

  return (
    <form 
      onSubmit={handleSearchSubmit} 
      className={`${getContainerStyles()} ${className}`}
    >
      <Input
        type="text"
        placeholder={placeholder}
        className={`${getInputStyles()} ${getInputSizeStyles()}`}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <Button 
        type="submit"
        variant="ghost" 
        size="icon"
        className={getButtonStyles()}
        aria-label="Search"
      >
        <Search className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} />
      </Button>
    </form>
  );
}

export default ProductSearch;