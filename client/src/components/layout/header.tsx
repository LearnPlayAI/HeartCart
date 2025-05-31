import React from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { User, ShoppingCart, LogIn, UserPlus, LogOut, ChevronDown, LayoutDashboard, Terminal } from 'lucide-react';
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
import ProductSearch from '@/components/ui/product-search';
import { StandardApiResponse } from "@/types/api";

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
  
  const handleLogout = () => {
    // Use the centralized logout mutation which already handles navigation
    logoutMutation.mutate();
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
                      <Link href="/profile?tab=profile" className="cursor-pointer">
                        My Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile?tab=orders" className="cursor-pointer">
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
            
            {/* Admin Dashboard direct link in main navigation */}
            {user?.role === 'admin' && (
              <>
                <Link 
                  href="/admin" 
                  className="px-4 py-1 font-medium text-sm bg-white text-[#FF69B4] rounded-full mx-1 transition-colors duration-200 flex items-center"
                >
                  <LayoutDashboard className="h-3 w-3 mr-1" />
                  Admin
                </Link>
                <Link 
                  href="/developer" 
                  className="px-4 py-1 font-medium text-sm bg-green-100 text-green-700 rounded-full mx-1 transition-colors duration-200 flex items-center"
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
