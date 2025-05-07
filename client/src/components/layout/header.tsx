import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Search, User, ShoppingCart, LogIn, UserPlus, LogOut, ChevronDown, LayoutDashboard } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import Logo from '@/components/ui/logo';
import { useCart } from '@/hooks/use-cart';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { CategorySidebarDrawer } from '@/components/ui/category-sidebar-drawer';

type Category = {
  id: number;
  name: string;
  slug: string;
};

const Header = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [, navigate] = useLocation();
  const { cartItems, openCart } = useCart();
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  
  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: "Logged out successfully",
          description: "You have been logged out of your account",
          duration: 3000,
        });
        // Force a full page reload to ensure authentication state is reflected in the UI
        window.location.href = '/';
      }
    });
  };
  
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
            {user ? (
              // Authenticated user - show profile dropdown, cart and logout
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                      <User className="h-5 w-5 text-gray-700 hover:text-[#FF69B4]" />
                      <ChevronDown className="h-3 w-3 ml-1 text-gray-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <div className="p-2 text-sm font-medium border-b">
                      {user.username}
                    </div>
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="cursor-pointer">
                        My Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="cursor-pointer">
                        My Orders
                      </Link>
                    </DropdownMenuItem>
                    
                    {/* Admin Dashboard access for admin users */}
                    {user.role === 'admin' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/admin" className="cursor-pointer text-[#FF69B4] font-medium flex items-center">
                            <LayoutDashboard className="h-4 w-4 mr-2" />
                            Admin Dashboard
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleLogout} 
                      className="text-red-500 cursor-pointer flex items-center"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
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
              </>
            ) : (
              // Non-authenticated user - show login and register buttons
              <>
                <Button variant="ghost" className="flex items-center space-x-1 text-gray-700 hover:text-[#FF69B4]" asChild>
                  <Link href="/auth">
                    <LogIn className="h-4 w-4 mr-1" />
                    <span>Login</span>
                  </Link>
                </Button>
                <Button variant="outline" className="flex items-center space-x-1 border-[#FF69B4] text-[#FF69B4] hover:bg-[#FF69B4] hover:text-white" asChild>
                  <Link href="/auth?tab=register">
                    <UserPlus className="h-4 w-4 mr-1" />
                    <span>Register</span>
                  </Link>
                </Button>
              </>
            )}
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
      <nav className="bg-[#FF69B4] text-white">
        <div className="container mx-auto flex items-center whitespace-nowrap py-2 px-4">
          {/* Mobile Category Menu Button */}
          <CategorySidebarDrawer />
          
          {/* Desktop Navigation Links */}
          <div className="flex items-center overflow-x-auto scrollbar-none">
            <Link href="/" className="px-4 py-1 font-medium text-sm hover:bg-white hover:text-[#FF69B4] rounded-full mx-1 transition-colors duration-200">
              Home
            </Link>
            
            <Link href="/products" className="px-4 py-1 font-medium text-sm hover:bg-white hover:text-[#FF69B4] rounded-full mx-1 transition-colors duration-200">
              All Products
            </Link>
            
            {/* Admin Dashboard direct link in main navigation */}
            {user?.role === 'admin' && (
              <Link 
                href="/admin" 
                className="px-4 py-1 font-medium text-sm bg-white text-[#FF69B4] rounded-full mx-1 transition-colors duration-200 flex items-center"
              >
                <LayoutDashboard className="h-3 w-3 mr-1" />
                Admin
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
