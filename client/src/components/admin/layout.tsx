import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, ShoppingBag, Package, CreditCard, Users, Settings, BarChart3, LogOut, DollarSign, BrainCircuit, Factory, BookOpen, Tags, FileText, Upload, PlusCircle, Menu, Gift, ChevronLeft, ChevronRight, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

/**
 * Navigation menu for admin dashboard
 */
function Navigation({ className, isCollapsed, onNavigate }: { className?: string; isCollapsed?: boolean; onNavigate?: () => void }) {
  const [location] = useLocation();
  const { logoutMutation } = useAuth();

  // Admin navigation items
  const navItems = [
    { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { path: "/admin/suppliers", label: "Suppliers", icon: Factory },
    { path: "/admin/catalogs", label: "Catalogs", icon: BookOpen },
    { path: "/admin/product-management", label: "Product Management", icon: PlusCircle },
    { path: "/admin/products", label: "Products", icon: ShoppingBag },
    { path: "/admin/mass-upload", label: "Mass Upload", icon: Upload },
    { path: "/admin/promotions", label: "Promotions", icon: Gift },
    { path: "/admin/orders", label: "Orders", icon: Package },
    { path: "/admin/supplier-orders", label: "Supplier Orders", icon: Truck },
    { path: "/admin/categories", label: "Categories", icon: BarChart3 },
    { path: "/admin/global-attributes", label: "Global Attributes", icon: Tags },
    { path: "/admin/pricing", label: "Pricing", icon: DollarSign },
    { path: "/admin/ai-settings", label: "AI Settings", icon: BrainCircuit },
    { path: "/admin/users", label: "User Admin", icon: Users },
    { path: "/admin/customers", label: "Customers", icon: Users },
    { path: "/admin/sales-reps", label: "Sales Reps", icon: Users },
    { path: "/admin/payments", label: "Payments", icon: CreditCard },
    { path: "/admin/settings", label: "Settings", icon: Settings },
  ];

  return (
    <nav className={cn("space-y-1", className)}>
      {navItems.map((item) => {
        const isActive = location === item.path;
        return (
          <Link 
            key={item.path} 
            href={item.path}
            onClick={onNavigate}
            className={cn(
              "flex items-center px-3 py-2 text-sm font-medium rounded-md",
              isActive
                ? "bg-pink-100 text-pink-800"
                : "text-gray-600 hover:bg-pink-50 hover:text-pink-700"
            )}
          >
            <item.icon className={cn("h-5 w-5", isCollapsed ? "mx-auto" : "mr-3")} />
            {!isCollapsed && item.label}
          </Link>
        );
      })}
      
      <button
        onClick={() => logoutMutation.mutate()}
        className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-pink-50 hover:text-pink-700"
        disabled={logoutMutation.isPending}
      >
        <LogOut className={cn("h-5 w-5", isCollapsed ? "mx-auto" : "mr-3")} />
        {!isCollapsed && (logoutMutation.isPending ? "Signing out..." : "Logout")}
      </button>
    </nav>
  );
}

/**
 * Main admin layout with responsive sidebar
 */
export function AdminLayout({ children }: AdminLayoutProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true); // Start minimized
  const { user } = useAuth();
  
  // Function to handle navigation click and auto-collapse
  const handleNavigationClick = () => {
    if (!isCollapsed) {
      setIsCollapsed(true);
    }
  };
  
  // Responsive sidebar that shows as a drawer on mobile
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Desktop sidebar */}
      <div className={cn(
        "hidden md:flex md:flex-col md:fixed md:inset-y-0 transition-all duration-300 ease-in-out",
        isCollapsed ? "md:w-16" : "md:w-64"
      )}>
        <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-gray-200">
          <div className="flex items-center h-16 flex-shrink-0 px-4 bg-pink-600 justify-between">
            {!isCollapsed && (
              <Link href="/" className="text-xl font-bold text-white">
                TEE ME YOU
              </Link>
            )}
            {isCollapsed && (
              <Link href="/" className="text-lg font-bold text-white mx-auto">
                T
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-white hover:bg-pink-700 ml-auto"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="flex-1 flex flex-col overflow-hidden pt-5 pb-4">
            <ScrollArea className={cn("flex-1 px-3", isCollapsed && "px-1")}>
              <Navigation isCollapsed={isCollapsed} onNavigate={handleNavigationClick} />
            </ScrollArea>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className={cn("flex items-center", isCollapsed && "justify-center")}>
              <div className="h-8 w-8 rounded-full bg-pink-500 flex items-center justify-center text-white font-bold">
                {user?.username.charAt(0).toUpperCase()}
              </div>
              {!isCollapsed && (
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">{user?.username}</p>
                  <p className="text-xs font-medium text-gray-500">Admin</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile header with hamburger menu */}
      <div className="md:hidden bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-pink-600">
          TEE ME YOU
        </Link>
        
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-10 w-10"
            >
              <Menu className="h-6 w-6" />
              <span className="sr-only">Open admin menu</span>
            </Button>
          </SheetTrigger>
          
          <SheetContent side="left" className="w-[85%] sm:w-[350px] p-0 h-full flex flex-col">
            <div className="flex items-center h-16 flex-shrink-0 px-4 bg-pink-600">
              <span className="text-xl font-bold text-white">
                TEE ME YOU Admin
              </span>
            </div>
            <div className="flex-1 overflow-y-auto pt-5 pb-4">
              <div className="px-3">
                <Navigation onNavigate={() => setOpen(false)} />
              </div>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-pink-500 flex items-center justify-center text-white font-bold">
                  {user?.username.charAt(0).toUpperCase()}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">{user?.username}</p>
                  <p className="text-xs font-medium text-gray-500">Admin</p>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Main content */}
      <div className={cn(
        "flex flex-col flex-1 transition-all duration-300 ease-in-out",
        isCollapsed ? "md:pl-16" : "md:pl-64"
      )}>
        <main className="flex-1 pb-8">
          <div className="mx-auto px-4 sm:px-6 md:px-8 py-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// Export as default as well for compatibility with both import styles
export default AdminLayout;