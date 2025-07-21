import React, { ReactNode, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { 
  LayoutDashboard, 
  Package, 
  Tag, 
  Users, 
  ShoppingBag, 
  Truck, 
  CreditCard, 
  BarChart3, 
  Settings, 
  ChevronRight, 
  Menu, 
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/use-auth';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

// Admin nav items
type AdminNavItem = {
  title: string;
  href: string;
  icon: React.ReactNode;
};

const adminNavItems: AdminNavItem[] = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    title: "Products",
    href: "/admin/products",
    icon: <Package className="h-5 w-5" />,
  },
  {
    title: "Categories",
    href: "/admin/categories",
    icon: <Tag className="h-5 w-5" />,
  },
  {
    title: "Customers",
    href: "/admin/customers",
    icon: <Users className="h-5 w-5" />,
  },
  {
    title: "Orders",
    href: "/admin/orders",
    icon: <ShoppingBag className="h-5 w-5" />,
  },
  {
    title: "Shipping",
    href: "/admin/shipping",
    icon: <Truck className="h-5 w-5" />,
  },
  {
    title: "Payments",
    href: "/admin/payments",
    icon: <CreditCard className="h-5 w-5" />,
  },
  {
    title: "Reports",
    href: "/admin/reports",
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: <Settings className="h-5 w-5" />,
  },
];

// Navigation component for sidebar and mobile drawer
function AdminNav({ className }: { className?: string }) {
  const [location] = useLocation();
  
  return (
    <nav className={cn("space-y-1 px-2", className)}>
      {adminNavItems.map((item) => {
        const isActive = location === item.href;
        return (
          <a
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-pink-500 text-white"
                : "text-gray-700 hover:bg-pink-100 hover:text-pink-500"
            )}
          >
            {item.icon}
            {item.title}
            {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
          </a>
        );
      })}
    </nav>
  );
}

// Mobile nav sheet for responsive design
function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 pl-1 pr-0">
        <div className="px-7">
          <h2 className="text-lg font-semibold">Admin Dashboard</h2>
        </div>
        <Separator className="my-4" />
        <AdminNav />
      </SheetContent>
    </Sheet>
  );
}

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Check if user is admin, redirect if not
  useEffect(() => {
    if (!isLoading && user && user.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this area.",
        variant: "destructive",
      });
      navigate('/');
    } else if (!isLoading && !user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access the admin area.",
        variant: "destructive",
      });
      navigate('/auth');
    }
  }, [user, isLoading, navigate, toast]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500" />
      </div>
    );
  }

  // Only render if user is admin
  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Desktop sidebar (hidden on mobile) */}
      <aside className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow pt-5 overflow-y-auto border-r border-gray-200 bg-white">
          <div className="px-4 pb-4">
            <h1 className="text-xl font-bold">HeartCart Admin</h1>
          </div>
          <Separator />
          <ScrollArea className="flex-1">
            <AdminNav className="py-4" />
          </ScrollArea>
        </div>
      </aside>
      
      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top nav */}
        <header className="bg-white shadow-sm z-10">
          <div className="px-4 py-3 sm:px-6 flex items-center justify-between">
            <div className="flex items-center">
              <MobileNav />
              <h1 className="text-xl font-semibold text-gray-900 ml-2 md:ml-0">
                Admin Dashboard
              </h1>
            </div>
            <div className="flex items-center">
              <div className="hidden md:flex md:items-center">
                <span className="text-sm text-gray-700 mr-2">
                  {user?.fullName || user?.username}
                </span>
              </div>
              <Button 
                variant="ghost" 
                onClick={() => navigate('/')}
                className="text-gray-500"
              >
                Return to Site
              </Button>
            </div>
          </div>
        </header>
        
        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 bg-gray-100">
          {children}
        </main>
      </div>
    </div>
  );
}