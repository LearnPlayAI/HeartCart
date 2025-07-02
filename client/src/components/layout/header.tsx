import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { User, ShoppingCart, LogIn, UserPlus, LogOut, ChevronDown, LayoutDashboard, Terminal, Package, Heart, CreditCard, Settings, RefreshCw } from 'lucide-react';
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
import { useCredits } from '@/hooks/use-credits';
import { CategorySidebarDrawer } from '@/components/ui/category-sidebar-drawer';
import ProductSearch from '@/components/ui/product-search';
import MobileInstallButton from '@/components/pwa/MobileInstallButton';
import { StandardApiResponse } from "@/types/api";
import { simpleCacheManager } from '@/utils/simpleCacheManager';

type Category = {
  id: number;
  name: string;
  slug: string;
};

const Header = () => {
  const [, navigate] = useLocation();
  const { cartItems, openCart, cartSummary } = useCart();
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const { formattedBalance, balanceLoading } = useCredits();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const handleLogout = () => {
    // Use the centralized logout mutation which already handles navigation
    logoutMutation.mutate();
  };

  const handleRefreshSite = async () => {
    setIsRefreshing(true);
    try {
      toast({
        title: "Refreshing Site",
        description: "Clearing cache and reloading with latest updates...",
      });
      
      await simpleCacheManager.refreshSite();
    } catch (error) {
      console.error('Error refreshing site:', error);
      toast({
        title: "Refresh Error",
        description: "Failed to clear cache. Please try again.",
        variant: "destructive",
      });
      setIsRefreshing(false);
    }
  };
  
  const { data: categoriesResponse } = useQuery<StandardApiResponse<Category[]>>({
    queryKey: ['/api/categories'],
  });
  
  const categories = categoriesResponse?.success ? categoriesResponse.data : [];
  
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
            <div className="w-full max-w-xl mx-auto">
              <ProductSearch
                size="md"
                variant="default"
                placeholder="Search for products..."
              />
            </div>
          </div>
          
          {/* Navigation Icons */}
          <div className="flex items-center space-x-4">
            {user ? (
              // Authenticated user - show profile dropdown, cart and logout
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="relative border-[#FF69B4] bg-gradient-to-r from-[#FF69B4] to-[#FF1493] text-white hover:from-[#FF1493] hover:to-[#DC143C] px-3 py-2 h-auto shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      <User className="h-4 w-4 mr-2" />
                      <span className="text-sm font-medium">Menu</span>
                      <ChevronDown className="h-3 w-3 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 bg-white border-[#FF69B4] shadow-xl">
                    <div className="p-3 text-sm font-bold bg-gradient-to-r from-[#FF69B4] to-[#FF1493] text-white border-b">
                      {user.username}
                    </div>
                    <div className="p-2 text-xs bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200">
                      <div className="flex items-center justify-between">
                        <span className="text-green-700 font-medium">Credit Balance:</span>
                        <span className="font-bold text-green-800">
                          {balanceLoading ? 'Loading...' : formattedBalance}
                        </span>
                      </div>
                    </div>
                    <DropdownMenuItem asChild>
                      <Link href="/profile-settings" className="cursor-pointer flex items-center hover:bg-pink-50 hover:text-[#FF69B4] transition-colors p-2 rounded">
                        <Settings className="h-4 w-4 mr-2 text-[#FF69B4]" />
                        <span className="font-medium">My Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/my-orders" className="cursor-pointer flex items-center hover:bg-pink-50 hover:text-[#FF69B4] transition-colors p-2 rounded">
                        <Package className="h-4 w-4 mr-2 text-[#FF69B4]" />
                        <span className="font-medium">My Orders</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/my-favourites" className="cursor-pointer flex items-center hover:bg-pink-50 hover:text-[#FF69B4] transition-colors p-2 rounded">
                        <Heart className="h-4 w-4 mr-2 text-[#FF69B4]" />
                        <span className="font-medium">My Favourites</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/credit-history" className="cursor-pointer flex items-center hover:bg-pink-50 hover:text-[#FF69B4] transition-colors p-2 rounded">
                        <CreditCard className="h-4 w-4 mr-2 text-[#FF69B4]" />
                        <span className="font-medium">Credit History</span>
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
                        <DropdownMenuItem asChild>
                          <Link href="/developer" className="cursor-pointer text-green-700 font-medium flex items-center">
                            <Terminal className="h-4 w-4 mr-2" />
                            Developer Dashboard
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleRefreshSite}
                      disabled={isRefreshing}
                      className="cursor-pointer flex items-center hover:bg-pink-50 hover:text-[#FF69B4] transition-colors p-2 rounded"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 text-[#FF69B4] ${isRefreshing ? 'animate-spin' : ''}`} />
                      <span className="font-medium">
                        {isRefreshing ? 'Refreshing...' : 'Refresh Site'}
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={handleLogout} 
                      className="text-red-500 cursor-pointer flex items-center"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* Credit Balance Display */}
                <Link href="/credit-history">
                  <div className="flex items-center bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-1.5 rounded-full shadow-md hover:from-green-600 hover:to-green-700 transition-all duration-200 cursor-pointer">
                    <span className="text-sm font-semibold">
                      {balanceLoading ? 'Loading...' : (
                        <>
                          <span className="hidden sm:inline">Credit: </span>
                          {formattedBalance}
                        </>
                      )}
                    </span>
                  </div>
                </Link>
                
                {/* Install App Button */}
                <MobileInstallButton 
                  variant="outline"
                  size="sm"
                  className="hidden sm:flex"
                />
                
                {/* Mobile Refresh Button - Safe position next to cart */}
                <button
                  onClick={handleRefreshSite}
                  disabled={isRefreshing}
                  className="sm:hidden flex items-center justify-center p-2 text-[#FF69B4] hover:text-[#FF1493] hover:bg-pink-50 rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={isRefreshing ? 'Refreshing...' : 'Refresh Site'}
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative"
                  onClick={openCart}
                >
                  <ShoppingCart className="h-5 w-5 text-gray-700 hover:text-[#FF69B4]" />
                  {cartSummary.itemCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-[#FF69B4] text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {cartSummary.itemCount}
                    </span>
                  )}
                </Button>
              </>
            ) : (
              // Non-authenticated user - show login and register buttons
              <>
                <Button variant="outline" className="flex items-center space-x-1 border-[#FF69B4] text-[#FF69B4] hover:bg-pink-50 hover:border-[#FF1493] hover:text-[#FF1493] font-medium transition-all duration-200 shadow-sm hover:shadow-md" asChild>
                  <Link href="/auth">
                    <LogIn className="h-4 w-4 mr-1" />
                    <span>Login</span>
                  </Link>
                </Button>
                <Button className="flex items-center space-x-1 bg-gradient-to-r from-[#FF69B4] to-[#FF1493] text-white hover:from-[#FF1493] hover:to-[#DC143C] font-medium shadow-md hover:shadow-lg transition-all duration-200" asChild>
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
          <ProductSearch
            size="sm"
            variant="default"
            placeholder="Search for products..."
          />
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
            
            {/* Standalone Refresh Site Button - Right after All Products */}
            <button
              onClick={handleRefreshSite}
              disabled={isRefreshing}
              className="hidden sm:flex items-center px-3 py-1 font-medium text-sm bg-white bg-opacity-90 hover:bg-opacity-100 text-[#FF69B4] hover:text-[#FF1493] rounded-full mx-1 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="text-xs font-semibold">
                {isRefreshing ? 'Refreshing...' : 'Refresh Site'}
              </span>
            </button>
            
            {/* User Profile Navigation - only show on desktop */}
            {user && (
              <>
                <Link href="/profile-settings" className="hidden md:flex px-4 py-1 font-medium text-sm hover:bg-white hover:text-[#FF69B4] rounded-full mx-1 transition-colors duration-200 items-center">
                  <User className="h-3 w-3 mr-1" />
                  My Profile
                </Link>
                <Link href="/my-orders" className="hidden md:flex px-4 py-1 font-medium text-sm hover:bg-white hover:text-[#FF69B4] rounded-full mx-1 transition-colors duration-200 items-center">
                  <Package className="h-3 w-3 mr-1" />
                  My Orders
                </Link>
                <Link href="/my-favourites" className="hidden md:flex px-4 py-1 font-medium text-sm hover:bg-white hover:text-[#FF69B4] rounded-full mx-1 transition-colors duration-200 items-center">
                  <Heart className="h-3 w-3 mr-1" />
                  My Favourites
                </Link>
              </>
            )}
            
            {/* Admin Dashboard direct link in main navigation - hidden on mobile */}
            {user?.role === 'admin' && (
              <>
                <Link 
                  href="/admin" 
                  className="hidden md:flex px-4 py-1 font-medium text-sm bg-white text-[#FF69B4] rounded-full mx-1 transition-colors duration-200 items-center"
                >
                  <LayoutDashboard className="h-3 w-3 mr-1" />
                  Admin
                </Link>
                <Link 
                  href="/developer" 
                  className="hidden md:flex px-4 py-1 font-medium text-sm bg-green-100 text-green-700 rounded-full mx-1 transition-colors duration-200 items-center"
                >
                  <Terminal className="h-3 w-3 mr-1" />
                  Developer
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
