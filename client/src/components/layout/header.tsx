import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Search, User, ShoppingCart } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Logo from '@/components/ui/logo';
import { useCart } from '@/hooks/use-cart';

type Category = {
  id: number;
  name: string;
  slug: string;
};

const Header = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [, navigate] = useLocation();
  const { cartItems, openCart } = useCart();
  
  const { data: categories } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });
  
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };
  
  return (
    <header className="sticky top-0 z-50 bg-white shadow-md">
      <div className="container mx-auto px-4">
        {/* Top navigation bar */}
        <div className="flex items-center justify-between py-3">
          {/* Logo */}
          <div className="flex items-center">
            <Logo />
          </div>
          
          {/* Search bar - desktop */}
          <div className="hidden md:flex items-center flex-1 mx-4">
            <form onSubmit={handleSearchSubmit} className="relative w-full max-w-xl mx-auto">
              <Input
                type="text"
                placeholder="Search for products..."
                className="w-full py-2 px-4 pr-10 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF69B4] focus:border-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button 
                type="submit"
                variant="ghost" 
                size="icon"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#FF69B4]"
              >
                <Search />
              </Button>
            </form>
          </div>
          
          {/* Navigation Icons */}
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/profile">
                <User className="h-5 w-5 text-gray-700 hover:text-[#FF69B4]" />
              </Link>
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative"
              onClick={openCart}
            >
              <ShoppingCart className="h-5 w-5 text-gray-700 hover:text-[#FF69B4]" />
              {cartItems.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#FF69B4] text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItems.length}
                </span>
              )}
            </Button>
          </div>
        </div>
        
        {/* Mobile search bar */}
        <div className="md:hidden pb-3">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Input
              type="text"
              placeholder="Search for products..."
              className="w-full py-2 px-4 pr-10 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF69B4] focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button 
              type="submit"
              variant="ghost" 
              size="icon"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#FF69B4]"
            >
              <Search />
            </Button>
          </form>
        </div>
      </div>
      
      {/* Categories navigation */}
      <nav className="bg-[#FF69B4] text-white overflow-x-auto scrollbar-none">
        <div className="container mx-auto flex whitespace-nowrap py-2 px-4">
          <Link href="/" className="px-4 py-1 font-medium text-sm hover:bg-white hover:text-[#FF69B4] rounded-full mx-1 transition-colors duration-200">
            All
          </Link>
          
          {categories?.map((category) => (
            <Link key={category.id} href={`/category/${category.slug}`} className="px-4 py-1 font-medium text-sm hover:bg-white hover:text-[#FF69B4] rounded-full mx-1 transition-colors duration-200">
              {category.name}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
};

export default Header;
